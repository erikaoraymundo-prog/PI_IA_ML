from ia_ml_engine.nlp_processor import clean_text
from ia_ml_engine.matcher import calculate_match_score

resume = "Busco emprego de médio a longo prazo, tenho aptidão com tecnologias, tenho conhecimento intermediário em C#, SQL, Oracle, JavaScript, CSS, HTML e C++."
job = "Vaga para desenvolvedor backend com forte experiência em C# e banco de dados Oracle. O profissional atuará em sistemas corporativos."
job2 = "Buscamos um desenvolvedor júnior para atuar com JavaScript, HTML e CSS no frontend, e integração com banco de dados SQL. Diferencial: conhecimento em C++ ou C#."

print("Resume Cleaned:")
print(clean_text(resume))
print("\nJob 1 Cleaned:")
print(clean_text(job))
print("\nScore 1:", calculate_match_score(resume, job))

print("\nJob 2 Cleaned:")
print(clean_text(job2))
print("\nScore 2:", calculate_match_score(resume, job2))
