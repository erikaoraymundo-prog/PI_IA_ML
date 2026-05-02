import os
import requests
from langchain.tools import tool
from backend.agente_recruter.utils.helpers import log_action

@tool
def credit_check(cpf: str):
    """
    Realiza consulta de crédito (Score, Dívidas) via API determinística.
    RESTRIÇÃO: Apenas dados brutos retornados. Não fazer inferências.
    """
    # Simulação de API de Crédito (Ex: Serasa)
    mock_responses = {
        "12345678900": {"score": 850, "pendencias": [], "status": "Excelente"},
        "98765432100": {"score": 420, "pendencias": [{"valor": 1500, "origem": "Banco X"}], "status": "Risco Médio"}
    }
    
    result = mock_responses.get(cpf, {"msg": "Nenhum registro encontrado", "status": "Desconhecido"})
    
    log_action("ComplianceAuditor", "credit_check", result, "CreditAPI_Mock")
    return result

@tool
def legal_check(cpf: str):
    """
    Consulta processos jurídicos reais via API do Escavador.
    RESTRIÇÃO: Reportar apenas dados brutos retornados.
    """
    token = os.getenv("ESCAVADOR_API_KEY")
    if not token:
        log_action("ComplianceAuditor", "legal_check_error", "Token do Escavador não configurado", "System")
        return "Erro: API Key do Escavador não encontrada no ambiente."

    url = f"https://api.escavador.com/api/v1/pessoas/cpf/{cpf}"
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Requested-With": "XMLHttpRequest"
    }

    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            log_action("ComplianceAuditor", "legal_check", "Busca realizada com sucesso", "EscavadorAPI")
            return data
        elif response.status_code == 404:
            log_action("ComplianceAuditor", "legal_check", "Nenhum registro encontrado", "EscavadorAPI")
            return {"msg": "Nenhum registro jurídico encontrado para este CPF.", "processos": 0}
        else:
            error_msg = f"Erro na API do Escavador: {response.status_code} - {response.text}"
            log_action("ComplianceAuditor", "legal_check_error", error_msg, "EscavadorAPI")
            return {"error": "Não foi possível completar a consulta jurídica no momento."}
    except Exception as e:
        log_action("ComplianceAuditor", "legal_check_exception", str(e), "System")
        return {"error": f"Exceção ao consultar Escavador: {str(e)}"}
