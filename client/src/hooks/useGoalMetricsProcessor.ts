import { useMemo } from 'react';
import type { GoalRecord, PedidoRecord, GoalMetrics } from '@/types/goals';
import type { ProcessedRecord } from './useDataProcessor';

/**
 * Processa metas e pedidos para calcular % de atingimento por ETN.
 * 
 * Fluxo de mapeamento:
 * Meta (ID Usuário) → Compromisso (Id Usuário ERP) → Oportunidade (Oportunidade ID) → Pedido (ID OPORTUNIDADE)
 * 
 * No processedData, o campo `etn` é o nome do usuário do compromisso.
 * A meta é global para o ID Usuário (ex: 11124 = Rafael Perotoni).
 * A realização é calculada somando pedidos de todas as oportunidades vinculadas a esse ETN.
 */
export const useGoalMetricsProcessor = (
  goals: GoalRecord[],
  pedidos: PedidoRecord[],
  processedData: ProcessedRecord[],
  selectedPeriod: string
) => {
  const metricas = useMemo((): GoalMetrics[] => {
    // Se não tem dados processados, retornar vazio
    if (!processedData.length) return [];

    // Mapear período para meses
    const periodToMonths: Record<string, string[]> = {
      'Janeiro': ['Janeiro'],
      'Fevereiro': ['Fevereiro'],
      'Março': ['Março'],
      '1ºTrimestre': ['Janeiro', 'Fevereiro', 'Março'],
      'Abril': ['Abril'],
      'Maio': ['Maio'],
      'Junho': ['Junho'],
      '2ºTrimestre': ['Abril', 'Maio', 'Junho'],
      'Julho': ['Julho'],
      'Agosto': ['Agosto'],
      'Setembro': ['Setembro'],
      '3ºTrimestre': ['Julho', 'Agosto', 'Setembro'],
      'Outubro': ['Outubro'],
      'Novembro': ['Novembro'],
      'Dezembro': ['Dezembro'],
      '4ºTrimestre': ['Outubro', 'Novembro', 'Dezembro'],
    };

    const months = periodToMonths[selectedPeriod] || [];
    if (!months.length) return [];

    // Obter lista única de ETNs
    const allEtns = Array.from(new Set(processedData.map(r => r.etn)));

    // Se não tem metas ou pedidos, retornar métricas vazias para cada ETN
    if (!goals.length || !pedidos.length) {
      return allEtns.map(etn => ({
        idUsuario: '',
        etn,
        periodo: selectedPeriod,
        metaLicencasServicos: 0,
        realLicencasServicos: 0,
        metaRecorrente: 0,
        realRecorrente: 0,
        percentualAtingimento: 0,
      }));
    }

    // Passo 1: Calcular meta TOTAL para o período (soma de todas as rubricas/produtos)
    let metaTotalLicencasServicos = 0;
    let metaTotalRecorrente = 0;

    for (const goal of goals) {
      let metaValue = 0;
      for (const month of months) {
        if (month === 'Janeiro') metaValue += goal.janeiro;
        else if (month === 'Fevereiro') metaValue += goal.fevereiro;
        else if (month === 'Março') metaValue += goal.marco;
        else if (month === 'Abril') metaValue += goal.abril;
        else if (month === 'Maio') metaValue += goal.maio;
        else if (month === 'Junho') metaValue += goal.junho;
        else if (month === 'Julho') metaValue += goal.julho;
        else if (month === 'Agosto') metaValue += goal.agosto;
        else if (month === 'Setembro') metaValue += goal.setembro;
        else if (month === 'Outubro') metaValue += goal.outubro;
        else if (month === 'Novembro') metaValue += goal.novembro;
        else if (month === 'Dezembro') metaValue += goal.dezembro;
      }

      const rubrica = goal.rubrica.trim();
      if (rubrica.includes('Setup') || rubrica.includes('Licença') || rubrica.includes('Licenças')) {
        metaTotalLicencasServicos += metaValue;
      } else if (rubrica.includes('Serviços Não Recorrentes') || rubrica.includes('Servicos Nao Recorrentes')) {
        metaTotalLicencasServicos += metaValue;
      } else if (rubrica.includes('Recorrente')) {
        metaTotalRecorrente += metaValue;
      }
    }

    // Passo 2: Mapear oppId → ETN (pode ter múltiplos ETNs por opp)
    const oppIdToEtns = new Map<string, Set<string>>();
    for (const record of processedData) {
      if (!oppIdToEtns.has(record.oppId)) {
        oppIdToEtns.set(record.oppId, new Set());
      }
      oppIdToEtns.get(record.oppId)!.add(record.etn);
    }

    // Passo 3: Indexar pedidos por oppId
    const oppIdToPedidos = new Map<string, PedidoRecord[]>();
    for (const pedido of pedidos) {
      const oppId = pedido.idOportunidade.toString().trim();
      if (!oppId) continue;
      if (!oppIdToPedidos.has(oppId)) {
        oppIdToPedidos.set(oppId, []);
      }
      oppIdToPedidos.get(oppId)!.push(pedido);
    }

    // Passo 4: Calcular realização por ETN
    const etnRealizacao = new Map<string, { realLicencasServicos: number; realRecorrente: number }>();

    // Inicializar todas as ETNs
    for (const etn of allEtns) {
      etnRealizacao.set(etn, { realLicencasServicos: 0, realRecorrente: 0 });
    }

    // Somar pedidos por ETN
    for (const [oppId, oppPedidos] of Array.from(oppIdToPedidos.entries())) {
      const etns = oppIdToEtns.get(oppId);
      if (!etns || etns.size === 0) continue;

      // Calcular total de pedidos para esta oportunidade
      let totalLicServicos = 0;
      let totalRecorrente = 0;
      for (const pedido of oppPedidos) {
        totalLicServicos += (pedido.produtoValorLicenca || 0) + (pedido.servicoValorLiquido || 0);
        totalRecorrente += pedido.produtoValorManutencao || 0;
      }

      // Distribuir proporcionalmente entre ETNs (se múltiplos)
      const numEtns = etns.size;
      for (const etn of Array.from(etns)) {
        const real = etnRealizacao.get(etn)!;
        real.realLicencasServicos += totalLicServicos / numEtns;
        real.realRecorrente += totalRecorrente / numEtns;
      }
    }

    // Passo 5: Calcular realização TOTAL (soma de todos os ETNs)
    let realTotalLicencasServicos = 0;
    let realTotalRecorrente = 0;
    for (const [, real] of Array.from(etnRealizacao.entries())) {
      realTotalLicencasServicos += real.realLicencasServicos;
      realTotalRecorrente += real.realRecorrente;
    }

    // Passo 6: Calcular % de atingimento GLOBAL
    const percentualLicencasGlobal = metaTotalLicencasServicos > 0
      ? (realTotalLicencasServicos / metaTotalLicencasServicos) * 100
      : 0;
    const percentualRecorrenteGlobal = metaTotalRecorrente > 0
      ? (realTotalRecorrente / metaTotalRecorrente) * 100
      : 0;
    const percentualGlobal = (percentualLicencasGlobal * 0.5) + (percentualRecorrenteGlobal * 0.5);

    // Passo 7: Montar resultado - uma entrada GLOBAL + uma por ETN
    const result: GoalMetrics[] = [];

    // Entrada global (resumo)
    result.push({
      idUsuario: goals[0]?.idUsuario || '',
      etn: 'TOTAL',
      periodo: selectedPeriod,
      metaLicencasServicos: metaTotalLicencasServicos,
      realLicencasServicos: realTotalLicencasServicos,
      metaRecorrente: metaTotalRecorrente,
      realRecorrente: realTotalRecorrente,
      percentualAtingimento: Math.round(percentualGlobal * 100) / 100,
    });

    // Entradas por ETN (sem meta individual, apenas realização)
    for (const etn of allEtns) {
      const real = etnRealizacao.get(etn) || { realLicencasServicos: 0, realRecorrente: 0 };
      
      // Calcular contribuição percentual deste ETN para o total
      const contribLicServicos = realTotalLicencasServicos > 0
        ? (real.realLicencasServicos / realTotalLicencasServicos) * 100
        : 0;
      const contribRecorrente = realTotalRecorrente > 0
        ? (real.realRecorrente / realTotalRecorrente) * 100
        : 0;

      result.push({
        idUsuario: goals[0]?.idUsuario || '',
        etn,
        periodo: selectedPeriod,
        metaLicencasServicos: metaTotalLicencasServicos,
        realLicencasServicos: real.realLicencasServicos,
        metaRecorrente: metaTotalRecorrente,
        realRecorrente: real.realRecorrente,
        percentualAtingimento: Math.round(((contribLicServicos + contribRecorrente) / 2) * 100) / 100,
      });
    }

    return result;
  }, [goals, pedidos, processedData, selectedPeriod]);

  return metricas;
};
