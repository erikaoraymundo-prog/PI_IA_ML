from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from ia_ml_engine.course_recommender import recommend_courses

router = APIRouter()

class CourseRecommendationRequest(BaseModel):
    missing_skills: List[str]
    udemy_courses: Optional[List[dict]] = None
    job_title: str = ""

@router.post("/")
async def get_course_recommendations(req: CourseRecommendationRequest):
    """
    Recebe as habilidades faltantes e retorna cursos recomendados para preencher esse gap,
    podendo usar uma resposta pré-carregada da Udemy API ou buscando internamente.
    """
    if not req.missing_skills:
        return []

    try:
        results = recommend_courses(
            missing_skills=req.missing_skills,
            udemy_courses_json=req.udemy_courses,
            job_title=req.job_title
        )
        return results
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
