from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.firebase_config import get_firebase_status
from backend.routes import jobs, matching, recommendations, vagas, dashboard_api, agent_api
import os

app = FastAPI(title="Match API")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(matching.router, prefix="/api/match", tags=["Matching"])
app.include_router(recommendations.router, prefix="/api/recommend-courses", tags=["Recommendations"])
app.include_router(vagas.router, prefix="/api/vagas", tags=["Vagas Oportunidades"])
app.include_router(dashboard_api.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(agent_api.router, prefix="/api/agent", tags=["Agente Recrutador"])

@app.get("/")
async def root():
    return {"message": "Match AI/ML API is running"}

@app.get("/api/status")
async def status():
    """Retorna o status da conexão Firebase. Útil para diagnóstico."""
    fb = get_firebase_status()
    return {
        "api": "running",
        "firebase_connected": fb["connected"],
        "firebase_error": fb["error"],
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
