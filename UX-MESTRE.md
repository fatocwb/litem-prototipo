# UX-MESTRE · o que está dando certo na tela

Registro das decisões de experiência do usuário do LiTem, com o motivo de cada uma.
Regra: uma linha nova a cada decisão; nunca apagar (se mudar, marcar como "substituída" e dizer por quê).

Formato: **Decisão** · por quê · onde · data · status

## Visual geral

- **Base visual: Flex UI (Shuffle), modo claro** · uma linguagem só em todas as telas; cinzas gray, destaque indigo, cartões brancos sobre faixa cinza · todo o protótipo · 16/11/2026 · em teste
- **Menu lateral fixo no computador (a partir de 1280 px) e gaveta no celular** · padrão da Flex (vertical-02) · menu lateral · 16/11/2026 · em teste

## Página do edital (16/11/2026, a partir da planilha de Barra do Garças)

- **Duas datas no topo: disputa e prazo de esclarecimento, com "faltam X dias"** · são os dois prazos que fazem o fornecedor perder o edital; o de esclarecimento é o que mais se esquece · Cabeçalho · 16/11/2026 · em teste
- **Contagem por dias de calendário, no horário de Brasília** · "faltam 3 dias" para um prazo daqui a 2 dias confunde · `formatar.ts` · 16/11/2026 · em teste
- **As 5 partes da planilha viraram abas, na mesma ordem** (Resumo, Pontos de atenção, Itens, Pedidos de cotação, Controle de respostas) · quem já viu a planilha reconhece; a aba fica no endereço (#itens) para mandar o link direto · página do edital · 16/11/2026 · em teste
- **Número em cada aba** (13 pontos, 92 itens, 10 pedidos) · mostra o tamanho do trabalho antes de abrir · abas · 16/11/2026 · em teste
- **"O que o edital diz" sempre com "onde está"** · o pregoeiro lê ao pé da letra; o fornecedor precisa conferir no texto oficial · Resumo · 16/11/2026 · em teste
- **Pontos de atenção: "por que importa" separado de "o que fazer" (verde)** · o fornecedor quer a ação, não só o problema · Pontos de atenção · 16/11/2026 · em teste
- **Os 3 primeiros pontos marcados como prioridade** · são os que desclassificam (numeração, inversão de fases, balanço) · Pontos de atenção · 16/11/2026 · em teste
- **Item com dois números: "Nº 6" (sistema) e "TR 8"** · neste edital 87 de 92 itens têm número diferente no Termo de Referência · Itens · 16/11/2026 · em teste
- **Filtros "Só do meu ramo" e "Só com atenção"** · o fornecedor misto quer ver só o que é dele e só o que pode dar problema · Itens · 16/11/2026 · em teste
- **Requisitos um por linha, texto original escondido em "Texto original do edital"** · o texto em maiúsculas corrido é difícil de conferir; o original continua a um clique · Itens · 16/11/2026 · em teste
- **Selo vermelho para atenção crítica (itens 6 e 16), amarelo para as outras** · unidade de medida errada muda o preço inteiro · Itens · 16/11/2026 · em teste
- **Pedido de cotação: um texto por tipo de distribuidor, com Copiar, WhatsApp e E-mail** · um edital misto vira vários pedidos; o fornecedor manda pelo canal que já usa · Pedidos de cotação · 16/11/2026 · em teste
- **"Seus dados" preenchem todos os pedidos de uma vez e ficam salvos no navegador** · ninguém quer digitar o nome 10 vezes · Pedidos de cotação · 16/11/2026 · em teste
- **Chave "Mostrar o nome do órgão" ligada por padrão, com a explicação embaixo** · decisão de 13/11: esconder é opção, não regra (fabricante dá preço especial para oportunidade registrada) · Pedidos de cotação · 16/11/2026 · em teste
- **Aviso de texto longo antes do WhatsApp/e-mail** · alguns aplicativos cortam mensagens grandes; "Copiar" sempre funciona · Pedidos de cotação · 16/11/2026 · em teste
- **Controle de respostas mede só quem respondeu e em quanto tempo, sem preços** · é o número que decide se o pedido de cotação vira pilar (taxa de resposta); preço do distribuidor não pode ficar numa página pública · Controle de respostas · 16/11/2026 · em teste
- **Menu lateral com a estrutura final e etiqueta da versão (V1, V1.1, V2)** · mostra para onde o produto vai sem prometer data · menu lateral · 16/11/2026 · em teste

## Wireframe recriado (16/11/2026, as 18 telas do Miro)

- **Editais reais do PNCP nos exemplos, conferência simulada e avisada no topo** · cartão inventado com nome de órgão real parece dado verdadeiro num link público; o aviso deixa claro o que é simulação · Geral e edital · 16/11/2026 · em teste
- **Catálogo de exemplo com marca fictícia (TesteTech)** · ninguém confunde com um produto real · catálogo · 16/11/2026 · em teste
- **Exemplo fictício só onde não há caso real, com faixa amarela "Exemplo fictício"** · nenhum edital real da amostra tinha lote conhecido; a aba Parcial precisava de um caso · edital de exemplo · 16/11/2026 · em teste
- **Selos NOVO/ABERTO guardados no navegador de quem olha** · mostram o que ainda não foi aberto sem precisar de conta · Geral · 16/11/2026 · em teste
- **↻ ATUALIZADO quando o PNCP registra alteração 1 dia ou mais depois da publicação** · dado real da API (data de atualização); o motivo não vem na API · Geral e edital · 16/11/2026 · em teste
- **Revisão resolvida com um clique ("Confirmo que atende") e lembrada** · decisão de 04/11: a resposta fica salva para sempre · aba Conferência · 16/11/2026 · em teste
- **Itens que você não vende ficam recolhidos e em cinza** · item disputado sozinho que o cliente não vende não pesa · aba Conferência · 16/11/2026 · em teste
- **Funções futuras com prévia apagada e "Quero ser avisado"** · os cliques medem o interesse (decisão do menu lateral) · Inteligência de Mercado, Minhas Propostas, Montar proposta, Documentos · 16/11/2026 · em teste

## Falta na Flex (lista para procurar nas outras UIs)

Peças que a Flex UI não tem e foram feitas à mão, no estilo dela:

- **Indicador de passos (stepper)** · primeiro acesso e importar catálogo (`components/comum/Passos.astro`)
- **Chave liga/desliga (switch)** · "Mostrar o nome do órgão no pedido"
- **Dica ao passar o mouse (tooltip)** · ⓘ do modo de disputa e ? das abas (hoje é o `title` do navegador)
- **Selos/badges** · Compatível, NOVO, ATUALIZADO, ✓ ⚠ ✗ ◐, versão V1.1/V2
- **Tela "Em breve" com prévia apagada** (`components/comum/EmBreve.astro`)
- **Área de arrastar arquivo (dropzone)** · importar catálogo (conferir se o forms-01 da Flex serve)
- **Lista que abre e fecha (acordeão)** · detalhe de cada item

## A testar com fornecedores

- O fornecedor entende sozinho as abas, sem explicação?
- Ele usa o "Copiar" ou o "WhatsApp"? Manda o pedido com ou sem o nome do órgão?
- O "Do seu ramo" bate com o que ele vende?
