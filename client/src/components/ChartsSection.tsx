import { useMemo, memo } from 'react';
import type { ProcessedRecord } from '@/hooks/useDataProcessor';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line, CartesianGrid, Legend, LabelList,
} from 'recharts';

const COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
];

const FUNNEL_COLORS = [
  '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b',
  '#f97316', '#ef4444', '#dc2626', '#b91c1c', '#991b1b',
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
  forecastFunnel: { etapa: string; count: number; value: number; avgProb: number }[];
  etnTop10: { name: string; fullName: string; count: number; value: number }[];
  onChartClick: (field: string, value: string) => void;
  onETNClick?: (etn: string) => void;
}

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

// Componente de rodapé com intervalo de datas (Item 9)
function DateRangeFooter({ data }: { data: ProcessedRecord[] }) {
  const range = useMemo(() => {
    let minYM = Infinity, maxYM = 0;
    let minLabel = '', maxLabel = '';
    const mNames = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    for (const r of data) {
      if (!r.anoPrevisao || !r.mesPrevisaoNum) continue;
      const y = parseInt(r.anoPrevisao);
      const m = r.mesPrevisaoNum;
      const ym = y * 100 + m;
      if (ym < minYM) { minYM = ym; minLabel = `${mNames[m]}/${y}`; }
      if (ym > maxYM) { maxYM = ym; maxLabel = `${mNames[m]}/${y}`; }
    }
    if (minYM === Infinity) return 'Sem dados de período';
    return `${minLabel} — ${maxLabel}`;
  }, [data]);

  return (
    <p className="text-[10px] text-gray-400 text-center mt-2 pt-1 border-t border-gray-100">
      Período dos filtros aplicados: {range}
    </p>
  );
}

function ChartsSectionInner({ data, funnelData, motivosPerda, forecastFunnel, etnTop10, onChartClick, onETNClick }: Props) {
  // Pipeline por Etapa (abertas)
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

  // Timeline mensal
  const monthlyTimeline = useMemo(() => {
    const map = new Map<string, { previsto: number; fechado: number }>();
    const seen = new Set<string>();
    for (const r of data) {
      if (!r.anoPrevisao || !r.mesPrevisaoNum || r.mesPrevisaoNum === 0) continue;
      if (seen.has(r.oppId)) continue;
      seen.add(r.oppId);
      const key = `${r.anoPrevisao}-${r.mesPrevisaoNum.toString().padStart(2, '0')}`;
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

  // Motivos de perda com rótulos
  const lossReasons = useMemo(() => {
    return motivosPerda.map(m => ({
      name: m.motivo.length > 40 ? m.motivo.slice(0, 40) + '…' : m.motivo,
      value: m.count,
      fullName: m.motivo,
    }));
  }, [motivosPerda]);

  if (!data.length) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline por Etapa (Abertas) */}
        <div className="bg-white rounded-xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-1">Pipeline por Etapa</h3>
          <p className="text-xs text-muted-foreground mb-4">Oportunidades abertas por valor (clique para filtrar)</p>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineByStage} layout="vertical" margin={{ left: 10, right: 30 }}>
                <XAxis type="number" tickFormatter={formatCurrency} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fill: '#374151', fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [formatCurrency(v), 'Valor']} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} cursor="pointer" onClick={(d: any) => onChartClick('etapa', d.name)}>
                  {pipelineByStage.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                  <LabelList dataKey="count" position="right" fill="#374151" fontSize={11} formatter={(v: number) => `${v} ops`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <DateRangeFooter data={data} />
        </div>

        {/* FUNIL DE FORECAST */}
        <div className="bg-white rounded-xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-1">FUNIL DE FORECAST</h3>
          <p className="text-xs text-muted-foreground mb-4">Oportunidades com probabilidade ≥75% por etapa, quantidade e valor (clique para filtrar)</p>
          {forecastFunnel.length > 0 ? (
            <>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={forecastFunnel} layout="vertical" margin={{ left: 10, right: 40 }}>
                    <XAxis type="number" tickFormatter={formatCurrency} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} />
                    <YAxis type="category" dataKey="etapa" width={160} tick={{ fill: '#374151', fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(v: number, name: string) => {
                        if (name === 'value') return [formatCurrency(v), 'Valor Previsto'];
                        return [v, name];
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} cursor="pointer" onClick={(d: any) => onChartClick('etapa', d.etapa)}>
                      {forecastFunnel.map((_, i) => (
                        <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                      ))}
                      <LabelList
                        dataKey="value"
                        position="right"
                        fill="#374151"
                        fontSize={10}
                        formatter={(v: number) => formatCurrency(v)}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Legenda detalhada */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {forecastFunnel.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }} />
                    <span className="text-gray-700 truncate">{item.etapa}</span>
                    <span className="ml-auto font-mono font-bold text-emerald-700">{formatCurrency(item.value)}</span>
                    <span className="font-mono text-gray-600">{item.avgProb}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
              Nenhuma oportunidade com probabilidade ≥75%
            </div>
          )}
          <DateRangeFooter data={data} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Valor Previsto vs Fechado */}
        <div className="bg-white rounded-xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-1">Valor Previsto vs Fechado</h3>
          <p className="text-xs text-muted-foreground mb-4">Evolução mensal (últimos 24 meses)</p>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTimeline} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} interval="preserveStartEnd" axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis tickFormatter={formatCurrency} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [formatCurrency(v)]} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="previsto" stroke="#f59e0b" strokeWidth={2.5} dot={false} name="Previsto" />
                <Line type="monotone" dataKey="fechado" stroke="#10b981" strokeWidth={2.5} dot={false} name="Fechado" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <DateRangeFooter data={data} />
        </div>

        {/* ETN Top 10 */}
        <div className="bg-white rounded-xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-1">ETN Top 10</h3>
          <p className="text-xs text-muted-foreground mb-4">Oportunidades e valor previsto por ETN (prob. ≥75%) - clique para ver detalhes</p>
          {etnTop10.length > 0 ? (
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={etnTop10} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <XAxis type="number" tickFormatter={formatCurrency} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fill: '#374151', fontSize: 10 }} axisLine={{ stroke: '#e5e7eb' }} />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(v: number, name: string) => {
                      if (name === 'Valor') return [formatCurrency(v), 'Valor Previsto'];
                      return [formatNum(v), name];
                    }}
                    labelFormatter={(label: string) => {
                      const item = etnTop10.find(d => d.name === label);
                      return item?.fullName || label;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="value" fill="#10b981" name="Valor" radius={[0, 6, 6, 0]} cursor="pointer" onClick={(d: any) => {
                    if (onETNClick) onETNClick(d.fullName || d.name);
                    onChartClick('etn', d.fullName || d.name);
                  }}>
                    <LabelList dataKey="value" position="right" fill="#374151" fontSize={10} formatter={(v: number) => formatCurrency(v)} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
              Nenhum ETN com oportunidades ≥75%
            </div>
          )}
          <DateRangeFooter data={data} />
        </div>
      </div>

      {/* Motivos de Perda */}
      {lossReasons.length > 0 && (
        <div className="bg-white rounded-xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-1">Top 10 Motivos de Perda</h3>
          <p className="text-xs text-muted-foreground mb-4">Principais causas de oportunidades perdidas (clique para filtrar tabela)</p>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lossReasons} layout="vertical" margin={{ left: 20, right: 50 }}>
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} allowDecimals={false} axisLine={{ stroke: '#e5e7eb' }} />
                <YAxis type="category" dataKey="name" width={280} tick={{ fill: '#374151', fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v: number) => [formatCurrency(v), 'Valor Previsto']}
                  labelFormatter={(label: string) => {
                    const item = lossReasons.find(l => l.name === label);
                    return item?.fullName || label;
                  }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} cursor="pointer" onClick={(d: any) => onChartClick('motivoPerda', d.fullName || d.name)}>
                  {lossReasons.map((_, i) => {
                    const colors = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6'];
                    return <Cell key={i} fill={colors[i % colors.length]} />;
                  })}
                  <LabelList dataKey="value" position="right" fill="#374151" fontSize={11} formatter={(v: number) => formatCurrency(v)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <DateRangeFooter data={data} />
        </div>
      )}
    </div>
  );
}

export const ChartsSection = memo(ChartsSectionInner);
