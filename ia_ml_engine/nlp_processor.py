import re
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize

# Baixa os modelos necessários do NLTK
def download_nltk_data():
    try:
        nltk.data.find('corpora/stopwords')
        nltk.data.find('tokenizers/punkt')
        nltk.data.find('tokenizers/punkt_tab')
        nltk.data.find('corpora/wordnet')
        nltk.data.find('taggers/averaged_perceptron_tagger_eng')
    except LookupError:
        nltk.download('stopwords')
        nltk.download('punkt')
        nltk.download('punkt_tab')
        nltk.download('wordnet')
        nltk.download('averaged_perceptron_tagger')
        nltk.download('averaged_perceptron_tagger_eng')

download_nltk_data()

def clean_text(text):
    """
    Limpa o texto utilizando NLTK.
    Preserva linguagens e frameworks que contêm caracteres especiais (C#, C++, .NET)
    mapeando-os para texto antes da tokenização.
    """
    if not text:
        return ""
    
    text = text.lower().replace('\n', ' ').replace('\r', '')
    
    # Mapeamento de termos sensíveis ao tokenizador
    text = text.replace('c#', 'csharp')
    text = text.replace('c++', 'cpp')
    text = text.replace('.net', 'dotnet')
    text = text.replace('node.js', 'nodejs')
    text = text.replace('react.js', 'reactjs')
    text = text.replace('vue.js', 'vuejs')
    
    tokens = word_tokenize(text)
    
    stop_words = set(stopwords.words('english')) | set(stopwords.words('portuguese'))
    # Permitir apenas palavras alfanuméricas
    tokens = [t for t in tokens if t.isalnum() and t not in stop_words]
    
    tagged_tokens = nltk.pos_tag(tokens)
    
    lemmatizer = WordNetLemmatizer()
    final_tokens = []
    
    # Palavras-chave que não devem ser lematizadas para não serem destruídas (ex: css -> cs)
    tech_keywords = {'css', 'html', 'javascript', 'csharp', 'cpp', 'dotnet', 'sql', 'python', 'java', 'react', 'nodejs'}
    
    for word, tag in tagged_tokens:
        if word in tech_keywords:
            lemma = word
        else:
            lemma = lemmatizer.lemmatize(word)
        final_tokens.append(lemma)
        
        # Duplica termos técnicos para dar 2x peso no TF-IDF
        if tag.startswith('NN') or word in tech_keywords:
            final_tokens.append(lemma)
            
    return " ".join(final_tokens)

if __name__ == "__main__":
    test_text = "Conhecimento intermediário em C#, C++, Node.js, CSS e Machine Learning."
    print(clean_text(test_text))
