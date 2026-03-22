from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.firebase_config import db, bucket
from ia_ml_engine.parser import extract_text
from ia_ml_engine.matcher import calculate_match_score
import os
import uuid

router = APIRouter()

@router.post("/")
async def match_resume(file: UploadFile = File(...)):
    """
    1. Upload resume to Firebase Storage.
    2. Extract text.
    3. Match with jobs in Firestore.
    4. Save results and return scores.
    """
    try:
        import tempfile
        # 1. Save locally temporarily (Cross-platform compatible)
        temp_filename = f"tmp_{uuid.uuid4()}_{file.filename}"
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, temp_filename)
        with open(temp_path, "wb") as buffer:
            buffer.write(await file.read())
        
        # 2. Upload to Firebase Storage
        blob = bucket.blob(f"resumes/{temp_path}")
        blob.upload_from_filename(temp_path)
        resume_url = blob.public_url
        
        # 3. Extract Text
        content = extract_text(temp_path)
        
        # 4. Gather Internal and External Jobs
        jobs_ref = db.collection('jobs')
        internal_jobs_snapshot = jobs_ref.stream()
        
        all_jobs = []
        for doc in internal_jobs_snapshot:
            job_data = doc.to_dict()
            job_data['job_id'] = doc.id
            job_data['source'] = 'Interna'
            job_data['url'] = ''
            all_jobs.append(job_data)
            
        # Fetch external jobs
        from backend.job_apis import fetch_external_jobs
        external_jobs = []
        try:
            external_jobs = fetch_external_jobs()
            for ej in external_jobs:
                ej['job_id'] = ej['id']
            all_jobs.extend(external_jobs)
        except Exception as e:
            print(f"Failed to fetch external jobs: {e}")
        
        # 5. Perform Matching
        results = []
        for job_data in all_jobs:
            job_text = f"{job_data.get('title', '')} {job_data.get('description', '')} {job_data.get('requirements', '')}"
            
            score = calculate_match_score(content, job_text)
            
            match_data = {
                'job_id': job_data.get('job_id'),
                'job_title': job_data.get('title'),
                'score': score,
                'source': job_data.get('source'),
                'url': job_data.get('url')
            }
            results.append(match_data)
        
        # 6. Cleanup temp file
        os.remove(temp_path)
        
        # Filter results with a minimum threshold (5%) and sort
        results = [r for r in results if r['score'] >= 5]
        results = sorted(results, key=lambda x: x['score'], reverse=True)
        
        # 7. Build Course Suggestions if no matches
        suggestions = []
        if not results:
            content_lower = content.lower()
            if "react" in content_lower or "javascript" in content_lower or "html" in content_lower:
                suggestions.extend([
                    {"title": "Desenvolvimento Web Web (Rocketseat)", "url": "https://app.rocketseat.com.br/discover", "description": "Formação 100% gratuita para iniciar no mundo do Front-end e Web."},
                    {"title": "React na Prática (FreeCodeCamp)", "url": "https://www.freecodecamp.org/portuguese/", "description": "Aprenda construindo projetos passo a passo."}
                ])
            if "python" in content_lower or "dados" in content_lower or "sql" in content_lower:
                suggestions.extend([
                    {"title": "Python para Análise de Dados (DSA)", "url": "https://www.datascienceacademy.com.br/course/python-fundamentos", "description": "Introdução forte a Data Science, Python e Banco de Dados com certificado grátis."},
                    {"title": "Google Data Analytics", "url": "https://www.coursera.org/professional-certificates/google-data-analytics", "description": "Certificação real do Google (disponível com bolsa ou auditoria no Coursera)."}
                ])
            if "java" in content_lower or "c#" in content_lower or "backend" in content_lower:
                suggestions.extend([
                    {"title": "Programação Backend (FIAP ON)", "url": "https://on.fiap.com.br/", "description": "Cursos rápidos da FIAP focados em bases de desenvolvimento de software."}
                ])
            
            # Fallback for generics
            if not suggestions:
                suggestions.extend([
                    {"title": "Lógica e Fundamentos (Fundação Bradesco)", "url": "https://www.ev.org.br/cursos/logica-de-programacao", "description": "Cursos gratuitos incríveis na Escola Virtual para formar sua base técnica."},
                    {"title": "Santander Open Academy (Múltiplos Temas)", "url": "https://app.santanderopenacademy.com/pt-BR/program", "description": "Bolsas de estudo 100% gratuitas em tecnologia e idiomas oferecidas pelo Santander Avançar."}
                ])
        
        return {
            "resume_url": resume_url,
            "matches": results,
            "suggestions": suggestions[:3] # Limit to 3 max
        }
        
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))
