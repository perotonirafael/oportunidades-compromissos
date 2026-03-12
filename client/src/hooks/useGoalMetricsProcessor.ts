import { useMemo } from 'react';
import { ManualGoal } from '../components/GoalManager';

export interface GoalMetric {
  id: string;
  produto: string;
  rubrica: string;
  meta: number;
  realizado: number;
  percentual: number;
}

export function useGoalMetricsProcessor(
  goals: ManualGoal[],
  pedidos: any[],
  processedData: any[],
  globalPeriod: string,
  selectedUserId?: string
): GoalMetric[] {
  return useMemo(() => {
    if (!goals?.length || !selectedUserId) return [];

    const normalizeString = (str: any) => String(str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    
    const getSafeKey = (obj: any, keys: string[]) => {
      if (!obj) return undefined;
      const objKeys = Object.keys(obj);
      for (const k of keys) {
        const normK = normalizeString(k);
        const match = objKeys.find(ok => normalizeString(ok) === normK);
        if (match && obj[match] !== undefined && obj[match] !== '') return obj[match];
      }
      return undefined;
    };

    const parseMoney = (val: any): number => {
      if (!val) return 0;
      let str = String(val).trim().replace(/[^\d,\.-]/g, '');
      if (str.includes(',')) str = str.replace(/\./g, '').replace(',', '.');
      const num = parseFloat(str);
      return isNaN(num) ? 0 : num;
    };

    let safeUserId = String(selectedUserId).trim();
    const knownUsers: Record<string, string> = { 'rafael perotoni': '11124' };
    if (knownUsers[normalizeString(safeUserId)]) safeUserId = knownUsers[normalizeString(safeUserId)];

    const userOpportunities = new Map<string, number>();
    (processedData || []).forEach(opp => {
      const oppId = String(opp.id || opp.oportunidadeId).trim();
      if (oppId) userOpportunities.set(oppId, Number(opp.percentualReconhecimento) || 100);
    });

    const belongsToPeriod = (dataFechamento: string, targetPeriod: string) => {
      if (!dataFechamento) return true;
      let mes = 0;
      if (dataFechamento.includes('/')) mes = parseInt(dataFechamento.split(' ')[0].split('/')[1], 10);
      else if (dataFechamento.includes('-')) {
         const p = dataFechamento.split(' ')[0].split('-');
         mes = parseInt(p[p[0].length === 4 ? 1 : 1], 10);
      }
      const t = normalizeString(targetPeriod);
      if (t.includes('total')) return true;
      const meses = ['', 'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      if (t === meses[mes]) return true;
      if ((t.includes('1otri') || t.includes('1º tri')) && [1, 2, 3].includes(mes)) return true;
      if ((t.includes('2otri') || t.includes('2º tri')) && [4, 5, 6].includes(mes)) return true;
      if ((t.includes('3otri') || t.includes('3º tri')) && [7, 8, 9].includes(mes)) return true;
      if ((t.includes('4otri') || t.includes('4º tri')) && [10, 11, 12].includes(mes)) return true;
      return false;
    };

    const realizedMap = new Map<string, number>();

    (pedidos || []).forEach(pedido => {
      const oppId = String(getSafeKey(pedido, ['ID OPORTUNIDADE', 'Oportunidade ID']) || '').trim();
      const donoId = String(getSafeKey(pedido, ['ID ERP PROPRIETARIO', 'Id ERP Proprietário']) || '').trim();
      
      if (donoId === safeUserId || userOpportunities.has(oppId)) {
        const dataPed = String(getSafeKey(pedido, ['DATA FECHAMENTO', 'Data Fechamento']) || '');
        if (!belongsToPeriod(dataPed, globalPeriod)) return;

        const multiplier = (donoId === safeUserId) ? 1 : ((userOpportunities.get(oppId) || 100) / 100);
        const produto = normalizeString(getSafeKey(pedido, ['PRODUTO', 'Produto']) || 'Diversos');
        
        const licenca = parseMoney(getSafeKey(pedido, ['PRODUTO - VALOR LICENCA', 'PRODUTO - VALOR LICENCA CANAL']));
        const manutencao = parseMoney(getSafeKey(pedido, ['PRODUTO - VALOR MANUTENCAO', 'PRODUTO - VALOR MANUTENCAO CANAL']));
        let servico = parseMoney(getSafeKey(pedido, ['SERVICO - VALOR TOTAL']));
        if (servico === 0) servico = parseMoney(getSafeKey(pedido, ['SERVICO - QTDE DE HORAS'])) * parseMoney(getSafeKey(pedido, ['SERVICO - VALOR HORA']));
        
        let hasDetail = false;
        if (licenca > 0) { realizedMap.set(`${produto}|setup+licencas`, (realizedMap.get(`${produto}|setup+licencas`) || 0) + (licenca * multiplier)); hasDetail = true; }
        if (manutencao > 0) { realizedMap.set(`${produto}|recorrente`, (realizedMap.get(`${produto}|recorrente`) || 0) + (manutencao * multiplier)); hasDetail = true; }
        if (servico > 0) { realizedMap.set(`${produto}|servicosnaorecorrentes`, (realizedMap.get(`${produto}|servicosnaorecorrentes`) || 0) + (servico * multiplier)); hasDetail = true; }
        
        if (!hasDetail) {
          const vLiquido = parseMoney(getSafeKey(pedido, ['VALOR LIQUIDO', 'Valor Fechado', 'VALOR TOTAL']));
          if (vLiquido > 0) realizedMap.set(`${produto}|generico`, (realizedMap.get(`${produto}|generico`) || 0) + (vLiquido * multiplier));
        }
      }
    });

    const metrics: GoalMetric[] = [];
    const normGlobalPeriod = normalizeString(globalPeriod);

    goals.forEach(goal => {
      const sameUser = String(goal.idUsuario) === safeUserId;
      const samePeriod =
        normalizeString(goal.mes) === normGlobalPeriod ||
        normalizeString(goal.trimestre) === normGlobalPeriod ||
        normGlobalPeriod === 'total ano';

      if (sameUser && samePeriod) {
           const prodMeta = normalizeString(goal.produto);
           const rubricaMetaKey = normalizeString(goal.rubrica).replace(/\s+/g, '');
           let realizado = 0;
           
           for (const [key, val] of Array.from(realizedMap.entries())) {
             const [pCRM, rCRM] = key.split('|');
             const isMatchProd = pCRM.includes(prodMeta) || prodMeta.includes(pCRM) || (prodMeta.includes('hcm') && pCRM.includes('gestao de pessoas')) || (prodMeta.includes('erp') && pCRM.includes('gestao empresarial'));
             if (isMatchProd && (rCRM === rubricaMetaKey || rCRM === 'generico')) realizado += val;
           }

           metrics.push({ id: goal.id, produto: goal.produto, rubrica: goal.rubrica, meta: goal.valor, realizado: realizado, percentual: (realizado / goal.valor) * 100 });
      }
    });

    return metrics.sort((a, b) => b.percentual - a.percentual);
  }, [goals, pedidos, processedData, globalPeriod, selectedUserId]);
}
