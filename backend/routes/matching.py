from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.firebase_config import get_db, get_bucket
from ia_ml_engine.parser import extract_text
from ia_ml_engine.matcher import calculate_match_jobs
from ia_ml_engine.nlp_processor import clean_text, TECH_KEYWORDS
from ia_ml_engine.course_recommender import recommend_courses, identify_missing_skills
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
                jobs_ref = db.collection('vagas_oportunidades')
                internal_jobs_snapshot = jobs_ref.stream()
                for doc in internal_jobs_snapshot:
                    job_data = doc.to_dict()
                    job_data['job_id'] = doc.id
                    job_data['source'] = 'Interna'
                    job_data['fonte_tipo'] = job_data.get('fonte_tipo', 'INTERNA')
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
        scored = calculate_match_jobs(content, all_jobs)
        print(f"[MATCH] Scores: {[(r.get('titulo') or r.get('title','?'), r['score']) for r in scored]}")

        # 7. Filtra e ordena — threshold de 8%
        THRESHOLD = 8.0
        results = [
            {
                'job_id': r.get('job_id') or r.get('id'),
                'job_title': r.get('titulo') or r.get('title'),
                'score': r['score'],
                'source': r.get('fonte_tipo') or r.get('source'),
                'url': r.get('url_vaga') or r.get('url', ''),
            }
            for r in scored if r['score'] >= THRESHOLD
        ]
        results.sort(key=lambda x: x['score'], reverse=True)
        print(f"[MATCH] Matches apos filtro ({THRESHOLD}%): {len(results)}")

        # 8. Sugestoes de cursos se nao houver matches
        suggestions = []
        if not results and scored:
            # Pegamos a vaga com maior score (que não atingiu o threshold)
            best_miss = scored[0]
            
            titulo = best_miss.get('titulo') or best_miss.get('title', '')
            descricao = best_miss.get('descricao') or best_miss.get('description', '')
            requisitos = best_miss.get('requisitos_tecnicos') or best_miss.get('requirements', '')
            if isinstance(requisitos, list):
                requisitos = " ".join([str(req) for req in requisitos])
                
            job_text = f"{titulo} {descricao} {requisitos}"
            missing_skills = identify_missing_skills(content, job_text)
            
            # Limita a 3 cursos recomendados
            recommended = recommend_courses(missing_skills[:3], job_title=titulo)
            
            # Map para o formato esperado pelo frontend
            for c in recommended:
                suggestions.append({
                    "title": c["curso_nome"],
                    "url": c["url_acesso"],
                    "description": c["justificativa_ia"]
                })
                
        if not suggestions:
            # Fallback hard-coded final se não conseguimos achar nenhuma skill missing
            suggestions = [
                {"title": "Lógica de Programação (Curso em Vídeo)", "url": "https://www.cursoemvideo.com/curso/curso-de-algoritmo/", "description": "Curso prático e gratuito para base técnica sólida."},
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

from pydantic import BaseModel

class UpdateStatusInput(BaseModel):
    app_id: str
    status: str

@router.post("/update-status")
async def update_application_status(payload: UpdateStatusInput):
    """
    Atualiza o status de uma candidatura no Firestore
    e notifica o candidato por e-mail (simulado + log de email).
    """
    db = get_db()
    if not db:
        raise HTTPException(status_code=503, detail="Firestore indisponível.")
    
    app_id = payload.app_id
    new_status = payload.status
    
    try:
        app_ref = db.collection('applications').document(app_id)
        app_doc = app_ref.get()
        if not app_doc.exists:
            raise HTTPException(status_code=404, detail="Candidatura não encontrada.")
            
        app_data = app_doc.to_dict()
        user_email = app_data.get('userEmail')
        user_name = app_data.get('userFullName', 'Candidato')
        job_title = app_data.get('jobTitle', 'Vaga')
        
        # Atualiza status no banco
        app_ref.update({"status": new_status})
        
        # Envia e-mail de notificação se e-mail estiver disponível (simulado + log de email + SMTP se disponível)
        if user_email:
            _send_email_notification_simulated(user_email, user_name, job_title, new_status)
        else:
            print(f"[STATUS-UPDATE] Candidatura {app_id} sem e-mail associado. Atualizada no banco mas sem disparo de e-mail.")
        
        return {"success": True, "message": f"Status atualizado para {new_status}."}
    except Exception as e:
        print(f"[STATUS-UPDATE] Erro: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar status: {str(e)}")

def _send_email_notification_simulated(email_to: str, name: str, job_title: str, new_status: str):
    # Traduz status para português amigável
    status_pt = {
        "pendente": "Recebido (Em triagem)",
        "analisando": "Em Análise pelo Recrutador",
        "aceito": "Aprovado / Contratado!",
        "rejeitado": "Finalizado (Não selecionado nesta etapa)"
    }.get(new_status.lower(), new_status)
    
    email_body = f"""
========================================================================
📧 NOTIFICAÇÃO DE E-MAIL ENVIADA (SIMULADO)
========================================================================
De: no-reply@globaltalentbridge.com
Para: {email_to}
Assunto: globalTalentBridge - Atualização do Processo Seletivo (Vaga: {job_title})

Olá, {name}!

Temos novidades sobre o seu processo seletivo para a vaga:
📌 {job_title}

O status da sua candidatura foi atualizado para:
👉 {status_pt}

Você pode acompanhar todo o progresso diretamente no seu painel "Minhas Candidaturas"
em nossa plataforma.

Agradecemos o seu interesse e participação.

Atenciosamente,
Equipe globalTalentBridge
========================================================================
"""
    # 1. Print no terminal do Uvicorn (seguro contra erro de encoding no console do Windows)
    try:
        print(email_body)
    except UnicodeEncodeError:
        # Fallback substituindo emojis e caracteres especiais por "?" para não quebrar a execução
        safe_body = email_body.encode('ascii', errors='replace').decode('ascii')
        print(safe_body)
    
    # 2. Grava em um arquivo de log local no projeto
    try:
        log_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        log_path = os.path.join(log_dir, "email_notifications_log.txt")
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(email_body + "\n")
        print(f"[EMAIL] Log gravado com sucesso em: {log_path}")
    except Exception as e:
        print(f"[EMAIL] Erro ao gravar arquivo de log: {e}")

    # 3. Tenta enviar via SMTP real se configurado nas variáveis de ambiente
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT", "587")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    if smtp_host:
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            sender_email = smtp_user or "no-reply@globaltalentbridge.com"
            
            msg = MIMEMultipart()
            msg['From'] = sender_email
            msg['To'] = email_to
            msg['Subject'] = f"globalTalentBridge - Atualização do Processo Seletivo (Vaga: {job_title})"
            
            # HTML template simplificado
            html = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #00a896; border-bottom: 2px solid #00a896; padding-bottom: 10px;">globalTalentBridge</h2>
                <p>Olá, <strong>{name}</strong>!</p>
                <p>Temos novidades sobre o seu processo seletivo para a vaga: <strong>{job_title}</strong>.</p>
                <p>O status da sua candidatura foi atualizado para: <span style="background: #e0f2fe; color: #0369a1; padding: 4px 8px; border-radius: 6px; font-weight: bold;">{status_pt}</span></p>
                <p>Você pode acompanhar todos os detalhes acessando a plataforma e abrindo a aba "Minhas Candidaturas".</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                <p style="font-size: 0.8rem; color: #666;">Equipe globalTalentBridge &bull; Projeto Integrador IA/ML 2026</p>
              </div>
            </body>
            </html>
            """
            msg.attach(MIMEText(html, 'html'))
            
            server = smtplib.SMTP(smtp_host, int(smtp_port))
            if smtp_port == "587":
                server.starttls()
            
            # Autentica apenas se usuário e senha foram fornecidos (relays corporativos pulam isso)
            if smtp_user and smtp_password:
                server.login(smtp_user, smtp_password)
                
            server.sendmail(sender_email, email_to, msg.as_string())
            server.quit()
            print(f"[EMAIL] E-mail real enviado com sucesso para {email_to} via {smtp_host}")
        except Exception as smtp_err:
            print(f"[EMAIL] Erro ao enviar e-mail real via SMTP ({smtp_host}): {smtp_err}")
