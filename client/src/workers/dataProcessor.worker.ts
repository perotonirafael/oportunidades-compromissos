// Web Worker para parsing CSV/XLSX + processamento de dados
// Tudo roda fora da thread principal para não travar a UI
import * as XLSX from 'xlsx';

const MONTH_NAMES: Record<number, string> = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
  5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
  9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro'
};

function parseDate(dateStr: string): { month: string; year: string; monthNum: number } {
  if (!dateStr) return { month: '', year: '', monthNum: 0 };
  const parts = dateStr.split('/');
  if (parts.length >= 3) {
    const mesClean = parseInt(parts[1].replace(/[^0-9]/g, ''));
    const anoClean = parts[2].replace(/[^0-9]/g, '');
    const anoNum = parseInt(anoClean);
    if (mesClean >= 1 && mesClean <= 12 && anoClean.length === 4 && anoNum >= 2000 && anoNum <= 2100) {
      return { month: MONTH_NAMES[mesClean], year: anoClean, monthNum: mesClean };
    }
  }
  return { month: '', year: '', monthNum: 0 };
}

function cleanProb(val: any): { str: string; num: number } {
  if (!val) return { str: '', num: 0 };
  const s = val.toString().replace(/[^0-9]/g, '');
  const n = parseInt(s);
  return isNaN(n) ? { str: '', num: 0 } : { str: `${n}%`, num: n };
}

function parseValue(val: any): number {
  if (!val) return 0;
  const s = val.toString().replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function trim(val: any): string {
  return val ? val.toString().trim() : '';
}

function extractSequential(oppId: string): number {
  const nums = oppId.replace(/[^0-9]/g, '');
  return nums ? parseInt(nums) : 0;
}

// ====== CSV PARSER (roda no worker) ======

function parseCSVLine(line: string, sep: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        current += char;
        i++;
      }
    } else {
      if (char === '"' && current === '') {
        inQuotes = true;
        i++;
      } else if (char === sep) {
        fields.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCSVText(text: string, sep: string): any[] {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  // Handle multi-line quoted fields
  const mergedLines: string[] = [];
  let buffer = '';
  let openQuotes = false;

  for (const line of lines) {
    if (openQuotes) {
      buffer += '\n' + line;
      const quoteCount = (line.match(/"/g) || []).length;
      if (quoteCount % 2 === 1) {
        openQuotes = false;
        mergedLines.push(buffer);
        buffer = '';
      }
    } else {
      const quoteCount = (line.match(/"/g) || []).length;
      if (quoteCount % 2 === 1) {
        openQuotes = true;
        buffer = line;
      } else {
        mergedLines.push(line);
      }
    }
  }
  if (buffer) mergedLines.push(buffer);

  const validLines = mergedLines.filter(l => l.trim());
  if (validLines.length < 2) return [];

  const headers = parseCSVLine(validLines[0], sep);
  const records: any[] = [];

  for (let i = 1; i < validLines.length; i++) {
    const values = parseCSVLine(validLines[i], sep);
    if (values.length < 2) continue;
    const record: any = {};
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = (j < values.length ? values[j] : '').replace(/^"|"$/g, '');
    }
    records.push(record);
  }
  return records;
}

function readFileBuffer(buffer: ArrayBuffer): string {
  try {
    const utf8 = new TextDecoder('utf-8', { fatal: true });
    return utf8.decode(buffer);
  } catch {
    const latin1 = new TextDecoder('windows-1252');
    return latin1.decode(buffer);
  }
}

// ====== PROCESSAMENTO DE DADOS ======

function processData(opportunities: any[], actions: any[]) {
  // INDEX: Ações agrupadas por Oportunidade ID
  const actionsByOppId = new Map<string, any[]>();
  for (const act of actions) {
    const oppId = trim(act['Oportunidade ID']);
    if (oppId) {
      if (!actionsByOppId.has(oppId)) actionsByOppId.set(oppId, []);
      actionsByOppId.get(oppId)!.push(act);
    }
  }

  // INDEX: Para Agendas Faltantes
  const etnContaOppMap = new Map<string, Map<string, Set<string>>>();

  // PROCESSAMENTO: Desdobramento 1:N
  const records: any[] = [];

  for (const opp of opportunities) {
    const oppId = trim(opp['Oportunidade ID']);
    const contaId = trim(opp['Conta ID']);
    const conta = trim(opp['Conta']);
    const { month, year, monthNum } = parseDate(trim(opp['Previsão de Fechamento']));
    const prob = cleanProb(opp['Prob.']);
    const valorPrevisto = parseValue(opp['Valor Previsto']);
    const valorFechado = parseValue(opp['Valor Fechado']);

    const linkedActions = actionsByOppId.get(oppId) || [];

    if (linkedActions.length > 0) {
      const byUser = new Map<string, any[]>();
      for (const act of linkedActions) {
        const user = trim(act['Usuario']) || trim(act['Responsavel']) || trim(act['Usuário Ação']) || 'Sem Agenda';
        if (!byUser.has(user)) byUser.set(user, []);
        byUser.get(user)!.push(act);
      }

      for (const [user, userActions] of Array.from(byUser.entries())) {
        if (contaId && user !== 'Sem Agenda') {
          if (!etnContaOppMap.has(user)) etnContaOppMap.set(user, new Map());
          const contaMap = etnContaOppMap.get(user)!;
          if (!contaMap.has(contaId)) contaMap.set(contaId, new Set());
          contaMap.get(contaId)!.add(oppId);
        }

        const catCount = new Map<string, number>();
        const actCount = new Map<string, number>();
        for (const a of userActions) {
          const c = trim(a['Categoria']); if (c) catCount.set(c, (catCount.get(c) || 0) + 1);
          const at = trim(a['Atividade']); if (at) actCount.set(at, (actCount.get(at) || 0) + 1);
        }
        let topCat = ''; let topCatN = 0;
        catCount.forEach((v, k) => { if (v > topCatN) { topCat = k; topCatN = v; } });
        let topAct = ''; let topActN = 0;
        actCount.forEach((v, k) => { if (v > topActN) { topAct = k; topActN = v; } });

        records.push({
          oppId, conta, contaId,
          representante: trim(opp['Representante']),
          responsavel: trim(opp['Responsável']),
          etn: user,
          etapa: trim(opp['Etapa']),
          probabilidade: prob.str,
          probNum: prob.num,
          anoPrevisao: year,
          mesPrevisao: month,
          mesPrevisaoNum: monthNum,
          mesFech: month,
          valorPrevisto, valorFechado,
          agenda: userActions.length,
          tipoOportunidade: trim(opp['Tipo de Oportunidade']),
          subtipoOportunidade: trim(opp['Subtipo de Oportunidade']),
          origemOportunidade: trim(opp['Origem da Oportunidade']),
          motivoFechamento: trim(opp['Motivo de Fechamento']),
          motivoPerda: trim(opp['Motivo da Perda']),
          concorrentes: trim(opp['Concorrentes']),
          cidade: trim(opp['Cidade']),
          estado: trim(opp['Estado']),
          cnaeSegmento: trim(opp['CNAE Segmento']),
          categoriaCompromisso: topCat,
          atividadeCompromisso: topAct,
        });
      }
    } else {
      records.push({
        oppId, conta, contaId,
        representante: trim(opp['Representante']),
        responsavel: trim(opp['Responsável']),
        etn: 'Sem Agenda',
        etapa: trim(opp['Etapa']),
        probabilidade: prob.str,
        probNum: prob.num,
        anoPrevisao: year,
        mesPrevisao: month,
        mesPrevisaoNum: monthNum,
        mesFech: month,
        valorPrevisto, valorFechado,
        agenda: 0,
        tipoOportunidade: trim(opp['Tipo de Oportunidade']),
        subtipoOportunidade: trim(opp['Subtipo de Oportunidade']),
        origemOportunidade: trim(opp['Origem da Oportunidade']),
        motivoFechamento: trim(opp['Motivo de Fechamento']),
        motivoPerda: trim(opp['Motivo da Perda']),
        concorrentes: trim(opp['Concorrentes']),
        cidade: trim(opp['Cidade']),
        estado: trim(opp['Estado']),
        cnaeSegmento: trim(opp['CNAE Segmento']),
        categoriaCompromisso: '',
        atividadeCompromisso: '',
      });
    }
  }

  // AGENDAS FALTANTES
  const missingAgendas: any[] = [];
  const oppById = new Map<string, any>();
  for (const opp of opportunities) {
    oppById.set(trim(opp['Oportunidade ID']), opp);
  }

  const oppsByContaId = new Map<string, any[]>();
  for (const opp of opportunities) {
    const cid = trim(opp['Conta ID']);
    if (cid) {
      if (!oppsByContaId.has(cid)) oppsByContaId.set(cid, []);
      oppsByContaId.get(cid)!.push(opp);
    }
  }

  for (const [etn, contaMap] of Array.from(etnContaOppMap.entries())) {
    for (const [contaId, oppIdsWithAction] of Array.from(contaMap.entries())) {
      let maxSeqWithAction = 0;
      let bestPrevOppId = '';
      for (const oid of Array.from(oppIdsWithAction)) {
        const seq = extractSequential(oid);
        if (seq > maxSeqWithAction) {
          maxSeqWithAction = seq;
          bestPrevOppId = oid;
        }
      }

      const allOppsForConta = oppsByContaId.get(contaId) || [];
      for (const opp of allOppsForConta) {
        const thisOppId = trim(opp['Oportunidade ID']);
        const thisSeq = extractSequential(thisOppId);

        if (!oppIdsWithAction.has(thisOppId) && thisSeq > maxSeqWithAction) {
          const etapa = trim(opp['Etapa']);
          const { month: mFech, year: yFech } = parseDate(trim(opp['Previsão de Fechamento']));
          const prob = cleanProb(opp['Prob.']);
          missingAgendas.push({
            oppId: thisOppId,
            conta: trim(opp['Conta']),
            contaId,
            etn,
            etapa,
            probabilidade: prob.str,
            valorPrevisto: parseValue(opp['Valor Previsto']),
            mesFech: mFech,
            anoPrevisao: yFech,
            dataCriacao: trim(opp['Data']) || trim(opp['Data de Criação']) || trim(opp['Data Criação']) || '',
            oppAnteriorId: bestPrevOppId,
            oppAnteriorEtapa: trim(oppById.get(bestPrevOppId)?.['Etapa'] || ''),
            agendaAnterior: (actionsByOppId.get(bestPrevOppId) || []).length,
          });
        }
      }
    }
  }

  // Extrair opções de filtro
  const filterOptions = {
    years: Array.from(new Set(records.map((r: any) => r.anoPrevisao).filter(Boolean))).sort(),
    months: Array.from(new Set(records.map((r: any) => r.mesPrevisao).filter(Boolean))),
    representantes: Array.from(new Set(records.map((r: any) => r.representante).filter(Boolean))).sort(),
    responsaveis: Array.from(new Set(records.map((r: any) => r.responsavel).filter(Boolean))).sort(),
    etns: Array.from(new Set(records.map((r: any) => r.etn).filter(Boolean))).sort(),
    etapas: Array.from(new Set(records.map((r: any) => r.etapa).filter(Boolean))),
    probabilidades: Array.from(new Set(records.map((r: any) => r.probabilidade).filter(Boolean))).sort((a: string, b: string) => parseInt(a) - parseInt(b)),
    agenda: Array.from(new Set(records.map((r: any) => r.agenda.toString()).filter(Boolean))).sort((a: string, b: string) => parseInt(a) - parseInt(b)),
    contas: Array.from(new Set(records.map((r: any) => r.conta).filter(Boolean))).sort(),
    tipos: Array.from(new Set(records.map((r: any) => r.tipoOportunidade).filter(Boolean))).sort(),
    origens: Array.from(new Set(records.map((r: any) => r.origemOportunidade).filter(Boolean))).sort(),
    segmentos: Array.from(new Set(records.map((r: any) => r.cnaeSegmento).filter(Boolean))).sort(),
  };

  // KPIs básicos
  const seenOps = new Set<string>();
  let totalAgendas = 0;
  for (const r of records) {
    if (!seenOps.has(r.oppId)) seenOps.add(r.oppId);
    totalAgendas += r.agenda;
  }

  // Funnel data
  const funnelSeen = new Set<string>();
  const funnelMap = new Map<string, { count: number; value: number }>();
  for (const r of records) {
    if (funnelSeen.has(r.oppId)) continue;
    funnelSeen.add(r.oppId);
    const stage = r.etapa || 'Desconhecido';
    const f = funnelMap.get(stage) || { count: 0, value: 0 };
    f.count++;
    f.value += r.valorPrevisto;
    funnelMap.set(stage, f);
  }
  const funnelData = Array.from(funnelMap.entries()).map(([etapa, d]) => ({ etapa, ...d }));

  // Forecast funnel
  const fcSeen = new Set<string>();
  const fcMap = new Map<string, { count: number; value: number; probs: number[] }>();
  for (const r of records) {
    if (fcSeen.has(r.oppId) || r.probNum < 75) continue;
    fcSeen.add(r.oppId);
    const stage = r.etapa || 'Desconhecido';
    const f = fcMap.get(stage) || { count: 0, value: 0, probs: [] };
    f.count++;
    f.value += r.valorPrevisto;
    f.probs.push(r.probNum);
    fcMap.set(stage, f);
  }
  const forecastFunnel = Array.from(fcMap.entries())
    .map(([etapa, d]) => ({
      etapa, count: d.count, value: d.value,
      avgProb: d.probs.length > 0 ? d.probs.reduce((a, b) => a + b, 0) / d.probs.length : 0,
    }))
    .sort((a, b) => b.value - a.value);

  // ETN Top 10
  const etnSeen = new Set<string>();
  const etnMap = new Map<string, { count: number; value: number }>();
  for (const r of records) {
    if (r.probNum < 75 || etnSeen.has(r.oppId)) continue;
    etnSeen.add(r.oppId);
    const e = etnMap.get(r.etn) || { count: 0, value: 0 };
    e.count++;
    e.value += r.valorPrevisto;
    etnMap.set(r.etn, e);
  }
  const etnTop10 = Array.from(etnMap.entries())
    .map(([name, d]) => ({ name: name.length > 20 ? name.slice(0, 20) + '...' : name, fullName: name, ...d }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Motivos de perda
  const motivoMap = new Map<string, number>();
  for (const r of records) {
    if (r.etapa !== 'Fechada e Perdida') continue;
    const motivo = r.motivoPerda || 'Sem motivo';
    motivoMap.set(motivo, (motivoMap.get(motivo) || 0) + r.valorPrevisto);
  }
  const motivosPerda = Array.from(motivoMap.entries())
    .map(([motivo, value]) => ({ motivo, count: value }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    records,
    missingAgendas,
    filterOptions,
    kpis: { totalOps: seenOps.size, totalAgendas },
    motivosPerda,
    funnelData,
    forecastFunnel,
    etnTop10,
  };
}

// ====== MESSAGE HANDLER ======

self.onmessage = (event: MessageEvent) => {
  const { type } = event.data;

  if (type === 'process') {
    // Modo antigo: recebe dados já parseados
    try {
      const result = processData(event.data.opportunities, event.data.actions);
      self.postMessage({ type: 'result', ...result });
    } catch (error) {
      self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
    }
  } else if (type === 'processFiles') {
    // Modo novo: recebe ArrayBuffers e faz tudo no worker
    try {
      const { oppBuffer, actBuffer, oppFileName, actFileName } = event.data;

      self.postMessage({ type: 'progress', stage: 'parsing', progress: 5, message: 'Lendo arquivo de oportunidades...' });

      let opportunities: any[] = [];
      let actions: any[] = [];

      if (oppBuffer) {
        self.postMessage({ type: 'progress', stage: 'parsing', progress: 15, message: 'Parseando oportunidades...' });
        
        if (oppFileName?.toLowerCase().endsWith('.csv')) {
          const oppText = readFileBuffer(oppBuffer);
          const firstLine = oppText.split(/\r?\n/)[0] || '';
          const sep = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';
          opportunities = parseCSVText(oppText, sep);
        } else {
          const workbook = XLSX.read(new Uint8Array(oppBuffer), { type: 'array' });
          for (const sheetName of workbook.SheetNames) {
            const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[];
            opportunities.push(...data);
          }
        }
        self.postMessage({ type: 'progress', stage: 'parsing', progress: 35, message: `${opportunities.length} oportunidades carregadas` });
      }

      if (actBuffer) {
        self.postMessage({ type: 'progress', stage: 'parsing', progress: 40, message: 'Lendo arquivo de compromissos...' });
        self.postMessage({ type: 'progress', stage: 'parsing', progress: 50, message: 'Parseando compromissos...' });
        
        if (actFileName?.toLowerCase().endsWith('.csv')) {
          const actText = readFileBuffer(actBuffer);
          const firstLine = actText.split(/\r?\n/)[0] || '';
          const sep = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';
          actions = parseCSVText(actText, sep);
        } else {
          const workbook = XLSX.read(new Uint8Array(actBuffer), { type: 'array' });
          for (const sheetName of workbook.SheetNames) {
            const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[];
            actions.push(...data);
          }
        }
        self.postMessage({ type: 'progress', stage: 'parsing', progress: 70, message: `${actions.length} compromissos carregados` });
      }

      if (!opportunities.length && !actions.length) {
        self.postMessage({ type: 'error', message: 'Nenhum dado válido encontrado nos arquivos.' });
        return;
      }

      self.postMessage({ type: 'progress', stage: 'processing', progress: 75, message: 'Processando dados...' });

      const result = processData(opportunities, actions);

      self.postMessage({ type: 'progress', stage: 'done', progress: 95, message: 'Finalizando...' });
      self.postMessage({ type: 'result', ...result });

    } catch (error) {
      self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Erro ao processar arquivos' });
    }
  }
};
