import React, { useState, useEffect } from 'react';
import { auth, signInWithGoogle, logout, db, storage } from './firebase';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { calculateMatchScores, extractTextFromPDF, generateCourseSuggestions } from './matchingEngine';
import './index.css';
import ProductPage from './pages/ProductPage';
import LGPDPage from './pages/LGPDPage';
import AboutPage from './pages/AboutPage';

const HERO_IMAGE_URL = "/hero_talent_match.png";

function App() {
  const [jobs, setJobs] = useState([]);
  const [matches, setMatches] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const [currentFile, setCurrentFile] = useState(null);
  const [applying, setApplying] = useState(false);
  
  // Auth State
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regData, setRegData] = useState({ fullName: '', email: '', address: '', password: '' });
  const [loginData, setLoginData] = useState({ email: '', password: '' });


  const fetchJobs = async () => {
    try {
      const snap = await getDocs(collection(db, 'jobs'));
      setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error fetching jobs:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const userDoc = await getDoc(doc(db, "users", u.uid));
        setUser({ ...u, ...userDoc.data() });
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      setShowLoginModal(false);
    } catch (err) {
      console.error("Google Login Error:", err);
      alert("Falha no login com Google.");
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, loginData.email, loginData.password);
      setShowLoginModal(false);
      setLoginData({ email: '', password: '' });
    } catch (err) {
      console.error("Email Login Error:", err);
      alert("Credenciais inválidas. Verifique email e senha.");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const { user } = await createUserWithEmailAndPassword(auth, regData.email, regData.password);
      await setDoc(doc(db, "users", user.uid), {
        fullName: regData.fullName,
        email: regData.email,
        address: regData.address,
        createdAt: new Date()
      });
      alert("Cadastro realizado com sucesso!");
      setShowRegisterModal(false);
    } catch (err) {
      console.error("Registration Error:", err);
      alert("Falha no cadastro: " + err.message);
    }
  };

  const handleCandidateClick = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    document.getElementById('resumeUpload').click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCurrentFile(file);
    setLoading(true);
    try {
      // 1. Extrai texto do PDF/DOCX no browser
      let resumeText = '';
      if (file.name.toLowerCase().endsWith('.pdf')) {
        resumeText = await extractTextFromPDF(file);
      } else {
        // Para .docx e outros, lê como texto plano (fallback)
        resumeText = await file.text();
      }

      if (!resumeText.trim()) {
        alert('Não foi possível extrair texto do currículo. Verifique se o arquivo não está protegido.');
        return;
      }

      // 2. Busca vagas do Firestore diretamente via SDK cliente
      const jobsSnap = await getDocs(collection(db, 'jobs'));
      const jobs = jobsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (jobs.length === 0) {
        setMatches([]);
        setSuggestions(generateCourseSuggestions(resumeText));
        setShowMatchModal(true);
        return;
      }

      // 3. Calcula matching client-side (TF-IDF bulk)
      const THRESHOLD = 8;
      const allScores = calculateMatchScores(resumeText, jobs);
      const matched = allScores.filter(r => r.score >= THRESHOLD);

      setMatches(matched);
      setSuggestions(matched.length === 0 ? generateCourseSuggestions(resumeText) : []);
      setShowMatchModal(true);

    } catch (err) {
      console.error('Erro ao processar currículo:', err);
      alert('Falha ao processar currículo: ' + err.message);
    } finally {
      setLoading(false);
      // Limpa o input para permitir reenvio do mesmo arquivo
      e.target.value = '';
    }
  };

  const handleApplyToJobs = async () => {
    if (!currentFile || !user || matches.length === 0) return;
    setApplying(true);
    try {
      // 1. Upload do currículo para o Firebase Storage
      const timestamp = new Date().getTime();
      const filename = currentFile.name;
      const storageRef = ref(storage, `resumes/${user.uid}_${timestamp}_${filename}`);
      
      const snapshot = await uploadBytes(storageRef, currentFile);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // 2. Criar a candidatura na coleção applications do Firestore
      for (const match of matches) {
        const appRef = doc(collection(db, 'applications'));
        await setDoc(appRef, {
          userId: user.uid,
          userEmail: user.email,
          userFullName: user.fullName || user.displayName || 'Candidato',
          jobId: match.job_id,
          jobTitle: match.job_title,
          resumeUrl: downloadURL,
          score: match.score,
          appliedAt: new Date()
        });
      }

      alert("Candidatura enviada com sucesso para as vagas compatíveis!");
      setShowMatchModal(false);
      setCurrentFile(null);
    } catch (err) {
      console.error("Erro ao aplicar para vagas:", err);
      alert("Falha ao enviar candidatura: " + err.message);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="app-wrapper">
      <nav className="navbar">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div className="logo">
            global<span className="logo-accent">TalentBridge</span>
          </div>
          <div className="nav-links">
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentPage('home'); }} className={currentPage === 'home' ? 'active' : ''}>Início</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentPage('product'); }} className={currentPage === 'product' ? 'active' : ''}>Nosso Produto</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentPage('lgpd'); }} className={currentPage === 'lgpd' ? 'active' : ''}>LGPD</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentPage('about'); }} className={currentPage === 'about' ? 'active' : ''}>Sobre Nós</a>
          </div>
          <div className="auth-group" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-dark)', fontWeight: 500 }}>Olá, {user.fullName || user.displayName}</span>
                <button onClick={logout} className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>Sair</button>
              </div>
            ) : (
              <>
                <a href="#" onClick={(e) => { e.preventDefault(); setShowLoginModal(true); }} className="login-link" style={{ textDecoration: 'none', color: 'var(--text-dark)', fontWeight: 600, fontSize: '0.9rem' }}>Entrar</a>
                <button onClick={() => setShowRegisterModal(true)} className="btn btn-primary" style={{ padding: '0.6rem 1.5rem' }}>Cadastrar</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {currentPage === 'home' && (
        <>
          <section className="container hero">
            <div className="hero-content">
          <h1 className="hero-title">Conectando os melhores talentos de tech às oportunidades reais</h1>
          <p className="hero-subtitle">
            A forma mais simples de enviar seu currículo ou encontrar o profissional ideal para sua empresa. Precisão técnica aliada à visão humana.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-primary" onClick={handleCandidateClick}>
              {loading ? 'Processando...' : 'Sou Candidato'}
            </button>
            <input 
              id="resumeUpload" 
              type="file" 
              hidden 
              onChange={handleFileUpload} 
              accept=".pdf,.docx"
            />
            <button className="btn btn-outline" style={{ background: '#e1eaec', border: 'none' }}>Sou Recrutador</button>
          </div>
        </div>
        <div className="hero-image-container">
          <img src={HERO_IMAGE_URL} alt="Hero" className="hero-image" />
        </div>
      </section>

      <section className="container" style={{ padding: '6rem 0' }}>
        <span className="section-tag">Oportunidades em destaque</span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
          <h2 className="section-title" style={{ margin: 0 }}>Vagas abertas agora</h2>
          <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Ver todas &rarr;
          </a>
        </div>
        
        <div className="jobs-grid">
          {jobs.slice(0, 3).map((job) => (
            <div key={job.id} className="job-card">
              <div className="job-card-header">
                <div style={{ background: '#f0f4f5', padding: '0.8rem', borderRadius: '8px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                </div>
                <span className="job-tag">Remoto</span>
              </div>
              <h3 className="job-title">{job.title}</h3>
              <p className="job-meta">Tecnologia • São Paulo, SP</p>
              <div className="job-skills">
                <span className="skill-badge">React</span>
                <span className="skill-badge">Node.js</span>
                <span className="skill-badge">AWS</span>
              </div>
              <button className="btn btn-outline" style={{ marginTop: 'auto', width: '100%', padding: '0.6rem' }}>Candidatar-se</button>
            </div>
          ))}
        </div>
      </section>

      <section className="container benefits-section">
        <div className="benefits-content">
          <div style={{ marginBottom: '2rem' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1.5rem' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            <h2 className="section-title">Para quem busca o próximo nível.</h2>
          </div>
          
          <div className="benefit-item">
            <div className="benefit-icon">✓</div>
            <div className="benefit-text">
              <h3>Curadoria de Elite</h3>
              <p>Apenas empresas com cultura tech sólida e projetos desafiadores.</p>
            </div>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon">✓</div>
            <div className="benefit-text">
              <h3>Feedback Humanizado</h3>
              <p>Chega de silêncio. Transparência total em cada etapa do seu processo.</p>
            </div>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon">✓</div>
            <div className="benefit-text">
              <h3>Privacidade Garantida</h3>
              <p>Controle quem vê seu perfil de acordo com as normas da LGPD.</p>
            </div>
          </div>
        </div>

        <div className="recruitment-card">
          <h2>Recrutamento com precisão cirúrgica.</h2>
          <p>Reduza o tempo de contratação com filtros baseados em stacks reais e competências validadas.</p>
          
          <div className="recruitment-feature">
            <h4>Matching Inteligente</h4>
            <p>Nosso algoritmo encontra talentos que dão match com sua cultura.</p>
          </div>
          
          <div className="recruitment-feature">
            <h4>Pipeline Visual</h4>
            <p>Gestão intuitiva de candidatos em um fluxo contínuo e limpo.</p>
          </div>
          
          <button className="btn btn-primary" style={{ background: 'white', color: '#003a45', width: '100%', marginTop: '1rem' }}>Começar a Contratar</button>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <h2 className="cta-title">O futuro da sua carreira tech começa aqui.</h2>
          <p className="cta-subtitle">Junte-se a milhares de desenvolvedores e centenas de empresas inovadoras.</p>
          <button className="btn btn-primary" onClick={() => setShowRegisterModal(true)} style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}>Criar Conta Grátis</button>
        </div>
      </section>
      </>
      )}

      {currentPage === 'product' && <ProductPage />}
      {currentPage === 'lgpd' && <LGPDPage />}
      {currentPage === 'about' && <AboutPage />}

      <footer>
        <div className="container">
          <div className="footer-grid">
            <div className="footer-column" style={{ gridColumn: 'span 2' }}>
              <div className="logo" style={{ marginBottom: '1.5rem' }}>global<span className="logo-accent">TalentBridge</span></div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '300px' }}>© 2025 globalTalentBridge. Todos os direitos reservados.</p>
            </div>
            <div className="footer-column">
              <h4>Produto</h4>
              <ul>
                <li><a href="#">Soluções</a></li>
                <li><a href="#">Preços</a></li>
                <li><a href="#">Vagas</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h4>Empresa</h4>
              <ul>
                <li><a href="#">Sobre Nós</a></li>
                <li><a href="#">Carreiras</a></li>
                <li><a href="#">Blog</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h4>Legal</h4>
              <ul>
                <li><a href="#">LGPD</a></li>
                <li><a href="#">Termos</a></li>
                <li><a href="#">Privacidade</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div>Termos de Uso • Política de Privacidade • Cookies • Contato</div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <span>🌐</span>
              <span>🔗</span>
            </div>
          </div>
        </div>
      </footer>

      {showMatchModal && (
        <div className="overlay" onClick={() => setShowMatchModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="section-title" style={{ fontSize: '1.5rem' }}>Resultados do Match</h2>
            {matches.length > 0 ? (
              <div style={{ marginTop: '1.5rem' }}>
                {matches.map((match, idx) => (
                  <div key={idx} style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ color: 'var(--primary)', margin: '0 0 0.2rem 0' }}>
                        {match.url ? (
                          <a href={match.url} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                            {match.job_title} <span style={{fontSize: '0.8rem'}}>↗</span>
                          </a>
                        ) : match.job_title}
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                        {match.source ? `Fonte: ${match.source} | ` : ''}ID: {match.job_id}
                      </p>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>{match.score}%</span>
                  </div>
                ))}
                
                <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8fafa', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-dark)' }}>Deseja se candidatar a estas vagas?</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>
                    Seu currículo será enviado diretamente para os recrutadores responsáveis de forma segura.
                  </p>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleApplyToJobs} 
                    disabled={applying}
                    style={{ width: '100%', padding: '0.8rem' }}
                  >
                    {applying ? 'Enviando...' : 'Sim, Enviar Meu Currículo'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ background: '#fff3cd', padding: '1rem', borderRadius: '8px', color: '#856404', marginBottom: '1.5rem', border: '1px solid #ffeeba' }}>
                  <p style={{ margin: 0 }}><strong>Nenhum match ideal encontrado.</strong></p>
                  <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', margin: '0.5rem 0 0 0' }}>Que tal dar um up nas suas habilidades com estes cursos gratuitos?</p>
                </div>
                
                {suggestions && suggestions.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-dark)' }}>🎯 Recomendado pela IA:</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {suggestions.map((course, idx) => (
                        <a key={idx} href={course.url} target="_blank" rel="noreferrer" style={{ display: 'block', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', textDecoration: 'none', color: 'inherit', background: '#f8fbfc', transition: 'border-color 0.2s' }}>
                          <h4 style={{ color: 'var(--primary)', margin: '0 0 0.4rem 0' }}>{course.title}</h4>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>{course.description}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '2rem' }} onClick={() => setShowMatchModal(false)}>Fechar</button>
          </div>
        </div>
      )}

      {showLoginModal && (
        <div className="overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal auth-modal" onClick={e => e.stopPropagation()}>
            <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Entrar</h2>
            <form onSubmit={handleEmailLogin}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Email</label>
                <input required type="email" className="form-input" value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }} />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Senha</label>
                <input required type="password" className="form-input" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '1rem' }}>Entrar</button>
            </form>

            <div style={{ textAlign: 'center', margin: '1rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>ou</div>
            
            <button className="btn btn-google" onClick={handleGoogleLogin} style={{ width: '100%', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: 'white', border: '1px solid #ddd', color: '#555' }}>
               <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" height="18" alt="Google" />
               Entrar com Google
            </button>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Ainda não tem conta? <a href="#" onClick={(e) => { e.preventDefault(); setShowLoginModal(false); setShowRegisterModal(true); }} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Cadastre-se</a>
            </p>
            <button className="btn btn-outline" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setShowLoginModal(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {showRegisterModal && (
        <div className="overlay" onClick={() => setShowRegisterModal(false)}>
          <div className="modal auth-modal" onClick={e => e.stopPropagation()}>
            <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Cadastrar</h2>
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Nome Completo</label>
                <input required type="text" className="form-input" value={regData.fullName} onChange={e => setRegData({...regData, fullName: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Email</label>
                <input required type="email" className="form-input" value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Endereço</label>
                <input required type="text" className="form-input" value={regData.address} onChange={e => setRegData({...regData, address: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }} />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Senha</label>
                <input required type="password" placeholder="Mínimo 6 caracteres" className="form-input" value={regData.password} onChange={e => setRegData({...regData, password: e.target.value})} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Criar Conta</button>
            </form>
            <button className="btn btn-outline" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setShowRegisterModal(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
