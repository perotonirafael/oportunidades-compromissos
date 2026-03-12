import { useMemo } from 'react';

export interface GoalMetric {
  id: string;
  produto: string;
  rubrica: string;
  meta: number;
  realizado: number;
  percentual: number;
  debugInfo?: any;
}

export function useGoalMetricsProcessor(
  goals: any[],
  pedidos: any[],
  processedData: any[],
  selectedPeriod: string,
  selectedUserId?: string,
): GoalMetric[] {
  return useMemo(() => {
    console.log('🎯 [GOAL METRICS]: Motor Analítico Profundo Iniciado...', {
      metasSize: goals?.length || 0,
      pedidosSize: pedidos?.length || 0,
      oppsSize: processedData?.length || 0,
      periodoSelecionado: selectedPeriod,
      usuarioId: selectedUserId,
    });

    // TRAVA 1: Se os arquivos de metas não estiverem na memória
    if (!goals || goals.length === 0) {
      console.error('❌ [ERRO CRÍTICO]: O array de Metas está VAZIO! Se recarregou a página, os arquivos de Metas e Pedidos se perderam do cache. Por favor, faça o upload dos 4 arquivos novamente em "Novo Upload".');
      return [];
    }

    if (!selectedUserId) return [];

    // --- 1. UTILS BLINDADOS ---
    const normalizeString = (str: any) =>
      String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    const condense = (str: any) => normalizeString(str).replace(/\s+/g, '');

    const normalizeId = (id: any) => {
      let str = String(id || '').trim();
      if (str.endsWith('.0')) str = str.slice(0, -2);
      return str;
    };

    const parseMoney = (val: any): number => {
      if (val === null || val === undefined || val === '') return 0;
      if (typeof val === 'number') return val;
      let str = String(val).trim();
      str = str.replace(/[^\d,\.-]/g, '');
      if (str.includes(',')) {
        str = str.replace(/\./g, '').replace(',', '.');
      }
      const num = parseFloat(str);
      return Number.isNaN(num) ? 0 : num;
    };

    const getFuzzy = (obj: any, possibleKeys: string[]) => {
      if (!obj) return undefined;
      const normKeys = possibleKeys.map(normalizeString);
      for (const [key, val] of Object.entries(obj)) {
        if (normKeys.includes(normalizeString(key))) return val;
      }
      return undefined;
    };

    // --- 2. TRADUTOR DE COLUNAS DE PERÍODO (UI -> EXCEL) ---
    // Resolve o descasamento entre "1º Trimestre" (Painel) e "1ºTri" (Planilha)
    const resolveExcelColumn = (period: string) => {
      const norm = condense(period);
      if (norm.includes('1otri')) return '1ºTri';
      if (norm.includes('2otri')) return '2ºTri';
      if (norm.includes('3otri')) return '3ºTri';
      if (norm.includes('4otri')) return '4ºTri';
      if (norm.includes('total')) return 'Total Ano';

      const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const found = months.find((m) => normalizeString(m) === normalizeString(period));
      return found || period;
    };

    const exactExcelCol = resolveExcelColumn(selectedPeriod);

    // --- 3. INTELIGÊNCIA TEMPORAL DE PEDIDOS ---
    const getMonthName = (dateStr: string) => {
      if (!dateStr) return '';
      let month = 0;
      if (dateStr.includes('/')) {
        const parts = dateStr.split(' ')[0].split('/');
        if (parts.length >= 2) month = parseInt(parts[1], 10);
      } else if (dateStr.includes('-')) {
        const parts = dateStr.split(' ')[0].split('-');
        if (parts[0].length === 4) month = parseInt(parts[1], 10);
        else month = parseInt(parts[1], 10);
      }
      const months = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      return month >= 1 && month <= 12 ? months[month - 1] : '';
    };

    const isPeriodMatch = (mesPedido: string, selected: string) => {
      if (!mesPedido) return true;
      const s = normalizeString(selected);
      if (s === 'total ano') return true;
      if (s === mesPedido) return true;

      const trimestres: Record<string, string[]> = {
        '1ºtri': ['janeiro', 'fevereiro', 'marco'],
        '1º trimestre': ['janeiro', 'fevereiro', 'marco'],
        '2ºtri': ['abril', 'maio', 'junho'],
        '2º trimestre': ['abril', 'maio', 'junho'],
        '3ºtri': ['julho', 'agosto', 'setembro'],
        '3º trimestre': ['julho', 'agosto', 'setembro'],
        '4ºtri': ['outubro', 'novembro', 'dezembro'],
        '4º trimestre': ['outubro', 'novembro', 'dezembro'],
      };

      for (const [key, months] of Object.entries(trimestres)) {
        if ((s.includes(key.substring(0, 2)) || s === key) && months.includes(mesPedido)) return true;
      }
      return false;
    };

    // --- 4. RESOLVER IDENTIDADE ---
    let erpUserId = normalizeId(selectedUserId);

    if (Number.isNaN(Number(erpUserId))) {
      const searchName = normalizeString(selectedUserId);
      const knownUsers: Record<string, string> = {
        'rafael perotoni': '11124',
        'filipe cardoso': '2642',
        'mariane sebaje': '9909',
        'carina bruder': '11191',
        'jonas pacheco': '11264',
        'stefanie christen': '10655',
        'gisele silva': '10563',
      };
      erpUserId = knownUsers[searchName] || erpUserId;
    }

    // --- 5. MAPA DE RECONHECIMENTO ---
    const userOpportunities = new Map<string, number>();
    (processedData || []).forEach((opp) => {
      const id = normalizeId(opp.id || opp.oportunidadeId || opp.oppId || opp['Oportunidade ID']);
      if (id) {
        let rec = Number(opp.percentualReconhecimento);
        if (Number.isNaN(rec) || rec <= 0) rec = 100;
        userOpportunities.set(id, rec);
      }
    });

    // --- 6. DICIONÁRIO DE PRODUTOS ---
    const isSameProduct = (mStr: string, pStr: string) => {
      const m = normalizeString(mStr);
      const p = normalizeString(pStr);
      if (!m || !p) return false;
      if (m === p || m.includes(p) || p.includes(m)) return true;

      const syn: Record<string, string[]> = {
        hcm: ['hcm', 'gestao de pessoas', 'folha', 'seniorx'],
        erp: ['erp', 'gestao empresarial', 'backoffice', 'sapiens'],
        acesso: ['acesso', 'seguranca', 'ronda', 'portaria'],
        ponto: ['ponto', 'marcacao'],
      };
      for (const terms of Object.values(syn)) {
        if (terms.some((t) => m.includes(t)) && terms.some((t) => p.includes(t))) return true;
      }
      return false;
    };

    // --- 7. PROCESSAR PEDIDOS (REALIZADO) ---
    const realizedMap = new Map<string, number>();

    (pedidos || []).forEach((pedido) => {
      const oppId = normalizeId(getFuzzy(pedido, ['ID OPORTUNIDADE', 'Oportunidade ID', 'idOportunidade']));
      const pedidoOwnerId = normalizeId(getFuzzy(pedido, ['ID ERP PROPRIETARIO', 'Id ERP Proprietário', 'Id Proprietario', 'idErpProprietario']));

      const isOwner = pedidoOwnerId === erpUserId;
      const isETN = Boolean(oppId) && userOpportunities.has(oppId);

      if (isOwner || isETN) {
        const dataFechamento = String(getFuzzy(pedido, ['DATA FECHAMENTO', 'Data Fechamento', 'Data']) || '');
        const mesPedido = getMonthName(dataFechamento);

        if (!isPeriodMatch(mesPedido, selectedPeriod)) return;

        const multiplier = isOwner ? 1 : ((userOpportunities.get(oppId) || 100) / 100);
        const produto = String(getFuzzy(pedido, ['PRODUTO', 'Produto', 'produto']) || 'Diversos').trim();

        const licenca =
          parseMoney(getFuzzy(pedido, ['PRODUTO - VALOR LICENCA', 'produtoValorLicenca'])) ||
          parseMoney(getFuzzy(pedido, ['PRODUTO - VALOR LICENCA CANAL', 'produtoValorLicencaCanal']));
        const manutencao =
          parseMoney(getFuzzy(pedido, ['PRODUTO - VALOR MANUTENCAO', 'produtoValorManutencao'])) ||
          parseMoney(getFuzzy(pedido, ['PRODUTO - VALOR MANUTENCAO CANAL', 'produtoValorManutencaoCanal']));

        let servico = parseMoney(getFuzzy(pedido, ['SERVICO - VALOR TOTAL', 'servicoValorLiquido']));
        if (servico === 0) {
          servico = parseMoney(getFuzzy(pedido, ['SERVICO - QTDE DE HORAS', 'servicoQtdeDeHoras'])) * parseMoney(getFuzzy(pedido, ['SERVICO - VALOR HORA', 'servicoValorHora']));
        }

        let addedSpecific = false;
        if (licenca > 0) { realizedMap.set(`${produto}|Setup + Licenças`, (realizedMap.get(`${produto}|Setup + Licenças`) || 0) + (licenca * multiplier)); addedSpecific = true; }
        if (manutencao > 0) { realizedMap.set(`${produto}|Recorrente`, (realizedMap.get(`${produto}|Recorrente`) || 0) + (manutencao * multiplier)); addedSpecific = true; }
        if (servico > 0) { realizedMap.set(`${produto}|Serviços Não Recorrentes`, (realizedMap.get(`${produto}|Serviços Não Recorrentes`) || 0) + (servico * multiplier)); addedSpecific = true; }

        if (!addedSpecific) {
          const valorFechado =
            parseMoney(getFuzzy(pedido, ['Valor Fechado', 'VALOR TOTAL', 'VALOR LIQUIDO', 'valorFechado'])) ||
            parseMoney(getFuzzy(pedido, ['valorFechado']));
          if (valorFechado > 0) {
            realizedMap.set(`${produto}|Genérico`, (realizedMap.get(`${produto}|Genérico`) || 0) + (valorFechado * multiplier));
          }
        }
      }
    });

    // --- 8. CRUZAR METAS E GERAR AUDITORIA VISUAL ---
    const metrics: GoalMetric[] = [];
    const debugListaMetas: any[] = [];

    (goals || []).forEach((goal) => {
      const gUserId = normalizeId(getFuzzy(goal, ['Id Usuário ERP', 'ID Usuário ERP', 'Id Usuário', 'Id Usuario', 'ID ERP', 'idUsuario']));

      if (gUserId === erpUserId) {
        const produtoMeta = String(getFuzzy(goal, ['Produto', 'PRODUTO', 'produto']) || '').trim();
        const rubricaMeta = String(getFuzzy(goal, ['Rubrica', 'RUBRICA', 'rubrica']) || '').trim();

        const metaRawValue = goal[exactExcelCol] !== undefined ? goal[exactExcelCol] : getFuzzy(goal, [exactExcelCol, selectedPeriod]);
        const metaValue = parseMoney(metaRawValue);

        let realizadoValue = 0;
        const condRubricaMeta = condense(rubricaMeta);

        for (const [key, val] of Array.from(realizedMap.entries())) {
          const [p, r] = key.split('|');
          const condR = condense(r);
          if ((condR === condRubricaMeta || condR === 'generico') && isSameProduct(produtoMeta, p)) {
            realizadoValue += val;
          }
        }

        const percentual = metaValue > 0 ? (realizadoValue / metaValue) * 100 : (realizadoValue > 0 ? 100 : 0);

        // FORÇAMOS a exibição no gráfico mesmo se a meta for zero, para que você possa ver!
        if (produtoMeta && rubricaMeta) {
          metrics.push({
            id: `${produtoMeta}-${rubricaMeta}-${selectedPeriod}-${Math.random()}`,
            produto: produtoMeta,
            rubrica: rubricaMeta,
            meta: metaValue,
            realizado: realizadoValue,
            percentual,
            debugInfo: {
              colunaBuscada: exactExcelCol,
              valorPlanilhaRaw: metaRawValue,
            },
          });

          // Prepara a tabela de auditoria para o Console
          debugListaMetas.push({
            'Produto Meta': produtoMeta,
            Rubrica: rubricaMeta,
            'Coluna Buscada': exactExcelCol,
            'Valor Planilha (Raw)': metaRawValue,
            'Meta Lida': metaValue,
            'Valor Realizado': realizadoValue,
            Atingimento: `${percentual.toFixed(2)}%`,
          });
        }
      }
    });

    // 🚀 O TESTE DEFINITIVO: Tabela no Console (F12)
    if (debugListaMetas.length > 0) {
      console.log(`✅ [AUDITORIA DE METAS] Usuário ID: ${erpUserId} | Período: ${selectedPeriod} (Planilha: ${exactExcelCol})`);
      console.table(debugListaMetas);
    } else {
      console.warn(`⚠️ [AVISO]: O Usuário ID ${erpUserId} não possui nenhuma linha atrelada a ele na planilha de Metas.`);
    }

    return metrics.sort((a, b) => b.percentual - a.percentual);
  }, [goals, pedidos, processedData, selectedPeriod, selectedUserId]);
}
