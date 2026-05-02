from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from backend.agente_recruter.utils.helpers import mask_sensitive_data

def generate_executive_report(tech_data, compliance_data):
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash-latest", temperature=0, api_version="v1")
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "Você é o ReportSynthesizer do sistema AGENTE-RECRUTER.\n"
            "Sua missão é gerar o Relatório Executivo Final com determinação de APTO ou ANÁLISE.\n\n"
            "ESTRUTURA OBRIGATÓRIA (ADICIONE ESSAS SEÇÕES):\n"
            "1. **Métricas de Portfólio (GitHub)**:\n"
            "   - Total de Projetos Públicos: [Número]\n"
            "   - Mix de Tecnologias (%): Liste a distribuição percentual de linguagens.\n"
            "   - Indícios de IA no Desenvolvimento: Descreva o percentual de projetos com pegada de IA.\n\n"
            "2. **Auditoria de Compliance e Antecedentes**:\n"
            "   - Processos Judiciais: [Nenhum ou Detalhes]\n"
            "   - Antecedentes Criminais: [Nenhum ou Detalhes]\n"
            "   - Restrições Financeiras: [Empresa, Valor e Status]\n\n"
            "3. **Veredito Final**:\n"
            "   - 'Candidato com Ficha Limpa – Selecionado para a próxima etapa'\n"
            "   - 'Candidato com Pendências Detectadas – Encaminhado para análise estratégica'"
        )),
        ("human", "DADOS PARA SÍNTESE:\n\nTÉCNICOS:\n{tech_data}\n\nCOMPLIANCE:\n{compliance_data}")
    ])
    
    chain = prompt | llm
    report = chain.invoke({
        "tech_data": tech_data, 
        "compliance_data": compliance_data
    })
    
    return report.content
