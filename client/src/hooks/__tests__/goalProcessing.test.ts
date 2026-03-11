import { describe, it, expect } from 'vitest';
import { parseGoalRows } from '@/hooks/useGoalProcessor';
import { computeGoalMetrics, isPedidoInsideSelectedPeriod, resolveReferenceYear } from '@/hooks/useGoalMetricsProcessor';
import type { GoalRecord, PedidoRecord } from '@/types/goals';

describe('useGoalProcessor helpers', () => {
  it('aceita alias "Id Usuário ERP" no parser de metas', () => {
    const goals = parseGoalRows([
      {
        Produto: 'Total Gestão',
        'Id Usuário ERP': ' 12345 ',
        Rubrica: 'Setup + Licenças',
        Ano: '2025',
        Março: '1.500,50',
      },
    ]);

    expect(goals).toHaveLength(1);
    expect(goals[0].idUsuario).toBe('12345');
    expect(goals[0].marco).toBe(1500.5);
  });
});

describe('useGoalMetricsProcessor helpers', () => {
  const goals: GoalRecord[] = [
    {
      produto: 'Total Gestão',
      idUsuario: '111',
      rubrica: 'Setup + Licenças',
      ano: 2025,
      janeiro: 100,
      fevereiro: 100,
      marco: 100,
      primeiroTrimestre: 300,
      abril: 0,
      maio: 0,
      junho: 0,
      segundoTrimestre: 0,
      julho: 0,
      agosto: 0,
      setembro: 0,
      terceiroTrimestre: 0,
      outubro: 0,
      novembro: 0,
      dezembro: 0,
      quartoTrimestre: 0,
      totalAno: 300,
    },
  ];

  const pedidos: PedidoRecord[] = [
    {
      idOportunidade: 'OPP1',
      idEtapaOportunidade: '',
      proprietarioOportunidade: '',
      idErpProprietario: '',
      dataFechamento: '10/03/2025',
      produto: '',
      produtoCodigoModulo: '',
      produtoModulo: '',
      produtoValorLicenca: 200,
      produtoValorLicencaCanal: 0,
      produtoValorManutencao: 0,
      produtoValorManutencaoCanal: 0,
      servico: '',
      servicoTipoDeFaturamento: '',
      servicoQtdeDeHoras: 0,
      servicoValorHora: 0,
      servicoValorBruto: 0,
      servicoValorOver: 0,
      servicoValorDesconto: 0,
      servicoValorCanal: 0,
      servicoValorLiquido: 0,
    },
    {
      idOportunidade: 'OPP1',
      idEtapaOportunidade: '',
      proprietarioOportunidade: '',
      idErpProprietario: '',
      dataFechamento: '10/04/2025',
      produto: '',
      produtoCodigoModulo: '',
      produtoModulo: '',
      produtoValorLicenca: 300,
      produtoValorLicencaCanal: 0,
      produtoValorManutencao: 0,
      produtoValorManutencaoCanal: 0,
      servico: '',
      servicoTipoDeFaturamento: '',
      servicoQtdeDeHoras: 0,
      servicoValorHora: 0,
      servicoValorBruto: 0,
      servicoValorOver: 0,
      servicoValorDesconto: 0,
      servicoValorCanal: 0,
      servicoValorLiquido: 0,
    },
  ];

  const processedData = [
    {
      oppId: 'OPP1',
      etn: 'ETN 1',
      etapa: 'Fechada e Ganha',
      categoriaCompromisso: ' Demonstracao   Presencial ',
    },
  ] as any;

  it('filtra pedido por período e ano de referência', () => {
    expect(resolveReferenceYear(goals)).toBe(2025);
    expect(isPedidoInsideSelectedPeriod('10/03/2025', 'Março', 2025)).toBe(true);
    expect(isPedidoInsideSelectedPeriod('10/03/2024', 'Março', 2025)).toBe(false);
    expect(isPedidoInsideSelectedPeriod('10/04/2025', '1ºTrimestre', 2025)).toBe(false);
  });

  it('mantém cálculo idêntico entre fluxo cache e fluxo upload', () => {
    const fromCache = computeGoalMetrics(goals, pedidos, processedData, 'Março', [], []);
    const fromUpload = computeGoalMetrics(
      goals,
      pedidos,
      processedData,
      'Março',
      [{ Categoria: 'Demonstracao Presencial', 'Oportunidade ID': 'OPP1', Usuario: 'ETN 1' }],
      [{ 'Oportunidade ID': 'OPP1', Etapa: 'Fechada e Ganha' }]
    );

    expect(fromCache).toHaveLength(1);
    expect(fromUpload).toHaveLength(1);
    expect(fromCache[0].realLicencasServicos).toBe(200);
    expect(fromCache[0].realLicencasServicos).toBe(fromUpload[0].realLicencasServicos);
    expect(fromCache[0].percentualAtingimento).toBe(fromUpload[0].percentualAtingimento);
  });
});
