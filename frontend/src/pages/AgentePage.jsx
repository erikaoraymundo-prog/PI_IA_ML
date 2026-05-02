import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

const BACKEND_URL = import.meta.env.VITE_API_URL || '';

const formatCNPJ = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

const validateCPF = (cpf) => {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  let weight = 10;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * weight--;
  let rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  if (rem !== parseInt(digits[9])) return false;
  sum = 0;
  weight = 11;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * weight--;
  rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  return rem === parseInt(digits[10]);
};

const AgentePage = ({ user, onLoginRequired }) => {
  const [formData, setFormData] = useState({
    candidate_name: '',
    cpf: '',
    github_user: '',
    consent_signed: false
  });
  
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [errors, setErrors] = useState(null);

  // Parede de login — idêntica ao padrão do currículo
  if (!user) {
    return (
      <div className="container" style={{ padding: '4rem 2rem', minHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          padding: '3rem',
          borderRadius: '24px',
          color: 'white',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>🔒</div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1rem' }}>Acesso Restrito</h2>
          <p style={{ opacity: 0.85, fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            A verificação jurídica de candidatos é uma funcionalidade exclusiva para usuários autenticados.
            Faça login para acessar o AGENTE-RECRUITER.
          </p>
          <button
            className="btn btn-primary"
            onClick={onLoginRequired}
            style={{ padding: '0.9rem 2.5rem', fontSize: '1rem', background: '#00a896', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', width: '100%' }}
          >
            Entrar para Continuar
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.consent_signed) {
      alert("É necessário aceitar os termos de consentimento.");
      return;
    }
    
    const unmaskedCpf = formData.cpf.replace(/\D/g, '');
    if (!validateCPF(unmaskedCpf)) {
        alert("CPF Inválido. Verifique o número digitado.");
        return;
    }

    setLoading(true);
    setReport(null);
    setErrors(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/agent/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidate_name: formData.candidate_name,
          cpf: unmaskedCpf,
          github_user: formData.github_user,
          consent_signed: formData.consent_signed
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setReport(data.report);
      } else {
        setErrors(data.errors || ["Erro desconhecido ao processar"]);
      }
    } catch (err) {
      console.error("Erro na API do agente:", err);
      setErrors(["Erro de conexão com o servidor. O backend está rodando?"]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '4rem 2rem', minHeight: 'calc(100vh - 80px)' }}>
      <div style={{ 
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        padding: '3rem',
        borderRadius: '24px',
        color: 'white',
        marginBottom: '3rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>🛡️ AGENTE-RECRUITER</h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.9, maxWidth: '700px', lineHeight: 1.6 }}>
            Verificação de Background, Antecedentes e Portfólio utilizando Inteligência Artificial em conformidade com a LGPD.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
        {/* Formulário */}
        <div className="card" style={{ padding: '2rem', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Dados do Candidato</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', fontWeight: 600 }}>Nome Completo *</label>
              <input 
                required 
                type="text" 
                className="form-input" 
                value={formData.candidate_name} 
                onChange={e => setFormData({...formData, candidate_name: e.target.value})} 
                placeholder="Nome do candidato" 
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }} 
              />
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', fontWeight: 600 }}>CPF *</label>
              <input 
                required 
                type="text" 
                className="form-input" 
                value={formData.cpf} 
                onChange={e => setFormData({...formData, cpf: formatCNPJ(e.target.value)})} 
                placeholder="000.000.000-00" 
                maxLength={14}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }} 
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', fontWeight: 600 }}>Usuário GitHub (Opcional)</label>
              <input 
                type="text" 
                className="form-input" 
                value={formData.github_user} 
                onChange={e => setFormData({...formData, github_user: e.target.value})} 
                placeholder="ex: octocat" 
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }} 
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>Necessário para análise de portfólio</p>
            </div>

            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <input 
                type="checkbox" 
                id="consent" 
                checked={formData.consent_signed}
                onChange={e => setFormData({...formData, consent_signed: e.target.checked})}
                style={{ marginTop: '0.2rem' }}
              />
              <label htmlFor="consent" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Confirmo que o candidato assinou o termo de consentimento para a verificação de antecedentes em conformidade com a LGPD.
              </label>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading || !formData.consent_signed || formData.candidate_name.trim() === '' || formData.cpf.trim() === ''}
              style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', background: '#0f172a', border: 'none' }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}></span>
                  Processando...
                </span>
              ) : '🔍 Iniciar Verificação'}
            </button>
          </form>
        </div>

        {/* Resultado */}
        <div className="card" style={{ padding: '0', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Relatório Executivo</h3>
          </div>
          
          <div style={{ padding: '2rem', minHeight: '300px' }}>
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                <div className="loading-spinner" style={{ width: '40px', height: '40px', borderTopColor: 'var(--primary)', marginBottom: '1rem' }}></div>
                <p>Analisando dados e compilando relatório de compliance...</p>
              </div>
            )}

            {!loading && !report && !errors && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', opacity: 0.6 }}>
                <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</span>
                <p>O relatório aparecerá aqui após a verificação.</p>
              </div>
            )}

            {!loading && errors && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '1.5rem', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 0.5rem 0' }}>Erro na verificação:</h4>
                <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                  {errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}

            {!loading && report && (
              <div className="markdown-body" style={{ animation: 'fadeIn 0.5s ease' }}>
                <ReactMarkdown>{report}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .markdown-body h1, .markdown-body h2, .markdown-body h3 { color: var(--text-dark); margin-top: 1.5em; margin-bottom: 0.5em; }
        .markdown-body h2 { font-size: 1.4rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3em; }
        .markdown-body h3 { font-size: 1.2rem; }
        .markdown-body p { line-height: 1.6; color: var(--text-muted); margin-bottom: 1em; }
        .markdown-body ul, .markdown-body ol { padding-left: 1.5em; margin-bottom: 1em; color: var(--text-muted); }
        .markdown-body li { margin-bottom: 0.3em; }
        .markdown-body strong { color: var(--text-dark); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default AgentePage;
