from ia_ml_engine.matcher import calculate_match_scores_bulk

resume = "Busco emprego de medio a longo prazo, tenho aptidao com tecnologias, tenho conhecimento intermediario em C#, SQL, Oracle, JavaScript, CSS, HTML e C++."

jobs = [
    {"job_id": "1", "title": "Desenvolvedor Backend Pleno (C# / Oracle)", "description": "Vaga para atuar no desenvolvimento backend de sistemas corporativos utilizando C# e banco de dados Oracle.", "requirements": "Dominio de C#, SQL avancado e banco de dados Oracle.", "source": "Interna", "url": ""},
    {"job_id": "2", "title": "Desenvolvedor Full Stack Junior", "description": "Buscamos um desenvolvedor junior para atuar com JavaScript, HTML e CSS no frontend, e integracao com banco de dados SQL. Diferencial: conhecimento em C++ ou C#.", "requirements": "Conhecimentos em HTML, CSS, JavaScript e banco de dados SQL.", "source": "Interna", "url": ""},
    {"job_id": "3", "title": "Engenheiro de Software C++", "description": "Estamos contratando engenheiro de software para sistemas de alta performance.", "requirements": "Conhecimento em C++, logica de programacao e SQL.", "source": "Interna", "url": ""},
    {"job_id": "4", "title": "Desenvolvedor Front-end React Pleno", "description": "Buscamos um desenvolvedor focado em criar interfaces incriveis e responsivas usando React, Next.js e TailwindCSS.", "requirements": "Solida experiencia com React, hooks, gerenciamento de estado e consumo de APIs REST.", "source": "Interna", "url": ""},
    {"job_id": "5", "title": "Desenvolvedor Backend Node.js Senior", "description": "Construa microsservicos escalaveis na nossa arquitetura serverless.", "requirements": "Forte dominio de Node.js, TypeScript e arquitetura de microsservicos.", "source": "Interna", "url": ""},
]

results = calculate_match_scores_bulk(resume, jobs)
results.sort(key=lambda x: x["score"], reverse=True)
print("--- BULK MATCH RESULTS ---")
for r in results:
    flag = "PASS" if r["score"] >= 8 else "BELOW_THRESHOLD"
    print(f"[{flag}] {r['title']}: {r['score']}%")
