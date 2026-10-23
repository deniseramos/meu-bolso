// Meu Bolso — lógica do app.
// Regra de ouro: um gasto só aparece na tela depois que o banco confirma que ele foi salvo.
(function () {
  "use strict";

  const cfg = window.MEU_BOLSO || {};
  const $ = (id) => document.getElementById(id);
  const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  const MSG_SEM_INTERNET = "Sem internet. Confira a conexão e tente de novo.";
  const MSG_GASTO_NAO_SALVO = "Sem internet. Este gasto não foi salvo. Toque em Salvar de novo quando a conexão voltar.";
  const LADO_MAXIMO_FOTO = 1600;

  if (!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_CHAVE_PUBLICA) {
    mostrarMsg($("entrada-msg"), "Não consegui carregar o app. Confira a internet e recarregue a página.", "erro");
    return;
  }

  const banco = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_CHAVE_PUBLICA);
  const categorias = Array.isArray(cfg.CATEGORIAS) ? cfg.CATEGORIAS : ["Outros"];

  let usuario = null;
  let categoriaEscolhida = null;
  let salvando = false;
  let perguntando = false;
  let filtroMes = new Date().getMonth() + 1; // 0 = ano inteiro
  let filtroAno = new Date().getFullYear();
  let pedidoDoPeriodo = 0; // só a resposta do último filtro escolhido vai para a tela

  // ---------- Utilidades ----------

  function mostrarMsg(el, texto, tipo) {
    if (!el) return;
    el.textContent = texto || "";
    el.className = "msg" + (tipo ? " " + tipo : "");
  }

  function traduzirErro(erro, msgSemInternet) {
    const texto = String((erro && (erro.message || erro.error_description)) || erro || "").toLowerCase();
    if (!navigator.onLine || texto.includes("failed to fetch") || texto.includes("network") || texto.includes("load failed")) {
      return msgSemInternet || MSG_SEM_INTERNET;
    }
    if (texto.includes("invalid login credentials")) return "E-mail ou senha incorretos. Confira e tente de novo.";
    if (texto.includes("already registered") || texto.includes("already exists")) return "Este e-mail já tem conta. Toque em Entrar.";
    if (texto.includes("different from the old password")) return "A nova senha é igual à atual. Escolha uma senha diferente.";
    if (texto.includes("weak") || texto.includes("pwned")) return "Essa senha é fácil de adivinhar. Escolha outra, misturando letras e números.";
    if (texto.includes("password should be") || texto.includes("password must")) return "A senha precisa ter pelo menos 6 caracteres. Escolha uma senha maior.";
    if (texto.includes("email not confirmed")) return "Este e-mail ainda não foi confirmado. Desligue a confirmação de e-mail no Supabase e tente entrar de novo.";
    if (texto.includes("invalid format") || texto.includes("invalid email") || texto.includes("is invalid")) return "Esse e-mail não parece válido. Confira o endereço.";
    if (texto.includes("rate limit") || texto.includes("too many")) return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
    if (texto.includes("row-level security") || texto.includes("permission denied")) return "O banco recusou o pedido pela proteção por linha. Saia, entre de novo e tente outra vez.";
    if (texto.includes("jwt") || texto.includes("not authenticated")) return "Sua entrada expirou. Toque em Sair e entre de novo.";
    return "Algo deu errado. Tente de novo em instantes.";
  }

  function doisDigitos(n) { return String(n).padStart(2, "0"); }

  function hoje() {
    const d = new Date();
    return d.getFullYear() + "-" + doisDigitos(d.getMonth() + 1) + "-" + doisDigitos(d.getDate());
  }

  // Período escolhido nos filtros: do primeiro dia (inclusive) ao "fim" (exclusive).
  function limitesDoPeriodo() {
    if (!filtroMes) {
      return { inicio: filtroAno + "-01-01", fim: (filtroAno + 1) + "-01-01" };
    }
    const proxAno = filtroMes === 12 ? filtroAno + 1 : filtroAno;
    const proxMes = filtroMes === 12 ? 1 : filtroMes + 1;
    return {
      inicio: filtroAno + "-" + doisDigitos(filtroMes) + "-01",
      fim: proxAno + "-" + doisDigitos(proxMes) + "-01"
    };
  }

  function nomeDoMes(mes) {
    const nome = new Date(2000, mes - 1, 1).toLocaleDateString("pt-BR", { month: "long" });
    return nome.charAt(0).toUpperCase() + nome.slice(1);
  }

  function nomeDoPeriodo() {
    return filtroMes ? nomeDoMes(filtroMes).toLowerCase() + " de " + filtroAno : String(filtroAno);
  }

  // Dias que entram na média: o período inteiro se já passou; até hoje se é o atual; zero se é futuro.
  function diasParaMedia() {
    const { inicio, fim } = limitesDoPeriodo();
    const dia = 24 * 60 * 60 * 1000;
    const comeco = new Date(inicio + "T00:00:00");
    const final = new Date(fim + "T00:00:00");
    const agora = new Date();
    const amanha = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);
    const ate = amanha < final ? amanha : final;
    return Math.max(0, Math.round((ate - comeco) / dia));
  }

  function dataCurta(iso) {
    const [ano, mes, dia] = String(iso).slice(0, 10).split("-");
    return dia && mes ? dia + "/" + mes : "";
  }

  function lerValor(texto) {
    let s = String(texto || "").replace(/R\$|\s/g, "");
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
  }

  // ---------- Entrada ----------

  function lerCredenciais() {
    const email = $("email").value.trim();
    const senha = $("senha").value;
    if (!email || !senha) {
      mostrarMsg($("entrada-msg"), "Preencha o e-mail e a senha para continuar.", "erro");
      return null;
    }
    return { email: email, password: senha };
  }

  function travarEntrada(travar) {
    $("btn-entrar").disabled = travar;
    $("btn-criar").disabled = travar;
  }

  async function entrar(evento) {
    evento.preventDefault();
    const cred = lerCredenciais();
    if (!cred) return;
    travarEntrada(true);
    mostrarMsg($("entrada-msg"), "Entrando…");
    try {
      const { error } = await banco.auth.signInWithPassword(cred);
      if (error) throw error;
      mostrarMsg($("entrada-msg"), "");
    } catch (erro) {
      mostrarMsg($("entrada-msg"), traduzirErro(erro), "erro");
    } finally {
      travarEntrada(false);
    }
  }

  async function criarConta() {
    const cred = lerCredenciais();
    if (!cred) return;
    if (cred.password.length < 6) {
      mostrarMsg($("entrada-msg"), "A senha precisa ter pelo menos 6 caracteres. Escolha uma senha maior.", "erro");
      return;
    }
    travarEntrada(true);
    mostrarMsg($("entrada-msg"), "Criando a conta…");
    try {
      const { data, error } = await banco.auth.signUp(cred);
      if (error) throw error;
      if (!data.session) {
        mostrarMsg($("entrada-msg"), "A conta foi criada, mas o Supabase está pedindo confirmação de e-mail. Desligue \"Confirm email\" em Authentication no Supabase e toque em Entrar.", "erro");
      } else {
        mostrarMsg($("entrada-msg"), "");
      }
    } catch (erro) {
      mostrarMsg($("entrada-msg"), traduzirErro(erro), "erro");
    } finally {
      travarEntrada(false);
    }
  }

  async function sair() {
    try {
      const { error } = await banco.auth.signOut();
      if (error) throw error;
    } catch (erro) {
      mostrarMsg($("mes-msg"), traduzirErro(erro), "erro");
    }
  }

  function aplicarSessao(sessao) {
    const novo = sessao ? sessao.user : null;
    const idNovo = novo ? novo.id : null;
    const idAtual = usuario ? usuario.id : null;
    if (idNovo === idAtual) return; // só renovou a entrada, nada muda na tela
    usuario = novo;
    $("entrada").hidden = !!usuario;
    $("painel").hidden = !usuario;
    if (usuario) {
      $("senha").value = "";
      limparFormulario();
      filtroMes = new Date().getMonth() + 1;
      filtroAno = new Date().getFullYear();
      carregarTudo();
    } else {
      limparPainel();
    }
  }

  // ---------- Painel ----------

  function limparPainel() {
    $("total").textContent = "—";
    $("media").textContent = "";
    $("ultimos").replaceChildren();
    $("lista-mes").replaceChildren();
    $("barras").replaceChildren();
    $("resumo").hidden = true;
    ["mes-msg", "lancar-msg", "assistente-msg", "senha-msg"].forEach((id) => mostrarMsg($(id), ""));
    ["senha-atual", "senha-nova", "senha-repetir"].forEach((id) => { $(id).value = ""; });
    $("senha-cartao").open = false;
  }

  function carregarTudo() {
    desenharFiltros();
    return Promise.all([carregarMes(), carregarUltimos(), carregarResumo(), carregarAnos()]);
  }

  // Depois de lançar ou apagar: atualiza tudo sem perder o filtro escolhido.
  function atualizarPainel() {
    return Promise.all([carregarMes(), carregarUltimos(), carregarAnos()]);
  }

  // ---------- Filtros de mês e ano ----------

  function desenharFiltros(anos) {
    const caixaMes = $("filtro-mes");
    if (!caixaMes.options.length) {
      caixaMes.append(new Option("Ano inteiro", "0"));
      for (let m = 1; m <= 12; m++) caixaMes.append(new Option(nomeDoMes(m), String(m)));
    }
    caixaMes.value = String(filtroMes);

    const atual = new Date().getFullYear();
    const lista = (anos && anos.length) ? anos : [atual];
    if (!lista.includes(filtroAno)) lista.push(filtroAno);
    lista.sort((a, b) => b - a);
    const caixaAno = $("filtro-ano");
    caixaAno.replaceChildren(...lista.map((a) => new Option(String(a), String(a))));
    caixaAno.value = String(filtroAno);
  }

  // Anos do primeiro gasto até o ano atual.
  async function carregarAnos() {
    try {
      const { data, error } = await banco
        .from("gastos")
        .select("data")
        .order("data", { ascending: true })
        .limit(1);
      if (error) throw error;
      const atual = new Date().getFullYear();
      const primeiro = data && data[0] ? Math.min(Number(String(data[0].data).slice(0, 4)) || atual, atual) : atual;
      const anos = [];
      for (let a = atual; a >= primeiro; a--) anos.push(a);
      desenharFiltros(anos);
    } catch (erro) {
      // Sem a lista do banco, fica só o ano atual e o escolhido; o erro já aparece no total.
      desenharFiltros();
    }
  }

  function trocarFiltro() {
    filtroMes = Number($("filtro-mes").value) || 0;
    filtroAno = Number($("filtro-ano").value) || new Date().getFullYear();
    carregarMes();
  }

  function itemVazio(texto) {
    const li = document.createElement("li");
    li.className = "vazio";
    li.textContent = texto;
    return li;
  }

  function criarItem(gasto, comApagar) {
    const li = document.createElement("li");
    li.className = "item";

    const info = document.createElement("div");
    info.className = "item-info";
    const titulo = document.createElement("p");
    titulo.className = "item-titulo";
    titulo.textContent = gasto.descricao || gasto.categoria;
    const detalhe = document.createElement("p");
    detalhe.className = "item-detalhe";
    detalhe.textContent = gasto.categoria + " · " + dataCurta(gasto.data);
    info.append(titulo, detalhe);

    const valor = document.createElement("span");
    valor.className = "item-valor";
    valor.textContent = moeda.format(Number(gasto.valor) || 0);

    li.append(info, valor);

    if (comApagar) {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = "item-apagar";
      botao.textContent = "Apagar";
      botao.setAttribute("aria-label", "Apagar " + titulo.textContent + " de " + valor.textContent);
      botao.addEventListener("click", () => apagar(gasto.id, botao));
      li.append(botao);
    }
    return li;
  }

  async function carregarMes() {
    const { inicio, fim } = limitesDoPeriodo();
    const pedido = ++pedidoDoPeriodo;
    $("mes-nome").textContent = nomeDoPeriodo();
    $("lista-titulo").textContent = "Gastos de " + nomeDoPeriodo();
    try {
      const { data, error } = await banco
        .from("gastos")
        .select("id, data, descricao, valor, categoria, origem, criado_em")
        .gte("data", inicio)
        .lt("data", fim)
        .order("data", { ascending: false })
        .order("criado_em", { ascending: false });
      if (error) throw error;
      if (pedido !== pedidoDoPeriodo) return; // outro filtro foi escolhido enquanto este carregava
      mostrarMsg($("mes-msg"), "");
      desenharMes(data || []);
    } catch (erro) {
      if (pedido !== pedidoDoPeriodo) return;
      // Sem dado confirmado, não mostro número nenhum.
      $("total").textContent = "—";
      $("media").textContent = "";
      $("lista-mes").replaceChildren(itemVazio("Não consegui carregar os gastos de " + nomeDoPeriodo() + "."));
      $("barras").replaceChildren();
      mostrarMsg($("mes-msg"), traduzirErro(erro), "erro");
    }
  }

  function desenharMes(gastos) {
    const total = gastos.reduce((soma, g) => soma + (Number(g.valor) || 0), 0);
    $("total").textContent = moeda.format(total);
    const dias = diasParaMedia();
    $("media").textContent = dias > 0 ? "Média de " + moeda.format(total / dias) + " por dia" : "";

    const lista = $("lista-mes");
    lista.replaceChildren();
    if (!gastos.length) {
      lista.append(itemVazio("Nenhum gasto em " + nomeDoPeriodo() + "."));
    } else {
      gastos.forEach((g) => lista.append(criarItem(g, true)));
    }

    const somas = {};
    gastos.forEach((g) => {
      const c = g.categoria || "Outros";
      somas[c] = (somas[c] || 0) + (Number(g.valor) || 0);
    });
    const ordem = Object.keys(somas).sort((a, b) => somas[b] - somas[a]);
    const maior = ordem.length ? somas[ordem[0]] : 0;

    const barras = $("barras");
    barras.replaceChildren();
    if (!ordem.length) {
      barras.append(itemVazio("As barras aparecem depois do primeiro gasto."));
      return;
    }
    ordem.forEach((c) => {
      const li = document.createElement("li");
      li.className = "barra";
      const topo = document.createElement("div");
      topo.className = "barra-topo";
      const nome = document.createElement("span");
      nome.textContent = c;
      const valor = document.createElement("strong");
      valor.textContent = moeda.format(somas[c]);
      topo.append(nome, valor);
      const trilho = document.createElement("div");
      trilho.className = "barra-trilho";
      const cheia = document.createElement("div");
      cheia.className = "barra-cheia";
      cheia.style.width = (maior > 0 ? Math.max(2, (somas[c] / maior) * 100) : 0) + "%";
      trilho.append(cheia);
      li.append(topo, trilho);
      barras.append(li);
    });
  }

  async function carregarUltimos() {
    const lista = $("ultimos");
    try {
      const { data, error } = await banco
        .from("gastos")
        .select("id, data, descricao, valor, categoria, criado_em")
        .order("criado_em", { ascending: false })
        .limit(5);
      if (error) throw error;
      lista.replaceChildren();
      if (!data || !data.length) {
        lista.append(itemVazio("Nenhum lançamento ainda. Lance o primeiro logo abaixo."));
      } else {
        data.forEach((g) => lista.append(criarItem(g, false)));
      }
    } catch (erro) {
      lista.replaceChildren(itemVazio("Não consegui carregar os últimos lançamentos."));
      mostrarMsg($("mes-msg"), traduzirErro(erro), "erro");
    }
  }

  async function carregarResumo() {
    try {
      const { data, error } = await banco
        .from("resumos")
        .select("texto, criado_em")
        .order("criado_em", { ascending: false })
        .limit(1);
      if (error) throw error;
      const resumo = data && data[0];
      if (!resumo || !resumo.texto) {
        $("resumo").hidden = true;
        return;
      }
      $("resumo-texto").textContent = resumo.texto;
      $("resumo-data").textContent = resumo.criado_em
        ? "Feito em " + new Date(resumo.criado_em).toLocaleDateString("pt-BR")
        : "";
      $("resumo").hidden = false;
    } catch (erro) {
      $("resumo").hidden = true;
    }
  }

  async function apagar(id, botao) {
    if (!window.confirm("Apagar este gasto?")) return;
    botao.disabled = true;
    try {
      const { data, error } = await banco.from("gastos").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data || !data.length) {
        mostrarMsg($("mes-msg"), "Não consegui apagar este gasto. Recarregue a página e tente de novo.", "erro");
        botao.disabled = false;
        return;
      }
      mostrarMsg($("mes-msg"), "Gasto apagado.", "ok");
      await atualizarPainel();
    } catch (erro) {
      mostrarMsg($("mes-msg"), traduzirErro(erro), "erro");
      botao.disabled = false;
    }
  }

  // ---------- Lançar à mão ----------

  function desenharCategorias() {
    const caixa = $("categorias");
    caixa.replaceChildren();
    categorias.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "categoria";
      b.textContent = c;
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", () => escolherCategoria(c));
      caixa.append(b);
    });
  }

  function escolherCategoria(c) {
    categoriaEscolhida = c;
    $("categorias").querySelectorAll(".categoria").forEach((b) => {
      b.setAttribute("aria-pressed", b.textContent === c ? "true" : "false");
    });
  }

  function limparFormulario() {
    $("valor").value = "";
    $("descricao").value = "";
    $("data").value = hoje();
    categoriaEscolhida = null;
    escolherCategoria(null);
  }

  async function salvarGasto(evento) {
    evento.preventDefault();
    if (salvando) return; // evita gasto repetido por toque duplo

    const msg = $("lancar-msg");
    const valor = lerValor($("valor").value);
    if (!(valor > 0)) {
      mostrarMsg(msg, "Digite um valor maior que zero, por exemplo 23,50.", "erro");
      $("valor").focus();
      return;
    }
    if (!categoriaEscolhida) {
      mostrarMsg(msg, "Toque em uma categoria para continuar.", "erro");
      return;
    }
    if (!navigator.onLine) {
      mostrarMsg(msg, MSG_GASTO_NAO_SALVO, "erro");
      return;
    }

    const botao = $("btn-salvar");
    salvando = true;
    botao.disabled = true;
    botao.textContent = "Salvando…";
    mostrarMsg(msg, "");

    try {
      const { error } = await banco.from("gastos").insert({
        dono: usuario.id,
        data: $("data").value || hoje(),
        descricao: $("descricao").value.trim() || null,
        valor: valor,
        categoria: categoriaEscolhida,
        origem: "manual"
      });
      if (error) throw error;
      limparFormulario();
      mostrarMsg(msg, "Gasto salvo.", "ok");
      await atualizarPainel();
    } catch (erro) {
      // O valor digitado continua no campo para tentar de novo.
      mostrarMsg(msg, traduzirErro(erro, MSG_GASTO_NAO_SALVO), "erro");
    } finally {
      salvando = false;
      botao.disabled = false;
      botao.textContent = "Salvar";
    }
  }

  // ---------- Alterar senha ----------

  async function alterarSenha(evento) {
    evento.preventDefault();
    const msg = $("senha-msg");
    const atual = $("senha-atual").value;
    const nova = $("senha-nova").value;
    const repetir = $("senha-repetir").value;

    if (!atual || !nova || !repetir) {
      mostrarMsg(msg, "Preencha os três campos para continuar.", "erro");
      return;
    }
    if (nova.length < 6) {
      mostrarMsg(msg, "A nova senha precisa ter pelo menos 6 caracteres.", "erro");
      return;
    }
    if (nova !== repetir) {
      mostrarMsg(msg, "As duas senhas novas não são iguais. Digite de novo.", "erro");
      return;
    }
    if (nova === atual) {
      mostrarMsg(msg, "A nova senha é igual à atual. Escolha uma senha diferente.", "erro");
      return;
    }

    const botao = $("btn-senha");
    botao.disabled = true;
    botao.textContent = "Salvando…";
    mostrarMsg(msg, "");

    try {
      // Confere a senha atual antes de trocar.
      const conferencia = await banco.auth.signInWithPassword({ email: usuario.email, password: atual });
      if (conferencia.error) {
        const texto = String(conferencia.error.message || "").toLowerCase();
        if (texto.includes("invalid login credentials")) {
          mostrarMsg(msg, "A senha atual não confere. Confira e tente de novo.", "erro");
          return;
        }
        throw conferencia.error;
      }
      const { error } = await banco.auth.updateUser({ password: nova });
      if (error) throw error;
      ["senha-atual", "senha-nova", "senha-repetir"].forEach((id) => { $(id).value = ""; });
      mostrarMsg(msg, "Senha alterada.", "ok");
    } catch (erro) {
      mostrarMsg(msg, traduzirErro(erro), "erro");
    } finally {
      botao.disabled = false;
      botao.textContent = "Salvar nova senha";
    }
  }

  // ---------- Assistente ----------
  // A foto do cupom é reduzida aqui no aparelho e só segue para a função; ela não é guardada.

  const campoFoto = $("foto-cupom");

  function travarAssistente(travar) {
    perguntando = travar;
    $("form-assistente").querySelectorAll("button, input").forEach((el) => { el.disabled = travar; });
    $("btn-foto").classList.toggle("travado", travar);
  }

  function carregarImagem(arquivo) {
    return new Promise((resolver, rejeitar) => {
      const endereco = URL.createObjectURL(arquivo);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(endereco); resolver(img); };
      img.onerror = () => { URL.revokeObjectURL(endereco); rejeitar(new Error("foto")); };
      img.src = endereco;
    });
  }

  // Devolve a foto em JPEG, com no máximo 1600 px no lado maior, sem o prefixo "data:".
  async function reduzirFoto(arquivo) {
    const img = await carregarImagem(arquivo);
    const escala = Math.min(1, LADO_MAXIMO_FOTO / Math.max(img.naturalWidth, img.naturalHeight));
    const tela = document.createElement("canvas");
    tela.width = Math.round(img.naturalWidth * escala);
    tela.height = Math.round(img.naturalHeight * escala);
    tela.getContext("2d").drawImage(img, 0, 0, tela.width, tela.height);
    const dados = tela.toDataURL("image/jpeg", 0.85);
    tela.width = tela.height = 0; // libera a memória da foto
    return dados.slice(dados.indexOf(",") + 1);
  }

  async function perguntarAssistente(pedido) {
    const msg = $("assistente-msg");
    if (!navigator.onLine) {
      mostrarMsg(msg, MSG_SEM_INTERNET, "erro");
      return;
    }
    travarAssistente(true);
    mostrarMsg(msg, pedido.imagem ? "Lendo o cupom…" : "Pensando…");
    try {
      const { data } = await banco.auth.getSession();
      const token = data && data.session && data.session.access_token;
      if (!token) {
        mostrarMsg(msg, "Sua entrada expirou. Toque em Sair e entre de novo.", "erro");
        return;
      }
      const resp = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ ...pedido, categorias: categorias })
      });
      let corpo = {};
      try { corpo = await resp.json(); } catch (_) { /* resposta sem JSON */ }
      if (!resp.ok) {
        mostrarMsg(msg, corpo.erro || "O assistente não respondeu. Tente de novo em instantes.", "erro");
        return;
      }
      mostrarMsg(msg, corpo.resposta || "", corpo.lancou ? "ok" : "");
      if (corpo.lancou) {
        $("assistente-texto").value = "";
        await atualizarPainel();
      }
    } catch (erro) {
      mostrarMsg(msg, traduzirErro(erro), "erro");
    } finally {
      travarAssistente(false);
    }
  }

  function enviarTexto(evento) {
    evento.preventDefault();
    if (perguntando) return;
    const mensagem = $("assistente-texto").value.trim();
    if (!mensagem) {
      mostrarMsg($("assistente-msg"), "Escreva um gasto, por exemplo: mercado 50 hoje.", "erro");
      $("assistente-texto").focus();
      return;
    }
    perguntarAssistente({ mensagem: mensagem });
  }

  async function enviarFoto() {
    const arquivo = campoFoto.files && campoFoto.files[0];
    campoFoto.value = ""; // esquece o arquivo escolhido
    if (!arquivo || perguntando) return;
    let imagem;
    try {
      imagem = await reduzirFoto(arquivo);
    } catch (erro) {
      mostrarMsg($("assistente-msg"), "Não consegui abrir essa foto. Tire outra foto do cupom e tente de novo.", "erro");
      return;
    }
    perguntarAssistente({ mensagem: $("assistente-texto").value.trim(), imagem: imagem, mime: "image/jpeg" });
  }

  // ---------- Início ----------

  desenharCategorias();
  $("data").value = hoje();

  $("form-entrada").addEventListener("submit", entrar);
  $("btn-criar").addEventListener("click", criarConta);
  $("btn-sair").addEventListener("click", sair);
  $("form-lancar").addEventListener("submit", salvarGasto);
  $("filtro-mes").addEventListener("change", trocarFiltro);
  $("filtro-ano").addEventListener("change", trocarFiltro);
  $("form-senha").addEventListener("submit", alterarSenha);
  $("form-assistente").addEventListener("submit", enviarTexto);
  campoFoto.addEventListener("change", enviarFoto);

  // O Supabase avisa quando a pessoa entra ou sai; o setTimeout evita travar o cliente.
  banco.auth.onAuthStateChange((_evento, sessao) => {
    setTimeout(() => aplicarSessao(sessao), 0);
  });
})();
