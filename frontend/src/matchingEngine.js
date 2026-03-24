/**
 * matchingEngine.js
 * Motor de matching TF-IDF client-side puro (sem backend).
 * Roda direto no browser — compatível com deploy no Vercel/Firebase Hosting.
 */

// ---------------------------------------------------------------------------
// Termos técnicos: mapeamento e keywords para boost de peso
// ---------------------------------------------------------------------------
const TECH_MAP = {
  'c#': 'csharp', 'c++': 'cpp', '.net': 'dotnet',
  'node.js': 'nodejs', 'react.js': 'reactjs', 'vue.js': 'vuejs',
  'next.js': 'nextjs', 'asp.net': 'aspnet',
};

const TECH_KEYWORDS = new Set([
  'css', 'html', 'javascript', 'typescript', 'csharp', 'cpp', 'dotnet',
  'sql', 'python', 'java', 'reactjs', 'reactnative', 'nodejs', 'vuejs',
  'nextjs', 'aspnet', 'flutter', 'dart', 'spark', 'airflow', 'terraform',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'kafka', 'rabbitmq',
  'oracle', 'mongodb', 'postgresql', 'redis', 'linux', 'git', 'api',
  'rest', 'graphql', 'fastapi', 'django', 'spring', 'angular', 'android',
  'ios', 'swift', 'kotlin', 'golang', 'rust', 'scala', 'hadoop',
  'machine', 'learning', 'backend', 'frontend', 'fullstack', 'devops',
  'cloud', 'microservices', 'agile', 'scrum', 'react',
]);

// Stopwords PT-BR + EN (subset essencial)
const STOP_WORDS = new Set([
  'de','a','o','que','e','do','da','em','um','para','com','uma','os','no',
  'se','na','por','mais','as','dos','como','mas','ao','ele','das','seu',
  'sua','ou','quando','muito','nos','ja','eu','tambem','so','pelo','pela',
  'ate','isso','ela','entre','depois','sem','mesmo','aos','seus','quem',
  'nas','me','esse','eles','voce','essa','num','nem','suas','meu','minha',
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'is','it','its','be','are','was','were','has','have','had','do','does',
  'did','not','from','by','this','that','we','our','your','they','their',
  'will','would','can','could','should','may','might','shall','about',
]);

// ---------------------------------------------------------------------------
// Normalização de texto
// ---------------------------------------------------------------------------
function normalize(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacríticos
    .toLowerCase();
}

function tokenize(text) {
  let t = normalize(text);
  // Aplica mapa de termos especiais ANTES de tokenizar
  for (const [from, to] of Object.entries(TECH_MAP)) {
    t = t.split(from).join(to);
  }
  // Extrai apenas alfanuméricos
  const tokens = t.match(/[a-z0-9]+/g) || [];
  return tokens.filter(tok => tok.length > 1 && !STOP_WORDS.has(tok));
}

function buildBoostedTokens(text) {
  const base = tokenize(text);
  const result = [];
  for (const tok of base) {
    result.push(tok);
    // Boost 2x para termos técnicos e tokens longos (provavelmente substantivos)
    if (TECH_KEYWORDS.has(tok) || tok.length >= 5) {
      result.push(tok);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// TF-IDF
// ---------------------------------------------------------------------------
function buildTF(tokens) {
  const freq = {};
  for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
  const total = tokens.length || 1;
  const tf = {};
  for (const [t, c] of Object.entries(freq)) tf[t] = Math.log(1 + c / total); // sublinear
  return tf;
}

function buildIDF(documents) {
  const N = documents.length;
  const df = {};
  for (const tokens of documents) {
    const seen = new Set(tokens);
    for (const t of seen) df[t] = (df[t] || 0) + 1;
  }
  const idf = {};
  for (const [t, count] of Object.entries(df)) {
    idf[t] = Math.log((N + 1) / (count + 1)) + 1; // smooth IDF
  }
  return idf;
}

function tfidfVector(tf, idf) {
  const vec = {};
  for (const [t, tfVal] of Object.entries(tf)) {
    vec[t] = tfVal * (idf[t] || 1);
  }
  return vec;
}

function cosineSimilarity(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0;
  for (const [t, v] of Object.entries(vecA)) {
    dot += v * (vecB[t] || 0);
    normA += v * v;
  }
  for (const v of Object.values(vecB)) normB += v * v;
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Calcula scores de compatibilidade entre um currículo e uma lista de vagas.
 * @param {string} resumeText - texto bruto extraído do currículo
 * @param {Array<{id, title, description, requirements}>} jobs - lista de vagas
 * @returns {Array<{job_id, job_title, score, source, url}>} matches ordenados por score
 */
export function calculateMatchScores(resumeText, jobs) {
  if (!resumeText || !jobs.length) return [];

  const resumeTokens = buildBoostedTokens(resumeText);
  const jobTokensList = jobs.map(j =>
    buildBoostedTokens(`${j.title} ${j.title} ${j.description || ''} ${j.requirements || ''}`)
  );

  // Corpus completo = currículo + todas as vagas (IDF real)
  const corpus = [resumeTokens, ...jobTokensList];
  const idf = buildIDF(corpus);

  const resumeTF = buildTF(resumeTokens);
  const resumeVec = tfidfVector(resumeTF, idf);

  return jobs.map((job, i) => {
    const jobTF = buildTF(jobTokensList[i]);
    const jobVec = tfidfVector(jobTF, idf);
    const score = Math.round(cosineSimilarity(resumeVec, jobVec) * 10000) / 100;
    return {
      job_id: job.id || job.job_id,
      job_title: job.title,
      score,
      source: job.source || 'Interna',
      url: job.url || '',
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Extrai texto de um arquivo PDF usando pdf.js (client-side).
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function extractTextFromPDF(file) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }
  return text;
}

/**
 * Gera sugestões de cursos com base nas tecnologias detectadas no texto.
 * @param {string} resumeText
 * @returns {Array<{title, url, description}>}
 */
export function generateCourseSuggestions(resumeText) {
  const tokens = new Set(tokenize(resumeText));

  const suggestions = [];

  if ([...tokens].some(t => ['reactjs','javascript','html','css','nextjs','vuejs','angular','react'].includes(t))) {
    suggestions.push(
      { title: 'Desenvolvimento Web (Rocketseat)', url: 'https://app.rocketseat.com.br/discover', description: 'Formação 100% gratuita para Front-end e Web.' },
      { title: 'React na Prática (FreeCodeCamp)', url: 'https://www.freecodecamp.org/portuguese/', description: 'Aprenda React construindo projetos reais.' }
    );
  }
  if ([...tokens].some(t => ['python','sql','spark','airflow','machine','learning','hadoop'].includes(t))) {
    suggestions.push(
      { title: 'Python para Análise de Dados (DSA)', url: 'https://www.datascienceacademy.com.br/course/python-fundamentos', description: 'Introdução a Data Science e Python.' },
      { title: 'Google Data Analytics (Coursera)', url: 'https://www.coursera.org/professional-certificates/google-data-analytics', description: 'Certificação do Google com bolsa ou auditoria.' }
    );
  }
  if ([...tokens].some(t => ['csharp','java','backend','spring','dotnet','nodejs'].includes(t))) {
    suggestions.push(
      { title: 'Programação Backend (FIAP ON)', url: 'https://on.fiap.com.br/', description: 'Cursos rápidos de desenvolvimento de software.' }
    );
  }
  if ([...tokens].some(t => ['flutter','dart','kotlin','swift','android','ios'].includes(t))) {
    suggestions.push(
      { title: 'Flutter & Dart – Full Course (YouTube)', url: 'https://www.youtube.com/watch?v=VPvVD8t02U8', description: 'Curso completo de Flutter gratuito.' }
    );
  }
  if ([...tokens].some(t => ['aws','azure','gcp','docker','kubernetes','terraform','devops','cloud'].includes(t))) {
    suggestions.push(
      { title: 'AWS Cloud Practitioner Essentials', url: 'https://aws.amazon.com/pt/training/learn-about/cloud-practitioner/', description: 'Fundamentos oficiais da AWS gratuitamente.' }
    );
  }

  if (suggestions.length === 0) {
    suggestions.push(
      { title: 'Lógica de Programação (Curso em Vídeo)', url: 'https://www.cursoemvideo.com/curso/curso-de-algoritmo/', description: 'Curso prático e gratuito para base técnica sólida.' },
      { title: 'Santander Open Academy', url: 'https://app.santanderopenacademy.com/pt-BR/program', description: 'Bolsas 100% gratuitas em tecnologia e idiomas.' }
    );
  }

  return suggestions.slice(0, 3);
}
