import sys
import os
import logging

# Adiciona o diretório atual ao path para importar backend
sys.path.append(os.getcwd())

# Configura o logger para ver as mensagens que adicionei em api_fetcher
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

from backend.api_fetcher import fetch_all_api_jobs

def main():
    print("Buscando vagas e verificando filtragem de idioma...")
    vagas = fetch_all_api_jobs()
    print(f"\nTotal de vagas mantidas: {len(vagas)}")
    
    if vagas:
        print("\nExemplos de vagas mantidas:")
        for v in vagas[:3]:
            print(f"- {v.titulo} ({v.empresa_nome})")
    else:
        print("\nNenhuma vaga restou após os filtros.")

if __name__ == "__main__":
    main()
