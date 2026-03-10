import { useMemo } from 'react';
import type { GoalRecord, PedidoRecord, GoalMetrics } from '@/types/goals';
import type { ProcessedRecord } from './useDataProcessor';

export const useGoalMetricsProcessor = (
  goals: GoalRecord[],
  pedidos: PedidoRecord[],
  processedData: ProcessedRecord[],
  selectedPeriod: string
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

    // Passo 1: Mapear ID Oportunidade → ETN a partir dos dados processados
    const oppIdToEtn = new Map<string, string>();
    for (const record of processedData) {
      oppIdToEtn.set(record.oppId, record.etn);
    }

    // Passo 2: Mapear ID Oportunidade → Pedidos
    const oppIdToPedidos = new Map<string, PedidoRecord[]>();
    for (const pedido of pedidos) {
      const oppId = pedido.idOportunidade.toString().trim();
      if (!oppId) continue;
      if (!oppIdToPedidos.has(oppId)) {
        oppIdToPedidos.set(oppId, []);
      }
      oppIdToPedidos.get(oppId)!.push(pedido);
    }

    // Passo 3: Calcular receita real por ETN a partir de pedidos
    const etnRealizacao = new Map<string, {
      realLicencasServicos: number;
      realRecorrente: number;
    }>();

    Array.from(oppIdToPedidos.keys()).forEach((oppId) => {
      const etn = oppIdToEtn.get(oppId);
      if (!etn) return; // Skip se não encontrar ETN

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

    // Passo 4: Calcular metas por ETN
    // Agrupar metas por ETN (via processedData)
    const etnMetas = new Map<string, {
      metaLicencasServicos: number;
      metaRecorrente: number;
    }>();

    // Primeiro, inicializar todas as ETNs com 0
    Array.from(new Set(processedData.map(r => r.etn))).forEach((etn) => {
      etnMetas.set(etn, {
        metaLicencasServicos: 0,
        metaRecorrente: 0,
      });
    });

    // Depois, somar as metas
    for (const goal of goals) {
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

      // Distribuir meta para todas as ETNs (simplificado)
      // TODO: Melhorar mapeamento quando houver campo de ID Usuário nos compromissos
      const rubrica = goal.rubrica.trim();
      
      Array.from(etnMetas.keys()).forEach((etn) => {
        const meta = etnMetas.get(etn)!;
        
        // Adicionar meta conforme rubrica
        if (rubrica.includes('Setup') || rubrica.includes('Serviços Não Recorrentes') || rubrica.includes('Licença')) {
          meta.metaLicencasServicos += metaValue;
        } else if (rubrica.includes('Recorrente') || rubrica.includes('Manutenção')) {
          meta.metaRecorrente += metaValue;
        }
      });
    }

    // Passo 5: Combinar metas e realizações
    const result: GoalMetrics[] = Array.from(etnMetas.keys())
      .map((etn) => {
        const meta = etnMetas.get(etn)!;
        const realization = etnRealizacao.get(etn) || {
          realLicencasServicos: 0,
          realRecorrente: 0,
        };

        const percentualLicencas =
          meta.metaLicencasServicos > 0
            ? (realization.realLicencasServicos / meta.metaLicencasServicos) * 100
            : 0;

        const percentualRecorrente =
          meta.metaRecorrente > 0
            ? (realization.realRecorrente / meta.metaRecorrente) * 100
            : 0;

        // Aplicar pesos: 50% cada
        const percentualAtingimento =
          (percentualLicencas * 0.5) + (percentualRecorrente * 0.5);

        return {
          idUsuario: '',
          etn,
          periodo: selectedPeriod,
          metaLicencasServicos: meta.metaLicencasServicos,
          realLicencasServicos: realization.realLicencasServicos,
          metaRecorrente: meta.metaRecorrente,
          realRecorrente: realization.realRecorrente,
          percentualAtingimento: Math.round(percentualAtingimento * 100) / 100,
        };
      })
      .filter((m) => m.metaLicencasServicos > 0 || m.metaRecorrente > 0) // Filtrar apenas ETNs com metas
      .sort((a, b) => b.percentualAtingimento - a.percentualAtingimento);

    return result;
  }, [goals, pedidos, processedData, selectedPeriod]);

  return metricas;
};
