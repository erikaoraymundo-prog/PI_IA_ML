"""
backend/routes/vagas.py
------------------------
Router FastAPI para o módulo de vagas_oportunidades.

Endpoints:
  GET    /api/vagas/              → Lista todas as vagas ativas
  POST   /api/vagas/interna       → Cadastro manual (fonte_tipo = INTERNA)
  POST   /api/vagas/scraping      → Dispara scraper e persiste resultados
  GET    /api/vagas/{id}          → Detalhe de uma vaga
  DELETE /api/vagas/{id}          → Desativa uma vaga (soft delete)
"""

from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from pydantic import ValidationError

from backend.firebase_config import get_db
from backend.vagas_schema import FonteTipo, VagaInternaInput, VagaOportunidade
from backend.scraper import (
    scrape_vagas,
    scrape_all_sources,
    persist_vagas_firestore,
    persist_with_dedup,
    SCRAPING_TARGETS,
)

logger = logging.getLogger(__name__)
router = APIRouter()

COLLECTION = "vagas_oportunidades"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _db_or_503():
    db = get_db()
    if not db:
        raise HTTPException(status_code=503, detail="Firestore indisponível.")
    return db


def _doc_to_dict(doc) -> dict:
    d = doc.to_dict()
    d["id"] = doc.id
    # Converte Timestamp do Firestore para ISO string
    if "data_postagem" in d and hasattr(d["data_postagem"], "isoformat"):
        d["data_postagem"] = d["data_postagem"].isoformat()
    return d


# ---------------------------------------------------------------------------
# GET /api/vagas/
# ---------------------------------------------------------------------------

@router.get("/", response_model=List[dict], summary="Lista vagas ativas")
async def listar_vagas(
    fonte: Optional[str] = Query(None, description="Filtrar por fonte_tipo: INTERNA ou SCRAPING"),
    empresa: Optional[str] = Query(None, description="Filtrar por nome de empresa (parcial)"),
):
    """
    Retorna todas as vagas da coleção `vagas_oportunidades` com ativo=True.
    Suporta filtros opcionais por fonte_tipo e empresa_nome.
    """
    db = _db_or_503()
    query = db.collection(COLLECTION).where("ativo", "==", True)

    if fonte:
        fonte_upper = fonte.upper()
        if fonte_upper not in [e.value for e in FonteTipo]:
            raise HTTPException(status_code=400, detail=f"fonte_tipo inválido: {fonte}. Use INTERNA ou SCRAPING.")
        query = query.where("fonte_tipo", "==", fonte_upper)

    docs = query.stream()
    vagas = []
    for doc in docs:
        d = _doc_to_dict(doc)
        # Filtro de empresa por substring (case-insensitive) — Firestore não tem LIKE
        if empresa and empresa.lower() not in d.get("empresa_nome", "").lower():
            continue
        vagas.append(d)

    return vagas


# ---------------------------------------------------------------------------
# POST /api/vagas/interna — Cadastro interno com validação bloqueante
# ---------------------------------------------------------------------------

@router.post("/interna", status_code=201, summary="Cadastra vaga interna")
async def cadastrar_vaga_interna(payload: VagaInternaInput):
    """
    Cria uma nova vaga com fonte_tipo = INTERNA.

    ⚠️ Bloqueia o commit se `escala_trabalho` ou `requisitos_tecnicos` estiverem nulos/vazios.
    A validação é feita pelo schema Pydantic antes de qualquer acesso ao banco.
    """
    db = _db_or_503()

    # Monta o objeto completo atribuindo INTERNA automaticamente
    try:
        vaga = VagaOportunidade(
            **payload.model_dump(),
            fonte_tipo=FonteTipo.INTERNA,
        )
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors())

    doc_ref = db.collection(COLLECTION).document()
    doc_ref.set(vaga.to_firestore())

    logger.info(f"[Vagas] Vaga INTERNA criada: id={doc_ref.id} empresa={vaga.empresa_nome}")

    return {
        "id":      doc_ref.id,
        "message": "Vaga interna cadastrada com sucesso.",
        "vaga":    vaga.to_firestore(),
    }


# ---------------------------------------------------------------------------
# POST /api/vagas/scraping — Endpoints de coleta unificada
# ---------------------------------------------------------------------------

@router.post("/scraping", status_code=202, summary="Dispara coleta completa em background")
async def disparar_scraping(background_tasks: BackgroundTasks):
    """
    Inicia a coleta unificada (APIs públicas + HTML) em background.
    Retorna imediatamente com 202 Accepted.
    As vagas coletadas são salvas no Firestore com deduplicação automática.
    """
    db = _db_or_503()

    def _run():
        logger.info("[Vagas/Scraping] Job unificado iniciado em background.")
        vagas = scrape_all_sources(include_html=True)
        resultado = persist_with_dedup(vagas, db)
        logger.info(f"[Vagas/Scraping] Job concluído: {resultado}")

    background_tasks.add_task(_run)

    return {
        "message": "Coleta unificada iniciada em background. Verifique os logs para acompanhar.",
        "fontes": ["Remotive API", "Arbeitnow API", "We Work Remotely (HTML)"],
    }


@router.post("/scraping/sync", summary="Coleta síncrona completa (aguarda resultado)")
async def disparar_scraping_sync(
    api_only: bool = False,
    html_only: bool = False,
):
    """
    Executa a coleta de forma síncrona e retorna o resultado detalhado.

    Parâmetros opcionais:
    - **api_only** (bool): Usa apenas as APIs públicas (Remotive + Arbeitnow), sem HTML scraping.
    - **html_only** (bool): Usa apenas o HTML scraping (We Work Remotely).

    Por padrão, executa ambas as fontes.
    """
    db = _db_or_503()

    if html_only:
        vagas = scrape_vagas(SCRAPING_TARGETS)
    elif api_only:
        from backend.api_fetcher import fetch_all_api_jobs
        vagas = fetch_all_api_jobs()
    else:
        vagas = scrape_all_sources(include_html=True)

    resultado = persist_with_dedup(vagas, db)

    return {
        "vagas_coletadas":  len(vagas),
        "salvo":           resultado["salvo"],
        "duplicatas":      resultado["duplicatas"],
        "erros":           resultado["erros"],
        "modo":            "html_only" if html_only else ("api_only" if api_only else "completo"),
        "amostras": [
            {
                "titulo":     v.titulo,
                "empresa":    v.empresa_nome,
                "localizacao": v.localizacao,
                "requisitos": v.requisitos_tecnicos[:5],
                "url":        v.url_origem,
            }
            for v in vagas[:5]
        ],
    }


@router.post("/scraping/api-only", summary="Coleta rápida só via APIs públicas")
async def disparar_api_only():
    """
    Coleta apenas via Remotive + Arbeitnow (sem scraping HTML).
    Mais rápido e adequado para execuções frequentes.
    """
    db = _db_or_503()
    from backend.api_fetcher import fetch_all_api_jobs

    vagas = fetch_all_api_jobs()
    resultado = persist_with_dedup(vagas, db)

    return {
        "vagas_coletadas": len(vagas),
        **resultado,
        "amostras": [
            {
                "titulo":    v.titulo,
                "empresa":   v.empresa_nome,
                "requisitos": v.requisitos_tecnicos[:4],
            }
            for v in vagas[:5]
        ],
    }


# ---------------------------------------------------------------------------
# GET /api/vagas/{vaga_id}
# ---------------------------------------------------------------------------

@router.get("/{vaga_id}", response_model=dict, summary="Detalhe de uma vaga")
async def detalhar_vaga(vaga_id: str):
    db = _db_or_503()
    doc = db.collection(COLLECTION).document(vaga_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Vaga não encontrada.")
    return _doc_to_dict(doc)


# ---------------------------------------------------------------------------
# DELETE /api/vagas/{vaga_id} — Soft delete
# ---------------------------------------------------------------------------

@router.delete("/{vaga_id}", summary="Desativa uma vaga (soft delete)")
async def desativar_vaga(vaga_id: str):
    db = _db_or_503()
    doc_ref = db.collection(COLLECTION).document(vaga_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Vaga não encontrada.")
    doc_ref.update({"ativo": False})
    logger.info(f"[Vagas] Vaga desativada: id={vaga_id}")
    return {"message": f"Vaga {vaga_id} desativada com sucesso."}
