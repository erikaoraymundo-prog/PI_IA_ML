from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.firebase_config import db, bucket
from ia_ml_engine.parser import extract_text
from ia_ml_engine.matcher import calculate_match_scores_bulk
from ia_ml_engine.nlp_processor import clean_text, TECH_KEYWORDS
import os
import uuid

router = APIRouter()

@router.post("/")
async def match_resume(file: UploadFile = File(...)):
    """
    1. Upload resume to Firebase Storage.
    2. Extract text.
    3. Match with all jobs in Firestore (bulk TF-IDF).
    4. Return scores and optional course suggestions.
    """
    temp_path = None
    try:
        import tempfile

        # 1. Salva temporariamente
        temp_filename = f"tmp_{uuid.uuid4()}_{file.filename}"
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, temp_filename)
        with open(temp_path, "wb") as buffer:
            buffer.write(await file.read())

        # 2. Upload para Firebase Storage
        blob = bucket.blob(f"resumes/{temp_filename}")
        blob.upload_from_filename(temp_path)
        resume_url = blob.public_url

        # 3. Extrai texto
        content = extract_text(temp_path)
        if not content or not content.strip():
            raise HTTPException(status_code=422, detail="Não foi possível extrair texto do currículo enviado.")

        # 4. Busca vagas internas
        jobs_ref = db.collection('jobs')
        internal_jobs_snapshot = jobs_ref.stream()

        all_jobs = []
        for doc in internal_jobs_snapshot:
            job_data = doc.to_dict()
            job_data['job_id'] = doc.id
            job_data['source'] = 'Interna'
            job_data['url'] = ''
            all_jobs.append(job_data)

        # 5. Vagas externas (opcional, não bloqueia se falhar)
        try:
            from backend.job_apis import fetch_external_jobs
            external_jobs = fetch_external_jobs()
            for ej in external_jobs:
                ej['job_id'] = ej.get('id', '')
            all_jobs.extend(external_jobs)
        except Exception as e:
            print(f"[WARN] External jobs unavailable: {e}")

        if not all_jobs:
            raise HTTPException(status_code=404, detail="Nenhuma vaga cadastrada no banco de dados.")

        # 6. Matching bulk (único TF-IDF para currículo + todas as vagas)
        scored = calculate_match_scores_bulk(content, all_jobs)

        # 7. Filtra e ordena — threshold de 8%
        THRESHOLD = 8.0
        results = [
            {
                'job_id': r.get('job_id'),
                'job_title': r.get('title'),
                'score': r['score'],
                'source': r.get('source'),
                'url': r.get('url', ''),
            }
            for r in scored if r['score'] >= THRESHOLD
        ]
        results.sort(key=lambda x: x['score'], reverse=True)

        # 8. Cleanup
        os.remove(temp_path)
        temp_path = None

        # 9. Sugestões de cursos se não houver matches
        suggestions = []
        if not results:
            content_lower = clean_text(content)   # já normalizado
            kw = set(content_lower.split()) & TECH_KEYWORDS

            if kw & {'reactjs', 'javascript', 'html', 'css', 'nextjs', 'vuejs', 'angular'}:
                suggestions.extend([
                    {
                        "title": "Desenvolvimento Web (Rocketseat)",
                        "url": "https://app.rocketseat.com.br/discover",
                        "description": "Formação 100% gratuita para Front-end e Web."
                    },
                    {
                        "title": "React na Prática (FreeCodeCamp)",
                        "url": "https://www.freecodecamp.org/portuguese/",
                        "description": "Aprenda React construindo projetos reais."
                    },
                ])
            if kw & {'python', 'sql', 'spark', 'airflow', 'machine', 'learning', 'hadoop'}:
                suggestions.extend([
                    {
                        "title": "Python para Análise de Dados (DSA)",
                        "url": "https://www.datascienceacademy.com.br/course/python-fundamentos",
                        "description": "Introdução a Data Science, Python e Banco de Dados."
                    },
                    {
                        "title": "Google Data Analytics (Coursera)",
                        "url": "https://www.coursera.org/professional-certificates/google-data-analytics",
                        "description": "Certificação do Google disponível com bolsa ou auditoria."
                    },
                ])
            if kw & {'csharp', 'java', 'backend', 'spring', 'dotnet', 'nodejs'}:
                suggestions.extend([
                    {
                        "title": "Programação Backend (FIAP ON)",
                        "url": "https://on.fiap.com.br/",
                        "description": "Cursos rápidos focados em desenvolvimento de software."
                    },
                ])
            if kw & {'flutter', 'dart', 'kotlin', 'swift', 'android', 'ios'}:
                suggestions.extend([
                    {
                        "title": "Flutter & Dart – Full Course (YouTube)",
                        "url": "https://www.youtube.com/watch?v=VPvVD8t02U8",
                        "description": "Curso completo de Flutter e Dart gratuito no YouTube."
                    },
                ])
            if kw & {'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'devops', 'cloud'}:
                suggestions.extend([
                    {
                        "title": "AWS Cloud Practitioner Essentials",
                        "url": "https://aws.amazon.com/pt/training/learn-about/cloud-practitioner/",
                        "description": "Fundamentos oficiais da AWS, disponível gratuitamente."
                    },
                ])

            # Fallback genérico
            if not suggestions:
                suggestions = [
                    {
                        "title": "Lógica e Fundamentos (Fundação Bradesco)",
                        "url": "https://www.ev.org.br/cursos/logica-de-programacao",
                        "description": "Cursos gratuitos para formar sua base técnica."
                    },
                    {
                        "title": "Santander Open Academy",
                        "url": "https://app.santanderopenacademy.com/pt-BR/program",
                        "description": "Bolsas 100% gratuitas em tecnologia e idiomas."
                    },
                ]

        return {
            "resume_url": resume_url,
            "matches": results,
            "suggestions": suggestions[:3],
        }

    except HTTPException:
        raise
    except Exception as e:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))
