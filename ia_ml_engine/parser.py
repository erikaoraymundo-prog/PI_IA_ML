import fitz  # PyMuPDF
import docx
import os

def extract_text_from_pdf(caminho_pdf):
    """
    Extrai o texto de um arquivo PDF usando PyMuPDF.
    """
    try:
        documento = fitz.open(caminho_pdf)
        texto = ""
        for pagina in documento:
            texto += pagina.get_text()
        return texto
    except Exception as erro:
        print(f"Erro ao extrair PDF: {erro}")
        return ""

def extract_text_from_docx(caminho_docx):
    """
    Extrai o texto de um arquivo DOCX usando python-docx.
    """
    try:
        documento = docx.Document(caminho_docx)
        texto = "\n".join([paragrafo.text for paragrafo in documento.paragraphs])
        return texto
    except Exception as erro:
        print(f"Erro ao extrair DOCX: {erro}")
        return ""

def extract_text(caminho_arquivo):
    """
    Identifica o tipo do arquivo e extrai o texto.
    """
    _, extensao = os.path.splitext(caminho_arquivo)
    extensao = extensao.lower()
    
    if extensao == ".pdf":
        return extract_text_from_pdf(caminho_arquivo)
    elif extensao == ".docx":
        return extract_text_from_docx(caminho_arquivo)
    else:
        # Por simplicidade, trata outros formatos como texto puro ou não suportados
        try:
            with open(caminho_arquivo, "r", encoding="utf-8") as arquivo:
                return arquivo.read()
        except:
            return ""

if __name__ == "__main__":
    # Script de teste
    pass

# aposo parse, navegamremos ate ao arquivo 