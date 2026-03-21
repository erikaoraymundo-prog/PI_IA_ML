from ia_ml_engine.matcher import calculate_match_score

def test_matching():
    # Test case 1: High match
    resume_1 = "Senior Python Developer with 5 years of experience in FastAPI, PostgreSQL, and AWS."
    job_1 = "We are looking for a Senior Python Developer experienced with FastAPI and cloud technologies like AWS."
    score_1 = calculate_match_score(resume_1, job_1)
    print(f"Test 1 (High Match): {score_1}%")
    
    # Test case 2: Low match
    resume_2 = "Graphic designer specializing in Adobe Creative Suite and brand identity."
    job_2 = "Backend engineer with strong skills in C++ and embedded systems."
    score_2 = calculate_match_score(resume_2, job_2)
    print(f"Test 2 (Low Match): {score_2}%")

    # Test case 3: Medium match (overlap in skills)
    resume_3 = "Data Analyst with SQL and Python skills. Experience with data visualization."
    job_3 = "Python Developer with knowledge of SQL and database optimization."
    score_3 = calculate_match_score(resume_3, job_3)
    print(f"Test 3 (Medium Match): {score_3}%")

if __name__ == "__main__":
    test_matching()
