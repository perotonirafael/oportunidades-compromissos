import { useMemo } from 'react';

export interface Opportunity { [key: string]: any; }
export interface Action { [key: string]: any; }

export interface ProcessedRecord {
  oppId: string;
  conta: string;
  contaId: string;
  representante: string;
  responsavel: string;
  etn: string; // Renomeado de usuarioAcao → ETN
  etapa: string;
  probabilidade: string;
  probNum: number;
  anoPrevisao: string;
  mesPrevisao: string;
  mesFech: string;
  valorPrevisto: number;
  valorFechado: number;
  agenda: number; // Renomeado de qtdAcoes → Agenda
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

export interface MissingAgendaRecord {
  oppId: string;
  conta: string;
  contaId: string;
  etn: string;
  etapa: string;
  probabilidade: string;
  valorPrevisto: number;
  mesFech: string;
  anoPrevisao: string;
  oppAnteriorId: string;
  oppAnteriorEtapa: string;
  agendaAnterior: number;
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

export function useDataProcessor(opportunities: Opportunity[], actions: Action[]) {
  const combinedData = useMemo(() => {
    if (!opportunities.length && !actions.length) return null;

    // INDEX: Ações agrupadas APENAS por Oportunidade ID (Item 12: remover fallback por Conta ID)
    const actionsByOppId = new Map<string, Action[]>();
    for (const act of actions) {
      const oppId = trim(act['Oportunidade ID']);
      if (oppId) {
        if (!actionsByOppId.has(oppId)) actionsByOppId.set(oppId, []);
        actionsByOppId.get(oppId)!.push(act);
      }
    }

    // INDEX: Para Agendas Faltantes - mapear ETN → Conta ID → Oportunidades com compromissos
    const etnContaOppMap = new Map<string, Map<string, Set<string>>>(); // etn → contaId → Set<oppId>

    // PROCESSAMENTO: Desdobramento 1:N
    const records: ProcessedRecord[] = [];

    for (const opp of opportunities) {
      const oppId = trim(opp['Oportunidade ID']);
      const contaId = trim(opp['Conta ID']);
      const conta = trim(opp['Conta']);
      const { month, year, monthNum } = parseDate(trim(opp['Previsão de Fechamento']));
      const prob = cleanProb(opp['Prob.']);
      const valorPrevisto = parseValue(opp['Valor Previsto']);
      const valorFechado = parseValue(opp['Valor Fechado']);

      // Encontrar ações vinculadas APENAS por Oportunidade ID
      const linkedActions = actionsByOppId.get(oppId) || [];

      if (linkedActions.length > 0) {
        // Agrupar por ETN (usuário)
        const byUser = new Map<string, Action[]>();
        for (const act of linkedActions) {
          const user = trim(act['Usuario']) || trim(act['Responsavel']) || trim(act['Usuário Ação']) || 'Sem Agenda';
          if (!byUser.has(user)) byUser.set(user, []);
          byUser.get(user)!.push(act);
        }

        // Desdobrar: 1 linha por ETN
        for (const [user, userActions] of Array.from(byUser.entries())) {
          // Registrar no mapa ETN → Conta → Opp (para Agendas Faltantes)
          if (contaId && user !== 'Sem Agenda') {
            if (!etnContaOppMap.has(user)) etnContaOppMap.set(user, new Map());
            const contaMap = etnContaOppMap.get(user)!;
            if (!contaMap.has(contaId)) contaMap.set(contaId, new Set());
            contaMap.get(contaId)!.add(oppId);
          }

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
            oppId, conta, contaId,
            representante: trim(opp['Representante']),
            responsavel: trim(opp['Responsável']),
            etn: user,
            etapa: trim(opp['Etapa']),
            probabilidade: prob.str,
            probNum: prob.num,
            anoPrevisao: year,
            mesPrevisao: monthNum.toString(),
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
        // Oportunidade sem ações
        records.push({
          oppId, conta, contaId,
          representante: trim(opp['Representante']),
          responsavel: trim(opp['Responsável']),
          etn: 'Sem Agenda',
          etapa: trim(opp['Etapa']),
          probabilidade: prob.str,
          probNum: prob.num,
          anoPrevisao: year,
          mesPrevisao: monthNum.toString(),
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

    // AGENDAS FALTANTES (Item 14):
    // Para cada ETN que atuou em oportunidade de um cliente,
    // verificar se há outra oportunidade do mesmo cliente SEM compromisso desse ETN
    const missingAgendas: MissingAgendaRecord[] = [];
    const oppById = new Map<string, Opportunity>();
    for (const opp of opportunities) {
      oppById.set(trim(opp['Oportunidade ID']), opp);
    }

    // Agrupar oportunidades por Conta ID
    const oppsByContaId = new Map<string, Opportunity[]>();
    for (const opp of opportunities) {
      const cid = trim(opp['Conta ID']);
      if (cid) {
        if (!oppsByContaId.has(cid)) oppsByContaId.set(cid, []);
        oppsByContaId.get(cid)!.push(opp);
      }
    }

    for (const [etn, contaMap] of Array.from(etnContaOppMap.entries())) {
      for (const [contaId, oppIdsWithAction] of Array.from(contaMap.entries())) {
        const allOppsForConta = oppsByContaId.get(contaId) || [];
        for (const opp of allOppsForConta) {
          const thisOppId = trim(opp['Oportunidade ID']);
          // Se este ETN NÃO tem compromisso nesta oportunidade
          if (!oppIdsWithAction.has(thisOppId)) {
            const etapa = trim(opp['Etapa']);
            // Só considerar oportunidades abertas (não fechadas)
            if (etapa !== 'Fechada e Ganha' && etapa !== 'Fechada e Ganha TR' && etapa !== 'Fechada e Perdida') {
              const { month, year } = parseDate(trim(opp['Previsão de Fechamento']));
              const prob = cleanProb(opp['Prob.']);
              // Encontrar a oportunidade anterior com compromisso
              const prevOppId = Array.from(oppIdsWithAction)[0];
              const prevOpp = oppById.get(prevOppId);
              const prevEtapa = prevOpp ? trim(prevOpp['Etapa']) : '';
              const prevActions = actionsByOppId.get(prevOppId) || [];
              const prevAgendaCount = prevActions.filter(a => {
                const u = trim(a['Usuario']) || trim(a['Responsavel']) || trim(a['Usuário Ação']);
                return u === etn;
              }).length;

              missingAgendas.push({
                oppId: thisOppId,
                conta: trim(opp['Conta']),
                contaId,
                etn,
                etapa,
                probabilidade: prob.str,
                valorPrevisto: parseValue(opp['Valor Previsto']),
                mesFech: month,
                anoPrevisao: year,
                oppAnteriorId: prevOppId,
                oppAnteriorEtapa: prevEtapa,
                agendaAnterior: prevAgendaCount,
              });
            }
          }
        }
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

    // FORECAST FECHAMENTO ≥75% (Item 7): Valor previsto de oportunidades abertas com prob ≥ 75%
    let forecastFechamento75 = 0;
    const forecastSeen = new Set<string>();
    for (const opp of opportunities) {
      const id = trim(opp['Oportunidade ID']);
      if (forecastSeen.has(id)) continue;
      forecastSeen.add(id);
      const etapa = trim(opp['Etapa']);
      if (etapa !== 'Fechada e Ganha' && etapa !== 'Fechada e Ganha TR' && etapa !== 'Fechada e Perdida') {
        const prob = cleanProb(opp['Prob.']);
        if (prob.num >= 75) {
          forecastFechamento75 += parseValue(opp['Valor Previsto']);
        }
      }
    }

    // Motivos de perda (baseado em oportunidades únicas)
    const motivosPerda = new Map<string, number>();
    const motivosSeen = new Set<string>();
    for (const opp of opportunities) {
      const id = trim(opp['Oportunidade ID']);
      if (motivosSeen.has(id)) continue;
      motivosSeen.add(id);
      if (trim(opp['Etapa']) === 'Fechada e Perdida') {
        const motivo = trim(opp['Motivo da Perda']) || trim(opp['Motivo de Fechamento']) || 'Não informado';
        motivosPerda.set(motivo, (motivosPerda.get(motivo) || 0) + 1);
      }
    }

    // Funil por etapa
    const funnelData = new Map<string, { count: number; value: number }>();
    const funnelSeen = new Set<string>();
    for (const opp of opportunities) {
      const id = trim(opp['Oportunidade ID']);
      if (funnelSeen.has(id)) continue;
      funnelSeen.add(id);
      const etapa = trim(opp['Etapa']);
      if (!etapa) continue;
      const val = parseValue(opp['Valor Previsto']);
      const existing = funnelData.get(etapa) || { count: 0, value: 0 };
      existing.count++;
      existing.value += val;
      funnelData.set(etapa, existing);
    }

    // Funil de Forecast (Item 8): Oportunidades com prob ≥ 75%, agrupadas por etapa
    const forecastFunnel = new Map<string, { count: number; value: number; avgProb: number; totalProb: number }>();
    const forecastFunnelSeen = new Set<string>();
    for (const opp of opportunities) {
      const id = trim(opp['Oportunidade ID']);
      if (forecastFunnelSeen.has(id)) continue;
      forecastFunnelSeen.add(id);
      const etapa = trim(opp['Etapa']);
      if (etapa === 'Fechada e Ganha' || etapa === 'Fechada e Ganha TR' || etapa === 'Fechada e Perdida') continue;
      const prob = cleanProb(opp['Prob.']);
      if (prob.num >= 75) {
        const val = parseValue(opp['Valor Previsto']);
        const existing = forecastFunnel.get(etapa) || { count: 0, value: 0, avgProb: 0, totalProb: 0 };
        existing.count++;
        existing.value += val;
        existing.totalProb += prob.num;
        forecastFunnel.set(etapa, existing);
      }
    }
    // Calcular média de probabilidade
    for (const [, data] of Array.from(forecastFunnel.entries())) {
      data.avgProb = data.count > 0 ? data.totalProb / data.count : 0;
    }

    // ETN Top 10 (Item 10): Comparar qtd oportunidades e valor previsto por ETN (prob ≥ 75%)
    const etnData = new Map<string, { count: number; value: number }>();
    const etnSeen = new Map<string, Set<string>>(); // etn → Set<oppId>
    for (const r of records) {
      if (r.etn === 'Sem Agenda') continue;
      if (r.etapa === 'Fechada e Ganha' || r.etapa === 'Fechada e Ganha TR' || r.etapa === 'Fechada e Perdida') continue;
      if (r.probNum < 75) continue;
      if (!etnSeen.has(r.etn)) etnSeen.set(r.etn, new Set());
      if (etnSeen.get(r.etn)!.has(r.oppId)) continue;
      etnSeen.get(r.etn)!.add(r.oppId);
      const e = etnData.get(r.etn) || { count: 0, value: 0 };
      e.count++;
      e.value += r.valorPrevisto;
      etnData.set(r.etn, e);
    }

    // Opções de filtro
    const filterSets = {
      years: new Set<string>(),
      months: new Set<string>(),
      representantes: new Set<string>(),
      responsaveis: new Set<string>(),
      etns: new Set<string>(),
      etapas: new Set<string>(),
      probabilidades: new Set<string>(),
      agenda: new Set<string>(),
      contas: new Set<string>(),
      tipos: new Set<string>(),
      origens: new Set<string>(),
      segmentos: new Set<string>(),
    };

    for (const r of records) {
      if (r.anoPrevisao) filterSets.years.add(r.anoPrevisao);
      if (r.mesFech && r.mesFech !== '') filterSets.months.add(r.mesFech);
      if (r.representante) filterSets.representantes.add(r.representante);
      if (r.responsavel) filterSets.responsaveis.add(r.responsavel);
      if (r.etn) filterSets.etns.add(r.etn);
      if (r.etapa) filterSets.etapas.add(r.etapa);
      if (r.probabilidade) filterSets.probabilidades.add(r.probabilidade);
      if (r.tipoOportunidade) filterSets.tipos.add(r.tipoOportunidade);
      if (r.origemOportunidade) filterSets.origens.add(r.origemOportunidade);
      if (r.cnaeSegmento) filterSets.segmentos.add(r.cnaeSegmento);
      const q = r.agenda;
      filterSets.agenda.add(q === 0 ? '0' : q === 1 ? '1' : q === 2 ? '2' : '3+');
    }
    for (const r of records) {
      if (r.agenda > 0) filterSets.contas.add(r.conta);
    }

    return {
      records,
      missingAgendas,
      kpis: {
        uniqueOps: uniqueOppIds.size,
        totalActions: actions.length,
        hotOps: hotOpsIds.size,
        totalValue: totalValueDedup,
        totalFechado: totalFechadoDedup,
        ganhasCount, perdidasCount, abertasCount,
        ganhasValor, perdidasValor, abertasValor,
        forecastFechamento75,
        pipelineAberto: abertasValor,
      },
      motivosPerda: Array.from(motivosPerda.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([motivo, count]) => ({ motivo, count })),
      funnelData: Array.from(funnelData.entries())
        .map(([etapa, data]) => ({ etapa, ...data }))
        .sort((a, b) => b.count - a.count),
      forecastFunnel: Array.from(forecastFunnel.entries())
        .map(([etapa, data]) => ({ etapa, count: data.count, value: data.value, avgProb: Math.round(data.avgProb) }))
        .sort((a, b) => b.value - a.value),
      etnTop10: Array.from(etnData.entries())
        .map(([name, d]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, fullName: name, ...d }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
      filterOptions: {
        years: Array.from(filterSets.years).sort(),
        months: Array.from(filterSets.months).sort((a, b) => {
          const order = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
          return order.indexOf(a) - order.indexOf(b);
        }),
        representantes: Array.from(filterSets.representantes).sort(),
        responsaveis: Array.from(filterSets.responsaveis).sort(),
        etns: Array.from(filterSets.etns).sort(),
        etapas: Array.from(filterSets.etapas).sort(),
        probabilidades: Array.from(filterSets.probabilidades).sort((a, b) => parseInt(a) - parseInt(b)),
        agenda: ['0', '1', '2', '3+'].filter(c => filterSets.agenda.has(c)),
        contas: Array.from(filterSets.contas).sort(),
        tipos: Array.from(filterSets.tipos).sort(),
        origens: Array.from(filterSets.origens).sort(),
        segmentos: Array.from(filterSets.segmentos).sort(),
      },
    };
  }, [opportunities, actions]);

  return combinedData;
}
