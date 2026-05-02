import json
import os
from datetime import datetime

LOG_FILE = "audit_log.jsonl"

def log_action(agent_name, action, details, source="API"):
    """
    Registra uma ação realizada por um agente para fins de auditoria.
    """
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "agent": agent_name,
        "action": action,
        "source": source,
        "details": details
    }
    
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")

def mask_sensitive_data(data):
    """
    Masca dados sensíveis para conformidade LGPD no relatório final.
    Ex: CPF 123.456.789-00 -> 123.***.***-00
    """
    if isinstance(data, str):
        if len(data) == 11 and data.isdigit(): # CPF simples
            return f"{data[:3]}.***.***-{data[-2:]}"
        # Mais regras de mascaramento podem ser adicionadas aqui
    return data
