import { memo, type ReactNode } from 'react';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
}

const colorMap: Record<string, { bg: string; text: string; glow: string; border: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', glow: 'glow-blue', border: 'border-blue-500/20' },
  green: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', glow: 'glow-green', border: 'border-emerald-500/20' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', glow: 'glow-amber', border: 'border-amber-500/20' },
  red: { bg: 'bg-red-500/10', text: 'text-red-400', glow: 'glow-red', border: 'border-red-500/20' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', glow: '', border: 'border-purple-500/20' },
};

function KPICardInner({ title, value, subtitle, icon, color = 'blue' }: Props) {
  const c = colorMap[color];

  return (
    <div className={`glass-card rounded-xl p-5 ${c.glow} border ${c.border} transition-all hover:scale-[1.02]`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${c.bg}`}>
          <span className={c.text}>{icon}</span>
        </div>
      </div>
      <p className="text-2xl font-bold font-mono text-foreground tracking-tight">
        {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
      </p>
      <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-medium">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

export const KPICard = memo(KPICardInner);
