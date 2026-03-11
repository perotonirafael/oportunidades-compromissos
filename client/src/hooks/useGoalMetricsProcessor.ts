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
    console.log('🚀 [GOAL METRICS]: Motor Blindado V3 Iniciado...', {
      metasSize: goals?.length,
      pedidosSize: pedidos?.length,
      oppsSize: processedData?.length,
      periodoSelecionado: selectedPeriod,
      usuarioId: selectedUserId,
    });

    if (!goals?.length || !selectedUserId) return [];

    // --- 1. UTILS SUPER BLINDADOS ---
    // Remove acentos e converte para minúsculas
    const normalizeString = (str: any) =>
      String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    // Remove espaços para bater chaves complexas (ex: "Setup + Licenças" -> "setup+licencas")
    const condense = (str: any) => normalizeString(str).replace(/\s+/g, '');

    // Remove casas decimais espúrias de IDs (Ex: "11124.0" -> "11124")
    const normalizeId = (id: any) => {
      let str = String(id || '').trim();
      if (str.endsWith('.0')) str = str.slice(0, -2);
      return str;
    };

    // Parser financeiro à prova de lixo (R$, €, espaços)
    const parseMoney = (val: any): number => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      let str = String(val).trim();
      str = str.replace(/[^\d,\.-]/g, ''); // Mantém só números, vírgula, ponto e sinal negativo
      if (str.includes(',')) {
        str = str.replace(/\./g, '').replace(',', '.'); // Formato PT-BR para JS
      }
      const num = parseFloat(str);
      return Number.isNaN(num) ? 0 : num;
    };

    // Buscador tolerante a cabeçalhos mal formatados no CSV
    const getFuzzy = (obj: any, possibleKeys: string[]) => {
      if (!obj) return undefined;
      const normKeys = possibleKeys.map(normalizeString);
      for (const [key, val] of Object.entries(obj)) {
        if (normKeys.includes(normalizeString(key))) return val;
      }
      return undefined;
    };

    // --- 2. INTELIGÊNCIA TEMPORAL (Mês e Trimestre) ---
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
      if (!mesPedido) return true; // Na dúvida, não perde o dinheiro
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

    // --- 3. RESOLVER IDENTIDADE (A busca implacável do ID) ---
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
      console.log(`[GOAL METRICS]: Tradução de utilizador: "${selectedUserId}" -> "${erpUserId}"`);
    }

    // --- 4. MAPA DE RECONHECIMENTO (Oportunidades do utilizador) ---
    const userOpportunities = new Map<string, number>();
    (processedData || []).forEach((opp) => {
      const id = normalizeId(opp.id || opp.oportunidadeId || opp.oppId || opp['Oportunidade ID']);
      if (id) {
        let rec = Number(opp.percentualReconhecimento);
        if (Number.isNaN(rec) || rec <= 0) rec = 100;
        userOpportunities.set(id, rec);
      }
    });

    // --- 5. DICIONÁRIO DE PRODUTOS ---
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

    // --- 6. PROCESSAR PEDIDOS (REALIZADO) ---
    const realizedMap = new Map<string, number>();
    let pedidosProcessados = 0;

    (pedidos || []).forEach((pedido) => {
      const oppId = normalizeId(getFuzzy(pedido, ['ID OPORTUNIDADE', 'Oportunidade ID', 'idOportunidade']));
      const pedidoOwnerId = normalizeId(getFuzzy(pedido, ['ID ERP PROPRIETARIO', 'Id ERP Proprietário', 'Id Proprietario', 'idErpProprietario']));

      const isOwner = pedidoOwnerId === erpUserId;
      const isETN = Boolean(oppId) && userOpportunities.has(oppId);

      // Regra Ouro: Se for o dono do pedido OU participou na oportunidade, ganha dinheiro!
      if (isOwner || isETN) {
        const dataFechamento = String(getFuzzy(pedido, ['DATA FECHAMENTO', 'Data Fechamento', 'Data']) || '');
        const mesPedido = getMonthName(dataFechamento);

        if (!isPeriodMatch(mesPedido, selectedPeriod)) return; // Bloqueia pedidos de meses fora da Meta

        pedidosProcessados++;
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

        // Se todas as colunas acima estão a zero, mas existe "Valor Fechado" (ex: os teus R$ 169,00)
        if (!addedSpecific) {
          const valorFechado =
            parseMoney(getFuzzy(pedido, ['Valor Fechado', 'valorFechado'])) ||
            parseMoney(getFuzzy(pedido, ['VALOR TOTAL']));
          if (valorFechado > 0) {
            // Marca como Genérico. Vai abastecer qualquer meta deste produto.
            realizedMap.set(`${produto}|Genérico`, (realizedMap.get(`${produto}|Genérico`) || 0) + (valorFechado * multiplier));
          }
        }
      }
    });

    console.log(`[GOAL METRICS]: Pedidos validados para ${selectedPeriod}: ${pedidosProcessados}`);

    // --- 7. CRUZAR METAS ---
    const metrics: GoalMetric[] = [];

    (goals || []).forEach((goal) => {
      const gUserId = normalizeId(getFuzzy(goal, ['Id Usuário ERP', 'ID Usuário ERP', 'Id Usuário', 'Id Usuario', 'ID ERP', 'idUsuario']));

      if (gUserId === erpUserId) {
        const produtoMeta = String(getFuzzy(goal, ['Produto', 'PRODUTO', 'produto']) || '').trim();
        const rubricaMeta = String(getFuzzy(goal, ['Rubrica', 'RUBRICA', 'rubrica']) || '').trim();

        // Localiza a coluna exata do mês/trimestre selecionado na planilha
        const periodKey = Object.keys(goal).find((k) => condense(k) === condense(selectedPeriod)) || selectedPeriod;
        const metaValue = parseMoney(goal[periodKey] || goal[selectedPeriod.toLowerCase()]);

        if (metaValue > 0) {
          let realizadoValue = 0;
          const condRubricaMeta = condense(rubricaMeta);

          for (const [key, val] of Array.from(realizedMap.entries())) {
            const [p, r] = key.split('|');
            const condR = condense(r);

            // Aceita a rubrica exata OU se for "Genérico" (veio apenas do campo Valor Fechado)
            if ((condR === condRubricaMeta || condR === 'generico') && isSameProduct(produtoMeta, p)) {
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
