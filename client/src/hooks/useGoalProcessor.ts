import { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';
import { GoalRow, MonthKey, MONTH_KEYS, PedidoCRM } from '@/types/goals';

type GenericRow = Record<string, unknown>;

const KEY_ALIASES = {
  idUsuarioErp: ['ID Usuário ERP', 'Id Usuário ERP', 'ID Usuário', 'Id Usuário'],
  ano: ['Ano', 'ANO'],
  etnNome: ['ETN', 'Nome', 'Usuário', 'Usuario', 'Colaborador', 'Responsável', 'Responsavel'],
  janeiro: ['Janeiro'],
  fevereiro: ['Fevereiro'],
  marco: ['Março', 'Marco'],
  abril: ['Abril'],
  maio: ['Maio'],
  junho: ['Junho'],
  julho: ['Julho'],
  agosto: ['Agosto'],
  setembro: ['Setembro'],
  outubro: ['Outubro'],
  novembro: ['Novembro'],
  dezembro: ['Dezembro'],
  pedidoIdOpp: ['ID OPORTUNIDADE', '"ID OPORTUNIDADE"', 'Id Oportunidade'],
  pedidoDataFechamento: ['DATA FECHAMENTO', '"DATA FECHAMENTO"', 'Data Fechamento'],
  pedidoLicencasServicos: [
    'LICENCAS+SERVICOS',
    'LICENÇAS+SERVIÇOS',
    '"LICENCAS+SERVICOS"',
    '"LICENÇAS+SERVIÇOS"',
    'Licenças+Serviços',
  ],
  pedidoRecorrente: ['RECORRENTE', '"RECORRENTE"', 'Recorrente'],
} as const;

function normalizeKey(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/["']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function findValue(row: GenericRow, aliases: readonly string[]): unknown {
  const normalizedMap = new Map<string, unknown>();

  Object.entries(row).forEach(([key, value]) => {
    normalizedMap.set(normalizeKey(key), value);
  });

  for (const alias of aliases) {
    const found = normalizedMap.get(normalizeKey(alias));
    if (found !== undefined && found !== null && String(found).trim() !== '') {
      return found;
    }
  }

  return undefined;
}

function parseNumberBr(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const raw = String(value).trim();
  if (!raw) return 0;

  const cleaned = raw
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .replace(/[^0-9.-]/g, '');

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseYear(value: unknown): number {
  const year = Number(String(value ?? '').replace(/\D/g, ''));
  return Number.isFinite(year) && year > 2000 ? year : new Date().getFullYear();
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ';' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);
  return result.map((item) => item.trim());
}

function parseCsv(text: string): GenericRow[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (!lines.length) return [];

  const header = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: GenericRow = {};
    header.forEach((key, index) => {
      row[key] = values[index] ?? '';
    });
    return row;
  });
}

function buildGoalRow(row: GenericRow, index: number): GoalRow | null {
  const idUsuarioErpRaw = findValue(row, KEY_ALIASES.idUsuarioErp);
  if (!idUsuarioErpRaw) return null;

  const idUsuarioErp = String(idUsuarioErpRaw).trim();
  const etnNome = String(findValue(row, KEY_ALIASES.etnNome) ?? idUsuarioErp).trim();
  const ano = parseYear(findValue(row, KEY_ALIASES.ano));

  const monthly = {
    janeiro: parseNumberBr(findValue(row, KEY_ALIASES.janeiro)),
    fevereiro: parseNumberBr(findValue(row, KEY_ALIASES.fevereiro)),
    marco: parseNumberBr(findValue(row, KEY_ALIASES.marco)),
    abril: parseNumberBr(findValue(row, KEY_ALIASES.abril)),
    maio: parseNumberBr(findValue(row, KEY_ALIASES.maio)),
    junho: parseNumberBr(findValue(row, KEY_ALIASES.junho)),
    julho: parseNumberBr(findValue(row, KEY_ALIASES.julho)),
    agosto: parseNumberBr(findValue(row, KEY_ALIASES.agosto)),
    setembro: parseNumberBr(findValue(row, KEY_ALIASES.setembro)),
    outubro: parseNumberBr(findValue(row, KEY_ALIASES.outubro)),
    novembro: parseNumberBr(findValue(row, KEY_ALIASES.novembro)),
    dezembro: parseNumberBr(findValue(row, KEY_ALIASES.dezembro)),
  };

  return {
    id: `${idUsuarioErp}-${ano}-${index}`,
    idUsuarioErp,
    etnNome,
    ano,
    ...monthly,
  };
}

function buildPedidoRow(row: GenericRow, index: number): PedidoCRM | null {
  const idOportunidadeRaw = findValue(row, KEY_ALIASES.pedidoIdOpp);
  if (!idOportunidadeRaw) return null;

  const idOportunidade = String(idOportunidadeRaw).trim();
  if (!idOportunidade) return null;

  const licencasServicos = parseNumberBr(findValue(row, KEY_ALIASES.pedidoLicencasServicos));
  const recorrente = parseNumberBr(findValue(row, KEY_ALIASES.pedidoRecorrente));
  const dataFechamentoRaw = findValue(row, KEY_ALIASES.pedidoDataFechamento);

  return {
    id: `${idOportunidade}-${index}`,
    idOportunidade,
    dataFechamento: dataFechamentoRaw ? String(dataFechamentoRaw).trim() : null,
    licencasServicos,
    recorrente,
    total: licencasServicos + recorrente,
  };
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return await file.arrayBuffer();
}

async function readFileAsText(file: File): Promise<string> {
  return await file.text();
}

export function useGoalProcessor() {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [pedidos, setPedidos] = useState<PedidoCRM[]>([]);

  const processGoalsFile = useCallback(async (file: File) => {
    const extension = file.name.toLowerCase().split('.').pop();

    let rows: GenericRow[] = [];

    if (extension === 'csv') {
      const text = await readFileAsText(file);
      rows = parseCsv(text);
    } else {
      const buffer = await readFileAsArrayBuffer(file);
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json<GenericRow>(sheet, { defval: '' });
    }

    const parsed = rows
      .map((row, index) => buildGoalRow(row, index))
      .filter((row): row is GoalRow => Boolean(row));

    setGoals(parsed);
    return parsed;
  }, []);

  const processPedidosFile = useCallback(async (file: File) => {
    const text = await readFileAsText(file);
    const rows = parseCsv(text);
    const parsed = rows
      .map((row, index) => buildPedidoRow(row, index))
      .filter((row): row is PedidoCRM => Boolean(row));

    setPedidos(parsed);
    return parsed;
  }, []);

  const updateGoalValue = useCallback((goalId: string, month: MonthKey, value: number) => {
    setGoals((current) =>
      current.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              [month]: Number.isFinite(value) ? value : 0,
            }
          : goal,
      ),
    );
  }, []);

  const replaceGoals = useCallback((nextGoals: GoalRow[]) => {
    setGoals(nextGoals);
  }, []);

  return {
    goals,
    pedidos,
    setGoals,
    setPedidos,
    replaceGoals,
    updateGoalValue,
    processGoalsFile,
    processPedidosFile,
  };
}

export { MONTH_KEYS };
