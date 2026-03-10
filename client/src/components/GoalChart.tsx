import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { GoalMetrics } from '@/types/goals';

interface GoalChartProps {
  metricas: GoalMetrics[];
  title?: string;
}

export const GoalChart: React.FC<GoalChartProps> = ({
  metricas,
  title = 'Atingimento de Metas',
}) => {
  if (!metricas || metricas.length === 0) {
    return (
      <div className="w-full h-80 flex items-center justify-center bg-muted/30 rounded-lg">
        <p className="text-muted-foreground">Nenhum dado de meta disponível</p>
      </div>
    );
  }

  // Preparar dados para o gráfico
  const chartData = metricas.map((m) => ({
    name: m.etn,
    'Meta (%)': 100,
    'Atingimento (%)': m.percentualAtingimento,
    'Licenças+Serviços': m.realLicencasServicos,
    'Recorrente': m.realRecorrente,
  }));

  // Função para determinar cor baseada no % de atingimento
  const getColor = (percentage: number): string => {
    if (percentage >= 100) return '#10b981'; // Green
    if (percentage >= 75) return '#f59e0b'; // Amber
    if (percentage >= 50) return '#ef4444'; // Red
    return '#dc2626'; // Dark Red
  };

  return (
    <div className="w-full space-y-4">
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={100}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            label={{ value: 'Percentual (%)', angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value) => `${typeof value === 'number' ? value.toFixed(1) : value}%`}
            labelStyle={{ color: '#000' }}
          />
          <Legend />
          <Bar dataKey="Atingimento (%)" fill="#8884d8" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getColor(entry['Atingimento (%)'])}
              />
            ))}
          </Bar>
          <Bar dataKey="Meta (%)" fill="#e5e7eb" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Tabela de detalhes */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">ETN</th>
              <th className="px-4 py-2 text-right font-semibold">Meta Lic+Srv</th>
              <th className="px-4 py-2 text-right font-semibold">Real Lic+Srv</th>
              <th className="px-4 py-2 text-right font-semibold">Meta Recorrente</th>
              <th className="px-4 py-2 text-right font-semibold">Real Recorrente</th>
              <th className="px-4 py-2 text-right font-semibold">Atingimento</th>
            </tr>
          </thead>
          <tbody>
            {metricas.map((m) => (
              <tr key={`${m.etn}-${m.periodo}`} className="border-b border-border hover:bg-muted/20">
                <td className="px-4 py-2 font-medium">{m.etn}</td>
                <td className="px-4 py-2 text-right">
                  R$ {m.metaLicencasServicos.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </td>
                <td className="px-4 py-2 text-right">
                  R$ {m.realLicencasServicos.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </td>
                <td className="px-4 py-2 text-right">
                  R$ {m.metaRecorrente.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </td>
                <td className="px-4 py-2 text-right">
                  R$ {m.realRecorrente.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </td>
                <td className="px-4 py-2 text-right font-bold">
                  <span
                    className={`px-2 py-1 rounded-full text-white text-xs font-bold ${
                      m.percentualAtingimento >= 100
                        ? 'bg-green-600'
                        : m.percentualAtingimento >= 75
                        ? 'bg-amber-600'
                        : m.percentualAtingimento >= 50
                        ? 'bg-red-600'
                        : 'bg-red-800'
                    }`}
                  >
                    {m.percentualAtingimento.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
