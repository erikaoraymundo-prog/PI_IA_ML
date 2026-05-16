from fastapi import APIRouter
from backend.firebase_config import get_db
import concurrent.futures
import time

router = APIRouter()

# ── Cache em memória com TTL ─────────────────────────────────────────────
_cache = {}
CACHE_TTL_SECONDS = 300  # 5 minutos

def _get_cached(key):
    """Retorna dado do cache se ainda válido, senão None."""
    entry = _cache.get(key)
    if entry and (time.time() - entry["ts"]) < CACHE_TTL_SECONDS:
        return entry["data"]
    return None

def _set_cache(key, data):
    """Armazena dado no cache com timestamp."""
    _cache[key] = {"data": data, "ts": time.time()}

# Mock data baseada na média global de mercado para a Entrega 2 do PI
MOCK_ECONOMIC_DATA = {
    "median_br": 18000,
    "median_usa": 110000,
    "upside": 511,  # (110k / 18k)*100 - 100
    "salaries_dist": [
        {"Country": "Brazil", "Salario": 12000},
        {"Country": "Spain", "Salario": 18000},
        {"Country": "Bolivia", "Salario": 24000},
        {"Country": "USA", "Salario": 80000},
        {"Country": "China", "Salario": 110000},
        {"Country": "Canada", "Salario": 150000},
        {"Country": "Germany", "Salario": 60000},
        {"Country": "Japan", "Salario": 75000},
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
def get_economic_impact():
    """
    Retorna dados econômicos para o dashboard.
    Usa cache em memória (TTL 5min) para evitar queries repetidas ao Firebase.
    Se Firebase desativado ou indisponível, retorna Mock Data instantaneamente.
    """
    import os
    if os.getenv("USE_FIREBASE_DASHBOARD", "false").lower() != "true":
        return MOCK_ECONOMIC_DATA

    # Verificar cache primeiro
    cached = _get_cached("economic")
    if cached is not None:
        return cached
        
    def fetch_firebase():
        db = get_db()
        if not db:
            raise Exception("No DB")
        jobs_ref = db.collection('jobs').limit(100).stream()
        remote_count = 0
        presencial_count = 0
        total_jobs = 0
        
        for job in jobs_ref:
            data = job.to_dict()
            total_jobs += 1
            is_remote = data.get('isRemote', False) or data.get('remote_allowed', False)
            location = data.get('location', '').lower()
            if is_remote or 'remoto' in location or 'remote' in location:
                remote_count += 1
            else:
                presencial_count += 1
        return total_jobs, remote_count, presencial_count

    try:
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
        future = executor.submit(fetch_firebase)
        total_jobs, remote_count, presencial_count = future.result(timeout=3.0)
        executor.shutdown(wait=False)
        
        if total_jobs > 10:
            result = MOCK_ECONOMIC_DATA.copy()
            result["remote_dist"] = [
                {"name": "Remoto", "value": remote_count},
                {"name": "Presencial", "value": presencial_count}
            ]
            _set_cache("economic", result)
            return result
            
        _set_cache("economic", MOCK_ECONOMIC_DATA)
        return MOCK_ECONOMIC_DATA
    except concurrent.futures.TimeoutError:
        print("Timeout ao buscar dados no Firebase. Retornando Mock Data.")
        executor.shutdown(wait=False)
        return MOCK_ECONOMIC_DATA
    except Exception as e:
        print(f"Erro ao buscar economic data no firebase: {e}")
        try:
            executor.shutdown(wait=False)
        except Exception:
            pass
        return MOCK_ECONOMIC_DATA

@router.get("/social")
def get_social_impact():
    """
    Retorna dados sociais para o dashboard.
    Usa cache em memória (TTL 5min) para evitar queries repetidas ao Firebase.
    """
    import os
    if os.getenv("USE_FIREBASE_DASHBOARD", "false").lower() != "true":
        return MOCK_SOCIAL_DATA

    # Verificar cache primeiro
    cached = _get_cached("social")
    if cached is not None:
        return cached
        
    def fetch_users():
        db = get_db()
        if not db:
            raise Exception("No DB")
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
        return total_users, skills_counter

    try:
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
        future = executor.submit(fetch_users)
        total_users, skills_counter = future.result(timeout=3.0)
        executor.shutdown(wait=False)
        
        if total_users > 5 and skills_counter:
            sorted_skills = sorted(skills_counter.items(), key=lambda x: x[1], reverse=True)[:15]
            result = {
                "top_skills": [{"name": k, "count": v} for k, v in sorted_skills]
            }
            _set_cache("social", result)
            return result
            
        _set_cache("social", MOCK_SOCIAL_DATA)
        return MOCK_SOCIAL_DATA
    except concurrent.futures.TimeoutError:
        print("Timeout ao buscar dados sociais no Firebase. Retornando Mock Data.")
        executor.shutdown(wait=False)
        return MOCK_SOCIAL_DATA
    except Exception as e:
        print(f"Erro ao buscar social data no firebase: {e}")
        try:
            executor.shutdown(wait=False)
        except Exception:
            pass
        return MOCK_SOCIAL_DATA
