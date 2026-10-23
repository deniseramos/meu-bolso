# Meu Bolso — memória do projeto

Este arquivo é a memória deste projeto. O Claude lê este arquivo sozinho toda vez que esta pasta é aberta. Tudo o que está aqui vale para todas as conversas.

## 1. O que é este projeto

O **Meu Bolso** é um app de gastos pessoais, feito durante a Formação Claude Pro.

- **Quem usa:** só eu, no celular e no computador.
- **O que ele faz:**
  - registra os meus gastos;
  - mostra o total do mês, separado por categoria;
  - na sexta-feira, ganha um assistente que lança o gasto a partir de uma frase ou da foto do cupom fiscal.
- **Telas e categorias:** ainda não estão definidas. Elas vão sair de uma entrevista que o Claude vai conduzir comigo.

## 2. Regras técnicas que não se discutem

- Os arquivos do app ficam na pasta `app/`:
  - `index.html`
  - `estilo.css`
  - `app.js`
  - `configuracao.js`
  - `manifest.webmanifest`
  - `icone.svg`
- Sem Node, sem etapa de build, sem framework.
- O cliente do Supabase entra pela CDN, exatamente com esta linha:
  `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>`
- A entrada no app é por e-mail e senha, **sem** confirmação de e-mail.
- As tabelas `gastos` e `resumos` têm proteção por linha (cada pessoa só enxerga as próprias linhas).
- A URL do projeto e a chave pública do Supabase ficam em `app/configuracao.js`, dentro de `window.MEU_BOLSO`.
- A chave secreta do Supabase e a chave do Gemini **nunca** entram em arquivo nenhum.
- Na raiz da pasta:
  - o `netlify.toml` publica a pasta `app`;
  - o `.gitignore` deixa de fora `.env`, `.netlify` e `node_modules`.
- O celular de 390 px de largura vem primeiro; o computador vem depois.
- Todo erro aparece como uma frase em português dizendo o que fazer.

## 3. O que este app nunca faz

- Nunca pede, guarda ou mostra senha de banco, número de conta ou número de cartão.
- Nunca guarda a foto do cupom.
- Nunca envia e-mail ou mensagem.
- Nunca usa dado de outra pessoa.

## 4. Como trabalhar comigo

- Antes de alterar qualquer arquivo, diga o plano em até dez linhas e espere a minha aprovação.
- Uma mudança por vez, mostrando a diferença (o que era e como ficou).
- Toda entrega vai para um arquivo; na conversa, mostre só os caminhos dos arquivos.
- Fale em português, para quem não programa.
