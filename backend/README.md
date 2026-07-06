# Backend — Análise de Extrato Bancário (Fase 1)

Módulo do Controle de Gastos Attivare que importa extratos bancários (CSV,
XLSX e OFX), normaliza e deduplica transações, categoriza por regras com
nível de confiança e apresenta dashboard, revisão e exportação.

Especificação completa: [`docs/especificacao-analise-extrato-bancario.md`](../docs/especificacao-analise-extrato-bancario.md).

## Como executar localmente

```bash
cd backend
pip install -r requirements-dev.txt

# dados de demonstração (empresa, usuários, contas, categorias e regras)
python -m scripts.seed_demo

# servidor de desenvolvimento
uvicorn app.main:create_app --factory --reload
```

Acesse http://127.0.0.1:8000 e entre com:

- `contador@attivare.com.br` / `attivare-dev`
- `cliente@padariaestrela.com.br` / `cliente-dev`

Extratos de exemplo para testar o upload estão em `samples/`
(`extrato_exemplo.csv` e `extrato_exemplo.ofx`).

Por padrão o banco é SQLite local (`attivare.db`). Para PostgreSQL, defina
`DATABASE_URL`, por exemplo:

```bash
export DATABASE_URL=postgresql+psycopg://usuario:senha@localhost/attivare
```

(instale também o driver: `pip install "psycopg[binary]"`)

## Testes

```bash
cd backend
pytest
```

A suíte cobre parsers (CSV/XLSX/OFX), normalização de datas/valores/
descrições, hash de deduplicação, regras de categorização e precedência,
fluxo completo da API (preview → importação → correção → dashboard →
exportação), isolamento multiempresa e ausência de dados sensíveis em logs
e respostas.

## Validação manual (roteiro)

1. Faça login como contador e abra **Importar**.
2. Selecione a "Conta movimento" e envie `samples/extrato_exemplo.csv`;
   confira a pré-visualização (15 transações, período 02/06 a 30/06) e
   confirme.
3. Reenvie o mesmo arquivo: a importação é recusada ("já foi importado").
4. Em **Transações**, filtre por "Aguardando revisão": os PIX de
   recebimento e o TED genérico aparecem; corrija a categoria de um PIX com
   "criar regra" marcado e veja as semelhantes serem atualizadas.
5. Em **Visão geral**, confira receitas/despesas/saldo do período e as
   barras por categoria — a transferência interna e o estorno ficam fora do
   resultado.
6. Exporte o CSV em **Transações** e confira que descrições estão
   normalizadas e sem CPF/conta/chaves Pix.
7. Envie `samples/extrato_exemplo.ofx` na "Conta reserva": a transferência
   espelhada de 17/06 é marcada como interna nas duas contas.

## API (resumo)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/login` · `/logout` | Sessão (cookie httpOnly ou Bearer) |
| GET | `/api/auth/me` | Usuário + empresas vinculadas |
| GET/POST | `/api/empresas/{id}/contas` | Contas bancárias |
| GET | `/api/empresas/{id}/categorias` | Categorias globais + da empresa |
| POST | `/api/empresas/{id}/importacoes/preview` | Pré-visualização (não grava) |
| POST | `/api/empresas/{id}/importacoes` | Importa o extrato |
| GET | `/api/empresas/{id}/importacoes` | Histórico de arquivos |
| GET | `/api/empresas/{id}/transacoes` | Lista com filtros e paginação |
| PATCH | `/api/empresas/{id}/transacoes/{tid}` | Correção manual (+regra/semelhantes) |
| GET | `/api/empresas/{id}/transacoes/export.csv` | Exportação CSV |
| GET | `/api/empresas/{id}/dashboard` | Totais e categorias do período |

Documentação interativa: `/docs` (OpenAPI).

## Decisões e limitações da Fase 1

- **Processamento síncrono** — arquivos CSV/XLSX/OFX são leves; a fila
  assíncrona entra com o parser de PDF (Fase 2).
- **Schema via `create_all`** — sem migrations ainda; Alembic entra antes
  do primeiro deploy com dados reais.
- **Descrição original** fica no banco apenas para auditoria e nunca é
  exposta (API/logs/exportação usam a versão normalizada e mascarada);
  criptografia em nível de aplicação está prevista na especificação.
- **PDF, OCR e Open Finance** ficam para as Fases 2–4, conforme a
  especificação.
