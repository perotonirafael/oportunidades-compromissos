import { ReactNode } from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  color?: 'blue' | 'green' | 'red' | 'gray';
}

const colorClasses = {
  blue: 'border-l-blue-500 bg-blue-50',
  green: 'border-l-green-500 bg-green-50',
  red: 'border-l-red-500 bg-red-50',
  gray: 'border-l-gray-500 bg-gray-50'
};

const iconColorClasses = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  red: 'text-red-600',
  gray: 'text-gray-600'
};

export function KPICard({
  title,
  value,
  icon,
  description,
  color = 'gray'
}: KPICardProps) {
  return (
    <div className={`border-l-2 rounded p-4 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
            {title}
          </p>
          <p className="font-mono text-2xl font-bold text-gray-900">
            {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
          </p>
          {description && (
            <p className="text-xs text-gray-600 mt-1">{description}</p>
          )}
        </div>
        <div className={`${iconColorClasses[color]} mt-1`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
