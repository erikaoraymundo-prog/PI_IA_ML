import os
import pandas as pd
from backend.firebase_config import get_db

def upload_postings(db):
    path = os.path.join("bases", "postings.csv")
    if not os.path.exists(path):
        print(f"[-] Arquivo não encontrado: {path}")
        return
        
    print(f"[*] Lendo {path}...")
    df = pd.read_csv(path, low_memory=False)
    
    # Para não estourar o banco, vamos limitar a 500 registros aleatórios
    df = df.sample(n=min(500, len(df)))
    
    print(f"[*] Fazendo upload de {len(df)} vagas para a coleção 'jobs'...")
    batch = db.batch()
    count = 0
    
    for _, row in df.iterrows():
        doc_ref = db.collection('jobs').document()
        data = {
            "title": str(row.get('title', '')),
            "max_salary": float(row.get('max_salary', 0)) if pd.notna(row.get('max_salary')) else 0,
            "remote_allowed": bool(row.get('remote_allowed', False) == 1.0),
            "location": str(row.get('location', '')),
            "isRemote": bool(row.get('remote_allowed', False) == 1.0)
        }
        batch.set(doc_ref, data)
        count += 1
        
        # Commit a cada 400 registros (limite do Firestore batch é 500)
        if count % 400 == 0:
            batch.commit()
            print(f"  -> {count} vagas enviadas...")
            batch = db.batch()
            
    if count % 400 != 0:
        batch.commit()
        
    print(f"[+] Upload de {count} vagas concluído com sucesso!")

def upload_resumes(db):
    path = os.path.join("bases", "resume_data.csv")
    if not os.path.exists(path):
        print(f"[-] Arquivo não encontrado: {path}")
        return
        
    print(f"[*] Lendo {path}...")
    df = pd.read_csv(path, low_memory=False)
    
    df = df.sample(n=min(500, len(df)))
    
    print(f"[*] Fazendo upload de {len(df)} currículos para a coleção 'users'...")
    batch = db.batch()
    count = 0
    
    for _, row in df.iterrows():
        doc_ref = db.collection('users').document()
        skills_str = str(row.get('skills', ''))
        # Limpar skills string como ['Python', 'Java'] para "Python, Java"
        skills_str = skills_str.replace('[', '').replace(']', '').replace("'", "")
        
        data = {
            "userType": "candidato",
            "skills": skills_str,
            "job_position_name": str(row.get('job_position_name', ''))
        }
        batch.set(doc_ref, data)
        count += 1
        
        if count % 400 == 0:
            batch.commit()
            print(f"  -> {count} usuários enviados...")
            batch = db.batch()
            
    if count % 400 != 0:
        batch.commit()
        
    print(f"[+] Upload de {count} currículos concluído com sucesso!")

if __name__ == "__main__":
    db = get_db()
    if db:
        print("=== Iniciando Upload de Bases para o Firebase ===")
        upload_postings(db)
        upload_resumes(db)
        print("=== Processo Finalizado ===")
    else:
        print("Erro: Não foi possível conectar ao banco de dados Firebase.")
