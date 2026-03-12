import {
  GoalMetricByETN,
  GoalMonthDetail,
  GoalRubrica,
  ManualGoal,
  MONTH_KEYS,
  MONTH_LABELS,
  MonthKey,
  PedidoCRM,
  ProductFamily,
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
  return String(input ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function getPeriodMonths(selectedPeriod: string): MonthKey[] {
  const normalized = normalize(selectedPeriod);
  if (!normalized || normalized === 'todos') return MONTH_KEYS;
  const month = MONTH_KEYS.find((key) => normalize(MONTH_LABELS[key]) === normalized);
  if (month) return [month];
  if (normalized.includes('1') && normalized.includes('trimestre')) return ['janeiro', 'fevereiro', 'marco'];
  if (normalized.includes('2') && normalized.includes('trimestre')) return ['abril', 'maio', 'junho'];
  if (normalized.includes('3') && normalized.includes('trimestre')) return ['julho', 'agosto', 'setembro'];
  if (normalized.includes('4') && normalized.includes('trimestre')) return ['outubro', 'novembro', 'dezembro'];
  return MONTH_KEYS;
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const raw = String(value).trim();
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  const dt = new Date(raw);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function getOpportunityId(obj: Record<string, unknown>): string {
  return String(obj['Oportunidade ID'] ?? obj['ID Oportunidade'] ?? obj['Id Oportunidade'] ?? obj['id'] ?? '').trim();
}

function getActionUserId(action: GenericAction): string {
  return String(action['Id Usuário ERP'] ?? action['ID Usuário ERP'] ?? action['idUsuarioErp'] ?? '').trim();
}

function isClosedWon(opportunity: GenericOpportunity): boolean {
  const stage = normalize(opportunity['Etapa'] ?? opportunity['Status'] ?? '');
  return stage.includes('fechada e ganha') || stage.includes('closed won');
}

function mapPedidoToProduct(pedido: PedidoCRM): Exclude<ProductFamily, 'Total Gestão'> | null {
  const modulo = normalize(pedido.produtoModulo);
  const produto = normalize(pedido.produto);
  const isHcm = produto.includes('hcm') || produto.includes('gestao de pessoas');
  if (!isHcm) return null;
  if (modulo.includes('konviva')) return 'HCM Konviva';
  if (
    modulo.includes('jobconvo') ||
    modulo.includes('ats') ||
    modulo.includes('recrutamento') ||
    modulo.includes('quadro de vagas')
  ) {
    return 'HCM JobConvo';
  }
  return 'HCM Senior';
}

function collectQualifiedOppIds(actions: GenericAction[], opportunities: GenericOpportunity[]) {
  const closedWonIds = new Set(opportunities.filter(isClosedWon).map((item) => getOpportunityId(item)).filter(Boolean));
  const userToOpp = new Map<string, Set<string>>();

  actions.forEach((action) => {
    const idUsuarioErp = getActionUserId(action);
    const category = normalize(action['Categoria'] ?? action['Tipo Compromisso'] ?? action['categoria'] ?? '');
    const oppId = getOpportunityId(action);
    if (!idUsuarioErp || !oppId || !closedWonIds.has(oppId) || !VALID_CATEGORIES.has(category)) return;
    if (!userToOpp.has(idUsuarioErp)) userToOpp.set(idUsuarioErp, new Set());
    userToOpp.get(idUsuarioErp)!.add(oppId);
  });

  return userToOpp;
}

function bucketMeta(goal: ManualGoal): GoalRubrica {
  return goal.rubrica;
}

export function computeGoalMetrics(
  manualGoals: ManualGoal[],
  pedidos: PedidoCRM[],
  selectedPeriod: string,
  actions: GenericAction[],
  opportunities: GenericOpportunity[],
): GoalMetricByETN[] {
  if (!manualGoals.length) return [];

  const periodMonths = getPeriodMonths(selectedPeriod);
  const qualified = collectQualifiedOppIds(actions, opportunities);
  const userName = new Map<string, string>();
  manualGoals.forEach((goal) => userName.set(goal.idUsuarioErp, goal.etnNome));

  const goalsByUserYear = new Map<string, ManualGoal[]>();
  manualGoals.forEach((goal) => {
    const key = `${goal.idUsuarioErp}-${goal.ano}`;
    if (!goalsByUserYear.has(key)) goalsByUserYear.set(key, []);
    goalsByUserYear.get(key)!.push(goal);
  });

  const result: GoalMetricByETN[] = [];

  goalsByUserYear.forEach((goals, key) => {
    const [idUsuarioErp, anoString] = key.split('-');
    const ano = Number(anoString);
    const allowedOppIds = qualified.get(idUsuarioErp) ?? new Set<string>();

    const monthlyMap = new Map<MonthKey, { metaLicServ: number; metaRec: number; realLicServ: number; realRec: number }>();
    MONTH_KEYS.forEach((month) => monthlyMap.set(month, { metaLicServ: 0, metaRec: 0, realLicServ: 0, realRec: 0 }));

    goals.forEach((goal) => {
      const bucket = monthlyMap.get(goal.mes)!;
      if (bucketMeta(goal) === 'Recorrente') bucket.metaRec += goal.valor;
      else bucket.metaLicServ += goal.valor;
    });

    pedidos.forEach((pedido) => {
      if (!allowedOppIds.has(pedido.idOportunidade)) return;
      const date = parseDate(pedido.dataFechamento);
      if (!date || date.getFullYear() !== ano) return;
      const month = MONTH_KEYS[date.getMonth()];
      const bucket = monthlyMap.get(month)!;
      const family = mapPedidoToProduct(pedido);
      if (!family) return;
      const hasProductMeta = goals.some((g) => g.produto === family && g.mes === month);
      if (!hasProductMeta) return;
      bucket.realLicServ += pedido.produtoValorLicenca + pedido.servicoValorLiquido;
      bucket.realRec += pedido.produtoValorManutencao;
    });

    const meses: GoalMonthDetail[] = MONTH_KEYS.map((month) => {
      const values = monthlyMap.get(month)!;
      const meta = values.metaLicServ + values.metaRec;
      const realizadoTotal = values.realLicServ + values.realRec;
      return {
        mes: month,
        label: MONTH_LABELS[month],
        meta,
        realizadoLicencasServicos: values.realLicServ,
        realizadoRecorrente: values.realRec,
        realizadoTotal,
        atingimentoPercentual: meta > 0 ? (realizadoTotal / meta) * 100 : 0,
      };
    });

    const selected = meses.filter((month) => periodMonths.includes(month.mes));
    const metaLicencasServicos = selected.reduce((acc, month) => acc + monthlyMap.get(month.mes)!.metaLicServ, 0);
    const metaRecorrente = selected.reduce((acc, month) => acc + monthlyMap.get(month.mes)!.metaRec, 0);
    const realizadoLicencasServicos = selected.reduce((acc, month) => acc + month.realizadoLicencasServicos, 0);
    const realizadoRecorrente = selected.reduce((acc, month) => acc + month.realizadoRecorrente, 0);
    const metaTotal = metaLicencasServicos + metaRecorrente;
    const realizadoTotal = realizadoLicencasServicos + realizadoRecorrente;

    result.push({
      idUsuarioErp,
      etnNome: userName.get(idUsuarioErp) || idUsuarioErp,
      ano,
      metaLicencasServicos,
      metaRecorrente,
      metaTotal,
      realizadoLicencasServicos,
      realizadoRecorrente,
      realizadoTotal,
      atingimentoPercentual: metaTotal > 0 ? (realizadoTotal / metaTotal) * 100 : 0,
      meses,
    });

    result.push({
      idUsuarioErp: `${idUsuarioErp}-total`,
      etnNome: `${userName.get(idUsuarioErp) || idUsuarioErp} - Total Gestão`,
      ano,
      metaLicencasServicos,
      metaRecorrente,
      metaTotal,
      realizadoLicencasServicos,
      realizadoRecorrente,
      realizadoTotal,
      atingimentoPercentual: metaTotal > 0 ? (realizadoTotal / metaTotal) * 100 : 0,
      meses,
    });
  });

  return result.sort((a, b) => b.realizadoTotal - a.realizadoTotal);
}
