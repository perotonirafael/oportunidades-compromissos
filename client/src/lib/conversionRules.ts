import type { Action } from '@/hooks/useDataProcessor';

type ConversionRecord = {
  oppId: string;
  etapa: string;
  valorUnificado?: number;
  valorFechadoReconhecido?: number;
  valorFechado: number;
  valorReconhecido?: number;
  valorPrevisto: number;
};

const ELIGIBLE_CATEGORIES = new Set([
  'demonstracao presencial',
  'demonstracao remota',
  'analise de aderencia',
  'etn apoio',
  'analise de rfp/rfi',
  'analise de rfp rfi',
  'termo de referencia',
  'edital',
]);

export function normalizeText(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function getActionOpportunityId(action: Action): string {
  return (action['Oportunidade ID'] || action['ID Oportunidade'] || '').toString().trim();
}

export function getActionUser(action: Action): string {
  return (action['Usuario'] || action['Usuário'] || action['Responsavel'] || action['Usuário Ação'] || action['Usuario Acao'] || '').toString().trim();
}

export function isEligibleCommitmentCategory(category: string): boolean {
  const normalized = normalizeText(category);
  return ELIGIBLE_CATEGORIES.has(normalized);
}

export function isWonStage(stage: string): boolean {
  const normalized = normalizeText(stage);
  return normalized === 'fechada e ganha' || normalized === 'fechada e ganha tr';
}

export function isLostStage(stage: string): boolean {
  return normalizeText(stage) === 'fechada e perdida';
}

export function buildEligibleCommitmentIndex(actions: Action[]) {
  const eligibleOppIds = new Set<string>();
  const eligibleKeysByEtnOpp = new Set<string>();

  for (const action of actions) {
    if (!isEligibleCommitmentCategory((action['Categoria'] || '').toString())) continue;

    const oppId = getActionOpportunityId(action);
    if (!oppId) continue;

    eligibleOppIds.add(oppId);

    const etn = getActionUser(action);
    if (etn) eligibleKeysByEtnOpp.add(`${etn}||${oppId}`);
  }

  return { eligibleOppIds, eligibleKeysByEtnOpp };
}

export function summarizeClosedEligible(records: ConversionRecord[], eligibleOppIds: Set<string>) {
  const seenClosedOpps = new Set<string>();
  let ganhas = 0;
  let perdidas = 0;
  let ganhasValor = 0;
  let perdidasValor = 0;

  for (const record of records) {
    if (!eligibleOppIds.has(record.oppId) || seenClosedOpps.has(record.oppId)) continue;

    const won = isWonStage(record.etapa);
    const lost = isLostStage(record.etapa);
    if (!won && !lost) continue;

    seenClosedOpps.add(record.oppId);

    if (won) {
      ganhas++;
      ganhasValor += (record.valorUnificado ?? record.valorFechadoReconhecido ?? record.valorFechado);
    }
    if (lost) {
      perdidas++;
      perdidasValor += (record.valorUnificado ?? record.valorReconhecido ?? record.valorPrevisto);
    }
  }

  const closedTotal = ganhas + perdidas;
  const winRate = closedTotal > 0 ? ((ganhas / closedTotal) * 100).toFixed(1) : '0';

  return { ganhas, perdidas, ganhasValor, perdidasValor, closedTotal, winRate };
}
