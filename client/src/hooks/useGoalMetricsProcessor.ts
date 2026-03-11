import { useMemo } from 'react';

export interface GoalMetric {
  id: string;
  produto: string;
  rubrica: string;
  meta: number;
  realizado: number;
  percentual: number;
}

export function useGoalMetricsProcessor(
  goals: any[],
  pedidos: any[],
  processedData: any[],
  selectedPeriod: string,
  selectedUserId?: string,
): GoalMetric[] {
  return useMemo(() => {
    // 1. Validação inicial e Logs para debug cirúrgico
    console.log('[GOAL METRICS]: A iniciar processamento', {
      totalMetas: goals?.length || 0,
      totalPedidos: pedidos?.length || 0,
      totalOportunidadesProcessadas: processedData?.length || 0,
      periodoSelecionado: selectedPeriod,
      usuarioId: selectedUserId,
    });

    if (!goals || goals.length === 0 || !selectedUserId) {
      return [];
    }

    // 2. O MAPA DO RECONHECIMENTO (O segredo para ETNs)
    // Recolhemos todas as oportunidades onde o utilizador teve participação válida.
    const userOpportunities = new Map<string, number>();

    if (processedData && processedData.length > 0) {
      processedData.forEach((opp) => {
        // Se o percentualReconhecimento > 0, significa que o utilizador (Apoio ou Dono)
        // tem direito a essa fatia financeira da oportunidade.
        if (opp.percentualReconhecimento && opp.percentualReconhecimento > 0) {
          userOpportunities.set(String(opp.id || opp.oportunidadeId || opp.oppId), opp.percentualReconhecimento);
        }
      });
    }

    console.log(`[GOAL METRICS]: Encontradas ${userOpportunities.size} oportunidades válidas para o utilizador ${selectedUserId}`);

    // Helper para converter formato de moeda PT-BR ("494.315,51") em formato numérico JS (494315.51)
    const parseMoney = (val: any): number => {
      if (val == null || val === '') return 0;
      if (typeof val === 'number') return val;
      const str = String(val).replace(/\./g, '').replace(',', '.');
      const num = parseFloat(str);
      return Number.isNaN(num) ? 0 : num;
    };

    // Helper para normalizar strings (remove acentos e coloca em minúsculas para o fuzzy match)
    const normalizeString = (str: string) =>
      String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    // 3. PROCESSAR PEDIDOS E CALCULAR REALIZADO
    // Agrupamos os valores realizados por Produto e Rubrica
    const realizedMap = new Map<string, number>();

    if (pedidos && pedidos.length > 0) {
      pedidos.forEach((pedido) => {
        const oppId = String(
          pedido['ID OPORTUNIDADE'] ||
            pedido['Oportunidade ID'] ||
            pedido.idOportunidade ||
            '',
        );

        // Regra de Ouro: O pedido só entra na conta se o ETN participou da oportunidade de origem
        if (userOpportunities.has(oppId)) {
          const recognition = userOpportunities.get(oppId) || 100;
          const multiplier = recognition / 100; // Ex: 25% vira 0.25

          // Identificar Produto do Pedido
          const produto = pedido.PRODUTO || pedido.Produto || pedido.produto || 'Diversos';

          // Extrair Valores Financeiros (Lendo o padrão das colunas do CRM)
          const licenca =
            parseMoney(pedido['PRODUTO - VALOR LICENCA']) ||
            parseMoney(pedido['PRODUTO - VALOR LICENCA CANAL']) ||
            parseMoney(pedido.produtoValorLicenca) ||
            parseMoney(pedido.produtoValorLicencaCanal);
          const manutencao =
            parseMoney(pedido['PRODUTO - VALOR MANUTENCAO']) ||
            parseMoney(pedido['PRODUTO - VALOR MANUTENCAO CANAL']) ||
            parseMoney(pedido.produtoValorManutencao) ||
            parseMoney(pedido.produtoValorManutencaoCanal);

          let servico = parseMoney(pedido['SERVICO - VALOR TOTAL']) || parseMoney(pedido.servicoValorLiquido);
          if (servico === 0) {
            const qtdeHoras = parseMoney(pedido['SERVICO - QTDE DE HORAS']) || parseMoney(pedido.servicoQtdeDeHoras);
            const valorHora = parseMoney(pedido['SERVICO - VALOR HORA']) || parseMoney(pedido.servicoValorHora);
            servico = qtdeHoras * valorHora;
          }

          // A) Setup + Licenças
          if (licenca > 0) {
            const key = `${produto}|Setup + Licenças`;
            realizedMap.set(key, (realizedMap.get(key) || 0) + (licenca * multiplier));
          }

          // B) Recorrente (Manutenção)
          if (manutencao > 0) {
            const key = `${produto}|Recorrente`;
            realizedMap.set(key, (realizedMap.get(key) || 0) + (manutencao * multiplier));
          }

          // C) Serviços Não Recorrentes
          if (servico > 0) {
            const key = `${produto}|Serviços Não Recorrentes`;
            realizedMap.set(key, (realizedMap.get(key) || 0) + (servico * multiplier));
          }

          // Fallback de segurança: Se as colunas detalhadas estiverem a zeros, tenta usar o "Valor Fechado" genérico
          if (licenca === 0 && manutencao === 0 && servico === 0) {
            const valorFechado =
              parseMoney(pedido['Valor Fechado']) ||
              parseMoney(pedido['VALOR TOTAL']) ||
              parseMoney(pedido.valorFechado);
            if (valorFechado > 0) {
              const key = `${produto}|Setup + Licenças`;
              realizedMap.set(key, (realizedMap.get(key) || 0) + (valorFechado * multiplier));
            }
          }
        }
      });
    }

    // 4. CRUZAR AS METAS (EXCEL) COM O VALOR REALIZADO (MAPA)
    const metrics: GoalMetric[] = [];

    goals.forEach((goal) => {
      // Filtra estritamente pela linha do utilizador selecionado
      if (String(goal['Id Usuário ERP'] || goal['ID Usuário ERP'] || goal.idUsuario) === String(selectedUserId)) {
        const produtoMeta = goal.Produto || goal.produto || '';
        const rubricaMeta = goal.Rubrica || goal.rubrica || '';

        // Busca o valor alvo (Meta) para o período selecionado (ex: "Março")
        const metaValue = parseMoney(goal[selectedPeriod] || goal[selectedPeriod.toLowerCase()] || 0);

        if (metaValue > 0) {
          const exactKey = `${produtoMeta}|${rubricaMeta}`;
          let realizadoValue = realizedMap.get(exactKey) || 0;

          // "Fuzzy Match": Se a chave exata falhar (ex: "HCM Senior" vs "Gestão de Pessoas - HCM"),
          // procuramos aproximações textuais para não perder dinheiro realizado.
          if (realizadoValue === 0) {
            const normProdutoMeta = normalizeString(produtoMeta);
            const normRubricaMeta = normalizeString(rubricaMeta);

            for (const [key, val] of Array.from(realizedMap.entries())) {
              const [p, r] = key.split('|');
              const normP = normalizeString(p);
              const normR = normalizeString(r);

              // Se a rubrica bate e o produto está contido um no outro (ou vice-versa)
              if (normR === normRubricaMeta && (normP.includes(normProdutoMeta) || normProdutoMeta.includes(normP))) {
                realizadoValue += val;
              }
            }
          }

          metrics.push({
            id: `${produtoMeta}-${rubricaMeta}-${selectedPeriod}`,
            produto: produtoMeta,
            rubrica: rubricaMeta,
            meta: metaValue,
            realizado: realizadoValue,
            percentual: (realizadoValue / metaValue) * 100,
          });
        }
      }
    });

    console.log(`[GOAL METRICS]: Finalizado com Sucesso. ${metrics.length} rubricas de meta montadas para ${selectedPeriod}.`);

    // Retorna as métricas ordenadas pelo maior percentual atingido
    return metrics.sort((a, b) => b.percentual - a.percentual);
  }, [goals, pedidos, processedData, selectedPeriod, selectedUserId]);
}
