import { useMemo, memo } from 'react';
import type { ProcessedRecord } from '@/hooks/useDataProcessor';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts';

const COLORS = [
  '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa',
  '#fb923c', '#38bdf8', '#4ade80', '#facc15', '#f472b6',
];

const formatCurrency = (v: number) => {
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}K`;
  return `R$ ${v.toFixed(0)}`;
};

const formatNum = (v: number) => v.toLocaleString('pt-BR');

interface Props {
  data: ProcessedRecord[];
  funnelData: { etapa: string; count: number; value: number }[];
  motivosPerda: { motivo: string; count: number }[];
}

function ChartsSectionInner({ data, funnelData, motivosPerda }: Props) {
  const pipelineByStage = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    const seen = new Set<string>();
    for (const r of data) {
      if (r.etapa === 'Fechada e Ganha' || r.etapa === 'Fechada e Ganha TR' || r.etapa === 'Fechada e Perdida') continue;
      if (seen.has(r.oppId)) continue;
      seen.add(r.oppId);
      const e = map.get(r.etapa) || { count: 0, value: 0 };
      e.count++;
      e.value += r.valorPrevisto;
      map.set(r.etapa, e);
    }
    return Array.from(map.entries())
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const probDistribution = useMemo(() => {
    const map = new Map<string, number>();
    const seen = new Set<string>();
    for (const r of data) {
      if (!r.probabilidade || seen.has(r.oppId)) continue;
      seen.add(r.oppId);
      map.set(r.probabilidade, (map.get(r.probabilidade) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => parseInt(a.name) - parseInt(b.name));
  }, [data]);

  const monthlyTimeline = useMemo(() => {
    const map = new Map<string, { previsto: number; fechado: number }>();
    const seen = new Set<string>();
    for (const r of data) {
      if (!r.anoPrevisao || !r.mesPrevisao || r.mesPrevisao === '0') continue;
      if (seen.has(r.oppId)) continue;
      seen.add(r.oppId);
      const key = `${r.anoPrevisao}-${r.mesPrevisao.padStart(2, '0')}`;
      const e = map.get(key) || { previsto: 0, fechado: 0 };
      e.previsto += r.valorPrevisto;
      e.fechado += r.valorFechado;
      map.set(key, e);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-24)
      .map(([key, d]) => {
        const [y, m] = key.split('-');
        return { name: `${m}/${y.slice(2)}`, ...d };
      });
  }, [data]);

  const topReps = useMemo(() => {
    const map = new Map<string, { ganhas: number; perdidas: number; valor: number }>();
    const seen = new Set<string>();
    for (const r of data) {
      if (!r.representante || seen.has(r.oppId)) continue;
      seen.add(r.oppId);
      const e = map.get(r.representante) || { ganhas: 0, perdidas: 0, valor: 0 };
      if (r.etapa === 'Fechada e Ganha' || r.etapa === 'Fechada e Ganha TR') e.ganhas++;
      else if (r.etapa === 'Fechada e Perdida') e.perdidas++;
      e.valor += r.valorPrevisto;
      map.set(r.representante, e);
    }
    return Array.from(map.entries())
      .map(([name, d]) => ({
        name: name.length > 18 ? name.slice(0, 18) + '…' : name,
        ...d,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);
  }, [data]);

  const lossReasons = useMemo(() => {
    return motivosPerda.map(m => ({
      name: m.motivo.length > 40 ? m.motivo.slice(0, 40) + '…' : m.motivo,
      value: m.count,
      fullName: m.motivo,
    }));
  }, [motivosPerda]);

  const tooltipStyle = {
    contentStyle: {
      background: 'rgba(23, 25, 35, 0.95)',
      border: '1px solid rgba(100, 116, 139, 0.3)',
      borderRadius: '8px',
      fontSize: '12px',
      color: '#e2e8f0',
    },
  };

  if (!data.length) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Pipeline por Etapa (Abertas)
          </h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineByStage} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" tickFormatter={formatCurrency} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [formatCurrency(v), 'Valor']} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {pipelineByStage.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Distribuição por Probabilidade
          </h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={probDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={2} dataKey="value">
                  {probDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={(v: number) => [formatNum(v), 'Ops.']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {probDistribution.slice(0, 8).map((item, i) => (
              <span key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                {item.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Valor Previsto vs Fechado por Mês
          </h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTimeline} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tickFormatter={formatCurrency} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [formatCurrency(v)]} />
                <Line type="monotone" dataKey="previsto" stroke="#60a5fa" strokeWidth={2} dot={false} name="Previsto" />
                <Line type="monotone" dataKey="fechado" stroke="#34d399" strokeWidth={2} dot={false} name="Fechado" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Top 10 Representantes (Ganhas vs Perdidas)
          </h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topReps} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="ganhas" fill="#34d399" stackId="a" name="Ganhas" />
                <Bar dataKey="perdidas" fill="#f87171" stackId="a" radius={[0, 4, 4, 0]} name="Perdidas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {lossReasons.length > 0 && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Top 10 Motivos de Perda
          </h3>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lossReasons} layout="vertical" margin={{ left: 20, right: 30 }}>
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={280} tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v: number) => [formatNum(v), 'Ocorrências']}
                  labelFormatter={(label: string) => {
                    const item = lossReasons.find(l => l.name === label);
                    return item?.fullName || label;
                  }}
                />
                <Bar dataKey="value" fill="#f87171" radius={[0, 4, 4, 0]}>
                  {lossReasons.map((_, i) => (
                    <Cell key={i} fill={`rgba(248, 113, 113, ${1 - i * 0.08})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export const ChartsSection = memo(ChartsSectionInner);
