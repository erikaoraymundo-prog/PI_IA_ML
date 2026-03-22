import requests
import re

def fetch_external_jobs():
    """
    Busca vagas de TI gratuitas na API do Remotive.
    """
    url = "https://remotive.com/api/remote-jobs"
    # Limitando a buscar vagas de desenvolvimento de software para melhor relevância
    params = {
        "category": "software-dev",
        "limit": 15
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            jobs = data.get("jobs", [])
            results = []
            for j in jobs:
                raw_desc = j.get("description", "")
                # Remove tags HTML da descrição para não sujar o texto
                clean_desc = re.sub(r'<[^>]+>', '', raw_desc)
                clean_desc = clean_desc.replace('\n', ' ').strip()
                
                results.append({
                    "id": f"remotive_{j.get('id')}",
                    "title": j.get("title", "Desenvolvedor"),
                    "description": clean_desc,
                    "requirements": "",
                    "url": j.get("url", ""),
                    "source": "Remotive (Externa)"
                })
            return results
    except Exception as e:
        print(f"Erro ao buscar vagas externas: {e}")
    
    return []
