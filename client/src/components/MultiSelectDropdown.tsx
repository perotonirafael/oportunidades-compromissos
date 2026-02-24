import { useState, useRef, useEffect, memo } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';

interface Props {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

function MultiSelectDropdownInner({ label, options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = search
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);
  };

  return (
    <div ref={ref} className="relative w-[140px] flex-shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg border border-border bg-secondary/50 hover:bg-secondary transition-colors text-foreground"
      >
        <span className="truncate">
          {selected.length > 0 ? (
            <span className="flex items-center gap-1">
              <span className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded font-mono font-medium">
                {selected.length}
              </span>
              <span className="text-muted-foreground text-xs">{label}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{label}</span>
          )}
        </span>
        <ChevronDown size={14} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-[240px] bg-card border border-border rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-secondary/50 border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
          </div>

          {selected.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="w-full px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 flex items-center gap-1 transition-colors"
            >
              <X size={12} /> Limpar seleção
            </button>
          )}

          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">Nenhum resultado</p>
            ) : (
              filtered.map(opt => (
                <label
                  key={opt}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent/50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(opt)}
                    onChange={() => toggle(opt)}
                    className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <span className="text-xs text-foreground truncate">{opt}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const MultiSelectDropdown = memo(MultiSelectDropdownInner);
