from fastapi import APIRouter
from backend.firebase_config import get_db
import concurrent.futures
import time
import os
import json

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
        {"Country": "United States of America", "Salario": 80000},
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

DATA_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "dashboard_data.json")

def load_real_data():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[Dashboard] Erro ao carregar {DATA_FILE}: {e}")
    return None

@router.get("/economic")
def get_economic_impact():
    """
    Retorna dados econômicos para o dashboard obtidos da base real survey_results_public.csv.
    """
    real_data = load_real_data()
    if real_data and "economic" in real_data:
        return real_data["economic"]
    return MOCK_ECONOMIC_DATA

@router.get("/social")
def get_social_impact():
    """
    Retorna dados sociais para o dashboard obtidos da base real resume_data.csv.
    """
    real_data = load_real_data()
    if real_data and "social" in real_data:
        return real_data["social"]
    return MOCK_SOCIAL_DATA
