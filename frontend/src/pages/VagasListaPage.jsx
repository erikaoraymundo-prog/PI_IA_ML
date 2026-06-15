import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

const VagasListaPage = ({ user, onLoginRequired }) => {
  const [vagas, setVagas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroModelo, setFiltroModelo] = useState('');
  const [filtroLocal, setFiltroLocal] = useState('');
  
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const fetchVagas = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'vagas_oportunidades'));
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Filtrar apenas vagas ativas
        setVagas(list.filter(v => v.ativo));
      } catch (err) {
        console.error("Erro ao buscar vagas:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchVagas();
  }, []);

  const handleApply = async (vaga) => {
    if (!user) {
      alert("Para se candidatar a esta vaga, você precisa entrar ou criar uma conta como Candidato.");
      onLoginRequired();
      return;
    }

    if (user.userType === 'empresa') {
      alert("Apenas contas do tipo Candidato podem se inscrever em vagas.");
      return;
    }

    // Buscar currículo do candidato
    if (!user.resumeUrl) {
      alert("Por favor, acesse o menu no canto superior direito e clique em 'Editar Perfil' para anexar seu currículo antes de se candidatar.");
      return;
    }

    if (!confirm(`Confirmar candidatura para a vaga "${vaga.titulo}"? Seu perfil cadastrado será enviado ao recrutador.`)) {
      return;
    }

    setApplyingJobId(vaga.id);
    try {
      // Cria a candidatura normal
      const appRef = doc(collection(db, 'applications'));
      
      // Criar snapshot do perfil atual
      const snapshot = {
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
        cpf: user.cpf || '',
        birthDate: user.birthDate || '',
        gender: user.gender || '',
        country: user.country || '',
        state: user.state || '',
        city: user.city || '',
        neighborhood: user.neighborhood || '',
        targetJob: user.targetJob || '',
        minSalary: user.minSalary || '',
        maxSalary: user.maxSalary || '',
        modelPreferences: user.modelPreferences || [],
        travelAvailability: user.travelAvailability || '',
        aboutMe: user.aboutMe || '',
        experiences: user.experiences || [],
        educations: user.educations || [],
        languages: user.languages || [],
        skills: user.skills || [],
        resumeUrl: user.resumeUrl || '',
        linkedinUrl: user.linkedinUrl || '',
        githubUrl: user.githubUrl || ''
      };

      await setDoc(appRef, {
        userId: user.uid,
        userEmail: user.email,
        userFullName: user.fullName || user.displayName || 'Candidato',
        jobId: vaga.id,
        jobTitle: vaga.titulo,
        resumeUrl: user.resumeUrl,
        score: 100.0, // Candidatura direta manual recebe 100% de afinidade
        status: 'pendente',
        appliedAt: new Date(),
        candidateProfileSnapshot: snapshot
      });

      setFeedback({ message: `Candidatura enviada com sucesso para "${vaga.titulo}"!`, type: 'success' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      console.error(err);
      setFeedback({ message: 'Erro ao enviar candidatura. Tente novamente.', type: 'error' });
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setApplyingJobId(null);
    }
  };

  const filteredVagas = vagas.filter(v => {
    const titulo = (v.titulo || '').toLowerCase();
    const desc = (v.descricao || '').toLowerCase();
    const queryStr = search.toLowerCase();
    
    // Busca por termo
    const matchesSearch = titulo.includes(queryStr) || desc.includes(queryStr);

    // Filtro de regime de trabalho
    const matchesModelo = filtroModelo === '' || 
      (v.escala_trabalho || '').toLowerCase() === filtroModelo.toLowerCase();

    // Filtro de localização (cidade ou remoto)
    const localizacao = (v.localizacao || '').toLowerCase();
    let matchesLocal = true;
    if (filtroLocal === 'remoto') {
      matchesLocal = localizacao.includes('remoto');
    } else if (filtroLocal === 'presencial') {
      matchesLocal = !localizacao.includes('remoto');
    }

    return matchesSearch && matchesModelo && matchesLocal;
  });

  return (
    <div className="container" style={{ padding: '4rem 1rem', minHeight: 'calc(100vh - 80px)' }}>
      {/* Header */}
      <div className="agente-header" style={{
        background: 'linear-gradient(135deg, #004d5b 0%, #00a896 100%)',
        borderRadius: '24px', padding: '2.5rem 2rem', color: 'white', marginBottom: '2.5rem'
      }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.6rem', color: 'white' }}>
          💼 Oportunidades Disponíveis
        </h1>
        <p style={{ fontSize: '1rem', opacity: 0.9, color: '#e0f2fe', margin: 0 }}>
          Explore todas as vagas ativas publicadas e encontre seu próximo desafio tech.
        </p>
      </div>

      {feedback && (
        <div style={{
          padding: '1rem 1.5rem', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: 600, fontSize: '0.95rem',
          background: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
          color: feedback.type === 'success' ? '#065f46' : '#991b1b',
          border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          animation: 'fadeIn 0.3s ease'
        }}>
          {feedback.message}
        </div>
      )}

      {/* Filtros */}
      <div style={{
        background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '16px',
        padding: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2.5rem'
      }}>
        <div style={{ flex: '2 1 300px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>Buscar por Termo</label>
          <input 
            type="text" 
            placeholder="Ex: React, Node, Sênior, Product Manager..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: 0, padding: '0.65rem' }}
          />
        </div>
        <div style={{ flex: '1 1 180px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>Regime de Trabalho</label>
          <select 
            value={filtroModelo}
            onChange={e => setFiltroModelo(e.target.value)}
            style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', height: '40px', fontSize: '0.9rem' }}
          >
            <option value="">Todos</option>
            <option value="remoto">🌐 Remoto</option>
            <option value="hibrido">🔀 Híbrido</option>
            <option value="5x2">Presencial 5x2</option>
            <option value="6x1">Presencial 6x1</option>
          </select>
        </div>
        <div style={{ flex: '1 1 180px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>Localidade</label>
          <select 
            value={filtroLocal}
            onChange={e => setFiltroLocal(e.target.value)}
            style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', height: '40px', fontSize: '0.9rem' }}
          >
            <option value="">Todas</option>
            <option value="remoto">Apenas Remoto</option>
            <option value="presencial">Presencial / Híbrido</option>
          </select>
        </div>
      </div>

      {/* Grid de Vagas */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{
            width: '45px', height: '45px', border: '3px solid #f3f3f3',
            borderTop: '3px solid #00a896', borderRadius: '50%',
            margin: '0 auto 1.5rem', animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Carregando vagas...</p>
        </div>
      ) : filteredVagas.length === 0 ? (
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', borderRadius: '20px', border: '1px solid #cbd5e1', background: 'white' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <h3 style={{ fontSize: '1.25rem', color: '#1e293b' }}>Nenhuma vaga corresponde aos filtros aplicados.</h3>
          <p style={{ color: 'var(--text-muted)' }}>Tente alterar os termos de busca ou filtros de regime de trabalho.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {filteredVagas.map(vaga => (
            <div key={vaga.id} className="job-card" style={{
              background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px',
              padding: '1.75rem', display: 'flex', flexDirection: 'column', height: '100%',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span style={{
                  background: vaga.escala_trabalho === 'remoto' ? '#e0f2fe' : '#f1f5f9',
                  color: vaga.escala_trabalho === 'remoto' ? '#0369a1' : '#475569',
                  fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.65rem', borderRadius: '99px',
                  textTransform: 'uppercase'
                }}>
                  {vaga.escala_trabalho || 'remoto'}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500 }}>
                  🏢 {vaga.empresa_nome}
                </span>
              </div>

              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>{vaga.titulo}</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1rem' }}>
                📍 {vaga.localizacao}
              </p>

              {vaga.requisitos_tecnicos && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1.5rem' }}>
                  {vaga.requisitos_tecnicos.map((req, i) => (
                    <span key={i} style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontWeight: 500 }}>
                      {req}
                    </span>
                  ))}
                </div>
              )}

              <p style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.5, marginBottom: '2rem', display: '-webkit-box', WebkitLineClamp: '3', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {vaga.descricao}
              </p>

              <button 
                onClick={() => handleApply(vaga)}
                disabled={applyingJobId === vaga.id}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem', background: '#00a896', marginTop: 'auto', border: 'none' }}
              >
                {applyingJobId === vaga.id ? 'Aguarde...' : 'Candidatar-se'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VagasListaPage;
