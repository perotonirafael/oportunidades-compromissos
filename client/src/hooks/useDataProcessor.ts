import { useMemo } from 'react';

export interface Opportunity { [key: string]: any; }
export interface Action { [key: string]: any; }

export interface ProcessedRecord {
  oppId: string;
  conta: string;
  representante: string;
  responsavel: string;
  usuarioAcao: string;
  etapa: string;
  probabilidade: string;
  probNum: number;
  anoPrevisao: string;
  mesPrevisao: string;
  mesFech: string;
  valorPrevisto: number;
  valorFechado: number;
  qtdAcoes: number;
  tipoOportunidade: string;
  subtipoOportunidade: string;
  origemOportunidade: string;
  motivoFechamento: string;
  motivoPerda: string;
  concorrentes: string;
  cidade: string;
  estado: string;
  cnaeSegmento: string;
  categoriaCompromisso: string;
  atividadeCompromisso: string;
}

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
    if (mesClean >= 1 && mesClean <= 12 && anoClean.length === 4) {
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

export function useDataProcessor(opportunities: Opportunity[], actions: Action[]) {
  const combinedData = useMemo(() => {
    if (!opportunities.length && !actions.length) return null;

    // INDEX: Oportunidades por ID (O(1) lookup)
    const oppById = new Map<string, Opportunity>();
    const oppByContaId = new Map<string, Opportunity[]>();

    for (const opp of opportunities) {
      const id = trim(opp['Oportunidade ID']);
      if (id) oppById.set(id, opp);
      const contaId = trim(opp['Conta ID']);
      if (contaId) {
        if (!oppByContaId.has(contaId)) oppByContaId.set(contaId, []);
        oppByContaId.get(contaId)!.push(opp);
      }
    }

    // INDEX: Ações agrupadas por Oportunidade ID e Conta ID
    const actionsByOppId = new Map<string, Action[]>();
    const actionsByContaId = new Map<string, Action[]>();

    for (const act of actions) {
      const oppId = trim(act['Oportunidade ID']);
      const contaId = trim(act['Conta ID']);
      if (oppId) {
        if (!actionsByOppId.has(oppId)) actionsByOppId.set(oppId, []);
        actionsByOppId.get(oppId)!.push(act);
      }
      if (contaId) {
        if (!actionsByContaId.has(contaId)) actionsByContaId.set(contaId, []);
        actionsByContaId.get(contaId)!.push(act);
      }
    }

    // PROCESSAMENTO: Desdobramento 1:N
    const records: ProcessedRecord[] = [];
    const dedupValues = new Set<string>(); // Deduplicação financeira
    const accountsWithActions = new Set<string>();

    for (const opp of opportunities) {
      const oppId = trim(opp['Oportunidade ID']);
      const contaId = trim(opp['Conta ID']);
      const conta = trim(opp['Conta']);
      const { month, year, monthNum } = parseDate(trim(opp['Previsão de Fechamento']));
      const prob = cleanProb(opp['Prob.']);
      const valorPrevisto = parseValue(opp['Valor Previsto']);
      const valorFechado = parseValue(opp['Valor Fechado']);

      // Encontrar ações vinculadas (prioridade: Oportunidade ID, fallback: Conta ID)
      let linkedActions = actionsByOppId.get(oppId) || [];
      if (linkedActions.length === 0 && contaId) {
        linkedActions = actionsByContaId.get(contaId) || [];
      }

      if (linkedActions.length > 0) {
        accountsWithActions.add(conta);

        // Agrupar por usuário
        const byUser = new Map<string, Action[]>();
        for (const act of linkedActions) {
          const user = trim(act['Usuario']) || trim(act['Responsavel']) || trim(act['Usuário Ação']) || 'Sem Ação';
          if (!byUser.has(user)) byUser.set(user, []);
          byUser.get(user)!.push(act);
        }

        // Desdobrar: 1 linha por usuário
        for (const [user, userActions] of Array.from(byUser.entries())) {
          // Categoria mais frequente
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
            oppId,
            conta,
            representante: trim(opp['Representante']),
            responsavel: trim(opp['Responsável']),
            usuarioAcao: user,
            etapa: trim(opp['Etapa']),
            probabilidade: prob.str,
            probNum: prob.num,
            anoPrevisao: year,
            mesPrevisao: monthNum.toString(),
            mesFech: month,
            valorPrevisto,
            valorFechado,
            qtdAcoes: userActions.length,
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
        // Oportunidade sem ações
        records.push({
          oppId,
          conta,
          representante: trim(opp['Representante']),
          responsavel: trim(opp['Responsável']),
          usuarioAcao: 'Sem Ação',
          etapa: trim(opp['Etapa']),
          probabilidade: prob.str,
          probNum: prob.num,
          anoPrevisao: year,
          mesPrevisao: monthNum.toString(),
          mesFech: month,
          valorPrevisto,
          valorFechado,
          qtdAcoes: 0,
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

    // KPIs com deduplicação financeira
    const uniqueOppIds = new Set<string>();
    let totalValueDedup = 0;
    let totalFechadoDedup = 0;
    const hotOpsIds = new Set<string>();
    let ganhasCount = 0;
    let perdidasCount = 0;
    let abertasCount = 0;
    let ganhasValor = 0;
    let perdidasValor = 0;
    let abertasValor = 0;

    for (const opp of opportunities) {
      const id = trim(opp['Oportunidade ID']);
      if (uniqueOppIds.has(id)) continue;
      uniqueOppIds.add(id);
      const val = parseValue(opp['Valor Previsto']);
      const valFech = parseValue(opp['Valor Fechado']);
      totalValueDedup += val;
      totalFechadoDedup += valFech;
      const prob = cleanProb(opp['Prob.']);
      if (prob.num >= 75) hotOpsIds.add(id);
      const etapa = trim(opp['Etapa']);
      if (etapa === 'Fechada e Ganha' || etapa === 'Fechada e Ganha TR') {
        ganhasCount++; ganhasValor += val;
      } else if (etapa === 'Fechada e Perdida') {
        perdidasCount++; perdidasValor += val;
      } else {
        abertasCount++; abertasValor += val;
      }
    }

    // Forecast ponderado (pipeline aberto)
    let forecastPonderado = 0;
    for (const opp of opportunities) {
      const etapa = trim(opp['Etapa']);
      if (etapa !== 'Fechada e Ganha' && etapa !== 'Fechada e Ganha TR' && etapa !== 'Fechada e Perdida') {
        const val = parseValue(opp['Valor Previsto']);
        const prob = cleanProb(opp['Prob.']);
        forecastPonderado += val * (prob.num / 100);
      }
    }

    // Motivos de perda
    const motivosPerda = new Map<string, number>();
    for (const opp of opportunities) {
      if (trim(opp['Etapa']) === 'Fechada e Perdida') {
        const motivo = trim(opp['Motivo da Perda']) || trim(opp['Motivo de Fechamento']) || 'Não informado';
        motivosPerda.set(motivo, (motivosPerda.get(motivo) || 0) + 1);
      }
    }

    // Funil por etapa
    const funnelData = new Map<string, { count: number; value: number }>();
    for (const opp of opportunities) {
      const etapa = trim(opp['Etapa']);
      if (!etapa) continue;
      const val = parseValue(opp['Valor Previsto']);
      const existing = funnelData.get(etapa) || { count: 0, value: 0 };
      existing.count++;
      existing.value += val;
      funnelData.set(etapa, existing);
    }

    // Opções de filtro
    const filterSets = {
      years: new Set<string>(),
      months: new Set<string>(),
      representantes: new Set<string>(),
      responsaveis: new Set<string>(),
      usuarios: new Set<string>(),
      etapas: new Set<string>(),
      probabilidades: new Set<string>(),
      qtdAcoes: new Set<string>(),
      contas: new Set<string>(),
      tipos: new Set<string>(),
      origens: new Set<string>(),
      segmentos: new Set<string>(),
    };

    for (const r of records) {
      if (r.anoPrevisao) filterSets.years.add(r.anoPrevisao);
      if (r.mesPrevisao && r.mesPrevisao !== '0') filterSets.months.add(r.mesPrevisao);
      if (r.representante) filterSets.representantes.add(r.representante);
      if (r.responsavel) filterSets.responsaveis.add(r.responsavel);
      if (r.usuarioAcao) filterSets.usuarios.add(r.usuarioAcao);
      if (r.etapa) filterSets.etapas.add(r.etapa);
      if (r.probabilidade) filterSets.probabilidades.add(r.probabilidade);
      if (r.tipoOportunidade) filterSets.tipos.add(r.tipoOportunidade);
      if (r.origemOportunidade) filterSets.origens.add(r.origemOportunidade);
      if (r.cnaeSegmento) filterSets.segmentos.add(r.cnaeSegmento);
      const q = r.qtdAcoes;
      filterSets.qtdAcoes.add(q === 0 ? '0' : q === 1 ? '1' : q === 2 ? '2' : '3+');
    }
    for (const r of records) {
      if (r.qtdAcoes > 0) filterSets.contas.add(r.conta);
    }

    const winRate = ganhasCount + perdidasCount > 0
      ? (ganhasCount / (ganhasCount + perdidasCount)) * 100 : 0;

    return {
      records,
      kpis: {
        uniqueOps: uniqueOppIds.size,
        totalActions: actions.length,
        hotOps: hotOpsIds.size,
        totalValue: totalValueDedup,
        totalFechado: totalFechadoDedup,
        ganhasCount, perdidasCount, abertasCount,
        ganhasValor, perdidasValor, abertasValor,
        winRate,
        forecastPonderado,
        pipelineAberto: abertasValor,
      },
      motivosPerda: Array.from(motivosPerda.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([motivo, count]) => ({ motivo, count })),
      funnelData: Array.from(funnelData.entries())
        .map(([etapa, data]) => ({ etapa, ...data }))
        .sort((a, b) => b.count - a.count),
      filterOptions: {
        years: Array.from(filterSets.years).sort(),
        months: Array.from(filterSets.months).map(Number).sort((a, b) => a - b).map(String),
        representantes: Array.from(filterSets.representantes).sort(),
        responsaveis: Array.from(filterSets.responsaveis).sort(),
        usuarios: Array.from(filterSets.usuarios).sort(),
        etapas: Array.from(filterSets.etapas).sort(),
        probabilidades: Array.from(filterSets.probabilidades).sort((a, b) => parseInt(a) - parseInt(b)),
        qtdAcoes: ['0', '1', '2', '3+'].filter(c => filterSets.qtdAcoes.has(c)),
        contas: Array.from(filterSets.contas).sort(),
        tipos: Array.from(filterSets.tipos).sort(),
        origens: Array.from(filterSets.origens).sort(),
        segmentos: Array.from(filterSets.segmentos).sort(),
      },
    };
  }, [opportunities, actions]);

  return combinedData;
}
