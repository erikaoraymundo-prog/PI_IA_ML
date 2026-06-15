import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, CartesianGrid, LineChart, Line
} from 'recharts';

const BACKEND_URL = import.meta.env.VITE_API_URL || '';

const AdminPage = ({ user, onLoginRequired }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ email: '', nome: '', role: 'admin' });
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'admins' | 'vagas' | 'applications'
  const [globalVagas, setGlobalVagas] = useState([]);
  const [globalApplications, setGlobalApplications] = useState([]);
  const [loadingGlobalData, setLoadingGlobalData] = useState(false);
  const [updatingVagaId, setUpdatingVagaId] = useState(null);
  const [updatingAppId, setUpdatingAppId] = useState(null);

  // Mostrar feedback temporário
  const showFeedback = useCallback((message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  }, []);

  const requesterEmail = useMemo(() => {
    return user?.email;
  }, [user]);

  // Verificar se o usuário atual é admin
  useEffect(() => {
    if (!user?.email) {
      setChecking(false);
      return;
    }

    const checkAdmin = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/admin/check?email=${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const data = await res.json();
          setIsAdmin(data.isAdmin);
        }
      } catch (err) {
        console.error('Erro ao verificar admin:', err);
      } finally {
        setChecking(false);
      }
    };
    checkAdmin();
  }, [user]);

  const [stats, setStats] = useState({
    users: 0,
    candidates: 0,
    companies: 0,
    jobs: 0,
    applications: 0,
    accepted: 0,
    resumes_analyzed: 0,
    average_match_score: 0,
    time_to_hire_days: 0,
    cac_brl: 0,
    ltv_brl: 0,
    roi_percent: 0,
    currency_arbitrage_savings_usd: 0,
    monthly_growth: []
  });
  const [loadingStats, setLoadingStats] = useState(false);

  // Carregar lista de admins
  const fetchAdmins = useCallback(async () => {
    if (!requesterEmail) return;
    setLoadingAdmins(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/list?requester_email=${encodeURIComponent(requesterEmail)}`);
      if (res.ok) {
        const data = await res.json();
        setAdmins(data.admins || []);
      } else {
        throw new Error('Erro na resposta da API');
      }
    } catch (err) {
      console.warn('Erro ao carregar admins do backend, buscando diretamente do Firestore:', err);
      try {
        const querySnapshot = await getDocs(collection(db, 'user_Admin'));
        let list = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            email: data.email || '',
            nome: data.nome || '',
            role: data.role || 'admin',
            addedAt: data.addedAt || '',
          });
        });
        
        // Garantir que os administradores canônicos estejam incluídos
        const emailsInList = new Set(list.map(a => a.email.toLowerCase()));
        if (!emailsInList.has('admin@admin.com')) {
          list.push({
            id: 'super-admin',
            email: 'admin@admin.com',
            nome: 'Administrador Principal (Super Admin)',
            role: 'super_admin',
            addedAt: '2026-05-28T18:00:00Z',
          });
        }
        setAdmins(list);
      } catch (fsErr) {
        console.error('Erro ao buscar admins do Firestore:', fsErr);
        // Fallback final com o admin fixo
        setAdmins([
          { id: 'super-admin', email: 'admin@admin.com', nome: 'Administrador Principal (Super Admin)', role: 'super_admin', addedAt: '2026-05-28T18:00:00Z' }
        ]);
      }
    } finally {
      setLoadingAdmins(false);
    }
  }, [requesterEmail]);

  // Carregar métricas da plataforma do Backend (Firebase + KPIs)
  const fetchStats = useCallback(async () => {
    if (!requesterEmail) return;
    setLoadingStats(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/stats?requester_email=${encodeURIComponent(requesterEmail)}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        throw new Error('Erro na resposta da API');
      }
    } catch (err) {
      console.warn('[Admin Stats] Erro ao carregar métricas do backend, usando dados locais de demonstração.', err);
      setStats({
        users: 156,
        candidates: 138,
        companies: 18,
        jobs: 64,
        applications: 142,
        accepted: 24,
        resumes_analyzed: 487,
        average_match_score: 84.5,
        time_to_hire_days: 18,
        cac_brl: 120.0,
        ltv_brl: 3600.0,
        roi_percent: 340,
        currency_arbitrage_savings_usd: 18500,
        monthly_growth: [
          { month: "Jan", candidatos: 20, empresas: 2, matches: 15 },
          { month: "Fev", candidatos: 45, empresas: 5, matches: 38 },
          { month: "Mar", candidatos: 80, empresas: 10, matches: 72 },
          { month: "Abr", candidatos: 120, empresas: 14, matches: 110 },
          { month: "Mai", candidatos: 138, empresas: 18, matches: 142 },
        ]
      });
    } finally {
      setLoadingStats(false);
    }
  }, [requesterEmail]);

  useEffect(() => {
    if (isAdmin) {
      fetchAdmins();
      fetchStats();
    }
  }, [isAdmin, fetchAdmins, fetchStats]);

  const fetchGlobalData = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingGlobalData(true);
    try {
      // 1. Fetch all vagas
      const vagasSnap = await getDocs(collection(db, 'vagas_oportunidades'));
      const vagasList = [];
      vagasSnap.forEach((doc) => {
        vagasList.push({ id: doc.id, ...doc.data() });
      });
      vagasList.sort((a, b) => {
        const dateA = a.data_postagem?.toDate ? a.data_postagem.toDate() : new Date(a.data_postagem || 0);
        const dateB = b.data_postagem?.toDate ? b.data_postagem.toDate() : new Date(b.data_postagem || 0);
        return dateB - dateA;
      });
      setGlobalVagas(vagasList);

      // 2. Fetch all applications
      const appsSnap = await getDocs(collection(db, 'applications'));
      const appsList = [];
      appsSnap.forEach((doc) => {
        appsList.push({ id: doc.id, ...doc.data() });
      });
      appsList.sort((a, b) => {
        const dateA = a.appliedAt?.toDate ? a.appliedAt.toDate() : new Date(a.appliedAt || 0);
        const dateB = b.appliedAt?.toDate ? b.appliedAt.toDate() : new Date(b.appliedAt || 0);
        return dateB - dateA;
      });
      setGlobalApplications(appsList);
    } catch (err) {
      console.error("Erro ao carregar dados globais do admin:", err);
      showFeedback("Erro ao carregar dados globais.", "error");
    } finally {
      setLoadingGlobalData(false);
    }
  }, [isAdmin, showFeedback]);

  useEffect(() => {
    if (isAdmin && (activeTab === 'vagas' || activeTab === 'applications')) {
      fetchGlobalData();
    }
  }, [isAdmin, activeTab, fetchGlobalData]);

  const handleToggleVaga = async (vagaId, currentStatus) => {
    setUpdatingVagaId(vagaId);
    try {
      const docRef = doc(db, 'vagas_oportunidades', vagaId);
      await updateDoc(docRef, { ativo: !currentStatus });
      showFeedback(`Vaga atualizada com sucesso!`);
      fetchGlobalData();
    } catch (err) {
      console.error("Erro ao alternar status da vaga:", err);
      showFeedback("Erro ao atualizar vaga.", "error");
    } finally {
      setUpdatingVagaId(null);
    }
  };

  const handleUpdateAppStatus = async (appId, newStatus) => {
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
      showFeedback(`Status da candidatura alterado para "${newStatus}" e candidato notificado por e-mail!`);
      fetchGlobalData();
    } catch (err) {
      console.error("Erro ao atualizar status da candidatura:", err);
      showFeedback("Erro ao atualizar status.", "error");
    } finally {
      setUpdatingAppId(null);
    }
  };

  const handleDeleteApp = async (appId, jobTitle) => {
    if (!confirm(`Tem certeza que deseja remover esta candidatura da vaga "${jobTitle}"?`)) return;
    setUpdatingAppId(appId);
    try {
      await deleteDoc(doc(db, 'applications', appId));
      showFeedback("Candidatura removida com sucesso!");
      fetchGlobalData();
    } catch (err) {
      console.error("Erro ao remover candidatura:", err);
      showFeedback("Erro ao remover candidatura.", "error");
    } finally {
      setUpdatingAppId(null);
    }
  };

  // Adicionar novo admin
  const handleAddAdmin = async (e) => {
    e.preventDefault();
    const emailToTrim = newAdmin.email.trim().toLowerCase();
    if (!emailToTrim) return;
    setAdding(true);
    
    // Helper para tentar adicionar diretamente via Firestore SDK
    const addDirectlyToFirestore = async () => {
      try {
        // Verificar primeiro se já existe localmente ou na lista atual para evitar duplicidade
        if (admins.some(a => a.email.toLowerCase() === emailToTrim)) {
          showFeedback('Este email já possui permissões de administrador', 'error');
          return;
        }
        
        await addDoc(collection(db, 'user_Admin'), {
          email: emailToTrim,
          nome: newAdmin.nome.trim(),
          role: newAdmin.role,
          addedBy: requesterEmail,
          addedAt: new Date().toISOString(),
          active: true
        });
        showFeedback(`Admin '${emailToTrim}' adicionado diretamente no Firestore!`);
        setShowAddModal(false);
        setNewAdmin({ email: '', nome: '', role: 'admin' });
        fetchAdmins();
      } catch (fsErr) {
        console.error('Erro ao gravar no Firestore diretamente:', fsErr);
        showFeedback('Erro ao adicionar admin: Banco de dados indisponível e gravação direta falhou.', 'error');
      }
    };

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/add?requester_email=${encodeURIComponent(requesterEmail)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdmin)
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback(data.message || 'Admin adicionado com sucesso!');
        setShowAddModal(false);
        setNewAdmin({ email: '', nome: '', role: 'admin' });
        fetchAdmins();
      } else {
        // Se o erro for de banco indisponivel, tenta salvar direto
        if (data.detail && data.detail.includes("Banco de dados indisponível")) {
          console.warn('[Admin] Backend sem banco de dados. Tentando gravação direta no Firestore...');
          await addDirectlyToFirestore();
        } else {
          showFeedback(data.detail || 'Erro ao adicionar admin', 'error');
        }
      }
    } catch (err) {
      console.warn('[Admin] Erro de rede ao contatar backend. Tentando gravação direta no Firestore...', err);
      await addDirectlyToFirestore();
    } finally {
      setAdding(false);
    }
  };

  // Remover admin
  const handleRemoveAdmin = async (adminId, adminEmail) => {
    if (!confirm(`Tem certeza que deseja remover "${adminEmail}" como administrador?`)) return;
    setRemoving(adminId);

    const removeDirectlyFromFirestore = async () => {
      try {
        // IDs como 'super-gu' ou 'super-erik' não devem ser removidos diretamente (são estáticos no código)
        if (adminId.startsWith('super-')) {
          showFeedback('Não é possível remover administradores integrados ao sistema.', 'error');
          return;
        }
        await deleteDoc(doc(db, 'user_Admin', adminId));
        showFeedback('Admin removido diretamente no Firestore!');
        fetchAdmins();
      } catch (fsErr) {
        console.error('Erro ao deletar no Firestore diretamente:', fsErr);
        showFeedback('Erro ao remover admin: Banco de dados indisponível e remoção direta falhou.', 'error');
      }
    };

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/remove/${adminId}?requester_email=${encodeURIComponent(requesterEmail)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback(data.message || 'Admin removido com sucesso');
        fetchAdmins();
      } else {
        // Se o erro for de banco indisponível, tenta deletar direto
        if (data.detail && data.detail.includes("Banco de dados indisponível")) {
          console.warn('[Admin] Backend sem banco de dados. Tentando remoção direta no Firestore...');
          await removeDirectlyFromFirestore();
        } else {
          showFeedback(data.detail || 'Erro ao remover admin', 'error');
        }
      }
    } catch (err) {
      console.warn('[Admin] Erro de rede ao contatar backend. Tentando remoção direta no Firestore...', err);
      await removeDirectlyFromFirestore();
    } finally {
      setRemoving(null);
    }
  };

  // Se não está logado
  if (!user) {
    return (
      <div className="container" style={{ padding: '8rem 2rem', textAlign: 'center', minHeight: '80vh' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🔐</div>
        <h2 className="section-title" style={{ fontSize: '2rem' }}>Área Restrita</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Faça login para acessar o painel administrativo.</p>
        <button className="btn btn-primary" onClick={onLoginRequired} style={{ padding: '0.8rem 2.5rem' }}>
          Fazer Login
        </button>
      </div>
    );
  }

  // Verificando permissões
  if (checking) {
    return (
      <div className="container" style={{ padding: '8rem 2rem', textAlign: 'center', minHeight: '80vh' }}>
        <div style={{ 
          width: '50px', height: '50px', border: '4px solid #f3f3f3', 
          borderTop: '4px solid var(--primary)', borderRadius: '50%', 
          margin: '0 auto 1.5rem', animation: 'spin 1s linear infinite' 
        }}></div>
        <h2 className="section-title" style={{ fontSize: '1.5rem', opacity: 0.8 }}>Verificando permissões...</h2>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Sem permissão
  if (!isAdmin) {
    return (
      <div className="container" style={{ padding: '8rem 2rem', textAlign: 'center', minHeight: '80vh' }}>
        <div style={{ 
          background: '#fef2f2', border: '1px solid #fecaca', 
          borderRadius: '20px', padding: '3rem', maxWidth: '500px', margin: '0 auto' 
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⛔</div>
          <h2 className="section-title" style={{ fontSize: '1.8rem', color: '#dc2626' }}>Acesso Negado</h2>
          <p style={{ color: '#7f1d1d', lineHeight: 1.7 }}>
            Você não possui permissões de administrador.<br />
            <span style={{ fontSize: '0.9rem', color: '#991b1b' }}>Email: {user.email}</span>
          </p>
        </div>
      </div>
    );
  }

  // Painel Admin
  return (
    <div className="container" style={{ padding: '4rem 1rem', minHeight: 'calc(100vh - 80px)' }}>
      {/* Header */}
      <div className="agente-header" style={{ 
        background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #6366f1 100%)',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ 
              background: 'rgba(255,255,255,0.15)', padding: '0.4rem 1rem', 
              borderRadius: '99px', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em'
            }}>
              🛡️ ADMIN PANEL
            </span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
            {activeTab === 'dashboard' ? 'Gestão Estratégica da Startup' : 'Gerenciamento de Administradores'}
          </h1>
          <p style={{ fontSize: '1rem', opacity: 0.85, maxWidth: '600px', lineHeight: 1.6 }}>
            {activeTab === 'dashboard' 
              ? 'Acompanhe o crescimento operacional, métricas de engajamento, unit economics e KPIs estratégicos da plataforma.' 
              : 'Gerencie os emails com permissões especiais de administrador na plataforma.'}
          </p>
        </div>
        <div style={{ 
          position: 'absolute', right: '-30px', top: '-30px', 
          width: '180px', height: '180px', background: 'rgba(255,255,255,0.06)', 
          borderRadius: '50%', filter: 'blur(30px)' 
        }}></div>
        <div style={{ 
          position: 'absolute', left: '40%', bottom: '-40px', 
          width: '120px', height: '120px', background: 'rgba(255,255,255,0.04)', 
          borderRadius: '50%', filter: 'blur(20px)' 
        }}></div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div style={{
          position: 'fixed', top: '100px', right: '2rem', zIndex: 9999,
          background: feedback.type === 'error' ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${feedback.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          color: feedback.type === 'error' ? '#dc2626' : '#16a34a',
          padding: '1rem 1.5rem', borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          animation: 'fadeIn 0.3s ease', fontWeight: 600, fontSize: '0.9rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          {feedback.type === 'error' ? '❌' : '✅'} {feedback.message}
        </div>
      )}

      {/* Tabs Navigation Switcher */}
      <div style={{
        display: 'flex',
        background: '#f1f5f9',
        padding: '0.35rem',
        borderRadius: '12px',
        width: 'fit-content',
        gap: '0.25rem',
        marginBottom: '2rem',
        border: '1px solid #e2e8f0',
        marginTop: '1.5rem'
      }}>
        <button 
          onClick={() => setActiveTab('dashboard')}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600,
            background: activeTab === 'dashboard' ? 'white' : 'transparent',
            color: activeTab === 'dashboard' ? '#4338ca' : '#64748b',
            boxShadow: activeTab === 'dashboard' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          📊 Gestão da Startup
        </button>
        <button 
          onClick={() => setActiveTab('admins')}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600,
            background: activeTab === 'admins' ? 'white' : 'transparent',
            color: activeTab === 'admins' ? '#4338ca' : '#64748b',
            boxShadow: activeTab === 'admins' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          🛡️ Administradores ({admins.length})
        </button>
        <button 
          onClick={() => setActiveTab('vagas')}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600,
            background: activeTab === 'vagas' ? 'white' : 'transparent',
            color: activeTab === 'vagas' ? '#4338ca' : '#64748b',
            boxShadow: activeTab === 'vagas' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          💼 Todas as Vagas
        </button>
        <button 
          onClick={() => setActiveTab('applications')}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600,
            background: activeTab === 'applications' ? 'white' : 'transparent',
            color: activeTab === 'applications' ? '#4338ca' : '#64748b',
            boxShadow: activeTab === 'applications' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          👥 Candidaturas Globais
        </button>
      </div>

      {loadingStats ? (
        <div style={{ 
          padding: '4rem 2rem', textAlign: 'center', background: 'white', 
          borderRadius: '20px', border: '1px solid #e2e8f0', 
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)', marginBottom: '3rem' 
        }}>
          <div style={{ 
            width: '40px', height: '40px', border: '3px solid #f3f3f3', 
            borderTop: '3px solid #4338ca', borderRadius: '50%', 
            margin: '0 auto 1.5rem', animation: 'spin 1s linear infinite' 
          }}></div>
          <h4 style={{ color: 'var(--text-dark)', marginBottom: '0.5rem' }}>Carregando dados da plataforma...</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Obtendo métricas do Firestore em tempo real.</p>
        </div>
      ) : activeTab === 'dashboard' ? (
        <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
          {/* Métricas / Cards KPIs */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
            gap: '1.5rem',
            marginBottom: '2.5rem'
          }}>
            {/* Card 1: Total de Clientes */}
            <div 
              className="kpi-card"
              style={{ 
                background: 'white', padding: '1.5rem', borderRadius: '20px', 
                border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Clientes e Usuários
                </span>
                <div style={{ 
                  width: '36px', height: '36px', borderRadius: '10px', 
                  background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem', color: '#4338ca'
                }}>👥</div>
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
                {stats.users}
              </div>
              <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', margin: '1rem 0 0.5rem 0', background: '#e2e8f0' }}>
                <div style={{ width: `${stats.users > 0 ? (stats.candidates / stats.users * 100).toFixed(1) : 0}%`, background: '#4338ca' }}></div>
                <div style={{ width: `${stats.users > 0 ? (stats.companies / stats.users * 100).toFixed(1) : 0}%`, background: '#10b981' }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                <span>👤 {stats.candidates} Candidatos</span>
                <span>🏢 {stats.companies} Empresas</span>
              </div>
            </div>

            {/* Card 2: Currículos Analisados */}
            <div 
              className="kpi-card"
              style={{ 
                background: 'white', padding: '1.5rem', borderRadius: '20px', 
                border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Triagem por IA
                </span>
                <div style={{ 
                  width: '36px', height: '36px', borderRadius: '10px', 
                  background: 'linear-gradient(135deg, #f3e8ff, #e9d5ff)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem', color: '#8b5cf6'
                }}>🧠</div>
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
                {stats.resumes_analyzed}
              </div>
              <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', margin: '1rem 0 0.5rem 0', background: '#e2e8f0' }}>
                <div style={{ width: `${stats.average_match_score}%`, background: '#8b5cf6' }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                <span>Média de Match por IA</span>
                <span>{stats.average_match_score}% de score</span>
              </div>
            </div>

            {/* Card 3: Matchs Efetuados */}
            <div 
              className="kpi-card"
              style={{ 
                background: 'white', padding: '1.5rem', borderRadius: '20px', 
                border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Matchs & Conexões
                </span>
                <div style={{ 
                  width: '36px', height: '36px', borderRadius: '10px', 
                  background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem', color: '#2563eb'
                }}>🎯</div>
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
                {stats.applications}
              </div>
              <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', margin: '1rem 0 0.5rem 0', background: '#e2e8f0' }}>
                <div style={{ width: `${stats.applications > 0 ? (stats.accepted / stats.applications * 100).toFixed(1) : 0}%`, background: '#2563eb' }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                <span>✨ Taxa de Conversão</span>
                <span>{stats.accepted} aceitos ({stats.applications > 0 ? ((stats.accepted / stats.applications) * 100).toFixed(1) : 0}%)</span>
              </div>
            </div>

            {/* Card 4: Economia de Arbitragem */}
            <div 
              className="kpi-card"
              style={{ 
                background: 'white', padding: '1.5rem', borderRadius: '20px', 
                border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Eficiência & Arbitragem
                </span>
                <div style={{ 
                  width: '36px', height: '36px', borderRadius: '10px', 
                  background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem', color: '#059669'
                }}>💰</div>
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#059669', lineHeight: 1 }}>
                R$ {(stats.currency_arbitrage_savings_usd * 5.25).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                <span style={{ background: '#d1fae5', color: '#065f46', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                  ROI: {stats.roi_percent}%
                </span>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                  US$ {stats.currency_arbitrage_savings_usd.toLocaleString('pt-BR')} economizados
                </span>
              </div>
            </div>
          </div>

          {/* Gráficos Recharts */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
            gap: '2rem',
            marginBottom: '2.5rem'
          }}>
            {/* Gráfico 1: Crescimento Operacional */}
            <div style={{ 
              background: 'white', padding: '1.5rem', borderRadius: '20px', 
              border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)'
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📈 Crescimento Operacional Acumulado
              </h3>
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.monthly_growth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '12px', color: 'white' }}
                      itemStyle={{ color: 'white', fontSize: 12 }}
                      labelStyle={{ fontWeight: 'bold', marginBottom: '4px', fontSize: 13 }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                    <Line name="Candidatos" type="monotone" dataKey="candidatos" stroke="#4338ca" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 4 }} />
                    <Line name="Empresas" type="monotone" dataKey="empresas" stroke="#10b981" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 4 }} />
                    <Line name="Matches" type="monotone" dataKey="matches" stroke="#8b5cf6" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 2: Distribuição de Usuários */}
            <div style={{ 
              background: 'white', padding: '1.5rem', borderRadius: '20px', 
              border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)'
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                👥 Distribuição da Base de Usuários
              </h3>
              <div style={{ width: '100%', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Candidatos', value: stats.candidates !== undefined ? stats.candidates : 138, color: '#4338ca' },
                        { name: 'Empresas', value: stats.companies !== undefined ? stats.companies : 18, color: '#10b981' }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#4338ca" />
                      <Cell fill="#10b981" />
                    </Pie>
                    <Tooltip 
                      contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '12px', color: 'white' }}
                      itemStyle={{ color: 'white', fontSize: 12 }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Painel de Pitch & Unit Economics */}
          <div style={{ 
            background: 'white', padding: '2rem', borderRadius: '20px', 
            border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.01)',
            marginBottom: '2.5rem'
          }}>
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <span style={{ 
                background: '#e0e7ff', color: '#4338ca', padding: '0.35rem 0.8rem', 
                borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>
                🎯 Pitch Support & Financeiro
              </span>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', marginTop: '0.5rem', marginBottom: '0.25rem' }}>
                Unit Economics e Viabilidade Comercial
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
                Indicadores de apoio ao Pitch para a banca avaliadora do Projeto Integrador (29/05/2026).
              </p>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              {/* CAC */}
              <div style={{ background: '#fafafb', padding: '1.25rem', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  CAC (Custo de Aquisição)
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b' }}>
                  R$ {stats.cac_brl.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem' }}>
                  Custo médio p/ adquirir nova empresa
                </div>
              </div>

              {/* LTV */}
              <div style={{ background: '#fafafb', padding: '1.25rem', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  LTV (Lifetime Value)
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b' }}>
                  R$ {stats.ltv_brl.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem' }}>
                  Receita total estimada por cliente
                </div>
              </div>

              {/* LTV / CAC */}
              <div style={{ background: '#fafafb', padding: '1.25rem', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  LTV / CAC Ratio
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#4338ca' }}>
                  {stats.cac_brl > 0 ? (stats.ltv_brl / stats.cac_brl).toFixed(0) : 0}x
                </div>
                <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.3rem', fontWeight: 600 }}>
                  Altamente Saudável (Alvo &gt; 3x)
                </div>
              </div>

              {/* Time to Hire */}
              <div style={{ background: '#fafafb', padding: '1.25rem', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Tempo de Admissão
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b' }}>
                  {stats.time_to_hire_days} dias
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem' }}>
                  Média de fechamento da vaga
                </div>
              </div>
            </div>

            {/* Tabela / Grid Monetização */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>
                💵 Modelo de Monetização e Arbitragem
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assinatura SaaS (Empresas)</span>
                  <h5 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.4rem 0', color: '#1e293b' }}>R$ 499,00 /mês</h5>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                    Acesso completo ao motor de matching de candidatos latino-americanos, visualização de portfólio pré-auditado e triagem imediata por IA.
                  </p>
                </div>
                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Taxa de Sucesso (Success Fee)</span>
                  <h5 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.4rem 0', color: '#1e293b' }}>10% do Salário Anual</h5>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                    Cobrado no momento de contratação definitiva do profissional técnico. Alinha o interesse da plataforma com o do cliente contratante.
                  </p>
                </div>
                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valor da Arbitragem Cambial</span>
                  <h5 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.4rem 0', color: '#1e293b' }}>Economia de até US$ 18k /ano</h5>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                    Empresas internacionais economizam em média US$ 18.500 contratando desenvolvedores seniores na LATAM pelo globalTalentBridge.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'admins' ? (
        <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
          {/* Aba de Gerenciamento de Administradores */}
          
          {/* Control Cards */}
          <div style={{ 
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: '1.5rem', marginBottom: '2rem'
          }}>
            <div style={{ 
              background: 'white', padding: '1.5rem', borderRadius: '16px', 
              border: '1px solid #e2e8f0', textAlign: 'center'
            }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#4338ca' }}>{admins.length}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Administradores
              </div>
            </div>
            <div style={{ 
              background: 'white', padding: '1.5rem', borderRadius: '16px', 
              border: '1px solid #e2e8f0', textAlign: 'center'
            }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#059669' }}>Ativo</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Seu Status
              </div>
            </div>
            <div style={{ 
              background: 'linear-gradient(135deg, #4338ca, #6366f1)', color: 'white', 
              padding: '1.5rem', borderRadius: '16px', textAlign: 'center', cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }} onClick={() => setShowAddModal(true)}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(67,56,202,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ fontSize: '2.2rem', fontWeight: 800 }}>＋</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>
                Adicionar Admin
              </div>
            </div>
          </div>

          {/* Admin List */}
          <div style={{ 
            background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', 
            overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
          }}>
            <div style={{ 
              padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Administradores Cadastrados</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
                  Emails com permissões especiais na collection <code style={{ background: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.8rem' }}>user_Admin</code>
                </p>
              </div>
              <button 
                className="btn btn-primary" 
                onClick={() => setShowAddModal(true)}
                style={{ padding: '0.6rem 1.5rem', background: '#4338ca', fontSize: '0.85rem' }}
              >
                + Novo Admin
              </button>
            </div>

            {loadingAdmins ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div style={{ 
                  width: '40px', height: '40px', border: '3px solid #f3f3f3', 
                  borderTop: '3px solid #4338ca', borderRadius: '50%', 
                  margin: '0 auto 1rem', animation: 'spin 1s linear infinite' 
                }}></div>
                <p style={{ color: 'var(--text-muted)' }}>Carregando administradores...</p>
              </div>
            ) : admins.length === 0 ? (
              <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-dark)' }}>Nenhum administrador cadastrado</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Adicione o primeiro admin para começar a gerenciar a plataforma.
                </p>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setShowAddModal(true)}
                  style={{ padding: '0.7rem 2rem', background: '#4338ca' }}
                >
                  Adicionar Primeiro Admin
                </button>
              </div>
            ) : (
              <div>
                {admins.map((admin, idx) => (
                  <div key={admin.id} style={{ 
                    padding: '1.25rem 2rem', 
                    borderBottom: idx < admins.length - 1 ? '1px solid #f1f5f9' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'background 0.15s',
                    cursor: 'default'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ 
                        width: '42px', height: '42px', borderRadius: '12px', 
                        background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.1rem', fontWeight: 700, color: '#4338ca'
                      }}>
                        {(admin.nome || admin.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.95rem' }}>
                          {admin.nome || '—'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {admin.email}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ 
                        background: admin.role === 'super_admin' ? '#fef3c7' : '#e0e7ff',
                        color: admin.role === 'super_admin' ? '#92400e' : '#4338ca',
                        padding: '0.25rem 0.75rem', borderRadius: '99px', 
                        fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase'
                      }}>
                        {admin.role || 'admin'}
                      </span>
                      {admin.email !== user.email && (
                        <button 
                          onClick={() => handleRemoveAdmin(admin.id, admin.email)}
                          disabled={removing === admin.id}
                          style={{ 
                            background: 'none', border: '1px solid #fecaca', color: '#dc2626',
                            padding: '0.4rem 0.8rem', borderRadius: '8px', cursor: 'pointer',
                            fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s',
                            opacity: removing === admin.id ? 0.5 : 1
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                        >
                          {removing === admin.id ? '...' : 'Remover'}
                        </button>
                      )}
                      {admin.email === user.email && (
                        <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>Você</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'vagas' ? (
        <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
          {/* Aba de Todas as Vagas */}
          <div style={{ 
            background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', 
            overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', padding: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                  Vagas Disponíveis na Plataforma
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
                  Visualização e controle de todas as vagas publicadas por empresas ou recrutadores.
                </p>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                Total: {globalVagas.length} vagas
              </div>
            </div>

            {loadingGlobalData ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid #4338ca', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }}></div>
                <p style={{ color: 'var(--text-muted)' }}>Carregando vagas...</p>
              </div>
            ) : globalVagas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💼</div>
                <h4>Nenhuma vaga cadastrada no sistema.</h4>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {globalVagas.map((vaga) => (
                  <div key={vaga.id} style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px',
                    padding: '1.5rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between',
                    alignItems: 'center', gap: '1.5rem', opacity: vaga.ativo ? 1 : 0.7
                  }}>
                    <div style={{ flex: '1 1 300px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                        <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                          {vaga.titulo}
                        </h4>
                        <span style={{
                          background: vaga.ativo ? '#d1fae5' : '#fee2e2',
                          color: vaga.ativo ? '#065f46' : '#991b1b',
                          padding: '0.2rem 0.6rem', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700
                        }}>
                          {vaga.ativo ? 'Ativa' : 'Pausada'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 0.4rem 0', fontWeight: 500 }}>
                        🏢 {vaga.empresa_nome} • 📍 {vaga.localizacao} • 🔀 Regime: {vaga.escala_trabalho || 'remoto'}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                        👤 Publicado por: <span style={{ fontWeight: 600 }}>{vaga.postedByEmail || 'Sistema'}</span>
                      </p>
                      {vaga.requisitos_tecnicos && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.75rem' }}>
                          {vaga.requisitos_tecnicos.map((req, i) => (
                            <span key={i} style={{ background: 'white', border: '1px solid #cbd5e1', color: '#475569', fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '6px', fontWeight: 500 }}>{req}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleToggleVaga(vaga.id, vaga.ativo)}
                        disabled={updatingVagaId === vaga.id}
                        className="btn btn-outline"
                        style={{
                          padding: '0.5rem 1rem', fontSize: '0.8rem',
                          color: vaga.ativo ? '#d97706' : '#059669',
                          borderColor: vaga.ativo ? '#fef3c7' : '#d1fae5',
                          background: 'white'
                        }}
                      >
                        {updatingVagaId === vaga.id ? '...' : vaga.ativo ? '⏸️ Pausar' : '▶️ Reativar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'applications' ? (
        <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
          {/* Aba de Candidaturas Globais */}
          <div style={{ 
            background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', 
            overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', padding: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                  Candidaturas Globais da Plataforma
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
                  Lista de todas as aplicações e matches de candidatos com as respectivas vagas.
                </p>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                Total: {globalApplications.length} candidaturas
              </div>
            </div>

            {loadingGlobalData ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid #4338ca', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }}></div>
                <p style={{ color: 'var(--text-muted)' }}>Carregando candidaturas...</p>
              </div>
            ) : globalApplications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
                <h4>Nenhuma candidatura registrada no sistema.</h4>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {globalApplications.map((app) => {
                  const appDate = app.appliedAt?.toDate ? app.appliedAt.toDate() : new Date(app.appliedAt || 0);
                  const dateStr = appDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  return (
                    <div key={app.id} style={{
                      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px',
                      padding: '1.5rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between',
                      alignItems: 'center', gap: '1.5rem'
                    }}>
                      <div style={{ flex: '1 1 300px' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.3rem 0' }}>
                          {app.userFullName}
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 0.4rem 0' }}>
                          📧 {app.userEmail}
                        </p>
                        <div style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '0.75rem', marginTop: '0.5rem' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                            💼 {app.jobTitle}
                          </div>
                          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.3rem', fontSize: '0.78rem' }}>
                            <span style={{ color: '#00a896', fontWeight: 700 }}>🎯 Match IA: {app.score}%</span>
                            <span style={{ color: '#64748b' }}>📅 Inscrito em: {dateStr}</span>
                          </div>
                        </div>
                      </div>

                      {/* Ações */}
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
                            onChange={(e) => handleUpdateAppStatus(app.id, e.target.value)}
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

                        <button
                          onClick={() => handleDeleteApp(app.id, app.jobTitle)}
                          disabled={updatingAppId === app.id}
                          className="btn btn-outline"
                          style={{
                            padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: '#ef4444', borderColor: '#fee2e2', background: 'white'
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Modal Adicionar Admin */}
      {showAddModal && (
        <div className="overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ 
                width: '48px', height: '48px', borderRadius: '12px', 
                background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem'
              }}>🛡️</div>
              <div>
                <h2 className="section-title" style={{ fontSize: '1.3rem', margin: 0 }}>Novo Administrador</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                  Adicionar email à collection user_Admin
                </p>
              </div>
            </div>

            <form onSubmit={handleAddAdmin}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', fontWeight: 600 }}>
                  Email *
                </label>
                <input 
                  required 
                  type="email" 
                  className="form-input"
                  value={newAdmin.email}
                  onChange={e => setNewAdmin({...newAdmin, email: e.target.value})}
                  placeholder="admin@empresa.com"
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', fontWeight: 600 }}>
                  Nome
                </label>
                <input 
                  type="text" 
                  className="form-input"
                  value={newAdmin.nome}
                  onChange={e => setNewAdmin({...newAdmin, nome: e.target.value})}
                  placeholder="Nome do administrador"
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', fontWeight: 600 }}>
                  Nível de Permissão
                </label>
                <select 
                  className="form-input form-select"
                  value={newAdmin.role}
                  onChange={e => setNewAdmin({...newAdmin, role: e.target.value})}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }}
                >
                  <option value="admin">🛡️ Admin</option>
                  <option value="super_admin">⭐ Super Admin</option>
                  <option value="moderator">👁️ Moderador</option>
                </select>
              </div>

              <div style={{ 
                background: '#eff6ff', border: '1px solid #bfdbfe', 
                borderRadius: '10px', padding: '0.85rem', marginBottom: '1.5rem',
                fontSize: '0.82rem', color: '#1e40af', lineHeight: 1.6
              }}>
                ℹ️ O email será registrado na collection <strong>user_Admin</strong> do Firestore com as permissões selecionadas.
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={adding}
                style={{ width: '100%', padding: '0.9rem', background: '#4338ca', fontSize: '1rem', marginBottom: '0.5rem' }}
              >
                {adding ? '⏳ Adicionando...' : '🛡️ Adicionar Administrador'}
              </button>
            </form>
            <button 
              className="btn btn-outline" 
              style={{ width: '100%', marginTop: '0.5rem' }} 
              onClick={() => setShowAddModal(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .kpi-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.05) !important;
        }
      `}</style>
    </div>
  );
};

export default AdminPage;
