from sklearn.metrics.pairwise import cosine_similarity
from .model import ResumeVectorizer
from .nlp_processor import clean_text

def calculate_match_score(resume_text, job_description_text):
    """
    Calculates the cosine similarity score between clear resume text 
    and clean job description text.
    """
    # Clean text
    clean_resume = clean_text(resume_text)
    clean_job = clean_text(job_description_text)
    
    # Vectorize
    vectorizer = ResumeVectorizer()
    tfidf_matrix = vectorizer.fit_transform([clean_resume, clean_job])
    
    # Calculate similarity
    similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])
    
    # Score in 0-100 range
    score = float(similarity[0][0]) * 100
    
    return round(score, 2)

if __name__ == "__main__":
    resume = "Experienced Software Engineer with proficiency in Python, FastAPI, and Machine Learning."
    job = "Looking for a Python developer with experience in AI and ML integrations."
    score = calculate_match_score(resume, job)
    print(f"Match Score: {score}")
