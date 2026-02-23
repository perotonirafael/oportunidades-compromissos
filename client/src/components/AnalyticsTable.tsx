import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { ProcessedRecord } from '@/hooks/useDataProcessor';

interface AnalyticsTableProps {
  data: ProcessedRecord[];
  searchTerm: string;
}

type SortField = keyof ProcessedRecord | null;
type SortOrder = 'asc' | 'desc';

const COLUMNS = [
  { key: 'ID Oportunidade', label: 'ID Oportunidade', width: '12%' },
  { key: 'Conta', label: 'Conta', width: '15%' },
  { key: 'Responsável', label: 'Responsável', width: '12%' },
  { key: 'Usuário Ação', label: 'Usuário Ação', width: '12%' },
  { key: 'Etapa', label: 'Etapa', width: '10%' },
  { key: 'Mês Fech.', label: 'Mês Fech.', width: '10%' },
  { key: 'Probabilidade', label: 'Probabilidade', width: '10%' },
  { key: 'Valor Previsto', label: 'Valor Previsto', width: '12%' },
  { key: 'Qtd. Ações', label: 'Qtd. Ações', width: '7%' }
];

function parseValue(value: any): number | string {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? value : num;
  }
  return value;
}

function compareValues(a: any, b: any, order: SortOrder): number {
  const aVal = parseValue(a);
  const bVal = parseValue(b);

  if (typeof aVal === 'number' && typeof bVal === 'number') {
    return order === 'asc' ? aVal - bVal : bVal - aVal;
  }

  const aStr = String(aVal).toLowerCase();
  const bStr = String(bVal).toLowerCase();
  
  if (order === 'asc') {
    return aStr.localeCompare(bStr, 'pt-BR');
  } else {
    return bStr.localeCompare(aStr, 'pt-BR');
  }
}

export function AnalyticsTable({ data, searchTerm }: AnalyticsTableProps) {
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const filteredAndSortedData = useMemo(() => {
    let filtered = data;

    // Aplicar filtro de pesquisa
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = data.filter(row =>
        String(row['ID Oportunidade']).toLowerCase().includes(term) ||
        String(row['Conta']).toLowerCase().includes(term) ||
        String(row['Responsável']).toLowerCase().includes(term) ||
        String(row['Usuário Ação']).toLowerCase().includes(term) ||
        String(row['Etapa']).toLowerCase().includes(term) ||
        String(row['Mês Fech.']).toLowerCase().includes(term)
      );
    }

    // Aplicar ordenação
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        return compareValues(aVal, bVal, sortOrder);
      });
    }

    // Limitar a 100 linhas
    return filtered.slice(0, 100);
  }, [data, searchTerm, sortField, sortOrder]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field as SortField);
      setSortOrder('asc');
    }
  };

  const formatValue = (key: string, value: any): string => {
    if (key === 'Valor Previsto') {
      const num = parseFloat(value?.toString() || '0');
      return isNaN(num) ? '0' : `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (key === 'Probabilidade') {
      const str = value?.toString() || '';
      return str.includes('%') ? str : `${str}%`;
    }
    return value?.toString() || '';
  };

  return (
    <div className="border border-gray-300 rounded overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-900 text-white">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-gray-800 transition-colors"
                  style={{ width: col.width }}
                >
                  <div className="flex items-center gap-2">
                    <span>{col.label}</span>
                    {sortField === col.key && (
                      sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedData.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-8 text-center text-gray-500">
                  Nenhum resultado encontrado
                </td>
              </tr>
            ) : (
              filteredAndSortedData.map((row, idx) => (
                <tr
                  key={idx}
                  className={`border-t border-gray-200 hover:bg-gray-50 transition-colors ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  {COLUMNS.map(col => (
                    <td
                      key={`${idx}-${col.key}`}
                      className="px-4 py-3 text-gray-900"
                      style={{ width: col.width }}
                    >
                      <span className="font-mono text-xs">
                        {formatValue(col.key, row[col.key as keyof ProcessedRecord])}
                      </span>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {filteredAndSortedData.length === 100 && (
        <div className="px-4 py-2 bg-gray-100 text-xs text-gray-600 border-t border-gray-200">
          Mostrando 100 de {data.length} registros
        </div>
      )}
    </div>
  );
}
