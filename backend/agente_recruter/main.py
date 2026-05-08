import os
import json
from datetime import datetime
from dotenv import load_dotenv
from backend.agente_recruter.workflows.main_workflow import app

load_dotenv()

def log_audit(candidate_name, action, status, details=None):
    """Registra ação de alto nível no log de auditoria conforme LGPD"""
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "candidate_name": candidate_name,
        "action": action,
        "status": status,
        "details": details or {},
        "system": "AGENTE-RECRUTER"
    }
    
    log_file = "audit_log.jsonl"
    with open(log_file, "a", encoding='utf-8') as f:
        f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")

def run_background_check(candidate_data):
    """
    Executa o fluxo completo do AGENTE-RECRUITER para um candidato.
    Retorna o estado final para o Dashboard.
    """
    print(f"[AGENTE-RECRUITER] Iniciando verificação para: {candidate_data['candidate_name']}")
    
    # Log de início de processo
    log_audit(
        candidate_data['candidate_name'],
        "verification_started",
        "processing",
        {"cpf": candidate_data.get('cpf', '000')[:3] + "***"}
    )
    
    try:
        # Gera uma thread_id única para cada execução
        config = {"configurable": {"thread_id": datetime.now().strftime("%Y%m%d%H%M%S")}}
        final_state = app.invoke(candidate_data, config)
        
        if final_state.get("errors"):
            print(f"[AGENTE-RECRUITER] ERRO NO FLUXO: {final_state['errors']}")
            log_audit(
                candidate_data['candidate_name'],
                "verification_failed",
                "error",
                {"errors": final_state['errors']}
            )
        else:
            print("[AGENTE-RECRUITER] Relatório gerado com sucesso.")
            
            # Salva o relatório com timestamp para evitar conflitos
            safe_name = candidate_data['candidate_name'].replace(' ', '_').replace('/', '_')
            ts = datetime.now().strftime('%Y%m%d_%H%M%S')
            report_filename = f"report_{safe_name}_{ts}.md"
            
            with open(report_filename, "w", encoding='utf-8') as f:
                f.write(final_state["final_report"])
            
            log_audit(
                candidate_data['candidate_name'],
                "verification_completed",
                "success",
                {"report_file": report_filename}
            )
        
        return final_state
        
    except Exception as e:
        error_msg = str(e)
        print(f"[AGENTE-RECRUITER] Exceção crítica: {error_msg}")
        log_audit(
            candidate_data['candidate_name'],
            "verification_exception",
            "error",
            {"exception": error_msg}
        )
        return {"errors": [error_msg], **candidate_data}

def get_system_stats():
    """Retorna estatísticas simplificadas das operações"""
    stats = {"total_checks": 0, "reports_count": 0}
    if os.path.exists("audit_log.jsonl"):
        with open("audit_log.jsonl", "r", encoding='utf-8') as f:
            for line in f:
                try:
                    log = json.loads(line)
                    if log.get("action") == "verification_completed":
                        stats["total_checks"] += 1
                except: continue
    stats["reports_count"] = len([f for f in os.listdir(".") if f.startswith("report_") and f.endswith(".md")])
    return stats

if __name__ == "__main__":
    print("=" * 60)
    print("🛡️ AGENTE-RECRUITER - Modo CLI Console")
    print("=" * 60)
    
    nome = input("Candidato: ") or "João Silva"
    cpf_input = input("CPF: ") or "12345678900"
    
    candidate_test = {
        "candidate_name": nome,
        "cpf": cpf_input,
        "github_user": input("GitHub: ") or None,
        "consent_signed": True,
        "tech_results": "",
        "compliance_results": "",
        "final_report": "",
        "errors": []
    }
    
    run_background_check(candidate_test)
