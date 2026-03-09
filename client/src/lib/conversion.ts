export interface ConversionRecord {
  oppId: string;
  etn: string;
  etapa: string;
  valorUnificado?: number;
  valorReconhecido?: number;
  valorPrevisto?: number;
  valorFechadoReconhecido?: number;
  valorFechado?: number;
  anoPrevisao?: string;
  mesPrevisao?: string;
}

export interface ConversionSummary {
  total: number;
  ganhas: number;
  perdidas: number;
  ganhasValor: number;
  perdidasValor: number;
  taxaConversao: number;
}

const normalize = (v: string) =>
  (v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export function buildDemoConversionByETN(
  records: ConversionRecord[],
  actions: Array<Record<string, any>>,
  options?: { year?: string; month?: string },
): Map<string, ConversionSummary> {
  const demoKeys = new Set<string>();

  for (const action of actions || []) {
    const categoria = normalize((action['Categoria'] || '').toString());
    const isDemo = categoria === 'demonstracao presencial' || categoria === 'demonstracao remota';
    if (!isDemo) continue;

    const oppId = (action['Oportunidade ID'] || '').toString().trim();
    const etn = (action['Usuario'] || action['Responsavel'] || action['Usuário Ação'] || '').toString().trim();
    if (!oppId || !etn) continue;
    demoKeys.add(`${etn}||${oppId}`);
  }

  const seen = new Set<string>();
  const summary = new Map<string, ConversionSummary>();

  for (const record of records) {
    if (!record.etn || record.etn === 'Sem Agenda') continue;
    if (options?.year && record.anoPrevisao !== options.year) continue;
    if (options?.month && record.mesPrevisao !== options.month) continue;

    const key = `${record.etn}||${record.oppId}`;
    if (!demoKeys.has(key) || seen.has(key)) continue;
    seen.add(key);

    const isGanha = record.etapa === 'Fechada e Ganha' || record.etapa === 'Fechada e Ganha TR';
    const isPerdida = record.etapa === 'Fechada e Perdida';
    if (!isGanha && !isPerdida) continue;

    const current = summary.get(record.etn) || {
      total: 0,
      ganhas: 0,
      perdidas: 0,
      ganhasValor: 0,
      perdidasValor: 0,
      taxaConversao: 0,
    };

    current.total += 1;
    if (isGanha) {
      current.ganhas += 1;
      current.ganhasValor += record.valorUnificado ?? record.valorFechadoReconhecido ?? record.valorFechado ?? 0;
    }
    if (isPerdida) {
      current.perdidas += 1;
      current.perdidasValor += record.valorUnificado ?? record.valorReconhecido ?? record.valorPrevisto ?? 0;
    }

    summary.set(record.etn, current);
  }

  summary.forEach((value, etn) => {
    summary.set(etn, {
      ...value,
      taxaConversao: value.total > 0 ? Math.round((value.ganhas / value.total) * 100) : 0,
    });
  });

  return summary;
}


export function buildDemoOppIdSet(actions: Array<Record<string, any>>): Set<string> {
  const demoOppIds = new Set<string>();

  for (const action of actions || []) {
    const categoria = normalize((action['Categoria'] || '').toString());
    const isDemo = categoria === 'demonstracao presencial' || categoria === 'demonstracao remota';
    if (!isDemo) continue;

    const oppId = (action['Oportunidade ID'] || '').toString().trim();
    if (!oppId) continue;
    demoOppIds.add(oppId);
  }

  return demoOppIds;
}
