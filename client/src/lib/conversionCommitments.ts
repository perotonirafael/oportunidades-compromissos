const CONVERSION_COMMITMENT_TYPES = new Set([
  'demonstracao remota',
  'demonstracao presencial',
]);

const COMMITMENT_CATEGORY_FIELDS = [
  'Categoria',
  'Tipo de Compromisso',
  'Categoria Compromisso',
] as const;

const ACTION_OWNER_FIELDS = ['Usuario', 'Responsavel', 'Usuário Ação'] as const;

function normalize(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function getCommitmentCategoryFromAction(action: Record<string, any>): string {
  for (const field of COMMITMENT_CATEGORY_FIELDS) {
    const value = action[field];
    if (value !== undefined && value !== null && `${value}`.trim()) {
      return `${value}`.trim();
    }
  }
  return '';
}

export function isConversionCommitmentAction(action: Record<string, any>): boolean {
  const category = getCommitmentCategoryFromAction(action);
  return CONVERSION_COMMITMENT_TYPES.has(normalize(category));
}

export function getActionOwner(action: Record<string, any>): string {
  for (const field of ACTION_OWNER_FIELDS) {
    const value = action[field];
    if (value !== undefined && value !== null && `${value}`.trim()) {
      return `${value}`.trim();
    }
  }
  return '';
}

export function getActionOpportunityId(action: Record<string, any>): string {
  const value = action['Oportunidade ID'];
  return value ? `${value}`.trim() : '';
}
