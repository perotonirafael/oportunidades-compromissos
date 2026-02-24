import {
  Upload, AlertCircle, TrendingUp, Target, Zap, DollarSign,
  Loader, BarChart3, Trophy, XCircle, Percent, FileText, RotateCcw,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useDataProcessor, type Opportunity, type Action, type ProcessedRecord } from '@/hooks/useDataProcessor';
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
  const [selUsers, setSelUsers] = useState<string[]>([]);
  const [selStages, setSelStages] = useState<string[]>([]);
  const [selProbs, setSelProbs] = useState<string[]>([]);
  const [selQtd, setSelQtd] = useState<string[]>([]);
  const [selAccounts, setSelAccounts] = useState<string[]>([]);
  const [selTypes, setSelTypes] = useState<string[]>([]);
  const [selOrigins, setSelOrigins] = useState<string[]>([]);

  const result = useDataProcessor(opportunities, actions);

  const processedData = result?.records ?? [];
  const kpis = result?.kpis ?? null;
  const motivosPerda = result?.motivosPerda ?? [];
  const funnelData = result?.funnelData ?? [];
  const filterOptions = result?.filterOptions ?? {
    years: [], months: [], representantes: [], responsaveis: [], usuarios: [],
    etapas: [], probabilidades: [], qtdAcoes: [], contas: [], tipos: [], origens: [], segmentos: [],
  };

  // Filtrar dados
  const filteredData = useMemo(() => {
    return processedData.filter((r: ProcessedRecord) => {
      if (selYears.length && !selYears.includes(r.anoPrevisao)) return false;
      if (selMonths.length && !selMonths.includes(r.mesPrevisao)) return false;
      if (selReps.length && !selReps.includes(r.representante)) return false;
      if (selResp.length && !selResp.includes(r.responsavel)) return false;
      if (selUsers.length && !selUsers.includes(r.usuarioAcao)) return false;
      if (selStages.length && !selStages.includes(r.etapa)) return false;
      if (selProbs.length && !selProbs.includes(r.probabilidade)) return false;
      if (selAccounts.length && !selAccounts.includes(r.conta)) return false;
      if (selTypes.length && !selTypes.includes(r.tipoOportunidade)) return false;
      if (selOrigins.length && !selOrigins.includes(r.origemOportunidade)) return false;
      if (selQtd.length) {
        const q = r.qtdAcoes;
        const qs = q === 0 ? '0' : q === 1 ? '1' : q === 2 ? '2' : '3+';
        if (!selQtd.includes(qs)) return false;
      }
      return true;
    });
  }, [processedData, selYears, selMonths, selReps, selResp, selUsers, selStages, selProbs, selQtd, selAccounts, selTypes, selOrigins]);

  // KPIs filtrados (deduplicados)
  const filteredKpis = useMemo(() => {
    const seen = new Set<string>();
    let uniqueOps = 0;
    let totalValue = 0;
    let hotOps = 0;
    let ganhas = 0;
    let perdidas = 0;
    let abertasValor = 0;
    let forecast = 0;

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
        forecast += r.valorPrevisto * (r.probNum / 100);
      }
    }

    const winRate = ganhas + perdidas > 0 ? (ganhas / (ganhas + perdidas)) * 100 : 0;

    return { uniqueOps, totalValue, hotOps, ganhas, perdidas, winRate, abertasValor, forecast, totalActions: filteredData.length };
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
    setError(null);
    resetFilters();
  };

  const resetFilters = () => {
    setSelYears([]); setSelMonths([]); setSelReps([]); setSelResp([]);
    setSelUsers([]); setSelStages([]); setSelProbs([]); setSelQtd([]);
    setSelAccounts([]); setSelTypes([]); setSelOrigins([]);
  };

  const fmtCurrency = (v: number) => {
    if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}K`;
    return `R$ ${v.toFixed(0)}`;
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
      <header className="sticky top-0 z-40 border-b border-border glass-card">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="text-primary" size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Pipeline Analytics</h1>
              <p className="text-xs text-muted-foreground">Funil de Vendas &middot; Oportunidades &amp; Compromissos</p>
            </div>
          </div>
          {hasData && (
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
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
            <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-6">
              <Upload className="text-primary" size={40} />
            </div>
            <h2 className="text-3xl font-bold tracking-tight mb-3">
              Análise de Pipeline
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Carregue os arquivos de Oportunidades e Ações/Compromissos para gerar insights estratégicos do seu funil de vendas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Oportunidades */}
            <div className="glass-card rounded-xl p-6 border border-blue-500/20 hover:border-blue-500/40 transition-colors group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <FileText className="text-blue-400" size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Oportunidades</h3>
                  <p className="text-xs text-muted-foreground">Base 1 - Pipeline CRM</p>
                </div>
              </div>
              <label className="block">
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleOppFile} className="hidden" />
                <span className="block w-full py-2.5 text-center text-sm font-medium rounded-lg border border-dashed border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-500/5 transition-all cursor-pointer">
                  {oppFileName ? (
                    <span className="text-blue-400 flex items-center justify-center gap-1.5">
                      <FileText size={14} /> {oppFileName}
                    </span>
                  ) : (
                    'Selecionar arquivo'
                  )}
                </span>
              </label>
            </div>

            {/* Compromissos */}
            <div className="glass-card rounded-xl p-6 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <FileText className="text-emerald-400" size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Ações / Compromissos</h3>
                  <p className="text-xs text-muted-foreground">Base 2 - Engajamento</p>
                </div>
              </div>
              <label className="block">
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleActFile} className="hidden" />
                <span className="block w-full py-2.5 text-center text-sm font-medium rounded-lg border border-dashed border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/5 transition-all cursor-pointer">
                  {actFileName ? (
                    <span className="text-emerald-400 flex items-center justify-center gap-1.5">
                      <FileText size={14} /> {actFileName}
                    </span>
                  ) : (
                    'Selecionar arquivo'
                  )}
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleLoad}
              disabled={processingState.isProcessing || (!oppFile && !actFile)}
              className="flex items-center gap-2 px-8 py-3 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20"
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
            <div className="mt-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex gap-3">
              <AlertCircle className="text-destructive flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-sm font-medium text-destructive">Erro ao processar</p>
                <p className="text-xs text-destructive/80 mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dashboard */}
      {hasData && (
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          {/* KPIs Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
            <KPICard title="Ops. Únicas" value={filteredKpis.uniqueOps} icon={<Target size={20} />} color="blue" />
            <KPICard title="Total Registros" value={filteredKpis.totalActions} icon={<Zap size={20} />} color="green" />
            <KPICard title="Hot Ops (≥75%)" value={filteredKpis.hotOps} icon={<TrendingUp size={20} />} color="amber" subtitle="Probabilidade alta" />
            <KPICard title="Win Rate" value={`${filteredKpis.winRate.toFixed(1)}%`} icon={<Percent size={20} />} color="green" subtitle={`${filteredKpis.ganhas}W / ${filteredKpis.perdidas}L`} />
            <KPICard title="Ganhas" value={filteredKpis.ganhas} icon={<Trophy size={20} />} color="green" />
            <KPICard title="Perdidas" value={filteredKpis.perdidas} icon={<XCircle size={20} />} color="red" />
            <KPICard title="Pipeline Aberto" value={fmtCurrency(filteredKpis.abertasValor)} icon={<DollarSign size={20} />} color="blue" />
            <KPICard title="Forecast Pond." value={fmtCurrency(filteredKpis.forecast)} icon={<BarChart3 size={20} />} color="purple" subtitle="Valor × Prob." />
          </div>

          {/* Filters Bar */}
          <div className="glass-card rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtros</h3>
              <button onClick={resetFilters} className="text-xs text-primary hover:underline">Limpar todos</button>
            </div>
            <div className="flex flex-wrap gap-2">
              <MultiSelectDropdown label="Ano" options={filterOptions.years} selected={selYears} onChange={setSelYears} />
              <MultiSelectDropdown label="Mês" options={filterOptions.months} selected={selMonths} onChange={setSelMonths} />
              <MultiSelectDropdown label="Representante" options={filterOptions.representantes} selected={selReps} onChange={setSelReps} />
              <MultiSelectDropdown label="Responsável" options={filterOptions.responsaveis} selected={selResp} onChange={setSelResp} />
              <MultiSelectDropdown label="Usuário Ação" options={filterOptions.usuarios} selected={selUsers} onChange={setSelUsers} />
              <MultiSelectDropdown label="Etapa" options={filterOptions.etapas} selected={selStages} onChange={setSelStages} />
              <MultiSelectDropdown label="Probabilidade" options={filterOptions.probabilidades} selected={selProbs} onChange={setSelProbs} />
              <MultiSelectDropdown label="Qtd. Ações" options={filterOptions.qtdAcoes} selected={selQtd} onChange={setSelQtd} />
              <MultiSelectDropdown label="Conta" options={filterOptions.contas} selected={selAccounts} onChange={setSelAccounts} />
              <MultiSelectDropdown label="Tipo Op." options={filterOptions.tipos} selected={selTypes} onChange={setSelTypes} />
              <MultiSelectDropdown label="Origem" options={filterOptions.origens} selected={selOrigins} onChange={setSelOrigins} />
            </div>
          </div>

          {/* Charts */}
          <ChartsSection data={filteredData} funnelData={funnelData} motivosPerda={motivosPerda} />

          {/* Table */}
          <div className="mt-6">
            <AnalyticsTable data={filteredData} />
          </div>
        </div>
      )}
    </div>
  );
}
