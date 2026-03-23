import os
import sys

# Ensure backend module can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.firebase_config import db

def seed():
    jobs_to_add = [
        {
            "title": "Desenvolvedor Front-end React Pleno",
            "description": "Buscamos um desenvolvedor focado em criar interfaces incríveis e responsivas usando React, Next.js e TailwindCSS.",
            "requirements": "Sólida experiência com React, hooks, gerenciamento de estado (Redux/Zustand) e consumo de APIs REST. Conhecimento em testes de interface."
        },
        {
            "title": "Desenvolvedor Backend Node.js Sênior",
            "description": "Venha construir microsserviços escaláveis e de alta disponibilidade na nossa arquitetura serverless.",
            "requirements": "Forte domínio de Node.js, TypeScript e arquitetura de microsserviços. Experiência com bancos NoSQL e mensageria (RabbitMQ/Kafka)."
        },
        {
            "title": "Desenvolvedor Mobile Flutter Senior",
            "description": "Oportunidade para desenvolver aplicativos multiplataforma de alta performance utilizando Flutter e Dart.",
            "requirements": "Experiência comprovada em Flutter, consumo de APIs RESTful e publicação de apps nas lojas (App Store e Google Play)."
        },
        {
            "title": "Engenheiro de Dados Python / Spark",
            "description": "Procuramos um engenheiro de dados para construir e manter pipelines de ETL robustos lidando com grandes volumes de dados.",
            "requirements": "Conhecimento avançado em Python, SQL, Apache Spark e orquestração de dados com Airflow."
        },
        {
            "title": "Arquiteto de Soluções Cloud (AWS)",
            "description": "Seja o responsável por desenhar e implementar arquiteturas resilientes e seguras na nuvem AWS.",
            "requirements": "Certificação AWS Solutions Architect, profundo conhecimento em serviços core (EC2, S3, RDS, Lambda) e infraestrutura como código (Terraform)."
        },
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
