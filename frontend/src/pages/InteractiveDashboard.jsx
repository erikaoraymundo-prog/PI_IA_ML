import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, CartesianGrid 
} from 'recharts';

const COLORS = ['#004d5b', '#00a896', '#6366f1', '#e2e8f0'];

const InteractiveDashboard = () => {
  const [activeTab, setActiveTab] = useState('economic');
  const [ecoData, setEcoData] = useState(null);
  const [socialData, setSocialData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [ecoRes, socialRes] = await Promise.all([
          fetch('http://localhost:8000/api/dashboard/economic'),
          fetch('http://localhost:8000/api/dashboard/social')
        ]);
        const eco = await ecoRes.json();
        const social = await socialRes.json();
        setEcoData(eco);
        setSocialData(social);
      } catch (err) {
        console.error("Erro ao carregar dados do dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container" style={{ padding: '6rem 2rem', textAlign: 'center' }}>
        <h2 className="section-title">Carregando Dados...</h2>
        <p className="hero-subtitle" style={{ margin: '0 auto' }}>Processando informações de impacto social e econômico.</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '4rem 2rem', minHeight: 'calc(100vh - 80px)' }}>
      <div style={{ marginBottom: '3rem' }}>
        <h1 className="hero-title" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🌍 Dashboard de Impacto</h1>
        <p className="hero-subtitle" style={{ margin: 0, maxWidth: '800px' }}>
          Visualização em tempo real dos impactos sociais e econômicos do modelo Talent as a Service (TaaS) da nossa plataforma.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
        <button 
          onClick={() => setActiveTab('economic')}
          style={{ 
            background: 'none', border: 'none', padding: '1rem 2rem', cursor: 'pointer',
            fontSize: '1rem', fontWeight: 600, color: activeTab === 'economic' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'economic' ? '3px solid var(--primary)' : '3px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          📊 Impacto Econômico
        </button>
        <button 
          onClick={() => setActiveTab('social')}
          style={{ 
            background: 'none', border: 'none', padding: '1rem 2rem', cursor: 'pointer',
            fontSize: '1rem', fontWeight: 600, color: activeTab === 'social' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'social' ? '3px solid var(--primary)' : '3px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          🤝 Impacto Social
        </button>
      </div>

      {activeTab === 'economic' && ecoData && (
        <div style={{ animation: 'slideDown 0.3s ease' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Diferenças salariais e potencial de <strong>arbitragem cambial</strong> conectando talentos globais.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
            <div className="card" style={{ background: '#f8fafa', textAlign: 'center', padding: '2rem' }}>
              <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '0.5rem' }}>Mediana Salarial Anual - Brasil</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-dark)' }}>
                ${ecoData.median_br.toLocaleString()}
              </div>
            </div>
            <div className="card" style={{ background: 'var(--primary)', color: 'white', textAlign: 'center', padding: '2rem' }}>
              <h3 style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', marginBottom: '0.5rem' }}>Potential Upside (EUA vs BR)</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>
                +{ecoData.upside.toLocaleString()}%
              </div>
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.9 }}>Arbitragem viável</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div className="card">
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Comparação de Salários (Amostra)</h3>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ecoData.salaries_dist} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="Country" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Bar dataKey="Salario" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="card">
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Vagas com Potencial Remoto</h3>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ecoData.remote_dist}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {ecoData.remote_dist.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'social' && socialData && (
        <div style={{ animation: 'slideDown 0.3s ease' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Compreendendo o pool de talentos: as habilidades mais comuns disponíveis nos currículos dos candidatos.
          </p>

          <div className="card" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Top Habilidades em Destaque</h3>
            <div style={{ height: '400px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={socialData.top_skills} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--secondary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="card" style={{ background: '#f8fbfc' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Profissionais e Níveis de Experiência</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Ao conectar esses talentos ao mercado global (onde a mediana salarial é superior),
              conseguimos reter talentos localmente e injetar dólares na economia local (Impacto Econômico), ao mesmo tempo 
              em que garantimos a democratização do acesso a vagas de alta qualidade para perfis que estariam limitados às fronteiras geográficas (Impacto Social).
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveDashboard;
