"""
backend/api_fetcher.py
----------------------
Módulo responsável por buscar vagas de emprego DEV em APIs públicas gratuitas.

Fontes configuradas:
  1. Remotive API  — https://remotive.com/api/remote-jobs
  2. Arbeitnow API — https://www.arbeitnow.com/api/job-board-api

Não requer chave de API. Retorna objetos VagaOportunidade prontos
para persistência no Firestore via persist_vagas_firestore().
"""

from __future__ import annotations

import re
import time
import logging
import warnings
from datetime import datetime, timezone
from typing import List

import requests
from requests.exceptions import SSLError

from backend.vagas_schema import VagaOportunidade, FonteTipo

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configurações globais
# ---------------------------------------------------------------------------

REQUEST_TIMEOUT = 15   # segundos por requisição
DELAY_BETWEEN   = 1    # segundos de cortesia entre chamadas

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; globalTalentBridge/1.0; "
        "+https://globaltalentbridge.com)"
    ),
    "Accept": "application/json",
}

# ---------------------------------------------------------------------------
# Helper SSL-safe
# ---------------------------------------------------------------------------

def _safe_get(url: str, **kwargs) -> requests.Response:
    """
    Faz GET com verificação SSL. Se falhar por certificado (ambiente corporativo
    ou Python sem certifi configurado), tenta novamente sem verificação.
    """
    try:
        return requests.get(url, verify=True, **kwargs)
    except SSLError:
        warnings.warn(
            f"[ApiFetcher] SSL verify falhou para {url}. "
            "Tentando sem verificação (verify=False). "
            "Instale 'pip install certifi' para corrigir permanentemente.",
            stacklevel=2,
        )
        return requests.get(url, verify=False, **kwargs)

# Tecnologias que nos interessam para filtrar vagas irrelevantes
DEV_KEYWORDS = {
    "python", "javascript", "typescript", "react", "node", "nodejs",
    "java", "go", "golang", "rust", "c#", "dotnet", ".net", "php",
    "ruby", "swift", "kotlin", "scala", "r ", " r,",
    "docker", "kubernetes", "k8s", "aws", "azure", "gcp", "cloud",
    "sql", "postgresql", "mongodb", "redis", "elasticsearch",
    "fastapi", "django", "flask", "spring", "laravel", "angular", "vue",
    "terraform", "devops", "ci/cd", "machine learning", "ml", "data",
    "fullstack", "full stack", "backend", "frontend", "frontend",
    "mobile", "android", "ios", "flutter", "react native",
    "developer", "desenvolvedor", "engenheiro", "engineer", "software",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _strip_html(raw: str) -> str:
    """Remove tags HTML do texto."""
    if not raw:
        return ""
    clean = re.sub(r"<[^>]+>", " ", raw)
    clean = re.sub(r"&[a-zA-Z]+;", " ", clean)   # entidades HTML
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean


def _extract_requisitos(text: str) -> list[str]:
    """
    Extrai requisitos técnicos de um bloco de texto livre.
    Estratégia dupla: busca seções específicas, depois fallback por keywords.
    """
    requisitos: list[str] = []

    # 1. Tenta seções nomeadas (Requirements, Skills, Requisitos…)
    section_re = re.compile(
        r"(?:requirements?|skills?|qualifica[çc][oõ]es?|tech stack|"
        r"o que buscamos|o que esperamos|requisitos?|technologies?)"
        r"\s*[:\-]?\s*(.*?)(?=\n\n|\Z)",
        re.IGNORECASE | re.DOTALL,
    )
    m = section_re.search(text)
    if m:
        block = m.group(1)
        items = re.split(r"[\n•\-\*|,]", block)
        requisitos = [i.strip() for i in items if 2 < len(i.strip()) < 60]

    # 2. Fallback: keywords a partir de lista fixa
    if len(requisitos) < 2:
        TECH_LIST = [
            "Python", "JavaScript", "TypeScript", "React", "Vue", "Angular",
            "Node.js", "Node", "Java", "Go", "Rust", "C#", ".NET", "PHP",
            "Ruby", "Swift", "Kotlin", "Scala", "Flutter", "React Native",
            "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Terraform",
            "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
            "FastAPI", "Django", "Flask", "Spring Boot", "Laravel",
            "Git", "Linux", "CI/CD", "REST", "GraphQL", "Microservices",
            "Machine Learning", "TensorFlow", "PyTorch", "Scikit-learn",
            "Pandas", "Spark", "Airflow", "Kafka",
        ]
        found = [
            kw for kw in TECH_LIST
            if re.search(r"\b" + re.escape(kw) + r"\b", text, re.IGNORECASE)
        ]
        requisitos = found

    return requisitos[:25]


# Títulos que claramente NÃO são dev (exclui falsos positivos do filtro amplo)
_EXCLUDE_TITLE_KEYWORDS = {
    "writer", "copywriter", "editor", "translator", "account manager",
    "marketing", "designer", "recruiter", "sales", "customer", "support",
    "analyst" , "rater", "tutor", "teacher", "nurse", "driver", "chef",
    "finance", "legal", "hr ", "human resource",
}

# Keywords fortes no TÍTULO que garantem uma vaga dev
_DEV_TITLE_KEYWORDS = {
    "developer", "desenvolvedor", "engineer", "engenheiro", "programmer",
    "software", "backend", "frontend", "fullstack", "full-stack", "devops",
    "data scientist", "data engineer", "machine learning", "ml engineer",
    "mobile", "ios", "android", "flutter", "react native",
    "python", "javascript", "typescript", "java ", "golang", "rust",
    "node", "react", "angular", "vue", "aws", "cloud", "sre", "qa engineer",
    "tech lead", "arquiteto", "architect", "infrastructure",
}


def _is_dev_job(title: str, description: str) -> bool:
    """Filtra vagas que são de fato relacionadas a desenvolvimento de software."""
    title_lower = title.lower()
    desc_lower  = description.lower()

    # Exclui rápido por título não-dev
    if any(ex in title_lower for ex in _EXCLUDE_TITLE_KEYWORDS):
        return False

    # Título tem keyword dev forte? Aprova diretamente.
    if any(kw in title_lower for kw in _DEV_TITLE_KEYWORDS):
        return True

    # Título genérico? Exige pelo menos 2 keywords dev na descrição.
    hits = sum(1 for kw in DEV_KEYWORDS if kw in desc_lower)
    return hits >= 2


def _normalize_to_vaga(raw: dict, source_name: str) -> VagaOportunidade | None:
    """
    Converte um dict normalizado para VagaOportunidade.
    Retorna None se a vaga não passar nos filtros de qualidade.
    """
    empresa     = str(raw.get("empresa", "")).strip()
    titulo      = str(raw.get("titulo",  "")).strip()
    descricao   = _strip_html(raw.get("descricao", ""))
    url         = str(raw.get("url", "")).strip()
    localizacao = str(raw.get("localizacao", "Remoto")).strip() or "Remoto"
    escala      = str(raw.get("escala", "remoto")).strip().lower()

    if not empresa or not titulo:
        logger.debug(f"[ApiFetcher] Vaga descartada (empresa/título vazio): {url}")
        return None

    if not _is_dev_job(titulo, descricao):
        logger.debug(f"[ApiFetcher] Vaga descartada (não é dev): {titulo}")
        return None

    requisitos = _extract_requisitos(descricao)
    if not requisitos:
        logger.debug(f"[ApiFetcher] Vaga descartada (sem requisitos): {titulo}")
        return None

    try:
        return VagaOportunidade(
            empresa_nome        = empresa,
            titulo              = titulo,
            localizacao         = localizacao,
            escala_trabalho     = escala,
            requisitos_tecnicos = requisitos,
            descricao           = descricao[:2000],   # corta textos muito longos
            url_origem          = url,
            fonte_tipo          = FonteTipo.SCRAPING,
            data_postagem       = datetime.now(timezone.utc),
            ativo               = True,
        )
    except Exception as e:
        logger.warning(f"[ApiFetcher] Validação falhou para '{titulo}': {e}")
        return None


# ---------------------------------------------------------------------------
# Fonte 1: Remotive API
# ---------------------------------------------------------------------------

REMOTIVE_CATEGORIES = ["software-dev", "data"]

def fetch_remotive(limit_per_category: int = 30) -> list[dict]:
    """
    Busca vagas dev na API pública do Remotive.
    Endpoint: GET https://remotive.com/api/remote-jobs?category=<cat>&limit=<n>
    Não requer autenticação.
    """
    raw_jobs: list[dict] = []

    for category in REMOTIVE_CATEGORIES:
        url = "https://remotive.com/api/remote-jobs"
        params = {"category": category, "limit": limit_per_category}

        try:
            logger.info(f"[ApiFetcher/Remotive] Buscando categoria: {category}")
            resp = _safe_get(url, params=params, headers=HEADERS, timeout=REQUEST_TIMEOUT)
            resp.raise_for_status()
            data = resp.json()
        except requests.RequestException as e:
            logger.error(f"[ApiFetcher/Remotive] Erro na requisição ({category}): {e}")
            continue
        except Exception as e:
            logger.error(f"[ApiFetcher/Remotive] Erro inesperado: {e}")
            continue

        jobs = data.get("jobs", [])
        logger.info(f"[ApiFetcher/Remotive] {len(jobs)} vagas recebidas ({category})")

        for j in jobs:
            # Remotive usa campos: company_name, title, description, url, job_type
            job_type = j.get("job_type", "").lower()
            escala = "remoto"
            if "hybrid" in job_type:
                escala = "hibrido"
            elif "full" in job_type:
                escala = "remoto"

            raw_jobs.append({
                "empresa":    j.get("company_name", ""),
                "titulo":     j.get("title", ""),
                "descricao":  j.get("description", ""),
                "url":        j.get("url", ""),
                "localizacao": j.get("candidate_required_location", "Remoto") or "Remoto",
                "escala":     escala,
                "_source":    "Remotive",
            })

        time.sleep(DELAY_BETWEEN)

    return raw_jobs


# ---------------------------------------------------------------------------
# Fonte 2: Arbeitnow API
# ---------------------------------------------------------------------------

ARBEITNOW_TAGS = ["python", "javascript", "react", "node", "java", "devops", "data-science"]

def fetch_arbeitnow(pages: int = 2) -> list[dict]:
    """
    Busca vagas dev na API pública do Arbeitnow.
    Endpoint: GET https://www.arbeitnow.com/api/job-board-api?page=<n>
    Retorna vagas internacionais (inclui BR) em JSON. Sem auth.
    """
    raw_jobs: list[dict] = []
    base_url = "https://www.arbeitnow.com/api/job-board-api"

    for page in range(1, pages + 1):
        try:
            logger.info(f"[ApiFetcher/Arbeitnow] Buscando página {page}")
            resp = _safe_get(
                base_url,
                params={"page": page},
                headers=HEADERS,
                timeout=REQUEST_TIMEOUT,
            )
            resp.raise_for_status()
            data = resp.json()
        except requests.RequestException as e:
            logger.error(f"[ApiFetcher/Arbeitnow] Erro na requisição (p{page}): {e}")
            continue
        except Exception as e:
            logger.error(f"[ApiFetcher/Arbeitnow] Erro inesperado: {e}")
            continue

        jobs = data.get("data", [])
        logger.info(f"[ApiFetcher/Arbeitnow] {len(jobs)} vagas recebidas (página {page})")

        for j in jobs:
            # Arbeitnow: company_name, title, description, url, remote, location, tags
            tags   = [t.lower() for t in j.get("tags", [])]
            # Filtra apenas vagas com tags de tecnologia relevantes
            if not any(t in tags for t in ARBEITNOW_TAGS) and not _is_dev_job(
                j.get("title", ""), j.get("description", "")
            ):
                continue

            is_remote = j.get("remote", False)
            escala = "remoto" if is_remote else "5x2"
            location = j.get("location", "Remoto") or "Remoto"

            raw_jobs.append({
                "empresa":    j.get("company_name", ""),
                "titulo":     j.get("title", ""),
                "descricao":  j.get("description", ""),
                "url":        j.get("url", ""),
                "localizacao": location,
                "escala":     escala,
                "_source":    "Arbeitnow",
            })

        time.sleep(DELAY_BETWEEN)

    return raw_jobs


# ---------------------------------------------------------------------------
# Função principal pública
# ---------------------------------------------------------------------------

def fetch_all_api_jobs() -> list[VagaOportunidade]:
    """
    Orquestra a busca em todas as fontes configuradas, normaliza e valida.

    Returns:
        Lista de VagaOportunidade prontos para persistência, sem duplicatas
        (deduplicação por url_origem).
    """
    logger.info("[ApiFetcher] Iniciando coleta em todas as fontes de API...")

    raw_all: list[dict] = []
    raw_all.extend(fetch_remotive())
    raw_all.extend(fetch_arbeitnow())

    logger.info(f"[ApiFetcher] Total bruto coletado: {len(raw_all)} vagas")

    # Normaliza e valida
    vagas: list[VagaOportunidade] = []
    seen_urls: set[str] = set()

    for raw in raw_all:
        vaga = _normalize_to_vaga(raw, raw.get("_source", "API"))
        if vaga is None:
            continue

        # Deduplicação por URL
        url_key = vaga.url_origem or ""
        if url_key and url_key in seen_urls:
            logger.debug(f"[ApiFetcher] Duplicata ignorada: {url_key}")
            continue
        if url_key:
            seen_urls.add(url_key)

        vagas.append(vaga)

    logger.info(f"[ApiFetcher] Vagas válidas após filtragem: {len(vagas)}")
    return vagas
