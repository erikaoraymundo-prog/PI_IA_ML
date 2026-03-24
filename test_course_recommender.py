from ia_ml_engine.course_recommender import (
    identify_missing_skills,
    select_best_course,
    generate_justification,
    recommend_courses,
    OFFLINE_COURSES
)

def test_identify_missing_skills():
    resume = "Experiência com HTML, CSS e JavaScript básico."
    job = "Procuramos dev ReactJS, com domínio em JavaScript e Node.js."
    
    missing = identify_missing_skills(resume, job)
    
    assert "reactjs" in missing
    assert "nodejs" in missing
    assert "javascript" not in missing # Está no currículo e na vaga
    assert "html" not in missing # Está no currículo, não é requisito

def test_select_best_course():
    courses = [
        {"title": "Docker Básico", "headline": "Aprenda o básico de containers."},
        {"title": "Docker for DevOps", "headline": "Curso completo de Docker com Kubernetes integrado."}
    ]
    # Esperamos que o TF-IDF prefira o segundo para "Docker DevOps" ou Kubernetes, 
    # ou prefira os dois pra "Docker". Teste simplificado:
    best = select_best_course("Kubernetes", courses)
    assert best["title"] == "Docker for DevOps"

def test_generate_justification():
    j = generate_justification("Docker", "Descomplicando o Docker", "Engenheiro DevOps")
    assert "Engenheiro DevOps exige Docker" in j
    assert "Descomplicando o Docker" in j

def test_recommend_courses_fallback():
    # Sem a API real (udemy_courses_json = None) e sem credenciais de ambiente (ou falsas)
    missing = ["reactjs", "docker", "habilidade_inventada"]
    
    results = recommend_courses(missing, job_title="Full Stack Developer")
    
    assert len(results) == 3
    
    react_result = next(r for r in results if r["habilidade_alvo"] == "reactjs")
    assert react_result["curso_nome"] == OFFLINE_COURSES["reactjs"]["title"]
    
    invented_result = next(r for r in results if r["habilidade_alvo"] == "habilidade_inventada")
    # Deve cair no genérico
    assert "Lógica" in invented_result["curso_nome"]

if __name__ == "__main__":
    test_identify_missing_skills()
    test_select_best_course()
    test_generate_justification()
    test_recommend_courses_fallback()
    print("Todos os testes passaram com sucesso!")
