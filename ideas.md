# Brainstorm de Design: Painel de Oportunidades e Compromissos

## Contexto
Sistema analítico client-side para processamento de dados de CRM com foco em join relacional, KPIs financeiros e análise de engajamento. Público: profissionais de vendas e gestores de pipeline.

---

## Ideia 1: Minimalismo Corporativo com Dados Destaque

**Design Movement:** Swiss Style + Data Visualization Modernism

**Core Principles:**
- Hierarquia clara através de tipografia e espaçamento generoso
- Dados são o protagonista visual (números grandes, cores significativas)
- Interface desaparece, deixando espaço para a informação
- Precisão e confiança através de alinhamento grid rigoroso

**Color Philosophy:**
- Paleta neutra: Cinzas profundos (charcoal #1a1a1a), brancos puros (#ffffff)
- Cores de dados: Verde para crescimento (#10b981), Vermelho para risco (#ef4444), Azul para neutro (#3b82f6)
- Fundo: Branco puro com linhas de grid sutis em cinza claro
- Propósito: Máxima legibilidade, foco absoluto nos números

**Layout Paradigm:**
- Grid 12 colunas com gutters generosos (32px)
- Sidebar esquerda fixa (240px) com navegação e filtros
- Área principal com 3 seções: KPIs em cards (4 colunas cada), Gráfico de distribuição, Tabela analítica
- Espaçamento vertical de 48px entre seções

**Signature Elements:**
- Cards de KPI com border-left colorido (2px) indicando status
- Ícones minimalistas (Lucide) em cinza escuro
- Linhas horizontais sutis (1px, cinza claro) separando seções
- Tipografia: Roboto Mono para números, Inter para texto

**Interaction Philosophy:**
- Hover em filtros: fundo cinza claro, sem mudança de cor
- Click em linha da tabela: highlight sutil com fundo azul 5%
- Ordenação: seta indicadora clara (↑↓) no header
- Feedback imediato: toast de "Processando..." durante upload

**Animation:**
- Fade-in dos cards de KPI (200ms) ao carregar
- Transição suave de cores em hover (150ms)
- Skeleton loaders em cinza claro durante processamento
- Nenhuma animação desnecessária (foco em eficiência)

**Typography System:**
- Display: Roboto Mono 28px bold para títulos de KPI
- Heading: Inter 20px semibold para títulos de seção
- Body: Inter 14px regular para texto
- Data: Roboto Mono 16px para números em tabelas
- Label: Inter 12px uppercase para filtros

---

## Ideia 2: Dashboard Executivo com Gradientes Dinâmicos

**Design Movement:** Modern Finance UI + Glassmorphism

**Core Principles:**
- Sofisticação através de gradientes e blur effects
- Dados contextualizados com cores emocionais (quente/frio)
- Profundidade visual através de camadas e sombras
- Modernidade e confiança para executivos

**Color Philosophy:**
- Gradiente primário: Azul escuro (#1e3a8a) → Roxo (#7c3aed)
- Dados quentes: Laranja (#f97316) para oportunidades em risco
- Dados frios: Ciano (#06b6d4) para oportunidades seguras
- Fundo: Gradiente sutil (branco → cinza muito claro)
- Propósito: Elegância executiva, diferenciação visual

**Layout Paradigm:**
- Hero section com gradiente (KPIs em destaque)
- Dois painéis lado a lado: Filtros (esquerda) + Dados (direita)
- Cards com glassmorphism (backdrop-blur, border semi-transparente)
- Tabela com zebra-striping (linhas alternadas em cinza 2%)

**Signature Elements:**
- Gradiente de fundo em cada card de KPI
- Ícones com cores complementares ao gradiente
- Separadores com blur effect (border-top semi-transparente)
- Tipografia: Poppins para display, Inter para body

**Interaction Philosophy:**
- Hover em cards: elevação com sombra (box-shadow: 0 20px 40px rgba)
- Filtros com toggle visual (checkbox customizado com gradiente)
- Tabela com row-hover em cor semi-transparente
- Feedback: Toast com gradiente de fundo

**Animation:**
- Entrada de cards com slide-up + fade (300ms)
- Pulse sutil em números que mudam (200ms)
- Transição suave entre estados de filtro (150ms)
- Loader com gradiente animado

**Typography System:**
- Display: Poppins 32px bold para KPIs
- Heading: Poppins 24px semibold para seções
- Body: Inter 14px regular
- Data: Poppins 18px bold para números
- Label: Inter 12px semibold para filtros

---

## Ideia 3: Design Operacional com Acessibilidade Máxima

**Design Movement:** Government/Enterprise UI + Accessibility First

**Core Principles:**
- Máximo contraste e clareza (WCAG AAA)
- Estrutura lógica e previsível
- Sem dependência de cor para informação
- Eficiência operacional (menos cliques, mais clareza)

**Color Philosophy:**
- Paleta de alto contraste: Preto (#000000), Branco (#ffffff)
- Cores de status: Verde (#059669), Amarelo (#d97706), Vermelho (#dc2626), Azul (#2563eb)
- Sempre acompanhadas de ícones/símbolos (não apenas cor)
- Fundo: Branco puro, sem gradientes
- Propósito: Máxima acessibilidade, sem ambiguidades

**Layout Paradigm:**
- Estrutura em 3 colunas: Filtros (esquerda, 280px), KPIs (topo, full-width), Tabela (principal)
- Espaçamento uniforme (16px, 24px, 32px)
- Cards com border sólida (2px) em cinza escuro
- Tabela com linhas claras, headers em fundo cinza escuro + texto branco

**Signature Elements:**
- Badges com ícone + texto (nunca apenas cor)
- Linhas de separação claras (2px, preto)
- Tipografia: IBM Plex Mono para dados, IBM Plex Sans para texto
- Indicadores de status: ✓ ✗ ⚠ ⓘ

**Interaction Philosophy:**
- Focus rings visíveis (3px, azul)
- Keyboard navigation completa (Tab, Enter, Setas)
- Tooltips em hover (não apenas cor)
- Feedback textual sempre presente

**Animation:**
- Transições suaves (200ms) em mudanças de estado
- Nenhuma animação que prejudique acessibilidade
- Respeito a `prefers-reduced-motion`
- Loader com barra de progresso (não apenas spinner)

**Typography System:**
- Display: IBM Plex Mono 28px bold para KPIs
- Heading: IBM Plex Sans 20px bold para seções
- Body: IBM Plex Sans 14px regular
- Data: IBM Plex Mono 16px regular para tabelas
- Label: IBM Plex Sans 12px bold para filtros

---

## Decisão de Design

**Escolhido: Ideia 1 - Minimalismo Corporativo com Dados Destaque**

Justificativa: O sistema é fundamentalmente sobre dados e análise. A abordagem minimalista maximiza a legibilidade dos KPIs e da tabela analítica, elimina distrações visuais, e cria uma interface que inspira confiança em profissionais de vendas. A tipografia clara (Roboto Mono para números) reforça a precisão dos dados. O sidebar fixo com filtros segue padrões estabelecidos em dashboards corporativos, reduzindo curva de aprendizado.

**Implementação:**
- Tipografia: Inter para UI, Roboto Mono para dados numéricos
- Cores: Cinzas neutros + verde/vermelho/azul para dados
- Layout: Sidebar + grid 12 colunas
- Animações: Mínimas, apenas para feedback
- Foco: Dados são o protagonista
