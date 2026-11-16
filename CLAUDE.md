# CLAUDE.md · LiTem protótipo

Instruções para o Claude (e para quem mais mexer neste repositório).

## O que é

Protótipo navegável do **LiTem** (Licitações conferidas item a item; antes chamado de TItem).
Só front-end, sem backend: serve para mostrar a ideia a fornecedores e testar o que funciona na tela.
A primeira tela é o edital **Pregão Eletrônico SRP 30/2026 de Barra do Garças-MT**, que antes era uma planilha.

- **Quem é quem:** *fornecedor* = cliente do LiTem, a empresa que vende ao governo. *Distribuidor* = quem vende ao fornecedor.
- O dono do projeto é iniciante (HTML, CSS, JS, PHP). Explique de forma simples e comente o código em português.

## Regras

1. **Nunca construir nada no repositório das UIs** (`fatocwb/shuffle-dashboard-uis`). Lá ficam os códigos fixos da Shuffle (Flex UI, Artemis...). Daqui só se **copia** o componente para este projeto.
2. **Componentes de UI:** consultar primeiro `catalogo-flex-ui.md` / `catalogo-flex-ui.json` (na raiz do repositório das UIs), que têm o resumo e o link de cada componente. Abrir o código só do componente escolhido.
3. **Uma linguagem visual por tela:** a Flex UI é a base. Outra UI (ex.: Artemis) só para o que a Flex não tiver, e nunca misturada na mesma tela.
4. **Dados separados do visual:** cada edital é um arquivo `.json` em `src/data/editais/`. Para mostrar outro edital, cria-se outro `.json` no mesmo formato (tipo `Edital` em `src/data/editais.ts`). Nada de texto do edital escrito direto nos componentes.
5. **Sem dados sensíveis na página:** o link é público. Preços que os distribuidores responderem não entram aqui.
6. **O que deu certo na tela vai para `UX-MESTRE.md`** (decisões de UX com o motivo).
7. Orçamento mínimo: nada de serviço pago. Hospedagem: Cloudflare Pages (grátis).

## Componentes da Flex UI já usados

| Peça do LiTem | Componente da Flex UI | Onde |
|---|---|---|
| Menu lateral e topo no celular | dashboard › navigation › vertical-02 | `components/app/Sidebar.astro`, `layouts/AppLayout.astro` |
| Título com breadcrumb e botões | dashboard › navigation › page-heading-02 | `components/edital/Cabecalho.astro`, `pages/index.astro` |
| Abas | dashboard › navigation › section-heading-05 | `pages/editais/[slug].astro` |
| Cartões de números | dashboard › stats › stats-04 | `Cabecalho.astro` (disputa), `AbaResumo.astro` |
| Aviso amarelo | dashboard › announcements › alerts-01 | `Cabecalho.astro` (prazo de esclarecimento) |
| Tabela (cabeçalho, linhas, valores em indigo) | dashboard › data › tables-03 | `AbaItens.astro` |

Ícones copiados da Flex ficam em `components/app/icones-flex.ts`. Abrir/fechar (menu no celular) é feito com Alpine.js.
Convenções da Flex seguidas: cinzas `gray`, destaque `indigo` (botão principal `bg-indigo-500 hover:bg-indigo-600`), cartões `bg-white border border-gray-100 rounded-md shadow-sm`, fonte padrão do Tailwind. O modo escuro (`dark:`) já está ligado no CSS, mas o protótipo ainda é só claro.

## Como rodar

```bash
npm install
npm run dev      # abre em http://localhost:4321
npm run build    # gera a pasta dist/ (é o que o Cloudflare Pages publica)
```

## Estrutura

```txt
src/
  data/editais/*.json        um arquivo por edital (os dados)
  data/editais.ts            junta os .json e define o formato (tipo Edital)
  layouts/AppLayout.astro    casca: menu lateral + topo + conteúdo
  components/app/            peças gerais (menu lateral, selo "do seu ramo")
  components/edital/         as 5 abas do edital + o cabeçalho
  pages/index.astro          lista de editais
  pages/editais/[slug].astro uma página por edital
  scripts/app.ts             JavaScript do navegador (Alpine.js): abas, filtros, pedidos de cotação, controle
  scripts/formatar.ts        dinheiro, datas e "faltam X dias"
  styles/global.css          Tailwind 4 + cores da marca (@theme)
```

## Tecnologia

- Astro 6 (veio do starter kit `fatocwb/backup-starter-kit`, sem Decap, blog, LESS e Netlify).
- Tailwind CSS 4 (`@tailwindcss/vite`). Classes do Tailwind 3 que mudaram: `shadow-sm`→`shadow-xs`, `shadow`→`shadow-sm`, `rounded`→`rounded-sm`, `outline-none`→`outline-hidden`, `bg-opacity-50`→`bg-black/50`; a borda padrão agora é `currentColor`. Ferramenta: `npx @tailwindcss/upgrade`.
- Alpine.js para a interação (a Flex UI também usa). Atributos escritos por extenso (`x-on:click`, `x-bind:class`).
- O `vite` fica fixo na versão 7 no `package.json`: sem isso o `@tailwindcss/vite` baixa o Vite 8 e o build quebra.
- `localStorage` só para conveniências do navegador (seus dados no pedido, controle de respostas), sempre com `try/catch`.
