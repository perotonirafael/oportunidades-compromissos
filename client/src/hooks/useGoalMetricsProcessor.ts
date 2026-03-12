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

export interface GoalMetricsResult {
  metrics: GoalMetric[];
  kpis: {
    ganhas: number;
    perdidas: number;
    total: number;
    taxaConversao: number;
  };
}

const CATEGORIAS_FINANCEIRO = [
  'demonstracao presencial', 'demonstracao remota', 'analise de aderencia',
  'etn apoio', 'analise de rfp/rfi', 'termo de referencia', 'edital'
];

const CATEGORIAS_CONVERSAO = [
  'demonstracao presencial', 'demonstracao remota'
];

export function useGoalMetricsProcessor(
  goals: ManualGoal[],
  pedidos: any[],
  oportunidades: any[],
  compromissos: any[],
  globalPeriod: string,
  selectedUserId?: string
): GoalMetricsResult {
  return useMemo(() => {
    const isGeneralDashboard = !selectedUserId;
    let safeUserId = String(selectedUserId || '').trim();

    const normalizeString = (str: any) => String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

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

    const knownUsers: Record<string, string> = {
      'rafael perotoni': '11124', 'filipe cardoso': '2642', 'mariane sebaje': '9909',
      'carina bruder': '11191', 'jonas pacheco': '11264', 'stefanie christen': '10655', 'gisele silva': '10563'
    };
    if (knownUsers[normalizeString(safeUserId)]) safeUserId = knownUsers[normalizeString(safeUserId)];

    const belongsToGlobalPeriod = (referencia: string, filtroGlobal: string, isDataCrm = false) => {
      if (!referencia) return true;
      const p = normalizeString(filtroGlobal);
      if (p.includes('total')) return true;

      const meses = ['', 'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

      let numMesRef = 0;
      if (isDataCrm) {
        if (referencia.includes('/')) numMesRef = parseInt(referencia.split(' ')[0].split('/')[1], 10);
        else if (referencia.includes('-')) {
           const parts = referencia.split(' ')[0].split('-');
           numMesRef = parseInt(parts[parts[0].length === 4 ? 1 : 1], 10);
        }
      } else {
         numMesRef = meses.indexOf(normalizeString(referencia));
      }

      if (numMesRef < 1 || numMesRef > 12) return false;
      if (meses.includes(p)) return numMesRef === meses.indexOf(p);
      if ((p.includes('1otri') || p.includes('1º tri')) && [1, 2, 3].includes(numMesRef)) return true;
      if ((p.includes('2otri') || p.includes('2º tri')) && [4, 5, 6].includes(numMesRef)) return true;
      if ((p.includes('3otri') || p.includes('3º tri')) && [7, 8, 9].includes(numMesRef)) return true;
      if ((p.includes('4otri') || p.includes('4º tri')) && [10, 11, 12].includes(numMesRef)) return true;
      return false;
    };

    // --- 1. SEPARAÇÃO DOS COMPROMISSOS (FINANCEIRO VS CONVERSÃO) ---
    const oppsElegiveisFinanceiro = new Set<string>();
    const oppsElegiveisConversao = new Set<string>();

    (compromissos || []).forEach(comp => {
      const compUserId = String(getSafeKey(comp, ['Id Usuário ERP', 'Id Usuario ERP', 'Id ERP Usuário']) || '').trim();
      const oppId = String(getSafeKey(comp, ['Oportunidade ID', 'Oportunidade', 'ID OPORTUNIDADE']) || '').trim();
      const categoriaStr = normalizeString(getSafeKey(comp, ['Categoria', 'CATEGORIA']) || '');
      const status = normalizeString(getSafeKey(comp, ['Status', 'STATUS']) || '');

      if (oppId && status.includes('conclu')) {
         if (isGeneralDashboard || compUserId === safeUserId) {
            if (CATEGORIAS_FINANCEIRO.some(c => categoriaStr.includes(c))) oppsElegiveisFinanceiro.add(oppId);
            if (CATEGORIAS_CONVERSAO.some(c => categoriaStr.includes(c))) oppsElegiveisConversao.add(oppId);
         }
      }
    });

    // --- 2. CÁLCULO DE TAXA DE CONVERSÃO (Oportunidades Únicas) ---
    let ganhas = 0;
    let perdidas = 0;
    const oppsProcessadas = new Set<string>();

    (oportunidades || []).forEach(opp => {
       const oppId = String(getSafeKey(opp, ['Oportunidade ID', 'Oportunidade']) || '').trim();
       const etapa = normalizeString(getSafeKey(opp, ['Etapa', 'Etapa Oportunidade']) || '');
       const dataFechamentoOpp = String(getSafeKey(opp, ['Efetivação do Fechamento', 'Efetivacao do Fechamento']) || getSafeKey(opp, ['Previsão de Fechamento', 'Previsao de Fechamento']) || '');

       if (!belongsToGlobalPeriod(dataFechamentoOpp, globalPeriod, true)) return;

       if (oppId && !oppsProcessadas.has(oppId) && oppsElegiveisConversao.has(oppId)) {
           oppsProcessadas.add(oppId);
           if (etapa.includes('fechada e ganha') || etapa === 'ganha') ganhas++;
           else if (etapa.includes('fechada e perdida') || etapa === 'perdida') perdidas++;
       }
    });

    const totalOpps = ganhas + perdidas;
    const taxaConversao = totalOpps > 0 ? (ganhas / totalOpps) * 100 : 0;

    // --- 3. CÁLCULO FINANCEIRO (METAS VS PEDIDOS) ---
    const aggregatedGoals = new Map<string, number>();
    (goals || []).forEach(goal => {
      if (isGeneralDashboard || String(goal.idUsuario) === safeUserId) {
         if (belongsToGlobalPeriod(goal.mes, globalPeriod, false) || belongsToGlobalPeriod(goal.trimestre, globalPeriod, false)) {
            const key = `${normalizeString(goal.produto)}|${normalizeString(goal.rubrica).replace(/\s+/g, '')}`;
            aggregatedGoals.set(key, (aggregatedGoals.get(key) || 0) + goal.valor);
         }
      }
    });

    const realizedMap = new Map<string, number>();
    (pedidos || []).forEach(pedido => {
      const oppId = String(getSafeKey(pedido, ['ID OPORTUNIDADE', 'Oportunidade ID']) || '').trim();
      const donoId = String(getSafeKey(pedido, ['ID ERP PROPRIETARIO', 'Id ERP Proprietário']) || '').trim();

      const isOwner = donoId === safeUserId;
      const isETNElegivel = oppsElegiveisFinanceiro.has(oppId);

      if (isGeneralDashboard || isOwner || isETNElegivel) {
        const dataPed = String(getSafeKey(pedido, ['DATA FECHAMENTO', 'Data Fechamento']) || '');
        if (!belongsToGlobalPeriod(dataPed, globalPeriod, true)) return;

        const produto = normalizeString(getSafeKey(pedido, ['PRODUTO', 'Produto']) || 'Diversos');
        const licenca = parseMoney(getSafeKey(pedido, ['PRODUTO - VALOR LICENCA', 'PRODUTO - VALOR LICENCA CANAL']));
        const manutencao = parseMoney(getSafeKey(pedido, ['PRODUTO - VALOR MANUTENCAO', 'PRODUTO - VALOR MANUTENCAO CANAL']));
        let servico = parseMoney(getSafeKey(pedido, ['SERVICO - VALOR TOTAL']));
        if (servico === 0) servico = parseMoney(getSafeKey(pedido, ['SERVICO - QTDE DE HORAS'])) * parseMoney(getSafeKey(pedido, ['SERVICO - VALOR HORA']));

        let hasDetail = false;
        if (licenca > 0) { realizedMap.set(`${produto}|setup+licencas`, (realizedMap.get(`${produto}|setup+licencas`) || 0) + licenca); hasDetail = true; }
        if (manutencao > 0) { realizedMap.set(`${produto}|recorrente`, (realizedMap.get(`${produto}|recorrente`) || 0) + manutencao); hasDetail = true; }
        if (servico > 0) { realizedMap.set(`${produto}|servicosnaorecorrentes`, (realizedMap.get(`${produto}|servicosnaorecorrentes`) || 0) + servico); hasDetail = true; }

        if (!hasDetail) {
          const vLiquido = parseMoney(getSafeKey(pedido, ['VALOR LIQUIDO', 'Valor Fechado', 'VALOR TOTAL']));
          if (vLiquido > 0) realizedMap.set(`${produto}|generico`, (realizedMap.get(`${produto}|generico`) || 0) + vLiquido);
        }
      }
    });

    const metrics: GoalMetric[] = [];
    aggregatedGoals.forEach((valorMeta, keyStr) => {
      const [prodMetaNorm, rubricaMetaNorm] = keyStr.split('|');
      let realizado = 0;

      for (const [keyCrm, valCrm] of Array.from(realizedMap.entries())) {
        const [prodCrmNorm, rubricaCrmNorm] = keyCrm.split('|');
        const isMatchProd = prodCrmNorm.includes(prodMetaNorm) || prodMetaNorm.includes(prodCrmNorm) ||
                            (prodMetaNorm.includes('hcm') && prodCrmNorm.includes('gestao de pessoas')) ||
                            (prodMetaNorm.includes('erp') && prodCrmNorm.includes('gestao empresarial'));

        if (isMatchProd && (rubricaCrmNorm === rubricaMetaNorm || rubricaCrmNorm === 'generico')) {
          realizado += valCrm;
        }
      }

      const produtoBonito = goals.find(g => normalizeString(g.produto) === prodMetaNorm)?.produto || 'Desconhecido';
      const rubricaBonita = goals.find(g => normalizeString(g.rubrica).replace(/\s+/g, '') === rubricaMetaNorm)?.rubrica || 'Desconhecido';

      metrics.push({
        id: `m-${prodMetaNorm}-${rubricaMetaNorm}-${Math.random()}`,
        produto: produtoBonito,
        rubrica: rubricaBonita,
        meta: valorMeta,
        realizado: realizado,
        percentual: (realizado / valorMeta) * 100
      });
    });

    return {
      metrics: metrics.sort((a, b) => b.percentual - a.percentual),
      kpis: { ganhas, perdidas, total: totalOpps, taxaConversao }
    };
  }, [goals, pedidos, oportunidades, compromissos, globalPeriod, selectedUserId]);
}
