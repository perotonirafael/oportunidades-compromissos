import React, { useMemo } from 'react';
import { X, TrendingUp, Award, Target, Calendar } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { KPICard } from './KPICard';

interface ProcessedRecord {
  oppId: string;
  conta: string;
  representante: string;
  responsavel: string;
  etn: string;
  etapa: string;
  probabilidade: string;
  mesFech: string;
  anoPrevisao: string;
  valorPrevisto: number;
  agenda: number;
  tipoOportunidade: string;
  motivoPerda?: string;
}

interface ETNDetailModalProps {
  etn: string;
  data: ProcessedRecord[];
  onClose: () => void;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

export function ETNDetailModal({ etn, data, onClose }: ETNDetailModalProps) {
  const etnData = useMemo(() => {
    return data.filter(r => r.etn === etn);
  }, [etn, data]);

  // KPIs
  const kpis = useMemo(() => {
    const totalOps = new Set(etnData.map(r => r.oppId)).size;
    const ganhas = etnData.filter(r => r.etapa === 'Fechada e Ganha').length;
    const perdidas = etnData.filter(r => r.etapa === 'Fechada e Perdida').length;
    const winRate = totalOps > 0 ? ((ganhas / (ganhas + perdidas)) * 100).toFixed(1) : '0';
    const valorTotal = etnData.reduce((sum, r) => sum + r.valorPrevisto, 0);
    const valorMedio = totalOps > 0 ? valorTotal / totalOps : 0;
    const totalAgendas = etnData.reduce((sum, r) => sum + r.agenda, 0);

    return { totalOps, ganhas, perdidas, winRate, valorTotal, valorMedio, totalAgendas };
  }, [etnData]);

  // Gráfico: Distribuição por Etapa
  const etapaDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of etnData) {
      map.set(r.etapa, (map.get(r.etapa) || 0) + 1);
    }
    return Array.from(map.entries()).map(([etapa, count]) => ({ etapa, count }));
  }, [etnData]);

  // Gráfico: Distribuição por Mês
  const monthDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of etnData) {
      const key = `${r.mesFech}/${r.anoPrevisao}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [etnData]);

  // Gráfico: Probabilidade
  const probabilityDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of etnData) {
      map.set(r.probabilidade, (map.get(r.probabilidade) || 0) + 1);
    }
    return Array.from(map.entries()).map(([prob, count]) => ({ prob, count }));
  }, [etnData]);

  // Tabela: Top 10 Oportunidades
  const topOps = useMemo(() => {
    return etnData
      .sort((a, b) => b.valorPrevisto - a.valorPrevisto)
      .slice(0, 10);
  }, [etnData]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">{etn}</h2>
            <p className="text-green-100 text-sm">Desempenho Individual</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-green-700 rounded-lg transition">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              title="Total de Oportunidades"
              value={kpis.totalOps.toString()}
              icon={<Target size={20} />}
              color="blue"
            />
            <KPICard
              title="Win Rate"
              value={`${kpis.winRate}%`}
              icon={<TrendingUp size={20} />}
              color="green"
            />
            <KPICard
              title="Oportunidades Ganhas"
              value={kpis.ganhas.toString()}
              icon={<Award size={20} />}
              color="green"
            />
            <KPICard
              title="Total de Agendas"
              value={kpis.totalAgendas.toString()}
              icon={<Calendar size={20} />}
              color="purple"
            />
          </div>

          {/* Valor Total e Médio */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-700 font-semibold">Valor Total em Oportunidades</p>
              <p className="text-2xl font-bold text-amber-900">R$ {(kpis.valorTotal / 1000000).toFixed(2)}M</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-200">
              <p className="text-sm text-indigo-700 font-semibold">Valor Médio por Oportunidade</p>
              <p className="text-2xl font-bold text-indigo-900">R$ {(kpis.valorMedio / 1000).toFixed(0)}K</p>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribuição por Etapa */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-4">Distribuição por Etapa</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={etapaDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="etapa" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Distribuição por Probabilidade */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-4">Distribuição por Probabilidade</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={probabilityDistribution} dataKey="count" nameKey="prob" cx="50%" cy="50%" outerRadius={100} label>
                    {probabilityDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Timeline Mensal */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 lg:col-span-2">
              <h3 className="font-semibold text-gray-800 mb-4">Atividade Mensal</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top 10 Oportunidades */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-4">Top 10 Oportunidades</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left">ID Op.</th>
                    <th className="px-4 py-2 text-left">Conta</th>
                    <th className="px-4 py-2 text-left">Etapa</th>
                    <th className="px-4 py-2 text-left">Prob.</th>
                    <th className="px-4 py-2 text-right">Valor Previsto</th>
                    <th className="px-4 py-2 text-center">Agendas</th>
                  </tr>
                </thead>
                <tbody>
                  {topOps.map((op, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-100">
                      <td className="px-4 py-2 font-semibold">{op.oppId}</td>
                      <td className="px-4 py-2">{op.conta}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          op.etapa === 'Fechada e Ganha' ? 'bg-green-100 text-green-800' :
                          op.etapa === 'Fechada e Perdida' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {op.etapa}
                        </span>
                      </td>
                      <td className="px-4 py-2">{op.probabilidade}</td>
                      <td className="px-4 py-2 text-right font-semibold">R$ {(op.valorPrevisto / 1000).toFixed(0)}K</td>
                      <td className="px-4 py-2 text-center">{op.agenda}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
