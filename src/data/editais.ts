// Junta todos os editais da pasta src/data/editais/ (um arquivo .json por edital).
// Para acrescentar um edital ao protótipo, basta criar outro .json no mesmo formato.

export type ItemEdital = {
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

export type Edital = {
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
	valorTotal: number;
	links: { pncp: string; prefeitura?: string };
	perfil: { descricao: string; nota: string };
	resumo: { campo: string; texto: string; onde: string; destaque: boolean }[];
	pontos: { n: number; titulo: string; porque: string; fazer: string; onde: string; prioridade: boolean }[];
	categorias: { nome: string; ramo: "Sim" | "Talvez" | "Não"; itens: number[]; total: number; perguntas: string[] }[];
	itens: ItemEdital[];
};

const arquivos = import.meta.glob<Edital>("./editais/*.json", { eager: true, import: "default" });

export const editais: Edital[] = Object.values(arquivos);
