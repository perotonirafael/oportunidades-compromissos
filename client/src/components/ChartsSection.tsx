import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { ProcessedRecord } from '@/hooks/useDataProcessor';

interface ChartsSectionProps {
  data: ProcessedRecord[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function ChartsSection({ data }: ChartsSectionProps) {
  // Dados para gráfico de Etapa
  const stageData = data.reduce((acc, record) => {
    const stage = record['Etapa'] || 'Sem Etapa';
    const existing = acc.find(item => item.name === stage);
    if (existing) {
      existing.count += 1;
      existing.value += record['Valor Previsto'];
    } else {
      acc.push({ name: stage, count: 1, value: record['Valor Previsto'] });
    }
    return acc;
  }, [] as Array<{ name: string; count: number; value: number }>);

  // Dados para gráfico de Probabilidade
  const probabilityData = data.reduce((acc, record) => {
    const prob = record['Probabilidade'] || 'Sem Prob.';
    const existing = acc.find(item => item.name === prob);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ name: prob, count: 1 });
    }
    return acc;
  }, [] as Array<{ name: string; count: number }>);

  // Dados para gráfico de Usuários com Ações
  const userActionData = data.reduce((acc, record) => {
    const user = record['Usuário Ação'] || 'Sem Ação';
    const existing = acc.find(item => item.name === user);
    if (existing) {
      existing.actions += record['Qtd. Ações'];
      existing.count += 1;
    } else {
      acc.push({ name: user, actions: record['Qtd. Ações'], count: 1 });
    }
    return acc;
  }, [] as Array<{ name: string; actions: number; count: number }>)
    .sort((a, b) => b.actions - a.actions)
    .slice(0, 8);

  // Dados para gráfico de Valor por Mês
  const monthValueData = data.reduce((acc, record) => {
    const month = record['Mês Fech.'] || 'Sem Data';
    const year = record['Ano Previsão'] || '';
    const key = year ? `${month} ${year}` : month;
    const existing = acc.find(item => item.name === key);
    if (existing) {
      existing.value += record['Valor Previsto'];
    } else {
      acc.push({ name: key, value: record['Valor Previsto'] });
    }
    return acc;
  }, [] as Array<{ name: string; value: number }>)
    .sort((a, b) => a.name.localeCompare(b.name));

  const customTooltip = (props: any) => {
    if (!props.active || !props.payload) return null;
    return (
      <div className="bg-white p-2 border border-gray-300 rounded shadow-lg text-xs">
        <p className="font-semibold text-gray-900">{props.payload[0]?.name}</p>
        {props.payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString('pt-BR') : entry.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="mb-10">
      <h2 className="text-lg font-bold text-gray-900 mb-6 uppercase tracking-wide">
        📈 Análise Visual de Distribuições
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Oportunidades por Etapa */}
        <div className="bg-white border border-gray-300 rounded-lg p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
            Oportunidades por Etapa
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={customTooltip} />
              <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico 2: Distribuição por Probabilidade */}
        <div className="bg-white border border-gray-300 rounded-lg p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
            Distribuição por Probabilidade
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={probabilityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {probabilityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={customTooltip} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico 3: Ações por Usuário */}
        <div className="bg-white border border-gray-300 rounded-lg p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
            Ações por Usuário (Top 8)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={userActionData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
              <Tooltip content={customTooltip} />
              <Bar dataKey="actions" fill="#10b981" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico 4: Valor Previsto por Mês */}
        <div className="bg-white border border-gray-300 rounded-lg p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
            Valor Previsto por Mês
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthValueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => `R$ ${(value as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                labelFormatter={(label) => `${label}`}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: '#f59e0b', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
