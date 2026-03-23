from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from .nlp_processor import clean_text


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

    # 1. Limpa o texto do currículo
    clean_resume = clean_text(resume_text)

    # 2. Limpa cada vaga e monta o corpus completo
    job_texts = []
    for job in jobs:
        job_text = (
            f"{job.get('title', '')} {job.get('title', '')} "   # título 2x para boost
            f"{job.get('description', '')} "
            f"{job.get('requirements', '')}"
        )
        job_texts.append(clean_text(job_text))

    # 3. Corpus = [currículo, vaga_0, vaga_1, ..., vaga_n]
    corpus = [clean_resume] + job_texts

    # 4. Único vetorizador para o corpus inteiro
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),   # unigramas + bigramas (captura "machine learning", "banco dados")
        min_df=1,
        sublinear_tf=True,    # log(TF+1) — reduz dominância de termos muito repetidos
    )
    try:
        tfidf_matrix = vectorizer.fit_transform(corpus)
    except ValueError:
        # Corpus vazio ou inválido
        return []

    # 5. Vetor do currículo (índice 0) vs. cada vaga (índices 1..n)
    resume_vector = tfidf_matrix[0:1]
    job_vectors = tfidf_matrix[1:]

    similarities = cosine_similarity(resume_vector, job_vectors)[0]

    # 6. Monta resultados enriquecidos
    results = []
    for i, job in enumerate(jobs):
        score = round(float(similarities[i]) * 100, 2)
        results.append({
            **job,
            "score": score,
        })

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


if __name__ == "__main__":
    resume = "Experienced Software Engineer with proficiency in Python, FastAPI, and Machine Learning."
    jobs_sample = [
        {
            "title": "Python Developer",
            "description": "Looking for a Python developer with experience in AI and ML integrations.",
            "requirements": "Python, FastAPI, Machine Learning",
        },
        {
            "title": "Frontend Developer",
            "description": "React developer needed for UI work.",
            "requirements": "React, JavaScript, CSS",
        },
    ]
    for r in calculate_match_scores_bulk(resume, jobs_sample):
        print(f"{r['title']}: {r['score']}%")
