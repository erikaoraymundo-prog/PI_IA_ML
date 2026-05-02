from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from backend.agente_recruter.main import run_background_check

router = APIRouter()

class CandidateRequest(BaseModel):
    candidate_name: str
    cpf: str
    github_user: Optional[str] = None
    consent_signed: bool

@router.post("/check")
def check_candidate(candidate: CandidateRequest):
    if not candidate.consent_signed:
        raise HTTPException(status_code=400, detail="Consentimento obrigatório.")
        
    candidate_data = {
        "candidate_name": candidate.candidate_name,
        "cpf": candidate.cpf,
        "github_user": candidate.github_user,
        "consent_signed": candidate.consent_signed,
        "tech_results": "",
        "compliance_results": "",
        "final_report": "",
        "errors": []
    }
    
    result = run_background_check(candidate_data)
    
    if result.get("errors"):
        return {"success": False, "errors": result["errors"]}
        
    return {
        "success": True, 
        "report": result.get("final_report", ""),
        "tech_results": result.get("tech_results", ""),
        "compliance_results": result.get("compliance_results", "")
    }

@router.get("/status")
def agent_status():
    from backend.agente_recruter.main import get_system_stats
    return {"status": "online", "stats": get_system_stats()}
