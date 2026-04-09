import sys
import os
import logging

# Adiciona o diretório atual ao path para importar pacotes internos
sys.path.append(os.getcwd())

from backend.firebase_config import get_db
from backend.api_fetcher import _is_en_or_pt

# Configuração de logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

def main():
    print("="*50)
    print(" SCRIPT DE LIMPEZA DE VAGAS POR IDIOMA")
    print("="*50)

    print("\n1. Conectando ao Firebase Firestore...")
    db = get_db()
    if not db:
        print("[ERRO] Nao foi possivel conectar ao Firestore.")
        return
    print("[OK] Conectado!")

    collection_name = "vagas_oportunidades"
    print(f"\n2. Analisando documentos na coleção '{collection_name}'...")
    
    try:
        docs = db.collection(collection_name).stream()
    except Exception as e:
        print(f"[ERRO] Falha ao acessar a coleção: {e}")
        return

    kept = 0
    deleted = 0
    errors = 0

    # Usaremos batches para deletar se houver muitos, 
    # mas para clareza nos logs e segurança, faremos um a um com confirmação visual no log.
    for doc in docs:
        data = doc.to_dict()
        doc_id = doc.id
        titulo = data.get("titulo", "Sem Título")
        empresa = data.get("empresa_nome", "Empresa Desconhecida")
        descricao = data.get("descricao", "")

        if _is_en_or_pt(descricao):
            # print(f"   [MANTER]  {titulo} ({empresa})")
            kept += 1
        else:
            print(f"   [DELETAR] {titulo} ({empresa}) - Idioma no suportado.")
            try:
                db.collection(collection_name).document(doc_id).delete()
                deleted += 1
            except Exception as e:
                print(f"      [ERRO] Falha ao deletar {doc_id}: {e}")
                errors += 1

    print("\n" + "="*50)
    print(" RESUMO DA LIMPEZA")
    print("="*50)
    print(f"   • Vagas Mantidas (PT/EN) : {kept}")
    print(f"   • Vagas Deletadas (Outros): {deleted}")
    if errors > 0:
        print(f"   • Falhas na Exclusão     : {errors}")
    print("="*50)

if __name__ == "__main__":
    main()
