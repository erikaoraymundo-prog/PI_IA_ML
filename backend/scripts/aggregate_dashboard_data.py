import os
import ast
import json
import pandas as pd
from collections import Counter

# Set paths
DATA_DIR = r"c:\Users\Gustavo\Documents\GitHub\PI_IA_ML\backend\data"
SURVEY_PATH = os.path.join(DATA_DIR, "survey_results_public.csv")
RESUME_PATH = os.path.join(DATA_DIR, "resume_data.csv")
OUTPUT_PATH = os.path.join(DATA_DIR, "dashboard_data.json")

def main():
    print("1. Aggregating Economic Data from Survey Results...")
    if os.path.exists(SURVEY_PATH):
        try:
            # Read only required columns to save memory
            df_survey = pd.read_csv(SURVEY_PATH, usecols=['Country', 'ConvertedCompYearly', 'RemoteWork'], low_memory=False)
            
            # 1. Salaries Medians for BR and USA
            br_med = df_survey[df_survey['Country'] == 'Brazil']['ConvertedCompYearly'].dropna().median()
            usa_med = df_survey[df_survey['Country'] == 'United States of America']['ConvertedCompYearly'].dropna().median()
            
            br_med = float(br_med) if pd.notnull(br_med) else 27306.0
            usa_med = float(usa_med) if pd.notnull(usa_med) else 150000.0
            upside = int(round((usa_med - br_med) / br_med * 100))
            
            # Get top 20 countries by count of valid responses
            valid_survey = df_survey.dropna(subset=['ConvertedCompYearly', 'Country'])
            top_countries = valid_survey['Country'].value_counts().head(20).index.tolist()
            
            # Calculate median salaries for all of these top 20 countries
            salaries_list = []
            for country in top_countries:
                sub = valid_survey[valid_survey['Country'] == country]['ConvertedCompYearly']
                median_val = float(sub.median()) if len(sub) > 0 else 0.0
                if median_val > 0:
                    salaries_list.append({"Country": country, "Salario": int(median_val)})
            
            # 2. Remote Work
            postings_path = os.path.join(DATA_DIR, "postings.csv")
            remote_dist = []
            
            # Try to read from postings.csv first
            if os.path.exists(postings_path):
                print("1.1. Aggregating Remote Work Data from Postings...")
                try:
                    df_postings = pd.read_csv(postings_path, usecols=['remote_allowed'], low_memory=False)
                    remote_counts = df_postings['remote_allowed'].fillna(0.0).value_counts()
                    remoto_count = int(remote_counts.get(1.0, 0))
                    presencial_count = int(remote_counts.get(0.0, 0))
                    remote_dist = [
                        {"name": "Remoto", "value": remoto_count},
                        {"name": "Presencial", "value": presencial_count}
                    ]
                except Exception as ex:
                    print(f"Error processing postings.csv remote work counts: {ex}")
            
            # Fallback to survey if postings could not be processed
            if not remote_dist:
                print("1.2. Fallback: Aggregating Remote Work Data from Survey...")
                remote_work = df_survey['RemoteWork'].dropna()
                remoto_keywords = ['Remote', 'Your choice']
                remoto_count = 0
                presencial_count = 0
                
                for val in remote_work:
                    if any(keyword in val for keyword in remoto_keywords):
                        remoto_count += 1
                    else:
                        presencial_count += 1
                        
                remote_dist = [
                    {"name": "Remoto", "value": remoto_count},
                    {"name": "Presencial", "value": presencial_count}
                ]
            
            economic_data = {
                "median_br": int(br_med),
                "median_usa": int(usa_med),
                "upside": upside,
                "salaries_dist": salaries_list,
                "remote_dist": remote_dist
            }
        except Exception as e:
            print(f"Error processing survey data: {e}")
            economic_data = None
    else:
        print("survey_results_public.csv not found!")
        economic_data = None

    print("2. Aggregating Social Data (Skills) from Resume Data...")
    if os.path.exists(RESUME_PATH):
        try:
            df_resume = pd.read_csv(RESUME_PATH, usecols=['skills', 'locations', '\ufeffjob_position_name'], low_memory=False)
            df_resume.rename(columns={'\ufeffjob_position_name': 'job_position_name'}, inplace=True)
            
            # Aggregate skills
            skills_counter = Counter()
            for s in df_resume['skills'].dropna():
                try:
                    l = ast.literal_eval(s)
                    if isinstance(l, list):
                        skills_counter.update([x.strip() for x in l if x.strip()])
                except:
                    pass
            
            # Get top 15 skills
            top_skills = []
            for name, count in skills_counter.most_common(15):
                top_skills.append({"name": name, "count": count})
                
            # Extract sample of first 100 rows
            resume_sample = []
            df_sample = df_resume[['skills', 'locations', 'job_position_name']].head(100).fillna("")
            for idx, row in df_sample.iterrows():
                skills_str = row['skills']
                try:
                    skills_list = ast.literal_eval(skills_str)
                    if isinstance(skills_list, list):
                        skills_str = ", ".join(skills_list)
                except:
                    pass
                resume_sample.append({
                    "job_position_name": row['job_position_name'],
                    "locations": row['locations'],
                    "skills": skills_str
                })
                
            social_data = {
                "top_skills": top_skills,
                "resumes_sample": resume_sample
            }
        except Exception as e:
            print(f"Error processing resume data: {e}")
            social_data = None
    else:
        print("resume_data.csv not found!")
        social_data = None

    # Combine and save
    if economic_data and social_data:
        combined = {
            "economic": economic_data,
            "social": social_data
        }
        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(combined, f, indent=2, ensure_ascii=False)
        print(f"Successfully aggregated data saved to {OUTPUT_PATH}")
    else:
        print("Aggregation failed due to missing inputs.")

if __name__ == "__main__":
    main()
