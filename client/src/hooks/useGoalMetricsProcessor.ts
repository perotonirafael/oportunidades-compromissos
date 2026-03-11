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

    // 1. O MAPA DO RECONHECIMENTO (Oportunidades válidas do utilizador)
    const userOpportunities = new Map<string, number>();

    if (processedData && processedData.length > 0) {
      processedData.forEach((opp) => {
        if (opp.percentualReconhecimento && opp.percentualReconhecimento > 0) {
          const id = String(opp.id || opp.oportunidadeId || opp.oppId || '');
          if (id) userOpportunities.set(id, opp.percentualReconhecimento);
        }
      });
    }

    console.log(`[GOAL METRICS]: Encontradas ${userOpportunities.size} oportunidades válidas para o utilizador ${selectedUserId}`);

    // Helpers Utilitários
    const parseMoney = (val: any): number => {
      if (val == null || val === '') return 0;
      if (typeof val === 'number') return val;
      const str = String(val).replace(/\./g, '').replace(',', '.').trim();
      const num = parseFloat(str);
      return Number.isNaN(num) ? 0 : num;
    };

    const normalizeString = (str: string) =>
      String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    // Dicionário de Sinónimos Inteligente (Resolve "HCM" vs "Gestão de Pessoas")
    const isSameProduct = (metaStr: string, pedidoStr: string) => {
      const m = normalizeString(metaStr);
      const p = normalizeString(pedidoStr);

      if (m === p || m.includes(p) || p.includes(m)) return true;

      const synonyms: Record<string, string[]> = {
        hcm: ['hcm', 'gestao de pessoas', 'folha', 'painel de gestao'],
        erp: ['erp', 'gestao empresarial', 'backoffice', 'sapiens'],
        acesso: ['acesso', 'seguranca', 'ronda', 'portaria'],
        ponto: ['ponto', 'marcacao'],
      };

      for (const terms of Object.values(synonyms)) {
        const metaHasTerm = terms.some((t) => m.includes(t));
        const pedidoHasTerm = terms.some((t) => p.includes(t));
        if (metaHasTerm && pedidoHasTerm) return true;
      }

      // Último recurso de intersecção
      const wordsM = m.split(/\s+/).filter((w) => w.length > 2 && w !== 'senior');
      const wordsP = p.split(/\s+/).filter((w) => w.length > 2 && w !== 'senior');
      return wordsM.some((w) => wordsP.includes(w));
    };

    // 2. PROCESSAR PEDIDOS E CALCULAR REALIZADO
    const realizedMap = new Map<string, number>();

    if (pedidos && pedidos.length > 0) {
      pedidos.forEach((pedido) => {
        const oppId = String(
          pedido['ID OPORTUNIDADE'] ||
          pedido['Oportunidade ID'] ||
          pedido.idOportunidade ||
          '',
        );

        if (userOpportunities.has(oppId)) {
          const recognition = userOpportunities.get(oppId) || 100;
          const multiplier = recognition / 100;

          const produto = String(pedido.PRODUTO || pedido.Produto || pedido.produto || 'Diversos');

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

          if (licenca > 0) {
            const key = `${produto}|Setup + Licenças`;
            realizedMap.set(key, (realizedMap.get(key) || 0) + (licenca * multiplier));
          }

          if (manutencao > 0) {
            const key = `${produto}|Recorrente`;
            realizedMap.set(key, (realizedMap.get(key) || 0) + (manutencao * multiplier));
          }

          if (servico > 0) {
            const key = `${produto}|Serviços Não Recorrentes`;
            realizedMap.set(key, (realizedMap.get(key) || 0) + (servico * multiplier));
          }

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

    // 3. CRUZAR AS METAS
    const metrics: GoalMetric[] = [];

    // Limpar o selectedUserId para evitar bugs como "11124.0" do Excel
    const safeSelectedUserId = String(selectedUserId).replace('.0', '').trim();

    goals.forEach((goal) => {
      const goalUserId = String(goal['Id Usuário ERP'] || goal['ID Usuário ERP'] || goal.idUsuario || '').replace('.0', '').trim();

      if (goalUserId === safeSelectedUserId) {
        const produtoMeta = String(goal.Produto || goal.produto || '');
        const rubricaMeta = String(goal.Rubrica || goal.rubrica || '');
        const metaValue = parseMoney(goal[selectedPeriod] || goal[selectedPeriod.toLowerCase()] || 0);

        if (metaValue > 0) {
          let realizadoValue = 0;
          const normRubricaMeta = normalizeString(rubricaMeta);

          // Procurar o valor realizado varrendo as chaves agregadas e usando o dicionário
          for (const [key, val] of Array.from(realizedMap.entries())) {
            const [p, r] = key.split('|');
            const normR = normalizeString(r);

            if (normR === normRubricaMeta && isSameProduct(produtoMeta, p)) {
              realizadoValue += val;
              // Não fazemos "break" porque pode haver múltiplos produtos CRM que desaguam na mesma Meta.
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

    console.log(`[GOAL METRICS]: Finalizado. ${metrics.length} metas encontradas para o período ${selectedPeriod}.`);

    return metrics.sort((a, b) => b.percentual - a.percentual);
  }, [goals, pedidos, processedData, selectedPeriod, selectedUserId]);
}
