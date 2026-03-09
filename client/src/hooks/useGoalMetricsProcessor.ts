import { useMemo } from 'react';
import type { GoalRecord, PedidoRecord, GoalMetrics } from '@/types/goals';
import type { ProcessedRecord } from './useDataProcessor';

export const useGoalMetricsProcessor = (
  goals: GoalRecord[],
  pedidos: PedidoRecord[],
  processedData: ProcessedRecord[],
  selectedPeriod: string // "Janeiro", "1ºTrimestre", etc
) => {
  const metricas = useMemo(() => {
    if (!goals.length || !pedidos.length || !processedData.length) return [];

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

    // Mapear ID Oportunidade → ETN a partir dos dados processados
    const oppIdToEtn = new Map<string, string>();
    for (const record of processedData) {
      oppIdToEtn.set(record.oppId, record.etn);
    }

    // Mapear ID Oportunidade → Pedidos
    const oppIdToPedidos = new Map<string, PedidoRecord[]>();
    for (const pedido of pedidos) {
      const oppId = pedido.idOportunidade.toString().trim();
      if (!oppId) continue;
      if (!oppIdToPedidos.has(oppId)) {
        oppIdToPedidos.set(oppId, []);
      }
      oppIdToPedidos.get(oppId)!.push(pedido);
    }

    // Calcular receita por ETN
    const etnMetricas = new Map<string, {
      idUsuario: string;
      etn: string;
      metaLicencasServicos: number;
      realLicencasServicos: number;
      metaRecorrente: number;
      realRecorrente: number;
    }>();

    // Somar metas por ID Usuário e rubrica para o período selecionado
    for (const goal of goals) {
      const idUsuario = goal.idUsuario.trim();
      const rubrica = goal.rubrica.trim();

      // Calcular meta para o período
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

      // Encontrar ETN associado a este ID Usuário (via compromissos)
      let etnForUser = '';
      for (const record of processedData) {
        // Tentar encontrar correspondência via ID Usuário
        // Por enquanto, vamos usar um mapeamento simples baseado no nome
        // TODO: Melhorar este mapeamento quando houver campo de ID Usuário nos compromissos
      }

      // Se não encontrou ETN, pular
      if (!etnForUser) {
        // Usar ID Usuário como chave temporária
        etnForUser = `ID_${idUsuario}`;
      }

      // Inicializar métrica se não existe
      if (!etnMetricas.has(etnForUser)) {
        etnMetricas.set(etnForUser, {
          idUsuario,
          etn: etnForUser,
          metaLicencasServicos: 0,
          realLicencasServicos: 0,
          metaRecorrente: 0,
          realRecorrente: 0,
        });
      }

      const metrica = etnMetricas.get(etnForUser)!;

      // Adicionar meta conforme rubrica
      if (rubrica.includes('Setup') || rubrica.includes('Serviços Não Recorrentes')) {
        metrica.metaLicencasServicos += metaValue;
      } else if (rubrica.includes('Recorrente')) {
        metrica.metaRecorrente += metaValue;
      }
    }

    // Calcular receita real a partir de pedidos cruzados com oportunidades
    const etnRealizacao = new Map<string, {
      realLicencasServicos: number;
      realRecorrente: number;
    }>();

    Array.from(oppIdToPedidos.keys()).forEach((oppId) => {
      const etn = oppIdToEtn.get(oppId);
      if (!etn) return;

      const oppPedidos = oppIdToPedidos.get(oppId)!;

      if (!etnRealizacao.has(etn)) {
        etnRealizacao.set(etn, {
          realLicencasServicos: 0,
          realRecorrente: 0,
        });
      }

      const realization = etnRealizacao.get(etn)!;

      // Somar receita de pedidos para esta oportunidade
      for (const pedido of oppPedidos) {
        // Licenças + Serviços Não Recorrentes
        const licencasServicos =
          (pedido.produtoValorLicenca || 0) +
          (pedido.servicoValorLiquido || 0);

        // Recorrente (Manutenção)
        const recorrente = pedido.produtoValorManutencao || 0;

        realization.realLicencasServicos += licencasServicos;
        realization.realRecorrente += recorrente;
      }
    });

    // Aplicar realização às métricas
    Array.from(etnRealizacao.entries()).forEach(([etn, realization]) => {
      if (!etnMetricas.has(etn)) {
        etnMetricas.set(etn, {
          idUsuario: '',
          etn,
          metaLicencasServicos: 0,
          realLicencasServicos: 0,
          metaRecorrente: 0,
          realRecorrente: 0,
        });
      }

      const metrica = etnMetricas.get(etn)!;
      metrica.realLicencasServicos = realization.realLicencasServicos;
      metrica.realRecorrente = realization.realRecorrente;
    });

    // Calcular % de atingimento com pesos
    const result: GoalMetrics[] = Array.from(etnMetricas.values())
      .filter((m) => m.metaLicencasServicos > 0 || m.metaRecorrente > 0) // Filtrar apenas ETNs com metas
      .map((m) => {
        const percentualLicencas =
          m.metaLicencasServicos > 0
            ? (m.realLicencasServicos / m.metaLicencasServicos) * 100
            : 0;

        const percentualRecorrente =
          m.metaRecorrente > 0
            ? (m.realRecorrente / m.metaRecorrente) * 100
            : 0;

        // Aplicar pesos: 50% cada
        const percentualAtingimento =
          (percentualLicencas * 0.5) + (percentualRecorrente * 0.5);

        return {
          idUsuario: m.idUsuario,
          etn: m.etn,
          periodo: selectedPeriod,
          metaLicencasServicos: m.metaLicencasServicos,
          realLicencasServicos: m.realLicencasServicos,
          metaRecorrente: m.metaRecorrente,
          realRecorrente: m.realRecorrente,
          percentualAtingimento: Math.round(percentualAtingimento * 100) / 100,
        };
      });

    return result.sort((a, b) => b.percentualAtingimento - a.percentualAtingimento);
  }, [goals, pedidos, processedData, selectedPeriod]);

  return metricas;
};
