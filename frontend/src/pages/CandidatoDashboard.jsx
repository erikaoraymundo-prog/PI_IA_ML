import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';

const CandidatoDashboard = ({ user }) => {
  const [candidaturas, setCandidaturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const fetchCandidaturas = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'applications'),
        where('userId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      const list = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // Ordenar por data (mais recentes primeiro)
      list.sort((a, b) => {
        const dateA = a.appliedAt?.toDate ? a.appliedAt.toDate() : new Date(a.appliedAt || 0);
        const dateB = b.appliedAt?.toDate ? b.appliedAt.toDate() : new Date(b.appliedAt || 0);
        return dateB - dateA;
      });
      setCandidaturas(list);
    } catch (err) {
      console.error("Erro ao carregar candidaturas:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCandidaturas();
  }, [fetchCandidaturas]);

  const handleCancelApplication = async (appId, jobTitle) => {
    if (!confirm(`Tem certeza que deseja cancelar a sua candidatura para a vaga "${jobTitle}"?`)) {
      return;
    }
    setCancelingId(appId);
    try {
      await deleteDoc(doc(db, 'applications', appId));
      setFeedback({ message: `Candidatura para "${jobTitle}" cancelada com sucesso!`, type: 'success' });
      setTimeout(() => setFeedback(null), 4000);
      fetchCandidaturas();
    } catch (err) {
      console.error("Erro ao cancelar candidatura:", err);
      setFeedback({ message: 'Erro ao cancelar candidatura. Tente novamente.', type: 'error' });
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setCancelingId(null);
    }
  };

  const getStatusStyle = (status) => {
    const s = (status || 'pendente').toLowerCase();
    switch (s) {
      case 'aceito':
        return { bg: '#d1fae5', color: '#065f46', text: 'Contratado(a)' };
      case 'rejeitado':
        return { bg: '#fee2e2', color: '#991b1b', text: 'Finalizado' };
      case 'analisando':
        return { bg: '#dbeafe', color: '#1e40af', text: 'Em Análise' };
      default:
        return { bg: '#fef3c7', color: '#92400e', text: 'Recebida' };
    }
  };

  return (
    <div className="container" style={{ padding: '4rem 1rem', minHeight: 'calc(100vh - 80px)' }}>
      <div className="agente-header" style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        position: 'relative', overflow: 'hidden', marginBottom: '2rem'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontSize: '2.3rem', fontWeight: 800, marginBottom: '0.8rem', color: 'white' }}>
            💼 Minhas Candidaturas
          </h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.9, color: '#94a3b8', margin: 0 }}>
            Acompanhe o status e a nota de compatibilidade do seu perfil com as vagas aplicadas.
          </p>
        </div>
      </div>

      {feedback && (
        <div style={{
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          marginBottom: '1.5rem',
          fontWeight: 600,
          fontSize: '0.95rem',
          background: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
          color: feedback.type === 'success' ? '#065f46' : '#991b1b',
          border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          animation: 'fadeIn 0.3s ease'
        }}>
          {feedback.message}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{
            width: '45px', height: '45px', border: '3px solid #f3f3f3',
            borderTop: '3px solid #00a896', borderRadius: '50%',
            margin: '0 auto 1.5rem', animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Carregando seu histórico de candidaturas...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      ) : candidaturas.length === 0 ? (
        <div className="card" style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          background: 'white'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>📄</div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.5rem' }}>
            Nenhuma candidatura realizada
          </h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 2rem' }}>
            Você ainda não se candidatou a nenhuma vaga do portal. Faça upload do seu currículo na página inicial para darmos match!
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}>
          {candidaturas.map((app) => {
            const statusStyle = getStatusStyle(app.status);
            const appDate = app.appliedAt?.toDate ? app.appliedAt.toDate() : new Date(app.appliedAt || 0);
            const dateStr = appDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

            return (
              <div key={app.id} className="job-card" style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                padding: '1.75rem',
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                transition: 'transform 0.2s',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <span style={{
                    background: statusStyle.bg,
                    color: statusStyle.color,
                    padding: '0.3rem 0.75rem',
                    borderRadius: '99px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {statusStyle.text}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>
                    📅 {dateStr}
                  </span>
                </div>

                <h3 className="job-title" style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#1e293b' }}>
                  {app.jobTitle}
                </h3>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  background: '#f8fafc',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid #f1f5f9',
                  margin: '1rem 0'
                }}>
                  <div style={{ fontSize: '1.2rem' }}>🎯</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                      Afinidade de Perfil (IA)
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--secondary)' }}>
                      {app.score}%
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto', paddingTop: '1rem' }}>
                  <a href={app.resumeUrl} target="_blank" rel="noreferrer" className="btn btn-outline" style={{
                    flex: 1, padding: '0.65rem', fontSize: '0.85rem', textAlign: 'center', textDecoration: 'none'
                  }}>
                    Visualizar Currículo
                  </a>
                  <button
                    onClick={() => handleCancelApplication(app.id, app.jobTitle)}
                    disabled={cancelingId === app.id}
                    className="btn btn-outline"
                    style={{
                      padding: '0.65rem 1rem', fontSize: '0.85rem', color: '#ef4444', borderColor: '#fee2e2', background: '#fff'
                    }}
                    onMouseEnter={(e) => { e.target.style.background = '#fef2f2'; }}
                    onMouseLeave={(e) => { e.target.style.background = '#fff'; }}
                  >
                    {cancelingId === app.id ? 'Aguarde...' : 'Desistir'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CandidatoDashboard;
