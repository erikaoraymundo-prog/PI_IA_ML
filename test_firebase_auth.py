import sys
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from backend.firebase_config import get_db

def test_connection():
    print("Testando Firebase...")
    db = get_db()
    if not db:
        print("Erro ao carregar banco de dados localmente.")
        return
        
    try:
        # Testa leitura básica para forçar a autenticação
        print("Testando autenticação (leitura)...")
        docs = db.collection("test_auth").limit(1).stream()
        for d in docs:
            pass
        print("✅ Leitura bem-sucedida! Autenticação está funcionando.")
    except Exception as e:
        print(f"❌ Erro de Autenticação na leitura: {type(e).__name__} - {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_connection()
