import { useMemo } from 'react';
import type { GoalRecord, PedidoRecord, GoalMetrics } from '@/types/goals';
import type { ProcessedRecord } from './useDataProcessor';
import type { Action, Opportunity } from './useDataProcessor';

const DEBUG_GOALS_METRICS = import.meta.env.DEV && import.meta.env.VITE_DEBUG_GOALS === 'true';

/**
 * Categorias de compromisso válidas para cálculo de metas.
 */
const VALID_CATEGORIES = new Set([
  'Demonstracao Presencial',
  'Demonstracao Remota',
  'Analise de aderencia',
  'Analise de RFP/RFI',
  'ETN Apoio',
  'Termo de Referencia',
  'Edital',
  'Analise arquiteto de software - Exclusivo GTN',
]);

const PERIOD_TO_MONTHS: Record<string, number[]> = {
  Janeiro: [1],
  Fevereiro: [2],
  Março: [3],
  '1ºTrimestre': [1, 2, 3],
  Abril: [4],
  Maio: [5],
  Junho: [6],
  '2ºTrimestre': [4, 5, 6],
  Julho: [7],
  Agosto: [8],
  Setembro: [9],
  '3ºTrimestre': [7, 8, 9],
  Outubro: [10],
  Novembro: [11],
  Dezembro: [12],
  '4ºTrimestre': [10, 11, 12],
};

const MONTH_NUMBER_TO_GOAL_KEY: Record<number, keyof GoalRecord> = {
  1: 'janeiro',
  2: 'fevereiro',
  3: 'marco',
  4: 'abril',
  5: 'maio',
  6: 'junho',
  7: 'julho',
  8: 'agosto',
  9: 'setembro',
  10: 'outubro',
  11: 'novembro',
  12: 'dezembro',
};

const normalizeText = (value: unknown): string => (value == null ? '' : String(value).trim());
const normalizeSpaces = (value: string): string => value.replace(/\s+/g, ' ').trim();

const parseDateFromDDMMYYYY = (date: string): { day: number; month: number; year: number } | null => {
  const normalized = normalizeText(date);
  if (!normalized) return null;

  const match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);

  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return { day, month, year };
};

export const getPeriodMonths = (selectedPeriod: string): number[] => PERIOD_TO_MONTHS[selectedPeriod] || [];

export const resolveReferenceYear = (goals: GoalRecord[]): number | null => {
  const years = new Set<number>();
  for (const goal of goals) {
    const year = goal.ano;
    if (!Number.isFinite(year) || !year) continue;
    const yearInt = Math.trunc(year);
    if (yearInt >= 2000 && yearInt <= 2100) {
      years.add(yearInt);
    }
  }

  if (years.size === 1) return Array.from(years)[0];
  return null;
};

export const isPedidoInsideSelectedPeriod = (
  pedidoDate: string,
  selectedPeriod: string,
  referenceYear: number | null
): boolean => {
  const parsedDate = parseDateFromDDMMYYYY(pedidoDate);
  if (!parsedDate) return false;

  if (referenceYear && parsedDate.year !== referenceYear) return false;

  const months = getPeriodMonths(selectedPeriod);
  if (months.length === 0) return false;

  return months.includes(parsedDate.month);
};

const isValidCategory = (value: string): boolean => {
  const normalizedCategory = normalizeSpaces(normalizeText(value));
  return VALID_CATEGORIES.has(normalizedCategory);
};

const isFechadaGanha = (etapa: string): boolean => normalizeSpaces(normalizeText(etapa)) === 'Fechada e Ganha';

const isLicencaOuServico = (rubrica: string): boolean => {
  const normalized = normalizeSpaces(normalizeText(rubrica));
  return (
    normalized.includes('Setup') ||
    normalized.includes('Licença') ||
    normalized.includes('Licenças') ||
    normalized.includes('Serviços Não Recorrentes') ||
    normalized.includes('Servicos Nao Recorrentes')
  );
};

const isRecorrente = (rubrica: string): boolean => normalizeSpaces(normalizeText(rubrica)).includes('Recorrente');

const logDebug = (message: string, payload: Record<string, unknown>) => {
  if (!DEBUG_GOALS_METRICS) return;
  console.log(`[goals-metrics] ${message}`, payload);
};

/**
 * Processa metas e pedidos para calcular % de atingimento.
 */
export const computeGoalMetrics = (
  goals: GoalRecord[],
  pedidos: PedidoRecord[],
  processedData: ProcessedRecord[],
  selectedPeriod: string,
  actions: Action[],
  opportunities: Opportunity[]
): GoalMetrics[] => {
  const months = getPeriodMonths(selectedPeriod);
  if (!months.length || !goals.length) return [];

  const referenceYear = resolveReferenceYear(goals);

  let metaTotalLicencasServicos = 0;
  let metaTotalRecorrente = 0;

  for (const goal of goals) {
    const metaValue = months.reduce((acc, monthNumber) => {
      const goalKey = MONTH_NUMBER_TO_GOAL_KEY[monthNumber];
      return acc + (Number(goal[goalKey]) || 0);
    }, 0);

    if (isLicencaOuServico(goal.rubrica)) {
      metaTotalLicencasServicos += metaValue;
    } else if (isRecorrente(goal.rubrica)) {
      metaTotalRecorrente += metaValue;
    }
  }

  const oppIdsWithValidCategory = new Set<string>();
  const oppIdToEtn = new Map<string, Set<string>>();

  if (actions.length > 0) {
    for (const action of actions) {
      const categoria = String(action['Categoria'] || '');
      if (!isValidCategory(categoria)) continue;

      const oppId = normalizeText(action['Oportunidade ID']);
      if (!oppId) continue;

      oppIdsWithValidCategory.add(oppId);

      const etn = normalizeText(action['Usuário'] || action['Usuario']);
      if (etn) {
        if (!oppIdToEtn.has(oppId)) oppIdToEtn.set(oppId, new Set());
        oppIdToEtn.get(oppId)!.add(etn);
      }
    }
  } else {
    for (const record of processedData) {
      if (!isValidCategory(record.categoriaCompromisso || '')) continue;
      const oppId = normalizeText(record.oppId);
      if (!oppId) continue;
      oppIdsWithValidCategory.add(oppId);

      const etn = normalizeText(record.etn);
      if (etn && etn !== 'Sem Agenda') {
        if (!oppIdToEtn.has(oppId)) oppIdToEtn.set(oppId, new Set());
        oppIdToEtn.get(oppId)!.add(etn);
      }
    }
  }

  const oppIdsFechadaGanha = new Set<string>();

  if (opportunities.length > 0) {
    for (const opp of opportunities) {
      const oppId = normalizeText(opp['Oportunidade ID']);
      const etapa = normalizeText(opp['Etapa']);
      if (isFechadaGanha(etapa) && oppIdsWithValidCategory.has(oppId)) {
        oppIdsFechadaGanha.add(oppId);
      }
    }
  } else {
    for (const record of processedData) {
      const oppId = normalizeText(record.oppId);
      if (!oppIdsWithValidCategory.has(oppId)) continue;
      if (isFechadaGanha(record.etapa || '')) oppIdsFechadaGanha.add(oppId);
    }
  }

  const allEtns = new Set<string>();
  for (const [oppId, etns] of Array.from(oppIdToEtn.entries())) {
    if (oppIdsFechadaGanha.has(oppId)) {
      for (const etn of Array.from(etns)) allEtns.add(etn);
    }
  }

  if (allEtns.size === 0 && processedData.length > 0) {
    for (const etn of processedData.map((record) => record.etn)) {
      if (normalizeText(etn)) allEtns.add(etn);
    }
  }

  if (allEtns.size === 0) {
    allEtns.add('Total');
  }

  const etnRealizacao = new Map<string, { realLicencasServicos: number; realRecorrente: number }>();
  for (const etn of Array.from(allEtns)) {
    etnRealizacao.set(etn, { realLicencasServicos: 0, realRecorrente: 0 });
  }

  const pedidosNoPeriodo = pedidos.filter((pedido) =>
    isPedidoInsideSelectedPeriod(pedido.dataFechamento, selectedPeriod, referenceYear)
  );

  for (const pedido of pedidosNoPeriodo) {
    const oppId = normalizeText(pedido.idOportunidade);
    if (!oppIdsFechadaGanha.has(oppId)) continue;

    const licServicos = (pedido.produtoValorLicenca || 0) + (pedido.servicoValorLiquido || 0);
    const recorrente = pedido.produtoValorManutencao || 0;

    const etns = oppIdToEtn.get(oppId);
    if (etns && etns.size > 0) {
      const numEtns = etns.size;
      for (const etn of Array.from(etns)) {
        const real = etnRealizacao.get(etn);
        if (!real) continue;
        real.realLicencasServicos += licServicos / numEtns;
        real.realRecorrente += recorrente / numEtns;
      }
    }
  }

  logDebug('Resumo de entrada e filtros', {
    goals: goals.length,
    pedidos: pedidos.length,
    pedidosNoPeriodo: pedidosNoPeriodo.length,
    opportunities: opportunities.length,
    actions: actions.length,
    oppIdsQualificadas: oppIdsFechadaGanha.size,
    etnsCalculados: allEtns.size,
    selectedPeriod,
    referenceYear,
  });

  return Array.from(allEtns).map((etn) => {
    const real = etnRealizacao.get(etn) || {
      realLicencasServicos: 0,
      realRecorrente: 0,
    };

    const percentualLicencas =
      metaTotalLicencasServicos > 0 ? (real.realLicencasServicos / metaTotalLicencasServicos) * 100 : 0;
    const percentualRecorrente = metaTotalRecorrente > 0 ? (real.realRecorrente / metaTotalRecorrente) * 100 : 0;
    const percentualAtingimento = percentualLicencas * 0.5 + percentualRecorrente * 0.5;

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
};

export const useGoalMetricsProcessor = (
  goals: GoalRecord[],
  pedidos: PedidoRecord[],
  processedData: ProcessedRecord[],
  selectedPeriod: string,
  actions: Action[],
  opportunities: Opportunity[]
) => {
  const metricas = useMemo(
    () => computeGoalMetrics(goals, pedidos, processedData, selectedPeriod, actions, opportunities),
    [goals, pedidos, processedData, selectedPeriod, actions, opportunities]
  );

  return metricas;
};
