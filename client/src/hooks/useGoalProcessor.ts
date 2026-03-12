import { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';
import { PedidoCRM } from '@/types/goals';

type GenericRow = Record<string, unknown>;

const PEDIDO_ALIASES = {
  idOportunidade: ['ID OPORTUNIDADE', 'Id Oportunidade', '"ID OPORTUNIDADE"'],
  dataFechamento: ['DATA FECHAMENTO', 'Data Fechamento', '"DATA FECHAMENTO"'],
  etapaOportunidade: ['ETAPA OPORTUNIDADE', 'Etapa Oportunidade'],
  produto: ['PRODUTO', 'Produto'],
  produtoModulo: ['PRODUTO - MODULO', 'PRODUTO - MÓDULO', 'Produto - Módulo'],
  produtoValorLicenca: ['PRODUTO - VALOR LICENCA', 'PRODUTO - VALOR LICENÇA'],
  produtoValorManutencao: ['PRODUTO - VALOR MANUTENCAO', 'PRODUTO - VALOR MANUTENÇÃO'],
  servicoValorLiquido: ['SERVICO - VALOR LIQUIDO', 'SERVIÇO - VALOR LÍQUIDO'],
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

function findValue(row: GenericRow, aliases: readonly string[]): string {
  const keys = new Map<string, unknown>();
  Object.entries(row).forEach(([key, value]) => keys.set(normalizeKey(key), value));
  for (const alias of aliases) {
    const value = keys.get(normalizeKey(alias));
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  }
  return '';
}

function parseNumberBr(input: unknown): number {
  const raw = String(input ?? '').trim();
  if (!raw) return 0;
  const normalized = raw
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function decodeArrayBuffer(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  if (utf8.includes('ID OPORTUNIDADE') || utf8.includes(';')) return utf8;
  return new TextDecoder('iso-8859-1', { fatal: false }).decode(buffer);
}

function parseCsvRows(text: string): GenericRow[] {
  const workbook = XLSX.read(text, { type: 'string', raw: false, FS: ';' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<GenericRow>(sheet, { defval: '' });
}

function buildPedido(row: GenericRow, index: number): PedidoCRM | null {
  const idOportunidade = findValue(row, PEDIDO_ALIASES.idOportunidade);
  if (!idOportunidade) return null;

  const produtoValorLicenca = parseNumberBr(findValue(row, PEDIDO_ALIASES.produtoValorLicenca));
  const produtoValorManutencao = parseNumberBr(findValue(row, PEDIDO_ALIASES.produtoValorManutencao));
  const servicoValorLiquido = parseNumberBr(findValue(row, PEDIDO_ALIASES.servicoValorLiquido));

  return {
    id: `${idOportunidade}-${index}`,
    idOportunidade,
    etapaOportunidade: findValue(row, PEDIDO_ALIASES.etapaOportunidade),
    dataFechamento: findValue(row, PEDIDO_ALIASES.dataFechamento) || null,
    produto: findValue(row, PEDIDO_ALIASES.produto),
    produtoModulo: findValue(row, PEDIDO_ALIASES.produtoModulo),
    produtoValorLicenca,
    produtoValorManutencao,
    servicoValorLiquido,
  };
}

export function useGoalProcessor() {
  const [pedidos, setPedidos] = useState<PedidoCRM[]>([]);

  const processPedidosFile = useCallback(async (file: File) => {
    const buffer = await file.arrayBuffer();
    const text = decodeArrayBuffer(buffer);
    const rows = parseCsvRows(text);

    const parsed = rows
      .map((row, index) => buildPedido(row, index))
      .filter((row): row is PedidoCRM => Boolean(row));

    setPedidos(parsed);
    return parsed;
  }, []);

  return {
    pedidos,
    setPedidos,
    processPedidosFile,
  };
}
