from sklearn.feature_extraction.text import TfidfVectorizer

class ResumeVectorizer:
    """
    Encaixa e transforma texto em vetores TF-IDF.
    """
    def __init__(self):
        self.vectorizer = TfidfVectorizer()

    def fit_transform(self, documents):
        """
        Encaixa o vetorizador e transforma os documentos.
        """
        return self.vectorizer.fit_transform(documents)

    def transform(self, documents):
        """
        Transforma documentos usando um vetorizador pré-encaixado.
        """
        return self.vectorizer.transform(documents)

if __name__ == "__main__":
    pass

# vetorização completa, seguiremos ao arquivo matcher.py para o cálculo de similaridade