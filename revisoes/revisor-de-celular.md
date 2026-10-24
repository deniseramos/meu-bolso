# Revisão de celular do Meu Bolso (tela de 390 px)

Achei 7 problemas: nenhum de gravidade ALTA, 5 de gravidade MÉDIA e 2 de gravidade BAIXA. O app não tem rolagem para o lado, tem os campos certos e os estados vazios na maior parte dos casos. Os pontos fracos são o contraste dos botões laranja, o foco dos campos e alguns textos e botões pequenos na lista de gastos.

| Item | O que está errado | Onde | Gravidade | Correção em uma frase |
|---|---|---|---|---|
| 7. Contraste | Texto branco sobre o laranja `#EA580C` dá cerca de 3,6 para 1 (o mínimo é 4,5). Isso vale para "Entrar", "Salvar", "Enviar" e para a categoria escolhida. No sol, essas palavras ficam difíceis de ler. | `app/estilo.css` linha 119 (`.botao`) e linhas 162-163 (`.categoria[aria-pressed="true"]`) | MÉDIA | Usar o laranja escuro `#C2410C` como fundo desses botões, que com texto branco dá cerca de 5 para 1. |
| 8. Foco visível | O contorno dos campos ao focar usa `--laranja-claro`, um tom quase branco sobre fundo branco. Quem navega pelo teclado mal vê onde está. Só muda a cor da borda, que tem 1 px. | `app/estilo.css` linha 108 | MÉDIA | Trocar o contorno por uma cor forte, como `3px solid var(--laranja-escuro)` com `outline-offset: 2px`. |
| 2. Tamanho do texto | A linha "categoria · data" de cada gasto usa `0.85rem`, que dá cerca de 13,6 px (o mínimo é 14 px). | `app/estilo.css` linha 180 (`.item-detalhe`) | MÉDIA | Subir para `0.875rem` ou mais. |
| 2. Tamanho do texto | O texto do botão "Apagar" usa `0.85rem`, cerca de 13,6 px. | `app/estilo.css` linha 186 (`.item-apagar`) | MÉDIA | Subir para `0.875rem` ou mais. |
| 1. Alvo de toque | O botão "Apagar" tem `min-height: 40px`, abaixo dos 44 px. Fica colado ao valor do gasto, então é fácil apagar sem querer ou errar o toque. O app pergunta antes de apagar, o que reduz o estrago. | `app/estilo.css` linha 183 (`.item-apagar`) | MÉDIA | Mudar para `min-height: 44px` e `min-width: 44px`. |
| 4. Estado vazio | Se os gastos do período não carregam (erro), a lista "Por categoria" (`barras`) fica em branco, sem frase. A mensagem de erro aparece mais acima, mas a lista fica vazia. | `app/app.js` linha 327 | BAIXA | Trocar por `$("barras").replaceChildren(itemVazio("Não consegui carregar as categorias."))`. |
| 5. Erros | Duas mensagens falam de "Supabase" e de "Confirm email" em Authentication. É linguagem técnica e não diz o que fazer no celular. | `app/app.js` linha 48 e linha 156 | BAIXA | Explicar em palavras simples, por exemplo "A conta ainda não está liberada. Peça ajuda para ajustar a confirmação de e-mail." |

Sem problema: teclado numérico (o campo de valor tem `inputmode="decimal"`); alvos de toque de campos, selects, categorias, "Sair" e "Alterar senha" (todos com 44 a 52 px); estados vazios de `ultimos` e `lista-mes`; todos os `catch` do `app.js` (mostram frase em português e o total vira "—", nunca um número inventado); nenhum `outline: none` no CSS, então botões e links mantêm o contorno padrão do navegador; textos longos com reticências (`min-width: 0` e `nowrap` no título do gasto) e grades que se ajustam à largura. Só dá para confirmar com o app aberto se um valor muito grande no total (fonte de 38 px) ou um nome de categoria muito longo passa dos 390 px.

## Os três itens que mais atrapalham

1. Contraste dos botões laranja com texto branco (cerca de 3,6 para 1): são os botões principais do app e ficam difíceis de ler no sol.
2. Foco quase invisível nos campos (contorno em tom quase branco): quem usa o teclado não vê onde está digitando.
3. "Apagar" com 40 px e texto de 13,6 px, colado ao valor: é pequeno para o dedo e apaga gasto com um toque errado, e os detalhes da lista também ficam abaixo de 14 px.
