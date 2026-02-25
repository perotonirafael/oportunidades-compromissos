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
import { ETNDetailModal } from '@/components/ETNDetailModal';
import { DEMO_DATA } from '@/lib/demoData';

export default function Home() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [oppFile, setOppFile] = useState<File | null>(null);
  const [actFile, setActFile] = useState<File | null>(null);
  const [oppFileName, setOppFileName] = useState('');
  const [actFileName, setActFileName] = useState('');

  const { state: processingState, processFiles, resetState } = useFileProcessor();

  // Função para carregar dados de demonstração
  const handleLoadDemo = useCallback(() => {
    setOpportunities([]);
    setActions([]);
    setError(null);
    // Simular processamento com dados demo
    setTimeout(() => {
      setOpportunities(DEMO_DATA.map(d => ({
        'Oportunidade ID': d.oppId,
        'Conta': d.conta,
        'Conta ID': d.contaId,
        'Representante': d.representante,
        'Responsável': d.responsavel,
        'Usuário Ação': d.etn,
        'Etapa': d.etapa,
        'Prob.': d.probabilidade,
        'Previsão de Fechamento': `01/${d.mesPrevisao === 'Janeiro' ? '01' : d.mesPrevisao === 'Fevereiro' ? '02' : d.mesPrevisao === 'Março' ? '03' : d.mesPrevisao === 'Abril' ? '04' : '05'}/${d.anoPrevisao}`,
        'Mês Fechamento': d.mesFech,
        'Valor Previsto': d.valorPrevisto,
        'Valor Fechado': d.valorFechado,
        'Tipo Oportunidade': d.tipoOportunidade,
        'Subtipo Oportunidade': d.subtipoOportunidade,
        'Origem Oportunidade': d.origemOportunidade,
        'Motivo Fechamento': d.motivoFechamento,
        'Motivo Perda': d.motivoPerda,
        'Concorrentes': d.concorrentes,
        'Cidade': d.cidade,
        'Estado': d.estado,
        'CNAE Segmento': d.cnaeSegmento,
      })));
      setActions(DEMO_DATA.map(d => ({
        'Oportunidade ID': d.oppId,
        'Usuario': d.etn,
        'Qtd. Ações': d.agenda,
        'Categoria Compromisso': d.categoriaCompromisso,
        'Atividade Compromisso': d.atividadeCompromisso,
      })));
    }, 500);
  }, []);

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

  // Estado para modal de detalhe do ETN
  const [selectedETNDetail, setSelectedETNDetail] = useState<string | null>(null);

  const result = useDataProcessor(opportunities, actions);

  const processedData = result?.records ?? [];
  const missingAgendas = result?.missingAgendas ?? [];
  const kpis = result?.kpis ?? null;
  const motivosPerdaBrutos = result?.motivosPerda ?? [];
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
      if (selYears.length > 0 && !selYears.includes(r.anoPrevisao)) return false;
      if (selMonths.length > 0 && !selMonths.includes(r.mesPrevisao)) return false;
      if (selReps.length > 0 && !selReps.includes(r.representante)) return false;
      if (selResp.length > 0 && !selResp.includes(r.responsavel)) return false;
      if (selETN.length > 0 && !selETN.includes(r.etn)) return false;
      if (selStages.length > 0 && !selStages.includes(r.etapa)) return false;
      if (selProbs.length > 0 && !selProbs.includes(r.probabilidade)) return false;
      if (selAgenda.length > 0 && !selAgenda.includes(r.agenda.toString())) return false;
      if (selAccounts.length > 0 && !selAccounts.includes(r.conta)) return false;
      if (selTypes.length > 0 && !selTypes.includes(r.tipoOportunidade)) return false;
      if (selOrigins.length > 0 && !selOrigins.includes(r.origemOportunidade)) return false;
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
  
  // Dados das Agendas Faltantes (com filtro de clique nos gráficos E filtro ETN)
  const missingAgendasFiltered = useMemo(() => {
    let filtered = missingAgendas;
    // Filtro ETN do dropdown
    if (selETNMissing.length > 0) {
      filtered = filtered.filter(r => selETNMissing.includes(r.etn));
    }
    // Filtro de clique no gráfico
    if (chartFilter && chartFilter.field === 'etnMissing') {
      filtered = filtered.filter(r => r.etn === chartFilter.value);
    }
    return filtered;
  }, [missingAgendas, chartFilter, selETNMissing]);

  // ETN Top 10 filtrado
  const etnTop10Filtered = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    const seen = new Set<string>();
    for (const r of filteredData) {
      if (r.probNum < 75) continue;
      if (seen.has(r.oppId)) continue;
      seen.add(r.oppId);
      const e = map.get(r.etn) || { count: 0, value: 0 };
      e.count++;
      e.value += r.valorPrevisto;
      map.set(r.etn, e);
    }
    return Array.from(map.entries())
      .map(([name, d]) => ({ name: name.length > 20 ? name.slice(0, 20) + '...' : name, fullName: name, ...d }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredData]);

  // Motivos de Perda filtrados
  const motivosPerdaFiltered = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filteredData) {
      if (r.etapa !== 'Fechada e Perdida') continue;
      const motivo = r.motivoPerda || 'Sem motivo';
      map.set(motivo, (map.get(motivo) || 0) + r.valorPrevisto);
    }
    return Array.from(map.entries())
      .map(([motivo, value]) => ({ motivo, count: value }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredData]);

  // KPIs filtrados (deduplicados)
  const filteredKPIs = useMemo(() => {
    if (!kpis) return null;
    const seenOps = new Set<string>();
    const seenGanhas = new Set<string>();
    const seenPerdidas = new Set<string>();
    let totalAgendas = 0;
    let totalForecast = 0;

    for (const r of filteredData) {
      if (!seenOps.has(r.oppId)) {
        seenOps.add(r.oppId);
        if (r.etapa === 'Fechada e Ganha') seenGanhas.add(r.oppId);
        if (r.etapa === 'Fechada e Perdida') seenPerdidas.add(r.oppId);
      }
      totalAgendas += r.agenda;
      if (r.probNum >= 75) totalForecast += r.valorPrevisto;
    }

    const winRate = seenGanhas.size + seenPerdidas.size > 0 ? ((seenGanhas.size / (seenGanhas.size + seenPerdidas.size)) * 100).toFixed(1) : '0';
    return {
      totalOps: seenOps.size,
      ganhas: seenGanhas.size,
      perdidas: seenPerdidas.size,
      winRate,
      totalAgendas,
      totalForecast,
    };
  }, [kpis, filteredData]);

  const handleChartClick = useCallback((field: string, value: string) => {
    setChartFilter({ field, value });
  }, []);

  const handleLoad = useCallback(async () => {
    if (!oppFile && !actFile) return;
    setError(null);
    try {
      const result = await processFiles(oppFile, actFile);
      if (result) {
        setOpportunities(result.opportunities);
        setActions(result.actions);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar arquivos');
    }
  }, [oppFile, actFile, processFiles]);

  const handleOppFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOppFile(file);
      setOppFileName(file.name);
    }
  };

  const handleActFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setActFile(file);
      setActFileName(file.name);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-green-600 to-emerald-700 text-white shadow-lg">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
              <BarChart3 size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Painel do Perotoni</h1>
              <p className="text-sm text-green-100">Funil de Vendas · Oportunidades & Compromissos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Upload Section */}
        {processedData.length === 0 ? (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 mb-4">
                <Upload className="text-green-600" size={32} />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-2">Análise de Pipeline</h2>
              <p className="text-muted-foreground">
                Carregue os arquivos de Oportunidades e Ações/Compromissos<br />
                para gerar insights estratégicos do seu funil de vendas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Oportunidades */}
              <div className="bg-white rounded-xl p-6 border-2 border-green-200 hover:border-green-400 transition-all hover:shadow-lg hover:shadow-green-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 shadow-md shadow-green-200">
                    <FileText className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-green-800">Oportunidades</h3>
                    <p className="text-xs text-green-600/70">Base 1 - Pipeline CRM</p>
                  </div>
                </div>
                <label className="block">
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleOppFile} className="hidden" />
                  <span className="block w-full py-3 text-center text-sm font-medium rounded-lg border-2 border-dashed border-green-300 hover:border-green-500 hover:bg-green-50 transition-all cursor-pointer">
                    {oppFileName ? (
                      <span className="text-green-700 flex items-center justify-center gap-1.5">
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

            <div className="flex justify-center gap-4">
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
              <button
                onClick={handleLoadDemo}
                className="flex items-center gap-2 px-8 py-3 text-sm font-bold rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-200 hover:shadow-xl hover:shadow-amber-300 transition-all hover:scale-[1.02]"
              >
                <Zap size={18} /> Ver Demonstração
              </button>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-4">
              Suporta .xlsx, .xls e .csv (separador ; ou ,) &middot; Até 200K registros
            </p>

            {error && (
              <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 flex gap-3">
                <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {processingState.isProcessing && (
              <ProgressBar progress={processingState.progress} currentFile={processingState.currentFile} isVisible={processingState.isProcessing} />
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard
                title="OPORTUNIDADES"
                value={filteredKPIs?.totalOps ?? 0}
                icon={<Target size={20} />}
                color="blue"
              />
              <KPICard
                title="TOTAL DE COMPROMISSOS"
                value={filteredKPIs?.totalAgendas ?? 0}
                icon={<Calendar size={20} />}
                color="green"
              />
              <KPICard
                title="OPORTUNIDADES FECHAMENTO (≥75%)"
                value={`${filteredKPIs?.winRate ?? '0'}%`}
                icon={<TrendingUp size={20} />}
                color="amber"
              />
              <KPICard
                title="FORECAST FECHAMENTO (≥75%)"
                value={`R$ ${((filteredKPIs?.totalForecast ?? 0) / 1e6).toFixed(1)}M`}
                icon={<DollarSign size={20} />}
                color="purple"
              />
            </div>

            {/* Botão para resetar */}
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setOpportunities([]);
                  setActions([]);
                  setOppFile(null);
                  setActFile(null);
                  setOppFileName('');
                  setActFileName('');
                  setChartFilter(null);
                  resetState();
                }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
              >
                <RotateCcw size={14} /> Novo Upload
              </button>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-xl p-5 border border-border shadow-sm">
              <h3 className="text-sm font-bold text-foreground mb-4">Filtros</h3>
              <div className="flex flex-wrap gap-3">
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

            {/* Filtro de clique nos gráficos */}
            {chartFilter && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                <AlertTriangle className="text-amber-600" size={18} />
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
              motivosPerda={motivosPerdaFiltered}
              forecastFunnel={forecastFunnel}
              etnTop10={etnTop10Filtered}
              onChartClick={handleChartClick}
              onETNClick={setSelectedETNDetail}
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
                    onBarClick={(etn) => {
                      setChartFilter({ field: 'etnMissing', value: etn });
                      setSelectedETNDetail(etn);
                    }}
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
                        </tr>
                      </thead>
                      <tbody>
                        {missingAgendasFiltered.slice(0, 200).map((r, idx) => (
                          <tr key={idx} className="border-b hover:bg-amber-50/50">
                            <td className="px-3 py-2 font-semibold text-amber-900">{r.oppId}</td>
                            <td className="px-3 py-2 text-gray-700">{r.conta}</td>
                            <td className="px-3 py-2 text-gray-700">{r.etn}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                r.etapa === 'Fechada e Ganha' ? 'bg-green-100 text-green-800' :
                                r.etapa === 'Fechada e Perdida' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {r.etapa}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-700">{r.probabilidade}</td>
                            <td className="px-3 py-2 text-right font-semibold text-amber-900">R$ {(r.valorPrevisto / 1000).toFixed(0)}K</td>
                            <td className="px-3 py-2 text-gray-700">{r.mesFech}</td>
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

        {/* Modal de Detalhe do ETN */}
        {selectedETNDetail && (
          <ETNDetailModal
            etn={selectedETNDetail}
            data={processedData}
            onClose={() => setSelectedETNDetail(null)}
          />
        )}
      </div>
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
