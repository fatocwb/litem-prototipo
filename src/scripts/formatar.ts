// Funções de formatação usadas no servidor (Astro) e no navegador (Alpine).

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const numero = new Intl.NumberFormat("pt-BR");

export const reais = (v: number) => moeda.format(v);

/** R$ 16,19 mi · R$ 322 mil · R$ 980 */
export function reaisCurto(v: number) {
	if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mi`;
	if (v >= 1_000) return `R$ ${Math.round(v / 1_000).toLocaleString("pt-BR")} mil`;
	return moeda.format(v);
}

export const inteiro = (v: number) => numero.format(v);

/** "25/11/2026" a partir de "2026-11-25" ou de uma data com hora */
export function dataBR(iso: string) {
	const [a, m, d] = iso.slice(0, 10).split("-");
	return `${d}/${m}/${a}`;
}

/** Dias de calendário entre hoje (horário de Brasília) e a data (negativo se já passou).
 *  Ex.: hoje 16/11 e prazo 18/11 → 2 (sobram 17 e 18). */
export function diasAte(iso: string, hoje = new Date()) {
	const hojeSP = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(hoje); // AAAA-MM-DD
	const umDia = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
	return Math.round((umDia(iso.slice(0, 10)) - umDia(hojeSP)) / 86_400_000);
}

export function textoFaltam(iso: string) {
	const d = diasAte(iso);
	if (d < 0) return "já passou";
	if (d === 0) return "é hoje";
	if (d === 1) return "falta 1 dia";
	return `faltam ${d} dias`;
}
