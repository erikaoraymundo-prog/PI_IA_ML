import os
import requests
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from .nlp_processor import clean_text, TECH_KEYWORDS

# ---------------------------------------------------------------------------
# Fallback Offline courses (used when Udemy API fails or returns 0 results)
# ---------------------------------------------------------------------------
OFFLINE_COURSES = {
    "reactjs": {
        "title": "React na Prática (FreeCodeCamp)",
        "headline": "Aprenda React construindo projetos reais.",
        "url": "https://www.freecodecamp.org/portuguese/"
    },
    "python": {
        "title": "Python para Análise de Dados (DSA)",
        "headline": "Introdução a Data Science e Python.",
        "url": "https://www.datascienceacademy.com.br/course/python-fundamentos"
    },
    "sql": {
        "title": "Banco de Dados e SQL (Fundação Bradesco)",
        "headline": "Modelagem de dados e instruções SQL na prática.",
        "url": "https://www.ev.org.br/cursos/banco-de-dados"
    },
    "docker": {
        "title": "Descomplicando o Docker (LinuxTips)",
        "headline": "Aprenda containers do zero ao deploy.",
        "url": "https://www.linuxtips.io/"
    },
    "aws": {
        "title": "AWS Cloud Practitioner Essentials",
        "headline": "Fundamentos oficiais da nuvem AWS gratuitamente.",
        "url": "https://aws.amazon.com/pt/training/learn-about/cloud-practitioner/"
    },
    "javascript": {
        "title": "JavaScript Completo (Rocketseat)",
        "headline": "Domine o JavaScript moderno na web.",
        "url": "https://app.rocketseat.com.br/discover"
    },
    "csharp": {
        "title": "C# e Orientação a Objetos (FIAP ON)",
        "headline": "Cursos rápidos de desenvolvimento de software backend.",
        "url": "https://on.fiap.com.br/"
    },
    "flutter": {
        "title": "Flutter & Dart - Full Course (YouTube)",
        "headline": "Curso completo de desenvolvimento mobile multiplataforma.",
        "url": "https://www.youtube.com/watch?v=VPvVD8t02U8"
    }
}

GENERIC_FALLBACK = {
    "title": "Lógica de Programação (Curso em Vídeo)",
    "headline": "Construa uma base sólida na área de tecnologia gratuitamente.",
    "url": "https://www.cursoemvideo.com/curso/curso-de-algoritmo/"
}


def identify_missing_skills(resume_text: str, job_text: str) -> list[str]:
    """Extrai tokens presentes na vaga mas ausentes no currículo."""
    clean_r = clean_text(resume_text).split()
    clean_j = clean_text(job_text).split()
    
    # Extrai as keywords de tech do candidato e da vaga
    resume_skills = set(clean_r) & TECH_KEYWORDS
    job_skills = set(clean_j) & TECH_KEYWORDS
    
    # Missing = na vaga MAS NAO no curriculo
    missing = job_skills - resume_skills
    return list(missing)


def fetch_udemy_courses(skill: str, client_id: str, client_secret: str) -> list[dict]:
    """Busca cursos gratuitos de uma habilidade na API da Udemy."""
    if not client_id or not client_secret:
        return []
        
    url = f"https://www.udemy.com/api-2.0/courses/?search={skill}&is_paid=false&page_size=5&ordering=relevance"
    try:
        response = requests.get(url, auth=(client_id, client_secret), timeout=5)
        response.raise_for_status()
        data = response.json()
        return data.get("results", [])
    except Exception as e:
        print(f"[UDEMY EXT] Falha ao buscar cursos para {skill}: {e}")
        return []


def select_best_course(skill: str, courses: list[dict]) -> dict:
    """Usa TF-IDF para escolher o curso com titulo/headline mais parecido com a skill."""
    if not courses:
        return {}
        
    if len(courses) == 1:
        return courses[0]
        
    corpus = [skill]
    for c in courses:
        text = f"{c.get('title', '')} {c.get('headline', '')}"
        corpus.append(text)
        
    vectorizer = TfidfVectorizer(stop_words='english')
    try:
        tfidf_matrix = vectorizer.fit_transform(corpus)
        similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])[0]
        best_idx = similarities.argmax()
        return courses[best_idx]
    except Exception:
        # Fallback if TF-IDF fails
        return courses[0]


def generate_justification(skill: str, course_title: str, job_title: str) -> str:
    """Gera a AI string."""
    c_title = course_title.strip() if course_title else "curso"
    j_title = job_title.strip() if job_title else "esta vaga"
    s_name = skill.capitalize()
    
    return f"Este curso de {c_title} foi selecionado porque {j_title} exige {s_name}, e ele fornecerá a base necessária para você atingir a compatibilidade desejada."


def recommend_courses(missing_skills: list[str], udemy_courses_json: list[dict] | None = None, job_title: str = "") -> list[dict]:
    """
    Pipeline que mapeia cada missing_skill para o melhor curso da lista recebida
    (ou fetch se udemy_courses_json não for fornecido).
    """
    client_id = os.getenv("UDEMY_CLIENT_ID", "")
    client_secret = os.getenv("UDEMY_CLIENT_SECRET", "")
    
    results = []
    
    for skill in missing_skills:
        # Se os cursos já vieram no pacote JSON (opcional), filtramos por lá
        available_courses = []
        if udemy_courses_json:
            # Filtra apenas cursos onde title ou headline mencionam a skill
            available_courses = [
                c for c in udemy_courses_json
                if skill.lower() in (c.get("title", "") + c.get("headline", "")).lower()
            ]
        
        # Se não vieram ou não bateu, chama API
        if not available_courses:
            available_courses = fetch_udemy_courses(skill, client_id, client_secret)
            
        # Seleciona o melhor course real
        best_course = select_best_course(skill, available_courses)
        
        # Se a API falhou ou não retornou cursos para esta skill, usa Fallback Offline
        if not best_course:
            fallback = OFFLINE_COURSES.get(skill.lower(), GENERIC_FALLBACK)
            best_course = {
                "title": fallback["title"],
                "url": fallback["url"],
                "headline": fallback["headline"]
            }
            
        # Limpa URL se ela vier relativa da Udemy API
        url = best_course.get("url", "")
        if url.startswith("/"):
            url = f"https://www.udemy.com{url}"
            
        justification = generate_justification(skill, best_course.get("title", ""), job_title)
        
        results.append({
            "habilidade_alvo": skill,
            "curso_nome": best_course.get("title", "Curso Recomendado"),
            "url_acesso": url,
            "justificativa_ia": justification
        })
        
    return results
