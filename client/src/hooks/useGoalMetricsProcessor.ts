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
  selectedUserId?: string
): GoalMetric[] {
  return useMemo(() => {
    if (!goals?.length || !selectedUserId) return [];

    const normalizeString = (str: any) => String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    let safeUserId = String(selectedUserId).trim();
    if (normalizeString(safeUserId) === 'rafael perotoni') safeUserId = '11124';

    const userOpportunities = new Map<string, number>();
    (processedData || []).forEach((opp) => {
      const oppId = String(opp.id || opp.oportunidadeId || opp.oppId).trim();
      if (oppId) userOpportunities.set(oppId, Number(opp.percentualReconhecimento) || 100);
    });

    const realizedMap = new Map<string, number>();

    const parseMoney = (val: any): number => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      let str = String(val).trim();
      str = str.replace(/[^\d,\.-]/g, '');
      if (str.includes(',')) str = str.replace(/\./g, '').replace(',', '.');
      const num = parseFloat(str);
      return Number.isNaN(num) ? 0 : num;
    };

    (pedidos || []).forEach((pedido) => {
      const oppId = String(pedido['ID OPORTUNIDADE'] || pedido['Oportunidade ID'] || pedido.idOportunidade || '').trim();
      const donoId = String(pedido['ID ERP PROPRIETARIO'] || pedido['Id ERP Proprietário'] || pedido.idErpProprietario || '').trim();

      const isOwner = donoId === safeUserId;
      const isETN = userOpportunities.has(oppId);

      if (isOwner || isETN) {
        const multiplier = isOwner ? 1 : ((userOpportunities.get(oppId) || 100) / 100);
        const produto = normalizeString(pedido['PRODUTO'] || pedido['Produto'] || pedido.produto || 'Diversos');

        const licenca = parseMoney(pedido['PRODUTO - VALOR LICENCA'] || pedido['PRODUTO - VALOR LICENCA CANAL'] || pedido.produtoValorLicenca || pedido.produtoValorLicencaCanal);
        const manutencao = parseMoney(pedido['PRODUTO - VALOR MANUTENCAO'] || pedido['PRODUTO - VALOR MANUTENCAO CANAL'] || pedido.produtoValorManutencao || pedido.produtoValorManutencaoCanal);
        const servico = parseMoney(pedido['SERVICO - VALOR TOTAL'] || pedido.servicoValorLiquido);

        let hasSpecific = false;
        if (licenca > 0) { realizedMap.set(`${produto}|setup+licencas`, (realizedMap.get(`${produto}|setup+licencas`) || 0) + (licenca * multiplier)); hasSpecific = true; }
        if (manutencao > 0) { realizedMap.set(`${produto}|recorrente`, (realizedMap.get(`${produto}|recorrente`) || 0) + (manutencao * multiplier)); hasSpecific = true; }
        if (servico > 0) { realizedMap.set(`${produto}|servicosnaorecorrentes`, (realizedMap.get(`${produto}|servicosnaorecorrentes`) || 0) + (servico * multiplier)); hasSpecific = true; }

        if (!hasSpecific) {
          const valorCheio = parseMoney(pedido['Valor Fechado'] || pedido['VALOR TOTAL'] || pedido['VALOR LIQUIDO'] || pedido.valorFechado);
          if (valorCheio > 0) realizedMap.set(`${produto}|generico`, (realizedMap.get(`${produto}|generico`) || 0) + (valorCheio * multiplier));
        }
      }
    });

    const metrics: GoalMetric[] = [];

    goals.forEach((goal) => {
      const gUserId = String(goal['Id Usuário ERP'] || goal.idUsuario || '').trim();
      if (gUserId === safeUserId) {
        const prod = normalizeString(goal['Produto'] || goal.produto);
        const rubrica = normalizeString(goal['Rubrica'] || goal.rubrica).replace(/\s+/g, '');

        const metaVal = selectedPeriod === '1º Trimestre' || selectedPeriod === '1ºTri'
          ? Number(goal['1º Trimestre'] ?? goal.primeiroTrimestre)
          : Number(goal['Março'] ?? goal.marco);

        if (metaVal > 0) {
          let realizadoValue = 0;
          for (const [key, val] of Array.from(realizedMap.entries())) {
            const [keyProd, keyRub] = key.split('|');
            if (prod.includes(keyProd) && (keyRub === rubrica || keyRub === 'generico')) {
              realizadoValue += val;
            }
          }

          metrics.push({
            id: `meta-${prod}-${rubrica}-${Math.random()}`,
            produto: goal['Produto'] || goal.produto,
            rubrica: goal['Rubrica'] || goal.rubrica,
            meta: metaVal,
            realizado: realizadoValue,
            percentual: (realizadoValue / metaVal) * 100
          });
        }
      }
    });

    return metrics.sort((a, b) => b.percentual - a.percentual);

  }, [goals, pedidos, processedData, selectedPeriod, selectedUserId]);
}
