# Especificação Técnica — Análise de Extrato Bancário

**Produto:** Controle de Gastos Attivare
**Módulo:** Analisador de Extrato Bancário
**Status:** Especificação para desenvolvimento (pré-MVP)
**Última atualização:** 2026-07-06

---

## 1. Resumo executivo

### Objetivo

Adicionar ao Controle de Gastos Attivare a capacidade de **importar extratos
bancários** (CSV, XLSX, OFX e PDF digital), **extrair e normalizar as
transações**, **categorizá-las automaticamente** e apresentar ao contador e ao
cliente PJ uma análise clara e auditável: entradas, saídas, saldo, categorias
de gasto, recorrências, duplicidades e movimentações fora do padrão.

### Problema que resolve

Hoje o lançamento de despesas é manual. O contador recebe extratos em formatos
diferentes de cada banco, redigita ou copia dados para planilhas, classifica
transação por transação e concilia à mão. Esse processo é lento, sujeito a
erro de digitação e não escala com o número de clientes. O cliente PJ, por sua
vez, não tem visão organizada de para onde o dinheiro da empresa está indo.

### Público-alvo

Conforme `PRODUCT.md`:

- **Contador da Attivare** — usuário recorrente e operacional: importa,
  confere, corrige categorias, concilia e exporta. Precisa de precisão,
  rastreabilidade e velocidade.
- **Cliente PJ** — acompanha os gastos da própria empresa: consulta o
  dashboard, revisa categorias das suas transações e exporta relatórios.

O contexto de uso é profissional e orientado a tarefa. A análise gerada é
**informação operacional e gerencial** — não é aconselhamento financeiro nem
substitui o parecer do contador.

### Valor gerado

- Eliminação da redigitação: o extrato vira lançamentos estruturados em minutos.
- Classificação automática com nível de confiança e fila de revisão — o
  contador revisa exceções em vez de classificar tudo.
- Detecção de duplicidades, tarifas incomuns e cobranças recorrentes que
  passariam despercebidas.
- Relatórios exportáveis (CSV, XLSX, PDF) prontos para a rotina contábil.
- Trilha de auditoria completa: toda transação aponta para o arquivo e a linha
  de origem.

---

## 2. Escopo do sistema

### O que o sistema fará (visão completa)

- Upload de extratos em CSV, XLSX, OFX e PDF digital (OCR para PDF escaneado
  em fase posterior).
- Extração de data, descrição, valor, tipo e saldo (quando disponível).
- Normalização e deduplicação de transações.
- Categorização automática híbrida (regras → histórico → similaridade → ML),
  sempre com nível de confiança.
- Correção manual com aprendizado a partir das correções.
- Dashboard financeiro, relatórios por período e exportação.
- Detecção de recorrências e anomalias.
- Segurança e conformidade com a LGPD desde o desenho.

### O que o sistema NÃO fará na primeira versão

- **Não** lê PDF escaneado/imagem (OCR fica para a Fase 3).
- **Não** integra diretamente com APIs bancárias / Open Finance (Fase 4, e
  somente com definição de bancos, consentimento e credenciais).
- **Não** faz conciliação contábil formal com plano de contas (evolução
  futura).
- **Não** detalha faturas de cartão de crédito (o pagamento da fatura é
  tratado como categoria própria, não decomposto).
- **Não** dá recomendações de investimento nem aconselhamento financeiro.
- **Não** usa exclusivamente IA para classificar: decisões ambíguas vão para
  revisão humana.

### MVP vs. versão completa

| Dimensão | MVP (Fases 1–2) | Versão completa (Fases 3–4) |
|---|---|---|
| Formatos | CSV, XLSX, OFX, PDF digital | + PDF escaneado (OCR), APIs bancárias |
| Categorização | Regras por palavra-chave + histórico do usuário | + similaridade textual, ML supervisionado, LLM assistido |
| Análises | Totais, categorias, evolução de saldo, recorrências | + anomalias estatísticas, comparação de períodos, previsão de fluxo de caixa |
| Usuários | Contador + cliente PJ (multi-tenant por empresa) | + equipes, papéis e permissões granulares |
| Exportação | CSV, XLSX | + PDF com identidade Attivare |

---

## 3. Funcionalidades principais

1. **Upload de extratos** — arrastar/selecionar arquivo; validação de formato,
   tamanho e integridade; associação a uma conta bancária da empresa.
2. **Leitura e extração** — parser específico por formato; detecção de layout
   por banco; pré-visualização das transações extraídas antes de confirmar.
3. **Normalização** — datas para ISO-8601, valores para decimal com sinal,
   descrições limpas e padronizadas, moeda explícita (BRL).
4. **Deduplicação** — hash determinístico por transação; detecção de
   sobreposição de períodos entre arquivos.
5. **Categorização automática** — pipeline em camadas com score de confiança;
   abaixo do limiar, a transação entra na fila de revisão.
6. **Correção manual** — mudar categoria em um clique, em lote ou por regra
   ("sempre classificar `PAG*UBER` como Transporte").
7. **Aprendizado com o usuário** — correções geram regras personalizadas por
   empresa, com precedência sobre as regras globais.
8. **Relatórios financeiros** — por período, por categoria, por conta;
   comparativo entre meses.
9. **Detecção de recorrências** — assinaturas, tarifas, folha, aluguel e
   demais débitos/créditos periódicos.
10. **Detecção de anomalias** — duplicidades, valores fora do padrão, tarifas
    incomuns, quebra de sequência de saldo.
11. **Exportação** — CSV, XLSX e PDF; dashboard web como visão principal.
12. **Auditoria** — log de quem importou, revisou, alterou e exportou o quê.

---

## 4. Fluxo completo do usuário

```
Login → Selecionar empresa/conta → Upload do extrato
  → Validação do arquivo (formato, tamanho, duplicidade de arquivo)
  → Extração e pré-visualização ("encontramos 143 transações de 01/05 a 31/05")
  → Confirmação da importação
  → Categorização automática (com confiança por transação)
  → Fila de revisão (transações com baixa confiança ou ambíguas)
  → Correções manuais (opcional: criar regra a partir da correção)
  → Dashboard e relatórios do período
  → Exportação (CSV / XLSX / PDF) ou salvamento da análise
```

Pontos de decisão importantes do fluxo:

- **Pré-visualização obrigatória** antes de gravar: o usuário confirma que o
  parser leu o arquivo corretamente (colunas certas, sinal certo, período
  certo). Evita poluir a base com extração errada.
- **Sobreposição de período**: se o arquivo cobre datas já importadas para a
  mesma conta, o sistema mostra quantas transações são novas, quantas são
  duplicadas e importa apenas as novas (com opção de revisar).
- **Arquivo com múltiplas contas** (alguns internet bankings exportam assim):
  o sistema pede que o usuário mapeie cada bloco a uma conta cadastrada.

---

## 5. Pipeline de processamento de extratos

Processamento **assíncrono** (fila + worker), com status visível ao usuário
(`recebido → processando → aguardando revisão → concluído → erro`).

1. **Recebimento** — upload via HTTPS; arquivo gravado em armazenamento
   criptografado; hash SHA-256 do arquivo calculado (deduplicação de arquivo).
2. **Identificação do tipo** — por extensão + conteúdo (magic bytes, sniffing
   de delimitador em CSV, estrutura OFX/XML, texto extraível em PDF).
3. **Seleção do parser** — detecção do layout do banco por heurísticas
   (cabeçalhos conhecidos, padrões de descrição); fallback para mapeamento
   manual de colunas pelo usuário (CSV/XLSX genérico).
4. **Extração** — texto/tabelas estruturadas → lista de transações brutas.
5. **Limpeza** — remoção de linhas de cabeçalho/rodapé/saldo-resumo, junção de
   descrições quebradas em múltiplas linhas (PDF), remoção de caracteres de
   controle.
6. **Normalização** — datas (`dd/mm/aaaa`, `dd-mm-aa`, serial Excel → ISO),
   valores (`1.234,56`, `-1234.56`, colunas separadas de débito/crédito,
   sufixos `D`/`C` → decimal com sinal), descrição normalizada (maiúsculas,
   sem acento, sem números de autenticação/protocolo).
7. **Deduplicação** — hash por transação:
   `sha256(conta_id + data + valor + descricao_normalizada + n_ocorrencia_no_dia)`
   — o índice de ocorrência distingue duas transações legítimas idênticas no
   mesmo dia e ainda detecta o mesmo lançamento vindo de dois arquivos.
8. **Classificação** — pipeline de categorização (seção 8).
9. **Geração de insights** — recorrências, anomalias, agregados por categoria
   e período (seções 10 e 11).
10. **Armazenamento seguro** — transações no PostgreSQL; arquivo original
    retido criptografado pelo período da política de retenção (auditoria) e
    depois excluído.
11. **Retorno ao usuário** — notificação de conclusão + resumo da importação.

**Tratamento de erros:** falha de parsing não derruba a importação inteira —
linhas ilegíveis vão para um relatório de rejeição ("3 linhas não puderam ser
lidas, veja quais"); o usuário decide corrigir o arquivo ou lançar manualmente.

---

## 6. Campos de dados por transação

| Campo | Tipo | Observação |
|---|---|---|
| `id` | UUID | Identificador interno |
| `empresa_id` | UUID | Tenant (cliente PJ) |
| `conta_id` | UUID | Conta bancária de origem |
| `arquivo_id` | UUID | Arquivo de importação de origem (auditoria) |
| `linha_origem` | int | Posição no arquivo original (auditoria) |
| `data_transacao` | date | Data do lançamento |
| `data_processamento` | date/null | Quando distinta (ex.: compensação) |
| `descricao_original` | text | Exatamente como veio no extrato |
| `descricao_normalizada` | text | Limpa, para matching e exibição |
| `valor` | numeric(14,2) | Com sinal; negativo = saída. **Nunca float** |
| `moeda` | char(3) | `BRL` no MVP |
| `tipo` | enum | `credito`, `debito`, `transferencia`, `tarifa`, `imposto`, `investimento`, `estorno` |
| `categoria_id` | FK/null | Categoria atribuída |
| `subcategoria_id` | FK/null | Opcional |
| `confianca_categorizacao` | numeric(3,2) | 0.00–1.00 |
| `metodo_categorizacao` | enum | `regra_global`, `regra_usuario`, `historico`, `ml`, `manual` |
| `status_revisao` | enum | `automatica`, `pendente_revisao`, `revisada` |
| `contraparte_interna` | bool | Marcada como transferência entre contas próprias |
| `saldo_apos` | numeric(14,2)/null | Quando o extrato informa |
| `hash_dedup` | char(64) | Único por conta (índice) |
| `criado_em` / `atualizado_em` | timestamptz | Auditoria |

---

## 7. Modelo de banco de dados (PostgreSQL)

```
empresas            (id, nome, cnpj_mascarado, criado_em, ...)
usuarios            (id, email, nome, papel[contador|cliente], senha_hash, ...)
usuarios_empresas   (usuario_id, empresa_id, papel_na_empresa)   -- contador atende N empresas
contas_bancarias    (id, empresa_id, banco, apelido, conta_mascarada, ativa)
arquivos_importados (id, empresa_id, conta_id, usuario_id, nome_original,
                     formato, hash_sha256, status, periodo_inicio, periodo_fim,
                     total_linhas, linhas_importadas, linhas_rejeitadas,
                     caminho_storage, criado_em, excluido_em)
transacoes          (ver seção 6; UNIQUE (conta_id, hash_dedup))
categorias          (id, nome, tipo[receita|despesa|neutra], pai_id, global|empresa_id)
regras_categorizacao(id, escopo[global|empresa_id], padrao, tipo_padrao[keyword|regex],
                     categoria_id, prioridade, ativa, criada_por, criado_em)
correcoes_usuario   (id, transacao_id, usuario_id, categoria_anterior,
                     categoria_nova, gerou_regra_id/null, criado_em)
recorrencias        (id, empresa_id, descricao_padrao, categoria_id,
                     periodicidade, valor_medio, primeira_ocorrencia,
                     ultima_ocorrencia, status[ativa|encerrada|desconhecida])
alertas             (id, empresa_id, transacao_id/null, tipo, severidade,
                     mensagem, status[aberto|resolvido|ignorado], criado_em)
relatorios          (id, empresa_id, usuario_id, tipo, parametros_json,
                     formato, caminho_storage, criado_em, expira_em)
logs_auditoria      (id, usuario_id, empresa_id, acao, entidade, entidade_id,
                     metadados_json_sem_dados_sensiveis, ip, criado_em)
```

Decisões de modelagem:

- **Relacional (PostgreSQL)** — transações financeiras são tabulares, exigem
  integridade referencial, agregações e `numeric` exato. MongoDB não se
  justifica aqui.
- **Multi-tenant por `empresa_id`** em todas as tabelas de dados, com filtro
  obrigatório na camada de acesso (e, como defesa em profundidade,
  Row-Level Security do PostgreSQL).
- **Categorias em árvore rasa** (categoria → subcategoria, 2 níveis máx.).
- **Regras com prioridade e escopo**: regra da empresa > regra global; entre
  regras do mesmo escopo, maior prioridade vence; empates → fila de revisão.

---

## 8. Categorização de transações

### Pipeline em camadas (ordem de execução)

1. **Regras do usuário/empresa** (keyword ou regex sobre a descrição
   normalizada, opcionalmente com faixa de valor). Confiança 0.95–1.00.
2. **Histórico da empresa** — descrição normalizada idêntica ou quase idêntica
   a transação já revisada da mesma empresa. Confiança 0.85–0.95.
3. **Regras globais** — dicionário mantido pela Attivare com padrões do
   mercado brasileiro (ver exemplos abaixo). Confiança 0.70–0.90.
4. **Similaridade textual** (Fase 3) — trigram/embedding contra o corpus de
   transações já classificadas. Confiança proporcional à similaridade.
5. **ML supervisionado / LLM assistido** (Fases 3–4) — classificador treinado
   nas correções agregadas; LLM apenas como sugestão, nunca como decisão
   final sem confiança calibrada.
6. **Sem classificação** — categoria `A classificar`, confiança 0.

**Limiar de revisão:** confiança `< 0.80` → `status_revisao = pendente_revisao`
e entrada na fila. Nenhuma transação ambígua é apresentada como certa — a
confiança aparece na interface.

### Exemplos de regras globais (contexto bancário brasileiro)

| Padrão na descrição | Tipo | Categoria |
|---|---|---|
| `TAR`, `TARIFA`, `PACOTE SERVICOS`, `MANUT CTA` | tarifa | Tarifas bancárias |
| `DAS`, `DARF`, `GPS`, `FGTS`, `GRF`, `ISS`, `ICMS`, `SIMPLES NACIONAL` | imposto | Impostos e tributos |
| `PIX TRANSF`, `TED`, `DOC` + contraparte própria | transferencia | Transferência interna |
| `PGTO FATURA CARTAO`, `PAGAMENTO CARTAO` | debito | Cartão de crédito (fatura) |
| `FOLHA`, `SALARIO`, `PRO-LABORE`, `PROLABORE` | debito | Pessoal e pró-labore |
| `ALUGUEL`, `CONDOMINIO`, `IPTU` | debito | Ocupação e moradia da empresa |
| `ENERGIA`, `CPFL`, `ENEL`, `LIGHT`, `SABESP`, `VIVO`, `CLARO`, `TIM` | debito | Utilidades e telecom |
| `UBER`, `99APP`, `POSTO`, `IPVA`, `ESTACIONAMENTO`, `PEDAGIO` | debito | Transporte e logística |
| `IFOOD`, `RESTAURANTE`, `PADARIA`, `MERCADO` | debito | Alimentação |
| `GOOGLE`, `MICROSOFT`, `ADOBE`, `AWS`, `GITHUB`, `ASSINATURA` | debito | Software e assinaturas |
| `RESGATE`, `APLICACAO`, `CDB`, `TESOURO`, `POUPANCA` | investimento | Investimentos |
| `ESTORNO`, `DEVOLUCAO`, `REEMBOLSO` | estorno | Estornos e reembolsos |
| Crédito recorrente de mesma contraparte | credito | Receita de vendas/serviços |

### Categorias iniciais (padrão global, ajustáveis por empresa)

**Receitas:** Vendas e serviços · Reembolsos recebidos · Rendimentos de
aplicação · Aportes de sócios · Outras receitas.

**Despesas:** Fornecedores · Pessoal e pró-labore · Impostos e tributos ·
Tarifas bancárias · Ocupação (aluguel, condomínio) · Utilidades e telecom ·
Software e assinaturas · Transporte e logística · Alimentação · Marketing ·
Serviços profissionais (jurídico, contábil) · Equipamentos e materiais ·
Cartão de crédito (fatura) · Outras despesas.

**Neutras (fora do resultado):** Transferências entre contas próprias ·
Investimentos (aplicação/resgate) · Estornos · A classificar.

### Aprendizado com correções

Toda correção manual é registrada em `correcoes_usuario`. Ao corrigir, o
sistema oferece: *"Aplicar a todas as N transações semelhantes?"* e *"Criar
regra para classificar `X` como `Y` daqui em diante?"*. Regras criadas assim
têm escopo da empresa. Correções agregadas (anonimizadas por descrição
normalizada, sem valores nem contrapartes) alimentam a melhoria das regras
globais e, futuramente, o treino do classificador.

---

## 9. Regras financeiras importantes

1. **Transferência interna ≠ receita/despesa.** Transferências entre contas
   cadastradas da mesma empresa são marcadas `contraparte_interna` e ficam
   fora de receita/despesa nos indicadores. Detecção: mesma empresa, valores
   espelhados (−X e +X) em contas distintas numa janela de 0–3 dias úteis.
2. **Estorno não é receita nova.** Estornos são vinculados (quando possível) à
   transação original e anulam o gasto na categoria original, ou entram como
   neutro se a original não for encontrada.
3. **Pagamento de fatura de cartão ≠ gasto final.** Sem o detalhamento da
   fatura, o pagamento fica na categoria própria "Cartão de crédito (fatura)"
   — nunca distribuído em categorias de consumo por suposição.
4. **Tarifas bancárias sempre identificadas** e somadas separadamente — é um
   número que o contador quer ver isolado.
5. **Recorrências identificadas e nomeadas** (seção 10) — base para separar
   despesa fixa de variável.
6. **Duplicidade nunca descartada silenciosamente** em caso de dúvida: o hash
   idêntico bloqueia reimportação do mesmo lançamento, mas "possíveis
   duplicatas" (mesmo valor/descrição em datas próximas vindas de arquivos
   diferentes) viram alerta para decisão humana.
7. **Receita operacional vs. eventual:** créditos recorrentes de contrapartes
   conhecidas são operacionais; aportes, resgates e créditos pontuais são
   eventuais — separados nos relatórios.
8. **Despesa fixa vs. variável:** fixa = pertence a uma recorrência ativa com
   valor estável (variação ≤ ~20%); o restante é variável.
9. **Saldo informado é verdade do banco.** Quando o extrato traz saldo, o
   sistema recalcula a sequência e reporta divergências (seção 11) — nunca
   "corrige" o saldo do banco.

---

## 10. Métricas e indicadores

Todos os indicadores excluem transferências internas e tratam estornos
conforme a seção 9. Período padrão: mês; comparativos configuráveis.

- **Receita total** e **receita operacional** do período.
- **Despesa total**, com abertura em **fixas × variáveis**.
- **Saldo líquido do período** (receitas − despesas) e **evolução do saldo**
  dia a dia.
- **Percentual de gasto por categoria** e **maior categoria de gasto**.
- **Gasto médio diário** e **gasto médio mensal** (média móvel 3 meses).
- **Total de tarifas bancárias** do período (destacado).
- **Total de impostos** do período (destacado — relevante para o contador).
- **Recorrências ativas** (contagem e soma mensal comprometida).
- **Transações incomuns / alertas abertos** (contagem, com link).
- **Comparação entre períodos** (mês atual × anterior × mesmo mês do ano
  anterior), por total e por categoria.
- **Previsão simples de fluxo de caixa** (Fase 3): projeção do saldo com base
  nas recorrências ativas + média de variáveis dos últimos 3 meses,
  apresentada explicitamente como estimativa.

### Detecção de recorrências

Agrupamento por descrição normalizada + contraparte; uma recorrência é
reconhecida com **≥ 3 ocorrências** em intervalos regulares (semanal, mensal,
anual — tolerância de ±5 dias) e valor estável ou idêntico. Cada recorrência
ganha nome, periodicidade, valor médio e status. Recorrência que **deixa de
ocorrer** ou **muda de valor significativamente** gera alerta informativo.

---

## 11. Detecção de anomalias

| Anomalia | Mecanismo de detecção | Severidade |
|---|---|---|
| Transação duplicada (mesmo arquivo ou arquivos distintos) | Hash exato → bloqueio; heurística (mesmo valor+descrição, datas próximas) → alerta | Alta |
| Valor fora do padrão da categoria | Valor > mediana + 3×MAD da categoria na empresa (mín. de histórico exigido) | Média |
| Aumento inesperado de gastos | Categoria com crescimento > X% sobre média dos 3 meses anteriores | Média |
| Tarifa incomum | Tarifa nova (sem histórico) ou tarifa recorrente com valor alterado | Média |
| Cobrança recorrente desconhecida | Nova recorrência detectada sem categoria revisada | Baixa |
| Recorrência interrompida | Recorrência ativa sem ocorrência esperada no ciclo | Baixa |
| Saque/transferência atípica | Débito para contraparte nova acima do percentil 95 da conta | Alta |
| Quebra de sequência de saldo | `saldo_apos[n] ≠ saldo_apos[n−1] + valor[n]` → indica transação faltante no extrato ou erro de extração | Alta |
| Divergência saldo calculado × informado | Recomputação do período × saldo final do extrato | Alta |

Anomalias geram **alertas** (tabela `alertas`) com estados
`aberto → resolvido/ignorado`, sempre revisáveis por humano. O sistema
**sinaliza**; não bloqueia nem acusa — a decisão é do contador.

No MVP, toda detecção é por regra determinística e estatística simples
(mediana/MAD, percentis). Modelos de ML para anomalia só na versão avançada,
e ainda assim gerando alertas revisáveis, nunca ações automáticas.

---

## 12. Relatórios e dashboards (telas principais)

Seguindo `DESIGN.md` (paleta Attivare, Inter + Geist Mono para números
tabulares, densidade com respiro, estado nunca só por cor):

1. **Visão geral financeira** — cartões de receita, despesa, saldo do período
   e tarifas; gráfico de evolução do saldo; top categorias; alertas abertos.
2. **Lista de transações** — tabela densa com filtros (período, conta,
   categoria, status de revisão, valor); edição de categoria inline e em
   lote; indicador de confiança; link para o arquivo de origem.
3. **Fila de revisão** — só transações `pendente_revisao`, ordenadas por
   valor; atalhos de teclado para classificar rápido; opção "criar regra".
4. **Gastos por categoria** — barras/donut com percentuais, drill-down para
   as transações da categoria.
5. **Receitas por origem** — contrapartes recorrentes × eventuais.
6. **Evolução mensal** — série por categoria e total, 12 meses.
7. **Recorrências** — lista de assinaturas/contratos detectados, soma mensal
   comprometida, status.
8. **Alertas** — central de anomalias com triagem (resolver/ignorar).
9. **Comparação de períodos** — dois períodos lado a lado, variação absoluta
   e percentual por categoria.
10. **Importações** — histórico de arquivos, status, linhas rejeitadas,
    reprocessamento.
11. **Configurações** — contas bancárias, categorias da empresa, regras de
    categorização, usuários e papéis, retenção/exclusão de dados.

**Exportação:** CSV e XLSX (dados brutos e agregados) no MVP; PDF com
identidade Attivare (relatório mensal fechado) na Fase 2.

---

## 13. Arquitetura técnica recomendada

```
[Browser: Next.js/React]
        │ HTTPS
[API: FastAPI (Python)] ──── [Auth: sessões seguras ou JWT curto + refresh]
        │                          │
        │ enfileira            [PostgreSQL]
        ▼                      (dados + RLS por empresa)
[Fila: Redis + worker Celery/RQ]
        │
[Workers de processamento]
  ├─ parser CSV/XLSX (pandas/openpyxl)
  ├─ parser OFX (ofxparse)
  ├─ parser PDF (pdfplumber / Camelot)
  ├─ normalização + dedup
  ├─ categorização
  └─ insights (recorrências, anomalias)
        │
[Object storage criptografado] (arquivos originais + relatórios gerados)
        │
[Observabilidade: logs estruturados sem dados sensíveis, métricas, alertas]
```

Princípios:

- **Monolito modular no MVP** (API + workers no mesmo codebase, processos
  separados). Nada de microsserviços prematuros — os módulos (parsing,
  categorização, insights) são pacotes internos com fronteiras claras, o que
  permite extraí-los depois se necessário.
- **Processamento assíncrono desde o início** — parsing de PDF é lento e não
  pode segurar requisição HTTP.
- **Parsers como plugins**: interface comum `Parser.parse(arquivo) →
  list[TransacaoBruta]`; adicionar um banco novo = adicionar um parser + testes
  com arquivos de amostra anonimizados.
- **Idempotência**: reprocessar um arquivo nunca duplica transações (hash).

---

## 14. Tecnologias recomendadas

| Camada | Escolha | Justificativa |
|---|---|---|
| Backend | **Python 3.12 + FastAPI** | Ecossistema de parsing/dados (pandas, pdfplumber) é Python; FastAPI dá tipagem, OpenAPI e async |
| Frontend | **Next.js (React) + TypeScript** | Alinhado ao design system existente; SSR para dashboards |
| Banco | **PostgreSQL 16** | `numeric` exato, RLS, agregações, maturidade. SQLite apenas para protótipo local |
| Fila | **Redis + Celery** (ou RQ) | Processamento assíncrono simples e maduro |
| CSV/XLSX | **pandas + openpyxl** | Padrão de fato |
| OFX | **ofxparse** | Formato estruturado; bancos brasileiros exportam OFX amplamente |
| PDF digital | **pdfplumber** (texto/tabelas) + **Camelot** (tabelas complexas) | Cobrem a maioria dos extratos digitais |
| OCR (Fase 3) | **Tesseract** (por-BR) ou serviço gerenciado | Somente quando não houver texto extraível |
| ML (Fase 3+) | **scikit-learn** (TF-IDF + regressão logística/árvores) · embeddings/LLM só como sugestão assistida | Simples, auditável, barato |
| Autenticação | Sessões httpOnly + CSRF, ou JWT de vida curta com refresh; **MFA para contadores** | Perfil profissional multiempresa |
| Infra | **Docker**; PostgreSQL gerenciado; object storage com criptografia | Operação simples |
| Observabilidade | Logs estruturados (JSON), Prometheus + Grafana ou equivalente gerenciado | Sem dados sensíveis nos logs |
| Relatórios | XLSX via openpyxl; PDF via WeasyPrint/Playwright print | Reuso do layout web no PDF |

---

## 15. Segurança e LGPD

Dados bancários de PJ são dados sensíveis de negócio e frequentemente contêm
dados pessoais (nomes, chaves Pix, CPF de contrapartes). Tratamento desde o
desenho:

- **Base legal e consentimento** — termo explícito no upload: finalidade
  (análise financeira), retenção e direitos do titular. Registro do aceite.
- **Minimização** — extrai-se apenas o necessário (data, descrição, valor,
  tipo, saldo). Números completos de conta/agência, CPF/CNPJ de contrapartes
  e chaves Pix presentes nas descrições são **mascarados na ingestão**
  (`***.456.789-**`, `ag. ****/cc ****-3`) antes de persistir a descrição
  normalizada; a descrição original fica cifrada e acessível só por
  necessidade (auditoria).
- **Criptografia em trânsito** — TLS 1.2+ em tudo, incluindo tráfego interno.
- **Criptografia em repouso** — storage de arquivos com criptografia
  (envelope/KMS); disco do banco cifrado; campos de alta sensibilidade
  (descrição original) com criptografia em nível de aplicação.
- **Controle de acesso** — RBAC: contador vê as empresas às quais está
  vinculado; cliente vê só a própria empresa. RLS no PostgreSQL como segunda
  linha de defesa. MFA para contadores.
- **Logs sem dados sensíveis** — logs registram IDs e ações, nunca descrição
  completa, valores com contexto identificável, CPF ou conta. Validação por
  teste automatizado (scan de padrões sensíveis nos logs em CI).
- **Retenção e exclusão** — arquivo original excluído do storage após período
  configurável (padrão sugerido: 90 dias); exclusão definitiva da empresa
  remove transações, arquivos e relatórios (soft-delete → purge em 30 dias),
  com comprovante de exclusão. Backups cifrados com janela de retenção
  documentada e expurgo alinhado.
- **Auditoria de acesso** — `logs_auditoria` registra visualizações,
  alterações e exportações; imutável (append-only).
- **Segregação por tenant** — `empresa_id` obrigatório em toda query; testes
  automatizados de isolamento entre tenants.
- **Aviso permanente** — a interface deixa claro que as análises são
  informativas e não constituem aconselhamento financeiro profissional.

---

## 16. Estratégia de MVP — plano por fases

### Fase 1 — Núcleo de importação e análise (MVP mínimo)

- Cadastro de empresa, contas bancárias e usuários (contador/cliente).
- Upload de **CSV, XLSX e OFX** com pré-visualização e mapeamento de colunas.
- Pipeline: extração → normalização → dedup → categorização por **regras
  globais + regras da empresa**.
- Fila de revisão e correção manual (com "criar regra a partir da correção").
- Dashboard básico (visão geral + lista de transações + gastos por categoria).
- Exportação **CSV e XLSX**.
- Segurança de base: TLS, criptografia em repouso, RBAC, logs limpos,
  auditoria, mascaramento na ingestão.

*Nota: OFX entra na Fase 1 (e não depois do PDF) por ser formato estruturado,
amplamente exportado pelos bancos brasileiros e de parsing trivial — alto
valor por baixo custo.*

### Fase 2 — PDF digital e relatórios

- Parser de **PDF digital** (pdfplumber/Camelot) com layouts dos bancos
  prioritários (definir 3–5 bancos com os arquivos reais dos clientes
  Attivare; sugere-se iniciar por Itaú, Bradesco, Banco do Brasil, Santander
  e Caixa) + relatório de linhas rejeitadas.
- **Detecção de recorrências** e tela de recorrências.
- Relatório mensal em **PDF** com identidade Attivare.
- Comparação simples entre períodos.

### Fase 3 — Inteligência

- **OCR** para PDF escaneado (Tesseract, com marcação de menor confiança).
- **Similaridade textual** e primeiro **classificador ML** treinado nas
  correções acumuladas.
- **Detecção de anomalias** completa (seção 11) e central de alertas.
- Previsão simples de fluxo de caixa.

### Fase 4 — Escala e integrações

- Avaliação de integração com **Open Finance Brasil / APIs bancárias**
  (depende de definição de bancos, regulatório e consentimento — não iniciar
  sem essas respostas).
- ML avançado / LLM assistido para categorização.
- Multiusuário empresarial com papéis granulares e permissões por equipe.
- Integrações contábeis (seção "Melhorias futuras").

---

## 17. Critérios de aceitação (MVP)

1. Importar um CSV/XLSX/OFX válido de conta cadastrada sem erro, com
   pré-visualização fiel (datas, valores com sinal, descrições).
2. Reimportar o mesmo arquivo (ou arquivo com período sobreposto) **não**
   cria transações duplicadas.
3. ≥ 60% das transações de um extrato típico classificadas automaticamente
   com confiança ≥ 0.80 (meta inicial; medir e evoluir).
4. Toda transação com confiança < 0.80 aparece na fila de revisão; nenhuma
   transação ambígua é exibida como certa.
5. Correção manual em ≤ 2 cliques; correção pode gerar regra da empresa que
   se aplica a importações futuras.
6. Transferências entre contas cadastradas da mesma empresa não aparecem como
   receita nem despesa nos indicadores.
7. Relatório por período gerado e exportado em CSV e XLSX com os mesmos
   números do dashboard.
8. Nenhum dado sensível (CPF, conta completa, chave Pix, descrição integral)
   presente em logs — verificado por teste automatizado.
9. Usuário de uma empresa não acessa dados de outra — verificado por teste
   automatizado de isolamento.
10. Exclusão de dados solicitada pela empresa remove transações, arquivos e
    relatórios dentro do prazo da política, com registro de auditoria.
11. Arquivo com linhas ilegíveis importa as legíveis e lista as rejeitadas.

---

## 18. Riscos e limitações

| Risco | Impacto | Mitigação |
|---|---|---|
| Variação de layout entre bancos (e mudanças sem aviso) | Parsing quebra silenciosamente | Parsers por banco com testes de amostra; validação de sequência de saldo; pré-visualização obrigatória; monitorar taxa de rejeição |
| PDF sem texto extraível / escaneado com baixa qualidade | Extração impossível ou errada no MVP | Detectar e informar claramente ("este PDF é imagem; suporte via OCR na Fase 3"); nunca extrair "no chute" |
| Categorização incorreta | Perda de confiança do contador | Confiança explícita, fila de revisão, correção fácil, regras da empresa com precedência |
| Ambiguidade de descrição (ex.: `PIX JOAO SILVA`) | Classificação impossível sem contexto | Assumir `A classificar` + revisão; aprender com o histórico da empresa |
| Transferência interna não detectada (conta não cadastrada) | Receita/despesa inflada | Incentivar cadastro de todas as contas; heurística de valores espelhados; marcação manual |
| Fatura de cartão sem detalhamento | Gastos "escondidos" na fatura | Categoria própria e comunicação clara; integração de fatura como melhoria futura |
| Vazamento de dados financeiros | Dano grave e regulatório (LGPD) | Seção 15 completa; revisão de segurança antes do go-live; princípio do menor privilégio |
| Custo de processamento de PDF/OCR | Custo por arquivo alto em escala | OFX/CSV como caminho preferencial comunicado ao usuário; OCR somente sob demanda |
| Dependência futura de APIs externas (Open Finance) | Indisponibilidade fora do nosso controle | Import por arquivo permanece sempre como fallback |
| Duplicatas legítimas (duas cobranças iguais no mesmo dia) | Falso positivo de duplicidade | Índice de ocorrência no hash + alerta revisável em vez de descarte |

---

## 19. Melhorias futuras

- **Conciliação bancária** contra lançamentos do módulo de despesas já
  existente no produto (extrato × lançado manualmente).
- **Integração com sistemas contábeis** (exportação em layouts de Domínio,
  Alterdata, Omie etc.) — alto valor para o contador Attivare.
- **Importação de faturas de cartão de crédito** com decomposição do gasto.
- **Open Finance Brasil** — sincronização automática de transações mediante
  consentimento.
- **Alertas inteligentes** configuráveis (limiares por categoria, notificação
  por e-mail).
- **Previsão de fluxo de caixa** mais robusta (sazonalidade, cenários).
- **Planejamento orçamentário** (orçado × realizado por categoria).
- **Assistente conversacional** sobre os dados da empresa ("quanto gastamos
  com software no trimestre?"), com as mesmas garantias de escopo e de não
  aconselhamento.
- **Modo multiempresa para o contador**: visão consolidada da carteira,
  fila de revisão unificada entre clientes.

---

## Apêndice A — Pendências que dependem de decisão do negócio

1. **Bancos prioritários para parsers de PDF (Fase 2):** confirmar com a
   operação da Attivare quais bancos os clientes PJ mais usam; a sugestão
   Itaú/Bradesco/BB/Santander/Caixa é hipótese a validar com arquivos reais.
2. **Período de retenção do arquivo original:** sugerido 90 dias; validar com
   requisitos contábeis/fiscais da Attivare.
3. **Open Finance (Fase 4):** exige definição de participante regulatório,
   bancos-alvo e modelo de consentimento antes de qualquer desenho técnico.
