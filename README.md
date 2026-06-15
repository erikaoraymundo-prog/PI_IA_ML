# 🚀 Como Executar o globalTalentBridge: Guia Super Simples e Completo!

Bem-vindo ao **globalTalentBridge**! Este projeto é como uma ponte mágica construída com blocos de montar (código) que ajuda pessoas programadoras da América Latina a encontrarem empregos muito legais pelo mundo inteiro usando robôs inteligentes (Inteligência Artificial). 🤖✨

Se você quer ver essa ponte funcionar na sua tela, siga este guia passo a passo! Nós escrevemos de um jeito tão fácil que até uma criança de 5 anos (com a ajuda de um adulto programador, claro) consegue ligar os robôs e ver a mágica acontecer. 🧸👦👧

---

## 🥣 1. Os Ingredientes Secretos (Pré-requisitos)

Antes de começarmos a montar nossa ponte, precisamos ter certeza de que temos todas as ferramentas certas na nossa mesa de trabalho. Você vai precisar de:

1. **💻 Um Computador com Windows**: Onde tudo vai rodar.
2. **🌐 Internet**: Para os nossos robôs conversarem com o mundo.
3. **🧭 Um Navegador de Internet**: Como o Google Chrome, Microsoft Edge ou Firefox para ver a carinha do projeto.
4. **🐍 Python (versão 3.10 ou superior)**: O robô inteligente que calcula as coisas no fundo (o "cérebro").
5. **🟢 Node.js (versão 18 ou superior)**: O robô construtor que desenha a tela bonita e colorida (o "corpo").
6. **🔑 Chave de Acesso do Firebase**: Um arquivo secreto chamado `firebase-key.json` que é como o controle remoto que abre a nossa caixinha de brinquedos (o banco de dados).

---

## 🛠️ 2. Preparando o Terreno (Configuração Inicial)

Para que o cérebro e o corpo do projeto conversem, precisamos colocar os arquivos de configuração nos lugares certos.

### A Caixinha do Firebase (Banco de Dados)
1. Vá até a pasta `env/` no seu projeto.
2. Coloque o arquivo de credenciais do Firebase lá dentro com o nome exato: **`firebase-key.json`**.
3. Se você abrir a pasta `env/`, deve ver três arquivos:
   - `firebase-key.json`
   - `.env`
   - `.env.example`

### Configurando a Conexão no Cérebro (Backend)
Abra o arquivo [env/.env](file:///c:/Users/Gustavo/Documents/GitHub/PI_IA_ML/env/.env) e configure as variáveis. Se você estiver usando para testes locais básicos, a chave do Firebase já é o suficiente para iniciar o projeto!

---

## 🧠 3. Passo 1: Ligando o Cérebro (O Servidor Backend)

O "cérebro" é feito em Python e FastAPI. Ele é quem faz as contas difíceis de Inteligência Artificial para ver se o currículo combina com a vaga!

1. Abra o **PowerShell** no seu computador.
2. Navegue até a pasta raiz do projeto (onde fica este arquivo `README.md`).
3. **Crie a casinha dos robôs (Ambiente Virtual)** executando o comando abaixo. Isso serve para não misturar as pecinhas deste projeto com outras do seu computador:
   ```powershell
   python -m venv .venv
   ```
4. **Instale as pecinhas de montar (Bibliotecas)** rodando este comando:
   ```powershell
   .venv\Scripts\pip.exe install -r requirements.txt
   ```
   *Espere um pouquinho até que o computador baixe todos os pacotes. É rápido! ⏳*

5. **Ligue o cérebro!** Execute o comando abaixo para dar partida no servidor:
   ```powershell
   .venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000
   ```
   *Se tudo der certo, você verá uma mensagem dizendo que o servidor está rodando em `http://127.0.0.1:8000`! 🎉*

---

## 🎨 4. Passo 2: Ligando o Visual (O Frontend React)

O "corpo" é feito com React e Vite. Ele constrói aquela tela cheia de botões bonitos, gráficos e gradientes coloridos para você clicar!

1. Abra uma **nova janela do PowerShell** (deixe a do cérebro aberta e funcionando!).
2. Navegue até a pasta do frontend:
   ```powershell
   cd frontend
   ```
3. **Crie o fio de comunicação**: Para a tela saber onde conversar com o cérebro, crie um arquivo chamado `.env` dentro da pasta `frontend/` e escreva exatamente isto dentro dele:
   ```env
   VITE_API_URL=http://localhost:8000
   ```
   *(Você também pode abrir o arquivo [frontend/.env](file:///c:/Users/Gustavo/Documents/GitHub/PI_IA_ML/frontend/.env) se ele já existir e verificar essa linha).*

4. **Instale as ferramentas visuais**: Baixe todas as peças do visual rodando:
   ```powershell
   npm.cmd install
   ```
5. **Ligue o robô do visual!** Diga para a tela começar a funcionar com:
   ```powershell
   npm.cmd run dev
   ```
   *Pronto! Ele vai dizer que a tela está pronta em `http://localhost:5173`! 🚀*

---

## 🦄 5. Passo 3: Ver a Mágica Acontecer!

Agora que os dois robôs estão acordados e conversando:

1. Abra o seu **Navegador de Internet** (como o Google Chrome).
2. Na barra de endereços lá em cima, digite:
   👉 **[http://localhost:5173](http://localhost:5173)**
3. **Tchã-rã!** Você verá a tela linda do **globalTalentBridge**.

### O que você pode fazer lá?
* **Subir Currículos (Arrastar e Soltar)**: Jogue um arquivo de currículo em PDF na caixinha e assista à IA calcular o match com as vagas!
* **Ver Gráficos Bonitos**: Clique no painel interativo para ver gráficos de barras e roscas sobre salários e tecnologias.
* **Módulo Agente**: Vá na área de verificação, coloque as informações e veja o Agente Multiagente (`LangGraph` + `Gemini`) auditar um candidato em tempo real!

---

## 🩹 6. Ai! Deu Erro! E Agora? (Resolução de Problemas)

Se algum robô tropeçar no caminho, não fique triste! Aqui está como consertar os probleminhas mais comuns:

### ⚠️ Erro: "O arquivo ...ps1 não pode ser carregado porque a execução de scripts foi desabilitada..."
* **Por que acontece?** O Windows é muito protetor e às vezes bloqueia a execução de comandos automáticos do Node/NPM no PowerShell.
* **Como consertar?** Em vez de digitar apenas `npm install` ou `npm run dev`, use sempre o sufixo `.cmd`. Digite:
   - `npm.cmd install`
   - `npm.cmd run dev`
* *Isso avisa ao Windows que é um comando seguro e ele deixa rodar na hora!*

### ⚠️ Erro: "FIREBASE_SERVICE_ACCOUNT_KEY não definido no .env" ou "Firestore indisponível"
* **Por que acontece?** O backend não encontrou o arquivo secreto `firebase-key.json` ou as configurações no arquivo `.env`.
* **Como consertar?** Verifique se o arquivo `firebase-key.json` está realmente dentro da pasta `env/` e se o caminho no seu arquivo `env/.env` está escrito assim:
   `FIREBASE_SERVICE_ACCOUNT_KEY=env/firebase-key.json`

### ⚠️ Erro ao tentar baixar pacotes do Python
* **Por que acontece?** Falta de internet ou o comando foi digitado fora do caminho correto.
* **Como consertar?** Verifique se você está conectado à internet e se o terminal está na pasta raiz do projeto antes de rodar `.venv\Scripts\pip.exe install -r requirements.txt`.

---

Divirta-se brincando com a Inteligência Artificial e conectando talentos! 🌟
🏆 *Documentação feita com muito carinho para a entrega do Projeto Integrador de IA e ML.*
