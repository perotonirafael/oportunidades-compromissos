import { useMemo } from 'react';
import type { ProcessedRecord, Action } from '@/hooks/useDataProcessor';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import { TrendingUp, DollarSign, AlertCircle, Zap, BarChart3 } from 'lucide-react';
import {
  CHART_COLORS,
  CHART_THEME,
  StandardChartTooltip,
  axisStyle,
  chartTooltipStyle,
  formatChartCount,
  formatChartCurrency,
  formatChartPercent,
} from '@/components/charts/chartTheme';

const COLORS = CHART_COLORS.categorical;
const FUNNEL_COLORS = CHART_COLORS.progression;

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
    <p className={CHART_THEME.footerClassName}>
      Período dos filtros aplicados: {range}
    </p>
  );
}

interface Props {
  data: ProcessedRecord[];
  actions: Action[];
}

export function ETNComparativeAnalysis({ data, actions }: Props) {
  // 1. Matriz de Performance ETN (Taxa de Conversão, Valor Médio, Ciclo, Agendas/Op)
  const performanceMatrix = useMemo(() => {
    const etnMap = new Map<string, {
      total: number;
      won: number;
      wonValue: number;
      lostValue: number;
      totalValue: number;
      agendas: number;
      daysInStage: number[];
    }>();

    // Processar oportunidades
    for (const r of data) {
      if (!etnMap.has(r.etn)) {
        etnMap.set(r.etn, { total: 0, won: 0, wonValue: 0, lostValue: 0, totalValue: 0, agendas: 0, daysInStage: [] });
      }
      const stats = etnMap.get(r.etn)!;
      stats.total++;
      stats.totalValue += (r.valorUnificado ?? r.valorPrevisto);
      if (r.etapa === 'Fechada e Ganha' || r.etapa === 'Fechada e Ganha TR') {
        stats.won++;
        stats.wonValue += (r.valorUnificado ?? r.valorFechado);
      } else if (r.etapa === 'Fechada e Perdida') {
        stats.lostValue += (r.valorUnificado ?? r.valorPrevisto);
      }
      stats.agendas += r.agenda;
    }

    // Processar ações para contar agendas por ETN
    const agendasByETN = new Map<string, number>();
    for (const a of actions) {
      const etn = (a['Usuário'] || a['Usuario'] || '').trim();
      agendasByETN.set(etn, (agendasByETN.get(etn) || 0) + 1);
    }

    return Array.from(etnMap.entries())
      .map(([etn, stats]) => ({
        etn,
        total: stats.total,
        won: stats.won,
        winRate: stats.total > 0 ? ((stats.won / stats.total) * 100).toFixed(1) : '0',
        wonValue: stats.wonValue,
        lostValue: stats.lostValue,
        avgValue: stats.total > 0 ? (stats.totalValue / stats.total).toFixed(0) : '0',
        agendas: agendasByETN.get(etn) || 0,
        agendaPerOp: stats.total > 0 ? ((agendasByETN.get(etn) || 0) / stats.total).toFixed(2) : '0',
        valuePerAgenda: (agendasByETN.get(etn) || 0) > 0 
          ? (stats.wonValue / (agendasByETN.get(etn) || 1)).toFixed(0) 
          : '0',
      }))
      .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate));
  }, [data, actions]);

  // 2. Evolução de Compromissos Individual por ETN (respeitando filtros)
  const commitmentEvolution = useMemo(() => {
    const etnMonthlyMap = new Map<string, Map<string, number>>();

    for (const a of actions) {
      const etn = (a['Usuário'] || a['Usuario'] || '').trim();
      const date = (a['Data'] || '').trim();
      if (!date) continue;

      const [day, month, year] = date.split('/');
      const key = `${month}/${year}`;

      // Verificar se a ação está dentro dos dados filtrados
      const oppId = (a['Oportunidade ID'] || '').trim();
      const oppInData = data.some(r => r.oppId === oppId);
      if (!oppInData) continue;

      if (!etnMonthlyMap.has(etn)) {
        etnMonthlyMap.set(etn, new Map());
      }
      const monthMap = etnMonthlyMap.get(etn)!;
      monthMap.set(key, (monthMap.get(key) || 0) + 1);
    }

    // Converter para formato de gráfico (por ETN)
    const etnChartData: any[] = [];
    const allMonths = new Set<string>();
    etnMonthlyMap.forEach((monthMap) => {
      monthMap.forEach((_, month) => {
        allMonths.add(month);
      });
    });

    const sortedMonths = Array.from(allMonths).sort((a, b) => {
      const [mA, yA] = a.split('/').map(Number);
      const [mB, yB] = b.split('/').map(Number);
      return yA === yB ? mA - mB : yA - yB;
    });

    etnMonthlyMap.forEach((monthMap, etn) => {
      const etnData: any = { etn };
      for (const month of sortedMonths) {
        etnData[month] = monthMap.get(month) || 0;
      }
      etnChartData.push(etnData);
    });

    return { chartData: etnChartData, months: sortedMonths };
  }, [data, actions]);

  // 3. Valor Total Ganho por ETN
  const valueWonByETN = useMemo(() => {
    const etnMap = new Map<string, number>();
    for (const r of data) {
      if (r.etapa === 'Fechada e Ganha' || r.etapa === 'Fechada e Ganha TR') {
        etnMap.set(r.etn, (etnMap.get(r.etn) || 0) + (r.valorUnificado ?? r.valorFechado));
      }
    }
    const result: any[] = [];
    etnMap.forEach((value, etn) => {
      result.push({ etn, value });
    });
    return result.sort((a, b) => b.value - a.value);
  }, [data]);

  // 4. Valor Total Perdido por ETN
  const valueLostByETN = useMemo(() => {
    const etnMap = new Map<string, number>();
    for (const r of data) {
      if (r.etapa === 'Fechada e Perdida') {
        etnMap.set(r.etn, (etnMap.get(r.etn) || 0) + (r.valorUnificado ?? r.valorPrevisto));
      }
    }
    const result: any[] = [];
    etnMap.forEach((value, etn) => {
      result.push({ etn, value });
    });
    return result.sort((a, b) => b.value - a.value);
  }, [data]);

  // 5. Valor em Risco (pipeline aberto) por ETN
  const valueAtRiskByETN = useMemo(() => {
    const etnMap = new Map<string, number>();
    for (const r of data) {
      if (r.etapa !== 'Fechada e Ganha' && r.etapa !== 'Fechada e Ganha TR' && r.etapa !== 'Fechada e Perdida') {
        etnMap.set(r.etn, (etnMap.get(r.etn) || 0) + (r.valorUnificado ?? r.valorPrevisto));
      }
    }
    const result: any[] = [];
    etnMap.forEach((value, etn) => {
      result.push({ etn, value });
    });
    return result.sort((a, b) => b.value - a.value);
  }, [data]);

  // 6. Valor por Etapa (Funil)
  const valueByStage = useMemo(() => {
    const stageMap = new Map<string, { value: number; count: number }>();
    const stages = ['Prospecção', 'Qualificação', 'Negociação', 'Fechada e Ganha', 'Fechada e Perdida'];

    for (const stage of stages) {
      stageMap.set(stage, { value: 0, count: 0 });
    }

    for (const r of data) {
      const stage = r.etapa;
      if (stageMap.has(stage)) {
        const s = stageMap.get(stage)!;
        s.value += (r.valorUnificado ?? (r.etapa === 'Fechada e Ganha' || r.etapa === 'Fechada e Ganha TR' ? r.valorFechado : r.valorPrevisto));
        s.count++;
      }
    }

    return Array.from(stageMap.entries())
      .map(([stage, { value, count }]) => ({
        name: stage,
        value,
        count,
        fill: FUNNEL_COLORS[stages.indexOf(stage)],
      }));
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Seção 1: Matriz de Performance */}
      <div className={CHART_THEME.cardClassName}>
        <h3 className="text-sm md:text-base font-bold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Matriz de Performance - ETNs
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">ETN</th>
                <th className="px-4 py-2 text-right font-semibold">Total Oport.</th>
                <th className="px-4 py-2 text-right font-semibold">Ganhas</th>
                <th className="px-4 py-2 text-right font-semibold">Taxa de Conversão</th>
                <th className="px-4 py-2 text-right font-semibold">Valor Ganho</th>
                <th className="px-4 py-2 text-right font-semibold">Valor Perdido</th>
                <th className="px-4 py-2 text-right font-semibold">Valor Médio/Op</th>
                <th className="px-4 py-2 text-right font-semibold">Total Agendas</th>
                <th className="px-4 py-2 text-right font-semibold">Agenda/Op</th>
                <th className="px-4 py-2 text-right font-semibold">Valor/Agenda</th>
              </tr>
            </thead>
            <tbody>
              {performanceMatrix.map((row, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{row.etn}</td>
                  <td className="px-4 py-2 text-right">{row.total}</td>
                  <td className="px-4 py-2 text-right text-green-600 font-semibold">{row.won}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      parseFloat(row.winRate) >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {row.winRate}%
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-green-600">{formatChartCurrency(row.wonValue)}</td>
                  <td className="px-4 py-2 text-right text-red-600">{formatChartCurrency(row.lostValue)}</td>
                  <td className="px-4 py-2 text-right">{formatChartCurrency(parseFloat(row.avgValue))}</td>
                  <td className="px-4 py-2 text-right">{row.agendas}</td>
                  <td className="px-4 py-2 text-right">{row.agendaPerOp}</td>
                  <td className="px-4 py-2 text-right font-semibold">{formatChartCurrency(parseFloat(row.valuePerAgenda))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DateRangeFooter data={data} />
      </div>

      {/* Seção 2: Evolução de Compromissos por ETN */}
      <div className={CHART_THEME.cardClassName}>
        <h3 className="text-sm md:text-base font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Evolução de Compromissos Realizados por ETN
        </h3>
        {commitmentEvolution.chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={commitmentEvolution.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="etn" />
                <YAxis />
                <Tooltip {...chartTooltipStyle} />
                <Legend />
                {commitmentEvolution.months.map((month, idx) => (
                  <Line
                    key={month}
                    type="monotone"
                    dataKey={month}
                    stroke={COLORS[idx % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <DateRangeFooter data={data} />
          </>
        ) : (
          <p className="text-gray-500 text-center py-8">Sem dados de compromissos</p>
        )}
      </div>

      {/* Seção 3: Valor Ganho, Perdido e Risco */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Valor Ganho */}
        <div className={CHART_THEME.cardClassName}>
          <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-green-600">
            <DollarSign className="w-4 h-4" />
            Valor Total Ganho
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={valueWonByETN.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 40 }}>
              <XAxis type="number" tickFormatter={formatChartCurrency} tick={axisStyle.xTick} axisLine={axisStyle.axisLine} />
              <YAxis type="category" dataKey="etn" width={CHART_THEME.horizontalLabelWidth} tick={axisStyle.yTick} axisLine={axisStyle.axisLine} />
              <Tooltip {...chartTooltipStyle} formatter={(v: any) => formatChartCurrency(typeof v === 'number' ? v : 0)} />
              <Bar dataKey="value" barSize={CHART_THEME.horizontalBarSize} radius={CHART_THEME.barRadius} fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
          <DateRangeFooter data={data} />
        </div>

        {/* Valor Perdido */}
        <div className={CHART_THEME.cardClassName}>
          <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            Valor Total Perdido
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={valueLostByETN.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 40 }}>
              <XAxis type="number" tickFormatter={formatChartCurrency} tick={axisStyle.xTick} axisLine={axisStyle.axisLine} />
              <YAxis type="category" dataKey="etn" width={CHART_THEME.horizontalLabelWidth} tick={axisStyle.yTick} axisLine={axisStyle.axisLine} />
              <Tooltip {...chartTooltipStyle} formatter={(v: any) => formatChartCurrency(typeof v === 'number' ? v : 0)} />
              <Bar dataKey="value" barSize={CHART_THEME.horizontalBarSize} radius={CHART_THEME.barRadius} fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
          <DateRangeFooter data={data} />
        </div>

        {/* Valor em Risco */}
        <div className={CHART_THEME.cardClassName}>
          <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-orange-600">
            <Zap className="w-4 h-4" />
            Valor em Risco (Pipeline)
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={valueAtRiskByETN.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 40 }}>
              <XAxis type="number" tickFormatter={formatChartCurrency} tick={axisStyle.xTick} axisLine={axisStyle.axisLine} />
              <YAxis type="category" dataKey="etn" width={CHART_THEME.horizontalLabelWidth} tick={axisStyle.yTick} axisLine={axisStyle.axisLine} />
              <Tooltip {...chartTooltipStyle} formatter={(v: any) => formatChartCurrency(typeof v === 'number' ? v : 0)} />
              <Bar dataKey="value" barSize={CHART_THEME.horizontalBarSize} radius={CHART_THEME.barRadius} fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
          <DateRangeFooter data={data} />
        </div>
      </div>

      {/* Seção 4: Funil de Valor por Etapa */}
      <div className={CHART_THEME.cardClassName}>
        <h3 className="text-sm md:text-base font-bold mb-4">Funil de Valor por Etapa</h3>
        <div className="space-y-2">
          {valueByStage.map((stage, idx) => {
            const maxValue = valueByStage[0]?.value || 1;
            const widthPct = Math.max(35, (stage.value / maxValue) * 100);
            return (
              <div key={stage.name} className="group">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <div
                    className="flex min-w-[230px] items-center justify-between rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
                    style={{ width: `${widthPct}%`, background: FUNNEL_COLORS[idx % FUNNEL_COLORS.length] }}
                  >
                    <span className="truncate pr-2">{stage.name}</span>
                    <span className="shrink-0">{formatChartCurrency(stage.value)}</span>
                  </div>
                  <div className="text-xs text-gray-600">{formatChartCount(stage.count, 'ops')}</div>
                </div>
                <div className="pointer-events-none absolute hidden" />
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {valueByStage.map((stage, idx) => (
            <div key={stage.name} className="flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-1 text-[11px]">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: FUNNEL_COLORS[idx % FUNNEL_COLORS.length] }} />
              <span className="text-gray-700">{stage.name}</span>
            </div>
          ))}
        </div>
        <DateRangeFooter data={data} />
      </div>
    </div>
  );
}