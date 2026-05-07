import React from 'react';
import '../index.css';

function ProductPage() {
  return (
    <div className="product-page">
      {/* Hero Section */}
      <section className="container p-hero">
        <div className="p-hero-content">
          <span className="pill-tag p-pill">A NOVA ERA DO RECRUTAMENTO</span>
          <h1 className="p-hero-title">Engenharia de<br/>Talentos<br/>Excepcionais.</h1>
          <p className="p-hero-subtitle">
            Não apenas conectamos pessoas. Construímos pipelines de
            alta performance através de uma abordagem editorial e
            técnica única no mercado.
          </p>
          <div className="p-hero-actions">
            <button className="btn btn-primary" style={{ padding: '0.8rem 1.5rem', fontWeight: 600 }}>Conheça a Plataforma</button>
            <button className="btn btn-link" style={{ fontWeight: 600, color: 'var(--primary)' }}>Ver Demonstração</button>
          </div>
        </div>
        <div className="p-hero-visual">
          <div className="p-hero-mockup">
            <div className="mockup-floaty">
              <span className="floaty-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </span>
              <div style={{ marginLeft: '1rem' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Matching de Precisão</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Módulo IA Integrado ao pipeline</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Curadoria Section */}
      <section className="container p-section align-center">
        <div className="p-cards-stack">
           <div className="s-card s-card-1">
             <div className="s-avatar"></div>
             <div>
               <strong>Senior Fullstack</strong>
               <div className="s-tags"><span className="tag-blue">React</span><span className="tag-blue">Node</span></div>
             </div>
           </div>
           <div className="s-card s-card-2" style={{ zIndex: 2, transform: 'translateX(2rem) translateY(-1rem)' }}>
             <div className="s-avatar"></div>
             <div>
               <strong>Tech Lead</strong>
               <div className="s-tags"><span className="tag-green">Score de fit cultural</span></div>
             </div>
           </div>
           <div className="s-card s-card-3" style={{ transform: 'translateX(1rem) translateY(-2rem)' }}>
             <div>
               <strong>Arquiteto DevOps</strong>
               <div className="s-tags"><span className="tag-blue">AWS</span></div>
             </div>
           </div>
        </div>
        
        <div className="p-section-text">
          <h2 className="p-section-title">Curadoria de Elite,<br/>sem o ruído.</h2>
          <p className="p-section-desc">
            Nosso processo de curadoria não é um filtro automatizado
            genérico. Cada candidato em nossa base passa por uma
            avaliação técnica rigorosa realizada por especialistas da área.
          </p>
          <div className="p-feature-list">
            <div className="p-feature">
              <div className="f-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </div>
              <div className="f-text">
                <strong>Avaliação por Pares</strong>
                <p>Entrevistas técnicas conduzidas por engenheiros sênior.</p>
              </div>
            </div>
            <div className="p-feature">
              <div className="f-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              </div>
              <div className="f-text">
                <strong>Análise Comportamental</strong>
                <p>Mapeamento de soft skills e ambições de carreira.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Matching Inteligente Section */}
      <section className="container p-section p-section-reverse align-center bg-gray-section">
        <div className="p-section-text">
          <h2 className="p-section-title">Matching Inteligente:<br/>Onde o código encontra a<br/>visão.</h2>
          <p className="p-section-desc">
            Utilizamos nossa IA proprietária para cruzar não apenas palavras-
            chave, mas a complexidade técnica dos projetos do candidato
            com os desafios reais da sua empresa.
          </p>
          <div className="p-highlight-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
              <div className="h-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              </div>
              <strong>Taxa de Match de 98.4%</strong>
            </div>
            <p>
              Nossa IA avalise padrões de contribuição em repositórios e
              complexidade de arquitetura para garantir que o nível técnico seja
              exatamente o que você busca.
            </p>
          </div>
        </div>
        <div className="p-mockup-dark">
          <div className="mockup-img-placeholder"></div>
        </div>
      </section>

      {/* Gestão em Tempo Real */}
      <section className="container text-center" style={{ padding: '6rem 2rem 2rem' }}>
        <h2 className="p-section-title" style={{ marginBottom: '1rem' }}>Gestão em Tempo Real</h2>
        <p className="p-section-desc centered-desc" style={{ margin: '0 auto 4rem', maxWidth: '600px' }}>
          Um dashboard editorial desenhado para clareza máxima. Acompanhe seu pipeline, 
          feedbacks e contratações sem a complexidade dos CRMs tradicionais.
        </p>
        
        <div className="dashboard-preview">
          <div className="dashboard-sidebar">
             <div className="stat-box">
               <span className="stat-label">VAGAS ATIVAS</span>
               <div className="stat-val" style={{ color: 'var(--primary)' }}>12</div>
             </div>
             <div className="stat-box" style={{ background: 'var(--primary)', color: 'white' }}>
               <span className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>ENTREVISTAS HOJE</span>
               <div className="stat-val">04</div>
             </div>
             <div className="stat-box">
               <span className="stat-label">TEMPO PARA CONTRATAR</span>
               <div className="stat-val" style={{ color: 'var(--primary-light)' }}>18d</div>
             </div>
          </div>
          <div className="dashboard-main">
             <div className="d-header">
               <strong>Pipeline de Recrutamento</strong>
               <div className="dots"><span></span><span></span><span></span></div>
             </div>
             <div className="d-lane">
                <div className="cand-card">
                  <div className="c-info">
                    <div className="c-avatar-small"></div>
                    <div>
                      <strong>Bruno Almeida</strong>
                      <span className="c-role">Engenheiro Front-end Sênior</span>
                    </div>
                  </div>
                  <div className="c-status status-gray">AVALIAÇÃO TÉCNICA</div>
                </div>
                <div className="cand-card">
                  <div className="c-info">
                    <div className="c-avatar-small"></div>
                    <div>
                      <strong>Carla Mendes</strong>
                      <span className="c-role">Arquiteto Cloud</span>
                    </div>
                  </div>
                  <div className="c-status status-green">OFERTA ENVIADA</div>
                </div>
                <div className="cand-card" style={{ opacity: 0.6 }}>
                  <div className="c-info">
                    <div className="c-avatar-small"></div>
                    <div>
                      <strong>Roberto Silva</strong>
                      <span className="c-role">Desenvolvedor Mobile (iOS)</span>
                    </div>
                  </div>
                  <div className="c-status status-outline">TRIAGEM IA</div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="container" style={{ padding: '6rem 2rem' }}>
        <div className="p-elevate-box">
          <h2>Pronto para elevar o nível<br/>do seu time?</h2>
          <p>
            Junte-se às empresas que estão redefinindo o futuro da tecnologia<br/>
            com a precisão que só o Studio oferece.
          </p>
          <div className="elevate-actions">
            <button className="btn" style={{ background: 'white', color: 'var(--primary)', padding: '1rem 2rem' }}>Experimentar Grátis</button>
            <button className="btn" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '1rem 2rem' }}>Falar com um Especialista</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ProductPage;

// Próximo passo: Refinamento de UX, Integração de APIs e Testes de Produção
