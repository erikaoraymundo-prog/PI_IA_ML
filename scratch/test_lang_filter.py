import sys
import os

# Adiciona o diretório atual ao path para importar backend
sys.path.append(os.getcwd())

from backend.api_fetcher import _is_en_or_pt

def test():
    cases = [
        ("Software Engineer with experience in Python and React", True, "English"),
        ("Desenvolvedor de Software com experiência em Python e React", True, "Portuguese"),
        ("Software Entwickler mit Erfahrung in Python und React", False, "German"),
        ("Python, React, Node.js", True, "Just keywords (should ideally pass if it has some EN/PT markers, but might fail if too short)"),
        ("Wir suchen einen erfahrenen Fullstack-Entwickler für unser Team in Berlin.", False, "German Full Sentence"),
        ("Vaga para desenvolvedor frontend remoto.", True, "Short Portuguese"),
    ]

    for text, expected, label in cases:
        result = _is_en_or_pt(text)
        print(f"[{'PASS' if result == expected else 'FAIL'}] {label:40} | Got: {result} | Expected: {expected}")

if __name__ == "__main__":
    test()
