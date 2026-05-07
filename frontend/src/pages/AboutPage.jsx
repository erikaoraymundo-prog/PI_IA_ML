import React from 'react';
import '../index.css';

const AboutPage = () => {
  return (
    <div className="about-page">
      {/* Hero */}
      <section className="container about-hero">
        <div className="about-hero-content">
          <span className="pill-tag">NOSSA ESSÊNCIA</span>
          <h1 className="about-hero-title">Humanizando a<br/>precisão do<br/>recrutamento tech.</h1>
          <p className="about-hero-subtitle">
            Não somos apenas algoritmos. Somos a ponte entre o talento visionário e as empresas que estão moldando o futuro através do código.
          </p>
        </div>
        <div className="about-hero-image">
          <div className="about-hero-img-wrapper">
            <img src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="Equipe" />
            <div className="about-float-card">
              <h4>Coração Real</h4>
              <p>Combinamos métricas técnicas rigorosas com a empatia necessária para entender as visões humanas.</p>
            </div>
          </div>
        </div>
      </section>

      {/* History */}
      <section className="container about-history-section">
        <div className="about-history-grid">
          <div className="history-mosaic">
            <div className="mosaic-item m-dark-teal">2021</div>
            <div className="mosaic-item m-dark">
                <div className="m-icon-placeholder dark"></div>
            </div>
            <div className="mosaic-item m-light">
                <div className="m-icon-placeholder light"></div>
            </div>
            <div className="mosaic-item m-gray">
              <span>+10k Conexões</span>
            </div>
          </div>
          <div className="history-content">
            <h2 className="section-title">Nossa História</h2>
            <p className="about-text">O globalTalentBridge nasceu de uma frustração compartilhada: o recrutamento técnico havia se tornado frio, mecânico e focado apenas em palavras-chave, esquecendo-se da história por trás de cada linha de código.</p>
            <p className="about-text">Fundada em 2021, nossa missão foi clara desde o primeiro dia: agilizar e simplificar a busca incansável por vagas e a demanda crescente dos empregadores por talentos qualificados.</p>
            <p className="about-text">Acreditamos que o match perfeito não acontece apenas no GitHub, mas na sinergia de propósitos, valores e visões de mundo.</p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="container about-values-section">
        <div className="values-header">
          <h2 className="section-title">O que nos move</h2>
          <p className="about-subtitle">Os pilares que sustentam cada decisão que tomamos.</p>
        </div>
        
        <div className="about-values-grid">
          <div className="value-card">
            <div className="value-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </div>
            <h3>Transparência</h3>
            <p>Sem "ghosting" ou processos nebulosos. Do feedback técnico à negociação salarial, operamos em canal aberto com candidatos e parceiros.</p>
          </div>
          <div className="value-card">
            <div className="value-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
            </div>
            <h3>Precisão</h3>
            <p>Nossa curadoria é cirúrgica. Não enviamos volumes; entregamos qualidade fundamentada em dados técnicos e alinhamento cultural profundo.</p>
          </div>
          <div className="value-card">
            <div className="value-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            </div>
            <h3>Humanidade</h3>
            <p>Candidatos não são recursos. São pessoas com sonhos e ambições. Tratamos cada jornada profissional com o respeito e a empatia que ela merece.</p>
          </div>
        </div>
      </section>

      {/* Culture */}
      <section className="about-culture-dark">
        <div className="container culture-grid">
          <div className="culture-content">
            <h2 className="section-title c-white">O pulso do nosso Studio</h2>
            <p className="culture-desc">
              Nossa cultura é baseada na autonomia radical, na curiosidade intelectual constante e no compromisso inabalável com a excelência técnica.
            </p>
            
            <div className="culture-item">
              <div className="c-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </div>
              <div className="c-item-text">
                <h4>Colaboração Radical</h4>
                <p>Problemas complexos não são resolvidos sozinhos. Cultivamos a inteligência coletiva.</p>
              </div>
            </div>
            
            <div className="culture-item">
              <div className="c-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              </div>
              <div className="c-item-text">
                <h4>Mente de Engenheiro</h4>
                <p>Abordamos o recrutamento como um problema de engenharia: escalável e iterativo.</p>
              </div>
            </div>
          </div>
          <div className="culture-mosaic">
            <div className="c-mosaic-top">
              <div className="c-mosaic-img" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1584281722889-13e618d3b80b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80)' }}></div>
              <div className="c-mosaic-color"></div>
            </div>
            <div className="c-mosaic-bottom">
              <div className="c-mosaic-img" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1507679622830-184ad0cbf328?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80)' }}></div>
              <div className="c-quote-box">
                "Não contratamos currículos, contratamos o potencial de transformar ideias em realidade."
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container about-cta-section">
        <h2 className="section-title">Pronto para elevar o padrão do seu time?</h2>
        <p className="about-subtitle">Junte-se às empresas que já descobriram que o recrutamento técnico pode ser preciso e humano ao mesmo tempo.</p>
        <div className="elevate-actions">
          <button className="btn btn-primary" style={{ padding: '1rem 2.5rem' }}>Contrate Conosco</button>
          <button className="btn btn-outline" style={{ padding: '1rem 2.5rem', background: '#e2e8f0', border: 'none' }}>Ver vagas</button>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;

// Próximo passo: Refinamento de UX, Integração de APIs e Testes de Produção
