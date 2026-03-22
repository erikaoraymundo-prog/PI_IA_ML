from ia_ml_engine.nlp_processor import clean_text
from ia_ml_engine.matcher import calculate_match_score

resume = """
Desenvolvedor de Software Full Stack
RESUMO PROFISSIONAL
Desenvolvedor com sólida experiência na criação, manutenção e escalonamento de aplicações web e mobile. Especialista em arquitetura de sistemas e apaixonado por resolver problemas complexos através de código limpo e algoritmos eficientes. Focado em entregar produtos de alta performance que alinhem objetivos de negócio à melhor experiência do usuário.

COMPETÊNCIAS TÉCNICAS (HARD SKILLS)
Linguagens de Programação (Nível Avançado)
JavaScript / TypeScript: Ecossistema completo (Node.js, React, Vue.js).
Python: Desenvolvimento backend (Django, FastAPI), Automação e Data Science.
Java: Aplicações empresariais robustas (Spring Boot, Hibernate).
Csharp: Desenvolvimento .NET Core e integração com Azure.
SQL & NoSQL: Modelagem e otimização de bancos de dados (PostgreSQL, MongoDB, Redis).

Ferramentas e Tecnologias
DevOps & Cloud: Docker, Kubernetes, AWS, Google Cloud Platform (GCP).
Versionamento: Git (Gitflow), GitHub Actions, CI/CD.
Arquitetura: Microserviços, API RESTful, GraphQL, Serverless.
Testes: Jest, Cypress, TDD (Test Driven Development).
"""

job1 = "Buscamos um desenvolvedor júnior para atuar com JavaScript, HTML e CSS no frontend, e integração com banco de dados SQL. Diferencial: conhecimento em C++ ou Csharp."
job2 = "Vaga para atuar no desenvolvimento backend de sistemas corporativos utilizando Csharp e banco de dados Oracle."
job3 = "Estamos contratando engenheiro de software para sistemas de alta performance. Conhecimento em C++, lógica de programação e SQL. Rápida aprendizagem."

print("Job 1 Score:", calculate_match_score(resume, job1))
print("Job 2 Score:", calculate_match_score(resume, job2))
print("Job 3 Score:", calculate_match_score(resume, job3))
