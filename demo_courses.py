import requests

print(">>> Testando Recomendação de Cursos Direta <<<")
try:
    response = requests.post(
        "http://127.0.0.1:8000/api/recommend-courses/",
        json={
            "missing_skills": ["python", "docker", "aws"],
            "job_title": "Engenheiro Backend Pleno"
        }
    )
    print("Status:", response.status_code)
    import json
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
except Exception as e:
    print(f"Erro: Backend provavelmente offline. Use 'python run.py' para testar. Detalhe: {e}")
