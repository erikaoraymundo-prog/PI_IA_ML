from fastapi import APIRouter
from backend.firebase_config import get_db

router = APIRouter()

# Mock data baseada na média global de mercado para a Entrega 2 do PI
MOCK_ECONOMIC_DATA = {
    "median_br": 18000,
    "median_usa": 110000,
    "upside": 511,  # (110k / 18k)*100 - 100
    "salaries_dist": [
        {"Country": "Brazil", "Salario": 12000},
        {"Country": "Brazil", "Salario": 18000},
        {"Country": "Brazil", "Salario": 24000},
        {"Country": "USA", "Salario": 80000},
        {"Country": "USA", "Salario": 110000},
        {"Country": "USA", "Salario": 150000},
        {"Country": "Germany", "Salario": 60000},
        {"Country": "Germany", "Salario": 75000},
    ],
    "remote_dist": [
        {"name": "Remoto", "value": 350},
        {"name": "Presencial", "value": 150}
    ]
}

MOCK_SOCIAL_DATA = {
    "top_skills": [
        {"name": "Python", "count": 240},
        {"name": "React", "count": 195},
        {"name": "Node.js", "count": 180},
        {"name": "SQL", "count": 150},
        {"name": "AWS", "count": 130},
        {"name": "Docker", "count": 110},
        {"name": "TypeScript", "count": 105},
        {"name": "FastAPI", "count": 80},
        {"name": "Figma", "count": 65},
        {"name": "Machine Learning", "count": 55},
    ]
}

@router.get("/economic")
async def get_economic_impact():
    """
    Tenta buscar dados reais de Vagas do Firebase. 
    Se não houver suficientes, retorna Mock Data realista para demonstração.
    """
    db = get_db()
    if not db:
        return MOCK_ECONOMIC_DATA
        
    try:
        # Busca amostras de vagas
        jobs_ref = db.collection('jobs').limit(100).stream()
        remote_count = 0
        presencial_count = 0
        total_jobs = 0
        
        for job in jobs_ref:
            data = job.to_dict()
            total_jobs += 1
            # Verifica se a vaga é remota
            is_remote = data.get('isRemote', False) or data.get('remote_allowed', False)
            location = data.get('location', '').lower()
            if is_remote or 'remoto' in location or 'remote' in location:
                remote_count += 1
            else:
                presencial_count += 1
                
        # Se tivermos mais de 10 vagas reais no banco, usamos os dados reais do Firebase
        # para a distribuição de vagas, mesclando com o salário padrão (já que salário
        # global pode não estar tão bem preenchido nas vagas reais iniciais)
        if total_jobs > 10:
            result = MOCK_ECONOMIC_DATA.copy()
            result["remote_dist"] = [
                {"name": "Remoto", "value": remote_count},
                {"name": "Presencial", "value": presencial_count}
            ]
            return result
            
        return MOCK_ECONOMIC_DATA
    except Exception as e:
        print(f"Erro ao buscar economic data no firebase: {e}")
        return MOCK_ECONOMIC_DATA

@router.get("/social")
async def get_social_impact():
    """
    Tenta buscar dados de Currículos/Usuários do Firebase.
    Se não houver, usa Mock Data.
    """
    db = get_db()
    if not db:
        return MOCK_SOCIAL_DATA
        
    try:
        # Buscando usuários ou currículos para extrair skills
        users_ref = db.collection('users').limit(50).stream()
        skills_counter = {}
        total_users = 0
        
        for user in users_ref:
            data = user.to_dict()
            total_users += 1
            skills = data.get('skills', [])
            if isinstance(skills, str):
                skills = [s.strip() for s in skills.split(',')]
                
            for skill in skills:
                if skill:
                    skills_counter[skill] = skills_counter.get(skill, 0) + 1
                    
        if total_users > 5 and skills_counter:
            sorted_skills = sorted(skills_counter.items(), key=lambda x: x[1], reverse=True)[:15]
            return {
                "top_skills": [{"name": k, "count": v} for k, v in sorted_skills]
            }
            
        return MOCK_SOCIAL_DATA
    except Exception as e:
        print(f"Erro ao buscar social data no firebase: {e}")
        return MOCK_SOCIAL_DATA
