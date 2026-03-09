import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { MissingAgendaRecord } from '@/hooks/useDataProcessor';

interface MissingAgendaChartProps {
  data: MissingAgendaRecord[];
  onBarClick: (etn: string) => void;
  selectedETN: string[];
}

export function MissingAgendaChart({ data, onBarClick, selectedETN }: MissingAgendaChartProps) {
  const chartData = useMemo(() => {
    const filtered = selectedETN.length > 0 ? data.filter(r => selectedETN.includes(r.etn)) : data;
    const map = new Map<string, number>();
    for (const r of filtered) {
      map.set(r.etn, (map.get(r.etn) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name: name.length > 20 ? `${name.slice(0, 20)}…` : name, count, fullName: name }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [data, selectedETN]);

  const colors = ['#f59e0b', '#f97316', '#ef4444', '#ec4899', '#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6', '#10b981', '#84cc16', '#eab308', '#d946ef', '#0ea5e9', '#22d3ee'];

  return (
    <div style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
          <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} allowDecimals={false} axisLine={{ stroke: '#e5e7eb' }} />
          <YAxis type="category" dataKey="name" width={160} tick={{ fill: '#374151', fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} />
          <Tooltip
            contentStyle={{ background: 'rgba(255,255,255,0.97)', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '12px', color: '#1f2937', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
            formatter={(v: number) => [v, 'Oportunidades sem agenda']}
            labelFormatter={(label: string) => {
              const item = chartData.find(d => d.name === label);
              return item?.fullName || label;
            }}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} onClick={(row: any) => onBarClick(row.fullName)}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} style={{ cursor: 'pointer' }} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
