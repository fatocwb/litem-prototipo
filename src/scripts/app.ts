// Ponto de entrada do JavaScript do navegador.
// Registra os "componentes" do Alpine.js usados nas páginas e liga o Alpine.
// Cada Alpine.data(...) é um pedaço de tela com seus próprios dados e funções.

import Alpine from "alpinejs";
import { reais, reaisCurto, inteiro, dataBR, textoFaltam } from "./formatar";

declare global {
	interface Window {
		Alpine: typeof Alpine;
	}
}

// ---------- Tipos dos dados do edital (o mesmo formato do arquivo .json) ----------
type Item = {
	n: number;
	tr: number;
	cod: string;
	categoria: string;
	ramo: "Sim" | "Talvez" | "Não";
	desc: string;
	und: "unidade" | "metro";
	qtd: number;
	unit: number;
	total: number;
	participacao: string;
	garantia: string;
	certificacoes: string[];
	requisitos: string[];
	atencao: string[];
	critico: boolean;
};
type Categoria = { nome: string; ramo: string; itens: number[]; total: number; perguntas: string[] };
type Edital = {
	titulo: string;
	orgao: string;
	cidade: string;
	uf: string;
	datas: { esclarecimentoAte: string; disputa: string };
	categorias: Categoria[];
	itens: Item[];
};

// Lê os dados do edital que a página deixou num <script type="application/json">.
let cache: Edital | null = null;
function lerEdital(): Edital {
	if (!cache) {
		const el = document.getElementById("edital-dados");
		cache = JSON.parse(el?.textContent || "{}");
	}
	return cache!;
}

// localStorage pode falhar (aba anônima, bloqueio): nunca deixar a tela quebrar.
function ler<T>(chave: string, padrao: T): T {
	try {
		const v = localStorage.getItem(chave);
		return v ? (JSON.parse(v) as T) : padrao;
	} catch {
		return padrao;
	}
}
function gravar(chave: string, valor: unknown) {
	try {
		localStorage.setItem(chave, JSON.stringify(valor));
	} catch {
		/* sem armazenamento: segue só na memória */
	}
}

async function copiar(texto: string) {
	try {
		await navigator.clipboard.writeText(texto);
		return true;
	} catch {
		// Plano B para navegadores antigos
		const t = document.createElement("textarea");
		t.value = texto;
		document.body.appendChild(t);
		t.select();
		const ok = document.execCommand("copy");
		t.remove();
		return ok;
	}
}

// Guardar e ler no navegador a partir do HTML do Alpine (ex.: x-on:change="$guardar('chave', valor)")
Alpine.magic("guardar", () => (chave: string, valor: unknown) => gravar(chave, valor));
Alpine.magic("lerLocal", () => (chave: string, padrao: unknown) => ler(chave, padrao));

// Deixa as funções de formatação disponíveis dentro do HTML do Alpine (ex.: x-text="reais(item.total)").
Alpine.magic("fmt", () => ({ reais, reaisCurto, inteiro, dataBR, textoFaltam }));

// ---------- Menu lateral no celular ----------
Alpine.data("casca", () => ({
	menuAberto: false,
}));

// ---------- Abas do edital (guarda a aba no endereço: #itens, #cotacao...) ----------
const ABAS = ["conferencia", "resumo", "atencao", "itens", "cotacao", "controle"];
Alpine.data("abasEdital", (padrao: string = "resumo") => ({
	aba: padrao,
	init() {
		const h = location.hash.slice(1);
		if (ABAS.includes(h)) this.aba = h;
		window.addEventListener("hashchange", () => {
			const h2 = location.hash.slice(1);
			if (ABAS.includes(h2)) this.aba = h2;
			this.mostrarAbaAtiva();
		});
		this.mostrarAbaAtiva();
	},
	ir(nome: string) {
		this.aba = nome;
		history.replaceState(null, "", `#${nome}`);
		this.mostrarAbaAtiva();
	},
	// No celular a barra de abas rola para os lados: traz a aba ativa para a vista (sem rolar a página).
	mostrarAbaAtiva() {
		this.$nextTick(() => {
			const barra = this.$root.querySelector(".sem-barra") as HTMLElement | null;
			const ativa = this.$root.querySelector('[role="tab"][aria-selected="true"]') as HTMLElement | null;
			if (barra && ativa) barra.scrollLeft = ativa.offsetLeft - 16;
		});
	},
}));

// ---------- Contagem regressiva ("faltam 9 dias") ----------
Alpine.data("faltam", (iso: string) => ({
	texto: "",
	init() {
		this.texto = textoFaltam(iso);
	},
}));

// ---------- Aba Itens: filtros, busca e detalhe de cada item ----------
Alpine.data("listaItens", () => ({
	itens: [] as Item[],
	categorias: [] as string[],
	busca: "",
	categoria: "",
	participacao: "",
	soRamo: false,
	soAtencao: false,
	ordem: "numero",
	aberto: null as number | null,
	init() {
		const e = lerEdital();
		this.itens = e.itens;
		this.categorias = e.categorias.map((c) => c.nome);
	},
	get filtrados(): Item[] {
		const b = this.busca
			.trim()
			.toLowerCase()
			.normalize("NFD")
			.replace(/[̀-ͯ]/g, "");
		let lista = this.itens.filter((i) => {
			if (this.categoria && i.categoria !== this.categoria) return false;
			if (this.participacao && i.participacao !== this.participacao) return false;
			if (this.soRamo && i.ramo === "Não") return false;
			if (this.soAtencao && i.atencao.length === 0) return false;
			if (b) {
				const alvo = `${i.n} ${i.tr} ${i.cod} ${i.desc}`.toLowerCase();
				if (!alvo.includes(b)) return false;
			}
			return true;
		});
		if (this.ordem === "valor") lista = [...lista].sort((x, y) => y.total - x.total);
		return lista;
	},
	get totalFiltrado() {
		return this.filtrados.reduce((s, i) => s + i.total, 0);
	},
	get temFiltro() {
		return !!(this.busca || this.categoria || this.participacao || this.soRamo || this.soAtencao);
	},
	limpar() {
		this.busca = "";
		this.categoria = "";
		this.participacao = "";
		this.soRamo = false;
		this.soAtencao = false;
	},
	alternar(n: number) {
		this.aberto = this.aberto === n ? null : n;
	},
	titulo(i: Item) {
		return i.requisitos[0] || i.desc;
	},
}));

// ---------- Aba Pedidos de cotação: monta o texto de cada tipo de distribuidor ----------
type SeusDados = { contato: string; nome: string; empresa: string; cidade: string; prazo: string };
const CHAVE_DADOS = "litem:seus-dados";

Alpine.data("pedidosCotacao", () => ({
	categorias: [] as Categoria[],
	itensPorNumero: {} as Record<number, Item>,
	edital: null as Edital | null,
	mostrarOrgao: true,
	soRamo: false,
	verTexto: null as string | null,
	copiado: null as string | null,
	d: { contato: "", nome: "", empresa: "", cidade: "", prazo: "2026-11-21" } as SeusDados,
	init() {
		const e = lerEdital();
		this.edital = e;
		this.categorias = e.categorias;
		e.itens.forEach((i) => (this.itensPorNumero[i.n] = i));
		this.d = { ...this.d, ...ler<Partial<SeusDados>>(CHAVE_DADOS, {}) };
		this.$watch("d", (v: SeusDados) => gravar(CHAVE_DADOS, v));
	},
	get visiveis() {
		return this.soRamo ? this.categorias.filter((c) => c.ramo !== "Não") : this.categorias;
	},
	texto(c: Categoria) {
		const e = this.edital!;
		const ou = (v: string, ph: string) => (v.trim() ? v.trim() : ph);
		const disputa = dataBR(e.datas.disputa);
		const linhaOrgao = this.mostrarOrgao
			? `Estou preparando proposta para o ${e.titulo} da ${e.orgao}-${e.uf} (disputa em ${disputa}).`
			: `Estou preparando proposta para um pregão de registro de preços com entregas em ${e.cidade}-${e.uf} (disputa em ${disputa}).`;
		const n = c.itens.length;
		const lista = c.itens
			.map((num) => {
				const i = this.itensPorNumero[num];
				const und = i.und === "metro" ? "metros" : "unidades";
				return `Item ${i.n} · ${inteiro(i.qtd)} ${und} estimadas em 12 meses\n${i.desc}`;
			})
			.join("\n\n");
		const perguntas = c.perguntas.map((p, k) => `${k + 1}. ${p}`).join("\n");
		const prazo = this.d.prazo ? dataBR(this.d.prazo) : "[data]";
		return (
			`Olá, ${ou(this.d.contato, "[nome do contato]")}, tudo bem? ` +
			`Aqui é ${ou(this.d.nome, "[seu nome]")}, da ${ou(this.d.empresa, "[sua empresa]")}, de ${ou(this.d.cidade, "[cidade/UF]")}.\n` +
			`${linhaOrgao} É um registro de preços de 12 meses; só na linha de ${c.nome.toLowerCase()} o valor estimado é de ${reais(c.total)}, em ${n} ${n > 1 ? "itens" : "item"}.\n\n` +
			`Preciso de cotação para os itens abaixo, com a especificação mínima exigida no edital:\n\n${lista}\n\n` +
			`Para cada item, por favor me informe:\n${perguntas}\n\n` +
			`Pode responder do jeito que for mais fácil para você: planilha, PDF, áudio ou mensagem. ` +
			`Preciso das respostas até ${prazo} para fechar a proposta. Obrigado!`
		);
	},
	async copiar(c: Categoria) {
		if (await copiar(this.texto(c))) {
			this.copiado = c.nome;
			setTimeout(() => (this.copiado = null), 2000);
		}
	},
	linkWhatsApp(c: Categoria) {
		return `https://wa.me/?text=${encodeURIComponent(this.texto(c))}`;
	},
	linkEmail(c: Categoria) {
		const e = this.edital!;
		const assunto = `Pedido de cotação · ${c.nome} · ${e.cidade}-${e.uf}`;
		return `mailto:?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(this.texto(c))}`;
	},
	textoLongo(c: Categoria) {
		return this.texto(c).length > 1800;
	},
}));

// ---------- Aba Controle de respostas (salvo só neste navegador) ----------
type Envio = {
	id: string;
	categoria: string;
	distribuidor: string;
	canal: string;
	mostrouEdital: boolean;
	enviadoEm: string;
	respondeuEm: string;
	obs: string;
};
const CHAVE_CONTROLE = "litem:controle:barra-do-garcas-pe30-2026";
const agoraLocal = () => {
	const d = new Date();
	d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
	return d.toISOString().slice(0, 16);
};

Alpine.data("controleRespostas", () => ({
	envios: [] as Envio[],
	categorias: [] as string[],
	novo: {} as Envio,
	exportado: false,
	init() {
		this.categorias = lerEdital().categorias.map((c) => c.nome);
		this.envios = ler<Envio[]>(CHAVE_CONTROLE, []);
		this.zerarNovo();
		this.$watch("envios", (v: Envio[]) => gravar(CHAVE_CONTROLE, v));
	},
	zerarNovo() {
		this.novo = {
			id: "",
			categoria: this.categorias[0] || "",
			distribuidor: "",
			canal: "WhatsApp",
			mostrouEdital: true,
			enviadoEm: agoraLocal(),
			respondeuEm: "",
			obs: "",
		};
	},
	adicionar() {
		if (!this.novo.distribuidor.trim()) return;
		this.envios = [...this.envios, { ...this.novo, id: String(Date.now()) }];
		this.zerarNovo();
	},
	marcarResposta(e: Envio) {
		e.respondeuEm = agoraLocal();
		this.envios = [...this.envios];
	},
	remover(e: Envio) {
		this.envios = this.envios.filter((x) => x.id !== e.id);
	},
	horas(e: Envio) {
		if (!e.enviadoEm || !e.respondeuEm) return null;
		const h = (new Date(e.respondeuEm).getTime() - new Date(e.enviadoEm).getTime()) / 3_600_000;
		return Math.max(0, Math.round(h * 10) / 10);
	},
	get responderam() {
		return this.envios.filter((e) => e.respondeuEm).length;
	},
	get taxa() {
		return this.envios.length ? Math.round((this.responderam / this.envios.length) * 100) : 0;
	},
	get mediaHoras() {
		const hs = this.envios.map((e) => this.horas(e)).filter((h): h is number => h !== null);
		if (!hs.length) return null;
		return Math.round((hs.reduce((a, b) => a + b, 0) / hs.length) * 10) / 10;
	},
	tempoTexto(h: number | null) {
		if (h === null) return "-";
		if (h < 1) return "menos de 1 h";
		return `${h.toLocaleString("pt-BR")} h`;
	},
	dataHora(v: string) {
		if (!v) return "";
		return `${dataBR(v)} ${v.slice(11, 16)}`;
	},
	async exportar() {
		const cab = ["Tipo de distribuidor", "Distribuidor", "Canal", "Mostrou o edital?", "Enviado em", "Respondeu em", "Horas até responder", "Observações"];
		const linhas = this.envios.map((e) =>
			[e.categoria, e.distribuidor, e.canal, e.mostrouEdital ? "Sim" : "Não", this.dataHora(e.enviadoEm), this.dataHora(e.respondeuEm), this.horas(e) ?? "", e.obs].join("\t"),
		);
		if (await copiar([cab.join("\t"), ...linhas].join("\n"))) {
			this.exportado = true;
			setTimeout(() => (this.exportado = false), 2000);
		}
	},
}));

// ---------- Página Geral: abas da triagem, filtros e selos NOVO / ABERTO ----------
type CartaoLista = { slug: string | null; aba: string; uf: string; estoque: number; encomenda: number; ti: boolean };
const CHAVE_VISTOS = "litem:editais-vistos";
const ABAS_GERAL = ["gerais", "compativeis", "revisao", "parcial"];

Alpine.data("geral", () => ({
	aba: "compativeis",
	uf: "",
	disp: "",
	soTI: false,
	lista: [] as CartaoLista[],
	vistos: {} as Record<string, boolean>,
	pedidos: {} as Record<string, boolean>,
	init() {
		const el = document.getElementById("geral-dados");
		this.lista = JSON.parse(el?.textContent || "[]");
		this.vistos = ler<Record<string, boolean>>(CHAVE_VISTOS, {});
		const h = location.hash.slice(1);
		if (ABAS_GERAL.includes(h)) this.aba = h;
		window.addEventListener("hashchange", () => {
			const h2 = location.hash.slice(1);
			if (ABAS_GERAL.includes(h2)) this.aba = h2;
		});
	},
	ir(nome: string) {
		this.aba = nome;
		history.replaceState(null, "", `#${nome}`);
	},
	// Em que aba cada cartão aparece: Editais Gerais mostra todos; as outras, só os da triagem
	naAba(c: CartaoLista, aba: string) {
		if (aba === "gerais") return true;
		const mapa: Record<string, string> = { compativeis: "compativeis", revisao: "revisao", parcial: "parcial" };
		return c.aba === mapa[aba];
	},
	passa(c: CartaoLista) {
		if (this.uf && c.uf !== this.uf) return false;
		if (this.disp === "estoque" && !c.estoque) return false;
		if (this.disp === "encomenda" && !c.encomenda) return false;
		if (this.aba === "gerais" && this.soTI && !c.ti) return false;
		return true;
	},
	mostra(k: number) {
		const c = this.lista[k];
		return !!c && this.naAba(c, this.aba) && this.passa(c);
	},
	conta(aba: string) {
		return this.lista.filter((c) => this.naAba(c, aba) && this.passa(c)).length;
	},
	novos(aba: string) {
		return this.lista.filter((c) => c.slug && this.naAba(c, aba) && this.passa(c) && !this.vistos[c.slug]).length;
	},
	visto(slug: string) {
		return !!this.vistos[slug];
	},
	marcarVisto(slug: string) {
		this.vistos = { ...this.vistos, [slug]: true };
		gravar(CHAVE_VISTOS, this.vistos);
	},
	queroSetor(k: number) {
		this.pedidos = { ...this.pedidos, [k]: true };
	},
}));

// ---------- Aba Conferência do edital (Compatível / Revisão necessária / Parcial) ----------
type ItemConf = {
	n: number;
	tipo: string;
	desc: string;
	qtd: number;
	und: string;
	total: number;
	resultado: string;
	motivo: string;
	produto?: string | null;
	disp?: string | null;
	prova?: string | null;
	lote?: string;
};

Alpine.data("conferencia", (slug: string) => ({
	itens: [] as ItemConf[],
	lotes: null as Record<string, number[]> | null,
	confirmados: {} as Record<number, boolean>,
	aberto: null as number | null,
	verFora: false,
	chave: `litem:confirmados:${slug}`,
	init() {
		const d = JSON.parse(document.getElementById("conferencia-dados")?.textContent || "{}");
		this.itens = d.itens || [];
		this.lotes = d.lotes || null;
		this.confirmados = ler<Record<number, boolean>>(this.chave, {});
	},
	res(i: ItemConf) {
		return this.confirmados[i.n] && i.resultado === "revisao" ? "ok" : i.resultado;
	},
	confirmar(i: ItemConf) {
		this.confirmados = { ...this.confirmados, [i.n]: true };
		gravar(this.chave, this.confirmados);
	},
	desfazer(i: ItemConf) {
		const c = { ...this.confirmados };
		delete c[i.n];
		this.confirmados = c;
		gravar(this.chave, c);
	},
	get revisar() {
		return this.itens.filter((i) => this.res(i) === "revisao");
	},
	get seus() {
		return this.itens.filter((i) => ["ok", "mesmo_tipo", "nao_atende"].includes(this.res(i)));
	},
	get fora() {
		return this.itens.filter((i) => i.resultado === "fora");
	},
	lotesIncompletos() {
		if (!this.lotes) return [];
		return Object.entries(this.lotes)
			.map(([nome, ns]) => {
				const its = ns.map((n) => this.itens.find((i) => i.n === n)!).filter(Boolean);
				const atende = its.filter((i) => ["ok", "mesmo_tipo"].includes(this.res(i))).length;
				return { nome, total: its.length, atende, itens: its };
			})
			.filter((l) => l.atende > 0 && l.atende < l.total);
	},
	get situacao() {
		if (this.revisar.length) return "revisao";
		if (this.lotesIncompletos().length) return "parcial";
		if (this.itens.some((i) => ["ok", "mesmo_tipo"].includes(this.res(i)))) return "compativeis";
		return "sem_itens";
	},
	conta(r: string) {
		return this.itens.filter((i) => this.res(i) === r).length;
	},
	alternar(n: number) {
		this.aberto = this.aberto === n ? null : n;
	},
	selo(r: string) {
		return (
			{
				ok: ["✓ conferido", "bg-green-50 text-green-700"],
				revisao: ["⚠ revisão", "bg-yellow-50 text-yellow-800"],
				nao_atende: ["✗ não atende", "bg-red-50 text-red-700"],
				mesmo_tipo: ["◐ mesmo tipo, confira", "bg-indigo-50 text-indigo-600"],
				fora: ["✗ não está no seu catálogo", "bg-gray-100 text-gray-500"],
			} as Record<string, string[]>
		)[r];
	},
}));

window.Alpine = Alpine;
Alpine.start();
