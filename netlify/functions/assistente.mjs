// Meu Bolso — assistente que lança e consulta gastos a partir de uma frase ou da foto do cupom.
// Regras: a chave do Gemini vem só de process.env.CHAVE_GEMINI; o banco é usado com o login
// da própria pessoa (proteção por linha vale); os totais vêm da soma do banco, nunca do modelo.
// A foto do cupom só passa por aqui a caminho do Gemini e não é guardada.

// Copiados de app/configuracao.js (são públicos).
const SUPABASE_URL = "https://fznpyyyuzpyvppbxrqfd.supabase.co";
const SUPABASE_CHAVE_PUBLICA = "sb_publishable_fneqH27mpxYy7QFfa70TCQ_xqlRQWDg";

const MODELO = "gemini-3.5-flash-lite";
const CATEGORIAS_PADRAO = ["Alimentação", "Farmácia", "Uber", "Vestimentas", "Estudos", "Viagem", "Outros"];
const TIPOS_DE_FOTO = ["image/jpeg", "image/png", "image/webp"];

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const config = { path: "/api/assistente" };

// ---------- Erros em português ----------

class ErroAssistente extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

const ERRO_SEM_CHAVE = "O assistente está sem a chave do Gemini. Cadastre CHAVE_GEMINI nas variáveis de ambiente do Netlify e publique de novo.";
const ERRO_LOGIN = "Sua entrada expirou. Toque em Sair e entre de novo.";
const ERRO_LIMITE = "O assistente atingiu o limite de uso do Gemini. Espere alguns minutos e tente de novo.";
const ERRO_TABELA = "A tabela gastos não existe no Supabase. Crie a tabela e tente de novo.";
const ERRO_GERAL = "O assistente não conseguiu responder agora. Tente de novo em instantes.";

function responder(status, corpo) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

// ---------- Datas ----------

function hojeEmSaoPaulo() {
  // en-CA escreve a data como AAAA-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function dataValida(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(texto || ""))) return false;
  const d = new Date(texto + "T12:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
}

function dataCurta(iso) {
  const [ano, mes, dia] = String(iso).split("-");
  return dia + "/" + mes + "/" + ano;
}

// ---------- Supabase, sempre com o token da pessoa ----------

function cabecalhosBanco(token) {
  return {
    apikey: SUPABASE_CHAVE_PUBLICA,
    Authorization: "Bearer " + token,
    "Content-Type": "application/json"
  };
}

async function conferirLogin(token) {
  const resp = await fetch(SUPABASE_URL + "/auth/v1/user", { headers: cabecalhosBanco(token) });
  if (resp.status === 401 || resp.status === 403) throw new ErroAssistente(401, ERRO_LOGIN);
  if (!resp.ok) throw new ErroAssistente(502, ERRO_GERAL);
  const usuario = await resp.json();
  if (!usuario || !usuario.id) throw new ErroAssistente(401, ERRO_LOGIN);
  return usuario;
}

async function erroDoBanco(resp) {
  let corpo = {};
  try { corpo = await resp.json(); } catch (_) { /* resposta sem JSON */ }
  const codigo = String(corpo.code || "");
  const texto = String(corpo.message || "").toLowerCase();
  if (codigo === "PGRST205" || codigo === "42P01" || texto.includes("does not exist") || texto.includes("could not find the table")) {
    return new ErroAssistente(500, ERRO_TABELA);
  }
  if (resp.status === 401 || texto.includes("jwt")) return new ErroAssistente(401, ERRO_LOGIN);
  if (codigo === "42501" || texto.includes("row-level security")) {
    return new ErroAssistente(403, "O banco recusou o pedido pela proteção por linha. Saia, entre de novo e tente outra vez.");
  }
  return new ErroAssistente(502, "Não consegui falar com o banco. Tente de novo em instantes.");
}

async function gravarGasto(token, gasto) {
  const resp = await fetch(SUPABASE_URL + "/rest/v1/gastos", {
    method: "POST",
    headers: { ...cabecalhosBanco(token), Prefer: "return=representation" },
    body: JSON.stringify(gasto)
  });
  if (!resp.ok) throw await erroDoBanco(resp);
  const linhas = await resp.json();
  if (!Array.isArray(linhas) || !linhas.length) throw new ErroAssistente(502, "O gasto não foi salvo. Tente de novo.");
  return linhas[0];
}

async function somarGastos(token, desde, ate, categoria) {
  const filtros = new URLSearchParams();
  filtros.set("select", "valor");
  filtros.append("data", "gte." + desde);
  filtros.append("data", "lte." + ate);
  if (categoria) filtros.set("categoria", "eq." + categoria);
  const resp = await fetch(SUPABASE_URL + "/rest/v1/gastos?" + filtros.toString(), { headers: cabecalhosBanco(token) });
  if (!resp.ok) throw await erroDoBanco(resp);
  const linhas = await resp.json();
  // Soma em centavos para não acumular erro de arredondamento.
  const centavos = linhas.reduce((soma, l) => soma + Math.round((Number(l.valor) || 0) * 100), 0);
  return { total: centavos / 100, quantidade: linhas.length };
}

// ---------- Gemini ----------

function ferramentas(categorias) {
  return [{
    function_declarations: [
      {
        name: "registrar_gasto",
        description: "Lança um gasto novo da pessoa.",
        parameters: {
          type: "object",
          properties: {
            data: { type: "string", description: "Data do gasto no formato AAAA-MM-DD." },
            descricao: { type: "string", description: "Onde ou com o quê, curto. No cupom, o nome da loja." },
            valor: { type: "number", description: "Valor em reais, maior que zero. No cupom, o VALOR TOTAL." },
            categoria: { type: "string", enum: categorias, description: "Uma das categorias da pessoa." }
          },
          required: ["data", "descricao", "valor", "categoria"]
        }
      },
      {
        name: "consultar_gastos",
        description: "Busca os gastos da pessoa num período para responder quanto ela gastou.",
        parameters: {
          type: "object",
          properties: {
            desde: { type: "string", description: "Primeiro dia do período, AAAA-MM-DD." },
            ate: { type: "string", description: "Último dia do período, AAAA-MM-DD (inclusive)." },
            categoria: { type: "string", enum: categorias, description: "Opcional: só esta categoria." }
          },
          required: ["desde", "ate"]
        }
      }
    ]
  }];
}

function instrucoes(hoje, categorias) {
  return [
    "Você é o assistente do Meu Bolso, um app de gastos pessoais. Responda sempre em português do Brasil, em uma frase curta.",
    "Hoje é " + hoje + " (fuso de São Paulo). Use esta data quando a pessoa disser hoje, ontem, este mês etc.",
    "Categorias permitidas: " + categorias.join(", ") + ". Escolha a que mais combina; se nenhuma combinar, use Outros.",
    "Se a pessoa contar um gasto, chame registrar_gasto. Se perguntar quanto gastou, chame consultar_gastos com o período certo.",
    "Nunca invente valores nem totais: os totais sempre vêm de consultar_gastos.",
    "Quando vier a foto de um cupom fiscal, use o VALOR TOTAL do cupom, a data de emissão e o nome da loja como descrição.",
    "Se faltar o valor ou a foto estiver ilegível, não chame ferramenta: pergunte o que falta.",
    "Nunca peça senha, número de conta ou de cartão."
  ].join("\n");
}

async function chamarGemini(chave, hoje, categorias, mensagem, imagem, mime) {
  const partes = [];
  if (mensagem) partes.push({ text: mensagem });
  if (imagem) partes.push({ inline_data: { mime_type: mime, data: imagem } });
  if (imagem && !mensagem) partes.unshift({ text: "Lance o gasto deste cupom fiscal." });

  const resp = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" + MODELO + ":generateContent",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: instrucoes(hoje, categorias) }] },
        contents: [{ role: "user", parts: partes }],
        tools: ferramentas(categorias),
        generationConfig: { temperature: 0 }
      })
    }
  );
  if (resp.status === 429) throw new ErroAssistente(429, ERRO_LIMITE);
  if (resp.status === 400 || resp.status === 401 || resp.status === 403) {
    let texto = "";
    try { texto = JSON.stringify(await resp.json()).toLowerCase(); } catch (_) { /* sem JSON */ }
    if (texto.includes("api key") || texto.includes("api_key") || resp.status !== 400) {
      throw new ErroAssistente(500, "A chave do Gemini foi recusada. Confira CHAVE_GEMINI nas variáveis de ambiente do Netlify.");
    }
    throw new ErroAssistente(400, "O assistente não entendeu o pedido. Escreva de outro jeito ou mande outra foto.");
  }
  if (!resp.ok) throw new ErroAssistente(502, ERRO_GERAL);

  const corpo = await resp.json();
  const partesResposta = (corpo.candidates && corpo.candidates[0] && corpo.candidates[0].content && corpo.candidates[0].content.parts) || [];
  const chamada = partesResposta.find((p) => p.functionCall || p.function_call);
  if (chamada) {
    const fc = chamada.functionCall || chamada.function_call;
    return { ferramenta: fc.name, args: fc.args || {} };
  }
  const texto = partesResposta.map((p) => p.text || "").join("").trim();
  return { texto: texto || "Não entendi. Escreva o gasto com o valor, por exemplo: mercado 50 hoje." };
}

// ---------- Ações das ferramentas ----------

async function registrar(token, usuario, args, categorias, origem, hoje) {
  const valor = Math.round(Number(args.valor) * 100) / 100;
  if (!(valor > 0)) return { resposta: "Não achei o valor. Qual foi o valor do gasto?" };
  const data = dataValida(args.data) ? args.data : hoje;
  const categoria = categorias.includes(args.categoria) ? args.categoria : (categorias.includes("Outros") ? "Outros" : categorias[0]);
  const descricao = String(args.descricao || "").trim().slice(0, 120) || null;

  const salvo = await gravarGasto(token, {
    dono: usuario.id,
    data,
    descricao,
    valor,
    categoria,
    origem
  });
  const texto = "Lancei " + moeda.format(Number(salvo.valor)) + " em " + salvo.categoria +
    (salvo.descricao ? ": " + salvo.descricao : "") + ", " + dataCurta(salvo.data) + ".";
  return { resposta: texto, lancou: true };
}

async function consultar(token, args, categorias, hoje) {
  const desde = dataValida(args.desde) ? args.desde : hoje.slice(0, 8) + "01";
  const ate = dataValida(args.ate) ? args.ate : hoje;
  const categoria = categorias.includes(args.categoria) ? args.categoria : null;
  const { total, quantidade } = await somarGastos(token, desde, ate, categoria);
  const periodo = desde === ate ? "em " + dataCurta(desde) : "de " + dataCurta(desde) + " a " + dataCurta(ate);
  const texto = "Você gastou " + moeda.format(total) + (categoria ? " com " + categoria : "") + " " + periodo +
    " (" + quantidade + (quantidade === 1 ? " lançamento" : " lançamentos") + ").";
  return { resposta: texto };
}

// ---------- Entrada da função ----------

export default async (req) => {
  try {
    if (req.method !== "POST") return responder(405, { erro: "Use o assistente pelo app." });

    const chave = process.env.CHAVE_GEMINI;
    if (!chave) throw new ErroAssistente(500, ERRO_SEM_CHAVE);

    const cabecalho = req.headers.get("authorization") || "";
    const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7).trim() : "";
    if (!token) throw new ErroAssistente(401, ERRO_LOGIN);
    const usuario = await conferirLogin(token);

    let corpo;
    try { corpo = await req.json(); } catch (_) {
      throw new ErroAssistente(400, "O pedido chegou incompleto. Tente de novo.");
    }
    const mensagem = String(corpo.mensagem || "").trim().slice(0, 500);
    const imagem = typeof corpo.imagem === "string" && corpo.imagem ? corpo.imagem : null;
    const mime = TIPOS_DE_FOTO.includes(corpo.mime) ? corpo.mime : "image/jpeg";
    const categorias = Array.isArray(corpo.categorias) && corpo.categorias.length
      ? corpo.categorias.map((c) => String(c).trim()).filter(Boolean).slice(0, 30)
      : CATEGORIAS_PADRAO;

    if (!mensagem && !imagem) throw new ErroAssistente(400, "Escreva o gasto ou mande a foto do cupom.");

    const hoje = hojeEmSaoPaulo();
    const resultado = await chamarGemini(chave, hoje, categorias, mensagem, imagem, mime);

    if (resultado.ferramenta === "registrar_gasto") {
      return responder(200, await registrar(token, usuario, resultado.args, categorias, imagem ? "foto" : "texto", hoje));
    }
    if (resultado.ferramenta === "consultar_gastos") {
      return responder(200, await consultar(token, resultado.args, categorias, hoje));
    }
    return responder(200, { resposta: resultado.texto || ERRO_GERAL });
  } catch (erro) {
    if (erro instanceof ErroAssistente) return responder(erro.status, { erro: erro.message });
    console.error("assistente:", erro && erro.message);
    return responder(500, { erro: ERRO_GERAL });
  }
};
