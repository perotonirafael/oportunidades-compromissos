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

export type ProductFamily = 'HCM Senior' | 'HCM Konviva' | 'HCM JobConvo' | 'Total Gestão';
export type GoalRubrica = 'Setup + Licenças' | 'Serviços Não Recorrentes' | 'Recorrente';

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

export const PRODUCT_FAMILIES: Exclude<ProductFamily, 'Total Gestão'>[] = ['HCM Senior', 'HCM Konviva', 'HCM JobConvo'];
export const GOAL_RUBRICAS: GoalRubrica[] = ['Setup + Licenças', 'Serviços Não Recorrentes', 'Recorrente'];

export interface ManualGoal {
  id: string;
  ano: number;
  idUsuarioErp: string;
  etnNome: string;
  produto: Exclude<ProductFamily, 'Total Gestão'>;
  rubrica: GoalRubrica;
  mes: MonthKey;
  valor: number;
}

export interface PedidoCRM {
  id: string;
  idOportunidade: string;
  etapaOportunidade: string;
  dataFechamento: string | null;
  produto: string;
  produtoModulo: string;
  produtoValorLicenca: number;
  produtoValorManutencao: number;
  servicoValorLiquido: number;
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
