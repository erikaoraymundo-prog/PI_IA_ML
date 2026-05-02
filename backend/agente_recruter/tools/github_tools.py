import os
import requests
from langchain.tools import tool
from backend.agente_recruter.utils.helpers import log_action

@tool
def github_repo_analysis(username: str):
    """
    Realiza auditoria quantitativa e qualitativa do portfólio GitHub.
    Calcula mix de tecnologias (%) e detecta pegada de Inteligência Artificial.
    """
    token = os.getenv("GITHUB_TOKEN")
    headers = {"Accept": "application/vnd.github.v3+json"}
    if token:
        headers["Authorization"] = f"token {token}"
    
    try:
        # Busca perfil básico
        user_url = f"https://api.github.com/users/{username}"
        user_data = requests.get(user_url, headers=headers).json()
        total_repos = user_data.get("public_repos", 0)
        
        # Busca repositórios para análise de stack
        repos_url = f"https://api.github.com/users/{username}/repos?per_page=100"
        repos = requests.get(repos_url, headers=headers).json()
        
        lang_stats = {}
        ai_markers = []
        ai_keywords = ["openai", "langchain", "llama", "stable-diffusion", "tensorflow", "pytorch", "agent", "llm"]
        
        for repo in repos:
            # Soma linguagens (bytes)
            l_url = repo["languages_url"]
            l_data = requests.get(l_url, headers=headers).json()
            for lang, val in l_data.items():
                lang_stats[lang] = lang_stats.get(lang, 0) + val
            
            # Busca indícios de IA
            desc = (repo["description"] or "").lower()
            topics = [t.lower() for t in (repo.get("topics") or [])]
            if any(k in desc for k in ai_keywords) or any(k in topics for k in ai_keywords):
                ai_markers.append(repo["name"])

        # Calcula percentuais
        total_bytes = sum(lang_stats.values())
        perc_stats = {lang: round((val/total_bytes)*100, 1) for lang, val in lang_stats.items()} if total_bytes > 0 else {}
        
        log_action("TechValidator", "github_deep_audit", f"Analisados {len(repos)} projetos", "GitHub API")
        
        return {
            "total_projetos": total_repos,
            "distribuicao_tecnologica": perc_stats,
            "evidencias_ia": {
                "projetos_com_ia": ai_markers,
                "percentual_portfólio_ia": round((len(ai_markers)/len(repos))*100, 1) if repos else 0
            },
            "recentes": [r["name"] for r in repos[:5]]
        }
    except Exception as e:
        log_action("TechValidator", "github_error", str(e), "System")
        return f"Erro na auditoria profunda: {str(e)}"

@tool
def web_search_professional(query: str):
    """
    Realiza busca na web por projetos públicos e menções profissionais de um candidato.
    """
    # Usando Tavily se disponível, senão simulando/usando busca básica
    try:
        from tavily import TavilyClient
        tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
        search_result = tavily.search(query=query)
        log_action("TechValidator", "web_search", f"Busca realizada: {query}", "Tavily")
        return search_result
    except Exception as e:
        log_action("TechValidator", "web_search_error", str(e), "Tavily")
        return f"Erro na busca: {str(e)}"
