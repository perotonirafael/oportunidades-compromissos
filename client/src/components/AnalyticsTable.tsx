import { useState, useMemo, memo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Download } from 'lucide-react';
import type { ProcessedRecord } from '@/hooks/useDataProcessor';

interface Props {
  data: ProcessedRecord[];
}

const COLUMNS: { key: keyof ProcessedRecord; label: string }[] = [
  { key: 'oppId', label: 'ID Op.' },
  { key: 'conta', label: 'Conta' },
  { key: 'representante', label: 'Representante' },
  { key: 'responsavel', label: 'Responsável' },
  { key: 'usuarioAcao', label: 'Usuário Ação' },
  { key: 'etapa', label: 'Etapa' },
  { key: 'probabilidade', label: 'Prob.' },
  { key: 'mesFech', label: 'Mês Fech.' },
  { key: 'anoPrevisao', label: 'Ano' },
  { key: 'valorPrevisto', label: 'Valor Previsto' },
  { key: 'qtdAcoes', label: 'Ações' },
  { key: 'tipoOportunidade', label: 'Tipo' },
  { key: 'origemOportunidade', label: 'Origem' },
];

const PAGE_SIZE = 100;

function AnalyticsTableInner({ data }: Props) {
  const [sortKey, setSortKey] = useState<keyof ProcessedRecord | ''>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!search) return data;
    const term = search.toLowerCase();
    return data.filter((r: ProcessedRecord) =>
      r.conta.toLowerCase().includes(term) ||
      r.representante.toLowerCase().includes(term) ||
      r.responsavel.toLowerCase().includes(term) ||
      r.usuarioAcao.toLowerCase().includes(term) ||
      r.oppId.toLowerCase().includes(term) ||
      r.etapa.toLowerCase().includes(term)
    );
  }, [data, search]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a: ProcessedRecord, b: ProcessedRecord) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const sa = (av || '').toString();
      const sb = (bv || '').toString();
      return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
  }, [filtered, sortKey, sortDir]);

  const paged = useMemo(() => {
    const start = page * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, page]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

  const handleSort = (key: keyof ProcessedRecord) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const exportCSV = () => {
    const headers = COLUMNS.map(c => c.label).join(';');
    const rows = sorted.map((r: ProcessedRecord) =>
      COLUMNS.map(c => {
        const v = r[c.key];
        return typeof v === 'number' ? v.toString() : `"${(v || '').toString().replace(/"/g, '""')}"`;
      }).join(';')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pipeline_analytics_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (v: number) =>
    v > 0 ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '-';

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Tabela Analítica
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {sorted.length.toLocaleString('pt-BR')} registros {search ? '(filtrados)' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Buscar..."
              className="pl-8 pr-3 py-1.5 text-xs bg-secondary/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-48"
            />
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
          >
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    ) : (
                      <ArrowUpDown size={12} className="opacity-30" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((r: ProcessedRecord, i: number) => (
              <tr
                key={`${r.oppId}-${r.usuarioAcao}-${i}`}
                className="border-b border-border/50 hover:bg-secondary/20 transition-colors"
              >
                <td className="px-3 py-2 font-mono text-primary">{r.oppId}</td>
                <td className="px-3 py-2 truncate max-w-[200px]">{r.conta}</td>
                <td className="px-3 py-2 truncate">{r.representante}</td>
                <td className="px-3 py-2 truncate">{r.responsavel}</td>
                <td className="px-3 py-2 truncate">{r.usuarioAcao}</td>
                <td className="px-3 py-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                    r.etapa.includes('Ganha') ? 'bg-emerald-500/15 text-emerald-400' :
                    r.etapa.includes('Perdida') ? 'bg-red-500/15 text-red-400' :
                    r.etapa.includes('Proposta') ? 'bg-amber-500/15 text-amber-400' :
                    r.etapa.includes('Negociação') ? 'bg-blue-500/15 text-blue-400' :
                    'bg-secondary text-muted-foreground'
                  }`}>
                    {r.etapa}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono">{r.probabilidade}</td>
                <td className="px-3 py-2">{r.mesFech}</td>
                <td className="px-3 py-2 font-mono">{r.anoPrevisao}</td>
                <td className="px-3 py-2 font-mono text-right">{formatCurrency(r.valorPrevisto)}</td>
                <td className="px-3 py-2 font-mono text-center">{r.qtdAcoes}</td>
                <td className="px-3 py-2 truncate max-w-[200px]">{r.tipoOportunidade}</td>
                <td className="px-3 py-2 truncate max-w-[200px]">{r.origemOportunidade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="p-3 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Página {page + 1} de {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-xs rounded bg-secondary/50 text-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 text-xs rounded bg-secondary/50 text-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export const AnalyticsTable = memo(AnalyticsTableInner);
