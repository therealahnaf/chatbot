import os
import json
from typing import Annotated, Literal, TypedDict, Any, Optional, Dict, List
from dotenv import load_dotenv

load_dotenv()

from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph, MessagesState
from langchain_core.tools import tool
from langchain_core.messages import ToolMessage, SystemMessage, AIMessage, HumanMessage
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from app.formzed.service.schema_loader import get_schema_elements, resolve_reference

# Load the vector database
# vector_db is located at ../vector_db relative to this file
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "vector_db")
try:
    embeddings = OpenAIEmbeddings()
    vector_db = FAISS.load_local(DB_PATH, embeddings, allow_dangerous_deserialization=True)
except Exception as e:
    print(f"Error loading vector database: {e}")
    vector_db = None

# --- State Definition ---
class AgentCState(MessagesState):
    input_content_object: Optional[str]
    namespace_map: Optional[Dict[str, Any]] # Stores IDs
    partial_json: Optional[Dict[str, Any]] # Stores the evolving JSON
    final_agent_c_output: Optional[str]

# --- Tools ---
@tool
def get_schema_elements_tool():
    """
    Get a list of all available SurveyJS elements (question types, panels, etc.) and global survey properties.
    Use this to see what building blocks are available.
    """
    return get_schema_elements()

@tool
def resolve_schema_reference_tool(reference: str):
    """
    Resolve a specific schema reference to get its full definition and properties.
    Args:
        reference: The reference string, e.g., "#page", "#panel", "#text", "#rating".
    """
    if not reference.startswith("#"):
        reference = f"#{reference}"
    result = resolve_reference(reference)
    if "error" in result:
        return result["error"]
    return json.dumps(result, indent=2)

@tool
def search_schema_index(query: str):
    """
    Search the master index (documentation) for information about SurveyJS elements, properties, and concepts.
    Use this to understand WHAT elements are available and HOW they work before using them.
    """
    if vector_db is None:
        return "Error: Vector database is not available."
    
    try:
        results = vector_db.similarity_search(query, k=3)
        return "\n\n---\n\n".join([doc.page_content for doc in results])
    except Exception as e:
        return f"Error during search: {e}"

tools = [get_schema_elements_tool, resolve_schema_reference_tool, search_schema_index]

# --- Model ---
base_model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
model_with_tools = base_model.bind_tools(tools)

# --- Prompts ---

PHASE_1_PROMPT = """You are Agent C (Phase 1: Namespace Declaration).
Your goal is to define the **Identifier Strings** for the survey based on the input content.

**Input:**
User requirements and content outline.

**Task:**
1.  **Search & Discover:** Use `search_schema_index` to understand the elements you might need (e.g., "what is a page?", "question types for contact info").
2.  **Define Page IDs:** List every page `name` (e.g., "page_intro", "page_details").
3.  **Define Question IDs:** List every question `name` (e.g., "q_name", "q_email").
    *   Constraint: Names must be unique.
    *   Convention: Use prefixes like `q_` for questions and `page_` for pages.

**Output:**
Return a JSON object with `page_ids` (list of strings) and `question_ids` (list of strings).
Do NOT generate the full survey JSON yet. Just the IDs.
"""

PHASE_2_PROMPT = """You are Agent C (Phase 2: Global Configuration).
Your goal is to initialize the root object of the survey.

**Input:**
Namespace Map (IDs) from Phase 1.

**Task:**
1.  Create the Root Object.
2.  Set `mode` to "edit" (so the user can fill it out) and `questionsOnPageMode` (usually "standard").
3.  Initialize empty arrays for dependency containers: `pages`, `triggers`, `calculatedValues`.

**Output:**
Return the initial JSON skeleton.
"""

PHASE_3_PROMPT = """You are Agent C (Phase 3: Content Definition).
Your goal is to populate the `pages` and `elements` in the JSON.

**Input:**
Initial JSON skeleton and Namespace Map.
Content requirements.

**Task:**
1.  Populate the `pages` array using the IDs from Phase 1.
2.  Inside each Page, create the `elements` (Questions/Panels).
    *   Assign `name` (ID) and `type` immediately.
    *   Define `title` and `choices` (for dropdowns/radios).
    *   **CRITICAL:** Do NOT add `visibleIf`, `enableIf`, `requiredIf`, `triggers`, or `validators` yet. Focus only on existence and structure.

**Tools Strategy:**
1.  **Search First:** Use `search_schema_index` to find properties of elements (e.g., "properties of text question", "how to configure rating").
2.  **Validate:** Use `resolve_schema_reference_tool` to check the actual schema definition (e.g., `#text`) to ensure your generated JSON structure matches the schema's expectations.
3.  **Check Available:** Use `get_schema_elements_tool` if you need a list of types.

**Output:**
Return the updated JSON with pages and elements populated.
"""

PHASE_4_PROMPT = """You are Agent C (Phase 4: Wiring).
Your goal is to connect the nodes using logic and dependencies.

**Input:**
JSON with content (Phase 3).
Content requirements.

**Task:**
1.  **Internal Logic:** Add `visibleIf`, `enableIf`, `requiredIf` to questions.
    *   Reference other question names defined in Phase 1/3.
2.  **Validation:** Add `validators` array to questions where needed.
3.  **Global Logic:** Add `triggers` and `calculatedValues` to the root object.

**Tools:**
Use `get_schema_elements_tool` and `resolve_schema_reference_tool` to understand logic properties.

**Output:**
Return the updated JSON with logic wired in.
"""

PHASE_5_PROMPT = """You are Agent C (Phase 5: Polish).
Your goal is to add non-functional properties and finalize the JSON.

**Input:**
Wired JSON (Phase 4).

**Task:**
1.  **Global:** Add `title`, `logo`, `completedHtml`, `showProgressBar`.
2.  **Page:** Add `navigationTitle`, `description`.
3.  **Question:** Add `description`, `placeHolder`.

**Output:**
Return the FINAL valid SurveyJS JSON string.
"""

FIX_AGENT_PROMPT = """You are the Schema Fixing Agent.
Your goal is to fix the validation errors in the SurveyJS JSON.

**Input:**
1. The invalid JSON.
2. The validation error message.

**Task:**
1.  **Analyze:** Understand the validation error (e.g., "invalid type", "missing property").
2.  **Search & Resolve:** Use `search_schema_index` and `resolve_schema_reference_tool` to understand the correct schema definition for the failing element.
3.  **Fix:** Correct the JSON to comply with the schema.

**Output:**
Return the FIXED valid SurveyJS JSON string.
"""

# --- Nodes ---

import re

def extract_json(text):
    """
    Extract JSON object from text, handling markdown code blocks and surrounding text.
    """
    text = text.strip()
    
    # Try to find JSON block with ```json wrapper
    match = re.search(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        return match.group(1)
        
    # Try to find JSON block with just ``` wrapper
    match = re.search(r"```\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        return match.group(1)
    
    # Try to find just the first { to the last }
    # We use a non-greedy match for the content but greedy for the outer braces?
    # Actually, {.*} with DOTALL is greedy and matches from first { to last }.
    # This is usually correct for a single root object.
    match = re.search(r"(\{.*\})", text, re.DOTALL)
    if match:
        return match.group(1)
        
    return text

# --- Nodes ---

def run_phase_1(state: AgentCState):
    print("--- Agent C: Phase 1 (Namespace) ---")
    input_content = state.get("input_content_object", "")
    print("Input content:", input_content)
    
    messages = [
        SystemMessage(content=PHASE_1_PROMPT),
        HumanMessage(content=f"Requirements: {input_content}")
    ]
    print("Phase 1 input messages:", messages)
    response = base_model.invoke(messages)
    print("Phase 1 response:", response.content)
    
    try:
        content = extract_json(response.content)
        namespace_map = json.loads(content)
        print("Phase 1 namespace_map:", namespace_map)
        return {"namespace_map": namespace_map, "messages": [response]}
    except Exception as e:
        print("Phase 1 failed:", str(e))
        return {"namespace_map": {}, "messages": [response]}

def execute_tools_loop(messages, model, max_iterations=10):
    """
    Execute tools in a loop until no more tool calls are made.
    Returns the list of new messages generated (AI messages + Tool messages).
    """
    new_messages = []
    response = model.invoke(messages)
    new_messages.append(response)
    
    for i in range(max_iterations):
        if not response.tool_calls:
            break
            
        print(f"Tool loop iteration {i+1}/{max_iterations}")
            
        # Execute tools
        tool_outputs = []
        for tc in response.tool_calls:
            if tc["name"] == "get_schema_elements_tool":
                res = get_schema_elements_tool.invoke({})
            elif tc["name"] == "resolve_schema_reference_tool":
                res = resolve_schema_reference_tool.invoke(tc["args"])
            elif tc["name"] == "search_schema_index":
                res = search_schema_index.invoke(tc["args"])
            else:
                res = "Unknown tool"
            tool_outputs.append(ToolMessage(content=str(res), tool_call_id=tc["id"]))
        
        new_messages.extend(tool_outputs)
        
        # Update context for next iteration
        current_history = messages + new_messages
        response = model.invoke(current_history)
        new_messages.append(response)
        
    return new_messages, response

def run_phase_2(state: AgentCState):
    print("--- Agent C: Phase 2 (Global Config) ---")
    namespace_map = state.get("namespace_map", {})
    print("Phase 2 input namespace_map:", namespace_map)
    
    messages = [
        SystemMessage(content=PHASE_2_PROMPT),
        HumanMessage(content=f"Namespace Map: {json.dumps(namespace_map)}")
    ]
    response = base_model.invoke(messages)
    print("Phase 2 response:", response.content)
    
    try:
        content = extract_json(response.content)
        partial_json = json.loads(content)
        print("Phase 2 partial_json:", partial_json)
        return {"partial_json": partial_json, "messages": [response]}
    except Exception as e:
        print("Phase 2 failed:", str(e))
        return {"partial_json": {}, "messages": [response]}

def run_phase_3(state: AgentCState):
    print("--- Agent C: Phase 3 (Content Definition) ---")
    partial_json = state.get("partial_json", {})
    namespace_map = state.get("namespace_map", {})
    input_content = state.get("input_content_object", "")
    print("Phase 3 inputs - partial_json:", partial_json)
    print("Phase 3 inputs - namespace_map:", namespace_map)
    
    # Prepare initial context
    initial_messages = state["messages"] + [
        SystemMessage(content=PHASE_3_PROMPT),
        HumanMessage(content=f"Current JSON: {json.dumps(partial_json)}\nNamespace Map: {json.dumps(namespace_map)}\nRequirements: {input_content}")
    ]
    
    # Run loop
    new_messages, final_response = execute_tools_loop(initial_messages, model_with_tools)
    print("Phase 3 final response:", final_response.content)

    try:
        content = extract_json(final_response.content)
        updated_json = json.loads(content)
        print("Phase 3 updated_json:", updated_json)
        return {"partial_json": updated_json, "messages": new_messages}
    except Exception as e:
        print("Phase 3 failed:", str(e))
        return {"messages": new_messages}

def run_phase_4(state: AgentCState):
    print("--- Agent C: Phase 4 (Wiring) ---")
    partial_json = state.get("partial_json", {})
    input_content = state.get("input_content_object", "")
    print("Phase 4 inputs - partial_json:", partial_json)
    
    # Prepare initial context
    initial_messages = state["messages"] + [
        SystemMessage(content=PHASE_4_PROMPT),
        HumanMessage(content=f"Current JSON: {json.dumps(partial_json)}\nRequirements: {input_content}")
    ]
    
    # Run loop
    new_messages, final_response = execute_tools_loop(initial_messages, model_with_tools)
    print("Phase 4 final response:", final_response.content)
    
    try:
        content = extract_json(final_response.content)
        updated_json = json.loads(content)
        print("Phase 4 updated_json:", updated_json)
        return {"partial_json": updated_json, "messages": new_messages}
    except Exception as e:
        print("Phase 4 failed:", str(e))
        return {"messages": new_messages}

def run_phase_5(state: AgentCState):
    print("--- Agent C: Phase 5 (Polish) ---")
    partial_json = state.get("partial_json", {})
    print("Phase 5 input partial_json:", partial_json)
    
    messages = state["messages"] + [
        SystemMessage(content=PHASE_5_PROMPT),
        HumanMessage(content=f"Current JSON: {json.dumps(partial_json)}")
    ]
    
    response = base_model.invoke(messages)
    print("Phase 5 response:", response.content)
    
    try:
        content = extract_json(response.content)
        print("Raw content:", content)
        # Validate it's JSON
        parsed_json = json.loads(content)
        print("JSON content:", parsed_json)
        return {"final_agent_c_output": content, "messages": [response]}
    except Exception as e:
        print("JSON parsing failed:", str(e))
        print("Content that failed:", content)
        # Return content anyway so validation node can catch it (or main graph can see it failed)
        return {"final_agent_c_output": content, "messages": [response]}

# --- Fixing Agent Node ---
def run_fix_agent(state: AgentCState):
    print("--- Agent C: Fixing Agent ---")
    messages = state["messages"]
    
    # Add the system prompt for the fixing agent
    # We prepend it or append it? 
    # The messages list contains the HumanMessage with the error.
    # We should probably construct a new list for the model call to ensure the SystemMessage is first or relevant.
    
    # If we just append, the history might be weird if it's empty.
    # Let's create a new list starting with SystemMessage, then the HumanMessage from state.
    
    # Check if there are existing messages
    existing_messages = state.get("messages", [])
    
    # Construct prompt messages
    prompt_messages = [SystemMessage(content=FIX_AGENT_PROMPT)] + existing_messages
    
    # Run the tool loop
    new_messages, final_response = execute_tools_loop(prompt_messages, model_with_tools)
    print("Fixing Agent response:", final_response.content)
    
    try:
        content = extract_json(final_response.content)
        # Validate it's JSON
        parsed_json = json.loads(content)
        print("Fixed JSON content:", parsed_json)
        return {"final_agent_c_output": content, "messages": new_messages}
    except Exception as e:
        print("Fixing Agent failed to parse JSON:", str(e))
        # Return content anyway
        return {"final_agent_c_output": content, "messages": new_messages}

def route_start(state: AgentCState):
    messages = state.get("messages", [])
    if messages and isinstance(messages[-1], HumanMessage):
        content = messages[-1].content
        # Check for the specific error message format from main_graph
        if "The previous JSON was invalid" in content:
            return "fix_agent"
    return "phase_1"

# --- Graph ---

def get_graph(checkpointer=None):
    workflow = StateGraph(AgentCState)
    
    workflow.add_node("phase_1", run_phase_1)
    workflow.add_node("phase_2", run_phase_2)
    workflow.add_node("phase_3", run_phase_3)
    workflow.add_node("phase_4", run_phase_4)
    workflow.add_node("phase_5", run_phase_5)
    workflow.add_node("fix_agent", run_fix_agent)
    
    workflow.add_conditional_edges(START, route_start)
    workflow.add_edge("phase_1", "phase_2")
    workflow.add_edge("phase_2", "phase_3")
    workflow.add_edge("phase_3", "phase_4")
    workflow.add_edge("phase_4", "phase_5")
    workflow.add_edge("phase_5", END)
    workflow.add_edge("fix_agent", END)
    
    return workflow.compile(checkpointer=checkpointer)
