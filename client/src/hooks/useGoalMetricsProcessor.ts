import { useMemo } from 'react';
import {
  GoalMetricByETN,
  GoalMonthDetail,
  GoalRow,
  MONTH_KEYS,
  MONTH_LABELS,
  MonthKey,
  PedidoCRM,
} from '@/types/goals';

type GenericAction = Record<string, unknown>;
type GenericOpportunity = Record<string, unknown>;

const VALID_CATEGORIES = new Set([
  'demonstracao presencial',
  'demonstracao remota',
  'analise de aderencia',
  'etn apoio',
  'analise de rfp/rfi',
  'termo de referencia',
  'edital',
]);

function normalize(input: unknown): string {
  return String(input ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const raw = value.trim();

  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) {
    const [, dd, mm, yyyy] = br;
    const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const iso = new Date(raw);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

function getPeriodMonths(selectedPeriod: string): MonthKey[] {
  const normalized = normalize(selectedPeriod);

  if (normalized === 'janeiro') return ['janeiro'];
  if (normalized === 'fevereiro') return ['fevereiro'];
  if (normalized === 'marco') return ['marco'];
  if (normalized === 'abril') return ['abril'];
  if (normalized === 'maio') return ['maio'];
  if (normalized === 'junho') return ['junho'];
  if (normalized === 'julho') return ['julho'];
  if (normalized === 'agosto') return ['agosto'];
  if (normalized === 'setembro') return ['setembro'];
  if (normalized === 'outubro') return ['outubro'];
  if (normalized === 'novembro') return ['novembro'];
  if (normalized === 'dezembro') return ['dezembro'];

  if (normalized.includes('1') && normalized.includes('trimestre')) return ['janeiro', 'fevereiro', 'marco'];
  if (normalized.includes('2') && normalized.includes('trimestre')) return ['abril', 'maio', 'junho'];
  if (normalized.includes('3') && normalized.includes('trimestre')) return ['julho', 'agosto', 'setembro'];
  if (normalized.includes('4') && normalized.includes('trimestre')) return ['outubro', 'novembro', 'dezembro'];

  return MONTH_KEYS;
}

function getMonthKeyFromDate(date: Date): MonthKey {
  return MONTH_KEYS[date.getMonth()];
}

function isClosedWon(opportunity: GenericOpportunity): boolean {
  const statusValues = [
    opportunity['Situação'],
    opportunity['Situacao'],
    opportunity['Status'],
    opportunity['Etapa'],
    opportunity['Pipeline'],
  ];

  return statusValues.some((value) => {
    const norm = normalize(value);
    return norm.includes('fechada e ganha') || norm.includes('closed won');
  });
}

function getOpportunityId(obj: Record<string, unknown>): string {
  return String(
    obj['ID Oportunidade'] ??
      obj['Id Oportunidade'] ??
      obj['Oportunidade ID'] ??
      obj['idOportunidade'] ??
      obj['id'] ??
      '',
  ).trim();
}

function getActionUserId(action: GenericAction): string {
  return String(
    action['Id Usuário ERP'] ??
      action['ID Usuário ERP'] ??
      action['Id Usuario ERP'] ??
      action['ID Usuario ERP'] ??
      action['idUsuarioErp'] ??
      '',
  ).trim();
}

function getActionUserName(action: GenericAction): string {
  return String(
    action['Usuário'] ??
      action['Usuario'] ??
      action['Responsável'] ??
      action['Responsavel'] ??
      action['ETN'] ??
      '',
  ).trim();
}

function getActionCategory(action: GenericAction): string {
  return normalize(
    action['Categoria'] ??
      action['Tipo Compromisso'] ??
      action['Tipo'] ??
      action['categoria'] ??
      '',
  );
}

function collectQualifiedOpps(actions: GenericAction[], opportunities: GenericOpportunity[]) {
  const closedWonOppIds = new Set(
    opportunities.filter(isClosedWon).map((opp) => getOpportunityId(opp)).filter(Boolean),
  );

  const qualifiedByUser = new Map<
    string,
    {
      etnNome: string;
      oppIds: Set<string>;
    }
  >();

  actions.forEach((action) => {
    const idUsuarioErp = getActionUserId(action);
    if (!idUsuarioErp) return;

    const categoria = getActionCategory(action);
    if (!VALID_CATEGORIES.has(categoria)) return;

    const oppId = getOpportunityId(action);
    if (!oppId || !closedWonOppIds.has(oppId)) return;

    if (!qualifiedByUser.has(idUsuarioErp)) {
      qualifiedByUser.set(idUsuarioErp, {
        etnNome: getActionUserName(action) || idUsuarioErp,
        oppIds: new Set<string>(),
      });
    }

    qualifiedByUser.get(idUsuarioErp)!.oppIds.add(oppId);
  });

  return qualifiedByUser;
}

function aggregatePedidosByMonth(
  pedidos: PedidoCRM[],
  oppIds: Set<string>,
  ano: number,
) {
  const monthly = new Map<MonthKey, { licencasServicos: number; recorrente: number }>();

  MONTH_KEYS.forEach((month) => {
    monthly.set(month, { licencasServicos: 0, recorrente: 0 });
  });

  pedidos.forEach((pedido) => {
    if (!oppIds.has(pedido.idOportunidade)) return;

    const date = parseDate(pedido.dataFechamento);
    if (!date || date.getFullYear() !== ano) return;

    const monthKey = getMonthKeyFromDate(date);
    const bucket = monthly.get(monthKey)!;
    bucket.licencasServicos += pedido.licencasServicos;
    bucket.recorrente += pedido.recorrente;
  });

  return monthly;
}

export function useGoalMetricsProcessor(
  goals: GoalRow[],
  pedidos: PedidoCRM[],
  _processedData: unknown[],
  selectedPeriod: string,
  actions: GenericAction[],
  opportunities: GenericOpportunity[],
) {
  return useMemo<GoalMetricByETN[]>(() => {
    if (!goals.length) return [];

    const periodMonths = getPeriodMonths(selectedPeriod);
    const qualifiedByUser = collectQualifiedOpps(actions ?? [], opportunities ?? []);

    const metrics = goals.map((goal) => {
      const qualified = qualifiedByUser.get(goal.idUsuarioErp);
      const oppIds = qualified?.oppIds ?? new Set<string>();
      const monthlyPedidos = aggregatePedidosByMonth(pedidos ?? [], oppIds, goal.ano);

      const meses: GoalMonthDetail[] = MONTH_KEYS.map((month) => {
        const pedidoValues = monthlyPedidos.get(month) ?? {
          licencasServicos: 0,
          recorrente: 0,
        };

        const meta = goal[month] ?? 0;
        const realizadoLicencasServicos = pedidoValues.licencasServicos;
        const realizadoRecorrente = pedidoValues.recorrente;
        const realizadoTotal = realizadoLicencasServicos + realizadoRecorrente;
        const atingimentoPercentual = meta > 0 ? (realizadoTotal / meta) * 100 : 0;

        return {
          mes: month,
          label: MONTH_LABELS[month],
          meta,
          realizadoLicencasServicos,
          realizadoRecorrente,
          realizadoTotal,
          atingimentoPercentual,
        };
      });

      const selected = meses.filter((item) => periodMonths.includes(item.mes));

      const metaTotal = selected.reduce((acc, item) => acc + item.meta, 0);
      const realizadoLicencasServicos = selected.reduce((acc, item) => acc + item.realizadoLicencasServicos, 0);
      const realizadoRecorrente = selected.reduce((acc, item) => acc + item.realizadoRecorrente, 0);
      const realizadoTotal = selected.reduce((acc, item) => acc + item.realizadoTotal, 0);
      const atingimentoPercentual = metaTotal > 0 ? (realizadoTotal / metaTotal) * 100 : 0;

      return {
        idUsuarioErp: goal.idUsuarioErp,
        etnNome: goal.etnNome || qualified?.etnNome || goal.idUsuarioErp,
        ano: goal.ano,
        metaLicencasServicos: metaTotal,
        metaRecorrente: 0,
        metaTotal,
        realizadoLicencasServicos,
        realizadoRecorrente,
        realizadoTotal,
        atingimentoPercentual,
        meses,
      };
    });

    return metrics.sort((a, b) => b.realizadoTotal - a.realizadoTotal);
  }, [goals, pedidos, selectedPeriod, actions, opportunities]);
}
