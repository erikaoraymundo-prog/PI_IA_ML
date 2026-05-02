from typing import TypedDict, Annotated, List, Union
from langgraph.graph import StateGraph, END
from backend.agente_recruter.agents.tech_validator import create_tech_validator_agent
from backend.agente_recruter.agents.compliance_auditor import create_compliance_auditor_agent
from backend.agente_recruter.agents.report_synthesizer import generate_executive_report

class AgentState(TypedDict):
    candidate_name: str
    cpf: str
    github_user: str
    consent_signed: bool
    tech_results: str
    compliance_results: str
    final_report: str
    errors: List[str]

def validate_consent_node(state: AgentState):
    print("--- VALIDANDO CONSENTIMENTO ---")
    if state.get("consent_signed"):
        return {"errors": []}
    else:
        return {"errors": ["Consentimento não encontrado. Fluxo interrompido."]}

def tech_validation_node(state: AgentState):
    print("--- EXECUTANDO VALIDAÇÃO TÉCNICA ---")
    agent = create_tech_validator_agent()
    result = agent.invoke({"input": f"Valide o candidato {state['candidate_name']} (GitHub: {state['github_user']})"})
    return {"tech_results": result["output"]}

def compliance_audit_node(state: AgentState):
    print("--- EXECUTANDO AUDITORIA DE COMPLIANCE ---")
    agent = create_compliance_auditor_agent()
    result = agent.invoke({"input": f"Verifique o compliance para o CPF {state['cpf']}"})
    return {"compliance_results": result["output"]}

def synthesis_node(state: AgentState):
    print("--- GERANDO RELATÓRIO FINAL ---")
    report = generate_executive_report(state["tech_results"], state["compliance_results"])
    return {"final_report": report}

def should_continue(state: AgentState):
    if state["errors"]:
        return "end"
    return "continue"

workflow = StateGraph(AgentState)

workflow.add_node("validate_consent", validate_consent_node)
workflow.add_node("tech_validation", tech_validation_node)
workflow.add_node("compliance_audit", compliance_audit_node)
workflow.add_node("synthesize_report", synthesis_node)

workflow.set_entry_point("validate_consent")

workflow.add_conditional_edges(
    "validate_consent",
    should_continue,
    {
        "continue": "tech_validation",
        "end": END
    }
)

workflow.add_edge("tech_validation", "compliance_audit")
workflow.add_edge("compliance_audit", "synthesize_report")
workflow.add_edge("synthesize_report", END)

app = workflow.compile()
