# Briefing do Meu Bolso

Resultado da entrevista de oito perguntas. Este briefing segue o formato CLARO e vale junto com o `CLAUDE.md`.

## C — Contexto

- **Nome do app:** Meu Bolso.
- **Quem usa:** só eu, no celular e no computador.
- **Onde eu mais lanço:** no ônibus. Isso quer dizer: uma mão só, tela pequena (390 px), balanço, pressa e internet que cai.
- **Sensação ao abrir:** controle. Eu abro e sei na hora como está o meu mês.
- **Cor principal:** laranja.

## L — Limites

- **No máximo 3 toques para lançar um gasto** (digitar o valor não conta como toque):
  1. tocar no campo de valor e digitar o valor;
  2. tocar na categoria;
  3. tocar em **Salvar**.
  A data entra sozinha como hoje. A descrição é opcional.
- **Nunca mostra dado inconsistente:** um gasto só aparece na lista e no total depois de salvo de verdade. Nunca aparece um gasto que não foi salvo, e nunca o mesmo gasto duas vezes.
- **Se a internet cair**, o app não finge que salvou: mostra uma frase em português, por exemplo "Sem internet. Este gasto não foi salvo. Toque em Salvar de novo quando a conexão voltar." O valor digitado continua no campo para eu não precisar digitar de novo.
- **Nada de procurar botão nem digitar demais:** o lançamento fica sempre à vista, e as categorias são botões para tocar, nunca texto para escrever.
- **Abre e salva rápido**, sem travar.
- Vale tudo o que está na seção 3 do `CLAUDE.md`: nunca pede, guarda ou mostra senha de banco, conta ou cartão; nunca guarda a foto do cupom; nunca envia e-mail ou mensagem; nunca usa dado de outra pessoa.

## A — Ação

**Uma tela só**, de cima para baixo:

1. **O que aparece em cinco segundos:**
   - o **total gasto no mês atual**, em destaque, grande;
   - os **últimos 5 lançamentos** (valor, categoria e data).
2. **Lançamento à mão:** campo de valor, botões das categorias e o botão **Salvar**, sempre à vista, ao alcance do polegar.
3. **Lista do mês:** todos os gastos do mês atual, do mais novo para o mais antigo, com o total por categoria.

**Categorias, com os meus nomes, nesta ordem:**

1. Alimentação
2. Farmácia
3. Uber
4. Vestimentas
5. Estudos
6. Viagem
7. Outros

**Espaço do assistente:** a tela já reserva um lugar para o assistente que chega na sexta-feira. Ele vai lançar o gasto a partir de uma frase (por exemplo, "uber 23 reais") ou da foto do cupom. Até lá, esse espaço só mostra "Assistente chega na sexta".

## R — Resultado

Ao abrir o app, em cinco segundos, sem rolar a tela, eu respondo à pergunta **"Quanto já gastei neste mês e no que foram os últimos gastos?"**: o total do mês aparece no topo e os cinco últimos lançamentos aparecem logo abaixo.

## O — Observáveis

Cinco testes que provam que o app está pronto:

1. **Cinco segundos:** abro o app no celular (390 px) e, sem rolar, vejo o total do mês e os últimos 5 lançamentos.
2. **Três toques:** lanço um gasto de Uber com no máximo 3 toques (valor, categoria, Salvar), e ele aparece na hora no topo dos últimos lançamentos e no total do mês.
3. **Sem internet, sem mentira:** desligo a internet e tento salvar um gasto. O app mostra a frase em português dizendo o que fazer, o gasto **não** aparece na lista nem no total, e o valor digitado continua no campo.
4. **Nada repetido:** toco duas vezes seguidas em Salvar. O gasto aparece só uma vez na lista e é somado só uma vez no total.
5. **Mesmo dado nos dois aparelhos:** lanço um gasto no celular, abro o app no computador e vejo o mesmo gasto, o mesmo total e as mesmas 7 categorias.
