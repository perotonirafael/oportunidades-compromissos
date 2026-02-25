import React, { useMemo, useState, useCallback } from 'react';
import { X, TrendingUp, Award, Target, Calendar, Trophy, XCircle, DollarSign, Search, Filter } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { KPICard } from './KPICard';

interface ProcessedRecord {
  oppId: string;
  conta: string;
  contaId: string;
  representante: string;
  responsavel: string;
  etn: string;
  etapa: string;
  probabilidade: string;
  probNum: number;
  anoPrevisao: string;
  mesPrevisao: string;
  mesPrevisaoNum: number;
  mesFech: string;
  valorPrevisto: number;
  valorFechado: number;
  agenda: number;
  tipoOportunidade: string;
  subtipoOportunidade: string;
  origemOportunidade: string;
  motivoFechamento: string;
  motivoPerda: string;
  concorrentes: string;
  cidade: string;
  estado: string;
  cnaeSegmento: string;
  categoriaCompromisso: string;
  atividadeCompromisso: string;
}

interface ETNDetailModalProps {
  etn: string;
  data: ProcessedRecord[];
  onClose: () => void;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

const formatCurrency = (v: number) => {
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}K`;
  return `R$ ${v.toFixed(0)}`;
};

const MONTH_ORDER = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export function ETNDetailModal({ etn, data, onClose }: ETNDetailModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEtapa, setFilterEtapa] = useState('');
  const [filterProb, setFilterProb] = useState('');
  const [activeKPIFilter, setActiveKPIFilter] = useState<string | null>(null);

  const etnData = useMemo(() => {
    return data.filter(r => r.etn === etn);
  }, [etn, data]);

  // KPIs (Item 6: incluir ganhas/perdidas com valores)
  const kpis = useMemo(() => {
    const oppMap = new Map<string, ProcessedRecord>();
    for (const r of etnData) {
      if (!oppMap.has(r.oppId)) oppMap.set(r.oppId, r);
    }
    const uniqueOps = Array.from(oppMap.values());
    const totalOps = uniqueOps.length;
    const ganhasOps = uniqueOps.filter(r => r.etapa === 'Fechada e Ganha' || r.etapa === 'Fechada e Ganha TR');
    const perdidasOps = uniqueOps.filter(r => r.etapa === 'Fechada e Perdida');
    const ganhas = ganhasOps.length;
    const perdidas = perdidasOps.length;
    const ganhasValor = ganhasOps.reduce((sum, r) => sum + r.valorFechado, 0); // Item 4: Usar Valor Fechado
    const perdidasValor = perdidasOps.reduce((sum, r) => sum + r.valorPrevisto, 0);
    const winRate = ganhas + perdidas > 0 ? ((ganhas / (ganhas + perdidas)) * 100).toFixed(1) : '0';
    const valorTotal = uniqueOps.reduce((sum, r) => sum + r.valorPrevisto, 0);
    const valorMedio = totalOps > 0 ? valorTotal / totalOps : 0;
    const totalAgendas = etnData.reduce((sum, r) => sum + r.agenda, 0);

    return { totalOps, ganhas, perdidas, ganhasValor, perdidasValor, winRate, valorTotal, valorMedio, totalAgendas };
  }, [etnData]);

  // Gráfico: Distribuição por Etapa
  const etapaDistribution = useMemo(() => {
    const map = new Map<string, number>();
    const seen = new Set<string>();
    for (const r of etnData) {
      if (seen.has(r.oppId)) continue;
      seen.add(r.oppId);
      map.set(r.etapa, (map.get(r.etapa) || 0) + 1);
    }
    return Array.from(map.entries()).map(([etapa, count]) => ({ etapa, count }));
  }, [etnData]);

  // Item 5: Quantidade de Agendas Realizadas (substituir gráfico de probabilidade)
  const agendasRealizadas = useMemo(() => {
    const map = new Map<string, number>();
    const seen = new Set<string>();
    for (const r of etnData) {
      if (seen.has(r.oppId)) continue;
      seen.add(r.oppId);
      if (r.agenda > 0) {
        const range = r.agenda === 1 ? '1' : r.agenda === 2 ? '2' : r.agenda <= 5 ? '3-5' : r.agenda <= 10 ? '6-10' : '10+';
        map.set(range, (map.get(range) || 0) + 1);
      }
    }
    const order = ['1', '2', '3-5', '6-10', '10+'];
    return order.filter(k => map.has(k)).map(range => ({ range, count: map.get(range) || 0 }));
  }, [etnData]);

  // Item 5: Linha do tempo de compromissos (evolução)
  const compromissosTimeline = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of etnData) {
      if (!r.anoPrevisao || !r.mesPrevisao) continue;
      const key = `${r.anoPrevisao}-${r.mesPrevisao}`;
      map.set(key, (map.get(key) || 0) + r.agenda);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => {
        const [aY, aM] = a.split('-');
        const [bY, bM] = b.split('-');
        if (aY !== bY) return aY.localeCompare(bY);
        return MONTH_ORDER.indexOf(aM) - MONTH_ORDER.indexOf(bM);
      })
      .map(([key, agendas]) => {
        const [year, month] = key.split('-');
        const shortMonth = month.slice(0, 3);
        let acumulado = 0;
        return { name: `${shortMonth}/${year.slice(2)}`, agendas, fullMonth: month, year };
      });
  }, [etnData]);

  // Calcular acumulado para a timeline
  const compromissosTimelineWithAccum = useMemo(() => {
    let acum = 0;
    return compromissosTimeline.map(item => {
      acum += item.agendas;
      return { ...item, acumulado: acum };
    });
  }, [compromissosTimeline]);

  // Item 7: Fechamento de Oportunidades Ganhas Mensal (substituir Atividade Mensal)
  const fechamentoGanhasMensal = useMemo(() => {
    const map = new Map<string, { count: number; valor: number }>();
    const seen = new Set<string>();
    for (const r of etnData) {
      if (seen.has(r.oppId)) continue;
      seen.add(r.oppId);
      if (r.etapa === 'Fechada e Ganha' || r.etapa === 'Fechada e Ganha TR') {
        if (!r.anoPrevisao || !r.mesPrevisao) continue;
        const key = `${r.anoPrevisao}-${r.mesPrevisao}`;
        const e = map.get(key) || { count: 0, valor: 0 };
        e.count++;
        e.valor += r.valorFechado; // Item 4: Usar Valor Fechado
        map.set(key, e);
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => {
        const [aY, aM] = a.split('-');
        const [bY, bM] = b.split('-');
        if (aY !== bY) return aY.localeCompare(bY);
        return MONTH_ORDER.indexOf(aM) - MONTH_ORDER.indexOf(bM);
      })
      .map(([key, data]) => {
        const [year, month] = key.split('-');
        return { name: `${month.slice(0, 3)}/${year.slice(2)}`, ...data };
      });
  }, [etnData]);

  // Etapas disponíveis para filtro
  const etapasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    for (const r of etnData) set.add(r.etapa);
    return Array.from(set).sort();
  }, [etnData]);

  // Probabilidades disponíveis para filtro
  const probsDisponiveis = useMemo(() => {
    const set = new Set<string>();
    for (const r of etnData) if (r.probabilidade) set.add(r.probabilidade);
    return Array.from(set).sort((a, b) => parseInt(a) - parseInt(b));
  }, [etnData]);

  // Item 8: Tabela com filtros e pesquisa
  const filteredOps = useMemo(() => {
    const oppMap = new Map<string, ProcessedRecord>();
    for (const r of etnData) {
      if (!oppMap.has(r.oppId)) oppMap.set(r.oppId, r);
    }
    let ops = Array.from(oppMap.values());

    // Filtro por KPI clicado
    if (activeKPIFilter === 'ganhas') {
      ops = ops.filter(r => r.etapa === 'Fechada e Ganha' || r.etapa === 'Fechada e Ganha TR');
    } else if (activeKPIFilter === 'perdidas') {
      ops = ops.filter(r => r.etapa === 'Fechada e Perdida');
    } else if (activeKPIFilter === 'total') {
      // sem filtro adicional
    }

    // Filtro por etapa dropdown
    if (filterEtapa) {
      ops = ops.filter(r => r.etapa === filterEtapa);
    }

    // Filtro por probabilidade dropdown
    if (filterProb) {
      ops = ops.filter(r => r.probabilidade === filterProb);
    }

    // Pesquisa textual
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      ops = ops.filter(r =>
        r.oppId.toLowerCase().includes(term) ||
        r.conta.toLowerCase().includes(term) ||
        r.etapa.toLowerCase().includes(term) ||
        r.representante.toLowerCase().includes(term)
      );
    }

    return ops.sort((a, b) => b.valorPrevisto - a.valorPrevisto);
  }, [etnData, searchTerm, filterEtapa, filterProb, activeKPIFilter]);

  // Intervalo de datas para rodapé (Item 9)
  const dateRange = useMemo(() => {
    let minYear = 9999, maxYear = 0;
    let minMonth = 13, maxMonth = 0;
    let minYearForMonth = '', maxYearForMonth = '';
    for (const r of etnData) {
      if (!r.anoPrevisao || !r.mesPrevisaoNum) continue;
      const y = parseInt(r.anoPrevisao);
      const m = r.mesPrevisaoNum;
      const ym = y * 100 + m;
      if (ym < minYear * 100 + minMonth) { minYear = y; minMonth = m; minYearForMonth = r.anoPrevisao; }
      if (ym > maxYear * 100 + maxMonth) { maxYear = y; maxMonth = m; maxYearForMonth = r.anoPrevisao; }
    }
    if (minYear === 9999) return 'Sem dados';
    const mNames = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${mNames[minMonth]}/${minYear} — ${mNames[maxMonth]}/${maxYear}`;
  }, [etnData]);

  const handleKPIClick = useCallback((filter: string) => {
    setActiveKPIFilter(prev => prev === filter ? null : filter);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-green-600 to-emerald-700 text-white p-6 rounded-t-2xl flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">{etn}</h2>
            <p className="text-green-100 text-sm">Desempenho Individual</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* KPIs (Item 6: incluir ganhas/perdidas com valores) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div onClick={() => handleKPIClick('total')} className={`cursor-pointer transition-all ${activeKPIFilter === 'total' ? 'ring-2 ring-blue-500 rounded-xl' : ''}`}>
              <KPICard
                title="Total de Oportunidades"
                value={kpis.totalOps.toString()}
                icon={<Target size={18} />}
                color="blue"
              />
            </div>
            <div onClick={() => handleKPIClick('ganhas')} className={`cursor-pointer transition-all ${activeKPIFilter === 'ganhas' ? 'ring-2 ring-green-500 rounded-xl' : ''}`}>
              <KPICard
                title="Fechada e Ganha"
                value={kpis.ganhas.toString()}
                subtitle={formatCurrency(kpis.ganhasValor)}
                icon={<Trophy size={18} />}
                color="green"
              />
            </div>
            <div onClick={() => handleKPIClick('perdidas')} className={`cursor-pointer transition-all ${activeKPIFilter === 'perdidas' ? 'ring-2 ring-red-500 rounded-xl' : ''}`}>
              <KPICard
                title="Fechada e Perdida"
                value={kpis.perdidas.toString()}
                subtitle={formatCurrency(kpis.perdidasValor)}
                icon={<XCircle size={18} />}
                color="red"
              />
            </div>
            <KPICard
              title="Win Rate"
              value={`${kpis.winRate}%`}
              icon={<TrendingUp size={18} />}
              color="amber"
            />
            <KPICard
              title="Total de Agendas"
              value={kpis.totalAgendas.toString()}
              icon={<Calendar size={18} />}
              color="purple"
            />
            <KPICard
              title="Valor Médio/Op."
              value={formatCurrency(kpis.valorMedio)}
              icon={<DollarSign size={18} />}
              color="blue"
            />
          </div>

          {/* Filtro ativo por KPI */}
          {activeKPIFilter && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2 text-sm">
              <Filter size={14} className="text-blue-600" />
              <span className="text-blue-800">
                Tabela filtrada por: <strong>{activeKPIFilter === 'ganhas' ? 'Fechada e Ganha' : activeKPIFilter === 'perdidas' ? 'Fechada e Perdida' : 'Todas'}</strong>
              </span>
              <button onClick={() => setActiveKPIFilter(null)} className="ml-auto text-xs font-semibold text-blue-700 hover:text-blue-900 underline">Limpar</button>
            </div>
          )}

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribuição por Etapa */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-4 text-sm">Distribuição por Etapa</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={etapaDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="etapa" angle={-30} textAnchor="end" height={80} tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.97)', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '12px' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Oportunidades">
                    {etapaDistribution.map((entry, i) => {
                      const color = entry.etapa.includes('Ganha') ? '#10b981' : entry.etapa.includes('Perdida') ? '#ef4444' : COLORS[i % COLORS.length];
                      return <rect key={i} fill={color} />;
                    })}
                    <LabelList dataKey="count" position="top" fill="#374151" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-gray-400 text-center mt-2">Período: {dateRange}</p>
            </div>

            {/* Item 5: Quantidade de Agendas Realizadas (substituir probabilidade) */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-4 text-sm">Quantidade de Agendas Realizadas</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={agendasRealizadas}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.97)', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '12px' }} formatter={(v: number) => [v, 'Oportunidades']} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Oportunidades">
                    <LabelList dataKey="count" position="top" fill="#374151" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-gray-400 text-center mt-2">Faixas de agendas por oportunidade · Período: {dateRange}</p>
            </div>

            {/* Item 5: Linha do Tempo de Compromissos (evolução) */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-4 text-sm">Evolução de Compromissos Realizados</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={compromissosTimelineWithAccum}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.97)', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar yAxisId="left" dataKey="agendas" fill="#3b82f6" name="Agendas no Mês" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="acumulado" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 3 }} name="Acumulado" />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-gray-400 text-center mt-2">Período: {dateRange}</p>
            </div>

            {/* Item 7: Fechamento de Oportunidades Ganhas Mensal */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-4 text-sm">Fechamento de Oportunidades Ganhas Mensal</h3>
              {fechamentoGanhasMensal.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={fechamentoGanhasMensal}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <Tooltip
                      contentStyle={{ background: 'rgba(255,255,255,0.97)', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '12px' }}
                      formatter={(v: number, name: string) => {
                        if (name === 'valor') return [formatCurrency(v), 'Valor Fechado'];
                        return [v, 'Qtd. Ganhas'];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="valor" fill="#10b981" radius={[6, 6, 0, 0]} name="Valor Fechado">
                      <LabelList dataKey="valor" position="top" fill="#374151" fontSize={9} formatter={(v: number) => formatCurrency(v)} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-sm text-gray-400">
                  Nenhuma oportunidade ganha neste período
                </div>
              )}
              <p className="text-[10px] text-gray-400 text-center mt-2">Valores de oportunidades Fechadas e Ganhas · Período: {dateRange}</p>
            </div>
          </div>

          {/* Item 8: Tabela de Oportunidades com filtros e pesquisa */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="font-semibold text-gray-800 text-sm">Oportunidades ({filteredOps.length})</h3>
              <div className="flex flex-wrap items-center gap-2">
                {/* Pesquisa */}
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Pesquisar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none w-48"
                  />
                </div>
                {/* Filtro Etapa */}
                <select
                  value={filterEtapa}
                  onChange={(e) => setFilterEtapa(e.target.value)}
                  className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-green-500 outline-none"
                >
                  <option value="">Todas Etapas</option>
                  {etapasDisponiveis.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                {/* Filtro Probabilidade */}
                <select
                  value={filterProb}
                  onChange={(e) => setFilterProb(e.target.value)}
                  className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-green-500 outline-none"
                >
                  <option value="">Todas Prob.</option>
                  {probsDisponiveis.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                {/* Limpar filtros */}
                {(searchTerm || filterEtapa || filterProb || activeKPIFilter) && (
                  <button
                    onClick={() => { setSearchTerm(''); setFilterEtapa(''); setFilterProb(''); setActiveKPIFilter(null); }}
                    className="text-xs font-semibold text-red-600 hover:text-red-800 underline"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-bold text-gray-700">ID Op.</th>
                    <th className="px-3 py-2.5 text-left font-bold text-gray-700">Conta</th>
                    <th className="px-3 py-2.5 text-left font-bold text-gray-700">Etapa</th>
                    <th className="px-3 py-2.5 text-left font-bold text-gray-700">Prob.</th>
                    <th className="px-3 py-2.5 text-right font-bold text-gray-700">Valor Previsto</th>
                    <th className="px-3 py-2.5 text-right font-bold text-gray-700">Valor Fechado</th>
                    <th className="px-3 py-2.5 text-center font-bold text-gray-700">Agendas</th>
                    <th className="px-3 py-2.5 text-left font-bold text-gray-700">Mês Fech.</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOps.slice(0, 100).map((op, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-100/50 transition-colors">
                      <td className="px-3 py-2 font-semibold text-gray-800">{op.oppId}</td>
                      <td className="px-3 py-2 text-gray-700 max-w-[200px] truncate">{op.conta}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          op.etapa === 'Fechada e Ganha' || op.etapa === 'Fechada e Ganha TR' ? 'bg-green-100 text-green-800' :
                          op.etapa === 'Fechada e Perdida' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {op.etapa}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700">{op.probabilidade}</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-800">{formatCurrency(op.valorPrevisto)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-green-700">
                        {op.valorFechado > 0 ? formatCurrency(op.valorFechado) : '—'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          op.agenda === 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {op.agenda}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700">{op.mesFech}/{op.anoPrevisao?.slice(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredOps.length > 100 && (
              <div className="px-4 py-2 bg-gray-100 text-xs text-gray-600 text-center border-t">
                Exibindo 100 de {filteredOps.length} registros
              </div>
            )}
            <p className="text-[10px] text-gray-400 text-center mt-2">Período: {dateRange}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
