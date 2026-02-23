import { useMemo } from 'react';

export interface Opportunity {
  [key: string]: any;
  'ID Oportunidade'?: string;
  'Oportunidade ID'?: string;
  'Conta ID'?: string;
  'Conta'?: string;
  'Responsável'?: string;
  'Representante'?: string;
  'Etapa'?: string;
  'Probabilidade'?: string | number;
  'Previsão de Fechamento'?: string;
  'Valor Previsto'?: string | number;
}

export interface Action {
  [key: string]: any;
  'Oportunidade ID'?: string;
  'Conta ID'?: string;
  'Usuário Ação'?: string;
  'Data Ação'?: string;
}

export interface ProcessedRecord {
  'ID Oportunidade': string;
  'Conta': string;
  'Responsável': string;
  'Usuário Ação': string;
  'Etapa': string;
  'Probabilidade': string;
  'Ano Previsão': string;
  'Mês Previsão': string;
  'Mês Fech.': string;
  'Valor Previsto': number;
  'Qtd. Ações': number;
  _opportunityId: string;
  _accountId: string;
  _uniqueOpportunityId: string;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function extractMonthYear(dateStr: string): { month: string; year: string; monthNum: number } {
  if (!dateStr) return { month: '', year: '', monthNum: 0 };
  
  // Tenta diferentes formatos: DD/MM/YYYY, YYYY-MM-DD, etc.
  let date: Date | null = null;
  
  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/');
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  } else if (dateStr.includes('-')) {
    date = new Date(dateStr);
  }
  
  if (!date || isNaN(date.getTime())) {
    return { month: '', year: '', monthNum: 0 };
  }
  
  const monthNum = date.getMonth() + 1;
  return {
    month: MONTH_NAMES[monthNum - 1],
    year: date.getFullYear().toString(),
    monthNum
  };
}

function findMatchingOpportunity(
  action: Action,
  opportunities: Opportunity[]
): Opportunity | null {
  const oppId = action['Oportunidade ID'];
  const accountId = action['Conta ID'];
  
  // Primeiro tenta match por Oportunidade ID
  if (oppId) {
    const match = opportunities.find(opp => 
      opp['ID Oportunidade']?.toString() === oppId?.toString() ||
      opp['Oportunidade ID']?.toString() === oppId?.toString()
    );
    if (match) return match;
  }
  
  // Fallback para Conta ID
  if (accountId) {
    const match = opportunities.find(opp => 
      opp['Conta ID']?.toString() === accountId?.toString()
    );
    if (match) return match;
  }
  
  return null;
}

export function useDataProcessor(
  opportunities: Opportunity[],
  actions: Action[]
) {
  return useMemo(() => {
    if (!opportunities.length || !actions.length) {
      return {
        processedData: [],
        kpis: {
          uniqueOps: 0,
          totalActions: 0,
          hotOps: 0,
          totalValue: 0
        },
        filterOptions: {
          years: [],
          months: [],
          representatives: [],
          responsible: [],
          actionUsers: [],
          stages: [],
          probabilities: [],
          actionCounts: [],
          accounts: []
        }
      };
    }

    const processedData: ProcessedRecord[] = [];
    const uniqueOpportunityIds = new Set<string>();
    const uniqueOpportunityValues = new Map<string, number>();
    const actionUsersByOpp = new Map<string, Set<string>>();
    const accountsByOpp = new Map<string, string>();
    
    // Mapa para rastrear quais contas têm ações
    const accountsWithActions = new Set<string>();

    // Primeiro passe: processar ações e criar registros
    for (const action of actions) {
      const opp = findMatchingOpportunity(action, opportunities);
      
      if (!opp) continue;

      const oppId = opp['ID Oportunidade'] || opp['Oportunidade ID'] || 'Unknown';
      const accountId = opp['Conta ID'] || '';
      const account = opp['Conta'] || '';
      
      accountsWithActions.add(account);
      
      const { month, year, monthNum } = extractMonthYear(
        opp['Previsão de Fechamento']?.toString() || ''
      );

      const userAction = action['Usuário Ação'] || 'Sem Ação';
      
      // Rastrear usuários por oportunidade
      if (!actionUsersByOpp.has(oppId)) {
        actionUsersByOpp.set(oppId, new Set());
      }
      actionUsersByOpp.get(oppId)!.add(userAction);
      
      accountsByOpp.set(oppId, account);
      
      // Rastrear valor único por oportunidade
      if (!uniqueOpportunityValues.has(oppId)) {
        const value = parseFloat(opp['Valor Previsto']?.toString() || '0') || 0;
        uniqueOpportunityValues.set(oppId, value);
      }

      const record: ProcessedRecord = {
        'ID Oportunidade': oppId,
        'Conta': account,
        'Responsável': opp['Responsável'] || opp['Representante'] || '',
        'Usuário Ação': userAction,
        'Etapa': opp['Etapa'] || '',
        'Probabilidade': opp['Probabilidade']?.toString() || '',
        'Ano Previsão': year,
        'Mês Previsão': monthNum.toString(),
        'Mês Fech.': month,
        'Valor Previsto': parseFloat(opp['Valor Previsto']?.toString() || '0') || 0,
        'Qtd. Ações': actionUsersByOpp.get(oppId)?.size || 0,
        _opportunityId: oppId,
        _accountId: accountId,
        _uniqueOpportunityId: oppId
      };

      processedData.push(record);
    }

    // Adicionar oportunidades sem ações
    for (const opp of opportunities) {
      const oppId = opp['ID Oportunidade'] || opp['Oportunidade ID'] || 'Unknown';
      
      // Se já foi processada, pula
      if (actionUsersByOpp.has(oppId)) continue;

      const { month, year, monthNum } = extractMonthYear(
        opp['Previsão de Fechamento']?.toString() || ''
      );

      const account = opp['Conta'] || '';
      const accountId = opp['Conta ID'] || '';

      uniqueOpportunityValues.set(oppId, parseFloat(opp['Valor Previsto']?.toString() || '0') || 0);

      const record: ProcessedRecord = {
        'ID Oportunidade': oppId,
        'Conta': account,
        'Responsável': opp['Responsável'] || opp['Representante'] || '',
        'Usuário Ação': 'Sem Ação',
        'Etapa': opp['Etapa'] || '',
        'Probabilidade': opp['Probabilidade']?.toString() || '',
        'Ano Previsão': year,
        'Mês Previsão': monthNum.toString(),
        'Mês Fech.': month,
        'Valor Previsto': parseFloat(opp['Valor Previsto']?.toString() || '0') || 0,
        'Qtd. Ações': 0,
        _opportunityId: oppId,
        _accountId: accountId,
        _uniqueOpportunityId: oppId
      };

      processedData.push(record);
    }

    // Calcular KPIs
    const uniqueOps = uniqueOpportunityValues.size;
    const totalActions = actions.length;
    const totalValue = Array.from(uniqueOpportunityValues.values()).reduce((a, b) => a + b, 0);
    const hotOps = processedData.filter(r => {
      const prob = parseFloat(r['Probabilidade']?.toString() || '0');
      return prob >= 75;
    }).length;

    // Extrair opções de filtro
    const yearsSet = new Set<string>();
    const monthsSet = new Set<string>();
    const representativesSet = new Set<string>();
    const responsibleSet = new Set<string>();
    const actionUsersSet = new Set<string>();
    const stagesSet = new Set<string>();
    const probabilitiesSet = new Set<string>();
    const actionCountsSet = new Set<string>();

    for (const record of processedData) {
      if (record['Ano Previsão']) yearsSet.add(record['Ano Previsão']);
      if (record['Mês Previsão']) monthsSet.add(record['Mês Previsão']);
      if (record['Responsável']) responsibleSet.add(record['Responsável']);
      if (record['Usuário Ação']) actionUsersSet.add(record['Usuário Ação']);
      if (record['Etapa']) stagesSet.add(record['Etapa']);
      if (record['Probabilidade']) probabilitiesSet.add(record['Probabilidade']);
      
      const actionCount = record['Qtd. Ações'];
      if (actionCount === 0) actionCountsSet.add('0');
      else if (actionCount === 1) actionCountsSet.add('1');
      else if (actionCount === 2) actionCountsSet.add('2');
      else actionCountsSet.add('3+');
    }

    // Extrair representantes da base original
    for (const opp of opportunities) {
      const rep = opp['Representante'] || '';
      if (rep) representativesSet.add(rep);
    }

    return {
      processedData,
      kpis: {
        uniqueOps,
        totalActions,
        hotOps,
        totalValue
      },
      filterOptions: {
        years: Array.from(yearsSet).sort(),
        months: Array.from(monthsSet).map(Number).sort((a, b) => a - b).map(String),
        representatives: Array.from(representativesSet).sort(),
        responsible: Array.from(responsibleSet).sort(),
        actionUsers: Array.from(actionUsersSet).sort(),
        stages: Array.from(stagesSet).sort(),
        probabilities: Array.from(probabilitiesSet).sort(),
        actionCounts: ['0', '1', '2', '3+'].filter(c => actionCountsSet.has(c)),
        accounts: Array.from(accountsWithActions).sort()
      }
    };
  }, [opportunities, actions]);
}
