<!-- SEED -->
---
name: Attivare Reforma Intelligence
description: Plataforma de diagnóstico preliminar da Reforma Tributária do Consumo — produto sério e institucional para escritórios de contabilidade.
colors:
  primary: "#143968"
  primary-deep: "#0F2A52"
  primary-darkest: "#0B1E3B"
  accent-gold: "#C8A96B"
  neutral-bg: "#F5F7FA"
  surface: "#FFFFFF"
  border: "#DDE3E0"
  text: "#13201B"
  text-muted: "#586660"
  success: "#1F7A4D"
  warning: "#B7791F"
  danger: "#B4293B"
  info: "#22599E"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.4rem)"
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

# Design System: Attivare Reforma Intelligence

## 1. Overview

Sistema visual para uma plataforma de **diagnóstico preliminar da Reforma
Tributária do Consumo**, usada por contadores e analistas da Attivare. Register
**product**: o design serve à tarefa. O tom é profissional, sério e confiável —
uma ferramenta de trabalho tributário, não um app de consumo.

A marca aparece pela paleta institucional (azul escuro executivo + dourado
discreto), aplicada com contenção. A hierarquia é construída por tipografia e
espaçamento, não por cor decorativa. Densidade alta de dados, leitura calma.

## 2. Colors: A Paleta Institucional Attivare

A paleta é dominada por **azuis escuros** sobre neutros levemente frios. O
**dourado** é cor de marca e ênfase pontual — nunca preenchimento de fundo amplo
nem texto corrido sobre branco.

> Valores no frontmatter são a fonte canônica (hex sRGB). Espelham
> `tailwind.config.js`.

### Primary

- **Azul institucional** `#143968` — cor primária de ação (botões, ícones de
  marca, estados ativos).
- **Azul profundo** `#0F2A52` / **#0B1E3B** — superfícies de marca (sidebar,
  capa do relatório, hover do primário). Texto claro por cima.

### Secondary

- **Dourado** `#C8A96B` — ênfase de marca: filete do logo, detalhes premium,
  divisores. **Não** usar como cor de texto sobre branco (contraste
  insuficiente) nem como grande área de fundo.

### Neutral

- `#F5F7FA` fundo de aplicação (off-white levemente frio).
- `#FFFFFF` superfícies/cards.
- `#DDE3E0` bordas e divisores.
- `#13201B` texto principal (quase-preto).
- `#586660` texto secundário/labels.

### Semânticos

Estados de impacto/risco e status usam cores dedicadas, sempre acompanhadas de
texto ou ícone (nunca só cor — WCAG AA):

- **success/positivo** `#1F7A4D` (impacto baixo, finalizado).
- **warning/alerta** `#B7791F` (impacto médio, em revisão).
- **danger/risco** `#B4293B` (impacto alto/crítico, erro).
- **info** `#22599E` (informativo, processando).

## 3. Typography

Duas famílias apenas: **Inter** para toda a interface e **Geist Mono** para
valores numéricos e dados tabulares (alinhamento de colunas com `tnum`). Geist
Mono nos números reforça precisão e diferencia esta UI do visual genérico
"Inter em tudo".

### Hierarchy

- **display** — títulos de página/dashboards (600, tracking apertado).
- **headline** — títulos de seção.
- **title** — cabeçalhos de card/tabela.
- **body** — texto corrido e conteúdo de formulário.
- **label** — rótulos de campo, chips, cabeçalhos de coluna (500, leve tracking).
- **numeric** — Geist Mono para qualquer métrica ou pontuação (ex.: GUT).

## 4. Elevation

Elevação discreta e institucional. Estrutura vem de bordas (`#DDE3E0`) antes de
sombra. Sombras suaves e de baixa opacidade — nada de glow ou sombra colorida.
A base do rgba usa o azul escuro de marca (`rgba(11,30,59,…)`), não preto puro.

## 5. Components

- **button-primary** — azul institucional, texto branco, raio md; hover escurece.
- **button-secondary** — superfície branca, borda, texto azul; ações secundárias.
- **card** — superfície branca, raio lg, borda sutil, padding generoso. Não
  aninhar card dentro de card.
- **input** — borda neutra, foco com anel azul visível (WCAG AA).
- **badge/RiskBadge** — nível de impacto e status com cor semântica + rótulo em
  PT-BR (nunca só cor).
- **table** — cabeçalho em `label`; no relatório, tabelas com bordas leves e
  quebra de página controlada para impressão.

## 6. Do's and Don'ts

**Do**

- Usar azuis Attivare para marca/ação e dourado só como ênfase pontual.
- Pontuações e métricas (GUT) em Geist Mono, tabulares.
- Construir hierarquia com tipografia e espaçamento; manter respiro mesmo em
  telas densas.
- Garantir contraste AA, foco de teclado visível e estado nunca só por cor.

**Don't**

- Sem gradientes chamativos (verde→azul, roxo→azul) nem glow colorido.
- Sem o "kit genérico de IA": Inter sem hierarquia, card dentro de card, ícone
  em quadrado arredondado acima de cada título, texto cinza sobre fundo colorido.
- Não usar dourado como texto sobre branco nem como grande área de fundo.
- Sem estética lúdica/B2C; este é um produto profissional sério.

<!-- Seed: reflete a implementação real (tailwind.config.js). Re-rodar
     `/impeccable document` se os tokens do projeto mudarem. -->
