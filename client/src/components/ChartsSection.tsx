import { useMemo, memo } from 'react';
import type { ProcessedRecord } from '@/hooks/useDataProcessor';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';

// Vibrant colorful palette
const COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
];

const PIE_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
  '#84cc16', '#e11d48', '#0ea5e9', '#d946ef', '#22d3ee',
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
      background: 'rgba(255, 255, 255, 0.97)',
      border: '1px solid #e5e7eb',
      borderRadius: '10px',
      fontSize: '12px',
      color: '#1f2937',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    },
  };

  if (!data.length) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline por Etapa */}
        <div className="bg-white rounded-xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-1">
            Pipeline por Etapa
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Oportunidades abertas por valor</p>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineByStage} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" tickFormatter={formatCurrency} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fill: '#374151', fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [formatCurrency(v), 'Valor']} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {pipelineByStage.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição por Probabilidade */}
        <div className="bg-white rounded-xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-1">
            Distribuição por Probabilidade
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Oportunidades por faixa de probabilidade</p>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={probDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={110} paddingAngle={2} dataKey="value" strokeWidth={2} stroke="#fff">
                  {probDistribution.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={(v: number) => [formatNum(v), 'Ops.']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
            {probDistribution.slice(0, 10).map((item, i) => (
              <span key={i} className="flex items-center gap-1 text-xs text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                {item.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Valor Previsto vs Fechado */}
        <div className="bg-white rounded-xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-1">
            Valor Previsto vs Fechado
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Evolução mensal (últimos 24 meses)</p>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTimeline} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} interval="preserveStartEnd" axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis tickFormatter={formatCurrency} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [formatCurrency(v)]} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="previsto" stroke="#10b981" strokeWidth={2.5} dot={false} name="Previsto" />
                <Line type="monotone" dataKey="fechado" stroke="#f59e0b" strokeWidth={2.5} dot={false} name="Fechado" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 10 Representantes */}
        <div className="bg-white rounded-xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-1">
            Top 10 Representantes
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Ganhas vs Perdidas por representante</p>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topReps} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fill: '#374151', fontSize: 10 }} axisLine={{ stroke: '#e5e7eb' }} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="ganhas" fill="#10b981" stackId="a" name="Ganhas" radius={[0, 0, 0, 0]} />
                <Bar dataKey="perdidas" fill="#ef4444" stackId="a" radius={[0, 6, 6, 0]} name="Perdidas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Motivos de Perda */}
      {lossReasons.length > 0 && (
        <div className="bg-white rounded-xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-1">
            Top 10 Motivos de Perda
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Principais causas de oportunidades perdidas</p>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lossReasons} layout="vertical" margin={{ left: 20, right: 30 }}>
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} allowDecimals={false} axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis type="category" dataKey="name" width={280} tick={{ fill: '#374151', fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v: number) => [formatNum(v), 'Ocorrências']}
                  labelFormatter={(label: string) => {
                    const item = lossReasons.find(l => l.name === label);
                    return item?.fullName || label;
                  }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {lossReasons.map((_, i) => {
                    const colors = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6'];
                    return <Cell key={i} fill={colors[i % colors.length]} />;
                  })}
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
