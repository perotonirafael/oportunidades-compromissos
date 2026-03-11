import { useMemo } from 'react';

export interface GoalMetric {
  id: string;
  produto: string;
  rubrica: string;
  meta: number;
  realizado: number;
  percentual: number;
}

export function useGoalMetricsProcessor(
  goals: any[],
  pedidos: any[],
  processedData: any[],
  selectedPeriod: string,
  selectedUserId?: string,
): GoalMetric[] {
  return useMemo(() => {
    console.log('[GOAL METRICS]: Iniciando Motor Blindado...', {
      metas: goals?.length,
      pedidos: pedidos?.length,
      opps: processedData?.length,
      periodo: selectedPeriod,
      usuario: selectedUserId,
    });

    if (!goals?.length || !selectedUserId) return [];

    // --- UTILS BLINDADOS ---
    const normalizeString = (str: any) =>
      String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    // Remove decimais fantasmas de IDs (Ex: "11124.0" -> "11124")
    const normalizeId = (id: any) => {
      let str = String(id || '').trim();
      if (str.endsWith('.0')) str = str.slice(0, -2);
      return str;
    };

    const parseMoney = (val: any): number => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      let str = String(val).trim();
      if (str.includes(',')) str = str.replace(/\./g, '').replace(',', '.');
      const num = parseFloat(str);
      return Number.isNaN(num) ? 0 : num;
    };

    // Lê chaves de objetos mesmo se houver espaços ocultos nos cabeçalhos do CSV
    const getFuzzy = (obj: any, possibleKeys: string[]) => {
      if (!obj) return undefined;
      const normKeys = possibleKeys.map(normalizeString);
      for (const [key, val] of Object.entries(obj)) {
        if (normKeys.includes(normalizeString(key))) return val;
      }
      return undefined;
    };

    // Extrai o mês da data de fechamento para bater com o período selecionado
    const getMonthName = (dateStr: string) => {
      if (!dateStr) return '';
      let month = 0;
      if (dateStr.includes('/')) {
        const parts = dateStr.split(' ')[0].split('/');
        if (parts.length >= 2) month = parseInt(parts[1], 10);
      } else if (dateStr.includes('-')) {
        const parts = dateStr.split(' ')[0].split('-');
        if (parts[0].length === 4) month = parseInt(parts[1], 10); // YYYY-MM-DD
        else month = parseInt(parts[1], 10); // DD-MM-YYYY
      }
      const months = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      return month >= 1 && month <= 12 ? months[month - 1] : '';
    };

    // --- 1. RESOLVER IDENTIDADE ---
    let erpUserId = normalizeId(selectedUserId);

    if (Number.isNaN(Number(erpUserId))) {
      const searchName = normalizeString(selectedUserId);
      let foundId = '';

      for (const opp of processedData || []) {
        if (normalizeString(opp.responsavel) === searchName || normalizeString(opp.usuario) === searchName || normalizeString(opp.nome) === searchName) {
          foundId = opp.idErpUsuario || opp.idUsuario || opp['Id ERP Usuário'] || opp['Id Usuário ERP'];
        }
        if (!foundId && Array.isArray(opp.compromissos)) {
          const comp = opp.compromissos.find((c: any) => normalizeString(c.usuario || c.Usuario) === searchName);
          if (comp) foundId = comp.idErpUsuario || comp.idUsuario || comp['Id Usuário ERP'] || comp.idUsuarioErp;
        }
        if (!foundId && Array.isArray(opp.etns)) {
          const etn = opp.etns.find((e: any) => normalizeString(e.nome || e.usuario) === searchName);
          if (etn) foundId = etn.id || etn.idErpUsuario;
        }
        if (foundId) break;
      }

      if (foundId) erpUserId = normalizeId(foundId);
      else {
        // Fallback garantido para utilizadores conhecidos do vosso CRM
        const knownUsers: Record<string, string> = {
          'rafael perotoni': '11124',
          'filipe cardoso': '2642',
          'mariane sebaje': '9909',
          'carina bruder': '11191',
          'jonas pacheco': '11264',
        };
        erpUserId = knownUsers[searchName] || erpUserId;
      }
      console.log(`[GOAL METRICS]: Nome "${selectedUserId}" resolvido para ID ERP: "${erpUserId}"`);
    }

    // --- 2. MAPA DE RECONHECIMENTO ---
    const userOpportunities = new Map<string, number>();
    (processedData || []).forEach((opp) => {
      const id = normalizeId(opp.id || opp.oportunidadeId || opp.oppId || opp['Oportunidade ID']);
      if (id) {
        let rec = 100;
        if (opp.percentualReconhecimento !== undefined) {
          rec = Number(opp.percentualReconhecimento);
          if (Number.isNaN(rec) || rec <= 0) rec = 100;
        }
        userOpportunities.set(id, rec);
      }
    });

    // --- 3. DICIONÁRIO DE PRODUTOS ---
    const isSameProduct = (mStr: string, pStr: string) => {
      const m = normalizeString(mStr);
      const p = normalizeString(pStr);
      if (!m || !p) return false;
      if (m === p || m.includes(p) || p.includes(m)) return true;

      const syn: Record<string, string[]> = {
        hcm: ['hcm', 'gestao de pessoas', 'folha'],
        erp: ['erp', 'gestao empresarial', 'backoffice', 'sapiens'],
        acesso: ['acesso', 'seguranca', 'ronda', 'portaria'],
        ponto: ['ponto', 'marcacao'],
      };
      for (const terms of Object.values(syn)) {
        if (terms.some((t) => m.includes(t)) && terms.some((t) => p.includes(t))) return true;
      }
      return false;
    };

    // --- 4. PROCESSAR PEDIDOS (REALIZADO) ---
    const realizedMap = new Map<string, number>();
    const normSelectedPeriod = normalizeString(selectedPeriod);
    let pedidosProcessados = 0;

    (pedidos || []).forEach((pedido) => {
      const oppId = normalizeId(getFuzzy(pedido, ['ID OPORTUNIDADE', 'Oportunidade ID', 'idOportunidade']));

      if (oppId && userOpportunities.has(oppId)) {
        // Validação Temporal: O pedido tem de bater com o mês escolhido no Painel
        const dataFechamento = String(getFuzzy(pedido, ['DATA FECHAMENTO', 'Data Fechamento', 'Data']) || '');
        const mesPedido = getMonthName(dataFechamento);

        if (mesPedido && normSelectedPeriod !== 'total ano' && mesPedido !== normSelectedPeriod) {
          return; // Ignora se o pedido foi noutro mês (ex: Fechou em Fevereiro, painel está em Março)
        }

        pedidosProcessados++;
        const multiplier = (userOpportunities.get(oppId) || 100) / 100;
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

        if (licenca > 0) realizedMap.set(`${produto}|Setup + Licenças`, (realizedMap.get(`${produto}|Setup + Licenças`) || 0) + (licenca * multiplier));
        if (manutencao > 0) realizedMap.set(`${produto}|Recorrente`, (realizedMap.get(`${produto}|Recorrente`) || 0) + (manutencao * multiplier));
        if (servico > 0) realizedMap.set(`${produto}|Serviços Não Recorrentes`, (realizedMap.get(`${produto}|Serviços Não Recorrentes`) || 0) + (servico * multiplier));

        if (licenca === 0 && manutencao === 0 && servico === 0) {
          const valorFechado =
            parseMoney(getFuzzy(pedido, ['Valor Fechado', 'valorFechado'])) ||
            parseMoney(getFuzzy(pedido, ['VALOR TOTAL']));
          if (valorFechado > 0) realizedMap.set(`${produto}|Setup + Licenças`, (realizedMap.get(`${produto}|Setup + Licenças`) || 0) + (valorFechado * multiplier));
        }
      }
    });

    console.log(`[GOAL METRICS]: Pedidos válidos somados no período (${selectedPeriod}): ${pedidosProcessados}`);

    // --- 5. CRUZAR METAS ---
    const metrics: GoalMetric[] = [];

    (goals || []).forEach((goal) => {
      const gUserId = normalizeId(goal['Id Usuário ERP'] || goal['ID Usuário ERP'] || goal['Id Usuário'] || goal.idUsuario);

      if (gUserId === erpUserId) {
        const produtoMeta = String(goal.Produto || goal.produto || '').trim();
        const rubricaMeta = String(goal.Rubrica || goal.rubrica || '').trim();

        const periodKey = Object.keys(goal).find((k) => normalizeString(k) === normSelectedPeriod) || selectedPeriod;
        const metaValue = parseMoney(goal[periodKey] || goal[selectedPeriod.toLowerCase()]);

        if (metaValue > 0) {
          let realizadoValue = 0;
          const normRubricaMeta = normalizeString(rubricaMeta);

          for (const [key, val] of Array.from(realizedMap.entries())) {
            const [p, r] = key.split('|');
            if (normalizeString(r) === normRubricaMeta && isSameProduct(produtoMeta, p)) {
              realizadoValue += val;
            }
          }

          metrics.push({
            id: `${produtoMeta}-${rubricaMeta}-${selectedPeriod}`,
            produto: produtoMeta,
            rubrica: rubricaMeta,
            meta: metaValue,
            realizado: realizadoValue,
            percentual: (realizadoValue / metaValue) * 100,
          });
        }
      }
    });

    return metrics.sort((a, b) => b.percentual - a.percentual);
  }, [goals, pedidos, processedData, selectedPeriod, selectedUserId]);
}
