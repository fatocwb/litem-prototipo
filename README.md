# LiTem · protótipo

Protótipo do **LiTem**: licitações conferidas item a item.
Só front-end (Astro + Tailwind 4 + Alpine.js), sem backend. Os dados vêm de editais reais, analisados à parte.

Primeira tela: o **Pregão Eletrônico SRP 30/2026 de Barra do Garças-MT** (92 itens), com resumo, pontos de atenção, itens com filtros, pedidos de cotação prontos e controle de respostas.

```bash
npm install
npm run dev     # http://localhost:4321
npm run build   # gera dist/
```

## Publicar no Cloudflare (grátis)

O projeto está ligado ao Cloudflare como **Worker com arquivos estáticos** (Workers & Pages → `litem-prototipo`).

- Build command: `npm run build` · Deploy command: `npx wrangler deploy`.
- O arquivo `wrangler.jsonc` diz ao Wrangler para publicar a pasta `dist/`. **Não apague:** sem ele o Wrangler tenta instalar um adaptador do Astro e o deploy falha.
- Cada push na `main` publica sozinho, no endereço `litem-prototipo.<sua-conta>.workers.dev`.

A página não aparece no Google (`noindex`), mas quem tiver o link consegue abrir.

Instruções para o Claude: `CLAUDE.md`. Decisões de tela: `UX-MESTRE.md`.
