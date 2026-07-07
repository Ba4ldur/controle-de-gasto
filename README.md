# Attivare Reforma Intelligence

Plataforma para escritórios de contabilidade gerarem **diagnósticos preliminares**
sobre os impactos da **Reforma Tributária do Consumo** (CBS, IBS e Imposto
Seletivo) a partir dos dados do **cartão CNPJ** da empresa.

O sistema apoia vendas consultivas, planejamento tributário, revisão cadastral e
fiscal, e a preparação das empresas para o novo modelo. O diagnóstico por cartão
CNPJ é **qualitativo e preliminar** — não calcula impacto financeiro (isso exige
faturamento, regime, notas fiscais, margens e contratos) e deve ser revisado por
um profissional antes da emissão.

> **Importante:** este é um MVP focado no módulo **Diagnóstico Preliminar por
> Cartão CNPJ**. Nenhum dado é consultado automaticamente na Receita Federal ou
> e-CAC — o usuário fornece os documentos.

---

## Objetivo

Permitir que o contador:

1. Faça login.
2. Cadastre empresas.
3. Cole ou envie o cartão CNPJ (texto, PDF, imagem ou TXT).
4. Confira e edite os dados extraídos.
5. Classifique o perfil da empresa.
6. Gere um diagnóstico estruturado com IA (via Edge Function).
7. Revise o relatório (edição humana).
8. Salve o histórico por empresa.
9. Exporte/imprima em PDF e gere um resumo para WhatsApp.

---

## Stack

- **React 18 + TypeScript + Vite**
- **Tailwind CSS** (modo claro, identidade Attivare: azul escuro + dourado)
- **React Router**
- **Supabase**: Auth, Database (Postgres + RLS), Storage e Edge Functions
- **OpenAI** — chamada **apenas** pela Edge Function (a chave nunca vai ao frontend)
- **PDF.js** (`pdfjs-dist`) — extração de texto de PDF no navegador

---

## Modo demonstração

O app funciona **sem Supabase**. Se `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`
não estiverem definidas (ou `VITE_DEMO_MODE=true`), ele entra em **modo
demonstração**:

- Login aceita qualquer e-mail/senha.
- Empresas e análises são persistidas no `localStorage` do navegador.
- O diagnóstico é um **exemplo fictício** gerado localmente (sem chamar a
  OpenAI), claramente identificado como tal na interface.
- Há duas empresas fictícias pré-carregadas e um botão para carregar o texto de
  um cartão CNPJ de exemplo.

Isso permite avaliar o **fluxo completo** sem infraestrutura. Nada fictício é
apresentado como dado real.

---

## Como rodar localmente

Pré-requisitos: **Node 18+**.

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# (opcional para modo demo; obrigatório para produção)

# 3. Rodar em desenvolvimento
npm run dev
# abre em http://localhost:5173

# 4. Build de produção
npm run build

# 5. Pré-visualizar o build
npm run preview
```

Scripts adicionais:

```bash
npm run lint       # ESLint
npm run typecheck  # Verificação de tipos (tsc)
```

---

## Variáveis de ambiente

Arquivo `.env` na raiz (veja `.env.example`). **Nunca commite o `.env`.**

### Frontend (expostas ao navegador — use somente a chave pública)

| Variável                 | Descrição                                                        |
| ------------------------ | ---------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | URL do projeto Supabase.                                         |
| `VITE_SUPABASE_ANON_KEY` | Chave pública **anon** do Supabase (nunca a `service_role`).     |
| `VITE_DEMO_MODE`         | `true` força o modo demonstração. Padrão: `false`.               |

### Edge Function (segredos do servidor — definidos no Supabase, não no `.env` do front)

| Variável                    | Descrição                                              |
| --------------------------- | ------------------------------------------------------ |
| `OPENAI_API_KEY`            | Chave da OpenAI. **Somente no servidor.**              |
| `OPENAI_MODEL`              | Modelo (ex.: `gpt-4o-mini`). Padrão: `gpt-4o-mini`.    |
| `SUPABASE_URL`              | Injetada automaticamente no runtime da função.         |
| `SUPABASE_SERVICE_ROLE_KEY` | Injetada automaticamente (se necessária).             |

---

## Configuração do Supabase

### 1. Criar o projeto

Crie um projeto em [supabase.com](https://supabase.com) e copie a **URL** e a
chave **anon** para o `.env`.

### 2. Aplicar as migrations

As migrations estão em `supabase/migrations/`:

- `0001_schema.sql` — tabelas, funções e triggers (inclui criação automática de
  `profiles` ao registrar usuário no Auth).
- `0002_rls.sql` — **Row Level Security** em todas as tabelas (cada usuário só
  acessa seus registros; `admin` acessa todos).
- `0003_storage.sql` — bucket privado `analysis-documents` e políticas de acesso
  por pasta de usuário.
- `0004_security_hardening.sql` — impede escalonamento de privilégio (usuário
  comum não pode se tornar `admin` alterando o próprio `role`) e reforça o insert
  de documentos (só vincula a empresas/análises do próprio usuário).

> Para tornar um usuário administrador, altere `profiles.role` para `'admin'`
> diretamente no banco (com a `service_role`/SQL Editor) — a promoção não é
> possível pela interface nem pela própria conta, por segurança.

**Opção A — Supabase CLI (recomendado):**

```bash
npm install -g supabase        # se ainda não tiver
supabase link --project-ref <SEU_PROJECT_REF>
supabase db push               # aplica as migrations
```

**Opção B — SQL Editor:** cole e execute o conteúdo dos três arquivos, na ordem,
no SQL Editor do painel do Supabase.

### 3. Storage

O bucket **`analysis-documents`** é criado (privado) pela migration `0003`.
Uploads são salvos no caminho `user_id/company_id/analysis_id/arquivo`, e as
políticas garantem que cada usuário só acesse a própria pasta.

---

## Edge Function `generate-diagnosis`

Responsável por: validar a entrada, montar o prompt interno (contador sênior +
consultor tributário + especialista na Reforma), chamar a OpenAI exigindo
resposta **JSON**, validar a estrutura e devolver o diagnóstico. **A chave da
OpenAI existe apenas aqui.**

```bash
# Definir os segredos (servidor)
supabase secrets set OPENAI_API_KEY=sk-... OPENAI_MODEL=gpt-4o-mini

# Publicar a função
supabase functions deploy generate-diagnosis
```

O frontend a invoca via `supabase.functions.invoke('generate-diagnosis', …)`,
enviando o token do usuário logado (a função exige JWT válido —
`verify_jwt = true` em `supabase/config.toml`).

Se `VITE_DEMO_MODE=true` ou o Supabase não estiver configurado, o frontend não
chama a função: usa o gerador de exemplo local.

### Configurar a OpenAI

1. Gere uma chave em <https://platform.openai.com/api-keys>.
2. Defina os segredos no Supabase (nunca no `.env` do frontend):

   ```bash
   supabase secrets set OPENAI_API_KEY=sk-... OPENAI_MODEL=gpt-4o-mini
   ```

3. A função usa **Chat Completions com `response_format: json_object`**,
   `temperature: 0.2` e valida a estrutura do JSON retornado. Se a IA devolver
   um JSON inválido ou fora do schema, a função **tenta uma vez novamente** com
   instrução corretiva; persistindo a falha, retorna um erro claro
   (`code: invalid_ai_response` ou `openai_unavailable`) e o frontend marca a
   análise como `erro` (não fica presa em "processando").

---

## Como publicar (frontend)

O build (`npm run build`) gera arquivos estáticos em `dist/`, publicáveis em
qualquer host estático (Vercel, Netlify, Cloudflare Pages, Supabase Hosting…).
Defina as variáveis `VITE_*` no ambiente de build do provedor.

> Como o app usa rotas do lado do cliente, configure o host para servir
> `index.html` em qualquer rota (SPA fallback).

---

## Estrutura do projeto

```
src/
  components/
    analysis/    Wizard, UploadBox, ExtractedDataReview,
                 DiagnosisReport, DiagnosisEditor, WhatsAppSummaryModal
    company/     CompanyForm
    layout/      Layout, Sidebar, Topbar
    ui/          Badge, RiskBadge, StatCard, DataTable, Stepper, Modal,
                 Field, Toast, Logo, states, icons
  context/       AuthContext
  data/          sampleData, demoDiagnosis  (exemplos fictícios)
  hooks/         useAsync
  lib/           config, supabaseClient
  pages/         Login, Dashboard, Empresas, CompanyForm/Detail,
                 Análises, AnalysisNew (wizard), AnalysisDetail,
                 Configurações, BaseConhecimento, NotFound
  services/      auth, company, analysis, document, ai, classification,
                 pdfExtract, report, knowledge, diagnosisValidation, demoStore
  types/         database, diagnosis
  utils/         formatting, validation, cnpjCardParser, gut, impact, whatsapp
supabase/
  migrations/    0001_schema, 0002_rls, 0003_storage
  functions/
    generate-diagnosis/   index.ts, prompt.ts
  config.toml
```

---

## Segurança

- A **chave da OpenAI nunca aparece no frontend** — só na Edge Function.
- **RLS** ativado em todas as tabelas; bucket de storage **privado**.
- Uploads validados por **tipo** (PDF, PNG, JPG, JPEG, TXT) e **tamanho** (≤ 15 MB).
- Entradas de texto sanitizadas antes de persistir.

---

## Limitações do MVP

- O diagnóstico por cartão CNPJ é **qualitativo**; não calcula carga tributária.
- A extração automática cobre **texto** (colado, TXT e PDF pesquisável). PDFs
  escaneados/imagens exigem conferência manual (ou extração multimodal, que pode
  ser habilitada na Edge Function).
- A classificação por CNAE é uma **hipótese técnica** de conferência, não uma
  conclusão definitiva.
- A gestão de perfis/permissões por usuário (admin/contador/analista/cliente)
  está preparada no banco, mas a administração pela interface está **em
  desenvolvimento**.

---

## Próximos módulos sugeridos

1. Simulador Simples Híbrido.
2. Upload de PGDAS-D.
3. Upload de notas fiscais (entrada e saída).
4. Upload de DRE / balancete.
5. Simulação quantitativa de impacto.
6. Base de conhecimento legislativa com busca semântica.
7. Comparativo antes × depois.
8. Painel de oportunidades comerciais.
9. Relatório premium com capa institucional.

---

## Aviso profissional

Este diagnóstico é preliminar e elaborado com base nas informações do cartão CNPJ
e em dados complementares informados pelo usuário. **Não substitui** análise
tributária quantitativa baseada em documentos fiscais, contábeis, financeiros,
contratos, regime tributário, faturamento, margens, créditos e operações reais da
empresa. Não constitui parecer jurídico.
