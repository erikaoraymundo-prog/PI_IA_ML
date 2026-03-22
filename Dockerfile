# Usa uma imagem oficial do Python
FROM python:3.10

# Cria um usuário não-root (Exigência do Hugging Face Spaces para segurança)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Define o diretório de trabalho no container
WORKDIR $HOME/app

# Copia o requirements.txt primeiro para aproveitar o cache do Docker
COPY --chown=user requirements.txt $HOME/app/
# Instala as dependências (ajustado para ser leve)
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copia todo o código restante para dentro do container
COPY --chown=user . $HOME/app

# Baixa os modelos e pacotes do NLTK previamente (para acelerar o boot)
RUN python -m nltk.downloader punkt stopwords wordnet punkt_tab

# Expõe a porta que o Hugging Face Spaces exige
EXPOSE 7860

# Comando para iniciar o servidor (note a porta 7860 exigida pelo HF Spaces)
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
