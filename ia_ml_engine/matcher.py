"""
matcher.py
----------
Motor de matching entre currículo e vagas usando TF-IDF + Cosine Similarity.

Novidades (Protocolo Híbrido):
  - Suporta `requisitos_tecnicos` como lista (schema vagas_oportunidades) ou string legacy.
  - Aplica multiplicador w = 1.2 para vagas com fonte_tipo = "INTERNA" no cálculo
    de relevância, priorizando vagas cadastradas internamente.
  - Expõe `calculate_match_vagas_oportunidades` como ponto de entrada principal
    para o novo schema híbrido.
"""

from __future__ import annotations

from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from .nlp_processor import clean_text

# Multiplicador de peso para vagas INTERNAS (conforme especificação)
INTERNAL_WEIGHT_MULTIPLIER: float = 1.2


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _requisitos_to_str(requisitos) -> str:
    """
    Normaliza o campo requisitos_tecnicos para string.
    Aceita:
      - list[str]   → junta com espaço (schema vagas_oportunidades)
      - str         → usa diretamente (schema legado)
      - None / ""   → string vazia
    """
    if isinstance(requisitos, list):
        return " ".join(str(r) for r in requisitos if r)
    return str(requisitos) if requisitos else ""


def _build_job_text(job: dict) -> str:
    """
    Concatena os campos textuais de uma vaga em um único documento para o TF-IDF.
    Compatível com o schema legado (title/description/requirements) e o novo
    schema híbrido (titulo/descricao/requisitos_tecnicos/empresa_nome).
    O título é duplicado para dar boost no IDF.
    """
    titulo = job.get("titulo") or job.get("title", "")
    descricao = job.get("descricao") or job.get("description", "")
    empresa = job.get("empresa_nome", "")

    # requisitos_tecnicos tem precedência sobre requirements (legado)
    req_raw = job.get("requisitos_tecnicos") or job.get("requirements", "")
    requisitos = _requisitos_to_str(req_raw)

    return (
        f"{titulo} {titulo} "          # boost título 2×
        f"{empresa} "
        f"{descricao} "
        f"{requisitos} {requisitos}"   # boost requisitos 2×
    )


# ---------------------------------------------------------------------------
# Função principal — nova API (vagas_oportunidades)
# ---------------------------------------------------------------------------

def calculate_match_vagas_oportunidades(
    resume_text: str,
    vagas: list[dict],
) -> list[dict]:
    """
    Calcula o score de compatibilidade entre um currículo e uma lista de vagas
    do schema `vagas_oportunidades` (Protocolo Híbrido).

    Regras de pontuação:
      - Base: cosine similarity TF-IDF × 100
      - Vagas INTERNAS recebem um multiplicador w = 1.2 (cap: 100)

    Args:
        resume_text: Texto bruto ou parseado do currículo.
        vagas: Lista de dicts com campos do schema vagas_oportunidades.
               Campos mínimos: empresa_nome, requisitos_tecnicos, fonte_tipo.

    Returns:
        Lista de dicts com todos os campos originais + 'score' (float 0-100)
        + 'fonte_peso_aplicado' (bool).
        Ordenada por score decrescente.
    """
    if not vagas or not resume_text:
        return []

    clean_resume = clean_text(resume_text)

    job_texts = [clean_text(_build_job_text(v)) for v in vagas]

    corpus = [clean_resume] + job_texts

    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        min_df=1,
        sublinear_tf=True,
    )
    try:
        tfidf_matrix = vectorizer.fit_transform(corpus)
    except ValueError:
        return []

    resume_vector = tfidf_matrix[0:1]
    job_vectors   = tfidf_matrix[1:]
    similarities  = cosine_similarity(resume_vector, job_vectors)[0]

    results = []
    for i, vaga in enumerate(vagas):
        base_score = float(similarities[i]) * 100
        fonte = str(vaga.get("fonte_tipo", "")).upper()
        peso_aplicado = fonte == "INTERNA"

        # Aplica w = 1.2 para vagas INTERNAS, limita a 100
        final_score = min(base_score * INTERNAL_WEIGHT_MULTIPLIER, 100.0) \
                      if peso_aplicado else base_score

        results.append({
            **vaga,
            "score":               round(final_score, 2),
            "score_base":          round(base_score, 2),
            "fonte_peso_aplicado": peso_aplicado,
        })

    # Ordena por score decrescente
    results.sort(key=lambda x: x["score"], reverse=True)
    return results


# ---------------------------------------------------------------------------
# Função legada — mantém compatibilidade com código existente
# ---------------------------------------------------------------------------

def calculate_match_scores_bulk(resume_text: str, jobs: list[dict]) -> list[dict]:
    """
    Calcula a similaridade entre um currículo e MÚLTIPLAS vagas de uma vez,
    usando um único TF-IDF fitado com o corpus completo (currículo + todas as vagas).
    Isso garante um IDF significativo e scores muito mais precisos.

    Args:
        resume_text: Texto bruto do currículo.
        jobs: Lista de dicts com pelo menos as chaves 'title', 'description', 'requirements'.

    Returns:
        Lista de dicts com os campos originais da vaga + 'score' (0-100).
    """
    if not jobs or not resume_text:
        return []

    clean_resume = clean_text(resume_text)

    job_texts = []
    for job in jobs:
        job_text = (
            f"{job.get('title', '')} {job.get('title', '')} "
            f"{job.get('description', '')} "
            f"{job.get('requirements', '')}"
        )
        job_texts.append(clean_text(job_text))

    corpus = [clean_resume] + job_texts

    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        min_df=1,
        sublinear_tf=True,
    )
    try:
        tfidf_matrix = vectorizer.fit_transform(corpus)
    except ValueError:
        return []

    resume_vector = tfidf_matrix[0:1]
    job_vectors   = tfidf_matrix[1:]
    similarities  = cosine_similarity(resume_vector, job_vectors)[0]

    results = []
    for i, job in enumerate(jobs):
        score = round(float(similarities[i]) * 100, 2)
        results.append({**job, "score": score})

    return results


def calculate_match_score(resume_text: str, job_description_text: str) -> float:
    """
    Compat: calcula score para um único par currículo-vaga.
    Internamente usa a função bulk com corpus de 2 documentos.
    Preferir sempre calculate_match_scores_bulk para múltiplas vagas.
    """
    fake_job = {"title": "", "description": job_description_text, "requirements": ""}
    results = calculate_match_scores_bulk(resume_text, [fake_job])
    return results[0]["score"] if results else 0.0


# ---------------------------------------------------------------------------
# Demo / testes rápidos
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    resume = "Engenheiro de Software com Python, FastAPI e Machine Learning."

    vagas_demo = [
        {
            "titulo": "Dev Python",
            "empresa_nome": "TechCorp",
            "descricao": "Buscamos dev Python com experiência em IA.",
            "requisitos_tecnicos": ["Python", "FastAPI", "Machine Learning"],
            "fonte_tipo": "INTERNA",
            "localizacao": "Remoto",
            "escala_trabalho": "remoto",
        },
        {
            "titulo": "Frontend React",
            "empresa_nome": "StartupXYZ",
            "descricao": "Desenvolvedor React para trabalho de UI.",
            "requisitos_tecnicos": ["React", "JavaScript", "CSS"],
            "fonte_tipo": "SCRAPING",
            "localizacao": "São Paulo",
            "escala_trabalho": "5x2",
        },
    ]

    print("=== Matching Híbrido (vagas_oportunidades) ===")
    for r in calculate_match_vagas_oportunidades(resume, vagas_demo):
        peso = "✓ (w=1.2)" if r["fonte_peso_aplicado"] else ""
        print(f"  [{r['fonte_tipo']}] {r['titulo']}: {r['score']}% (base={r['score_base']}%) {peso}")

