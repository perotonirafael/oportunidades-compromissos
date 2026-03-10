import type { ReactNode } from 'react';

interface TooltipItem {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}

interface StandardChartTooltipProps {
  title: string;
  items: TooltipItem[];
  footer?: ReactNode;
}

export const CHART_THEME = {
  cardClassName: 'bg-white rounded-xl p-5 border border-border shadow-sm',
  titleClassName: 'text-sm md:text-base font-bold text-foreground mb-1',
  subtitleClassName: 'text-xs text-muted-foreground mb-4',
  footerClassName: 'text-[10px] text-gray-400 text-center mt-2 pt-1 border-t border-gray-100',
  horizontalChartHeight: 320,
  horizontalBarGap: 10,
  horizontalBarSize: 28,
  horizontalLabelWidth: 190,
  barRadius: [0, 10, 10, 0] as [number, number, number, number],
};

export const CHART_COLORS = {
  progression: ['#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444', '#dc2626', '#b91c1c', '#991b1b'],
  categorical: ['#10b981', '#3b82f6', '#0ea5e9', '#14b8a6', '#22c55e', '#84cc16', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6'],
};

export const chartTooltipStyle = {
  contentStyle: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    fontSize: '12px',
    color: '#1f2937',
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
    padding: '0',
  },
  cursor: { fill: 'rgba(148, 163, 184, 0.16)' },
};

export const axisStyle = {
  xTick: { fill: '#6b7280', fontSize: 11 },
  yTick: { fill: '#374151', fontSize: 11 },
  axisLine: { stroke: '#e5e7eb' },
};

export const formatChartCurrency = (v: number) => {
  if (!Number.isFinite(v)) return 'R$ 0';
  if (Math.abs(v) >= 1e9) return `R$ ${(v / 1e9).toFixed(1)}B`;
  if (Math.abs(v) >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}K`;
  return `R$ ${v.toFixed(0)}`;
};

export const formatChartCount = (v: number, label = 'oportunidades') => `${Math.round(v).toLocaleString('pt-BR')} ${label}`;

export const formatChartPercent = (v: number) => `${Math.round(v)}%`;

export function StandardChartTooltip({ title, items, footer }: StandardChartTooltipProps) {
  return (
    <div className="min-w-[240px] max-w-[320px] rounded-2xl bg-white px-3 py-3 text-xs text-gray-700 shadow-xl">
      <p className="mb-1 text-sm font-bold text-gray-900">{title}</p>
      <div className="space-y-1.5">
        {items.map((item, idx) => (
          <p key={`${item.label}-${idx}`} className="leading-snug text-gray-600">
            {item.label}: <span className={item.valueClassName ?? 'font-semibold text-gray-900'}>{item.value}</span>
          </p>
        ))}
      </div>
      {footer ? <div className="mt-2 border-t border-gray-100 pt-2 text-gray-600">{footer}</div> : null}
    </div>
  );
}
