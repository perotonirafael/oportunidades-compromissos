import { useCallback } from 'react';
import * as XLSX from 'xlsx';
import { GoalRecord, PedidoRecord } from '@/types/goals';

type SpreadsheetRow = Record<string, unknown>;

const ID_USUARIO_ALIASES = ['ID Usuário ERP', 'Id Usuário ERP', 'ID Usuário', 'Id Usuário'] as const;

const GOAL_FIELD_ALIASES = {
  produto: ['Produto'],
  idUsuario: ID_USUARIO_ALIASES,
  rubrica: ['Rubrica'],
  ano: ['Ano'],
  janeiro: ['Janeiro'],
  fevereiro: ['Fevereiro'],
  marco: ['Março', 'Marco'],
  primeiroTrimestre: ['1ºTri', '1oTri', '1°Tri'],
  abril: ['Abril'],
  maio: ['Maio'],
  junho: ['Junho'],
  segundoTrimestre: ['2ºTri', '2oTri', '2°Tri'],
  julho: ['Julho'],
  agosto: ['Agosto'],
  setembro: ['Setembro'],
  terceiroTrimestre: ['3ºTri', '3oTri', '3°Tri'],
  outubro: ['Outubro'],
  novembro: ['Novembro'],
  dezembro: ['Dezembro'],
  quartoTrimestre: ['4ºTri', '4oTri', '4°Tri'],
  totalAno: ['Total Ano'],
} as const;

const PEDIDO_FIELD_ALIASES = {
  idOportunidade: ['ID OPORTUNIDADE'],
  idEtapaOportunidade: ['ETAPA OPORTUNIDADE'],
  proprietarioOportunidade: ['PROPRIETARIO OPORTUNIDADE'],
  idErpProprietario: ['ID ERP PROPRIETARIO'],
  dataFechamento: ['DATA FECHAMENTO'],
  produto: ['PRODUTO'],
  produtoCodigoModulo: ['PRODUTO - CÓDIGO DO MÓDULO'],
  produtoModulo: ['PRODUTO - MODULO'],
  produtoValorLicenca: ['PRODUTO - VALOR LICENCA'],
  produtoValorLicencaCanal: ['PRODUTO - VALOR LICENCA CANAL'],
  produtoValorManutencao: ['PRODUTO - VALOR MANUTENCAO'],
  produtoValorManutencaoCanal: ['PRODUTO - VALOR MANUTENCAO CANAL'],
  servico: ['SERVICO'],
  servicoTipoDeFaturamento: ['SERVICO - TIPO DE FATURAMENTO'],
  servicoQtdeDeHoras: ['SERVICO - QTDE DE HORAS'],
  servicoValorHora: ['SERVICO - VALOR HORA'],
  servicoValorBruto: ['SERVICO - VALOR BRUTO'],
  servicoValorOver: ['SERVICO - VALOR OVER'],
  servicoValorDesconto: ['SERVICO - VALOR DESCONTO'],
  servicoValorCanal: ['SERVICO - VALOR CANAL'],
  servicoValorLiquido: ['SERVICO - VALOR LIQUIDO'],
} as const;

const normalizeText = (value: unknown): string => (value == null ? '' : String(value).trim());

export const firstNonEmpty = (values: unknown[]): string => {
  for (const value of values) {
    const normalized = normalizeText(value);
    if (normalized) return normalized;
  }
  return '';
};

export const getFieldByAliases = (row: SpreadsheetRow, aliases: readonly string[]): string => {
  return firstNonEmpty(aliases.map((alias) => row[alias]));
};

// Parse valor no formato brasileiro: 4.771,20 → 4771.20
export const parseBRNumber = (value: unknown): number => {
  const raw = normalizeText(value);
  if (!raw) return 0;

  const cleaned = raw
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');

  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
};

export const parseGoalRows = (rows: SpreadsheetRow[]): GoalRecord[] => {
  return rows
    .map((row) => {
      const produto = getFieldByAliases(row, GOAL_FIELD_ALIASES.produto);
      const idUsuario = getFieldByAliases(row, GOAL_FIELD_ALIASES.idUsuario);

      if (!produto || !idUsuario) return null;

      return {
        produto,
        idUsuario,
        rubrica: getFieldByAliases(row, GOAL_FIELD_ALIASES.rubrica),
        ano: parseBRNumber(getFieldByAliases(row, GOAL_FIELD_ALIASES.ano)),
        janeiro: parseBRNumber(getFieldByAliases(row, GOAL_FIELD_ALIASES.janeiro)),
        fevereiro: parseBRNumber(getFieldByAliases(row, GOAL_FIELD_ALIASES.fevereiro)),
        marco: parseBRNumber(getFieldByAliases(row, GOAL_FIELD_ALIASES.marco)),
        primeiroTrimestre: parseBRNumber(getFieldByAliases(row, GOAL_FIELD_ALIASES.primeiroTrimestre)),
        abril: parseBRNumber(getFieldByAliases(row, GOAL_FIELD_ALIASES.abril)),
        maio: parseBRNumber(getFieldByAliases(row, GOAL_FIELD_ALIASES.maio)),
        junho: parseBRNumber(getFieldByAliases(row, GOAL_FIELD_ALIASES.junho)),
        segundoTrimestre: parseBRNumber(getFieldByAliases(row, GOAL_FIELD_ALIASES.segundoTrimestre)),
        julho: parseBRNumber(getFieldByAliases(row, GOAL_FIELD_ALIASES.julho)),
        agosto: parseBRNumber(getFieldByAliases(row, GOAL_FIELD_ALIASES.agosto)),
        setembro: parseBRNumber(getFieldByAliases(row, GOAL_FIELD_ALIASES.setembro)),
        terceiroTrimestre: parseBRNumber(getFieldByAliases(row, GOAL_FIELD_ALIASES.terceiroTrimestre)),
        outubro: parseBRNumber(getFieldByAliases(row, GOAL_FIELD_ALIASES.outubro)),
        novembro: parseBRNumber(getFieldByAliases(row, GOAL_FIELD_ALIASES.novembro)),
        dezembro: parseBRNumber(getFieldByAliases(row, GOAL_FIELD_ALIASES.dezembro)),
        quartoTrimestre: parseBRNumber(getFieldByAliases(row, GOAL_FIELD_ALIASES.quartoTrimestre)),
        totalAno: parseBRNumber(getFieldByAliases(row, GOAL_FIELD_ALIASES.totalAno)),
      } as GoalRecord;
    })
    .filter((goal): goal is GoalRecord => goal !== null);
};

const parsePedidoLine = (headers: string[], values: string[]): PedidoRecord => {
  const row: Record<string, string> = {};
  headers.forEach((header, idx) => {
    row[header] = normalizeText(values[idx]);
  });

  const get = (aliases: readonly string[]) => getFieldByAliases(row, aliases);

  return {
    idOportunidade: get(PEDIDO_FIELD_ALIASES.idOportunidade),
    idEtapaOportunidade: get(PEDIDO_FIELD_ALIASES.idEtapaOportunidade),
    proprietarioOportunidade: get(PEDIDO_FIELD_ALIASES.proprietarioOportunidade),
    idErpProprietario: get(PEDIDO_FIELD_ALIASES.idErpProprietario),
    dataFechamento: get(PEDIDO_FIELD_ALIASES.dataFechamento),
    produto: get(PEDIDO_FIELD_ALIASES.produto),
    produtoCodigoModulo: get(PEDIDO_FIELD_ALIASES.produtoCodigoModulo),
    produtoModulo: get(PEDIDO_FIELD_ALIASES.produtoModulo),
    produtoValorLicenca: parseBRNumber(get(PEDIDO_FIELD_ALIASES.produtoValorLicenca)),
    produtoValorLicencaCanal: parseBRNumber(get(PEDIDO_FIELD_ALIASES.produtoValorLicencaCanal)),
    produtoValorManutencao: parseBRNumber(get(PEDIDO_FIELD_ALIASES.produtoValorManutencao)),
    produtoValorManutencaoCanal: parseBRNumber(get(PEDIDO_FIELD_ALIASES.produtoValorManutencaoCanal)),
    servico: get(PEDIDO_FIELD_ALIASES.servico),
    servicoTipoDeFaturamento: get(PEDIDO_FIELD_ALIASES.servicoTipoDeFaturamento),
    servicoQtdeDeHoras: parseBRNumber(get(PEDIDO_FIELD_ALIASES.servicoQtdeDeHoras)),
    servicoValorHora: parseBRNumber(get(PEDIDO_FIELD_ALIASES.servicoValorHora)),
    servicoValorBruto: parseBRNumber(get(PEDIDO_FIELD_ALIASES.servicoValorBruto)),
    servicoValorOver: parseBRNumber(get(PEDIDO_FIELD_ALIASES.servicoValorOver)),
    servicoValorDesconto: parseBRNumber(get(PEDIDO_FIELD_ALIASES.servicoValorDesconto)),
    servicoValorCanal: parseBRNumber(get(PEDIDO_FIELD_ALIASES.servicoValorCanal)),
    servicoValorLiquido: parseBRNumber(get(PEDIDO_FIELD_ALIASES.servicoValorLiquido)),
  };
};

export const useGoalProcessor = () => {
  const parseGoalsFile = useCallback(async (file: File): Promise<GoalRecord[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(worksheet) as SpreadsheetRow[];

          const goals = parseGoalRows(rows);
          resolve(goals);
        } catch (err) {
          reject(new Error(`Erro ao processar arquivo de metas: ${err}`));
        }
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo de metas'));
      reader.readAsArrayBuffer(file);
    });
  }, []);

  const parsePedidosFile = useCallback(async (file: File): Promise<PedidoRecord[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          let text: string;

          if (typeof data === 'string') {
            text = data;
          } else {
            const decoder = new TextDecoder('iso-8859-1');
            text = decoder.decode(data as ArrayBuffer);
          }

          const lines = text.split('\n');
          if (lines.length === 0) throw new Error('Arquivo vazio');

          const headers = lines[0].split(';').map((h) => h.trim());
          const pedidos: PedidoRecord[] = [];

          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = line.split(';').map((v) => v.trim());
            const pedido = parsePedidoLine(headers, values);

            if (pedido.idOportunidade) {
              pedidos.push(pedido);
            }
          }

          resolve(pedidos);
        } catch (err) {
          reject(new Error(`Erro ao processar arquivo de pedidos: ${err}`));
        }
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo de pedidos'));
      reader.readAsArrayBuffer(file);
    });
  }, []);

  return { parseGoalsFile, parsePedidosFile };
};
