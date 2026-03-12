import { useMemo } from 'react';
import type { GoalRecord, PedidoRecord } from '@/types/goals';

export interface GoalMetric {
  id: string;
  produto: string;
  rubrica: string;
  meta: number;
  realizado: number;
  percentual: number;
}

const normalize = (value: unknown): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const normalizeId = (value: unknown): string => {
  const str = String(value ?? '').trim();
  return str.endsWith('.0') ? str.slice(0, -2) : str;
};

const parseMoney = (value: unknown): number => {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return value;
  let text = String(value).trim().replace(/[^\d,.-]/g, '');
  if (text.includes(',')) text = text.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(text);
  return Number.isNaN(num) ? 0 : num;
};

const normalizeRubrica = (rubrica: string): 'setup+licencas' | 'recorrente' | 'servicosnaorecorrentes' | 'generico' => {
  const base = normalize(rubrica).replace(/\s+/g, '');
  if (base.includes('recorrente') && !base.includes('naorecorrente')) return 'recorrente';
  if (base.includes('servicosnaorecorrentes') || (base.includes('servico') && base.includes('naorecorrente'))) return 'servicosnaorecorrentes';
  if (base.includes('generico')) return 'generico';
  return 'setup+licencas';
};

const periodValue = (goal: GoalRecord, selectedPeriod: string): number => {
  const p = normalize(selectedPeriod);
  if (p === 'janeiro') return goal.janeiro;
  if (p === 'fevereiro') return goal.fevereiro;
  if (p === 'marco') return goal.marco;
  if (p === 'abril') return goal.abril;
  if (p === 'maio') return goal.maio;
  if (p === 'junho') return goal.junho;
  if (p === 'julho') return goal.julho;
  if (p === 'agosto') return goal.agosto;
  if (p === 'setembro') return goal.setembro;
  if (p === 'outubro') return goal.outubro;
  if (p === 'novembro') return goal.novembro;
  if (p === 'dezembro') return goal.dezembro;
  if (p.includes('1') && p.includes('tri')) return goal.primeiroTrimestre;
  if (p.includes('2') && p.includes('tri')) return goal.segundoTrimestre;
  if (p.includes('3') && p.includes('tri')) return goal.terceiroTrimestre;
  if (p.includes('4') && p.includes('tri')) return goal.quartoTrimestre;
  if (p.includes('total')) return goal.totalAno;
  return 0;
};

export function useGoalMetricsProcessor(
  goals: GoalRecord[],
  pedidos: PedidoRecord[],
  processedData: any[],
  selectedPeriod: string,
  selectedUserId?: string,
): GoalMetric[] {
  return useMemo(() => {
    if (!goals?.length || !selectedUserId) return [];

    const selectedId = normalizeId(selectedUserId);

    // Mapa de oportunidades em que o usuário participou (via processedData)
    const userOpportunities = new Map<string, number>();
    for (const opp of processedData || []) {
      const oppId = normalizeId(opp.oppId || opp.id || opp.oportunidadeId || opp['Oportunidade ID']);
      if (!oppId) continue;

      const oppUserId = normalizeId(opp.idUsuario || opp.idErpUsuario || opp['Id Usuário ERP']);
      if (oppUserId && oppUserId !== selectedId) continue;

      const rec = Number(opp.percentualReconhecimento);
      userOpportunities.set(oppId, Number.isNaN(rec) || rec <= 0 ? 100 : rec);
    }

    // Realizado por Produto|Categoria
    const realizedMap = new Map<string, number>();

    for (const pedido of pedidos || []) {
      const ownerId = normalizeId((pedido as any).idErpProprietario ?? (pedido as any)['ID ERP PROPRIETARIO']);
      const oppId = normalizeId((pedido as any).idOportunidade ?? (pedido as any)['ID OPORTUNIDADE']);

      const isOwner = ownerId === selectedId;
      const isParticipant = oppId && userOpportunities.has(oppId);
      if (!isOwner && !isParticipant) continue;

      const recognition = isOwner ? 100 : (userOpportunities.get(oppId) || 100);
      const multiplier = recognition / 100;
      const produto = String((pedido as any).produto || (pedido as any).PRODUTO || 'Diversos').trim();

      const licenca = parseMoney((pedido as any).produtoValorLicenca) || parseMoney((pedido as any).produtoValorLicencaCanal);
      const manutencao = parseMoney((pedido as any).produtoValorManutencao) || parseMoney((pedido as any).produtoValorManutencaoCanal);

      let servico = parseMoney((pedido as any).servicoValorLiquido);
      if (servico === 0) {
        servico = parseMoney((pedido as any).servicoQtdeDeHoras) * parseMoney((pedido as any).servicoValorHora);
      }

      let added = false;
      if (licenca > 0) {
        const key = `${produto}|setup+licencas`;
        realizedMap.set(key, (realizedMap.get(key) || 0) + licenca * multiplier);
        added = true;
      }
      if (manutencao > 0) {
        const key = `${produto}|recorrente`;
        realizedMap.set(key, (realizedMap.get(key) || 0) + manutencao * multiplier);
        added = true;
      }
      if (servico > 0) {
        const key = `${produto}|servicosnaorecorrentes`;
        realizedMap.set(key, (realizedMap.get(key) || 0) + servico * multiplier);
        added = true;
      }

      if (!added) {
        const valorFechado = parseMoney((pedido as any).valorFechado || (pedido as any)['VALOR TOTAL']);
        if (valorFechado > 0) {
          const key = `${produto}|generico`;
          realizedMap.set(key, (realizedMap.get(key) || 0) + valorFechado * multiplier);
        }
      }
    }

    const metrics: GoalMetric[] = [];
    for (const goal of goals) {
      const goalUserId = normalizeId(goal.idUsuario);
      if (goalUserId !== selectedId) continue;

      const meta = periodValue(goal, selectedPeriod);
      const categoria = normalizeRubrica(goal.rubrica);
      const exact = `${goal.produto}|${categoria}`;
      const generic = `${goal.produto}|generico`;
      const realizado = (realizedMap.get(exact) || 0) + (categoria !== 'generico' ? (realizedMap.get(generic) || 0) : 0);

      metrics.push({
        id: `${goal.idUsuario}-${goal.produto}-${goal.rubrica}-${selectedPeriod}`,
        produto: goal.produto,
        rubrica: goal.rubrica,
        meta,
        realizado,
        percentual: meta > 0 ? (realizado / meta) * 100 : 0,
      });
    }

    return metrics.sort((a, b) => b.percentual - a.percentual);
  }, [goals, pedidos, processedData, selectedPeriod, selectedUserId]);
}
