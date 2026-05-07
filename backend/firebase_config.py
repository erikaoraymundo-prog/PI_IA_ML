import os
import json
import firebase_admin
from firebase_admin import credentials, firestore, storage
from dotenv import load_dotenv

# Load environment variables from env/.env
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "env", ".env")
load_dotenv(env_path)

# -----------------------------------------------------------------------
# Inicialização do Firebase (lazy, com suporte a reinicialização)
# -----------------------------------------------------------------------
_db = None
_bucket = None
_firebase_error = None


def _get_cred():
    cred_var = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")
    if not cred_var:
        raise RuntimeError("FIREBASE_SERVICE_ACCOUNT_KEY não definido no .env")

    if os.path.exists(cred_var):
        return credentials.Certificate(cred_var)

    # Tenta interpretar como JSON string (Vercel / CI)
    try:
        cred_dict = json.loads(cred_var)
        return credentials.Certificate(cred_dict)
    except Exception as e:
        raise RuntimeError(f"Não foi possível parsear FIREBASE_SERVICE_ACCOUNT_KEY: {e}")


def _initialize():
    global _db, _bucket, _firebase_error
    try:
        if not firebase_admin._apps:
            cred = _get_cred()
            firebase_admin.initialize_app(cred, {
                "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET", "your-project-id.appspot.com")
            })
        _db = firestore.client()
        _bucket = storage.bucket()
        _firebase_error = None
        print("[Firebase] Conexão inicializada com sucesso.")
    except Exception as e:
        _firebase_error = str(e)
        print(f"[Firebase] ERRO na inicialização: {e}")
        _db = None
        _bucket = None


def get_db():
    """Retorna o cliente Firestore, tentando reinicializar se necessário."""
    global _db
    if _db is None:
        _initialize()
    return _db


def get_bucket():
    """Retorna o bucket do Storage, tentando reinicializar se necessário."""
    global _bucket
    if _bucket is None:
        _initialize()
    return _bucket


def get_firebase_status():
    return {
        "connected": _db is not None,
        "error": _firebase_error
    }



# Aliases para compatibilidade com código legado
db = _db
bucket = _bucket

# Próximo passo: Refinamento de UX, Integração de APIs e Testes de Produção
