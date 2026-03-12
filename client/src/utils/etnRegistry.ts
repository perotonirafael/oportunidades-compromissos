export interface EtnRegistryItem {
  idUsuarioErp: string;
  etnNome: string;
  aliases: string[];
  validCommitmentsCount: number;
}

type GenericRecord = Record<string, unknown>;

const VALID_CATEGORIES = new Set([
  'demonstracao presencial',
  'demonstracao remota',
  'analise de aderencia',
  'etn apoio',
  'analise de rfp/rfi',
  'termo de referencia',
  'edital',
]);

function normalize(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function pickFirst(row: GenericRecord, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
}

export function buildEtnRegistry(actions: GenericRecord[], opportunities: GenericRecord[] = []): EtnRegistryItem[] {
  const byId = new Map<string, { names: Map<string, number>; validCommitmentsCount: number }>();
  const opportunityById = new Map<string, string>();

  opportunities.forEach((opportunity) => {
    const opportunityId = pickFirst(opportunity, ['Oportunidade ID', 'ID Oportunidade', 'Id Oportunidade', 'id']);
    if (!opportunityId) return;
    const stage = normalize(pickFirst(opportunity, ['Etapa', 'Status', 'Situação', 'Situacao']));
    opportunityById.set(opportunityId, stage);
  });

  actions.forEach((action) => {
    const idUsuarioErp = pickFirst(action, ['Id Usuário ERP', 'ID Usuário ERP', 'idUsuarioErp', 'Id Usuario ERP', 'ID Usuario ERP']);
    if (!idUsuarioErp) return;

    const name = pickFirst(action, ['Usuário', 'Usuario', 'Responsável', 'Responsavel', 'ETN']) || idUsuarioErp;
    const category = normalize(pickFirst(action, ['Categoria', 'Tipo Compromisso', 'categoria']));
    const opportunityId = pickFirst(action, ['Oportunidade ID', 'ID Oportunidade', 'Id Oportunidade', 'id']);
    const stage = normalize(opportunityById.get(opportunityId) || '');
    const isClosedWon = !stage || stage.includes('fechada e ganha') || stage.includes('closed won');

    if (!byId.has(idUsuarioErp)) {
      byId.set(idUsuarioErp, { names: new Map(), validCommitmentsCount: 0 });
    }

    const entry = byId.get(idUsuarioErp)!;
    entry.names.set(name, (entry.names.get(name) || 0) + 1);

    if (VALID_CATEGORIES.has(category) && isClosedWon) {
      entry.validCommitmentsCount += 1;
    }
  });

  return Array.from(byId.entries())
    .map(([idUsuarioErp, data]) => {
      const sortedNames = Array.from(data.names.entries()).sort((a, b) => b[1] - a[1]);
      const etnNome = sortedNames[0]?.[0] || idUsuarioErp;
      const aliases = sortedNames.slice(1).map(([name]) => name);
      return {
        idUsuarioErp,
        etnNome,
        aliases,
        validCommitmentsCount: data.validCommitmentsCount,
      };
    })
    .sort((a, b) => a.etnNome.localeCompare(b.etnNome));
}

export function findEtnIdByName(registry: EtnRegistryItem[], etnName: string): string | null {
  const normalizedTarget = normalize(etnName);
  if (!normalizedTarget) return null;

  for (const item of registry) {
    if (normalize(item.etnNome) === normalizedTarget) return item.idUsuarioErp;
    if (item.aliases.some((alias) => normalize(alias) === normalizedTarget)) return item.idUsuarioErp;
  }

  return null;
}
