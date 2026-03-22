import os
import sys

# Ensure backend module can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.firebase_config import db

def seed():
    jobs_to_add = [
        {
            "title": "Desenvolvedor Full Stack Júnior",
            "description": "Buscamos um desenvolvedor júnior para atuar com JavaScript, HTML e CSS no frontend, e integração com banco de dados SQL. Diferencial: conhecimento em C++ ou C#.",
            "requirements": "Conhecimentos em HTML, CSS, JavaScript e banco de dados SQL. Perfil adaptável e sociável."
        },
        {
            "title": "Desenvolvedor Backend Pleno (C# / Oracle)",
            "description": "Vaga para atuar no desenvolvimento backend de sistemas corporativos utilizando C# e banco de dados Oracle.",
            "requirements": "Domínio de C#, SQL avançado e banco de dados Oracle. Inglês avançado será um diferencial."
        },
        {
            "title": "Engenheiro de Software C++",
            "description": "Estamos contratando engenheiro de software para sistemas de alta performance.",
            "requirements": "Conhecimento em C++, lógica de programação e SQL. Rápida aprendizagem."
        }
    ]

    print("Adding jobs to Firestore...")
    for job in jobs_to_add:
        _, doc_ref = db.collection('jobs').add(job)
        print(f"Added job: {job['title']} with ID {doc_ref.id}")

if __name__ == "__main__":
    seed()
