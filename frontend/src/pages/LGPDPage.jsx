import React, { useState } from 'react';
import '../index.css';

function LGPDPage() {
  const [isIndexOpen, setIsIndexOpen] = useState(false);
  return (
    <div className="lgpd-page">
      <div className="container lgpd-header">
        <span className="pill-tag">PRIVACIDADE E DADOS</span>
        <div className="lgpd-header-grid">
          <h1 className="lgpd-title">Lei Geral de Proteção de<br/>Dados (LGPD)</h1>
          <div className="lgpd-subtitle-container">
            <p className="lgpd-subtitle">
              Transparência e rigor técnico no tratamento<br/>das suas informações profissionais. Atualizado<br/>em Outubro de 2024.
            </p>
          </div>
        </div>
      </div>

      <div className="container lgpd-main-content">
        <button className="mobile-index-toggle" onClick={() => setIsIndexOpen(!isIndexOpen)}>
          {isIndexOpen ? '✕ Fechar' : '☰ Índice'}
        </button>

        <aside className={`lgpd-sidebar ${isIndexOpen ? 'open' : ''}`}>
          <h4 className="sidebar-title">ÍNDICE DO DOCUMENTO</h4>
          <ul className="sidebar-nav">
            <li className="active"><a href="#tratamento" onClick={() => setIsIndexOpen(false)}>Tratamento de Dados</a></li>
            <li><a href="#direitos" onClick={() => setIsIndexOpen(false)}>Direitos do Usuário</a></li>
            <li><a href="#seguranca" onClick={() => setIsIndexOpen(false)}>Segurança da Informação</a></li>
            <li><a href="#dpo" onClick={() => setIsIndexOpen(false)}>Encarregado de Dados</a></li>
          </ul>
        </aside>

        <section className="lgpd-content">
          <div id="tratamento" className="lgpd-section">
            <div className="section-header">
              <span className="section-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              </span>
              <h2>Como tratamos seus dados</h2>
            </div>
            <p className="lgpd-text">
              Na globalTalentBridge, a coleta de dados é estritamente vinculada à finalidade de
              recrutamento especializado. Não coletamos informações que não sejam essenciais para a
              avaliação técnica ou o match cultural entre candidatos e empresas parceiras.
            </p>
            <div className="lgpd-cards-grid">
              <div className="lgpd-info-card">
                <h5>✓ Dados Identificáveis</h5>
                <p>Nome, e-mail, telefone e perfis profissionais (GitHub/LinkedIn) para contato e verificação.</p>
              </div>
              <div className="lgpd-info-card">
                <h5>✓ Dados Técnicos</h5>
                <p>Stack tecnológica, histórico de projetos e avaliações de código realizadas em nossa plataforma.</p>
              </div>
            </div>
          </div>

          <div id="direitos" className="lgpd-section">
            <div className="section-header">
              <span className="section-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </span>
              <h2>Direitos do usuário</h2>
            </div>
            <p className="lgpd-text">
              Em conformidade com a LGPD, garantimos a você o controle total sobre seus dados. Você
              pode exercer os seguintes direitos a qualquer momento através do seu painel de
              configurações:
            </p>
            <div className="rights-list">
              <div className="right-item">
                <h4>Acesso e Confirmação</h4>
                <p>Confirme a existência do tratamento e acesse a cópia integral dos seus dados pessoais.</p>
              </div>
              <div className="right-item">
                <h4>Correção e Atualização</h4>
                <p>Solicite a correção de dados incompletos, inexatos ou desatualizados em sua conta.</p>
              </div>
              <div className="right-item">
                <h4>Eliminação (Direito ao Esquecimento)</h4>
                <p>Exclua seus dados da nossa base, ressalvadas as obrigações legais de guarda.</p>
              </div>
            </div>
          </div>

          <div id="seguranca" className="lgpd-section">
            <div className="section-header">
              <span className="section-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </span>
              <h2>Segurança da Informação</h2>
            </div>
            <p className="lgpd-text">
              Utilizamos padrões de criptografia de nível militar (AES-256) para todos os dados em repouso
              e protocolos TLS 1.3 para dados em trânsito. Nossa infraestrutura é auditada trimestralmente
              para garantir a resiliência contra ameaças externas.
            </p>
            <div className="security-banner">
              <div className="security-banner-text">INFRAESTRUTURA BLINDADA</div>
            </div>
          </div>

          <div id="dpo" className="lgpd-section">
            <div className="dpo-card">
              <div className="section-header dpo-header">
                <span className="section-icon">@</span>
                <h2>Encarregado de Dados (DPO)</h2>
              </div>
              <p className="dpo-text">
                Para solicitações específicas sobre seus direitos ou dúvidas sobre nossa Política
                de Privacidade, entre em contato direto com nossa equipe de Compliance.
              </p>
              <div className="dpo-info-grid">
                <div className="dpo-info-box">
                  <span className="dpo-label">E-MAIL DIRETO</span>
                  <strong>dpo@theprecisionstudio.<br/>com</strong>
                </div>
                <div className="dpo-info-box">
                  <span className="dpo-label">PRAZO DE RESPOSTA</span>
                  <strong>Até 48 horas úteis</strong>
                </div>
              </div>
            </div>
          </div>

        </section>
      </div>
    </div>
  );
}

export default LGPDPage;

// Próximo passo: Refinamento de UX, Integração de APIs e Testes de Produção
