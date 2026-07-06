/* Cliente da API — sessão via cookie httpOnly; empresa ativa em localStorage. */

const fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function dinheiro(centavos) {
  return fmtBRL.format((centavos || 0) / 100);
}

async function api(caminho, opcoes = {}) {
  const resp = await fetch(caminho, { credentials: "same-origin", ...opcoes });
  if (resp.status === 401 && location.pathname !== "/login") {
    location.href = "/login";
    throw new Error("não autenticado");
  }
  if (!resp.ok) {
    let detalhe = `Erro ${resp.status}`;
    try { detalhe = (await resp.json()).detail || detalhe; } catch (e) { /* corpo não-JSON */ }
    throw new Error(detalhe);
  }
  return resp.json();
}

function empresaAtual() {
  return localStorage.getItem("empresa_id");
}

function mostrarMensagem(el, texto, tipo) {
  el.textContent = texto;
  el.className = `mensagem ${tipo}`;
  el.hidden = false;
}

function primeiroDiaDoMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

/* Topbar: identifica o usuário, popula o seletor de empresa, trata logout. */
async function iniciarTopbar() {
  const me = await api("/api/auth/me");
  const seletor = document.getElementById("seletor-empresa");
  if (!me.empresas.length) return null;
  if (!empresaAtual() || !me.empresas.some((e) => e.id === empresaAtual())) {
    localStorage.setItem("empresa_id", me.empresas[0].id);
  }
  seletor.innerHTML = me.empresas
    .map((e) => `<option value="${e.id}">${e.nome}</option>`)
    .join("");
  seletor.value = empresaAtual();
  seletor.addEventListener("change", () => {
    localStorage.setItem("empresa_id", seletor.value);
    location.reload();
  });
  document.getElementById("botao-sair").addEventListener("click", async () => {
    await api("/api/auth/logout", { method: "POST" });
    location.href = "/login";
  });
  const atual = document.querySelector(`.topbar nav a[href="${location.pathname}"]`);
  if (atual) atual.classList.add("ativa");
  return me;
}

const base = () => `/api/empresas/${empresaAtual()}`;

/* ---------- páginas ---------- */

async function paginaLogin() {
  const form = document.getElementById("form-login");
  const msg = document.getElementById("mensagem");
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    try {
      const dados = await api("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.value,
          senha: form.senha.value,
        }),
      });
      if (dados.empresas.length) {
        localStorage.setItem("empresa_id", dados.empresas[0].id);
      }
      location.href = "/";
    } catch (e) {
      mostrarMensagem(msg, e.message, "erro");
    }
  });
}

async function paginaDashboard() {
  await iniciarTopbar();
  const inicio = document.getElementById("filtro-inicio");
  const fim = document.getElementById("filtro-fim");
  inicio.value = primeiroDiaDoMes();
  fim.value = hoje();

  async function carregar() {
    const d = await api(
      `${base()}/dashboard?inicio=${inicio.value}&fim=${fim.value}`
    );
    const setar = (id, centavos, classe) => {
      const el = document.getElementById(id);
      el.textContent = dinheiro(Math.abs(centavos));
      if (classe) el.classList.add(classe);
    };
    setar("m-receitas", d.receitas_centavos, "positivo");
    setar("m-despesas", d.despesas_centavos, "negativo");
    const saldoEl = document.getElementById("m-saldo");
    saldoEl.textContent = dinheiro(d.saldo_liquido_centavos);
    saldoEl.classList.add(d.saldo_liquido_centavos < 0 ? "negativo" : "positivo");
    setar("m-tarifas", d.tarifas_centavos);
    document.getElementById("m-pendentes").textContent = d.pendentes_revisao;

    const barras = document.getElementById("barras-despesas");
    if (!d.despesas_por_categoria.length) {
      barras.innerHTML = '<p class="subtitulo">Sem despesas no período.</p>';
    } else {
      barras.innerHTML = d.despesas_por_categoria
        .map(
          (c) => `<div class="barra-linha">
            <span class="barra-nome">${c.categoria}</span>
            <div class="barra-trilha"><div class="barra-preenchida" style="width:${c.percentual}%"></div></div>
            <span class="barra-valor">${dinheiro(c.total_centavos)} · ${c.percentual}%</span>
          </div>`
        )
        .join("");
    }
    const avisos = [];
    if (d.pendentes_revisao) avisos.push(`${d.pendentes_revisao} transação(ões) aguardando revisão`);
    if (d.possiveis_duplicidades) avisos.push(`${d.possiveis_duplicidades} possível(is) duplicidade(s)`);
    if (d.transferencias_internas) avisos.push(`${d.transferencias_internas} transferência(s) interna(s) fora do resultado`);
    const alertas = document.getElementById("alertas");
    alertas.innerHTML = avisos.length
      ? avisos.map((a) => `<span class="badge pendente">${a}</span>`).join(" ")
      : '<span class="badge revisada">Nada pendente no período</span>';
  }

  document.getElementById("botao-filtrar").addEventListener("click", carregar);
  await carregar();
}

async function paginaTransacoes() {
  await iniciarTopbar();
  const [categorias] = await Promise.all([api(`${base()}/categorias`)]);
  const filtroCat = document.getElementById("filtro-categoria");
  filtroCat.innerHTML =
    '<option value="">Todas</option>' +
    categorias.map((c) => `<option value="${c.id}">${c.nome}</option>`).join("");

  const corpo = document.getElementById("corpo-transacoes");
  const msg = document.getElementById("mensagem");
  const opcoesCategoria = categorias
    .map((c) => `<option value="${c.id}">${c.nome}</option>`)
    .join("");

  async function carregar() {
    const p = new URLSearchParams();
    const inicio = document.getElementById("filtro-inicio").value;
    const fim = document.getElementById("filtro-fim").value;
    const status = document.getElementById("filtro-status").value;
    if (inicio) p.set("inicio", inicio);
    if (fim) p.set("fim", fim);
    if (status) p.set("status", status);
    if (filtroCat.value) p.set("categoria_id", filtroCat.value);
    p.set("limite", "200");
    const dados = await api(`${base()}/transacoes?${p}`);
    document.getElementById("total-transacoes").textContent =
      `${dados.total} transação(ões)`;
    corpo.innerHTML = dados.itens
      .map((t) => {
        const marcas = [];
        if (t.status_revisao === "pendente_revisao")
          marcas.push('<span class="badge pendente">revisar</span>');
        if (t.status_revisao === "revisada")
          marcas.push('<span class="badge revisada">revisada</span>');
        if (t.possivel_duplicidade)
          marcas.push('<span class="badge alerta">possível duplicidade</span>');
        if (t.contraparte_interna)
          marcas.push('<span class="badge">interna</span>');
        const conf = t.metodo_categorizacao
          ? `${Math.round(t.confianca * 100)}%`
          : "—";
        return `<tr>
          <td>${t.data.split("-").reverse().join("/")}</td>
          <td>${t.descricao}</td>
          <td class="num ${t.valor_centavos < 0 ? "negativo" : ""}">${dinheiro(t.valor_centavos)}</td>
          <td><select data-id="${t.id}"><option value="">—</option>${opcoesCategoria}</select></td>
          <td class="num">${conf}</td>
          <td>${marcas.join(" ")}</td>
        </tr>`;
      })
      .join("");
    corpo.querySelectorAll("select").forEach((sel) => {
      const t = dados.itens.find((i) => i.id === sel.dataset.id);
      sel.value = t.categoria_id || "";
      sel.addEventListener("change", async () => {
        try {
          const resp = await api(`${base()}/transacoes/${sel.dataset.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              categoria_id: sel.value,
              criar_regra: document.getElementById("opt-regra").checked,
              aplicar_semelhantes: document.getElementById("opt-semelhantes").checked,
            }),
          });
          let texto = "Categoria atualizada.";
          if (resp.regra_criada) texto += " Regra criada para lançamentos futuros.";
          if (resp.aplicadas_semelhantes)
            texto += ` Aplicada a ${resp.aplicadas_semelhantes} transação(ões) semelhante(s).`;
          mostrarMensagem(msg, texto, "ok");
          await carregar();
        } catch (e) {
          mostrarMensagem(msg, e.message, "erro");
        }
      });
    });
  }

  document.getElementById("botao-filtrar").addEventListener("click", carregar);
  document.getElementById("botao-exportar").addEventListener("click", () => {
    const p = new URLSearchParams();
    const inicio = document.getElementById("filtro-inicio").value;
    const fim = document.getElementById("filtro-fim").value;
    if (inicio) p.set("inicio", inicio);
    if (fim) p.set("fim", fim);
    location.href = `${base()}/transacoes/export.csv?${p}`;
  });
  await carregar();
}

async function paginaImportar() {
  await iniciarTopbar();
  const contas = await api(`${base()}/contas`);
  const seletorConta = document.getElementById("conta");
  seletorConta.innerHTML = contas
    .map((c) => `<option value="${c.id}">${c.apelido} — ${c.banco}</option>`)
    .join("");

  const msg = document.getElementById("mensagem");
  const areaPreview = document.getElementById("area-preview");
  const botaoConfirmar = document.getElementById("botao-confirmar");

  function formData() {
    const fd = new FormData();
    fd.append("arquivo", document.getElementById("arquivo").files[0]);
    fd.append("conta_id", seletorConta.value);
    return fd;
  }

  function renderResumo(r, confirmado) {
    const rejeitadas = r.rejeitadas.length
      ? `<p class="subtitulo">Linhas rejeitadas: ${r.rejeitadas
          .map((x) => `linha ${x.linha} (${x.motivo})`)
          .join(", ")}</p>`
      : "";
    const linhas = r.preview
      .map(
        (t) => `<tr>
          <td>${t.data.split("-").reverse().join("/")}</td>
          <td>${t.descricao}</td>
          <td class="num ${t.valor_centavos < 0 ? "negativo" : ""}">${dinheiro(t.valor_centavos)}</td>
          <td>${t.categoria}</td>
          <td>${t.status_revisao === "pendente_revisao" ? '<span class="badge pendente">revisar</span>' : '<span class="badge revisada">ok</span>'}</td>
        </tr>`
      )
      .join("");
    areaPreview.innerHTML = `
      <div class="card secao">
        <h2>${confirmado ? "Importação concluída" : "Pré-visualização"} — ${r.formato.toUpperCase()},
          período ${r.periodo_inicio.split("-").reverse().join("/")} a ${r.periodo_fim.split("-").reverse().join("/")}</h2>
        <p class="subtitulo">${r.novas} nova(s) · ${r.duplicadas} duplicada(s) ignorada(s) ·
          ${r.rejeitadas.length} rejeitada(s) · ${r.pendentes_revisao} para revisão</p>
        ${rejeitadas}
        <table>
          <thead><tr><th>Data</th><th>Descrição</th><th class="num">Valor</th><th>Categoria</th><th>Status</th></tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>`;
  }

  document.getElementById("botao-preview").addEventListener("click", async () => {
    msg.hidden = true;
    if (!document.getElementById("arquivo").files.length) {
      mostrarMensagem(msg, "Selecione um arquivo.", "erro");
      return;
    }
    try {
      const r = await api(`${base()}/importacoes/preview`, {
        method: "POST",
        body: formData(),
      });
      renderResumo(r, false);
      botaoConfirmar.hidden = r.novas === 0;
    } catch (e) {
      mostrarMensagem(msg, e.message, "erro");
    }
  });

  botaoConfirmar.addEventListener("click", async () => {
    botaoConfirmar.disabled = true;
    try {
      const r = await api(`${base()}/importacoes`, {
        method: "POST",
        body: formData(),
      });
      renderResumo(r, true);
      botaoConfirmar.hidden = true;
      mostrarMensagem(
        msg,
        `Importação concluída: ${r.novas} transação(ões). ` +
          (r.pendentes_revisao
            ? `${r.pendentes_revisao} aguardando revisão em Transações.`
            : ""),
        "ok"
      );
    } catch (e) {
      mostrarMensagem(msg, e.message, "erro");
    } finally {
      botaoConfirmar.disabled = false;
    }
  });
}

async function paginaImportacoes() {
  await iniciarTopbar();
  const arquivos = await api(`${base()}/importacoes`);
  document.getElementById("corpo-importacoes").innerHTML = arquivos.length
    ? arquivos
        .map(
          (a) => `<tr>
        <td>${a.nome_original}</td>
        <td>${a.formato.toUpperCase()}</td>
        <td>${a.periodo_inicio ? a.periodo_inicio.split("-").reverse().join("/") : "—"} a
            ${a.periodo_fim ? a.periodo_fim.split("-").reverse().join("/") : "—"}</td>
        <td class="num">${a.linhas_importadas}</td>
        <td class="num">${a.linhas_duplicadas}</td>
        <td class="num">${a.linhas_rejeitadas}</td>
        <td>${new Date(a.criado_em).toLocaleString("pt-BR")}</td>
      </tr>`
        )
        .join("")
    : '<tr><td colspan="7">Nenhuma importação ainda. <a href="/importar">Importar extrato</a>.</td></tr>';
}

/* Roteia pela marcação data-page do body. */
document.addEventListener("DOMContentLoaded", () => {
  const pagina = document.body.dataset.page;
  const rotas = {
    login: paginaLogin,
    dashboard: paginaDashboard,
    transacoes: paginaTransacoes,
    importar: paginaImportar,
    importacoes: paginaImportacoes,
  };
  if (rotas[pagina]) {
    rotas[pagina]().catch((e) => console.error(e.message));
  }
});
