// Configuração do Astro para o protótipo do LiTem.
// Veio do starter kit (fatocwb/backup-starter-kit), sem Decap CMS, sem blog, sem LESS e sem Netlify.
// O site é 100% estático: o build gera a pasta dist/, que o Cloudflare Pages publica.

import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	// Trocar pelo endereço do Cloudflare Pages quando o projeto for publicado.
	site: "https://litem-prototipo.pages.dev",

	// Gera /editais/barra-do-garcas-pe30-2026/index.html (links sempre terminam em /).
	trailingSlash: "always",

	vite: {
		plugins: [tailwindcss()],
	},
});
