"""
Gera os dados de demonstração do protótipo a partir de dados REAIS do PNCP.

O que este script faz (sem IA, só regras simples):
  1. Lê as listas de pregões com proposta aberta do Centro-Oeste (ferramentas/pncp/lista_*.json).
  2. Para os pregões de TI escolhidos, lê os itens (ferramentas/pncp/itens_*.json).
  3. Descobre o TIPO de cada item pelas primeiras palavras (nível 1).
  4. Compara os itens com o CATÁLOGO DE EXEMPLO (marca fictícia TesteTech) usando os
     requisitos que aparecem no resumo do PNCP (RAM, SSD, núcleos, garantia, tela, ppm).
     -> isto é uma SIMULAÇÃO do motor: o LiTem de verdade lê o Termo de Referência inteiro.
  5. Escolhe a aba de cada edital pela regra da "opção A" (decisões do projeto).

Saída:
  src/data/catalogo-exemplo.json
  src/data/geral.json                     (lista para a página Geral)
  src/data/editais/<slug>.json            (um arquivo por edital de TI conferido)
  e acrescenta a conferência no edital de Barra do Garças.

Como rodar:  python3 ferramentas/gerar_demo.py   (na pasta do projeto)
"""
import json, re, glob, os
from datetime import datetime

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PNCP = os.path.join(RAIZ, "ferramentas", "pncp")
DADOS = os.path.join(RAIZ, "src", "data")

# ---------------------------------------------------------------- catálogo de exemplo
CATALOGO = [
    {"id": "NB-A", "tipo": "NOTEBOOK", "nome": "Notebook TesteTech NB-A", "familia": "Notebooks e Desktops", "ram": 16, "ssd": 512, "nucleos": 12, "tela": 14, "garantias": [12, 36, 48], "disp": "em estoque", "resumo": "Core Ultra 5 225U (2025), 16 GB, SSD NVMe 512 GB, 14\", Windows 11 Pro"},
    {"id": "NB-B", "tipo": "NOTEBOOK", "nome": "Notebook TesteTech NB-B", "familia": "Notebooks e Desktops", "ram": 8, "ssd": 256, "tela": 15.6, "garantias": [12], "disp": "em estoque", "resumo": "Core i3 (2024), 8 GB, SSD 256 GB, 15,6\", Windows 11 Pro"},
    {"id": "DT-M", "tipo": "MICROCOMPUTADOR", "nome": "Desktop TesteTech DT-M", "familia": "Notebooks e Desktops", "ram": 16, "ssd": 512, "nucleos": 10, "garantias": [12, 36], "disp": "sob encomenda", "resumo": "Core i5 14ª geração, 16 GB, SSD 512 GB, gabinete compacto, Windows 11 Pro"},
    {"id": "WS-32", "tipo": "MICROCOMPUTADOR", "nome": "Workstation TesteTech WS-32", "familia": "Notebooks e Desktops", "ram": 32, "ssd": 1000, "nucleos": 14, "garantias": [36, 60], "disp": "sob encomenda", "resumo": "Core i7 14ª geração, 32 GB, SSD 1 TB, placa de vídeo 8 GB"},
    {"id": "AIO-24", "tipo": "ALL IN ONE", "nome": "All in One TesteTech AIO-24", "familia": "Notebooks e Desktops", "ram": 16, "ssd": 512, "nucleos": 10, "tela": 23.8, "garantias": [12, 36], "disp": "em estoque", "resumo": "Core i5, 16 GB, SSD 512 GB, tela 23,8\" Full HD"},
    {"id": "MN-24", "tipo": "MONITOR", "nome": "Monitor TesteTech MN-24", "familia": "Monitores e Periféricos", "tela": 23.8, "hz": 75, "garantias": [36], "disp": "em estoque", "resumo": "23,8\" Full HD IPS, 75 Hz, HDMI e DisplayPort, regulagem de altura"},
    {"id": "MN-27", "tipo": "MONITOR", "nome": "Monitor TesteTech MN-27", "familia": "Monitores e Periféricos", "tela": 27, "hz": 165, "garantias": [36], "disp": "sob encomenda", "resumo": "27\" QHD IPS, 165 Hz, HDMI, DisplayPort e USB-C"},
    {"id": "MS-10", "tipo": "MOUSE", "nome": "Mouse TesteTech MS-10", "familia": "Monitores e Periféricos", "garantias": [12], "disp": "em estoque", "resumo": "Óptico, USB, 1.200 dpi"},
    {"id": "TC-20", "tipo": "TECLADO", "nome": "Teclado TesteTech TC-20", "familia": "Monitores e Periféricos", "garantias": [12], "disp": "em estoque", "resumo": "ABNT2, USB"},
    {"id": "WC-1080", "tipo": "WEBCAM", "nome": "Webcam TesteTech WC-1080", "familia": "Monitores e Periféricos", "garantias": [12], "disp": "em estoque", "resumo": "Full HD, microfone embutido"},
    {"id": "MF-40", "tipo": "IMPRESSORA MULTIFUNCIONAL", "nome": "Multifuncional TesteTech MF-40", "familia": "Impressoras", "ppm": 40, "garantias": [12], "disp": "sob encomenda", "resumo": "Laser monocromática, 40 ppm, duplex, rede"},
    {"id": "LP-38", "tipo": "IMPRESSORA LASER", "nome": "Impressora TesteTech LP-38", "familia": "Impressoras", "ppm": 38, "garantias": [12], "disp": "em estoque", "resumo": "Laser monocromática, 38 ppm, duplex"},
    {"id": "NB-1200", "tipo": "NOBREAK", "nome": "Nobreak TesteTech 1200 VA", "familia": "Energia", "garantias": [12], "disp": "em estoque", "resumo": "1200 VA, bivolt (sem dicionário: conferência só pelo tipo)"},
]
# Tipos com dicionário (conferência requisito por requisito, nível 2)
COM_DICIONARIO = {"NOTEBOOK", "MICROCOMPUTADOR", "ALL IN ONE", "MONITOR", "MOUSE", "TECLADO", "WEBCAM",
                  "IMPRESSORA MULTIFUNCIONAL", "IMPRESSORA LASER"}
TIPOS_CATALOGO = {p["tipo"] for p in CATALOGO}

# ---------------------------------------------------------------- nível 1: tipo do item
REGRAS_TIPO = [  # (expressão nas primeiras palavras, tipo)  a ordem importa
    (r"conjunto atualiza", "KIT DE ATUALIZAÇÃO"),
    (r"all ?in ?one|tudo em um", "ALL IN ONE"),
    (r"monitor", "MONITOR"),
    (r"notebook", "NOTEBOOK"),
    (r"workstation|microcomputador|mini ?pc|computador|desktop", "MICROCOMPUTADOR"),
    (r"multifuncional", "IMPRESSORA MULTIFUNCIONAL"),
    (r"impressora.{0,40}(jato|tinta)", "IMPRESSORA JATO DE TINTA"),
    (r"impressora", "IMPRESSORA LASER"),
    (r"scanner", "SCANNER"),
    (r"tablet", "TABLET"),
    (r"web ?cam|c[aâ]mera web", "WEBCAM"),
    (r"mouse", "MOUSE"),
    (r"teclado", "TECLADO"),
    (r"no-?break|nobreak", "NOBREAK"),
    (r"projetor", "PROJETOR"),
    (r"tela (interativa|de proje|proje)", "TELA DE PROJEÇÃO / INTERATIVA"),
    (r"videoconfer", "VIDEOCONFERÊNCIA"),
    (r"switch", "SWITCH"),
    (r"roteador|access point|ponto de acesso", "ROTEADOR / ACCESS POINT"),
    (r"cabo", "CABO"),
]


def tipo_do_item(desc):
    palavras = re.sub(r"^\d+-", "", desc.strip()).lower().replace(",", " ").split()
    if re.search(r"all ?in ?one|tudo em um", " ".join(palavras[:5])):
        return "ALL IN ONE"
    inicio = " ".join(palavras[:2])  # o nome do produto vem no começo: "maleta para notebook" não é notebook
    for padrao, tipo in REGRAS_TIPO:
        if re.search(padrao, inicio):
            return tipo
    return "OUTRO"


# ---------------------------------------------------------------- nível 2: requisitos no texto
def _n(s):
    s = s.strip().replace(".", "").replace(",", ".") if "," in s else s.replace(".", "") if re.fullmatch(r"\d{1,3}(\.\d{3})+", s) else s
    try:
        return float(s)
    except ValueError:
        return None


def requisito(desc, chaves):
    """Procura o mínimo exigido para um atributo. Três jeitos de escrever, nesta ordem:
    1) 'memória ram: superior a 8'  (resumo do Compras.gov.br)
    2) 'no mínimo 10 núcleos'       (número antes da palavra)
    3) 'memória RAM mínima de 32'   (número logo depois da palavra)
    Devolve (minimo, estrito, trecho) ou None."""
    OP = r"(?P<op>superior a|acima de|m[ií]nim[oa] de|no m[ií]nimo|m[ií]nim[oa]|at[eé])"
    for ch in chaves:
        for padrao in (ch + r"[^:\n]{0,30}?:\s*" + OP + r"?\s*(?P<v>\d[\d.,]*)",
                       OP + r",?\s*(?P<v>\d[\d.,]*)\s*(gb|tb)?\s*(de\s*)?" + ch,
                       ch + r"[^.;:,\d]{0,20}?" + OP + r"\s*(?P<v>\d[\d.,]*)"):
            m = re.search(padrao, desc, re.I)
            if not m:
                continue
            op = (m.group("op") or "").lower()
            if op.startswith("at"):
                break  # "até X" não exige mínimo
            v = _n(m.group("v").rstrip(".,"))
            if v is None:
                continue
            if re.search(r"\btb\b", desc[m.end():m.end() + 4], re.I):
                v *= 1000
            return v, op.startswith(("superior", "acima")), desc[m.start():m.end()].strip()
    return None


ATRIBUTOS = {  # tipo -> lista de (campo, chaves de busca, rótulo, unidade)
    "NOTEBOOK": [("ram", [r"mem[oó]ria ram", r"\bram\b"], "Memória RAM", "GB"), ("ssd", [r"armazenamento ssd", r"\bssd\b"], "SSD", "GB"), ("nucleos", [r"n[uú]cleos"], "Núcleos", ""), ("garantia", [r"garantia on ?site", r"garantia"], "Garantia", "meses")],
    "MICROCOMPUTADOR": [("ram", [r"mem[oó]ria ram", r"\bram\b"], "Memória RAM", "GB"), ("ssd", [r"armazenamento ssd", r"\bssd\b"], "SSD", "GB"), ("nucleos", [r"n[uú]cleos"], "Núcleos", ""), ("garantia", [r"garantia on ?site", r"garantia"], "Garantia", "meses")],
    "ALL IN ONE": [("ram", [r"mem[oó]ria ram", r"\bram\b"], "Memória RAM", "GB"), ("ssd", [r"armazenamento ssd", r"\bssd\b"], "SSD", "GB"), ("nucleos", [r"n[uú]cleos"], "Núcleos", ""), ("tela", [r"tela"], "Tela", "pol."), ("garantia", [r"garantia"], "Garantia", "meses")],
    "MONITOR": [("tela", [r"tamanho (da )?tela", r"tela", r"polegadas"], "Tela", "pol."), ("hz", [r"taxa de atualiza[cç][aã]o"], "Taxa de atualização", "Hz"), ("garantia", [r"garantia"], "Garantia", "meses")],
    "IMPRESSORA MULTIFUNCIONAL": [("ppm", [r"velocidade (de )?impress[aã]o[^:]{0,30}", r"velocidade"], "Velocidade", "ppm"), ("garantia", [r"garantia"], "Garantia", "meses")],
    "IMPRESSORA LASER": [("ppm", [r"velocidade (de )?impress[aã]o[^:]{0,30}", r"velocidade"], "Velocidade", "ppm"), ("garantia", [r"garantia"], "Garantia", "meses")],
}


def ppm_texto(desc):
    m = re.search(r"(\d+)\s*ppm", desc, re.I)
    return (float(m.group(1)), False, desc[max(0, m.start() - 40):m.end()].strip()) if m else None


def conferir(desc, tipo):
    """Devolve dict com resultado (ok, revisao, nao_atende, mesmo_tipo, fora), motivo, prova e produto."""
    produtos = [p for p in CATALOGO if p["tipo"] == tipo]
    if not produtos:
        return {"resultado": "fora", "motivo": "Não está no seu catálogo."}
    if tipo not in COM_DICIONARIO:
        p = produtos[0]
        return {"resultado": "mesmo_tipo", "produto": p["id"], "disp": p["disp"],
                "motivo": f"Conferência técnica ainda não disponível para {tipo}. Confira os requisitos no edital."}
    reqs = []
    for campo, chaves, rotulo, un in ATRIBUTOS.get(tipo, []):
        r = requisito(desc, chaves)
        if campo == "ppm" and not r:
            r = ppm_texto(desc)
        if r:
            reqs.append((campo, rotulo, un) + r)
    if tipo not in ATRIBUTOS:
        p = produtos[0]
        return {"resultado": "ok", "produto": p["id"], "disp": p["disp"],
                "motivo": f"Item simples: o {p['nome']} é do mesmo tipo e atende a descrição básica (conferência simplificada nesta simulação)."}
    if not reqs:
        p = produtos[0]
        return {"resultado": "revisao", "produto": p["id"], "disp": p["disp"],
                "motivo": "O texto deste item não traz os requisitos que dá para comparar (RAM, SSD, núcleos, tela, velocidade, garantia). Na versão real, a ficha vem do Termo de Referência."}

    melhor = None
    for p in produtos:
        duro, garantia, ok = [], [], []
        for campo, rotulo, un, minimo, estrito, trecho in reqs:
            if campo == "garantia":
                tem = max(p.get("garantias", [0]))
                passa = tem > minimo if estrito else tem >= minimo
                (ok if passa else garantia).append((rotulo, minimo, estrito, un, trecho, p.get("garantias")))
                continue
            valor = p.get(campo)
            if valor is None:
                garantia.append((rotulo, minimo, estrito, un, trecho, None))
                continue
            passa = valor > minimo if estrito else valor >= minimo
            (ok if passa else duro).append((rotulo, minimo, estrito, un, trecho, valor))
        nota = (len(duro), len(garantia))
        if melhor is None or nota < melhor[0]:
            melhor = (nota, p, duro, garantia, ok)
    (_, p, duro, garantia, ok) = melhor
    prova = "; ".join(sorted({t for *_, t, _v in (duro + garantia + ok)}))[:300]
    fmt = lambda m, e, u: f"{'mais de ' if e else 'no mínimo '}{int(m) if m == int(m) else m} {u}".strip()
    if not duro and not garantia:
        return {"resultado": "ok", "produto": p["id"], "disp": p["disp"], "prova": prova,
                "motivo": f"{p['nome']} atende: " + "; ".join(f"{r} {fmt(m, e, u)} ✓" for r, m, e, u, _t, _v in ok) + "."}
    if not duro:
        r, m, e, u, _t, tem = garantia[0]
        pergunta = (f"O edital pede {r.lower()} de {fmt(m, e, u)}; o cadastro do {p['id']} tem {', '.join(str(g) for g in tem)} meses. "
                    f"Você consegue essa garantia para este modelo?") if tem else f"O seu catálogo não informa {r.lower()} do {p['id']}."
        return {"resultado": "revisao", "produto": p["id"], "disp": p["disp"], "prova": prova, "motivo": pergunta}
    r, m, e, u, _t, valor = duro[0]
    return {"resultado": "nao_atende", "produto": p["id"], "prova": prova,
            "motivo": f"{r}: o edital pede {fmt(m, e, u)}; o seu melhor modelo ({p['id']}) tem {int(valor) if valor == int(valor) else valor} {u}.".replace(" .", ".")}


# ---------------------------------------------------------------- abas (opção A)
def aba_do_edital(itens, lotes=None):
    do_catalogo = [i for i in itens if i["resultado"] != "fora"]
    if any(i["resultado"] == "revisao" for i in do_catalogo):
        return "revisao"
    if lotes:
        for itens_lote in lotes.values():
            res = [next(i for i in itens if i["n"] == n)["resultado"] for n in itens_lote]
            if any(r in ("nao_atende", "fora") for r in res) and any(r in ("ok", "mesmo_tipo") for r in res):
                return "parcial"
    if any(i["resultado"] in ("ok", "mesmo_tipo") for i in do_catalogo):
        return "compativeis"
    return "sem_itens"


def resumo_cartao(itens):
    seus = [i for i in itens if i["resultado"] in ("ok", "mesmo_tipo", "revisao")]
    return {
        "total": len(itens),
        "ok": sum(i["resultado"] == "ok" for i in itens),
        "mesmo_tipo": sum(i["resultado"] == "mesmo_tipo" for i in itens),
        "revisao": sum(i["resultado"] == "revisao" for i in itens),
        "nao_atende": sum(i["resultado"] == "nao_atende" for i in itens),
        "fora": sum(i["resultado"] == "fora" for i in itens),
        "valorSeus": round(sum(i["total"] for i in seus), 2),
        "emEstoque": sum(i.get("disp") == "em estoque" for i in seus),
        "sobEncomenda": sum(i.get("disp") == "sob encomenda" for i in seus),
    }


# ---------------------------------------------------------------- dados da capa
def plataforma(c):
    link = (c.get("linkSistemaOrigem") or "").lower()
    obj = c.get("objetoCompra", "")
    m = re.match(r"\s*\[([^\]]+)\]", obj)
    if m:
        nome = m.group(1).strip()
        return {"nome": "Licitanet" if nome.lower() == "licitanet" else nome, "url": c.get("linkSistemaOrigem")}
    for chave, nome in [("cnetmobile", "Compras.gov.br"), ("comprasnet", "Compras.gov.br"), ("compras.gov", "Compras.gov.br"), ("licitanet", "Licitanet"),
                        ("portaldecompraspublicas", "Portal de Compras Públicas"), ("bll", "BLL"), ("bnc", "BNC"), ("bbmnet", "BBMNet"), ("licitar", "Licitar Digital")]:
        if chave in link:
            return {"nome": nome, "url": c.get("linkSistemaOrigem")}
    return {"nome": "não informada", "url": c.get("linkSistemaOrigem")}


def link_pncp(controle):
    cnpj, _, resto = controle.split("-", 2)
    seq, ano = resto.split("/")
    return f"https://pncp.gov.br/app/editais/{cnpj}/{ano}/{int(seq)}"


def atualizado(c):
    try:
        pub = datetime.fromisoformat(c["dataPublicacaoPncp"][:19])
        atu = datetime.fromisoformat(c["dataAtualizacaoGlobal"][:19])
        return c["dataAtualizacaoGlobal"][:10] if (atu - pub).days >= 1 else None
    except Exception:
        return None


def capa(c):
    obj = re.sub(r"^\s*\[[^\]]+\]\s*-?\s*", "", c.get("objetoCompra", "")).strip()
    return {
        "controle": c["numeroControlePNCP"],
        "titulo": f"Pregão Eletrônico nº {c['numeroCompra']}/{c['anoCompra']}" + (" (SRP)" if c.get("srp") else ""),
        "orgao": c["orgaoEntidade"]["razaoSocial"].title().replace(" De ", " de ").replace(" Do ", " do ").replace(" Da ", " da ").replace(" Dos ", " dos ").replace(" E ", " e "),
        "cidade": c["unidadeOrgao"]["municipioNome"], "uf": c["unidadeOrgao"]["ufSigla"],
        "objeto": obj[:220] + ("…" if len(obj) > 220 else ""),
        "disputa": c.get("dataEncerramentoProposta"),
        "publicado": (c.get("dataPublicacaoPncp") or "")[:10],
        "atualizado": atualizado(c),
        "plataforma": plataforma(c),
        "modo": c.get("modoDisputaNome") or "não informado",
        "srp": bool(c.get("srp")),
        "valorTotal": c.get("valorTotalEstimado") or 0,
        "sigiloso": not c.get("valorTotalEstimado"),
        "pncp": link_pncp(c["numeroControlePNCP"]),
    }


# ---------------------------------------------------------------- montagem
def main():
    lista = {}
    for f in sorted(glob.glob(os.path.join(PNCP, "lista_*.json"))):
        for c in json.load(open(f)).get("data", []):
            lista[c["numeroControlePNCP"]] = c
    ti_kw = re.compile(r"inform[aá]tica|computador|notebook|desktop|monitor|impressora|tecnologia da informa|perif[eé]ric|switch|roteador|nobreak|tablet|eletr[oô]nicos", re.I)

    conferidos = {}
    for f in sorted(glob.glob(os.path.join(PNCP, "itens_*.json"))):
        _, cnpj, seq, ano = os.path.basename(f)[:-5].split("_")
        chave = next(k for k in lista if k.startswith(cnpj) and k.endswith(f"-{int(seq):06d}/{ano}"))
        c = lista[chave]
        itens = []
        for it in json.load(open(f)):
            tipo = tipo_do_item(it["descricao"])
            r = conferir(it["descricao"], tipo)
            itens.append({"n": it["numeroItem"], "tipo": tipo, "desc": it["descricao"], "qtd": it.get("quantidade") or 0,
                          "und": it.get("unidadeMedida") or "", "unit": it.get("valorUnitarioEstimado") or 0,
                          "total": it.get("valorTotal") or 0, "sigiloso": bool(it.get("orcamentoSigiloso")),
                          "participacao": it.get("tipoBeneficioNome") or "", **r})
        # numeração amigável (alguns órgãos usam números enormes)
        if itens and max(i["n"] for i in itens) > 999:
            for k, i in enumerate(sorted(itens, key=lambda x: x["n"]), 1):
                i["n"] = k
        cap = capa(c)
        slug = f"pncp-{cnpj}-{ano}-{int(seq)}"
        ed = {"slug": slug, "tipo": "demo", **cap, "forma": "Forma da disputa: não identificada (o protótipo não lê o edital)", "itens": itens}
        ed["aba"] = aba_do_edital(itens)
        ed["cartao"] = resumo_cartao(itens)
        conferidos[chave] = ed
        json.dump(ed, open(os.path.join(DADOS, "editais", slug + ".json"), "w"), ensure_ascii=False, indent=1)

    # Barra do Garças: acrescenta a conferência aos dados que já existem
    p_bdg = os.path.join(DADOS, "editais", "barra-do-garcas-pe30-2026.json")
    bdg = json.load(open(p_bdg))
    for i in bdg["itens"]:
        tipo = tipo_do_item(i["desc"])
        i.update({"tipo": tipo, **{k: None for k in ("produto", "disp", "prova")}, **conferir(i["desc"], tipo)})
    bdg["aba"] = aba_do_edital([{**i} for i in bdg["itens"]])
    bdg["cartao"] = resumo_cartao(bdg["itens"])
    bdg["forma"] = "Por item: cada item tem o seu vencedor"
    json.dump(bdg, open(p_bdg, "w"), ensure_ascii=False, indent=1)

    # Exemplo ilustrativo de lote (dados fictícios) para mostrar a aba Parcial
    ex_itens = []
    for n, tipo, desc, qtd, unit in [
        (1, "NOTEBOOK", "Notebook, memória ram: superior a 8, armazenamento ssd: superior a 250, núcleos por processador: superior a 8, garantia on site: 36", 20, 5200),
        (2, "MOUSE", "Mouse óptico USB, 1.000 dpi", 20, 45),
        (3, "MICROCOMPUTADOR", "Microcomputador, memória ram: 16, armazenamento ssd: superior a 500, núcleos por processador: superior a 8, garantia on site: 36", 15, 4800),
        (4, "MONITOR", "Monitor, tamanho tela: 23 a 24, garantia: 36", 15, 950),
        (5, "TABLET", "Tablet tela: 10, memória ram: mínimo 4 gb, armazenamento interno: 64", 15, 1800),
    ]:
        ex_itens.append({"n": n, "tipo": tipo, "desc": desc, "qtd": qtd, "und": "Unidade", "unit": unit, "total": qtd * unit,
                         "sigiloso": False, "participacao": "", **conferir(desc, tipo)})
    lotes = {"Lote 1": [1, 2], "Lote 2": [3, 4, 5]}
    for i in ex_itens:
        i["lote"] = next(l for l, ns in lotes.items() if i["n"] in ns)
    exemplo = {"slug": "exemplo-lote", "tipo": "ilustrativo", "controle": "exemplo", "titulo": "Pregão Eletrônico nº 00/2026 (exemplo)",
               "orgao": "Prefeitura de Exemplo", "cidade": "Cidade Exemplo", "uf": "MT",
               "objeto": "Exemplo ilustrativo com dados fictícios: mostra como o LiTem avisa quando um lote obriga a fornecer itens que você não tem.",
               "disputa": "2026-11-30T09:00:00", "publicado": "2026-11-10", "atualizado": "2026-11-12", "plataforma": {"nome": "BLL", "url": None},
               "modo": "Aberto", "srp": True, "valorTotal": sum(i["total"] for i in ex_itens), "sigiloso": False, "pncp": None,
               "forma": "Por lote: o lote 2 obriga a fornecer os 3 itens juntos", "lotes": lotes, "itens": ex_itens}
    exemplo["aba"] = aba_do_edital(ex_itens, lotes)
    exemplo["cartao"] = resumo_cartao(ex_itens)
    json.dump(exemplo, open(os.path.join(DADOS, "editais", "exemplo-lote.json"), "w"), ensure_ascii=False, indent=1)

    # Lista da página Geral
    def cartao_de(ed, extra=None):
        base = {k: ed.get(k) for k in ("slug", "tipo", "titulo", "orgao", "cidade", "uf", "objeto", "disputa", "atualizado", "plataforma", "modo", "forma", "valorTotal", "sigiloso", "pncp", "aba", "cartao")}
        return {**base, **(extra or {})}

    geral = [cartao_de(e) for e in conferidos.values()]
    geral.append(cartao_de({**bdg, "tipo": "real", "orgao": bdg["orgao"], "disputa": bdg["datas"]["disputa"], "atualizado": "2026-11-06",
                            "plataforma": bdg["plataforma"], "pncp": bdg["links"]["pncp"]}))
    geral.append(cartao_de(exemplo))
    outros_ti, fora = [], []
    for k, c in lista.items():
        if k in conferidos:
            continue
        cap = capa(c)
        cap.update({"slug": None, "tipo": "capa", "forma": None, "cartao": None})
        if ti_kw.search(c.get("objetoCompra", "")):
            cap["aba"] = "sem_itens"
            outros_ti.append(cap)
        else:
            cap["aba"] = "fora_nicho"
            fora.append(cap)
    fora.sort(key=lambda x: x["disputa"] or "")
    saida = {
        "geradoEm": datetime.now().strftime("%Y-%m-%d"),
        "regiao": "Centro-Oeste (MT, GO, MS, DF)",
        "fonte": "API do PNCP, pregões eletrônicos com proposta aberta (consulta de 16/11/2026, 2 páginas por estado)",
        "totalPregoes": len(lista),
        "editais": geral + outros_ti + fora[:60],
        "foraNichoNaoMostrados": max(0, len(fora) - 60),
    }
    json.dump(saida, open(os.path.join(DADOS, "geral.json"), "w"), ensure_ascii=False, indent=1)
    json.dump(CATALOGO, open(os.path.join(DADOS, "catalogo-exemplo.json"), "w"), ensure_ascii=False, indent=1)

    from collections import Counter
    print("conferidos:", len(conferidos), Counter(e["aba"] for e in conferidos.values()), "| BdG:", bdg["aba"], bdg["cartao"], "| exemplo:", exemplo["aba"])
    print("outros TI:", len(outros_ti), "fora do nicho:", len(fora))
    for e in conferidos.values():
        print(e["aba"], e["orgao"][:30], e["cartao"])


if __name__ == "__main__":
    main()
