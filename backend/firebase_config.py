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
_initialized = False


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
    global _db, _bucket, _firebase_error, _initialized
    if _initialized:
        return
    _initialized = True
    try:
        if not firebase_admin._apps:
            cred = _get_cred()
            firebase_admin.initialize_app(cred, {
                "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET", "your-project-id.appspot.com")
            })
        temp_db = firestore.client()
        temp_bucket = storage.bucket()
        
        # Testar a validade da conexão e das credenciais de forma rápida (timeout 2.0s)
        import concurrent.futures
        def test_conn():
            list(temp_db.collection('users').limit(1).stream())
            return True
            
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
        try:
            future = executor.submit(test_conn)
            future.result(timeout=2.0)
            _db = temp_db
            _bucket = temp_bucket
            _firebase_error = None
            print("[Firebase] Conexão inicializada e validada com sucesso.")
        except Exception as e:
            _firebase_error = f"Falha na validação de conexão/credenciais: {repr(e)}"
            print(f"[Firebase] ERRO ao validar credenciais: {repr(e)}. Operando em modo de simulação local.")
            _db = None
            _bucket = None
            try:
                executor.shutdown(wait=False)
            except Exception:
                pass
    except Exception as e:
        _firebase_error = f"Erro inicializacao: {repr(e)}"
        print(f"[Firebase] ERRO na inicialização: {repr(e)}")
        _db = None
        _bucket = None


def get_db():
    """Retorna o cliente Firestore."""
    global _db, _initialized
    if not _initialized:
        _initialize()
    return _db


def get_bucket():
    """Retorna o bucket do Storage."""
    global _bucket, _initialized
    if not _initialized:
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
