// Catálogo de exemplo (marca fictícia TesteTech) e contas usadas nas telas do catálogo.
import catalogo from "./catalogo-exemplo.json";
import { editais } from "./editais";

export type Produto = (typeof catalogo)[number] & { ram?: number; ssd?: number; nucleos?: number; tela?: number; hz?: number; ppm?: number };

// Campos mínimos de cada tipo (decisões: "campos mínimos por família"); servem para o "Ficha X% completa"
const CAMPOS: Record<string, string[]> = {
	NOTEBOOK: ["ram", "ssd", "nucleos", "tela", "garantias"],
	MICROCOMPUTADOR: ["ram", "ssd", "nucleos", "garantias"],
	"ALL IN ONE": ["ram", "ssd", "nucleos", "tela", "garantias"],
	MONITOR: ["tela", "hz", "garantias"],
	"IMPRESSORA MULTIFUNCIONAL": ["ppm", "garantias"],
	"IMPRESSORA LASER": ["ppm", "garantias"],
};

export const slugFamilia = (f: string) =>
	f.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function ficha(p: Produto) {
	const campos = CAMPOS[p.tipo] ?? ["garantias"];
	const cheios = campos.filter((c) => (p as any)[c] !== undefined && (p as any)[c] !== null).length;
	return Math.round((cheios / campos.length) * 100);
}

/** Editais (do protótipo) em que o produto aparece como ✓ */
export function editaisDo(p: Produto) {
	return editais.filter((e) => e.itens.some((i) => i.produto === p.id && i.resultado === "ok"));
}

export const produtos = catalogo as Produto[];
export const familias = [...new Set(produtos.map((p) => p.familia))].map((nome) => {
	const ps = produtos.filter((p) => p.familia === nome);
	const eds = new Set(ps.flatMap((p) => editaisDo(p).map((e) => e.slug)));
	return {
		nome,
		slug: slugFamilia(nome),
		produtos: ps,
		editais: eds.size,
		incompletas: ps.filter((p) => ficha(p) < 100).length,
		ficha: Math.round(ps.reduce((s, p) => s + ficha(p), 0) / ps.length),
	};
});
