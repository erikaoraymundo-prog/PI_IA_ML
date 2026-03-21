# Sistema de Match de Currculo (AI/ML)

Este sistema utiliza Processamento de Linguagem Natural (NLP) e Machine Learning para conectar candidatos s melhores vagas de emprego com base em afinidade tcnica.

## Tecnologias
- **Backend:** FastAPI (Python)
- **Frontend:** React (Vite)
- **IA/ML:** Scikit-learn (TF-IDF + Cosine Similarity), NLTK (NLP)
- **Infraestrutura:** Firebase (Firestore & Cloud Storage)

## Configurao do Firebase
Para que o sistema funcione, voc precisa:
1. Criar um projeto no [Firebase Console](https://console.firebase.google.com/).
2. Ativar o **Firestore Database** e o **Cloud Storage**.
3. Gerar uma chave de conta de servio (Service Account Key) em *Configuraes do Projeto > Contas de Servio*.
4. Salvar o arquivo JSON como `firebase-key.json` na raiz do projeto (mesma pasta deste README).

## Como Executar

### 1. Backend
Navegue at a raiz do projeto e execute:
```bash
# Instalar dependências
pip install -r requirements.txt

# Iniciar o servidor
python -m backend.main
```
O backend rodar em `http://localhost:8000`.

### 2. Frontend
Navegue at a pasta `frontend` e execute:
```bash
npm install
npm run dev
```
O frontend rodar em `http://localhost:5173`.

## Funcionalidades
- **Upload de Currculo:** Suporte para arquivos .pdf e .docx.
- **Matching Inteligente:** Clculo de score de afinidade (0-100%) em tempo real.
- **Gesto de Vagas:** Interface para cadastrar novas oportunidades no Firestore.

## Publicao (GitHub & Vercel)

Para subir o projeto e conectar na Vercel:
1. Abra o **GitHub Desktop** e adicione esta pasta como um repositório.
2. Publique o repositório no seu GitHub.
3. Na Vercel, importe o repositório.
4. O arquivo `vercel.json` já está configurado para gerenciar o frontend (Vite) e o backend (Python API) simultaneamente.
