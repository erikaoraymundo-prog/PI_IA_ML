import React, { useState, useEffect, useCallback } from 'react';
import { db, storage, logout } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { calculateMatchScores, extractTextFromPDF } from '../matchingEngine';

const EditarPerfil = ({ user, onProfileUpdate }) => {
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    cpf: '',
    birthDate: '',
    gender: '',
    country: 'Brasil',
    state: '',
    city: '',
    neighborhood: '',
    targetJob: '',
    minSalary: '',
    maxSalary: '',
    modelPreferences: [],
    travelAvailability: 'nao',
    aboutMe: '',
    experiences: [],
    educations: [],
    languages: [],
    skills: [],
    resumeUrl: '',
    resumeFileName: '',
    resumeText: '',
    linkedinUrl: '',
    githubUrl: '',
    autoApplyActive: false
  });

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [newSkill, setNewSkill] = useState('');
  const [showAutoApplyConfirm, setShowAutoApplyConfirm] = useState(false);

  const [expandedSections, setExpandedSections] = useState({
    basicas: true,
    localizacao: false,
    preferencias: false,
    experiencias: false,
    educacao: false,
    idiomasSkills: false,
    documentos: false
  });

  // Carregar dados do perfil
  const fetchProfile = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfileData(prev => ({
          ...prev,
          ...data,
          experiences: data.experiences || [],
          educations: data.educations || [],
          languages: data.languages || [],
          skills: data.skills || [],
          modelPreferences: data.modelPreferences || []
        }));
      } else {
        setProfileData(prev => ({
          ...prev,
          fullName: user.fullName || user.displayName || '',
          email: user.email || ''
        }));
      }
    } catch (err) {
      console.error("Erro ao carregar perfil:", err);
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

  // Helper formatações
  const formatCPF = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0,3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6)}`;
    return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
  };

  const formatPhone = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  };

  // Funções de listas dinâmicas do Perfil
  const addExperience = () => {
    setProfileData(prev => ({
      ...prev,
      experiences: [...prev.experiences, { company: '', role: '', periodStart: '', periodEnd: '', current: false, description: '' }]
    }));
  };

  const removeExperience = (index) => {
    setProfileData(prev => ({
      ...prev,
      experiences: prev.experiences.filter((_, i) => i !== index)
    }));
  };

  const updateExperience = (index, field, value) => {
    setProfileData(prev => {
      const newList = [...prev.experiences];
      newList[index] = { ...newList[index], [field]: value };
      if (field === 'current' && value === true) {
        newList[index].periodEnd = '';
      }
      return { ...prev, experiences: newList };
    });
  };

  const addEducation = () => {
    setProfileData(prev => ({
      ...prev,
      educations: [...prev.educations, { level: 'Graduação', institution: '', course: '', status: 'Concluído', graduationYear: '' }]
    }));
  };

  const removeEducation = (index) => {
    setProfileData(prev => ({
      ...prev,
      educations: prev.educations.filter((_, i) => i !== index)
    }));
  };

  const updateEducation = (index, field, value) => {
    setProfileData(prev => {
      const newList = [...prev.educations];
      newList[index] = { ...newList[index], [field]: value };
      return { ...prev, educations: newList };
    });
  };

  const addLanguage = () => {
    setProfileData(prev => ({
      ...prev,
      languages: [...prev.languages, { language: '', level: 'Básico' }]
    }));
  };

  const removeLanguage = (index) => {
    setProfileData(prev => ({
      ...prev,
      languages: prev.languages.filter((_, i) => i !== index)
    }));
  };

  const updateLanguage = (index, field, value) => {
    setProfileData(prev => {
      const newList = [...prev.languages];
      newList[index] = { ...newList[index], [field]: value };
      return { ...prev, languages: newList };
    });
  };

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    if (!profileData.skills.includes(newSkill.trim())) {
      setProfileData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
    }
    setNewSkill('');
  };

  const handleRemoveSkill = (tag) => {
    setProfileData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== tag)
    }));
  };

  const handleModelPrefChange = (pref) => {
    setProfileData(prev => {
      const current = prev.modelPreferences || [];
      if (current.includes(pref)) {
        return { ...prev, modelPreferences: current.filter(p => p !== pref) };
      } else {
        return { ...prev, modelPreferences: [...current, pref] };
      }
    });
  };

  // Upload de arquivo de Currículo
  const handleProfileFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("O arquivo excede o limite de 5MB.");
      return;
    }
    setUploadingResume(true);
    try {
      const timestamp = new Date().getTime();
      const storageRef = ref(storage, `resumes/${user.uid}_${timestamp}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      let text = '';
      if (file.name.toLowerCase().endsWith('.pdf')) {
        text = await extractTextFromPDF(file);
      } else {
        text = await file.text();
      }

      setProfileData(prev => ({
        ...prev,
        resumeUrl: downloadURL,
        resumeFileName: file.name,
        resumeText: text
      }));
      showFeedback("Currículo anexado com sucesso!");
    } catch (err) {
      console.error("Erro ao subir currículo:", err);
      alert("Erro ao processar currículo: " + err.message);
    } finally {
      setUploadingResume(false);
      e.target.value = '';
    }
  };

  // Salvar perfil no Firestore
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (!user?.uid) return;
    setSavingProfile(true);
    try {
      const docRef = doc(db, 'users', user.uid);
      const payload = {
        ...profileData,
        updatedAt: new Date()
      };
      await setDoc(docRef, payload, { merge: true });
      showFeedback("Perfil atualizado com sucesso!");
      if (onProfileUpdate) {
        onProfileUpdate(payload);
      }
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      showFeedback("Falha ao salvar dados do perfil.", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteMyData = async () => {
    const confirmDelete = confirm(
      "ATENÇÃO: Esta ação é permanente e irreversível!\n\n" +
      "Isso irá excluir definitivamente:\n" +
      "1. Todos os seus dados cadastrais e de perfil.\n" +
      "2. Seu currículo hospedado em nossos servidores.\n" +
      "3. Todas as suas candidaturas ativas e histórico.\n\n" +
      "Deseja realmente apagar todos os seus dados?"
    );

    if (!confirmDelete) return;

    const secondConfirm = confirm(
      "Confirmação final: Você perderá todo o histórico e precisará criar uma nova conta se quiser utilizar a plataforma novamente. Deseja mesmo prosseguir?"
    );

    if (!secondConfirm) return;

    setSavingProfile(true);
    try {
      // 1. Apagar candidaturas associadas do Firestore
      const appsQuery = query(collection(db, 'applications'), where('userId', '==', user.uid));
      const appsSnap = await getDocs(appsQuery);
      const deletePromises = [];
      appsSnap.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      await Promise.all(deletePromises);

      // 2. Apagar currículo do Storage se existir
      if (profileData.resumeUrl) {
        try {
          const decodedUrl = decodeURIComponent(profileData.resumeUrl);
          const match = decodedUrl.match(/\/o\/(resumes\/[^?#]+)/);
          if (match && match[1]) {
            const filePath = match[1];
            const fileRef = ref(storage, filePath);
            await deleteObject(fileRef);
          }
        } catch (storageErr) {
          console.error("Erro ao apagar arquivo de currículo do Storage:", storageErr);
        }
      }

      // 3. Apagar o documento do usuário no Firestore
      await deleteDoc(doc(db, 'users', user.uid));

      alert("Todos os seus dados foram excluídos com sucesso em conformidade com a LGPD. Você será deslogado.");
      
      // 4. Deslogar usuário
      await logout();
      
      // Forçar atualização da página ou redirecionar para a home
      window.location.reload();
    } catch (err) {
      console.error("Erro ao excluir dados:", err);
      alert("Ocorreu um erro ao excluir seus dados. Por favor, tente novamente mais tarde.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Gatekeeper: valida cadastro mínimo
  const validateProfileForAutoApply = () => {
    const { fullName, email, phone, country, state, city, resumeUrl } = profileData;
    if (!fullName || !email || !phone || !country || !state || !city || !resumeUrl) {
      return false;
    }
    return true;
  };

  // Candidatura automática retroativa (matching com vagas existentes)
  const runRetroactiveAutoApply = async () => {
    if (!user?.uid || !profileData.resumeText) return;
    try {
      const jobsSnap = await getDocs(collection(db, 'vagas_oportunidades'));
      const activeJobs = [];
      jobsSnap.forEach((doc) => {
        const jd = doc.data();
        if (jd.ativo) {
          activeJobs.push({ id: doc.id, ...jd });
        }
      });

      if (activeJobs.length === 0) return;

      const appQuery = query(collection(db, 'applications'), where('userId', '==', user.uid));
      const appSnap = await getDocs(appQuery);
      const appliedJobIds = new Set();
      appSnap.forEach((doc) => {
        appliedJobIds.add(doc.data().jobId);
      });

      const eligibleJobs = activeJobs.filter(j => !appliedJobIds.has(j.id));
      if (eligibleJobs.length === 0) return;

      const matches = calculateMatchScores(profileData.resumeText, eligibleJobs);
      const highMatches = matches.filter(m => m.score >= 70);
      let count = 0;

      for (const match of highMatches) {
        const appRef = doc(collection(db, 'applications'));
        
        // Congelar snapshot do perfil
        const snapshot = {
          fullName: profileData.fullName || '',
          email: profileData.email || '',
          phone: profileData.phone || '',
          cpf: profileData.cpf || '',
          birthDate: profileData.birthDate || '',
          gender: profileData.gender || '',
          country: profileData.country || '',
          state: profileData.state || '',
          city: profileData.city || '',
          neighborhood: profileData.neighborhood || '',
          targetJob: profileData.targetJob || '',
          minSalary: profileData.minSalary || '',
          maxSalary: profileData.maxSalary || '',
          modelPreferences: profileData.modelPreferences || [],
          travelAvailability: profileData.travelAvailability || '',
          aboutMe: profileData.aboutMe || '',
          experiences: profileData.experiences || [],
          educations: profileData.educations || [],
          languages: profileData.languages || [],
          skills: profileData.skills || [],
          resumeUrl: profileData.resumeUrl || '',
          linkedinUrl: profileData.linkedinUrl || '',
          githubUrl: profileData.githubUrl || ''
        };

        await setDoc(appRef, {
          userId: user.uid,
          userEmail: profileData.email,
          userFullName: profileData.fullName,
          jobId: match.job_id,
          jobTitle: match.job_title,
          resumeUrl: profileData.resumeUrl,
          score: match.score,
          status: 'pendente',
          appliedAt: new Date(),
          appliedAutomatically: true,
          candidateProfileSnapshot: snapshot
        });
        count++;
      }

      if (count > 0) {
        showFeedback(`Candidatura automática ativada! Você foi inscrito em ${count} vaga(s) compatíveis.`);
      } else {
        showFeedback("Candidatura automática ativada! Nenhuma vaga com match ≥ 70% no momento.");
      }
    } catch (err) {
      console.error("Erro no match retroativo:", err);
    }
  };

  // Alternar a chave de Autocandidatura
  const handleToggleAutoApply = async () => {
    const currentStatus = profileData.autoApplyActive;

    if (!currentStatus) {
      if (!validateProfileForAutoApply()) {
        alert("Complete seu perfil para liberar a candidatura automática. Preencha Nome, E-mail, Telefone, Cidade/Estado e anexe seu currículo antes de ativar.");
        return;
      }
      setShowAutoApplyConfirm(true);
    } else {
      if (confirm("Deseja desativar a candidatura automática? Você não se aplicará a novas vagas sem ação manual.")) {
        try {
          const docRef = doc(db, 'users', user.uid);
          await setDoc(docRef, { autoApplyActive: false }, { merge: true });
          setProfileData(prev => ({ ...prev, autoApplyActive: false }));
          if (onProfileUpdate) {
            onProfileUpdate({ autoApplyActive: false });
          }
          showFeedback("Candidatura automática desativada.");
        } catch (err) {
          console.error(err);
          showFeedback("Erro ao atualizar status.", "error");
        }
      }
    }
  };

  const confirmActivateAutoApply = async () => {
    setShowAutoApplyConfirm(false);
    try {
      const docRef = doc(db, 'users', user.uid);
      const payload = {
        ...profileData,
        autoApplyActive: true,
        updatedAt: new Date()
      };
      await setDoc(docRef, payload);
      setProfileData(payload);
      if (onProfileUpdate) {
        onProfileUpdate(payload);
      }

      await runRetroactiveAutoApply();
    } catch (err) {
      console.error("Erro ao ativar auto-apply:", err);
      showFeedback("Falha ao ativar candidatura automática.", "error");
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '8rem 2rem', textAlign: 'center', minHeight: '80vh' }}>
        <div style={{ width: '50px', height: '50px', border: '4px solid #f3f3f3', borderTop: '4px solid #00a896', borderRadius: '50%', margin: '0 auto 1.5rem', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Carregando dados do perfil...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '4rem 1rem', minHeight: 'calc(100vh - 80px)' }}>
      {/* Estilo CSS customizado injetado */}
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
          color: #1e293b;
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
          border-color: #00a896;
          box-shadow: 0 0 0 3px rgba(0, 168, 150, 0.15);
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
        .dynamic-item-box {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 1.25rem;
          margin-bottom: 1rem;
          background: #fdfdfd;
          position: relative;
        }
        .tag-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: #e2e8f0;
          color: #334155;
          padding: 0.3rem 0.6rem;
          border-radius: 99px;
          font-size: 0.8rem;
          font-weight: 600;
          margin-right: 0.4rem;
          margin-bottom: 0.4rem;
        }
        .tag-remove-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #64748b;
          font-weight: 800;
          padding: 0;
          font-size: 0.75rem;
        }
        .tag-remove-btn:hover {
          color: #ef4444;
        }
        /* Toggle Switch */
        .switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 26px;
        }
        .switch input { 
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #cbd5e1;
          -webkit-transition: .4s;
          transition: .4s;
          border-radius: 34px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          -webkit-transition: .4s;
          transition: .4s;
          border-radius: 50%;
        }
        input:checked + .slider {
          background-color: #00a896;
        }
        input:focus + .slider {
          box-shadow: 0 0 1px #00a896;
        }
        input:checked + .slider:before {
          -webkit-transform: translateX(24px);
          -ms-transform: translateX(24px);
          transform: translateX(24px);
        }
      `}</style>

      {/* Header com Ativação do Auto-Apply */}
      <div className="agente-header" style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        position: 'relative', overflow: 'hidden', marginBottom: '2rem',
        borderRadius: '24px', padding: '2.5rem 2rem', color: 'white',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem'
      }}>
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '600px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.6rem', color: 'white' }}>
            👤 Editar Perfil Profissional
          </h1>
          <p style={{ fontSize: '1rem', opacity: 0.85, color: '#94a3b8', margin: 0 }}>
            Centralize suas informações cadastrais e profissionais. Esses dados serão usados para matching automático de alto nível.
          </p>
        </div>

        {/* Card do Gatekeeper de Autocandidatura */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          minWidth: '280px',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#38bdf8' }}>
              Autocandidatura 🤖
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8, color: '#e2e8f0', marginTop: '0.2rem' }}>
              Inscrições automáticas com match ≥ 70%
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, marginRight: '0.5rem', color: profileData.autoApplyActive ? '#34d399' : '#94a3b8' }}>
              {profileData.autoApplyActive ? 'ATIVADO' : 'DESATIVADO'}
            </span>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={profileData.autoApplyActive} 
                onChange={handleToggleAutoApply} 
              />
              <span className="slider"></span>
            </label>
          </div>
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

      {/* FORMULÁRIO DE PERFIL */}
      <form onSubmit={handleSaveProfile}>
        {/* Seção 1: Informações Básicas */}
        <div className="acc-card">
          <div className="acc-header" onClick={() => toggleSection('basicas')}>
            <span>👤 1. Informações Básicas e Contato</span>
            <span>{expandedSections.basicas ? '▲' : '▼'}</span>
          </div>
          {expandedSections.basicas && (
            <div className="acc-content">
              <div className="profile-grid-2">
                <div>
                  <label className="profile-label">Nome Completo *</label>
                  <input 
                    required 
                    type="text" 
                    className="profile-input" 
                    value={profileData.fullName} 
                    onChange={e => setProfileData({...profileData, fullName: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="profile-label">E-mail *</label>
                  <input 
                    required 
                    type="email" 
                    className="profile-input" 
                    value={profileData.email} 
                    onChange={e => setProfileData({...profileData, email: e.target.value})} 
                  />
                </div>
              </div>

              <div className="profile-grid-3">
                <div>
                  <label className="profile-label">Telefone/WhatsApp *</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="(DD) 99999-9999"
                    className="profile-input" 
                    value={profileData.phone} 
                    onChange={e => setProfileData({...profileData, phone: formatPhone(e.target.value)})} 
                  />
                </div>
                <div>
                  <label className="profile-label">CPF *</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="000.000.000-00"
                    className="profile-input" 
                    value={profileData.cpf} 
                    onChange={e => setProfileData({...profileData, cpf: formatCPF(e.target.value)})} 
                  />
                </div>
                <div>
                  <label className="profile-label">Data de Nascimento *</label>
                  <input 
                    required 
                    type="date" 
                    className="profile-input" 
                    value={profileData.birthDate} 
                    onChange={e => setProfileData({...profileData, birthDate: e.target.value})} 
                  />
                </div>
              </div>

              <div>
                <label className="profile-label">Gênero/Diversidade (Opcional)</label>
                <select 
                  className="profile-input" 
                  value={profileData.gender} 
                  onChange={e => setProfileData({...profileData, gender: e.target.value})}
                >
                  <option value="">Selecione...</option>
                  <option value="feminino">Feminino</option>
                  <option value="masculino">Masculino</option>
                  <option value="nao-binario">Não-binário</option>
                  <option value="outro">Outro</option>
                  <option value="prefiro-nao-dizer">Prefiro não responder</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Seção 2: Localização */}
        <div className="acc-card">
          <div className="acc-header" onClick={() => toggleSection('localizacao')}>
            <span>📍 2. Endereço e Localização</span>
            <span>{expandedSections.localizacao ? '▲' : '▼'}</span>
          </div>
          {expandedSections.localizacao && (
            <div className="acc-content">
              <div className="profile-grid-2">
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
                  <label className="profile-label">Estado (UF) *</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Ex: SP"
                    maxLength={2}
                    className="profile-input" 
                    value={profileData.state} 
                    onChange={e => setProfileData({...profileData, state: e.target.value})} 
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
                  <label className="profile-label">Bairro *</label>
                  <input 
                    required 
                    type="text" 
                    className="profile-input" 
                    value={profileData.neighborhood} 
                    onChange={e => setProfileData({...profileData, neighborhood: e.target.value})} 
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Seção 3: Objetivos e Preferências */}
        <div className="acc-card">
          <div className="acc-header" onClick={() => toggleSection('preferencias')}>
            <span>🎯 3. Objetivo e Preferências Profissionais</span>
            <span>{expandedSections.preferencias ? '▲' : '▼'}</span>
          </div>
          {expandedSections.preferencias && (
            <div className="acc-content">
              <div className="profile-grid-3">
                <div>
                  <label className="profile-label">Cargo Alvo *</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Ex: Desenvolvedor Front-end React"
                    className="profile-input" 
                    value={profileData.targetJob} 
                    onChange={e => setProfileData({...profileData, targetJob: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="profile-label">Pretensão Salarial Mínima (R$) *</label>
                  <input 
                    required 
                    type="number" 
                    className="profile-input" 
                    value={profileData.minSalary} 
                    onChange={e => setProfileData({...profileData, minSalary: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="profile-label">Pretensão Salarial Máxima (R$) *</label>
                  <input 
                    required 
                    type="number" 
                    className="profile-input" 
                    value={profileData.maxSalary} 
                    onChange={e => setProfileData({...profileData, maxSalary: e.target.value})} 
                  />
                </div>
              </div>

              <div className="profile-grid-2">
                <div>
                  <label className="profile-label">Modelo de Trabalho Preferido</label>
                  <div style={{ display: 'flex', gap: '1.25rem', padding: '0.5rem 0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={profileData.modelPreferences.includes('remoto')} 
                        onChange={() => handleModelPrefChange('remoto')}
                      />
                      Remoto
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={profileData.modelPreferences.includes('hibrido')} 
                        onChange={() => handleModelPrefChange('hibrido')}
                      />
                      Híbrido
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={profileData.modelPreferences.includes('presencial')} 
                        onChange={() => handleModelPrefChange('presencial')}
                      />
                      Presencial
                    </label>
                  </div>
                </div>

                <div>
                  <label className="profile-label">Disponibilidade para Viagens ou Mudança *</label>
                  <select 
                    className="profile-input" 
                    value={profileData.travelAvailability}
                    onChange={e => setProfileData({...profileData, travelAvailability: e.target.value})}
                  >
                    <option value="sim">Sim, total disponibilidade</option>
                    <option value="nao">Não possuo disponibilidade</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="profile-label">Resumo Profissional ("Sobre mim") *</label>
                <textarea 
                  required 
                  rows={4}
                  placeholder="Escreva um resumo destacando suas principais conquistas..."
                  className="profile-input" 
                  value={profileData.aboutMe} 
                  onChange={e => setProfileData({...profileData, aboutMe: e.target.value})}
                  style={{ resize: 'vertical', minHeight: '80px' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Seção 4: Experiências Profissionais */}
        <div className="acc-card">
          <div className="acc-header" onClick={() => toggleSection('experiencias')}>
            <span>💼 4. Experiências Profissionais</span>
            <span>{expandedSections.experiencias ? '▲' : '▼'}</span>
          </div>
          {expandedSections.experiencias && (
            <div className="acc-content">
              {profileData.experiences.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'center' }}>
                  Nenhuma experiência cadastrada ainda.
                </p>
              ) : (
                profileData.experiences.map((exp, idx) => (
                  <div key={idx} className="dynamic-item-box">
                    <button 
                      type="button" 
                      onClick={() => removeExperience(idx)}
                      style={{
                        position: 'absolute', top: '10px', right: '10px',
                        background: 'none', border: 'none', color: '#ef4444',
                        fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem'
                      }}
                    >
                      ✕ Remover
                    </button>

                    <div className="profile-grid-2" style={{ marginTop: '0.5rem' }}>
                      <div>
                        <label className="profile-label">Empresa *</label>
                        <input 
                          required 
                          type="text" 
                          className="profile-input" 
                          value={exp.company}
                          onChange={e => updateExperience(idx, 'company', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="profile-label">Cargo *</label>
                        <input 
                          required 
                          type="text" 
                          className="profile-input" 
                          value={exp.role}
                          onChange={e => updateExperience(idx, 'role', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="profile-grid-3">
                      <div>
                        <label className="profile-label">Mês/Ano Início *</label>
                        <input 
                          required 
                          type="text" 
                          placeholder="MM/AAAA"
                          className="profile-input" 
                          value={exp.periodStart}
                          onChange={e => updateExperience(idx, 'periodStart', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="profile-label">Mês/Ano Fim</label>
                        <input 
                          type="text" 
                          placeholder="MM/AAAA"
                          disabled={exp.current}
                          className="profile-input" 
                          value={exp.periodEnd}
                          onChange={e => updateExperience(idx, 'periodEnd', e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', height: '40px', marginTop: '1.25rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                          <input 
                            type="checkbox" 
                            checked={exp.current}
                            onChange={e => updateExperience(idx, 'current', e.target.checked)}
                          />
                          Trabalho atual aqui
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="profile-label">Descrição das Atividades *</label>
                      <textarea 
                        required 
                        rows={3}
                        placeholder="Descreva suas responsabilidades e conquistas..."
                        className="profile-input" 
                        value={exp.description}
                        onChange={e => updateExperience(idx, 'description', e.target.value)}
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                  </div>
                ))
              )}
              
              <button 
                type="button" 
                onClick={addExperience} 
                className="btn btn-outline" 
                style={{ width: '100%', padding: '0.75rem', background: '#f8fafc', border: '1px dashed #cbd5e1', color: '#00a896' }}
              >
                ➕ Adicionar Experiência
              </button>
            </div>
          )}
        </div>

        {/* Seção 5: Formação Acadêmica */}
        <div className="acc-card">
          <div className="acc-header" onClick={() => toggleSection('educacao')}>
            <span>🎓 5. Formação Acadêmica</span>
            <span>{expandedSections.educacao ? '▲' : '▼'}</span>
          </div>
          {expandedSections.educacao && (
            <div className="acc-content">
              {profileData.educations.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'center' }}>
                  Nenhuma formação cadastrada ainda.
                </p>
              ) : (
                profileData.educations.map((edu, idx) => (
                  <div key={idx} className="dynamic-item-box">
                    <button 
                      type="button" 
                      onClick={() => removeEducation(idx)}
                      style={{
                        position: 'absolute', top: '10px', right: '10px',
                        background: 'none', border: 'none', color: '#ef4444',
                        fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem'
                      }}
                    >
                      ✕ Remover
                    </button>

                    <div className="profile-grid-2" style={{ marginTop: '0.5rem' }}>
                      <div>
                        <label className="profile-label">Nível *</label>
                        <select 
                          className="profile-input"
                          value={edu.level}
                          onChange={e => updateEducation(idx, 'level', e.target.value)}
                        >
                          <option value="Ensino Médio">Ensino Médio</option>
                          <option value="Técnico">Ensino Técnico</option>
                          <option value="Graduação">Graduação</option>
                          <option value="Tecnólogo">Tecnólogo</option>
                          <option value="Pós-Graduação">Pós-Graduação</option>
                          <option value="Mestrado">Mestrado</option>
                          <option value="Doutorado">Doutorado</option>
                        </select>
                      </div>
                      <div>
                        <label className="profile-label">Instituição de Ensino *</label>
                        <input 
                          required 
                          type="text" 
                          className="profile-input" 
                          value={edu.institution}
                          onChange={e => updateEducation(idx, 'institution', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="profile-grid-3">
                      <div style={{ gridColumn: 'span 2' }}>
                        <label className="profile-label">Curso *</label>
                        <input 
                          required 
                          type="text" 
                          className="profile-input" 
                          value={edu.course}
                          onChange={e => updateEducation(idx, 'course', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="profile-label">Status *</label>
                        <select 
                          className="profile-input"
                          value={edu.status}
                          onChange={e => updateEducation(idx, 'status', e.target.value)}
                        >
                          <option value="Concluído">Concluído</option>
                          <option value="Cursando">Cursando</option>
                          <option value="Trancado">Trancado</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="profile-label">Ano de Conclusão / Previsão *</label>
                      <input 
                        required 
                        type="number" 
                        placeholder="Ex: 2025"
                        className="profile-input" 
                        value={edu.graduationYear}
                        onChange={e => updateEducation(idx, 'graduationYear', e.target.value)}
                      />
                    </div>
                  </div>
                ))
              )}
              
              <button 
                type="button" 
                onClick={addEducation} 
                className="btn btn-outline" 
                style={{ width: '100%', padding: '0.75rem', background: '#f8fafc', border: '1px dashed #cbd5e1', color: '#00a896' }}
              >
                ➕ Adicionar Formação Acadêmica
              </button>
            </div>
          )}
        </div>

        {/* Seção 6: Idiomas e Competências */}
        <div className="acc-card">
          <div className="acc-header" onClick={() => toggleSection('idiomasSkills')}>
            <span>🌐 6. Idiomas e Competências (Tags)</span>
            <span>{expandedSections.idiomasSkills ? '▲' : '▼'}</span>
          </div>
          {expandedSections.idiomasSkills && (
            <div className="acc-content">
              {/* Idiomas */}
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem' }}>Idiomas</h4>
              {profileData.languages.map((lang, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <input 
                    required 
                    type="text" 
                    placeholder="Ex: Inglês"
                    className="profile-input" 
                    value={lang.language}
                    onChange={e => updateLanguage(idx, 'language', e.target.value)}
                    style={{ marginBottom: 0, flex: 2 }}
                  />
                  <select 
                    className="profile-input"
                    value={lang.level}
                    onChange={e => updateLanguage(idx, 'level', e.target.value)}
                    style={{ marginBottom: 0, flex: 1, height: '40px' }}
                  >
                    <option value="Básico">Básico</option>
                    <option value="Intermediário">Intermediário</option>
                    <option value="Avançado">Avançado</option>
                    <option value="Fluente/Nativo">Fluente / Nativo</option>
                  </select>
                  <button 
                    type="button" 
                    onClick={() => removeLanguage(idx)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              
              <button 
                type="button" 
                onClick={addLanguage} 
                className="btn btn-outline" 
                style={{
                  padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#00a896', background: '#f8fafc',
                  border: '1px dashed #cbd5e1', marginBottom: '1.5rem', width: 'auto'
                }}
              >
                ➕ Adicionar Idioma
              </button>

              <div style={{ height: '1px', background: '#e2e8f0', margin: '1.5rem 0' }}></div>

              {/* Habilidades */}
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem' }}>Competências e Palavras-chave</h4>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input 
                  type="text" 
                  placeholder="Ex: JavaScript, Scrum, Excel Avançado" 
                  className="profile-input"
                  value={newSkill}
                  onChange={e => setNewSkill(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); } }}
                  style={{ marginBottom: 0 }}
                />
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleAddSkill}
                  style={{ background: '#00a896' }}
                >
                  Adicionar
                </button>
              </div>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                {profileData.skills.length === 0 ? (
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Nenhuma competência cadastrada. Digite acima e clique em Adicionar.</span>
                ) : (
                  profileData.skills.map((skill, idx) => (
                    <span key={idx} className="tag-pill">
                      {skill}
                      <button type="button" onClick={() => handleRemoveSkill(skill)} className="tag-remove-btn">✕</button>
                    </span>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Seção 7: Documentos e Links */}
        <div className="acc-card">
          <div className="acc-header" onClick={() => toggleSection('documentos')}>
            <span>🔗 7. Documentos e Links Externos</span>
            <span>{expandedSections.documentos ? '▲' : '▼'}</span>
          </div>
          {expandedSections.documentos && (
            <div className="acc-content">
              {/* Upload Currículo */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="profile-label">Currículo Atualizado (PDF, DOCX — Máx: 5MB) *</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <button 
                    type="button"
                    className="btn btn-outline"
                    onClick={() => document.getElementById('profileResumeInput').click()}
                    disabled={uploadingResume}
                    style={{ color: '#00a896', borderColor: '#00a896', background: 'white' }}
                  >
                    {uploadingResume ? "Enviando..." : "📎 Selecionar Currículo"}
                  </button>
                  <input 
                    id="profileResumeInput"
                    type="file"
                    accept=".pdf,.docx"
                    hidden
                    onChange={handleProfileFileUpload}
                  />
                  
                  {profileData.resumeFileName && (
                    <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                      ✅ {profileData.resumeFileName}
                    </span>
                  )}

                  {profileData.resumeUrl && !profileData.resumeFileName && (
                    <a href={profileData.resumeUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#00a896', fontWeight: 600 }}>
                      Visualizar currículo atual ↗
                    </a>
                  )}
                </div>
              </div>

              <div className="profile-grid-2">
                <div>
                  <label className="profile-label">URL do LinkedIn</label>
                  <input 
                    type="url" 
                    placeholder="https://linkedin.com/in/seu-usuario"
                    className="profile-input" 
                    value={profileData.linkedinUrl} 
                    onChange={e => setProfileData({...profileData, linkedinUrl: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="profile-label">URL do Portfólio ou GitHub</label>
                  <input 
                    type="url" 
                    placeholder="https://github.com/seu-usuario"
                    className="profile-input" 
                    value={profileData.githubUrl} 
                    onChange={e => setProfileData({...profileData, githubUrl: e.target.value})} 
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botão de Envio */}
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={savingProfile}
          style={{ width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: 700, borderRadius: '12px', background: '#00a896', color: 'white', marginTop: '1rem' }}
        >
          {savingProfile ? '⏳ Salvando dados...' : '💾 Salvar Perfil Profissional'}
        </button>
      </form>

      {/* Seção LGPD de Exclusão de Dados */}
      <div style={{
        marginTop: '3rem',
        padding: '1.5rem',
        borderRadius: '16px',
        border: '1px solid #fee2e2',
        background: '#fff5f5',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        <h4 style={{ color: '#991b1b', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🛡️ Direitos do Titular (LGPD)
        </h4>
        <p style={{ fontSize: '0.85rem', color: '#7f1d1d', margin: 0, lineHeight: 1.4 }}>
          Você tem o direito de solicitar a eliminação dos seus dados pessoais tratados pela plataforma a qualquer momento. Ao acionar o botão abaixo, todos os seus dados cadastrais, candidaturas e arquivos de currículo serão removidos de forma definitiva dos nossos sistemas.
        </p>
        <button
          type="button"
          onClick={handleDeleteMyData}
          disabled={savingProfile}
          className="btn btn-outline"
          style={{
            borderColor: '#fca5a5',
            color: '#b91c1c',
            background: 'white',
            fontWeight: 600,
            padding: '0.75rem',
            width: '100%',
            transition: 'all 0.2s',
            cursor: 'pointer'
          }}
          onMouseOver={e => { e.target.style.background = '#fee2e2'; }}
          onMouseOut={e => { e.target.style.background = 'white'; }}
        >
          🗑️ Apagar Meus Dados
        </button>
      </div>

      {/* CONFIRMAÇÃO DE AUTOCANDIDATURA */}
      {showAutoApplyConfirm && (
        <div className="overlay" onClick={() => setShowAutoApplyConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ padding: '2rem', maxWidth: '460px' }}>
            <div style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '1rem' }}>🤖</div>
            <h3 style={{ textAlign: 'center', marginBottom: '0.75rem', color: '#1e293b', fontSize: '1.25rem', fontWeight: 800 }}>
              Ativar Candidatura Automática?
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.5rem', textAlign: 'center' }}>
              Ao ativar, você autoriza o nosso sistema de IA a <strong>inscrever seu perfil automaticamente</strong> em qualquer vaga compatível <strong>igual ou superior a 70%</strong>.
            </p>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.75rem 1rem', borderRadius: '10px', color: '#166534', fontSize: '0.82rem', marginBottom: '1.5rem', fontWeight: 500 }}>
              💡 Você receberá um e-mail de notificação sempre que for inscrito em uma nova vaga e poderá desistir dela a qualquer momento.
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                type="button" 
                onClick={confirmActivateAutoApply}
                className="btn btn-primary"
                style={{ flex: 1, padding: '0.75rem', background: '#00a896' }}
              >
                Sim, Ativar
              </button>
              <button 
                type="button" 
                onClick={() => setShowAutoApplyConfirm(false)}
                className="btn btn-outline"
                style={{ flex: 1, padding: '0.75rem' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditarPerfil;
