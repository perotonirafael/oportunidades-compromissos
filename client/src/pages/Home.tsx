import { Upload, AlertCircle, TrendingUp, Target, Zap, DollarSign, Loader } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useCallback, useState } from 'react';
import { useDataProcessor, Opportunity, Action } from '@/hooks/useDataProcessor';
import { MultiSelectDropdown } from '@/components/MultiSelectDropdown';
import { KPICard } from '@/components/KPICard';
import { AnalyticsTable } from '@/components/AnalyticsTable';
import { ChartsSection } from '@/components/ChartsSection';

/**
 * Design Philosophy: Minimalismo Corporativo com Dados Destaque
 * - Hierarquia clara através de tipografia e espaçamento
 * - Dados são o protagonista visual (números grandes, cores significativas)
 * - Interface neutra (cinzas/brancos) com cores apenas para dados
 * - Sidebar esquerdo com filtros, área principal com KPIs e tabela
 */

// Dados de teste para demonstração
const DEMO_OPPORTUNITIES: Opportunity[] = [
  { 'ID Oportunidade': 'OPP-001', 'Conta': 'Empresa A', 'Conta ID': 'ACC-001', 'Responsável': 'João Silva', 'Representante': 'Rep. Vendas 1', 'Etapa': 'Proposta', 'Probabilidade': '75%', 'Previsão de Fechamento': '15/03/2026', 'Valor Previsto': 150000 },
  { 'ID Oportunidade': 'OPP-002', 'Conta': 'Empresa B', 'Conta ID': 'ACC-002', 'Responsável': 'Maria Santos', 'Representante': 'Rep. Vendas 2', 'Etapa': 'Negociação', 'Probabilidade': '50%', 'Previsão de Fechamento': '20/03/2026', 'Valor Previsto': 250000 },
  { 'ID Oportunidade': 'OPP-003', 'Conta': 'Empresa C', 'Conta ID': 'ACC-003', 'Responsável': 'Pedro Costa', 'Representante': 'Rep. Vendas 1', 'Etapa': 'Qualificação', 'Probabilidade': '25%', 'Previsão de Fechamento': '10/04/2026', 'Valor Previsto': 100000 },
  { 'ID Oportunidade': 'OPP-004', 'Conta': 'Empresa A', 'Conta ID': 'ACC-001', 'Responsável': 'João Silva', 'Representante': 'Rep. Vendas 1', 'Etapa': 'Fechamento', 'Probabilidade': '90%', 'Previsão de Fechamento': '28/02/2026', 'Valor Previsto': 300000 },
  { 'ID Oportunidade': 'OPP-005', 'Conta': 'Empresa D', 'Conta ID': 'ACC-004', 'Responsável': 'Ana Lima', 'Representante': 'Rep. Vendas 3', 'Etapa': 'Proposta', 'Probabilidade': '60%', 'Previsão de Fechamento': '05/04/2026', 'Valor Previsto': 180000 },
];

const DEMO_ACTIONS: Action[] = [
  { 'Oportunidade ID': 'OPP-001', 'Conta ID': 'ACC-001', 'Usuário Ação': 'João Silva', 'Data Ação': '20/02/2026' },
  { 'Oportunidade ID': 'OPP-001', 'Conta ID': 'ACC-001', 'Usuário Ação': 'Maria Santos', 'Data Ação': '21/02/2026' },
  { 'Oportunidade ID': 'OPP-002', 'Conta ID': 'ACC-002', 'Usuário Ação': 'Pedro Costa', 'Data Ação': '22/02/2026' },
  { 'Oportunidade ID': 'OPP-002', 'Conta ID': 'ACC-002', 'Usuário Ação': 'João Silva', 'Data Ação': '23/02/2026' },
  { 'Oportunidade ID': 'OPP-003', 'Conta ID': 'ACC-003', 'Usuário Ação': 'Ana Lima', 'Data Ação': '24/02/2026' },
  { 'Oportunidade ID': 'OPP-004', 'Conta ID': 'ACC-001', 'Usuário Ação': 'Maria Santos', 'Data Ação': '25/02/2026' },
  { 'Oportunidade ID': 'OPP-005', 'Conta ID': 'ACC-004', 'Usuário Ação': 'Pedro Costa', 'Data Ação': '26/02/2026' },
];

export default function Home() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  
  // Estados para upload separado
  const [oppFile, setOppFile] = useState<File | null>(null);
  const [actFile, setActFile] = useState<File | null>(null);
  const [oppFileName, setOppFileName] = useState<string>('');
  const [actFileName, setActFileName] = useState<string>('');

  // Filtros
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedRepresentatives, setSelectedRepresentatives] = useState<string[]>([]);
  const [selectedResponsible, setSelectedResponsible] = useState<string[]>([]);
  const [selectedActionUsers, setSelectedActionUsers] = useState<string[]>([]);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedProbabilities, setSelectedProbabilities] = useState<string[]>([]);
  const [selectedActionCounts, setSelectedActionCounts] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  const { processedData, kpis, filterOptions } = useDataProcessor(opportunities, actions);

  // Aplicar filtros aos dados processados
  const filteredData = processedData.filter(record => {
    if (selectedYears.length > 0 && !selectedYears.includes(record['Ano Previsão'])) return false;
    if (selectedMonths.length > 0 && !selectedMonths.includes(record['Mês Previsão'])) return false;
    if (selectedRepresentatives.length > 0 && !selectedRepresentatives.includes(record['Responsável'])) return false;
    if (selectedResponsible.length > 0 && !selectedResponsible.includes(record['Responsável'])) return false;
    if (selectedActionUsers.length > 0 && !selectedActionUsers.includes(record['Usuário Ação'])) return false;
    if (selectedStages.length > 0 && !selectedStages.includes(record['Etapa'])) return false;
    if (selectedProbabilities.length > 0 && !selectedProbabilities.includes(record['Probabilidade'])) return false;
    if (selectedAccounts.length > 0 && !selectedAccounts.includes(record['Conta'])) return false;
    
    if (selectedActionCounts.length > 0) {
      const count = record['Qtd. Ações'];
      const countStr = count === 0 ? '0' : count === 1 ? '1' : count === 2 ? '2' : '3+';
      if (!selectedActionCounts.includes(countStr)) return false;
    }

    return true;
  });

  const loadDemoData = () => {
    setOpportunities(DEMO_OPPORTUNITIES);
    setActions(DEMO_ACTIONS);
    setOppFile(null);
    setActFile(null);
    setOppFileName('');
    setActFileName('');
  };

  const handleOppFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setOppFile(file);
      setOppFileName(file.name);
    }
  };

  const handleActFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setActFile(file);
      setActFileName(file.name);
    }
  };

  const handleLoadFiles = useCallback(async () => {
    if (!oppFile && !actFile) {
      setError('Selecione pelo menos um arquivo para carregar.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 50));

      const newOpportunities: Opportunity[] = [];
      const newActions: Action[] = [];

      // Processar arquivo de Oportunidades
      if (oppFile) {
        const arrayBuffer = await oppFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(worksheet) as any[];
          if (data.length > 0) {
            newOpportunities.push(...data);
          }
        }
      }

      // Processar arquivo de Ações/Compromissos
      if (actFile) {
        const arrayBuffer = await actFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(worksheet) as any[];
          if (data.length > 0) {
            newActions.push(...data);
          }
        }
      }

      if (newOpportunities.length === 0 && newActions.length === 0) {
        setError('Nenhum dado válido encontrado nos arquivos.');
      } else {
        setOpportunities(newOpportunities);
        setActions(newActions);
      }
    } catch (err) {
      setError(`Erro ao processar arquivo: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  }, [oppFile, actFile]);

  const resetFilters = () => {
    setSelectedYears([]);
    setSelectedMonths([]);
    setSelectedRepresentatives([]);
    setSelectedResponsible([]);
    setSelectedActionUsers([]);
    setSelectedStages([]);
    setSelectedProbabilities([]);
    setSelectedActionCounts([]);
    setSelectedAccounts([]);
    setTableSearchTerm('');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-300 bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Painel de Oportunidades e Compromissos
              </h1>
              <p className="text-sm text-gray-600 mt-2">
                Análise de pipeline com join relacional entre oportunidades e ações
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Upload Section */}
      {processedData.length === 0 && (
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-gradient-to-br from-gray-50 to-white">
            <div className="inline-block p-3 bg-gray-100 rounded-lg mb-6">
              <Upload className="text-gray-600" size={48} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Carregue seus arquivos
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Selecione os arquivos com as bases de Oportunidades e Ações/Compromissos separadamente. O sistema processará os dados em tempo real.
            </p>

            {/* Upload Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Oportunidades */}
              <div className="border-2 border-gray-200 rounded-lg p-8 bg-white hover:border-blue-400 transition-colors">
                <div className="inline-block p-2 bg-blue-100 rounded-lg mb-4">
                  <Upload className="text-blue-600" size={32} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Oportunidades
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Arquivo com dados de oportunidades (ID Oportunidade, Conta, etc)
                </p>
                <label className="inline-block">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleOppFileSelect}
                    disabled={isLoading}
                    className="hidden"
                  />
                  <span className="inline-block px-6 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50">
                    Selecionar Arquivo
                  </span>
                </label>
                {oppFileName && (
                  <p className="text-sm text-green-600 mt-3 font-medium">
                    ✓ {oppFileName}
                  </p>
                )}
              </div>

              {/* Ações/Compromissos */}
              <div className="border-2 border-gray-200 rounded-lg p-8 bg-white hover:border-green-400 transition-colors">
                <div className="inline-block p-2 bg-green-100 rounded-lg mb-4">
                  <Upload className="text-green-600" size={32} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Ações/Compromissos
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Arquivo com dados de ações (Usuário Ação, Data Ação, etc)
                </p>
                <label className="inline-block">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleActFileSelect}
                    disabled={isLoading}
                    className="hidden"
                  />
                  <span className="inline-block px-6 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50">
                    Selecionar Arquivo
                  </span>
                </label>
                {actFileName && (
                  <p className="text-sm text-green-600 mt-3 font-medium">
                    ✓ {actFileName}
                  </p>
                )}
              </div>
            </div>

            {/* Load Button */}
            <div className="flex gap-4 justify-center mb-6">
              <button
                onClick={handleLoadFiles}
                disabled={isLoading || (!oppFile && !actFile)}
                className="inline-flex items-center gap-2 px-8 py-3 bg-gray-900 text-white rounded font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Carregando...
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    Carregar Arquivos
                  </>
                )}
              </button>
              <button
                onClick={loadDemoData}
                disabled={isLoading}
                className="inline-block px-8 py-3 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
              >
                Ver Demonstração
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Formatos aceitos: .xlsx, .xls, .csv
            </p>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-300 rounded-lg flex gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-semibold text-red-900">Erro ao processar</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Dashboard */}
      {processedData.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* KPIs Section */}
          <div className="mb-10">
            <h2 className="text-lg font-bold text-gray-900 mb-5 uppercase tracking-wide">
              📊 Indicadores Chave de Desempenho
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <KPICard
                title="Ops. Únicas no Funil"
                value={filteredData.length}
                icon={<Target size={24} />}
                color="blue"
              />
              <KPICard
                title="Total Ações Ligadas"
                value={filteredData.reduce((sum, r) => sum + r['Qtd. Ações'], 0)}
                icon={<Zap size={24} />}
                color="green"
              />
              <KPICard
                title="Probabilidade ≥75%"
                value={filteredData.filter(r => {
                  const prob = parseFloat(r['Probabilidade']?.toString() || '0');
                  return prob >= 75;
                }).length}
                icon={<TrendingUp size={24} />}
                color="green"
              />
              <KPICard
                title="Valor Previsto Real"
                value={`R$ ${filteredData.reduce((sum, r) => sum + r['Valor Previsto'], 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                icon={<DollarSign size={24} />}
                color="blue"
              />
            </div>
          </div>

          {/* Charts Section */}
          <ChartsSection data={filteredData} />

          {/* Filters and Table */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Filters */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-gray-300 rounded-lg p-6 sticky top-28 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    🎛️ Filtros
                  </h3>
                  <button
                    onClick={resetFilters}
                    className="text-xs text-gray-600 hover:text-gray-900 font-semibold transition-colors"
                  >
                    Limpar
                  </button>
                </div>

                <div className="space-y-4">
                  <MultiSelectDropdown
                    label="Ano Previsão"
                    options={filterOptions.years}
                    selected={selectedYears}
                    onChange={setSelectedYears}
                  />
                  <MultiSelectDropdown
                    label="Mês Previsão"
                    options={filterOptions.months}
                    selected={selectedMonths}
                    onChange={setSelectedMonths}
                  />
                  <MultiSelectDropdown
                    label="Representante"
                    options={filterOptions.representatives}
                    selected={selectedRepresentatives}
                    onChange={setSelectedRepresentatives}
                  />
                  <MultiSelectDropdown
                    label="Responsável (Op.)"
                    options={filterOptions.responsible}
                    selected={selectedResponsible}
                    onChange={setSelectedResponsible}
                  />
                  <MultiSelectDropdown
                    label="Usuário Ação (ETN)"
                    options={filterOptions.actionUsers}
                    selected={selectedActionUsers}
                    onChange={setSelectedActionUsers}
                  />
                  <MultiSelectDropdown
                    label="Etapa (Funil)"
                    options={filterOptions.stages}
                    selected={selectedStages}
                    onChange={setSelectedStages}
                  />
                  <MultiSelectDropdown
                    label="Probabilidade"
                    options={filterOptions.probabilities}
                    selected={selectedProbabilities}
                    onChange={setSelectedProbabilities}
                  />
                  <MultiSelectDropdown
                    label="Qtd. de Ações"
                    options={filterOptions.actionCounts}
                    selected={selectedActionCounts}
                    onChange={setSelectedActionCounts}
                  />
                  <MultiSelectDropdown
                    label="Conta (Apenas c/ Ação)"
                    options={filterOptions.accounts}
                    selected={selectedAccounts}
                    onChange={setSelectedAccounts}
                  />
                </div>

                <label className="block mt-6">
                  <input
                    type="file"
                    multiple
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setOppFile(e.target.files[0]);
                        setOppFileName(e.target.files[0].name);
                      }
                    }}
                    className="hidden"
                  />
                  <span className="block px-4 py-2 bg-gray-100 text-gray-900 rounded text-center font-semibold hover:bg-gray-200 transition-colors cursor-pointer text-sm">
                    Carregar Novos Dados
                  </span>
                </label>
              </div>
            </div>

            {/* Table Section */}
            <div className="lg:col-span-3">
              <div className="bg-white border border-gray-300 rounded-lg p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                  📋 Grelha de Dados Analíticos
                </h3>
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Buscar por ID, Conta, Responsável, Usuário, Etapa, Mês..."
                    value={tableSearchTerm}
                    onChange={(e) => setTableSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <AnalyticsTable
                  data={filteredData}
                  searchTerm={tableSearchTerm}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
