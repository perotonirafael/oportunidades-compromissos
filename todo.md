# Correção KPIs + Gráfico Taxa de Conversão no Modal ETN

## FASE 1 - Auditoria Técnica
- [x] 1. Onde demoOppIds é criado → REMOVIDO pelo commit GitHub
- [x] 2. Onde demoOppIds é consumido → NENHUM CONSUMO
- [x] 3. Onde ganhasOps é definido → linha 135, usa uniqueOps sem demoOppIds
- [x] 4. Onde perdidasOps é definido → linha 136, usa uniqueOps sem demoOppIds
- [x] 5. Onde winRate é definido → linhas 141-142, ganhas/(ganhas+perdidas)
- [x] 6. Quais variáveis alimentam os KPIs do modal → uniqueOps (Base B)
- [x] 7. Quais componentes do modal renderizam os gráficos → 4 gráficos incluindo Taxa de Conversão
- [x] 8. Onde está a implementação do gráfico de Taxa de Conversão na página principal → ChartsSection.tsx
- [x] 9. Se existe helper/componente reutilizável → Não, implementação inline

## FASE 2 - Correção Completa
- [x] PASSO 1: Refatorar lógica de dados → demoOppIds removido, uniqueOps como base
- [x] PASSO 2: Corrigir KPIs → ganhasOps/perdidasOps usam uniqueOps sem demo
- [x] PASSO 3: Localizar gráfico → adaptado do ChartsSection com mesmo padrão visual
- [x] PASSO 4: Gráfico adicionado → linhas 564-603 com cards + stacked bar
- [x] PASSO 5: Métricas de demo não afetadas → categoriaCompromisso e etnActions intactos

## Validações
- [x] KPI Fechada e Ganha mostra TODAS as ganhas do ETN → Testado: Rafael Mendes = 1
- [x] KPI Fechada e Perdida mostra TODAS as perdidas do ETN → Testado: Rafael Mendes = 0
- [x] KPI Taxa de Conversão usa base correta → 100.0% (1/(1+0))
- [x] Gráfico de Taxa de Conversão aparece no modal → Confirmado visualmente
- [x] Gráfico não depende de demoOppIds → Usa conversionChartData de kpis
- [x] Nenhum outro gráfico do modal foi quebrado → 4 gráficos OK
- [x] Sem erro TypeScript → npx tsc --noEmit = 0 errors
- [x] Sem variáveis mortas → demoOppIds removido completamente
