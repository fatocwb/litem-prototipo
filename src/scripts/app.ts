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

// Deixa as funções de formatação disponíveis dentro do HTML do Alpine (ex.: x-text="reais(item.total)").
Alpine.magic("fmt", () => ({ reais, reaisCurto, inteiro, dataBR, textoFaltam }));

// ---------- Menu lateral no celular ----------
Alpine.data("casca", () => ({
	menuAberto: false,
}));

// ---------- Abas do edital (guarda a aba no endereço: #itens, #cotacao...) ----------
const ABAS = ["resumo", "atencao", "itens", "cotacao", "controle"];
Alpine.data("abasEdital", () => ({
	aba: "resumo",
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

window.Alpine = Alpine;
Alpine.start();
