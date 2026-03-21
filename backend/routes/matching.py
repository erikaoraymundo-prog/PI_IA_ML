from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.firebase_config import db, bucket
from ia_ml_engine.parser import extract_text
from ia_ml_engine.matcher import calculate_match_score
import os
import uuid

router = APIRouter()

@router.post("/")
async def match_resume(file: UploadFile = File(...)):
    """
    1. Upload resume to Firebase Storage.
    2. Extract text.
    3. Match with jobs in Firestore.
    4. Save results and return scores.
    """
    try:
        # 1. Save locally temporarily (using /tmp/ for Vercel compatibility)
        temp_filename = f"tmp_{uuid.uuid4()}_{file.filename}"
        temp_path = os.path.join("/tmp", temp_filename)
        with open(temp_path, "wb") as buffer:
            buffer.write(await file.read())
        
        # 2. Upload to Firebase Storage
        blob = bucket.blob(f"resumes/{temp_path}")
        blob.upload_from_filename(temp_path)
        resume_url = blob.public_url
        
        # 3. Extract Text
        content = extract_text(temp_path)
        
        # 4. Perform Matching
        jobs_ref = db.collection('jobs')
        jobs = jobs_ref.stream()
        
        results = []
        for doc in jobs:
            job_data = doc.to_dict()
            job_text = f"{job_data.get('title', '')} {job_data.get('description', '')} {job_data.get('requirements', '')}"
            
            score = calculate_match_score(content, job_text)
            
            match_data = {
                'job_id': doc.id,
                'job_title': job_data.get('title'),
                'score': score
            }
            results.append(match_data)
        
        # 5. Cleanup temp file
        os.remove(temp_path)
        
        # Sort results by score
        results = sorted(results, key=lambda x: x['score'], reverse=True)
        
        return {
            "resume_url": resume_url,
            "matches": results
        }
        
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))
