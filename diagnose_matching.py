"""
Script de diagnóstico completo do pipeline de matching.
Execute: python diagnose_matching.py <path_do_curriculo.pdf>
Se não passar arquivo, usa texto simulado.
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

print("=" * 60)
print("DIAGNÓSTICO DO PIPELINE DE MATCHING")
print("=" * 60)

# --- 1. Firebase ---
print("\n[1/5] Testando conexão com Firebase...")
try:
    from backend.firebase_config import db, bucket
    jobs_ref = db.collection('jobs')
    docs = list(jobs_ref.stream())
    print(f"  ✓ Firebase OK — {len(docs)} vagas encontradas no Firestore")
    if len(docs) == 0:
        print("  ⚠ PROBLEMA: Nenhuma vaga no banco! Execute seed_jobs.py primeiro.")
    else:
        for doc in docs[:3]:
            d = doc.to_dict()
            print(f"    - {d.get('title', 'SEM TÍTULO')}")
except Exception as e:
    print(f"  ✗ ERRO Firebase: {e}")
    sys.exit(1)

# --- 2. Extração de texto ---
print("\n[2/5] Testando extração de texto...")
if len(sys.argv) > 1:
    file_path = sys.argv[1]
    try:
        from ia_ml_engine.parser import extract_text
        content = extract_text(file_path)
        print(f"  ✓ Texto extraído: {len(content)} caracteres")
        print(f"  Preview: {content[:300].replace(chr(10), ' ')!r}")
        if len(content.strip()) == 0:
            print("  ✗ PROBLEMA: Texto extraído está VAZIO!")
    except Exception as e:
        print(f"  ✗ ERRO na extração: {e}")
else:
    content = "Conhecimento em C#, SQL, Oracle, JavaScript, CSS, HTML e C++. Experiência com desenvolvimento web e banco de dados."
    print(f"  ⚠ Nenhum arquivo passado — usando texto simulado.")
    print(f"  Texto: {content!r}")

# --- 3. Limpeza de texto ---
print("\n[3/5] Testando NLP (clean_text)...")
try:
    from ia_ml_engine.nlp_processor import clean_text
    cleaned = clean_text(content)
    print(f"  ✓ Texto limpo ({len(cleaned.split())} tokens):")
    print(f"  {cleaned[:300]}")
    if len(cleaned.strip()) == 0:
        print("  ✗ PROBLEMA: clean_text retornou vazio!")
except Exception as e:
    print(f"  ✗ ERRO no NLP: {e}")

# --- 4. Matching ---
print("\n[4/5] Testando matching bulk...")
try:
    from ia_ml_engine.matcher import calculate_match_scores_bulk

    jobs = []
    for doc in docs:
        j = doc.to_dict()
        j['job_id'] = doc.id
        j['source'] = 'Interna'
        j['url'] = ''
        jobs.append(j)

    results = calculate_match_scores_bulk(content, jobs)
    print(f"  ✓ Scores calculados para {len(results)} vagas:")
    for r in sorted(results, key=lambda x: x['score'], reverse=True):
        flag = "✓ MATCH" if r['score'] >= 8 else "✗ abaixo do threshold"
        print(f"    [{flag}] {r.get('title', '?')}: {r['score']}%")
except Exception as e:
    print(f"  ✗ ERRO no matching: {e}")
    import traceback; traceback.print_exc()

# --- 5. Filtro de threshold ---
print("\n[5/5] Resultado após filtro (threshold = 8%)...")
try:
    above = [r for r in results if r['score'] >= 8]
    print(f"  Vagas acima do threshold: {len(above)}")
    if len(above) == 0:
        print("  ⚠ PROBLEMA: Todos os scores ficaram abaixo de 8%. Threshold muito alto ou texto insuficiente.")
    else:
        for r in above:
            print(f"    ✓ {r.get('title', '?')}: {r['score']}%")
except Exception as e:
    print(f"  ✗ ERRO: {e}")

print("\n" + "=" * 60)
print("DIAGNÓSTICO CONCLUÍDO")
print("=" * 60)
