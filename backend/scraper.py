"""
scraper.py
----------
Módulo de Web Scraping para aquisição de vagas de emprego em tecnologia.

Estratégia:
  - Usa requests + BeautifulSoup para scraping estático.
  - Aplica filtros obrigatórios: vaga DEVE ter empresa_nome E requisitos.
  - Sanitiza HTML e normaliza texto usando o mesmo pipeline NLP do IA engine.
  - Retorna objetos VagaOportunidade prontos para persistência no Firestore.

Targets configurados:
  - We Work Remotely (Programação / Software Dev)
  - Expandível via SCRAPING_TARGETS.
"""

from __future__ import annotations

import re
import time
import logging
from datetime import datetime, timezone
from typing import Generator, Optional
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

# Import interno (path relativo ao pacote backend)
from backend.vagas_schema import VagaOportunidade, FonteTipo

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuração dos targets de scraping
# ---------------------------------------------------------------------------

SCRAPING_TARGETS = [
    {
        "name": "We Work Remotely – Programming",
        "url": "https://weworkremotely.com/remote-jobs/search?term=python+developer",
        "parser": "wwr",
    },
    {
        "name": "We Work Remotely – DevOps",
        "url": "https://weworkremotely.com/remote-jobs/search?term=devops",
        "parser": "wwr",
    },
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
}

REQUEST_TIMEOUT  = 15       # segundos
DELAY_BETWEEN_REQ = 2       # segundos entre requisições (cortesia)
MAX_VAGAS_PER_TARGET = 20   # limite por target para evitar sobrecarga


# ---------------------------------------------------------------------------
# Sanitização de texto (HTML → texto limpo)
# ---------------------------------------------------------------------------

def _strip_html(raw_html: str) -> str:
    """Remove todas as tags HTML e espaços extras."""
    if not raw_html:
        return ""
    soup = BeautifulSoup(raw_html, "lxml")
    text = soup.get_text(separator=" ")
    # Colapsa espaços múltiplos
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _extract_requisitos(text: str) -> list[str]:
    """
    Heurística para extrair requisitos de um bloco de texto livre.
    Procura por padrões comuns: listas com bullet, seções 'Requisitos',
    'Requirements', 'Skills', etc.
    """
    requisitos: list[str] = []

    # 1. Tenta extrair após palavras-chave de seção
    section_pattern = re.compile(
        r"(?:requisitos?|requirements?|skills?|qualifica[çc][oõ]es?|"
        r"o que buscamos|que esperamos|tech stack|stack)\s*[:\-]?\s*(.*?)(?=\n\n|\Z)",
        re.IGNORECASE | re.DOTALL,
    )
    match = section_pattern.search(text)
    if match:
        block = match.group(1)
        # Separa por newline, bullet •, traço -
        items = re.split(r"[\n•\-]", block)
        requisitos = [i.strip() for i in items if len(i.strip()) > 2]

    # 2. Fallback: extrai tecnologias pelo padrão de palavras capitalizadas / keywords
    if not requisitos:
        tech_keywords = [
            "Python", "JavaScript", "TypeScript", "React", "Node",
            "Java", "Go", "Rust", "Docker", "Kubernetes", "AWS",
            "Azure", "GCP", "SQL", "PostgreSQL", "MongoDB", "Redis",
            "FastAPI", "Django", "Flask", "Spring", "Angular", "Vue",
            "Terraform", "CI/CD", "Linux", "Git", "GraphQL", "REST",
            "Kafka", "Spark", "Airflow", "Machine Learning", "PyTorch",
            "TensorFlow", "Scikit-learn",
        ]
        found = [kw for kw in tech_keywords if re.search(r"\b" + re.escape(kw) + r"\b", text, re.IGNORECASE)]
        requisitos = found

    return requisitos[:20]  # máximo 20 itens


def sanitize_job_text(raw: str) -> str:
    """
    Pipeline completo de sanitização para compatibilidade com o IA engine:
    1. Strip HTML
    2. Remove caracteres de controle / non-printable
    3. Normaliza espaços
    Retorna texto limpo em UTF-8.
    """
    text = _strip_html(raw)
    # Remove bytes de controle (exceto tabulação e newline)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ---------------------------------------------------------------------------
# Parsers específicos por site
# ---------------------------------------------------------------------------

def _parse_wwr(html: str, source_url: str) -> Generator[dict, None, None]:
    """
    Parser para We Work Remotely.
    Extrai vagas da listagem e tenta obter detalhes de cada uma.
    """
    soup = BeautifulSoup(html, "lxml")

    # WWR usa <section class="jobs"> com <li> para cada vaga
    job_items = soup.select("section.jobs li")[:MAX_VAGAS_PER_TARGET]

    for li in job_items:
        # Ignora separadores de categoria
        if "view-all" in li.get("class", []):
            continue

        # Empresa
        company_tag = li.select_one(".company")
        empresa_nome = company_tag.get_text(strip=True) if company_tag else None
        if not empresa_nome:
            logger.debug("[Scraper] WWR: empresa não encontrada, pulando vaga.")
            continue

        # Título
        title_tag = li.select_one(".title")
        titulo = title_tag.get_text(strip=True) if title_tag else "Sem título"

        # Link para detalhe
        link_tag = li.select_one("a")
        detail_url = urljoin("https://weworkremotely.com", link_tag["href"]) if link_tag else None

        # Descrição e requisitos via página de detalhe (com delay)
        descricao_raw = ""
        requisitos: list[str] = []

        if detail_url:
            try:
                time.sleep(DELAY_BETWEEN_REQ)
                resp = requests.get(detail_url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
                if resp.ok:
                    detail_soup = BeautifulSoup(resp.text, "lxml")
                    listing_div = detail_soup.select_one(".listing-container")
                    if listing_div:
                        descricao_raw = listing_div.get_text(separator="\n")
                        requisitos = _extract_requisitos(descricao_raw)
            except requests.RequestException as e:
                logger.warning(f"[Scraper] Erro ao acessar detalhe {detail_url}: {e}")

        # REGRA: ignora vagas sem empresa OU sem requisitos
        if not requisitos:
            logger.info(f"[Scraper] Vaga '{titulo}' ignorada: sem requisitos detectáveis.")
            continue

        yield {
            "empresa_nome":        empresa_nome,
            "titulo":              titulo,
            "localizacao":         "Remoto",
            "escala_trabalho":     "remoto",
            "requisitos_tecnicos": requisitos,
            "descricao":           sanitize_job_text(descricao_raw),
            "url_origem":          detail_url or source_url,
            "fonte_tipo":          FonteTipo.SCRAPING,
        }


_PARSERS = {
    "wwr": _parse_wwr,
}


# ---------------------------------------------------------------------------
# Função principal de scraping
# ---------------------------------------------------------------------------

def scrape_vagas(targets: list[dict] | None = None) -> list[VagaOportunidade]:
    """
    Executa o scraping nos targets configurados e retorna uma lista de
    VagaOportunidade validadas, prontas para persistência.

    Args:
        targets: lista de dicts com "name", "url", "parser".
                 Se None, usa SCRAPING_TARGETS global.

    Returns:
        Lista de VagaOportunidade. Vagas inválidas são descartadas com log.
    """
    if targets is None:
        targets = SCRAPING_TARGETS

    results: list[VagaOportunidade] = []

    for target in targets:
        name       = target.get("name", "?")
        url        = target.get("url", "")
        parser_key = target.get("parser", "")

        parser_fn  = _PARSERS.get(parser_key)
        if not parser_fn:
            logger.error(f"[Scraper] Parser '{parser_key}' não implementado para target '{name}'.")
            continue

        logger.info(f"[Scraper] Iniciando scraping: {name} → {url}")

        try:
            resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
            resp.raise_for_status()
        except requests.RequestException as e:
            logger.error(f"[Scraper] Erro ao acessar {url}: {e}")
            continue

        for raw_job in parser_fn(resp.text, url):
            try:
                vaga = VagaOportunidade(
                    empresa_nome        = raw_job["empresa_nome"],
                    localizacao         = raw_job.get("localizacao", "Remoto"),
                    escala_trabalho     = raw_job.get("escala_trabalho", "remoto"),
                    requisitos_tecnicos = raw_job["requisitos_tecnicos"],
                    fonte_tipo          = FonteTipo.SCRAPING,
                    titulo              = raw_job.get("titulo"),
                    descricao           = raw_job.get("descricao"),
                    url_origem          = raw_job.get("url_origem"),
                    data_postagem       = datetime.now(timezone.utc),
                )
                results.append(vaga)
                logger.info(f"[Scraper] ✓ Vaga capturada: {vaga.titulo} @ {vaga.empresa_nome}")
            except Exception as e:
                logger.warning(f"[Scraper] Vaga rejeitada (validação): {e}")

        time.sleep(DELAY_BETWEEN_REQ)

    logger.info(f"[Scraper] Total de vagas coletadas: {len(results)}")
    return results


# ---------------------------------------------------------------------------
# Utilitário: persiste vagas no Firestore
# ---------------------------------------------------------------------------

def persist_vagas_firestore(vagas: list[VagaOportunidade], db) -> dict:
    """
    Persiste uma lista de VagaOportunidade na coleção `vagas_oportunidades`
    do Firestore. Usa batch para eficiência.

    Returns:
        {"salvo": N, "erros": M}
    """
    collection = db.collection("vagas_oportunidades")
    salvo = 0
    erros = 0

    batch = db.batch()
    for i, vaga in enumerate(vagas):
        try:
            doc_ref = collection.document()
            batch.set(doc_ref, vaga.to_firestore())
            salvo += 1
            # Firestore limita batch a 500 operações
            if (i + 1) % 490 == 0:
                batch.commit()
                batch = db.batch()
        except Exception as e:
            logger.error(f"[Scraper] Erro ao preparar batch para vaga: {e}")
            erros += 1

    try:
        batch.commit()
    except Exception as e:
        logger.error(f"[Scraper] Erro no commit final do batch: {e}")

    return {"salvo": salvo, "erros": erros}
