from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.firebase_config import get_db, get_bucket
from ia_ml_engine.parser import extract_text
from ia_ml_engine.matcher import calculate_match_scores_bulk
from ia_ml_engine.nlp_processor import clean_text, TECH_KEYWORDS
import os
import uuid

router = APIRouter()

# ---------------------------------------------------------------------------
# Vagas de fallback (usadas se o Firestore estiver indisponível)
# ---------------------------------------------------------------------------
FALLBACK_JOBS = [
    {"job_id": "fallback-1", "title": "Desenvolvedor Full Stack Junior", "source": "Interna", "url": "",
     "description": "Desenvolvedor junior para JavaScript, HTML, CSS no frontend e integracao com SQL.",
     "requirements": "HTML, CSS, JavaScript, banco de dados SQL. Perfil sociavel."},
    {"job_id": "fallback-2", "title": "Desenvolvedor Backend Pleno (C# / Oracle)", "source": "Interna", "url": "",
     "description": "Desenvolvimento backend de sistemas corporativos em C# e Oracle.",
     "requirements": "C#, SQL avancado, Oracle. Ingles avancado como diferencial."},
    {"job_id": "fallback-3", "title": "Engenheiro de Software C++", "source": "Interna", "url": "",
     "description": "Engenheiro para sistemas de alta performance.",
     "requirements": "C++, logica de programacao, SQL."},
    {"job_id": "fallback-4", "title": "Desenvolvedor Front-end React Pleno", "source": "Interna", "url": "",
     "description": "Interfaces responsivas com React, Next.js e TailwindCSS.",
     "requirements": "React, hooks, Redux ou Zustand, APIs REST."},
    {"job_id": "fallback-5", "title": "Desenvolvedor Backend Node.js Senior", "source": "Interna", "url": "",
     "description": "Microsservicos escalaveis em arquitetura serverless.",
     "requirements": "Node.js, TypeScript, microsservicos, NoSQL, Kafka ou RabbitMQ."},
    {"job_id": "fallback-6", "title": "Desenvolvedor Mobile Flutter Senior", "source": "Interna", "url": "",
     "description": "Aplicativos multiplataforma de alta performance com Flutter e Dart.",
     "requirements": "Flutter, Dart, APIs RESTful, publicacao nas lojas."},
    {"job_id": "fallback-7", "title": "Engenheiro de Dados Python / Spark", "source": "Interna", "url": "",
     "description": "Pipelines de ETL robustos para grandes volumes de dados.",
     "requirements": "Python, SQL, Apache Spark, Airflow."},
    {"job_id": "fallback-8", "title": "Arquiteto de Solucoes Cloud (AWS)", "source": "Interna", "url": "",
     "description": "Arquiteturas resilientes e seguras na nuvem AWS.",
     "requirements": "AWS, EC2, S3, RDS, Lambda, Terraform."},
]


@router.post("/")
async def match_resume(file: UploadFile = File(...)):
    """
    1. Salva currículo (tenta upload no Firebase Storage, cai em skip se indisponível).
    2. Extrai texto do arquivo.
    3. Busca vagas do Firestore (usa FALLBACK_JOBS se Firestore indisponível).
    4. Matching bulk TF-IDF.
    5. Retorna matches e sugestões de cursos.
    """
    temp_path = None
    try:
        import tempfile

        print(f"[MATCH] Arquivo recebido: {file.filename}")

        # 1. Salva temporariamente
        temp_filename = f"tmp_{uuid.uuid4()}_{file.filename}"
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, temp_filename)
        with open(temp_path, "wb") as buffer:
            buffer.write(await file.read())
        print(f"[MATCH] Arquivo salvo em: {temp_path}")

        # 2. Upload para Firebase Storage (opcional)
        resume_url = ""
        try:
            bucket = get_bucket()
            if bucket:
                blob = bucket.blob(f"resumes/{temp_filename}")
                blob.upload_from_filename(temp_path)
                resume_url = blob.public_url
                print(f"[MATCH] Upload Storage OK: {resume_url}")
            else:
                print("[MATCH] Storage indisponivel, pulando upload.")
        except Exception as e:
            print(f"[MATCH] WARN Storage upload falhou (nao critico): {e}")

        # 3. Extrai texto
        content = extract_text(temp_path)
        print(f"[MATCH] Texto extraido: {len(content)} chars")
        print(f"[MATCH] Preview: {content[:200].replace(chr(10), ' ')}")
        if not content or not content.strip():
            raise HTTPException(status_code=422, detail="Nao foi possivel extrair texto do curriculo enviado.")

        # 4. Busca vagas internas no Firestore
        all_jobs = []
        try:
            db = get_db()
            if db:
                jobs_ref = db.collection('jobs')
                internal_jobs_snapshot = jobs_ref.stream()
                for doc in internal_jobs_snapshot:
                    job_data = doc.to_dict()
                    job_data['job_id'] = doc.id
                    job_data['source'] = 'Interna'
                    job_data['url'] = ''
                    all_jobs.append(job_data)
                print(f"[MATCH] {len(all_jobs)} vagas internas carregadas do Firestore.")
            else:
                print("[MATCH] Firestore indisponivel.")
        except Exception as e:
            print(f"[MATCH] ERRO ao buscar vagas do Firestore: {e}")

        # Vagas externas
        try:
            from backend.job_apis import fetch_external_jobs
            external_jobs = fetch_external_jobs()
            for ej in external_jobs:
                ej['job_id'] = ej.get('id', '')
            all_jobs.extend(external_jobs)
        except Exception as e:
            print(f"[MATCH] WARN External jobs nao disponiveis: {e}")

        # Fallback se Firestore falhou e não há vagas externas
        if not all_jobs:
            print("[MATCH] Usando FALLBACK_JOBS (Firestore e APIs externas indisponiveis).")
            all_jobs = FALLBACK_JOBS

        print(f"[MATCH] Total de vagas para matching: {len(all_jobs)}")

        # 5. Cleanup do arquivo temporário
        os.remove(temp_path)
        temp_path = None

        # 6. Matching bulk
        scored = calculate_match_scores_bulk(content, all_jobs)
        print(f"[MATCH] Scores: {[(r.get('title','?'), r['score']) for r in scored]}")

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
        print(f"[MATCH] Matches apos filtro ({THRESHOLD}%): {len(results)}")

        # 8. Sugestoes de cursos se nao houver matches
        suggestions = []
        if not results:
            content_tokens = set(clean_text(content).split()) & TECH_KEYWORDS

            if content_tokens & {'reactjs', 'javascript', 'html', 'css', 'nextjs', 'vuejs', 'angular'}:
                suggestions.extend([
                    {"title": "Desenvolvimento Web (Rocketseat)", "url": "https://app.rocketseat.com.br/discover", "description": "Formacao 100% gratuita para Front-end e Web."},
                    {"title": "React na Pratica (FreeCodeCamp)", "url": "https://www.freecodecamp.org/portuguese/", "description": "Aprenda React construindo projetos reais."},
                ])
            if content_tokens & {'python', 'sql', 'spark', 'airflow', 'machine', 'learning', 'hadoop'}:
                suggestions.extend([
                    {"title": "Python para Analise de Dados (DSA)", "url": "https://www.datascienceacademy.com.br/course/python-fundamentos", "description": "Introducao a Data Science e Python."},
                    {"title": "Google Data Analytics (Coursera)", "url": "https://www.coursera.org/professional-certificates/google-data-analytics", "description": "Certificacao do Google com bolsa ou auditoria."},
                ])
            if content_tokens & {'csharp', 'java', 'backend', 'spring', 'dotnet', 'nodejs'}:
                suggestions.extend([
                    {"title": "Programacao Backend (FIAP ON)", "url": "https://on.fiap.com.br/", "description": "Cursos rapidos de desenvolvimento de software."},
                ])
            if content_tokens & {'flutter', 'dart', 'kotlin', 'swift', 'android', 'ios'}:
                suggestions.extend([
                    {"title": "Flutter & Dart - Full Course (YouTube)", "url": "https://www.youtube.com/watch?v=VPvVD8t02U8", "description": "Curso completo de Flutter gratuito."},
                ])
            if content_tokens & {'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'devops', 'cloud'}:
                suggestions.extend([
                    {"title": "AWS Cloud Practitioner Essentials", "url": "https://aws.amazon.com/pt/training/learn-about/cloud-practitioner/", "description": "Fundamentos oficiais da AWS gratuitamente."},
                ])
            if not suggestions:
                suggestions = [
                    {"title": "Logica e Fundamentos (Fundacao Bradesco)", "url": "https://www.ev.org.br/cursos/logica-de-programacao", "description": "Cursos gratuitos para base tecnica solida."},
                    {"title": "Santander Open Academy", "url": "https://app.santanderopenacademy.com/pt-BR/program", "description": "Bolsas 100% gratuitas em tecnologia e idiomas."},
                ]

        return {
            "resume_url": resume_url,
            "matches": results,
            "suggestions": suggestions[:3],
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[MATCH] ERRO CRITICO: {e}")
        import traceback; traceback.print_exc()
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))
