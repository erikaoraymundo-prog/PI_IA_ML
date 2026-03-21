import os
import firebase_admin
from firebase_admin import credentials, firestore, storage
from dotenv import load_dotenv

# Load environment variables from env/.env
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "env", ".env")
load_dotenv(env_path)

def initialize_firebase():
    """
    Initializes Firebase Admin SDK using a service account key or environment variables.
    Expects FIREBASE_SERVICE_ACCOUNT_KEY path or FIREBASE_CREDENTIALS json string.
    """
    if not firebase_admin._apps:
        # For local development or Vercel, look for a JSON file path or JSON string
        cred_var = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")
        
        if cred_var:
            if os.path.exists(cred_var):
                # It's a file path
                cred = credentials.Certificate(cred_var)
            else:
                # Try to parse it as a JSON string (for Vercel/Cloud env variables)
                try:
                    import json
                    cred_dict = json.loads(cred_var)
                    cred = credentials.Certificate(cred_dict)
                except:
                    print(f"Error: Could not parse FIREBASE_SERVICE_ACCOUNT_KEY as JSON or find it as a file.")
                    return None, None
        else:
            # Fallback for when no key is found
            print("Warning: FIREBASE_SERVICE_ACCOUNT_KEY not set. Trying fallback...")
            try:
                cred = credentials.ApplicationDefault()
            except:
                print("Error: Could not initialize Firebase credentials.")
                return None, None
        
        firebase_admin.initialize_app(cred, {
            'storageBucket': os.getenv("FIREBASE_STORAGE_BUCKET", "your-project-id.appspot.com")
        })
        
    db = firestore.client()
    bucket = storage.bucket()
    
    return db, bucket

db, bucket = initialize_firebase()
