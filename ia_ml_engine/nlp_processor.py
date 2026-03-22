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
    Remove stopwords, pontuações e extrai os lemas.
    Dá peso extra (duplicação) para substantivos (NOUN), adjetivos e termos técnicos encontrados.
    Isso substitui o spaCy em ambientes Python 3.14 onde o pydantic quebra.
    """
    if not text:
        return ""
    
    # Limpeza inicial e tokenização
    text = text.lower().replace('\n', ' ').replace('\r', '')
    tokens = word_tokenize(text)
    
    # Remoção de Stopwords e pontuação
    stop_words = set(stopwords.words('english')) | set(stopwords.words('portuguese'))
    tokens = [t for t in tokens if t.isalpha() and t not in stop_words]
    
    # POS Tagging para identificar substantivos
    tagged_tokens = nltk.pos_tag(tokens)
    
    # Lematização e Estratégia de Pesos
    lemmatizer = WordNetLemmatizer()
    final_tokens = []
    
    for word, tag in tagged_tokens:
        lemma = lemmatizer.lemmatize(word)
        final_tokens.append(lemma)
        
        # Substantivos (NN, NNP, NNS, NNPS) ganham pesso 2 para o TF-IDF
        if tag.startswith('NN'):
            final_tokens.append(lemma)
            
    return " ".join(final_tokens)

if __name__ == "__main__":
    test_text = "Experienced software engineer with knowledge in Python, React, and Machine Learning. Trabalhou no Google."
    print(clean_text(test_text))
