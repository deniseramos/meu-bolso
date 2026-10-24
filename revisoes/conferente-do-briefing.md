# Relatório de conferência do briefing — Meu Bolso

Dos 5 testes do briefing, 3 cumprem, 0 não cumprem e 2 só dá para saber abrindo o app.

| Teste do briefing | Resultado | Motivo em uma linha |
|---|---|---|
| 1. Cinco segundos: no celular (390 px), sem rolar, ver o total do mês e os últimos 5 lançamentos | SÓ DÁ PARA SABER ABRINDO O APP | O total e os 5 últimos estão no primeiro cartão (`app/index.html` linhas 36 a 53), mas antes deles vêm o topo e os filtros de Mês e Ano. Se cabe sem rolar depende da altura da tela. |
| 2. Três toques: lançar um Uber (valor, categoria, Salvar), que aparece na hora nos últimos e no total | CUMPRE | O formulário tem valor, botões de categoria e Salvar, e a data já vem como hoje (`app/app.js` linhas 446 a 473, 680). Depois de salvar, o app recarrega o mês e os últimos 5 (linhas 502 a 514). Se o filtro estiver em outro mês, o total mostrado não muda. |
| 3. Sem internet, sem mentira: aparece a frase em português, o gasto não entra na lista nem no total e o valor continua no campo | CUMPRE | Sem conexão, o app mostra a frase do briefing e sai antes de salvar (`app/app.js` linhas 490 a 493). Se o envio falhar, mostra a mesma frase (linha 517). O campo só é limpo depois de salvar com sucesso (linha 512). A lista só é redesenhada com dados vindos do banco. |
| 4. Nada repetido: dois toques seguidos em Salvar entram uma vez só | CUMPRE | A trava `salvando` é ligada antes de esperar o banco, e o segundo toque é ignorado (`app/app.js` linhas 477 e 496). O botão também fica desativado durante o salvamento (linha 497). |
| 5. Mesmo dado nos dois aparelhos: mesmo gasto, mesmo total e as mesmas 7 categorias | SÓ DÁ PARA SABER ABRINDO O APP | Os gastos vêm do banco e as categorias vêm de um só arquivo (`app/configuracao.js`), então o código aponta para dados iguais. A proteção por linha e o login com a mesma conta só se confirmam com o banco funcionando. |

## Categorias

Batem com o briefing: as 7 categorias estão com os mesmos nomes, a mesma grafia, os mesmos acentos e na mesma ordem (`app/configuracao.js` linhas 7 a 15).

- Alimentação, Farmácia, Uber, Vestimentas, Estudos, Viagem, Outros.
- Não falta nenhuma, não sobra nenhuma e nenhuma está escrita diferente.

## O que falta para o app ficar como o briefing pediu

Os 5 testes não têm nenhum item reprovado. Os pontos abaixo são diferenças entre o briefing e o código, do mais importante para o menos importante.

1. **Lançamento sempre à vista, ao alcance do polegar:** o formulário "Lançar à mão" fica depois do cartão do total, dos filtros e dos últimos lançamentos, e não está fixo na tela (`app/index.html` linha 55). No celular é provável que seja preciso rolar para chegar nele, e o briefing pede que ele fique sempre à vista.
2. **Teste 1 (sem rolar):** os filtros de Mês e Ano ficam acima do total e ocupam espaço. Abra o app em 390 px e confira se o total e os 5 últimos continuam visíveis sem rolar.
3. **Espaço do assistente:** o briefing manda mostrar só "Assistente chega na sexta". O app já tem um assistente de verdade, com campo de texto, botão Enviar e botão Foto do cupom (`app/index.html` linhas 77 a 89, `app/app.js` linhas 579 a 675). Se a ideia era só reservar o lugar, isso é diferente do pedido. Se o assistente já foi liberado, o briefing é que precisa ser atualizado. Não conferi o funcionamento dele em `netlify/functions/assistente.mjs`, porque nenhum dos 5 testes depende dele.
4. **Lançamento com poucos campos:** o formulário mostra também "Onde ou com o quê" e "Data" (`app/index.html` linhas 60 a 65). Eles são opcionais e não atrapalham os 3 toques. Mesmo assim, deixam o lançamento mais cheio do que o briefing descreve.
5. **Itens extras que o briefing não pede:** a média por dia, o botão Apagar, os filtros de Mês e Ano e o resumo da semana. Não contradizem o briefing, mas ele não os pediu.
