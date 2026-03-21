from sklearn.feature_extraction.text import TfidfVectorizer

class ResumeVectorizer:
    """
    Fits and transforms text into TF-IDF vectors.
    """
    def __init__(self):
        self.vectorizer = TfidfVectorizer()

    def fit_transform(self, documents):
        """
        Fits vectorizer and transforms documents.
        """
        return self.vectorizer.fit_transform(documents)

    def transform(self, documents):
        """
        Transforms documents using a pre-fitted vectorizer.
        """
        return self.vectorizer.transform(documents)

if __name__ == "__main__":
    pass
