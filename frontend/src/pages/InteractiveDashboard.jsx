import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, CartesianGrid 
} from 'recharts';

const COLORS = ['#00a896', '#004d5b', '#6366f1', '#8b5cf6', '#ec4899'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
        padding: '1rem', 
        borderRadius: '12px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(0, 168, 150, 0.2)'
      }}>
        <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-dark)' }}>{label}</p>
        <p style={{ margin: 0, color: 'var(--primary)', fontSize: '1.1rem', fontWeight: 600 }}>
          {payload[0].name === 'Salario' ? `$${payload[0].value.toLocaleString()}` : payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

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
        setTimeout(() => setLoading(false), 800);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container" style={{ padding: '8rem 2rem', textAlign: 'center', minHeight: '80vh' }}>
        <div className="loading-spinner" style={{ 
          width: '50px', height: '50px', border: '4px solid #f3f3f3', 
          borderTop: '4px solid var(--primary)', borderRadius: '50%', 
          margin: '0 auto 1.5rem', animation: 'spin 1s linear infinite' 
        }}></div>
        <h2 className="section-title" style={{ fontSize: '1.8rem', opacity: 0.8 }}>Analisando Métricas Globais...</h2>
        <p className="hero-subtitle" style={{ margin: '0.5rem auto' }}>Conectando dados do Firebase e processando tendências.</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '4rem 2rem', minHeight: 'calc(100vh - 80px)' }}>
      {/* Header Section */}
      <div style={{ 
        background: 'linear-gradient(135deg, #004d5b 0%, #00a896 100%)',
        padding: '3rem',
        borderRadius: '24px',
        color: 'white',
        marginBottom: '3rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontSize: '2.8rem', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-0.02em' }}>🌍 Dashboard de Impacto</h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.9, maxWidth: '700px', lineHeight: 1.6 }}>
            Exploração dinâmica de dados sobre arbitragem cambial, retenção de talentos e o ecossistema tecnológico global.
          </p>
        </div>
        <div style={{ 
          position: 'absolute', right: '-50px', top: '-50px', 
          width: '200px', height: '200px', background: 'rgba(255,255,255,0.1)', 
          borderRadius: '50%', filter: 'blur(40px)' 
        }}></div>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', gap: '1rem', marginBottom: '2.5rem', 
        padding: '0.5rem', background: '#f1f5f9', borderRadius: '16px',
        width: 'fit-content'
      }}>
        <button 
          onClick={() => setActiveTab('economic')}
          style={{ 
            border: 'none', padding: '0.8rem 2.5rem', cursor: 'pointer',
            fontSize: '1rem', fontWeight: 700, 
            background: activeTab === 'economic' ? 'white' : 'transparent',
            color: activeTab === 'economic' ? 'var(--primary)' : 'var(--text-muted)',
            borderRadius: '12px',
            boxShadow: activeTab === 'economic' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          📊 Impacto Econômico
        </button>
        <button 
          onClick={() => setActiveTab('social')}
          style={{ 
            border: 'none', padding: '0.8rem 2.5rem', cursor: 'pointer',
            fontSize: '1rem', fontWeight: 700, 
            background: activeTab === 'social' ? 'white' : 'transparent',
            color: activeTab === 'social' ? 'var(--primary)' : 'var(--text-muted)',
            borderRadius: '12px',
            boxShadow: activeTab === 'social' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          🤝 Impacto Social
        </button>
      </div>

      {activeTab === 'economic' && ecoData && (
        <div style={{ animation: 'fadeIn 0.5s ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
            <div className="card" style={{ 
              background: 'white', textAlign: 'left', padding: '2rem', 
              borderRadius: '20px', border: '1px solid #e2e8f0',
              display: 'flex', flexDirection: 'column', justifyContent: 'center'
            }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mediana Salarial BR</span>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-dark)', margin: '0.5rem 0' }}>
                ${ecoData.median_br.toLocaleString()}
              </div>
              <div style={{ color: '#059669', fontWeight: 600, fontSize: '0.9rem' }}>↗ Referência Nacional</div>
            </div>
            
            <div className="card" style={{ 
              background: 'white', textAlign: 'left', padding: '2rem', 
              borderRadius: '20px', border: '1px solid #e2e8f0',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)'
            }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Potencial de Ganho</span>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)', margin: '0.5rem 0' }}>
                +{ecoData.upside.toLocaleString()}%
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Global vs Local</div>
            </div>

            <div className="card" style={{ 
              background: 'var(--primary)', color: 'white', padding: '2rem', 
              borderRadius: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center'
            }}>
              <span style={{ opacity: 0.8, fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase' }}>Oportunidade</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.5rem 0' }}>Arbitragem Cambial</div>
              <p style={{ fontSize: '0.85rem', opacity: 0.9 }}>Eficiência financeira para empresas globais.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
            <div className="card" style={{ padding: '2rem', borderRadius: '24px', background: 'white', border: '1px solid #e2e8f0' }}>
              <h3 style={{ marginBottom: '2rem', fontSize: '1.25rem', fontWeight: 700 }}>Comparação Salarial Geográfica</h3>
              <div style={{ height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ecoData.salaries_dist}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.3}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="Country" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Salario" fill="url(#barGradient)" radius={[8, 8, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="card" style={{ padding: '2rem', borderRadius: '24px', background: 'white', border: '1px solid #e2e8f0' }}>
              <h3 style={{ marginBottom: '2rem', fontSize: '1.25rem', fontWeight: 700 }}>Presença de Vagas Remotas</h3>
              <div style={{ height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ecoData.remote_dist}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {ecoData.remote_dist.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'social' && socialData && (
        <div style={{ animation: 'fadeIn 0.5s ease' }}>
          <div className="card" style={{ 
            marginBottom: '3rem', padding: '2.5rem', borderRadius: '24px', 
            background: 'white', border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
          }}>
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.4rem', fontWeight: 700 }}>Top Habilidades em Destaque</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem' }}>Distribuição de expertises técnicas mais procuradas e disponíveis.</p>
            <div style={{ height: '450px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={socialData.top_skills} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#1e293b', fontWeight: 600, fontSize: '0.85rem'}} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="var(--secondary)" radius={[0, 8, 8, 0]} barSize={25} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div style={{ 
            background: 'rgba(99, 102, 241, 0.05)', 
            padding: '2.5rem', 
            borderRadius: '24px', 
            border: '1px solid rgba(99, 102, 241, 0.1)',
            display: 'flex',
            gap: '2rem',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '3rem' }}>💡</div>
            <div>
              <h3 style={{ marginBottom: '0.75rem', fontSize: '1.2rem', fontWeight: 700, color: '#4338ca' }}>Insights de Impacto</h3>
              <p style={{ color: '#475569', fontSize: '1rem', lineHeight: 1.7, margin: 0 }}>
                Ao conectar talentos latino-americanos com empresas globais, não apenas otimizamos custos, mas 
                promovemos o desenvolvimento social local através da injeção de capital estrangeiro e exposição 
                a projetos de alta complexidade técnica.
              </p>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default InteractiveDashboard;
