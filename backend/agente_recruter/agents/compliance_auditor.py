from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from backend.agente_recruter.tools.compliance_tools import credit_check, legal_check

def create_compliance_auditor_agent():
    """
    Cria um agente auditor de compliance usando o modelo Gemini com tool calling.
    Compatível com LangChain 1.2.x.
    """
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash-latest", temperature=0)
    tools = [credit_check, legal_check]
    llm_with_tools = llm.bind_tools(tools)

    def run(inputs: dict) -> dict:
        prompt = (
            "Você é o Agente Auditor de Compliance. Sua função é realizar verificações de integridade "
            "financeira e jurídica baseadas EXCLUSIVAMENTE no CPF fornecido. "
            "DIRETRIZ CRÍTICA: Realize consultas determinísticas. É PROIBIDA qualquer inferência ou dedução. "
            "Reporte apenas os dados brutos retornados pelas fontes. Se não houver dados, diga 'Nenhum registro encontrado'.\n\n"
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
                "Com base nesses dados, gere o relatório de auditoria de compliance."
            )
            final_response = llm.invoke([HumanMessage(content=final_prompt)])
            return {"output": final_response.content}

        return {"output": response.content}

    return run
