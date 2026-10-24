# Relatório do guarda de segurança do Meu Bolso

Pasta conferida: `C:\Users\Denise\Desktop\meu-bolso` (sem a pasta `.git`).

Li um por um: `CLAUDE.md`, `BRIEFING.md`, `netlify.toml`, `.gitignore`, `app/index.html`, `app/app.js`, `app/configuracao.js`, `app/manifest.webmanifest`, `netlify/functions/assistente.mjs`, `supabase/1-tabela.sql`, `supabase/2-automacao-a-cada-minuto.sql`, `supabase/3-automacao-toda-segunda.sql` e `revisoes/seguranca.md`. Nos arquivos `app/estilo.css`, `app/icone.svg` e `.claude/agents/*.md`, fiz só a busca por padrões de chave, senha, token e dados pessoais. Não existe `.env` na pasta.

| Arquivo | O que encontrou | Gravidade | O que fazer |
|---|---|---|---|
| `app/configuracao.js` (linhas 5 e 6) | Aparecem a URL do Supabase (`https://fznpyy….supabase.co`) e a chave pública (`sb_publishable_fneqH2…`). Está no arquivo onde é permitido. | BAIXA | Nada a fazer. Só confirme que a proteção por linha continua ligada em `gastos` e `resumos`. |
| `netlify/functions/assistente.mjs` (linhas 7 e 8, no topo) | Aparecem a mesma URL e a mesma chave pública do Supabase (`sb_publishable_fneqH2…`). Está no topo do arquivo da função, que é um lugar permitido. A chave do Gemini vem de `process.env.CHAVE_GEMINI` e não está escrita no arquivo. | BAIXA | Nada a fazer. Mantenha a chave do Gemini só nas variáveis de ambiente do Netlify. |
| `.env` | Não existe na pasta. O `.gitignore` tem as linhas `.env`, `.netlify` e `node_modules`. | BAIXA | Nada a fazer. |
| `app/app.js`, `app/index.html`, `supabase/*.sql` | As palavras "senha", "password" e "token" aparecem só como nome de campo, texto de tela e lógica do código. Não há valor de senha escrito, nem chave secreta, nem dado pessoal. | BAIXA | Nada a fazer. |

Resumo da conferência:
- Não achei `sb_secret`, `service_role`, `eyJ`, `AIza`, `ghp_`, `github_pat_`, `sk-`, `sk_live` nem `pk_live`.
- Não achei CPF, telefone, endereço, CEP, conta, agência nem número de cartão.
- A URL e a chave pública do Supabase só aparecem nos dois lugares permitidos.
- Como não achei chave secreta, não é preciso trocar nenhuma chave nos painéis.

PODE ENVIAR
