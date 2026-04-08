import sys
import os
import logging

# Configuração simples de log para vermos o que está acontecendo
logging.basicConfig(level=logging.INFO, format='%(message)s')

# Garante que o root do projeto (onde a pasta backend está) esteja no path
ROOT = os.path.dirname(os.path.abspath(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from backend.firebase_config import get_db
from backend.api_fetcher import fetch_all_api_jobs
from backend.scraper import persist_with_dedup

def main():
    print("="*50)
    print(" SCRIPT DE SINCRONIZAÇÃO DIRETA DE VAGAS")
    print("="*50)

    print("\n1. Conectando ao Firebase Firestore...")
    db = get_db()
    if not db:
        print("[ERRO] Nao foi possivel carregar as credenciais do Firestore. Verifique seu arquivo .env")
        return
    print("[OK] Firebase conectado com sucesso!")

    print("\n2. Puxando vagas das APIs Remotive e Arbeitnow...")
    try:
        vagas = fetch_all_api_jobs()
        print(f"\n[OK] {len(vagas)} vagas DEV encontradas e validadas!")
    except Exception as e:
        print(f"[ERRO] Falha ao buscar vagas: {e}")
        return

    if not vagas:
        print("Nenhuma vaga nova encontrada no momento.")
        return

    print("\n3. Salvando dados no Firestore (isso pode levar alguns segundos)...")
    try:
        resultado = persist_with_dedup(vagas, db)
        print("\n[SUCESSO] SINCRONIZACAO FINALIZADA!")
        print(f"   • Vagas Originais encontradas: {len(vagas)}")
        print(f"   • Salvas com Sucesso (Novas) : {resultado['salvo']}")
        print(f"   • Ignoradas (Ja existiam)    : {resultado['duplicatas']}")
        print(f"   • Falhas/Erros               : {resultado['erros']}")
    except Exception as e:
        print(f"[ERRO] Falha ao salvar no Firestore: {e}")

if __name__ == "__main__":
    main()
