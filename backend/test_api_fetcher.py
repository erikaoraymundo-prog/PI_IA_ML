"""
test_api_fetcher.py
-------------------
Script de teste rápido para validar a coleta das APIs sem precisar do Firestore.
Execute de dentro da raiz do projeto:

    python backend/test_api_fetcher.py

Ele vai:
  1. Chamar fetch_remotive()  e mostrar 3 amostras
  2. Chamar fetch_arbeitnow() e mostrar 3 amostras
  3. Chamar fetch_all_api_jobs() e mostrar o total
"""

import sys
import os

# Garante que o root do projeto está no path
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from backend.api_fetcher import fetch_remotive, fetch_arbeitnow, fetch_all_api_jobs


def _print_sample(label: str, jobs: list, n: int = 3):
    print(f"\n{'='*60}")
    print(f"  {label}  ({len(jobs)} vagas brutas)")
    print("="*60)
    for job in jobs[:n]:
        print(f"  • [{job.get('_source', '?')}] {job.get('titulo', job.get('title', '?'))}")
        print(f"    Empresa: {job.get('empresa', '?')}")
        print(f"    URL:     {job.get('url', '?')[:80]}")
        print()


def _print_vaga_sample(label: str, vagas, n: int = 3):
    print(f"\n{'='*60}")
    print(f"  {label}  ({len(vagas)} vagas validadas)")
    print("="*60)
    for v in vagas[:n]:
        print(f"  • {v.titulo}")
        print(f"    Empresa:    {v.empresa_nome}")
        print(f"    Local:      {v.localizacao}")
        print(f"    Requisitos: {', '.join(v.requisitos_tecnicos[:5])}")
        print(f"    URL:        {(v.url_origem or '')[:80]}")
        print()


if __name__ == "__main__":
    print("\n[TESTE] Testando Remotive API...")
    remotive_raw = fetch_remotive(limit_per_category=5)
    _print_sample("Remotive -- bruto", remotive_raw)

    print("\n[TESTE] Testando Arbeitnow API...")
    arbeitnow_raw = fetch_arbeitnow(pages=1)
    _print_sample("Arbeitnow -- bruto", arbeitnow_raw)

    print("\n[TESTE] Testando fetch_all_api_jobs() (unificado + validado)...")
    vagas = fetch_all_api_jobs()
    _print_vaga_sample("Resultado final -- VagaOportunidade", vagas)

    print(f"\n[OK] Total de vagas prontas para o Firestore: {len(vagas)}\n")
