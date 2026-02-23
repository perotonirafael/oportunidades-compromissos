import { useState, useCallback } from 'react';
import { Upload, AlertCircle, TrendingUp, Target, Zap, DollarSign } from 'lucide-react';
import * as XLSX from 'xlsx';
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

export default function Home() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableSearchTerm, setTableSearchTerm] = useState('');

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

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      // Usar setTimeout para liberar o event loop e permitir animações
      await new Promise(resolve => setTimeout(resolve, 50));

      const fileArray = Array.from(files);
      const newOpportunities: Opportunity[] = [];
      const newActions: Action[] = [];

      for (const file of fileArray) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        // Processar cada sheet
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(worksheet) as any[];

          // Heurística: se tem 'Oportunidade ID' ou 'ID Oportunidade', é base de oportunidades
          // Se tem 'Usuário Ação', é base de ações
          if (data.length > 0) {
            const firstRow = data[0];
            const hasOppId = 'Oportunidade ID' in firstRow || 'ID Oportunidade' in firstRow;
            const hasActionUser = 'Usuário Ação' in firstRow;

            if (hasActionUser) {
              newActions.push(...data);
            } else if (hasOppId) {
              newOpportunities.push(...data);
            }
          }
        }
      }

      if (newOpportunities.length === 0 && newActions.length === 0) {
        setError('Nenhum dado válido encontrado nos arquivos. Certifique-se de que contêm as colunas esperadas.');
      } else {
        setOpportunities(newOpportunities);
        setActions(newActions);
      }
    } catch (err) {
      setError(`Erro ao processar arquivo: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      {opportunities.length === 0 && actions.length === 0 && (
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-16 text-center bg-gradient-to-br from-gray-50 to-white">
            <div className="inline-block p-3 bg-gray-100 rounded-lg mb-6">
              <Upload className="text-gray-600" size={48} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Carregue seus arquivos Excel
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Selecione os arquivos com as bases de Oportunidades e Ações/Compromissos. O sistema processará os dados em tempo real no seu navegador.
            </p>
            <label className="inline-block">
              <input
                type="file"
                multiple
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                disabled={isLoading}
                className="hidden"
              />
              <span className="inline-block px-8 py-3 bg-gray-900 text-white rounded font-semibold hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50 shadow-sm">
                {isLoading ? 'Processando...' : 'Selecionar Arquivos'}
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-6">
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
      {opportunities.length > 0 && actions.length > 0 && (
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
                    options={filterOptions.months.map(m => MONTH_NAMES[parseInt(m) - 1])}
                    selected={selectedMonths.map(m => {
                      const idx = MONTH_NAMES.indexOf(m);
                      return (idx + 1).toString();
                    })}
                    onChange={(selected) => {
                      const monthNums = selected.map(m => {
                        const idx = MONTH_NAMES.indexOf(m);
                        return (idx + 1).toString();
                      });
                      setSelectedMonths(monthNums);
                    }}
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

                {/* Upload New File */}
                <div className="mt-6 pt-6 border-t border-gray-300">
                  <label className="block">
                    <input
                      type="file"
                      multiple
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      disabled={isLoading}
                      className="hidden"
                    />
                    <span className="block w-full px-3 py-2 bg-gray-100 text-gray-900 rounded text-sm font-medium hover:bg-gray-200 transition-colors cursor-pointer text-center disabled:opacity-50">
                      {isLoading ? 'Processando...' : 'Carregar Novos Dados'}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Table Section */}
            <div className="lg:col-span-3">
              <div className="mb-5">
                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                  Pesquisa Dinâmica
                </label>
                <input
                  type="text"
                  placeholder="Buscar por ID, Conta, Responsável, Usuário, Etapa, Mês..."
                  value={tableSearchTerm}
                  onChange={(e) => setTableSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">
                📋 Grelha de Dados Analíticos
              </h3>

              <AnalyticsTable
                data={filteredData}
                searchTerm={tableSearchTerm}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Nota: Componente ChartsSection renderiza gráficos Recharts com:
// - Gráfico de barras: Oportunidades por Etapa
// - Gráfico de pizza: Distribuição por Probabilidade
// - Gráfico de barras horizontal: Ações por Usuário (Top 8)
// - Gráfico de linhas: Valor Previsto por Mês
