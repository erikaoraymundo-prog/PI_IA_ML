import React, { useState, useEffect, useCallback } from 'react';
import { db, storage } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const PerfilEmpresa = ({ user }) => {
  const [profileData, setProfileData] = useState({
    companyName: '',
    tradeName: '',
    cnpj: '',
    industry: '',
    companySize: '',
    logoUrl: '',
    logoFileName: '',
    aboutUs: '',
    website: '',
    linkedin: '',
    instagram: '',
    cep: '',
    country: 'Brasil',
    state: '',
    city: '',
    address: '',
    contactEmail: '',
    contactPhone: '',
    contactName: ''
  });

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [expandedSections, setExpandedSections] = useState({
    identificacao: true,
    branding: false,
    localizacao: false,
    contato: false
  });

  const fetchProfile = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfileData(prev => ({
          ...prev,
          ...data
        }));
      } else {
        setProfileData(prev => ({
          ...prev,
          companyName: user.fullName || user.displayName || '',
          contactEmail: user.email || ''
        }));
      }
    } catch (err) {
      console.error("Erro ao carregar perfil corporativo:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const showFeedback = (message, type = 'success') => {
    setFeedback({ message, type });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setFeedback(null), 4000);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // CNPJ helpers
  const formatCNPJ = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0,2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8)}`;
    return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12)}`;
  };

  const validateCNPJ = (cnpj) => {
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length !== 14) return false;
    if (/^(\d)\1+$/.test(digits)) return false;
    let sum = 0;
    let weight = [5,4,3,2,9,8,7,6,5,4,3,2];
    for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * weight[i];
    let rem = sum % 11;
    if (parseInt(digits[12]) !== (rem < 2 ? 0 : 11 - rem)) return false;
    sum = 0;
    weight = [6,5,4,3,2,9,8,7,6,5,4,3,2];
    for (let i = 0; i < 13; i++) sum += parseInt(digits[i]) * weight[i];
    rem = sum % 11;
    return parseInt(digits[13]) === (rem < 2 ? 0 : 11 - rem);
  };

  const formatPhone = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  };

  const formatCEP = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0,5)}-${digits.slice(5)}`;
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("O logotipo excede o limite de 2MB.");
      return;
    }
    setUploadingLogo(true);
    try {
      const timestamp = new Date().getTime();
      const storageRef = ref(storage, `logos/${user.uid}_${timestamp}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      setProfileData(prev => ({
        ...prev,
        logoUrl: downloadURL,
        logoFileName: file.name
      }));
      showFeedback("Logotipo carregado com sucesso!");
    } catch (err) {
      console.error("Erro ao subir logotipo:", err);
      alert("Erro ao processar logotipo: " + err.message);
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (!user?.uid) return;

    if (profileData.cnpj && !validateCNPJ(profileData.cnpj)) {
      alert("CNPJ inválido. Por favor, corrija antes de salvar.");
      return;
    }

    setSavingProfile(true);
    try {
      const docRef = doc(db, 'users', user.uid);
      const payload = {
        ...profileData,
        updatedAt: new Date()
      };
      await setDoc(docRef, payload, { merge: true });
      showFeedback("Perfil da empresa atualizado com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar perfil corporativo:", err);
      showFeedback("Falha ao salvar dados do perfil.", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '8rem 2rem', textAlign: 'center', minHeight: '80vh' }}>
        <div style={{ width: '50px', height: '50px', border: '4px solid #f3f3f3', borderTop: '4px solid #004d5b', borderRadius: '50%', margin: '0 auto 1.5rem', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Carregando dados da empresa...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '4rem 1rem', minHeight: 'calc(100vh - 80px)' }}>
      <style>{`
        .acc-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          margin-bottom: 1rem;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .acc-header {
          padding: 1.25rem;
          background: #f8fafc;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          user-select: none;
          font-weight: 700;
          color: #004d5b;
        }
        .acc-content {
          padding: 1.5rem;
          border-top: 1px solid #f1f5f9;
        }
        .profile-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: #475569;
          margin-bottom: 0.4rem;
        }
        .profile-input {
          width: 100%;
          padding: 0.7rem;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-family: inherit;
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }
        .profile-input:focus {
          outline: none;
          border-color: #004d5b;
          box-shadow: 0 0 0 3px rgba(0, 77, 91, 0.15);
        }
        .profile-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .profile-grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1rem;
        }
        @media (max-width: 600px) {
          .profile-grid-2, .profile-grid-3 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Header */}
      <div className="agente-header" style={{
        background: 'linear-gradient(135deg, #004d5b 0%, #006d80 100%)',
        position: 'relative', overflow: 'hidden', marginBottom: '2rem',
        borderRadius: '24px', padding: '2.5rem 2rem', color: 'white'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.6rem', color: 'white' }}>
            🏢 Perfil da Empresa (B2B)
          </h1>
          <p style={{ fontSize: '1rem', opacity: 0.85, color: '#e0f2fe', margin: 0 }}>
            Configure as informações institucionais da sua marca. Elas serão herdadas automaticamente nas novas vagas.
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

      <form onSubmit={handleSaveProfile}>
        {/* Acordeão 1: Identificação Legal */}
        <div className="acc-card">
          <div className="acc-header" onClick={() => toggleSection('identificacao')}>
            <span>🏢 1. Identificação e Aspectos Legais</span>
            <span>{expandedSections.identificacao ? '▲' : '▼'}</span>
          </div>
          {expandedSections.identificacao && (
            <div className="acc-content">
              <div className="profile-grid-2">
                <div>
                  <label className="profile-label">Razão Social *</label>
                  <input 
                    required 
                    type="text" 
                    className="profile-input" 
                    value={profileData.companyName} 
                    onChange={e => setProfileData({...profileData, companyName: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="profile-label">Nome Fantasia / Marca *</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Nome que os candidatos verão"
                    className="profile-input" 
                    value={profileData.tradeName} 
                    onChange={e => setProfileData({...profileData, tradeName: e.target.value})} 
                  />
                </div>
              </div>

              <div className="profile-grid-3">
                <div>
                  <label className="profile-label">CNPJ *</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    className="profile-input" 
                    value={profileData.cnpj} 
                    onChange={e => setProfileData({...profileData, cnpj: formatCNPJ(e.target.value)})} 
                  />
                </div>
                <div>
                  <label className="profile-label">Setor de Atuação *</label>
                  <select 
                    required
                    className="profile-input" 
                    value={profileData.industry} 
                    onChange={e => setProfileData({...profileData, industry: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    <option value="Tecnologia">Tecnologia</option>
                    <option value="Varejo">Varejo</option>
                    <option value="Saúde">Saúde</option>
                    <option value="Finanças">Finanças</option>
                    <option value="Educação">Educação</option>
                    <option value="Serviços">Serviços</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="profile-label">Tamanho da Empresa *</label>
                  <select 
                    required
                    className="profile-input" 
                    value={profileData.companySize} 
                    onChange={e => setProfileData({...profileData, companySize: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    <option value="1-10">1 a 10 funcionários</option>
                    <option value="11-50">11 a 50 funcionários</option>
                    <option value="51-200">51 a 200 funcionários</option>
                    <option value="201-500">201 a 500 funcionários</option>
                    <option value="500+">Mais de 500 funcionários</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Acordeão 2: Marca Empregadora */}
        <div className="acc-card">
          <div className="acc-header" onClick={() => toggleSection('branding')}>
            <span>✨ 2. Marca Empregadora (Employer Branding)</span>
            <span>{expandedSections.branding ? '▲' : '▼'}</span>
          </div>
          {expandedSections.branding && (
            <div className="acc-content">
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="profile-label">Logotipo da Empresa * (Imagem quadrada/redonda - Máx: 2MB)</label>
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                  <button 
                    type="button"
                    className="btn btn-outline"
                    onClick={() => document.getElementById('companyLogoInput').click()}
                    disabled={uploadingLogo}
                    style={{ color: '#004d5b', borderColor: '#004d5b', background: 'white' }}
                  >
                    {uploadingLogo ? "Enviando..." : "🖼️ Escolher Imagem"}
                  </button>
                  <input 
                    id="companyLogoInput"
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    hidden
                    onChange={handleLogoUpload}
                  />
                  {profileData.logoUrl && (
                    <div style={{ width: '50px', height: '50px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                      <img src={profileData.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  {profileData.logoFileName && (
                    <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                      {profileData.logoFileName}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="profile-label">Descrição da Empresa / "Sobre Nós" *</label>
                <textarea 
                  required 
                  rows={5}
                  placeholder="Escreva sobre a missão, história e cultura da empresa..."
                  className="profile-input" 
                  value={profileData.aboutUs} 
                  onChange={e => setProfileData({...profileData, aboutUs: e.target.value})}
                />
              </div>

              <div className="profile-grid-3">
                <div>
                  <label className="profile-label">Website Oficial</label>
                  <input 
                    type="url" 
                    placeholder="https://suaempresa.com"
                    className="profile-input" 
                    value={profileData.website} 
                    onChange={e => setProfileData({...profileData, website: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="profile-label">LinkedIn da Empresa</label>
                  <input 
                    type="url" 
                    placeholder="https://linkedin.com/company/suaempresa"
                    className="profile-input" 
                    value={profileData.linkedin} 
                    onChange={e => setProfileData({...profileData, linkedin: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="profile-label">Instagram Corporativo</label>
                  <input 
                    type="url" 
                    placeholder="https://instagram.com/suaempresa"
                    className="profile-input" 
                    value={profileData.instagram} 
                    onChange={e => setProfileData({...profileData, instagram: e.target.value})} 
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Acordeão 3: Localização */}
        <div className="acc-card">
          <div className="acc-header" onClick={() => toggleSection('localizacao')}>
            <span>📍 3. Localização da Sede</span>
            <span>{expandedSections.localizacao ? '▲' : '▼'}</span>
          </div>
          {expandedSections.localizacao && (
            <div className="acc-content">
              <div className="profile-grid-3">
                <div>
                  <label className="profile-label">CEP *</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="00000-000"
                    className="profile-input" 
                    value={profileData.cep} 
                    onChange={e => setProfileData({...profileData, cep: formatCEP(e.target.value)})} 
                  />
                </div>
                <div>
                  <label className="profile-label">País *</label>
                  <input 
                    required 
                    type="text" 
                    className="profile-input" 
                    value={profileData.country} 
                    onChange={e => setProfileData({...profileData, country: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="profile-label">Estado *</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Ex: SP"
                    maxLength={2}
                    className="profile-input" 
                    value={profileData.state} 
                    onChange={e => setProfileData({...profileData, state: e.target.value.toUpperCase()})} 
                  />
                </div>
              </div>

              <div className="profile-grid-2">
                <div>
                  <label className="profile-label">Cidade *</label>
                  <input 
                    required 
                    type="text" 
                    className="profile-input" 
                    value={profileData.city} 
                    onChange={e => setProfileData({...profileData, city: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="profile-label">Endereço Completo (Rua, Número, Bairro) *</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Ex: Av. Paulista, 1000 - Bela Vista"
                    className="profile-input" 
                    value={profileData.address} 
                    onChange={e => setProfileData({...profileData, address: e.target.value})} 
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Acordeão 4: Contato Administrativo */}
        <div className="acc-card">
          <div className="acc-header" onClick={() => toggleSection('contato')}>
            <span>📞 4. Contato Administrativo (Oculto para candidatos)</span>
            <span>{expandedSections.contato ? '▲' : '▼'}</span>
          </div>
          {expandedSections.contato && (
            <div className="acc-content">
              <div className="profile-grid-3">
                <div>
                  <label className="profile-label">E-mail Principal do ATS *</label>
                  <input 
                    required 
                    type="email" 
                    className="profile-input" 
                    value={profileData.contactEmail} 
                    onChange={e => setProfileData({...profileData, contactEmail: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="profile-label">Telefone / WhatsApp *</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="(00) 00000-0000"
                    className="profile-input" 
                    value={profileData.contactPhone} 
                    onChange={e => setProfileData({...profileData, contactPhone: formatPhone(e.target.value)})} 
                  />
                </div>
                <div>
                  <label className="profile-label">Nome do Responsável *</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Ex: Ana Souza (Recrutadora)"
                    className="profile-input" 
                    value={profileData.contactName} 
                    onChange={e => setProfileData({...profileData, contactName: e.target.value})} 
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={savingProfile}
          style={{ width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: 700, borderRadius: '12px', background: '#004d5b', color: 'white', marginTop: '1rem' }}
        >
          {savingProfile ? '⏳ Salvando dados...' : '💾 Salvar Perfil da Empresa'}
        </button>
      </form>
    </div>
  );
};

export default PerfilEmpresa;
