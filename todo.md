# Ajustes Rodada E - 5 Itens

## Item 1 - Gráfico Taxa de Conversão não aparece com dados reais
- [ ] Investigar por que o gráfico Taxa de Conversão por ETN não renderiza ao carregar dados reais (cache)
- [ ] Verificar se etnConversionTop10 está vazio ou com dados incorretos
- [ ] Corrigir a lógica no worker e/ou Home.tsx

## Item 2 - KPIs Fechada e Ganha/Perdida com regra de compromissos no modal
- [ ] Visão geral (sem filtro ETN): contar TODAS as OPs fechadas (sem restrição de compromisso)
- [ ] Modal individual ETN: contar apenas OPs que tenham compromisso dos 7 tipos:
  - Demonstração Presencial, Demonstração Remota, Análise de Aderência, ETN Apoio, Análise de RFP/RFI, Termo de Referência, Edital
- [ ] Ao filtrar por ETN na visão geral: mesma regra do modal

## Item 3 - Clique no gráfico Taxa de Conversão abre modal individual
- [ ] Ao clicar no nome de um ETN no gráfico Taxa de Conversão, abrir o modal de desempenho individual

## Item 4 - Mesma regra de cálculo no desempenho individual
- [ ] Aplicar a mesma regra dos 7 tipos de compromisso no modal ETN para KPIs

## Item 5 - Taxa de Conversão usa apenas Demonstração Presencial e Remota
- [ ] Fórmula: Ganhas com Demo / (Ganhas com Demo + Perdidas com Demo)
- [ ] Demo = apenas Demonstração Presencial ou Demonstração Remota
- [ ] Aplicar tanto no gráfico principal quanto no modal individual
