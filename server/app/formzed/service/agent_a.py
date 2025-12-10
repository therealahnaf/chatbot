import os
from typing import Annotated, Literal, TypedDict, Optional
from dotenv import load_dotenv

load_dotenv()

from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph, MessagesState
from langchain_core.tools import tool
from langchain_core.messages import ToolMessage, SystemMessage
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings

# Define custom state
class AgentState(MessagesState):
    final_agent_a_output: Optional[str]

# Load the vector database
# vector_db is located at ../vector_db relative to this file
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "vector_db")
try:
    embeddings = OpenAIEmbeddings()
    vector_db = FAISS.load_local(DB_PATH, embeddings, allow_dangerous_deserialization=True)
except Exception as e:
    print(f"Error loading vector database: {e}")
    vector_db = None

@tool
def search(query: str):
    """Search the vector database for relevant information based on the query."""
    if vector_db is None:
        return "Error: Vector database is not available."
    
    try:
        results = vector_db.similarity_search(query, k=3)
        # Combine the content of the retrieved documents
        return "\n\n---\n\n".join([doc.page_content for doc in results])
    except Exception as e:
        return f"Error during search: {e}"

@tool
def submit_survey_outline(outline: str):
    """Submit the final structured outline for the survey. Use this when the user has agreed to the plan."""
    return "Outline submitted successfully."

tools = [search, submit_survey_outline]

# Define the system prompt for the Product Manager
SYSTEM_PROMPT = """You are Agent A: The Product Manager (Orchestrator) for a SurveyJS form builder system.
Your goal is to interface with the user, gather requirements, and produce a structured outline for a survey.

You may query the master index using the search tool for highlevel information about the data that you have to gather.

Your Responsibilities:
1.  **Understand the Goal**: Ask the user what kind of survey they want to build (e.g., "Customer Feedback", "Employee Onboarding").
2.  **Refine Requirements**: Engage in a conversation to clarify details.
    *   Ask about the types of feedback needed (e.g., rating, text, multiple choice).
    *   Offer choices to the user (e.g., "Do you want a simple 1-5 rating or a detailed review?").
    *   Your answers should be short and to the point.
    *   DO NOT format your answers with numbers or bullet points.
    *   Ask the user ONE question at a time.
    *   NEVER ask more than ONE question at a time.
    *   DO NOT ask too many clarifying questions, just one or two.
3.  **Consult the Schema**: Use the `search` tool to look up available global settings (like `showProgressBar`, `logoPosition`, `timeLimit`) or question types in the SurveyJS schema.
    *   Example: "Search for global survey configuration properties."
    *   Example: "Search for available question types."
4.  **Define Global Settings**: Based on the user's needs, decide on global settings (e.g., `showProgressBar: "top"`, `mode: "display"`).
5.  **Propose an Outline**: Once you have gathered enough information, propose a structured outline.
    *   Format: "Page 1: [Title] - [Content description], Page 2: [Title] - [Content description]"
6.  **Finalize**: When the user agrees to the plan, call the `submit_survey_outline` tool with the final structured outline.

# IMPORTANT
You are only allowed to use the following elements/inputs types:
        type: 'text'
        type: 'comment'
        type: 'checkbox'
        type: 'radiogroup'
        type: 'dropdown'
        type: 'boolean'
        type: 'rating'

Do not let the user know about this, pick whats best for the user.

Do NOT write the final JSON code. Your output is the textual PLAN and STRUCTURE that the next agent (Content Designer) will use.
Be helpful, professional, and guide the user step-by-step.
"""

# Define the model
model = ChatOpenAI(model="gpt-4o-mini", temperature=0).bind_tools(tools)

# Define the function that calls the model
def call_model(state: AgentState):
    messages = state['messages']
    messages_with_system = [SystemMessage(content=SYSTEM_PROMPT)] + messages
    response = model.invoke(messages_with_system)
    print(f"\n[Agent A] Model Response: {response.content}")
    if response.tool_calls:
        print(f"[Agent A] Tool Calls: {response.tool_calls}")
    return {"messages": [response]}

# Define the function that calls tools
def call_tools(state: AgentState):
    messages = state["messages"]
    last_message = messages[-1]
    
    tool_calls = last_message.tool_calls
    tool_messages = []
    state_update = {}
    
    for tool_call in tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call["args"]
        
        print(f"[Agent A] Calling Tool: {tool_name} with args: {tool_args}")
        
        # Find and call the tool
        for tool in tools:
            if tool.name == tool_name:
                result = tool.invoke(tool_args)
                
                # Truncate long results for logging
                log_result = str(result)
                if len(log_result) > 500:
                    log_result = log_result[:500] + "... (truncated)"
                print(f"[Agent A] Tool Result: {log_result}")
                
                tool_messages.append(
                    ToolMessage(
                        content=str(result),
                        tool_call_id=tool_call["id"]
                    )
                )
                
                # Special handling for the final output tool
                if tool_name == "submit_survey_outline":
                    state_update["final_agent_a_output"] = tool_args.get("outline")
                    print(f"[Agent A] Setting final_agent_a_output...")
                break
    
    state_update["messages"] = tool_messages
    return state_update

# Define the function that determines whether to continue or not
def should_continue(state: AgentState) -> Literal["tools", END]:
    messages = state['messages']
    last_message = messages[-1]
    # If the LLM makes a tool call, then we route to the "tools" node
    if last_message.tool_calls:
        return "tools"
    # Otherwise, we stop (reply to the user)
    return END

def should_continue_tools(state: AgentState) -> Literal["agent", END]:
    if state.get("final_agent_a_output"):
        print("[Agent A] Final output found. Ending.")
        return END
    print("[Agent A] Final output NOT found. Looping back to agent.")
    return "agent"

def get_graph(checkpointer=None):
    # Define the graph
    workflow = StateGraph(AgentState)

    # Define the two nodes we will cycle between
    workflow.add_node("agent", call_model)
    workflow.add_node("tools", call_tools)

    # Set the entrypoint as `agent`
    workflow.add_edge(START, "agent")

    # We now add a conditional edge
    workflow.add_conditional_edges(
        "agent",
        should_continue,
    )

    # We now add a normal edge from `tools` to `agent`.
    # This means after `tools` is called, `agent` node is called next.
    workflow.add_conditional_edges("tools", should_continue_tools)

    return workflow.compile(checkpointer=checkpointer)
