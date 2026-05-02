from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage
from backend.agente_recruter.tools.github_tools import github_repo_analysis, web_search_professional

def create_tech_validator_agent():
    """
    Cria um agente validador técnico usando o modelo Gemini com tool calling.
    Compatível com LangChain 1.2.x.
    """
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash-latest", temperature=0)
    tools = [github_repo_analysis, web_search_professional]
    llm_with_tools = llm.bind_tools(tools)

    def run(inputs: dict) -> dict:
        prompt = (
            "Você é o Agente Validador Técnico do AGENTE-RECRUTER. Sua missão é realizar uma auditoria "
            "quantitativa e qualitativa nos ativos do candidato. Extraia obrigatoriamente:\n"
            "1. Volume de Projetos: Total de repositórios públicos.\n"
            "2. Mix de Tecnologias (%): Distribuição percentual do uso de linguagens.\n"
            "3. Indícios de IA: Identifique projetos com foco em IA.\n"
            "4. Cruzamento: Compare se a stack real condiz com o currículo.\n\n"
            f"Tarefa: {inputs.get('input', '')}"
        )

        response = llm_with_tools.invoke([HumanMessage(content=prompt)])

        # Processa tool calls se existirem
        tool_results = []
        if hasattr(response, 'tool_calls') and response.tool_calls:
            tool_map = {t.name: t for t in tools}
            for tool_call in response.tool_calls:
                tool_name = tool_call.get("name", "")
                tool_args = tool_call.get("args", {})
                if tool_name in tool_map:
                    try:
                        result = tool_map[tool_name].invoke(tool_args)
                        tool_results.append(f"[{tool_name}]: {result}")
                    except Exception as e:
                        tool_results.append(f"[{tool_name}]: Erro - {str(e)}")

        if tool_results:
            # Segunda chamada com os resultados das ferramentas
            final_prompt = (
                f"{prompt}\n\n"
                f"Resultados das consultas:\n" + "\n".join(tool_results) + "\n\n"
                "Com base nesses dados, gere o relatório de validação técnica."
            )
            final_response = llm.invoke([HumanMessage(content=final_prompt)])
            return {"output": final_response.content}

        return {"output": response.content}

    return run
