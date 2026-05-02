import streamlit as st
import pandas as st_pd
import pandas as pd
import ast
import plotly.express as px
import plotly.graph_objects as go
import os

# --- Page Config ---
st.set_page_config(
    page_title="Impact Dashboard - Global Talent Bridge",
    page_icon="🌍",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.title("🌍 Dashboard de Impacto: Social e Econômico")
st.markdown("Bem-vindo ao dashboard de visualização de impactos do modelo Talent as a Service (TaaS) da nossa Startup.")

# --- Data Loading ---
@st.cache_data
def load_data():
    base_path = "bases"
    
    # Load Survey (for global salary data)
    survey_path = os.path.join(base_path, "survey_results_public.csv")
    try:
        survey_cols = ['Country', 'ConvertedCompYearly', 'Age', 'EdLevel', 'DevType', 'WorkExp']
        df_survey = pd.read_csv(survey_path, usecols=lambda c: c in survey_cols, low_memory=False)
        df_survey = df_survey.dropna(subset=['ConvertedCompYearly', 'Country'])
    except Exception as e:
        df_survey = pd.DataFrame()
        st.error(f"Erro ao carregar survey_results_public.csv: {e}")

    # Load Postings (for remote jobs and salaries)
    postings_path = os.path.join(base_path, "postings.csv")
    try:
        posting_cols = ['job_id', 'title', 'max_salary', 'remote_allowed', 'work_type', 'location', 'pay_period']
        df_postings = pd.read_csv(postings_path, usecols=lambda c: c in posting_cols, low_memory=False)
    except Exception as e:
        df_postings = pd.DataFrame()
        st.error(f"Erro ao carregar postings.csv: {e}")

    # Load Resumes (for skills and social impact)
    resume_path = os.path.join(base_path, "resume_data.csv")
    try:
        resume_cols = ['skills', 'locations', 'job_position_name']
        df_resume = pd.read_csv(resume_path, usecols=lambda c: c in resume_cols, low_memory=False)
    except Exception as e:
        df_resume = pd.DataFrame()
        st.error(f"Erro ao carregar resume_data.csv: {e}")

    return df_survey, df_postings, df_resume

with st.spinner("Carregando bases de dados (Isso pode levar alguns instantes)..."):
    df_survey, df_postings, df_resume = load_data()

# --- Processamento ---
def process_skills(df):
    if df.empty or 'skills' not in df.columns:
        return pd.DataFrame()
    
    # Preenchendo NaNs e pegando amostra (se for muito grande, limitamos pra nao travar)
    df = df.dropna(subset=['skills']).copy()
    
    # Avaliando string para lista
    def safe_eval(val):
        try:
            return ast.literal_eval(val)
        except (ValueError, SyntaxError):
            return []
    
    df['skills_list'] = df['skills'].apply(safe_eval)
    
    # Explodindo as habilidades para contagem individual
    skills_exploded = df.explode('skills_list')
    skills_counts = skills_exploded['skills_list'].value_counts().reset_index()
    skills_counts.columns = ['Skill', 'Count']
    
    # Filtrar skills muito curtas ou vazias
    skills_counts = skills_counts[skills_counts['Skill'].str.len() > 1]
    
    return skills_counts

skills_counts = process_skills(df_resume)

# Padronizando salarios (postings)
if not df_postings.empty:
    df_postings['max_salary'] = pd.to_numeric(df_postings['max_salary'], errors='coerce')
    # Considerando apenas salarios anuais e acima de 10k
    df_postings_annual = df_postings[(df_postings['pay_period'] == 'YEARLY') & (df_postings['max_salary'] > 10000)].copy()
else:
    df_postings_annual = pd.DataFrame()

# --- SIDEBAR FILTERS ---
st.sidebar.header("Filtros")

selected_countries = []
if not df_survey.empty:
    top_countries = df_survey['Country'].value_counts().head(20).index.tolist()
    default_countries = ['Brazil', 'United States of America', 'Germany']
    # Mantendo apenas os que existem na base
    default_countries = [c for c in default_countries if c in top_countries]
    selected_countries = st.sidebar.multiselect(
        "Selecione Países para Comparação Salarial", 
        options=top_countries, 
        default=default_countries
    )

selected_skill = None
if not skills_counts.empty:
    top_skills = skills_counts['Skill'].head(50).tolist()
    selected_skill = st.sidebar.selectbox("Filtrar por Habilidade Principal (Resumes)", options=['Todas'] + top_skills)

st.sidebar.markdown("---")
st.sidebar.info("Dashboard PI - Entrega 2\n\nImpactos Sociais e Econômicos.")

# --- TABS ---
tab1, tab2 = st.tabs(["📊 Impacto Econômico (Arbitragem Cambial)", "🤝 Impacto Social (Mapeamento de Talentos)"])

with tab1:
    st.header("Impacto Econômico")
    st.markdown("Visualização das diferenças salariais entre países, destacando o potencial de **arbitragem cambial** ao conectar profissionais a vagas globais.")
    
    col1, col2 = st.columns(2)
    
    if not df_survey.empty and 'Brazil' in df_survey['Country'].values:
        median_br = df_survey[df_survey['Country'] == 'Brazil']['ConvertedCompYearly'].median()
        median_usa = df_survey[df_survey['Country'] == 'United States of America']['ConvertedCompYearly'].median()
        
        upside = 0
        if pd.notna(median_br) and pd.notna(median_usa) and median_br > 0:
            upside = (median_usa / median_br) * 100 - 100
            
        with col1:
            st.metric(label="Mediana Salarial Anual - Brasil", value=f"${median_br:,.0f}")
        with col2:
            st.metric(label="Potential Upside (EUA vs BR)", value=f"+{upside:,.0f}%", 
                      delta="Arbitragem viável", delta_color="normal")
            
    st.subheader("Comparação de Salários (USD) por País")
    if not df_survey.empty and selected_countries:
        filtered_survey = df_survey[df_survey['Country'].isin(selected_countries)]
        
        fig1 = px.box(filtered_survey, x="Country", y="ConvertedCompYearly", 
                      points=False, # remove outliers points to render faster
                      color="Country",
                      labels={"ConvertedCompYearly": "Salário Anual (USD)", "Country": "País"},
                      title="Distribuição Salarial Anual (Desenvolvedores)")
        fig1.update_layout(yaxis=dict(range=[0, 300000])) # Limite visual para melhor leitura
        st.plotly_chart(fig1, use_container_width=True)
    else:
        st.info("Nenhum país selecionado ou dados indisponíveis.")
        
    st.subheader("Vagas com Potencial Remoto (LinkedIn)")
    if not df_postings.empty:
        # Contagem de vagas presenciais vs remotas
        remote_counts = df_postings['remote_allowed'].fillna(0).value_counts().reset_index()
        remote_counts.columns = ['is_remote', 'count']
        remote_counts['is_remote'] = remote_counts['is_remote'].map({1.0: 'Remoto', 0.0: 'Presencial'})
        
        fig_remote = px.pie(remote_counts, values='count', names='is_remote', 
                            hole=0.4, title="Distribuição de Vagas: Presencial vs Remoto",
                            color_discrete_sequence=['#3b5998', '#1fb122'])
        st.plotly_chart(fig_remote, use_container_width=True)
        
with tab2:
    st.header("Impacto Social")
    st.markdown("Compreendendo o pool de talentos: as habilidades mais comuns disponíveis nos currículos dos candidatos e o potencial de alocação de profissionais ociosos.")
    
    if not skills_counts.empty:
        st.subheader("Top 15 Habilidades Mais Frequentes")
        
        fig2 = px.bar(skills_counts.head(15), x='Count', y='Skill', orientation='h',
                      color='Count', color_continuous_scale='Blues',
                      labels={'Count': 'Número de Menções', 'Skill': 'Habilidade'},
                      title="Habilidades em Destaque nos Currículos")
        fig2.update_layout(yaxis={'categoryorder':'total ascending'})
        st.plotly_chart(fig2, use_container_width=True)
        
        if selected_skill and selected_skill != 'Todas':
            st.info(f"O filtro específico de Habilidades será expandido para cruzamento avançado de vagas no futuro. Skill destacada: **{selected_skill}**")
    else:
        st.warning("Não foi possível processar a lista de habilidades nos currículos.")
        
    st.subheader("Profissionais e Níveis de Experiência (Contexto)")
    st.markdown("""
    Ao conectar esses talentos ao mercado global (onde a mediana salarial é superior, como visto na aba anterior),
    conseguimos reter talentos localmente e injetar dólares na economia local (Impacto Econômico), ao mesmo tempo 
    em que garantimos a democratização do acesso a vagas de alta qualidade para perfis que estariam limitados às fronteiras geográficas (Impacto Social).
    """)
    
    # Mostrar algumas linhas da base
    if not df_resume.empty:
        with st.expander("Ver Amostra dos Dados de Currículos"):
            st.dataframe(df_resume.head(100), use_container_width=True)

st.markdown("---")
st.caption("Dashboard desenvolvido para a Entrega 2 do Projeto Interdisciplinar (PI).")
