from fastapi import APIRouter, HTTPException, Body
from backend.firebase_config import db
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class Job(BaseModel):
    title: str
    description: str
    requirements: Optional[str] = ""

@router.get("/", response_model=List[dict])
async def get_jobs():
    """
    List all active jobs from Firestore.
    """
    jobs_ref = db.collection('jobs')
    docs = jobs_ref.stream()
    jobs = []
    for doc in docs:
        job_data = doc.to_dict()
        job_data['id'] = doc.id
        jobs.append(job_data)
    return jobs

@router.post("/")
async def create_job(job: Job):
    """
    Create a new job posting in Firestore.
    """
    try:
        new_job_ref = db.collection('jobs').document()
        new_job_ref.set({
            'title': job.title,
            'description': job.description,
            'requirements': job.requirements
        })
        return {"id": new_job_ref.id, "message": "Job created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
