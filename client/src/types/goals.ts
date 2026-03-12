export type MonthKey =
  | 'janeiro'
  | 'fevereiro'
  | 'marco'
  | 'abril'
  | 'maio'
  | 'junho'
  | 'julho'
  | 'agosto'
  | 'setembro'
  | 'outubro'
  | 'novembro'
  | 'dezembro';

export const MONTH_KEYS: MonthKey[] = [
  'janeiro',
  'fevereiro',
  'marco',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

export const MONTH_LABELS: Record<MonthKey, string> = {
  janeiro: 'Janeiro',
  fevereiro: 'Fevereiro',
  marco: 'Março',
  abril: 'Abril',
  maio: 'Maio',
  junho: 'Junho',
  julho: 'Julho',
  agosto: 'Agosto',
  setembro: 'Setembro',
  outubro: 'Outubro',
  novembro: 'Novembro',
  dezembro: 'Dezembro',
};

export interface GoalMonthlyValues {
  janeiro: number;
  fevereiro: number;
  marco: number;
  abril: number;
  maio: number;
  junho: number;
  julho: number;
  agosto: number;
  setembro: number;
  outubro: number;
  novembro: number;
  dezembro: number;
}

export interface GoalRow extends GoalMonthlyValues {
  id: string;
  ano: number;
  idUsuarioErp: string;
  etnNome: string;
}

export interface PedidoCRM {
  id: string;
  idOportunidade: string;
  dataFechamento: string | null;
  licencasServicos: number;
  recorrente: number;
  total: number;
}

export interface GoalMonthDetail {
  mes: MonthKey;
  label: string;
  meta: number;
  realizadoLicencasServicos: number;
  realizadoRecorrente: number;
  realizadoTotal: number;
  atingimentoPercentual: number;
}

export interface GoalMetricByETN {
  idUsuarioErp: string;
  etnNome: string;
  ano: number;
  metaLicencasServicos: number;
  metaRecorrente: number;
  metaTotal: number;
  realizadoLicencasServicos: number;
  realizadoRecorrente: number;
  realizadoTotal: number;
  atingimentoPercentual: number;
  meses: GoalMonthDetail[];
}
