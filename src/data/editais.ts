// Junta os editais da pasta src/data/editais/ (um .json por edital) num formato só, o EditalPagina.
// Existem 3 tipos de arquivo:
//   - "real" (Barra do Garças): análise completa feita à mão, com resumo, pontos de atenção, itens e cotação;
//   - "demo": edital real do PNCP conferido contra o catálogo de exemplo (gerado por ferramentas/gerar_demo.py);
//   - "ilustrativo": exemplo com dados fictícios, para mostrar um caso que ainda não apareceu nos editais reais.

/** Resultado da conferência de um item (o mesmo vocabulário das decisões do projeto). */
export type Resultado = "ok" | "revisao" | "nao_atende" | "mesmo_tipo" | "fora";

export type ItemConferido = {
	n: number;
	tipo: string;
	desc: string;
	qtd: number;
	und: string;
	unit: number;
	total: number;
	resultado: Resultado;
	motivo: string;
	produto?: string | null;
	disp?: string | null;
	prova?: string | null;
	lote?: string;
};

export type Cartao = {
	total: number;
	ok: number;
	mesmo_tipo: number;
	revisao: number;
	nao_atende: number;
	fora: number;
	valorSeus: number;
	emEstoque: number;
	sobEncomenda: number;
};

export type Aba = "compativeis" | "revisao" | "parcial" | "sem_itens" | "fora_nicho";

// ---------- Formato do edital analisado à mão (Barra do Garças) ----------
export type ItemEdital = ItemConferido & {
	tr: number;
	cod: string;
	categoria: string;
	ramo: "Sim" | "Talvez" | "Não";
	participacao: string;
	garantia: string;
	certificacoes: string[];
	requisitos: string[];
	atencao: string[];
	critico: boolean;
};

export type EditalCompleto = {
	slug: string;
	titulo: string;
	orgao: string;
	cidade: string;
	uf: string;
	objeto: string;
	analisadoEm: string;
	fonte: string;
	datas: { esclarecimentoAte: string; disputa: string };
	notaEsclarecimento?: string;
	plataforma: { nome: string; url: string };
	modo: string;
	julgamento: string;
	forma: string;
	valorTotal: number;
	links: { pncp: string; prefeitura?: string };
	perfil: { descricao: string; nota: string };
	resumo: { campo: string; texto: string; onde: string; destaque: boolean }[];
	pontos: { n: number; titulo: string; porque: string; fazer: string; onde: string; prioridade: boolean }[];
	categorias: { nome: string; ramo: "Sim" | "Talvez" | "Não"; itens: number[]; total: number; perguntas: string[] }[];
	itens: ItemEdital[];
	aba: Aba;
	cartao: Cartao;
};

// Nome antigo, usado pelos componentes das abas de Barra do Garças
export type Edital = EditalCompleto;

// ---------- Formato comum usado pelas páginas ----------
export type EditalPagina = {
	slug: string;
	tipo: "real" | "demo" | "ilustrativo";
	titulo: string;
	orgao: string;
	cidade: string;
	uf: string;
	objeto: string;
	disputa: string | null;
	esclarecimentoAte?: string;
	notaEsclarecimento?: string;
	atualizado?: string | null;
	plataforma: { nome: string; url?: string | null };
	modo: string;
	forma: string;
	valorTotal: number;
	sigiloso?: boolean;
	links: { pncp?: string | null; pdf?: string | null };
	itens: ItemConferido[];
	lotes?: Record<string, number[]>;
	aba: Aba;
	cartao: Cartao;
	analiseProfunda?: string; // data da análise profunda, quando existe
	completo?: EditalCompleto; // só no edital analisado à mão
};

type Demo = Omit<EditalPagina, "links" | "completo"> & { pncp?: string | null };

function normalizar(bruto: any): EditalPagina {
	if (bruto.resumo) {
		const e = bruto as EditalCompleto;
		return {
			slug: e.slug,
			tipo: "real",
			titulo: e.titulo,
			orgao: e.orgao,
			cidade: e.cidade,
			uf: e.uf,
			objeto: e.objeto,
			disputa: e.datas.disputa,
			esclarecimentoAte: e.datas.esclarecimentoAte,
			notaEsclarecimento: e.notaEsclarecimento,
			atualizado: "2026-11-06",
			plataforma: e.plataforma,
			modo: e.modo,
			forma: e.forma,
			valorTotal: e.valorTotal,
			links: { pncp: e.links.pncp, pdf: e.links.prefeitura },
			itens: e.itens,
			aba: e.aba,
			cartao: e.cartao,
			analiseProfunda: e.analisadoEm,
			completo: e,
		};
	}
	const d = bruto as Demo;
	return { ...d, links: { pncp: d.pncp ?? null } } as EditalPagina;
}

const arquivos = import.meta.glob("./editais/*.json", { eager: true, import: "default" });

export const editais: EditalPagina[] = Object.values(arquivos).map(normalizar);
