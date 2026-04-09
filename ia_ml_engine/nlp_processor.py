import re
import unicodedata
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize

# ---------------------------------------------------------------------------
# Tech keywords: mapeamento de termos especiais + boost de peso
# ---------------------------------------------------------------------------
TECH_MAP = {
    'c#': 'csharp',
    'c++': 'cpp',
    '.net': 'dotnet',
    'node.js': 'nodejs',
    'react.js': 'reactjs',
    'vue.js': 'vuejs',
    'next.js': 'nextjs',
    'asp.net': 'aspnet',
}

TECH_KEYWORDS = {
    'css', 'html', 'javascript', 'typescript', 'csharp', 'cpp', 'dotnet',
    'sql', 'python', 'java', 'reactjs', 'reactnative', 'nodejs', 'vuejs',
    'nextjs', 'aspnet', 'flutter', 'dart', 'spark', 'airflow', 'terraform',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'kafka', 'rabbitmq',
    'oracle', 'mongodb', 'postgresql', 'redis', 'linux', 'git', 'api',
    'rest', 'graphql', 'fastapi', 'django', 'spring', 'angular', 'android',
    'ios', 'swift', 'kotlin', 'golang', 'rust', 'scala', 'hadoop',
    'machine', 'learning', 'backend', 'frontend', 'fullstack', 'devops',
    'cloud', 'microservices', 'agile', 'scrum',
}

# ---------------------------------------------------------------------------
# NLTK setup (idempotente)
# ---------------------------------------------------------------------------
def _ensure_nltk():
    resources = [
        ('corpora/stopwords', 'stopwords'),
        ('tokenizers/punkt_tab', 'punkt_tab'),
        ('tokenizers/punkt', 'punkt'),
    ]
    for path, pkg in resources:
        try:
            nltk.data.find(path)
        except LookupError:
            nltk.download(pkg, quiet=True)

_ensure_nltk()

STOP_WORDS = set(stopwords.words('english')) | set(stopwords.words('portuguese'))

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _normalize(text: str) -> str:
    """Remove acentos normalizando para NFD e descartando combining chars."""
    return unicodedata.normalize('NFD', text).encode('ascii', 'ignore').decode('ascii')


def clean_text(text: str) -> str:
    """
    Pipeline de limpeza de texto para PT-BR e EN:
    1. Normaliza encoding (remove acentos de forma limpa).
    2. Mapeia termos técnicos especiais (C#, C++, Node.js …).
    3. Tokeniza e filtra stopwords.
    4. Duplica termos técnicos para dar peso 2x no TF-IDF.
    """
    if not text:
        return ""

    # 1. Lowercase + normalização de acentos
    text = text.lower()
    for original, replacement in TECH_MAP.items():
        text = text.replace(original, replacement)
    text = _normalize(text)

    # 2. Tokenização simples (mantém apenas alfanuméricos)
    tokens = re.findall(r'[a-z0-9]+', text)

    # 3. Remove stopwords e tokens muito curtos (<=1 char)
    tokens = [t for t in tokens if len(t) > 1 and t not in STOP_WORDS]

    # 4. Boost: duplica techs + tokens longos (>=5) que provavelmente são substantivos
    final_tokens = []
    for t in tokens:
        final_tokens.append(t)
        if t in TECH_KEYWORDS or len(t) >= 5:
            final_tokens.append(t)  # peso dobrado

    return " ".join(final_tokens)


if __name__ == "__main__":
    test_text = "Conhecimento intermediário em C#, C++, Node.js, CSS e Machine Learning."
    print(clean_text(test_text))

# apos a normalização, navegaremos ate ao arquivo model.py para a vetorização