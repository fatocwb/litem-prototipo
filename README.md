# LiTem · protótipo

Protótipo do **LiTem**: licitações conferidas item a item.
Só front-end (Astro + Tailwind 4 + Alpine.js), sem backend. Os dados vêm de editais reais, analisados à parte.

Primeira tela: o **Pregão Eletrônico SRP 30/2026 de Barra do Garças-MT** (92 itens), com resumo, pontos de atenção, itens com filtros, pedidos de cotação prontos e controle de respostas.

```bash
npm install
npm run dev     # http://localhost:4321
npm run build   # gera dist/
```

## Publicar no Cloudflare Pages (grátis)

1. Cloudflare → Workers & Pages → Create → Pages → Connect to Git → escolha `litem-prototipo`.
2. Framework preset: **Astro**. Build command: `npm run build`. Output directory: `dist`.
3. Cada push na `main` atualiza o site; cada branch ganha um link de prévia.

A página não aparece no Google (`noindex`), mas quem tiver o link consegue abrir.

Instruções para o Claude: `CLAUDE.md`. Decisões de tela: `UX-MESTRE.md`.
