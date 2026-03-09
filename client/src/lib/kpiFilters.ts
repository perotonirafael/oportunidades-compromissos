export function normalizeText(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export const KPI_BASE_CATEGORIES = [
  'Análise de Aderência',
  'Análise de RFP/RFI',
  'Demonstração Presencial',
  'Demonstração Remota',
  'Edital',
  'Termo de Referência',
  'ETN Apoio',
] as const;

export const CONVERSION_DEMO_CATEGORIES = [
  'Demonstração Presencial',
  'Demonstração Remota',
] as const;

export function toNormalizedCategorySet(categories: readonly string[]): Set<string> {
  return new Set(categories.map(normalizeText));
}

export function hasAnyValidCategory(categories: string[], validCategorySet: Set<string>): boolean {
  return categories.some((category) => validCategorySet.has(normalizeText(category)));
}


export function hasOnlyAllowedCategories(categories: string[], allowedCategorySet: Set<string>): boolean {
  const normalized = categories.map(normalizeText).filter(Boolean);
  if (normalized.length === 0) return false;
  return normalized.every((category) => allowedCategorySet.has(category));
}

export function parsePtBrDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length < 3) return null;

  const day = parseInt(parts[0].replace(/[^0-9]/g, ''), 10);
  const month = parseInt(parts[1].replace(/[^0-9]/g, ''), 10);
  const yearStr = parts[2].replace(/[^0-9]/g, '');
  const year = parseInt(yearStr, 10);

  if (!day || month < 1 || month > 12 || yearStr.length !== 4 || year < 2000 || year > 2100) {
    return null;
  }

  return new Date(year, month - 1, day);
}

export function resolveCommitmentPlotDate(action: Record<string, any>, now: Date): Date | null {
  const scheduledDateStr = String(action['Data'] || action['Data Início'] || action['Data da Ação'] || '').trim();
  const createdDateStr = String(action['Data Cadastro'] || action['Data de Cadastro'] || action['Data Criação'] || action['Data de Criação'] || '').trim();

  const scheduledDate = parsePtBrDate(scheduledDateStr);
  if (scheduledDate && scheduledDate <= now) return scheduledDate;

  const createdDate = parsePtBrDate(createdDateStr);
  if (createdDate) return createdDate;

  return scheduledDate && scheduledDate <= now ? scheduledDate : null;
}
