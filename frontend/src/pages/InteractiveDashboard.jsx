import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, CartesianGrid 
} from 'recharts';

const COLORS = ['#00a896', '#004d5b', '#6366f1', '#8b5cf6', '#ec4899'];

// Dados estáticos de demonstração (espelho do MOCK no backend)
const MOCK_ECONOMIC_DATA = {
  median_br: 18000,
  median_usa: 110000,
  upside: 511,
  salaries_dist: [
    { Country: "Brazil", Salario: 12000 },
    { Country: "Spain", Salario: 18000 },
    { Country: "Bolivia", Salario: 24000 },
    { Country: "United States of America", Salario: 80000 },
    { Country: "China", Salario: 110000 },
    { Country: "Canada", Salario: 150000 },
    { Country: "Germany", Salario: 60000 },
    { Country: "Japan", Salario: 75000 },
  ],
  remote_dist: [
    { name: "Remoto", value: 350 },
    { name: "Presencial", value: 150 }
  ]
};

const MOCK_SOCIAL_DATA = {
  top_skills: [
    { name: "Python", count: 240 },
    { name: "React", count: 195 },
    { name: "Node.js", count: 180 },
    { name: "SQL", count: 150 },
    { name: "AWS", count: 130 },
    { name: "Docker", count: 110 },
    { name: "TypeScript", count: 105 },
    { name: "FastAPI", count: 80 },
    { name: "Figma", count: 65 },
    { name: "Machine Learning", count: 55 },
  ],
  resumes_sample: []
};

const CustomTooltip = memo(({ active, payload, label }) => {
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
});

// Skeleton loader para cards e gráficos
const SkeletonCard = ({ height = '200px' }) => (
  <div style={{
    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '20px',
    height,
    width: '100%'
  }} />
);

const BACKEND_URL = import.meta.env.VITE_API_URL || '';

const InteractiveDashboard = () => {
  const [activeTab, setActiveTab] = useState('economic');
  const [ecoData, setEcoData] = useState(null);
  const [socialData, setSocialData] = useState(null);
  const [loading, setLoading] = useState(true);

  // economic tab states
  const [selectedCountries, setSelectedCountries] = useState(['Brazil', 'United States of America', 'Germany']);

  // social tab states
  const [selectedSkill, setSelectedSkill] = useState('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const [isSampleExpanded, setIsSampleExpanded] = useState(false);
  const itemsPerPage = 8;

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      // Se tem backend, fazer fetch com AbortController para cancelar se demorar

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      try {
        const [ecoRes, socialRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/dashboard/economic`, { signal: controller.signal }),
          fetch(`${BACKEND_URL}/api/dashboard/social`, { signal: controller.signal })
        ]);

        clearTimeout(timeoutId);

        if (!cancelled && ecoRes.ok && socialRes.ok) {
          const [eco, social] = await Promise.all([
            ecoRes.json(),
            socialRes.json()
          ]);
          setEcoData(eco);
          setSocialData(social);
        } else if (!cancelled) {
          // Fallback para mock se API retornar erro
          setEcoData(MOCK_ECONOMIC_DATA);
          setSocialData(MOCK_SOCIAL_DATA);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("Backend indisponível, usando dados de demonstração.", err.name === 'AbortError' ? '(timeout)' : err);
          setEcoData(MOCK_ECONOMIC_DATA);
          setSocialData(MOCK_SOCIAL_DATA);
        }
      } finally {
        clearTimeout(timeoutId);
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, []);

  // Memoizar dados dos gráficos para evitar re-renders desnecessários
  const salariesData = useMemo(() => ecoData?.salaries_dist || [], [ecoData]);
  const remoteData = useMemo(() => ecoData?.remote_dist || [], [ecoData]);
  const skillsData = useMemo(() => socialData?.top_skills || [], [socialData]);
  const resumesSample = useMemo(() => socialData?.resumes_sample || [], [socialData]);

  // List of top 20 countries
  const topCountriesList = useMemo(() => {
    return salariesData.map(s => s.Country);
  }, [salariesData]);

  const filteredSalariesData = useMemo(() => {
    return salariesData.filter(s => selectedCountries.includes(s.Country));
  }, [salariesData, selectedCountries]);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  // Handlers for country filter
  const handleAddCountry = useCallback((country) => {
    if (country && !selectedCountries.includes(country)) {
      setSelectedCountries(prev => [...prev, country]);
    }
  }, [selectedCountries]);

  const handleRemoveCountry = useCallback((country) => {
    setSelectedCountries(prev => prev.filter(c => c !== country));
  }, []);

  // Social tab filters
  const filteredResumes = useMemo(() => {
    if (!searchTerm.trim()) return resumesSample;
    const term = searchTerm.toLowerCase();
    return resumesSample.filter(r => 
      r.job_position_name.toLowerCase().includes(term) || 
      r.skills.toLowerCase().includes(term) ||
      r.locations.toLowerCase().includes(term)
    );
  }, [resumesSample, searchTerm]);

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPageNum(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredResumes.length / itemsPerPage);
  const paginatedResumes = useMemo(() => {
    const start = (currentPageNum - 1) * itemsPerPage;
    return filteredResumes.slice(start, start + itemsPerPage);
  }, [filteredResumes, currentPageNum]);

  // Helper to clean locations display
  const cleanLocation = useCallback((locStr) => {
    if (!locStr) return 'N/A';
    try {
      let cleaned = locStr.replace(/[\[\]']/g, '').trim();
      if (cleaned === 'N/A' || !cleaned) return 'N/A';
      return cleaned;
    } catch {
      return locStr;
    }
  }, []);

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', minHeight: 'calc(100vh - 80px)' }}>
        {/* Header Skeleton */}
        <div style={{
          background: 'linear-gradient(135deg, #004d5b 0%, #00a896 100%)',
          borderRadius: '24px', padding: '3rem', marginBottom: '2rem',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ 
              width: '350px', height: '2.8rem', background: 'rgba(255,255,255,0.2)', 
              borderRadius: '12px', marginBottom: '1rem' 
            }} />
            <div style={{ 
              width: '500px', maxWidth: '100%', height: '1.1rem', background: 'rgba(255,255,255,0.15)', 
              borderRadius: '8px' 
            }} />
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', background: '#f1f5f9', padding: '0.5rem', borderRadius: '16px', width: 'fit-content' }}>
          <div style={{ width: '180px', height: '42px', background: 'white', borderRadius: '12px' }} />
          <div style={{ width: '160px', height: '42px', background: 'transparent', borderRadius: '12px' }} />
        </div>

        {/* Cards Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
          <SkeletonCard height="150px" />
          <SkeletonCard height="150px" />
          <SkeletonCard height="150px" />
        </div>

        {/* Charts Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
          <SkeletonCard height="400px" />
          <SkeletonCard height="400px" />
        </div>

        <style>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '4rem 1rem', minHeight: 'calc(100vh - 80px)' }}>
      {/* Header Section */}
      <div className="agente-header" style={{ background: 'linear-gradient(135deg, #004d5b 0%, #00a896 100%)' }}>
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
      <div className="dashboard-tabs">
        <button 
          onClick={() => handleTabChange('economic')}
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
          onClick={() => handleTabChange('social')}
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

          {/* Filtro de Países Interativo */}
          <div className="card" style={{ padding: '2rem', borderRadius: '24px', background: 'white', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>🔍 Selecionar Países para Comparação Salarial</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.2rem' }}>Selecione um ou mais países do top 20 para comparar sua mediana salarial anual em dólares:</p>
            
            {/* Badges de Países Ativos */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.2rem' }}>
              {selectedCountries.map(country => (
                <span key={country} style={{
                  background: 'var(--primary-light)',
                  color: 'white',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '99px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  animation: 'fadeIn 0.2s'
                }}>
                  {country === 'United States of America' ? 'USA' : country === 'United Kingdom of Great Britain and Northern Ireland' ? 'UK' : country}
                  <button 
                    onClick={() => handleRemoveCountry(country)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      padding: '0 0.1rem'
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* Dropdown para Adicionar País */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <select 
                onChange={(e) => handleAddCountry(e.target.value)}
                value=""
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: 'white',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  maxWidth: '260px'
                }}
              >
                <option value="" disabled>Adicionar País...</option>
                {topCountriesList.filter(c => !selectedCountries.includes(c)).map(c => (
                  <option key={c} value={c}>
                    {c === 'United States of America' ? 'United States (USA)' : c === 'United Kingdom of Great Britain and Northern Ireland' ? 'United Kingdom (UK)' : c}
                  </option>
                ))}
              </select>
              {selectedCountries.length === 0 && (
                <span style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>Nenhum país selecionado. Selecione ao menos um.</span>
              )}
              <button 
                onClick={() => setSelectedCountries(['Brazil', 'United States of America', 'Germany'])}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                🔄 Restaurar Padrão
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            <div className="card" style={{ padding: '2rem', borderRadius: '24px', background: 'white', border: '1px solid #e2e8f0' }}>
              <h3 style={{ marginBottom: '2rem', fontSize: '1.25rem', fontWeight: 700 }}>Comparação Salarial Geográfica (Mediana Anual em USD)</h3>
              <div style={{ height: '350px' }}>
                {filteredSalariesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredSalariesData}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.3}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="Country" 
                        axisLine={false} 
                        tickLine={false} 
                        tickFormatter={(val) => val === 'United States of America' ? 'USA' : val === 'United Kingdom of Great Britain and Northern Ireland' ? 'UK' : val}
                        tick={{fill: '#64748b', fontSize: 11}} 
                        interval={0} 
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="Salario" fill="url(#barGradient)" radius={[8, 8, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    Nenhum dado a exibir. Adicione um país acima.
                  </div>
                )}
              </div>
            </div>
            
            <div className="card" style={{ padding: '2rem', borderRadius: '24px', background: 'white', border: '1px solid #e2e8f0' }}>
              <h3 style={{ marginBottom: '2rem', fontSize: '1.25rem', fontWeight: 700 }}>Presença de Vagas Remotas (LinkedIn Base Real)</h3>
              <div style={{ height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={remoteData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {remoteData.map((entry, index) => (
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
          
          {/* Filtro de Stack Principal */}
          <div className="card" style={{ padding: '2rem', borderRadius: '24px', background: 'white', border: '1px solid #e2e8f0', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark)' }}>🔍 Destacar Stack Tecnológica:</label>
                <select 
                  value={selectedSkill}
                  onChange={(e) => setSelectedSkill(e.target.value)}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'white',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    minWidth: '240px'
                  }}
                >
                  <option value="Todas">Mostrar Todas as Habilidades</option>
                  {skillsData.map(s => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
              
              {selectedSkill !== 'Todas' && (
                <div style={{
                  background: 'rgba(0, 168, 150, 0.05)',
                  padding: '0.8rem 1.2rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(0, 168, 150, 0.15)',
                  fontSize: '0.9rem',
                  color: 'var(--text-dark)',
                  flex: 1,
                  animation: 'fadeIn 0.25s'
                }}>
                  💡 <strong>Pool de Talentos</strong>: Encontramos <strong>{skillsData.find(s => s.name === selectedSkill)?.count}</strong> menções à stack <strong>{selectedSkill}</strong> nos currículos da base. Esta stack está destacada no gráfico abaixo!
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ 
            marginBottom: '3rem', padding: '2.5rem', borderRadius: '24px', 
            background: 'white', border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
          }}>
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.4rem', fontWeight: 700 }}>Top 15 Habilidades Mais Frequentes</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem' }}>Distribuição das stacks de destaque identificadas na triagem de currículos:</p>
            <div style={{ height: '520px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skillsData} layout="vertical" margin={{ left: 50, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#1e293b', fontWeight: 600, fontSize: '0.85rem'}} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={22}>
                    {skillsData.map((entry, index) => {
                      const isHighlighted = selectedSkill === 'Todas' || entry.name === selectedSkill;
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={isHighlighted ? (selectedSkill !== 'Todas' ? 'var(--secondary)' : 'var(--primary)') : '#cbd5e1'} 
                        />
                      );
                    })}
                  </Bar>
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
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: '2rem',
            alignItems: 'center',
            marginBottom: '3rem'
          }}>
            <div style={{ fontSize: '3rem' }}>💡</div>
            <div style={{ flex: '1 1 300px' }}>
              <h3 style={{ marginBottom: '0.75rem', fontSize: '1.2rem', fontWeight: 700, color: '#4338ca' }}>Insights de Impacto</h3>
              <p style={{ color: '#475569', fontSize: '1rem', lineHeight: 1.7, margin: 0 }}>
                Ao conectar talentos latino-americanos com empresas globais, não apenas otimizamos custos, mas 
                promovemos o desenvolvimento social local através da injeção de capital estrangeiro e exposição 
                a projetos de alta complexidade técnica.
              </p>
            </div>
          </div>

          {/* Seção Sanfonada: Visualizar Amostra dos Currículos */}
          <div className="card" style={{ padding: 0, borderRadius: '24px', background: 'white', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <button 
              onClick={() => setIsSampleExpanded(!isSampleExpanded)}
              style={{
                width: '100%',
                padding: '1.8rem 2.5rem',
                border: 'none',
                background: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-dark)' }}>
                🤝 Visualizar Amostra dos Currículos (Base Real)
              </h3>
              <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', transition: 'transform 0.3s', transform: isSampleExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>
                ▼
              </span>
            </button>

            {isSampleExpanded && (
              <div style={{ padding: '0 2.5rem 2.5rem 2.5rem', animation: 'fadeIn 0.3s ease' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Exibindo uma amostra das primeiras 100 candidaturas processadas em nossa base de currículos (`resume_data.csv`).
                </p>

                {/* Barra de Busca */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <input 
                    type="text"
                    placeholder="Buscar por cargo, localização ou stack (ex: Python)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      padding: '0.75rem 1.2rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      background: '#f8fafc',
                      fontSize: '0.9rem',
                      width: '100%',
                      maxWidth: '450px',
                      marginBottom: 0
                    }}
                  />
                </div>

                {/* Tabela de Dados */}
                <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-dark)', width: '25%' }}>Cargo de Interesse</th>
                        <th style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-dark)', width: '20%' }}>Localização</th>
                        <th style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-dark)', width: '55%' }}>Competências</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedResumes.length > 0 ? (
                        paginatedResumes.map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }} className="table-row">
                            <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-dark)' }}>{row.job_position_name}</td>
                            <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{cleanLocation(row.locations)}</td>
                            <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                {row.skills.split(',').map((skill, sIdx) => (
                                  <span key={sIdx} style={{
                                    background: '#f1f5f9',
                                    color: '#334155',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: 500
                                  }}>
                                    {skill.trim()}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Nenhum currículo encontrado para o termo "{searchTerm}".
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Controles de Paginação */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Página <strong>{currentPageNum}</strong> de {totalPages} ({filteredResumes.length} registros encontrados)
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => setCurrentPageNum(p => Math.max(p - 1, 1))}
                        disabled={currentPageNum === 1}
                        className="btn"
                        style={{
                          padding: '0.5rem 1.2rem',
                          background: currentPageNum === 1 ? '#cbd5e1' : 'var(--primary)',
                          color: currentPageNum === 1 ? '#64748b' : 'white',
                          cursor: currentPageNum === 1 ? 'not-allowed' : 'pointer',
                          borderRadius: '8px',
                          fontWeight: 600,
                          fontSize: '0.85rem'
                        }}
                      >
                        Anterior
                      </button>
                      <button 
                        onClick={() => setCurrentPageNum(p => Math.min(p + 1, totalPages))}
                        disabled={currentPageNum === totalPages}
                        className="btn"
                        style={{
                          padding: '0.5rem 1.2rem',
                          background: currentPageNum === totalPages ? '#cbd5e1' : 'var(--primary)',
                          color: currentPageNum === totalPages ? '#64748b' : 'white',
                          cursor: currentPageNum === totalPages ? 'not-allowed' : 'pointer',
                          borderRadius: '8px',
                          fontWeight: 600,
                          fontSize: '0.85rem'
                        }}
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .table-row:hover { background-color: #f8fafc; }
        .dashboard-tabs button { outline: none; }
        .dashboard-tabs button:hover { background-color: rgba(0, 77, 91, 0.03) !important; }
      `}</style>
    </div>
  );
};

export default InteractiveDashboard;
