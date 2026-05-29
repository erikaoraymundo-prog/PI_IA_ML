import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, query, where, updateDoc, setDoc } from 'firebase/firestore';

const BACKEND_URL = import.meta.env.VITE_API_URL || '';

const RecrutadorDashboard = ({ user }) => {
  const [vagas, setVagas] = useState([]);
  const [candidaturas, setCandidaturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVaga, setSelectedVaga] = useState(null); // Vaga selecionada para ver candidatos
  const [editingVaga, setEditingVaga] = useState(null);   // Vaga selecionada para edição
  const [editFormData, setEditFormData] = useState({ titulo: '', empresa_nome: '', localizacao: '', escala_trabalho: '', requisitos_tecnicos: '', descricao: '' });
  const [savingVaga, setSavingVaga] = useState(false);
  const [updatingAppId, setUpdatingAppId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Carregar vagas e candidaturas simultaneamente
  const fetchData = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      // 1. Carregar vagas criadas por este recrutador
      const vagasQ = query(
        collection(db, 'vagas_oportunidades'),
        where('postedByUid', '==', user.uid)
      );
      const vagasSnap = await getDocs(vagasQ);
      const vagasList = [];
      vagasSnap.forEach((doc) => {
        vagasList.push({ id: doc.id, ...doc.data() });
      });

      // Ordenar vagas por data
      vagasList.sort((a, b) => {
        const dateA = a.data_postagem?.toDate ? a.data_postagem.toDate() : new Date(a.data_postagem || 0);
        const dateB = b.data_postagem?.toDate ? b.data_postagem.toDate() : new Date(b.data_postagem || 0);
        return dateB - dateA;
      });

      // 2. Carregar todas as candidaturas do banco
      const appsSnap = await getDocs(collection(db, 'applications'));
      const appsList = [];
      appsSnap.forEach((doc) => {
        appsList.push({ id: doc.id, ...doc.data() });
      });

      setVagas(vagasList);
      setCandidaturas(appsList);
    } catch (err) {
      console.error("Erro ao carregar dados do recrutador:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showFeedback = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Mapear total de candidaturas por vaga
  const appsByJobMap = useMemo(() => {
    const map = {};
    candidaturas.forEach(app => {
      if (!map[app.jobId]) map[app.jobId] = [];
      map[app.jobId].push(app);
    });
    return map;
  }, [candidaturas]);

  // Alternar status ativo/inativo da vaga
  const handleToggleVaga = async (vagaId, currentStatus) => {
    try {
      const docRef = doc(db, 'vagas_oportunidades', vagaId);
      await updateDoc(docRef, { ativo: !currentStatus });
      showFeedback(`Vaga atualizada com sucesso!`);
      fetchData();
    } catch (err) {
      console.error("Erro ao alternar status da vaga:", err);
      showFeedback("Erro ao atualizar vaga.", "error");
    }
  };

  // Abrir modal de edição de vaga
  const handleOpenEdit = (vaga) => {
    setEditingVaga(vaga);
    setEditFormData({
      titulo: vaga.titulo || '',
      empresa_nome: vaga.empresa_nome || '',
      localizacao: vaga.localizacao || '',
      escala_trabalho: vaga.escala_trabalho || '',
      requisitos_tecnicos: Array.isArray(vaga.requisitos_tecnicos) ? vaga.requisitos_tecnicos.join(', ') : vaga.requisitos_tecnicos || '',
      descricao: vaga.descricao || ''
    });
  };

  // Gravar edição de vaga
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingVaga) return;
    setSavingVaga(true);
    try {
      const docRef = doc(db, 'vagas_oportunidades', editingVaga.id);
      const payload = {
        titulo: editFormData.titulo,
        empresa_nome: editFormData.empresa_nome,
        localizacao: editFormData.localizacao,
        escala_trabalho: editFormData.escala_trabalho,
        requisitos_tecnicos: editFormData.requisitos_tecnicos.split(',').map(s => s.trim()).filter(Boolean),
        descricao: editFormData.descricao
      };
      await updateDoc(docRef, payload);
      showFeedback("Vaga editada com sucesso!");
      setEditingVaga(null);
      fetchData();
    } catch (err) {
      console.error("Erro ao salvar vaga:", err);
      showFeedback("Erro ao salvar alterações da vaga.", "error");
    } finally {
      setSavingVaga(false);
    }
  };

  // Mudar status do candidato
  const handleUpdateCandidateStatus = async (appId, newStatus) => {
    setUpdatingAppId(appId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/match/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: appId, status: newStatus })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Erro na resposta do servidor');
      }
      showFeedback(`Status do candidato alterado para "${newStatus}" e notificado por e-mail!`);
      // Atualizar dados localmente nas listas
      fetchData();
      if (selectedVaga) {
        // Atualizar lista dentro do modal
        setSelectedVaga(prev => {
          return { ...prev };
        });
      }
    } catch (err) {
      console.error("Erro ao alterar status do candidato:", err);
      showFeedback("Erro ao alterar status.", "error");
    } finally {
      setUpdatingAppId(null);
    }
  };

  // Filtro de candidatos por vaga aberta
  const selectedVagaCandidatos = useMemo(() => {
    if (!selectedVaga) return [];
    const list = appsByJobMap[selectedVaga.id] || [];
    // Ordenar por afinidade (score descrescente)
    return [...list].sort((a, b) => b.score - a.score);
  }, [selectedVaga, appsByJobMap]);

  // Estatísticas do topo do painel
  const statsSummary = useMemo(() => {
    const activeJobs = vagas.filter(v => v.ativo).length;
    let totalCands = 0;
    let totalScore = 0;
    let appsCount = 0;

    vagas.forEach(v => {
      const apps = appsByJobMap[v.id] || [];
      totalCands += apps.length;
      apps.forEach(app => {
        totalScore += app.score || 0;
        appsCount++;
      });
    });

    return {
      activeJobs,
      totalCands,
      avgScore: appsCount > 0 ? (totalScore / appsCount).toFixed(1) : '85.0'
    };
  }, [vagas, appsByJobMap]);

  return (
    <div className="container" style={{ padding: '4rem 1rem', minHeight: 'calc(100vh - 80px)' }}>
      {/* Header */}
      <div className="agente-header" style={{
        background: 'linear-gradient(135deg, #004d5b 0%, #00a896 100%)',
        position: 'relative', overflow: 'hidden', marginBottom: '2rem'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontSize: '2.3rem', fontWeight: 800, marginBottom: '0.8rem', color: 'white' }}>
            🏢 Painel do Recrutador (Gupy Match)
          </h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.9, color: '#e0f2fe', margin: 0 }}>
            Gerencie suas oportunidades e filtre os candidatos por compatibilidade de inteligência artificial.
          </p>
        </div>
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{
            width: '45px', height: '45px', border: '3px solid #f3f3f3',
            borderTop: '3px solid #00a896', borderRadius: '50%',
            margin: '0 auto 1.5rem', animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Carregando dados das vagas e candidatos...</p>
        </div>
      ) : (
        <>
          {/* Métricas Cards */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem', marginBottom: '2.5rem'
          }}>
            <div className="card" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Vagas Ativas</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b' }}>{statsSummary.activeJobs} / {vagas.length}</div>
            </div>
            <div className="card" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Candidatos Inscritos</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#00a896' }}>{statsSummary.totalCands}</div>
            </div>
            <div className="card" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Compatibilidade Média</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#8b5cf6' }}>{statsSummary.avgScore}%</div>
            </div>
          </div>

          {vagas.length === 0 ? (
            <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', borderRadius: '20px', border: '1px solid #e2e8f0', background: 'white' }}>
              <div style={{ fontSize: '4.5rem', marginBottom: '1.5rem' }}>💼</div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.5rem' }}>Nenhuma vaga publicada</h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>
                Clique no botão "Sou Recrutador" na tela inicial e anuncie a primeira vaga da sua empresa!
              </p>
            </div>
          ) : (
            /* Lista de Vagas */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {vagas.map((vaga) => {
                const jobApps = appsByJobMap[vaga.id] || [];
                return (
                  <div key={vaga.id} style={{
                    background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px',
                    padding: '1.75rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between',
                    alignItems: 'center', gap: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                    opacity: vaga.ativo ? 1 : 0.7
                  }}>
                    <div style={{ flex: '1 1 300px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                          {vaga.titulo}
                        </h3>
                        <span style={{
                          background: vaga.ativo ? '#d1fae5' : '#fee2e2',
                          color: vaga.ativo ? '#065f46' : '#991b1b',
                          padding: '0.2rem 0.6rem', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700
                        }}>
                          {vaga.ativo ? 'Ativa' : 'Pausada'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0 0 0.5rem 0' }}>
                        📍 {vaga.localizacao} • 🔀 Regime: {vaga.escala_trabalho || 'remoto'}
                      </p>
                      {vaga.requisitos_tecnicos && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.75rem' }}>
                          {vaga.requisitos_tecnicos.slice(0, 5).map((req, i) => (
                            <span key={i} style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 500 }}>{req}</span>
                          ))}
                          {vaga.requisitos_tecnicos.length > 5 && (
                            <span style={{ fontSize: '0.75rem', color: '#64748b', alignSelf: 'center' }}>+{vaga.requisitos_tecnicos.length - 5}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Candidatos Counter */}
                    <div style={{
                      textAlign: 'center', background: '#f8fafc', padding: '0.75rem 1.25rem',
                      borderRadius: '12px', border: '1px solid #f1f5f9', minWidth: '110px'
                    }}>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#00a896' }}>{jobApps.length}</div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Candidatos</div>
                    </div>

                    {/* Ações */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button onClick={() => setSelectedVaga(vaga)} className="btn btn-primary" style={{
                        padding: '0.65rem 1.25rem', fontSize: '0.85rem', background: '#00a896', border: 'none'
                      }}>
                        👥 Ver Candidatos
                      </button>
                      <button onClick={() => handleOpenEdit(vaga)} className="btn btn-outline" style={{
                        padding: '0.65rem 1rem', fontSize: '0.85rem'
                      }}>
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleToggleVaga(vaga.id, vaga.ativo)}
                        className="btn btn-outline"
                        style={{
                          padding: '0.65rem 1rem', fontSize: '0.85rem',
                          color: vaga.ativo ? '#d97706' : '#059669',
                          borderColor: vaga.ativo ? '#fef3c7' : '#d1fae5'
                        }}
                      >
                        {vaga.ativo ? '⏸️ Pausar' : '▶️ Reativar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* MODAL: LISTAGEM DE CANDIDATOS (ESTILO GUPY) */}
      {selectedVaga && (
        <div className="overlay" onClick={() => setSelectedVaga(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{
            maxWidth: '900px', width: '95%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '2rem'
          }}>
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 className="section-title" style={{ fontSize: '1.4rem', margin: 0 }}>Candidatos Inscritos</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
                  Vaga: <strong>{selectedVaga.titulo}</strong>
                </p>
              </div>
              <button onClick={() => setSelectedVaga(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
              {selectedVagaCandidatos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
                  <h4>Nenhum candidato aplicado nesta vaga ainda.</h4>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {selectedVagaCandidatos.map((app) => (
                    <div key={app.id} style={{
                      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px',
                      padding: '1.25rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between',
                      alignItems: 'center', gap: '1rem', transition: 'border-color 0.2s'
                    }}>
                      <div style={{ flex: '1 1 250px' }}>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.25rem 0' }}>
                          {app.userFullName}
                        </h4>
                        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                          📧 {app.userEmail}
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.78rem' }}>
                          <span style={{ color: '#00a896', fontWeight: 600 }}>
                            🎯 Match IA: {app.score}%
                          </span>
                          <span style={{ color: '#64748b' }}>
                            📅 Inscrito em: {app.appliedAt?.toDate ? app.appliedAt.toDate().toLocaleDateString('pt-BR') : new Date(app.appliedAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>

                      {/* Status / Ação Gupy */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <a href={app.resumeUrl} target="_blank" rel="noreferrer" className="btn btn-outline" style={{
                          padding: '0.5rem 0.75rem', fontSize: '0.8rem', textDecoration: 'none', background: 'white'
                        }}>
                          Visualizar Currículo
                        </a>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Etapa:</label>
                          <select
                            value={app.status || 'pendente'}
                            disabled={updatingAppId === app.id}
                            onChange={(e) => handleUpdateCandidateStatus(app.id, e.target.value)}
                            style={{
                              padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                              fontSize: '0.8rem', fontWeight: 600, background: 'white', color: '#1e293b', cursor: 'pointer'
                            }}
                          >
                            <option value="pendente">📥 Recebido</option>
                            <option value="analisando">🔍 Em Análise</option>
                            <option value="aceito">✅ Aprovado</option>
                            <option value="rejeitado">❌ Finalizado</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => setSelectedVaga(null)} className="btn btn-outline" style={{ width: '100%', marginTop: '1.5rem', padding: '0.75rem' }}>
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* MODAL: EDIÇÃO DE VAGA */}
      {editingVaga && (
        <div className="overlay" onClick={() => setEditingVaga(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{
            maxWidth: '650px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem'
          }}>
            <h2 className="section-title" style={{ fontSize: '1.35rem', marginBottom: '1.5rem' }}>✏️ Editar Detalhes da Vaga</h2>
            
            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Título da Vaga *</label>
                  <input required type="text" className="form-input" value={editFormData.titulo} onChange={e => setEditFormData({...editFormData, titulo: e.target.value})} style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ddd' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Empresa *</label>
                  <input required type="text" className="form-input" value={editFormData.empresa_nome} onChange={e => setEditFormData({...editFormData, empresa_nome: e.target.value})} style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ddd' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Localização *</label>
                  <input required type="text" className="form-input" value={editFormData.localizacao} onChange={e => setEditFormData({...editFormData, localizacao: e.target.value})} style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ddd' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Regime de Trabalho *</label>
                  <select required className="form-input" value={editFormData.escala_trabalho} onChange={e => setEditFormData({...editFormData, escala_trabalho: e.target.value})} style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ddd', height: '40px' }}>
                    <option value="remoto">🌐 Remoto</option>
                    <option value="hibrido">🔀 Híbrido</option>
                    <option value="5x2">🏢 Presencial 5x2</option>
                    <option value="6x1">🏢 Presencial 6x1</option>
                    <option value="outra">📋 Outra</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Requisitos Técnicos (separados por vírgula) *</label>
                <input required type="text" className="form-input" value={editFormData.requisitos_tecnicos} onChange={e => setEditFormData({...editFormData, requisitos_tecnicos: e.target.value})} style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ddd' }} />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Descrição detalhada da Vaga</label>
                <textarea className="form-input" rows={4} value={editFormData.descricao} onChange={e => setEditFormData({...editFormData, descricao: e.target.value})} style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ddd', resize: 'vertical' }} />
              </div>

              <button type="submit" className="btn btn-primary" disabled={savingVaga} style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', background: '#00a896', border: 'none' }}>
                {savingVaga ? 'Salvando alterações...' : '💾 Salvar Alterações'}
              </button>
            </form>
            <button onClick={() => setEditingVaga(null)} className="btn btn-outline" style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem' }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecrutadorDashboard;
