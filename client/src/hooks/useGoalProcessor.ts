import { useCallback } from 'react';
import * as XLSX from 'xlsx';
import { GoalRecord, PedidoRecord } from '@/types/goals';

export const useGoalProcessor = () => {
  const parseGoalsFile = useCallback(async (file: File): Promise<GoalRecord[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(worksheet) as any[];

          const goals: GoalRecord[] = rows
            .filter((row) => row.Produto && row['ID Usuário'])
            .map((row) => ({
              produto: String(row.Produto || '').trim(),
              idUsuario: String(row['ID Usuário'] || '').trim(),
              rubrica: String(row.Rubrica || '').trim(),
              janeiro: parseFloat(row.Janeiro) || 0,
              fevereiro: parseFloat(row.Fevereiro) || 0,
              marco: parseFloat(row.Março) || 0,
              primeiroTrimestre: parseFloat(row['1ºTri']) || 0,
              abril: parseFloat(row.Abril) || 0,
              maio: parseFloat(row.Maio) || 0,
              junho: parseFloat(row.Junho) || 0,
              segundoTrimestre: parseFloat(row['2ºTri']) || 0,
              julho: parseFloat(row.Julho) || 0,
              agosto: parseFloat(row.Agosto) || 0,
              setembro: parseFloat(row.Setembro) || 0,
              terceiroTrimestre: parseFloat(row['3ºTri']) || 0,
              outubro: parseFloat(row.Outubro) || 0,
              novembro: parseFloat(row.Novembro) || 0,
              dezembro: parseFloat(row.Dezembro) || 0,
              quartoTrimestre: parseFloat(row['4ºTri']) || 0,
              totalAno: parseFloat(row['Total Ano']) || 0,
            }));

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
            // Tentar diferentes encodings
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
            const row: Record<string, string> = {};
            headers.forEach((header, idx) => {
              row[header] = values[idx] || '';
            });

            // Mapear campos do CSV para PedidoRecord
            const pedido: PedidoRecord = {
              idOportunidade: row['ID OPORTUNIDADE'] || '',
              idEtapaOportunidade: row['ETAPA OPORTUNIDADE'] || '',
              proprietarioOportunidade: row['PROPRIETARIO OPORTUNIDADE'] || '',
              idErpProprietario: row['ID ERP PROPRIETARIO'] || '',
              produto: row['PRODUTO'] || '',
              produtoCodigoModulo: row['PRODUTO - CÓDIGO DO MÓDULO'] || '',
              produtoModulo: row['PRODUTO - MODULO'] || '',
              produtoValorLicenca: parseFloat(row['PRODUTO - VALOR LICENCA']?.replace(',', '.') || '0') || 0,
              produtoValorLicencaCanal: parseFloat(row['PRODUTO - VALOR LICENCA CANAL']?.replace(',', '.') || '0') || 0,
              produtoValorManutencao: parseFloat(row['PRODUTO - VALOR MANUTENCAO']?.replace(',', '.') || '0') || 0,
              produtoValorManutencaoCanal: parseFloat(row['PRODUTO - VALOR MANUTENCAO CANAL']?.replace(',', '.') || '0') || 0,
              servico: row['SERVICO'] || '',
              servicoTipoDeFaturamento: row['SERVICO - TIPO DE FATURAMENTO'] || '',
              servicoQtdeDeHoras: parseFloat(row['SERVICO - QTDE DE HORAS']?.replace(',', '.') || '0') || 0,
              servicoValorHora: parseFloat(row['SERVICO - VALOR HORA']?.replace(',', '.') || '0') || 0,
              servicoValorBruto: parseFloat(row['SERVICO - VALOR BRUTO']?.replace(',', '.') || '0') || 0,
              servicoValorOver: parseFloat(row['SERVICO - VALOR OVER']?.replace(',', '.') || '0') || 0,
              servicoValorDesconto: parseFloat(row['SERVICO - VALOR DESCONTO']?.replace(',', '.') || '0') || 0,
              servicoValorCanal: parseFloat(row['SERVICO - VALOR CANAL']?.replace(',', '.') || '0') || 0,
              servicoValorLiquido: parseFloat(row['SERVICO - VALOR LIQUIDO']?.replace(',', '.') || '0') || 0,
            };

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
