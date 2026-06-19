<!-- SEED -->
---
name: Controle de Gastos Attivare
description: Controle de despesas PJ — produto sério e institucional para contadores e clientes da Attivare.
colors:
  primary: "#1F5C4A"
  primary-deep: "#003B2F"
  accent-gold: "#C8A96B"
  neutral-bg: "#F6F8F7"
  surface: "#FFFFFF"
  border: "#DDE3E0"
  text: "#13201B"
  text-muted: "#586660"
  success: "#1F5C4A"
  danger: "#9B2C2C"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.5rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
  numeric:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.4
    fontFeature: "tnum"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.surface}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
---

# Design System: Controle de Gastos Attivare

## 1. Overview

Sistema visual para um produto de **controle de despesas PJ** usado por
contadores e clientes da Attivare. Register **product**: o design serve à
tarefa. O tom é profissional, sério e confiável — uma ferramenta de trabalho
financeira, não um app de consumo.

A marca aparece pela paleta institucional da Attivare (verdes profundos +
dourado), aplicada com contenção. A hierarquia é construída por tipografia e
espaçamento, não por cor decorativa. Densidade alta de dados, leitura calma.

## 2. Colors: A Paleta Institucional Attivare

A paleta é dominada por verdes Attivare sobre neutros levemente esverdeados
(quentes, nunca cinza puro de IA). O dourado é cor de marca e ênfase pontual —
nunca preenchimento de fundo amplo nem texto corrido.

> Valores no frontmatter são a fonte canônica (hex sRGB, compatível com Stitch).

### Primary

- **Verde institucional** `#1F5C4A` — cor primária de ação (botões, links,
  estados ativos, ícones de marca).
- **Verde escuro** `#003B2F` — superfícies de marca profundas (sidebar, header,
  hover do primário, faixas institucionais). Texto claro por cima.

### Secondary

- **Dourado** `#C8A96B` — ênfase de marca: detalhes, bordas de destaque,
  ícones de marca, divisores premium. **Não** usar como cor de texto sobre
  branco (contraste insuficiente) nem como grande área de fundo.

### Tertiary

Omitido — o produto usa Primary + Secondary + Neutral. Não inventar uma quarta
família de cor.

### Neutral

- `#F6F8F7` fundo de aplicação (off-white com leve viés verde).
- `#FFFFFF` superfícies/cards.
- `#DDE3E0` bordas e divisores.
- `#13201B` texto principal (quase-preto esverdeado).
- `#586660` texto secundário/labels.

### Named Rules

- **Semânticos:** sucesso reusa o verde institucional `#1F5C4A`; erro/saída usa
  vermelho contido `#9B2C2C`. Valores negativos/saídas sempre acompanhados de
  sinal e/ou ícone — nunca comunicados só por cor (WCAG AA).

## 3. Typography

Duas famílias apenas: **Inter** para toda a interface e **Geist Mono** para
valores monetários e dados numéricos tabulares (alinhamento de colunas com
`tnum`). Geist Mono nos números reforça precisão e diferencia esta UI do visual
genérico "Inter em tudo".

### Hierarchy

- **display** — títulos de página/dashboards (600, tracking apertado).
- **headline** — títulos de seção.
- **title** — cabeçalhos de card/tabela.
- **body** — texto corrido e conteúdo de formulário.
- **label** — rótulos de campo, chips, cabeçalhos de coluna (500, leve tracking).
- **numeric** — Geist Mono para qualquer valor monetário ou métrica.

### Named Rules

- Todo valor em R$ usa `numeric` com `font-variant-numeric: tabular-nums`.
- Peso e tamanho carregam a hierarquia; evitar criar hierarquia só com cor.

## 4. Elevation

Elevação discreta e institucional. Estrutura vem de bordas (`#DDE3E0`) antes de
sombra. Sombras suaves e de baixa opacidade — nada de glow ou sombra colorida.

### Shadow Vocabulary

- **sm** — `0 1px 2px rgba(0,59,47,0.06)` (cards em repouso).
- **md** — `0 4px 12px rgba(0,59,47,0.10)` (dropdowns, popovers).
- Sombra usa o verde escuro de marca como base do rgba, não preto puro.

## 5. Components

- **button-primary** — verde institucional, texto branco, raio md; hover escurece
  para o verde escuro.
- **button-secondary** — superfície branca, borda, texto verde; para ações
  secundárias.
- **card** — superfície branca, raio lg, borda sutil, padding generoso. Não
  aninhar card dentro de card.
- **input** — borda neutra, foco com anel verde institucional visível (WCAG AA).
- **table** — para listas de despesas: cabeçalho em `label`, valores em
  `numeric` alinhados à direita, linhas com divisores `#DDE3E0`.

## 6. Do's and Don'ts

**Do**

- Usar verdes Attivare para marca/ação e dourado só como ênfase pontual.
- Números monetários em Geist Mono, tabulares, alinhados à direita.
- Construir hierarquia com tipografia e espaçamento; manter respiro mesmo em
  telas densas.
- Garantir contraste AA, foco de teclado visível e estado nunca só por cor.

**Don't**

- Sem gradientes chamativos (verde→azul, roxo→azul) nem glow colorido.
- Sem o "kit genérico de IA": Inter sem hierarquia, card dentro de card, ícone
  em quadrado arredondado acima de cada título, texto cinza sobre fundo colorido.
- Não usar dourado como texto sobre branco nem como grande área de fundo.
- Sem estética lúdica/B2C; este é um produto financeiro sério.

<!-- Seed: re-rodar `/impeccable document` quando houver código/tokens reais
     para capturar os valores efetivos do projeto. -->
