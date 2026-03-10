import { useMemo } from 'react';
import type { GoalRecord, PedidoRecord, GoalMetrics } from '@/types/goals';
import type { ProcessedRecord } from './useDataProcessor';

/**
 * Processa metas e pedidos para calcular % de atingimento por ETN.
 * 
 * Fluxo de mapeamento:
 * Meta (ID Usuário) → Compromisso (Id Usuário ERP) → Oportunidade (Oportunidade ID) → Pedido (ID OPORTUNIDADE)
 * 
 * Se não houver processedData (oportunidades/compromissos), mostra meta global como "Total".
 * Se não houver pedidos, mostra meta com realização zerada.
 */
export const useGoalMetricsProcessor = (
  goals: GoalRecord[],
  pedidos: PedidoRecord[],
  processedData: ProcessedRecord[],
  selectedPeriod: string
) => {
  const metricas = useMemo((): GoalMetrics[] => {
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

    // Se não tem metas, retornar vazio
    if (!goals.length) return [];

    // Calcular meta TOTAL para o período
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

    // Se não tem pedidos, retornar métricas com meta mas sem realização
    if (!pedidos.length) {
      // Obter lista única de ETNs (se houver processedData)
      const allEtns = processedData.length > 0 
        ? Array.from(new Set(processedData.map(r => r.etn)))
        : ['Total']; // Se não houver oportunidades, mostrar meta global

      return allEtns.map(etn => ({
        idUsuario: goals[0]?.idUsuario || '',
        etn,
        periodo: selectedPeriod,
        metaLicencasServicos: metaTotalLicencasServicos,
        realLicencasServicos: 0,
        metaRecorrente: metaTotalRecorrente,
        realRecorrente: 0,
        percentualAtingimento: 0,
      }));
    }

    // Obter lista única de ETNs
    const allEtns = processedData.length > 0
      ? Array.from(new Set(processedData.map(r => r.etn)))
      : ['Total'];

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
    const percentualAtingimentoGlobal = (percentualLicencasGlobal * 0.5) + (percentualRecorrenteGlobal * 0.5);

    // Passo 7: Retornar métricas por ETN
    return allEtns.map(etn => {
      const real = etnRealizacao.get(etn) || { realLicencasServicos: 0, realRecorrente: 0 };

      // Para ETNs individuais, calcular % proporcional
      const percentualLicencas = metaTotalLicencasServicos > 0
        ? (real.realLicencasServicos / metaTotalLicencasServicos) * 100
        : 0;
      const percentualRecorrente = metaTotalRecorrente > 0
        ? (real.realRecorrente / metaTotalRecorrente) * 100
        : 0;
      const percentualAtingimento = (percentualLicencas * 0.5) + (percentualRecorrente * 0.5);

      return {
        idUsuario: goals[0]?.idUsuario || '',
        etn,
        periodo: selectedPeriod,
        metaLicencasServicos: metaTotalLicencasServicos,
        realLicencasServicos: real.realLicencasServicos,
        metaRecorrente: metaTotalRecorrente,
        realRecorrente: real.realRecorrente,
        percentualAtingimento,
      };
    });
  }, [goals, pedidos, processedData, selectedPeriod]);

  return metricas;
};
