import {
  Upload, AlertCircle, TrendingUp, Target, Zap, DollarSign,
  Loader, BarChart3, Trophy, XCircle, FileText, RotateCcw,
  Calendar, AlertTriangle,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useDataProcessor, type Opportunity, type Action, type ProcessedRecord, type MissingAgendaRecord } from '@/hooks/useDataProcessor';
import { useFileProcessor } from '@/hooks/useFileProcessor';
import { MultiSelectDropdown } from '@/components/MultiSelectDropdown';
import { KPICard } from '@/components/KPICard';
import { AnalyticsTable } from '@/components/AnalyticsTable';
import { ChartsSection } from '@/components/ChartsSection';
import { ProgressBar } from '@/components/ProgressBar';

export default function Home() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [oppFile, setOppFile] = useState<File | null>(null);
  const [actFile, setActFile] = useState<File | null>(null);
  const [oppFileName, setOppFileName] = useState('');
  const [actFileName, setActFileName] = useState('');

  const { state: processingState, processFiles, resetState } = useFileProcessor();

  // Filtros
  const [selYears, setSelYears] = useState<string[]>([]);
  const [selMonths, setSelMonths] = useState<string[]>([]);
  const [selReps, setSelReps] = useState<string[]>([]);
  const [selResp, setSelResp] = useState<string[]>([]);
  const [selETN, setSelETN] = useState<string[]>([]);
  const [selStages, setSelStages] = useState<string[]>([]);
  const [selProbs, setSelProbs] = useState<string[]>([]);
  const [selAgenda, setSelAgenda] = useState<string[]>([]);
  const [selAccounts, setSelAccounts] = useState<string[]>([]);
  const [selTypes, setSelTypes] = useState<string[]>([]);
  const [selOrigins, setSelOrigins] = useState<string[]>([]);

  // Estado para clique nos gráficos filtrar tabela
  const [chartFilter, setChartFilter] = useState<{ field: string; value: string } | null>(null);
  
  // Estado para filtro ETN nas Agendas Faltantes
  const [selETNMissing, setSelETNMissing] = useState<string[]>([]);

  const result = useDataProcessor(opportunities, actions);

  const processedData = result?.records ?? [];
  const missingAgendas = result?.missingAgendas ?? [];
  const kpis = result?.kpis ?? null;
  const motivosPerda = result?.motivosPerda ?? [];
  const funnelData = result?.funnelData ?? [];
  const forecastFunnel = result?.forecastFunnel ?? [];
  const etnTop10 = result?.etnTop10 ?? [];
  const filterOptions = result?.filterOptions ?? {
    years: [], months: [], representantes: [], responsaveis: [], etns: [],
    etapas: [], probabilidades: [], agenda: [], contas: [], tipos: [], origens: [], segmentos: [],
  };

  // Filtrar dados
  const filteredData = useMemo(() => {
    return processedData.filter((r: ProcessedRecord) => {
      if (selYears.length && !selYears.includes(r.anoPrevisao)) return false;
      if (selMonths.length && !selMonths.includes(r.mesFech)) return false;
      if (selReps.length && !selReps.includes(r.representante)) return false;
      if (selResp.length && !selResp.includes(r.responsavel)) return false;
      if (selETN.length && !selETN.includes(r.etn)) return false;
      if (selStages.length && !selStages.includes(r.etapa)) return false;
      if (selProbs.length && !selProbs.includes(r.probabilidade)) return false;
      if (selAccounts.length && !selAccounts.includes(r.conta)) return false;
      if (selTypes.length && !selTypes.includes(r.tipoOportunidade)) return false;
      if (selOrigins.length && !selOrigins.includes(r.origemOportunidade)) return false;
      if (selAgenda.length) {
        const q = r.agenda;
        const qs = q === 0 ? '0' : q === 1 ? '1' : q === 2 ? '2' : '3+';
        if (!selAgenda.includes(qs)) return false;
      }
      return true;
    });
  }, [processedData, selYears, selMonths, selReps, selResp, selETN, selStages, selProbs, selAgenda, selAccounts, selTypes, selOrigins]);

  // Dados da tabela (com filtro de clique nos gráficos)
  const tableData = useMemo(() => {
    if (!chartFilter) return filteredData;
    return filteredData.filter((r: ProcessedRecord) => {
      switch (chartFilter.field) {
        case 'etapa': return r.etapa === chartFilter.value;
        case 'probabilidade': return r.probabilidade === chartFilter.value;
        case 'motivoPerda': return r.motivoPerda === chartFilter.value || r.motivoFechamento === chartFilter.value;
        case 'etn': return r.etn === chartFilter.value;
        case 'etnMissing': return r.etn === chartFilter.value;
        case 'representante': return r.representante === chartFilter.value;
        default: return true;
      }
    });
  }, [filteredData, chartFilter]);
  
  // Dados das Agendas Faltantes (com filtro de clique nos gráficos)
  const missingAgendasFiltered = useMemo(() => {
    if (!chartFilter || chartFilter.field !== 'etnMissing') return missingAgendas;
    return missingAgendas.filter(r => r.etn === chartFilter.value);
  }, [missingAgendas, chartFilter]);

  // KPIs filtrados (deduplicados)
  const filteredKpis = useMemo(() => {
    const seen = new Set<string>();
    let uniqueOps = 0;
    let totalValue = 0;
    let hotOps = 0;
    let ganhas = 0;
    let perdidas = 0;
    let abertasValor = 0;
    let forecastFech75 = 0;

    for (const r of filteredData) {
      if (seen.has(r.oppId)) continue;
      seen.add(r.oppId);
      uniqueOps++;
      totalValue += r.valorPrevisto;
      if (r.probNum >= 75) hotOps++;
      if (r.etapa === 'Fechada e Ganha' || r.etapa === 'Fechada e Ganha TR') ganhas++;
      else if (r.etapa === 'Fechada e Perdida') perdidas++;
      else {
        abertasValor += r.valorPrevisto;
        if (r.probNum >= 75) forecastFech75 += r.valorPrevisto;
      }
    }

    return { uniqueOps, totalValue, hotOps, ganhas, perdidas, abertasValor, forecastFech75, totalActions: filteredData.length };
  }, [filteredData]);

  const handleOppFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setOppFile(f); setOppFileName(f.name); }
  };
  const handleActFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setActFile(f); setActFileName(f.name); }
  };

  const handleLoad = useCallback(async () => {
    if (!oppFile && !actFile) { setError('Selecione pelo menos um arquivo.'); return; }
    try {
      const result = await processFiles(oppFile, actFile);
      if (result) {
        setOpportunities(result.opportunities as Opportunity[]);
        setActions(result.actions as Action[]);
        setError(null);
        setOppFile(null); setActFile(null);
        setOppFileName(''); setActFileName('');
        resetState();
      } else if (processingState.error) {
        setError(processingState.error);
      }
    } catch (err) {
      setError(`Erro: ${err instanceof Error ? err.message : 'Desconhecido'}`);
    }
  }, [oppFile, actFile, processFiles, processingState.error, resetState]);

  const resetAll = () => {
    setOpportunities([]); setActions([]);
    setOppFile(null); setActFile(null);
    setOppFileName(''); setActFileName('');
    setError(null); setChartFilter(null);
    resetFilters();
  };

  const resetFilters = () => {
    setSelYears([]); setSelMonths([]); setSelReps([]); setSelResp([]);
    setSelETN([]); setSelStages([]); setSelProbs([]); setSelAgenda([]);
    setSelAccounts([]); setSelTypes([]); setSelOrigins([]);
    setChartFilter(null);
  };

  const fmtCurrency = (v: number) => {
    if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}K`;
    return `R$ ${v.toFixed(0)}`;
  };

  const handleChartClick = (field: string, value: string) => {
    if (chartFilter?.field === field && chartFilter?.value === value) {
      setChartFilter(null); // Toggle off
    } else {
      setChartFilter({ field, value });
    }
  };

  const hasData = processedData.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ProgressBar
        progress={processingState.progress}
        currentFile={processingState.currentFile}
        isVisible={processingState.isProcessing}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 shadow-lg shadow-green-600/10">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/15 backdrop-blur-sm">
              <BarChart3 className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">Painel do Perotoni</h1>
              <p className="text-xs text-white/70">Funil de Vendas &middot; Oportunidades &amp; Compromissos</p>
            </div>
          </div>
          {hasData && (
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/15 hover:bg-white/25 text-white backdrop-blur-sm transition-colors"
            >
              <RotateCcw size={14} /> Novo Upload
            </button>
          )}
        </div>
      </header>

      {/* Upload Section */}
      {!hasData && (
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 mb-6">
              <Upload className="text-emerald-600" size={40} />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-3">
              Análise de Pipeline
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Carregue os arquivos de Oportunidades e Ações/Compromissos para gerar insights estratégicos do seu funil de vendas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Oportunidades */}
            <div className="bg-white rounded-xl p-6 border-2 border-emerald-200 hover:border-emerald-400 transition-all hover:shadow-lg hover:shadow-emerald-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 shadow-md shadow-emerald-200">
                  <FileText className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-800">Oportunidades</h3>
                  <p className="text-xs text-emerald-600/70">Base 1 - Pipeline CRM</p>
                </div>
              </div>
              <label className="block">
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleOppFile} className="hidden" />
                <span className="block w-full py-3 text-center text-sm font-medium rounded-lg border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer">
                  {oppFileName ? (
                    <span className="text-emerald-700 flex items-center justify-center gap-1.5">
                      <FileText size={14} /> {oppFileName}
                    </span>
                  ) : (
                    <span className="text-emerald-500">Selecionar arquivo</span>
                  )}
                </span>
              </label>
            </div>

            {/* Compromissos */}
            <div className="bg-white rounded-xl p-6 border-2 border-blue-200 hover:border-blue-400 transition-all hover:shadow-lg hover:shadow-blue-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-200">
                  <FileText className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-blue-800">Ações / Compromissos</h3>
                  <p className="text-xs text-blue-600/70">Base 2 - Engajamento</p>
                </div>
              </div>
              <label className="block">
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleActFile} className="hidden" />
                <span className="block w-full py-3 text-center text-sm font-medium rounded-lg border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer">
                  {actFileName ? (
                    <span className="text-blue-700 flex items-center justify-center gap-1.5">
                      <FileText size={14} /> {actFileName}
                    </span>
                  ) : (
                    <span className="text-blue-500">Selecionar arquivo</span>
                  )}
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleLoad}
              disabled={processingState.isProcessing || (!oppFile && !actFile)}
              className="flex items-center gap-2 px-8 py-3 text-sm font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02]"
            >
              {processingState.isProcessing ? (
                <><Loader className="animate-spin" size={18} /> Processando...</>
              ) : (
                <><Upload size={18} /> Carregar e Analisar</>
              )}
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Suporta .xlsx, .xls e .csv (separador ; ou ,) &middot; Até 200K registros
          </p>

          {error && (
            <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 flex gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-sm font-medium text-red-700">Erro ao processar</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dashboard */}
      {hasData && (
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          {/* KPIs Row - Itens 1-7 */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
            <KPICard title="OPORTUNIDADES" value={filteredKpis.uniqueOps} icon={<Target size={20} />} color="blue" />
            <KPICard title="TOTAL DE COMPROMISSOS" value={filteredKpis.totalActions} icon={<Calendar size={20} />} color="green" />
            <KPICard title="OPORTUNIDADES FECHAMENTO (≥75%)" value={filteredKpis.hotOps} icon={<TrendingUp size={20} />} color="amber" />
            <KPICard title="Oportunidades Ganhas" value={filteredKpis.ganhas} icon={<Trophy size={20} />} color="green" />
            <KPICard title="Oportunidades Perdidas" value={filteredKpis.perdidas} icon={<XCircle size={20} />} color="red" />
            <KPICard title="Pipeline Aberto" value={fmtCurrency(filteredKpis.abertasValor)} icon={<DollarSign size={20} />} color="blue" />
            <KPICard title="FORECAST FECHAMENTO (≥75%)" value={fmtCurrency(filteredKpis.forecastFech75)} icon={<BarChart3 size={20} />} color="purple" subtitle="Valor Previsto R$" />
          </div>

          {/* Filters Bar */}
          <div className="bg-white rounded-xl p-4 mb-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtros</h3>
              <button onClick={resetFilters} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors">Limpar todos</button>
            </div>
            <div className="flex flex-wrap gap-2">
              <MultiSelectDropdown label="Ano" options={filterOptions.years} selected={selYears} onChange={setSelYears} />
              <MultiSelectDropdown label="Mês" options={filterOptions.months} selected={selMonths} onChange={setSelMonths} />
              <MultiSelectDropdown label="Representante" options={filterOptions.representantes} selected={selReps} onChange={setSelReps} />
              <MultiSelectDropdown label="Responsável" options={filterOptions.responsaveis} selected={selResp} onChange={setSelResp} />
              <MultiSelectDropdown label="ETN" options={filterOptions.etns} selected={selETN} onChange={setSelETN} />
              <MultiSelectDropdown label="Etapa" options={filterOptions.etapas} selected={selStages} onChange={setSelStages} />
              <MultiSelectDropdown label="Probabilidade" options={filterOptions.probabilidades} selected={selProbs} onChange={setSelProbs} />
              <MultiSelectDropdown label="Agenda" options={filterOptions.agenda} selected={selAgenda} onChange={setSelAgenda} />
              <MultiSelectDropdown label="Conta" options={filterOptions.contas} selected={selAccounts} onChange={setSelAccounts} />
              <MultiSelectDropdown label="Tipo Op." options={filterOptions.tipos} selected={selTypes} onChange={setSelTypes} />
              <MultiSelectDropdown label="Origem" options={filterOptions.origens} selected={selOrigins} onChange={setSelOrigins} />
            </div>
          </div>

          {/* Chart filter indicator */}
          {chartFilter && (
            <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
              <Zap size={14} className="text-amber-600" />
              <span className="text-sm text-amber-800">
                Tabela filtrada por: <strong>{chartFilter.field === 'etapa' ? 'Etapa' : chartFilter.field === 'motivoPerda' ? 'Motivo de Perda' : chartFilter.field === 'etn' ? 'ETN' : chartFilter.field === 'representante' ? 'Representante' : chartFilter.field}</strong> = <strong>{chartFilter.value}</strong>
              </span>
              <button onClick={() => setChartFilter(null)} className="ml-auto text-xs font-semibold text-amber-700 hover:text-amber-900 underline">Limpar</button>
            </div>
          )}

          {/* Charts */}
          <ChartsSection
            data={filteredData}
            funnelData={funnelData}
            motivosPerda={motivosPerda}
            forecastFunnel={forecastFunnel}
            etnTop10={etnTop10}
            onChartClick={handleChartClick}
          />

          {/* Table */}
          <div className="mt-6">
            <AnalyticsTable data={tableData} />
          </div>

          {/* Agendas Faltantes (Item 14) */}
          {missingAgendas.length > 0 && (
            <div className="mt-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-md">
                  <AlertTriangle className="text-white" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Agendas Faltantes</h2>
                  <p className="text-xs text-muted-foreground">
                    Oportunidades sem compromisso registrado, onde o ETN já atuou em outra oportunidade do mesmo cliente
                  </p>
                </div>
                <span className="ml-auto bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
                  {missingAgendas.length} registros
                </span>
              </div>

              {/* Gráfico de Agendas Faltantes por ETN */}
              <div className="bg-white rounded-xl p-5 border border-border shadow-sm mb-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-1">Agendas Faltantes por ETN</h3>
                    <p className="text-xs text-muted-foreground">Clique na barra para filtrar a tabela abaixo</p>
                  </div>
                  <div className="w-56">
                    <MultiSelectDropdown
                      label="Filtrar ETN"
                      options={filterOptions.etns}
                      selected={selETNMissing}
                      onChange={setSelETNMissing}
                    />
                  </div>
                </div>
                <MissingAgendaChart 
                  data={missingAgendas} 
                  onBarClick={(etn) => setChartFilter({ field: 'etnMissing', value: etn })}
                  selectedETN={selETNMissing}
                />
              </div>

              {/* Grid de Agendas Faltantes */}
              <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
                        <th className="text-left px-3 py-2.5 font-bold text-amber-900">Op. ID</th>
                        <th className="text-left px-3 py-2.5 font-bold text-amber-900">Conta</th>
                        <th className="text-left px-3 py-2.5 font-bold text-amber-900">ETN</th>
                        <th className="text-left px-3 py-2.5 font-bold text-amber-900">Etapa</th>
                        <th className="text-left px-3 py-2.5 font-bold text-amber-900">Prob.</th>
                        <th className="text-right px-3 py-2.5 font-bold text-amber-900">Valor Previsto</th>
                        <th className="text-left px-3 py-2.5 font-bold text-amber-900">Mês Fech.</th>
                        <th className="text-left px-3 py-2.5 font-bold text-amber-900">Op. Anterior</th>
                        <th className="text-left px-3 py-2.5 font-bold text-amber-900">Etapa Anterior</th>
                        <th className="text-center px-3 py-2.5 font-bold text-amber-900">Agenda Anterior</th>
                      </tr>
                    </thead>
                    <tbody>
                      {missingAgendasFiltered.slice(0, 200).map((r, i) => (
                        <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-amber-50/50 transition-colors`}>
                          <td className="px-3 py-2 font-mono text-gray-700">{r.oppId}</td>
                          <td className="px-3 py-2 text-gray-800 font-medium">{r.conta}</td>
                          <td className="px-3 py-2 text-gray-700">{r.etn}</td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">{r.etapa}</span>
                          </td>
                          <td className="px-3 py-2 text-gray-700">{r.probabilidade}</td>
                          <td className="px-3 py-2 text-right font-mono text-gray-800">
                            {r.valorPrevisto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-3 py-2 text-gray-700">{r.mesFech} {r.anoPrevisao}</td>
                          <td className="px-3 py-2 font-mono text-blue-600">{r.oppAnteriorId}</td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">{r.oppAnteriorEtapa}</span>
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-emerald-700">{r.agendaAnterior}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {missingAgendasFiltered.length > 200 && (
                  <div className="px-4 py-2 bg-amber-50 text-xs text-amber-700 text-center border-t border-amber-200">
                    Exibindo 200 de {missingAgendasFiltered.length} registros
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Componente de gráfico para Agendas Faltantes
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

function MissingAgendaChart({ data, onBarClick, selectedETN }: { data: MissingAgendaRecord[]; onBarClick: (etn: string) => void; selectedETN: string[] }) {
  const chartData = useMemo(() => {
    const filtered = selectedETN.length > 0 ? data.filter(r => selectedETN.includes(r.etn)) : data;
    const map = new Map<string, number>();
    for (const r of filtered) {
      map.set(r.etn, (map.get(r.etn) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, count, fullName: name }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
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
          <Bar dataKey="count" radius={[0, 6, 6, 0]} onClick={(data: any) => onBarClick(data.fullName)}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} style={{ cursor: 'pointer' }} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
