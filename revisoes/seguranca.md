# Relatório de segurança do Meu Bolso

Pasta revisada: `C:\Users\Denise\Desktop\meu-bolso` (sem a pasta `.git`).

Li todos os arquivos, um por um:
- `CLAUDE.md`
- `BRIEFING.md`
- `netlify.toml`
- `.gitignore`
- `app/index.html`
- `app/app.js`
- `app/estilo.css` (só por busca de palavras, sem leitura linha a linha)
- `app/configuracao.js`
- `app/manifest.webmanifest`
- `app/icone.svg`
- `.claude/agents/guarda-de-seguranca.md`

Também fiz uma busca por padrões de chave, senha, token, CPF, telefone, CEP e e-mail em tudo.

## Resumo

Não achei nenhum achado de gravidade ALTA ou MÉDIA. Achei uma pendência BAIXA e um ponto de atenção sobre as funções do Netlify.

## Achados

| Arquivo | Linha | O que é | Gravidade | O que fazer |
|---|---|---|---|---|
| `app/configuracao.js` | 5 e 6 | Aparecem a URL do Supabase (`https://fznpyy….supabase.co`) e a chave `sb_publishable_fneqH2…`. O prefixo `sb_publishable_` confirma que é a chave **pública**, e este é o arquivo onde ela pode ficar. | BAIXA (informativo, é o esperado) | Nada a fazer. Confira só que a proteção por linha continua ligada nas tabelas `gastos` e `resumos`. É ela que protege os dados, porque a chave pública fica visível para qualquer pessoa. |
| `netlify.toml` | 3 | Aponta para a pasta `netlify/functions`, que **não existe** na pasta hoje. Não há função nenhuma para revisar. | BAIXA | Nada a fazer agora. Quando criar as funções (o assistente de sexta), rode este guarda de novo. Chave secreta e chave do Gemini **nunca** podem ir dentro dos arquivos. Guarde-as só nas variáveis de ambiente do painel do Netlify. |
| `.env` | — | **Não existe** nenhum `.env` na pasta. Também não há outro arquivo sensível, como `.pem`, `.key` ou cópias de segurança. | Sem risco | Nada a fazer. |

## Conferências feitas

- **`.gitignore`:** tem as linhas `.env`, `.netlify` e `node_modules`. Está correto.
- **Chaves secretas:** não achei `sb_secret`, `service_role`, `AIza` (Gemini), `ghp_`, `github_pat_`, `sk-`, `sk_live`, `pk_live`, `Bearer` nem JWT (`eyJ`). As palavras "secreta" e "Gemini" aparecem apenas em comentários e texto de documentação (`app/configuracao.js` linha 3 e `CLAUDE.md` linha 31). Nenhuma delas é uma chave.
- **Senhas:** as palavras "senha" e "password" aparecem só como nome de campo, texto de tela e lógica do código (`app/index.html`, `app/app.js`). Nenhuma senha está escrita em arquivo.
- **Cartão, conta e agência:** não achei número de cartão, conta ou agência.
- **Dados pessoais:** não achei CPF, telefone, CEP, endereço, e-mail nem nome de pessoa nos arquivos. O e-mail e o nome do Git não aparecem em nenhum arquivo da pasta.
- **Chave pública fora do lugar:** a URL e a chave pública do Supabase aparecem só em `app/configuracao.js`. Não estão em nenhum outro arquivo.

Veredito: A pasta pode ser enviada ao GitHub, porque não há segredo, senha nem dado pessoal, e a única chave presente é a pública, no lugar permitido.
