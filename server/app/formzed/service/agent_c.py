import os
import json
from typing import Annotated, Literal, TypedDict, Any, Optional, Dict, List
from dotenv import load_dotenv

load_dotenv()

from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph, MessagesState
from langchain_core.tools import tool
from langchain_core.messages import ToolMessage, SystemMessage, AIMessage, HumanMessage
from app.formzed.service.schema_loader import get_schema_elements, resolve_reference

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

tools = [get_schema_elements_tool, resolve_schema_reference_tool]

# --- Model ---
base_model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
model_with_tools = base_model.bind_tools(tools)

# --- Prompts ---

PHASE_1_PROMPT = """You are Agent C (Phase 1: Namespace Declaration).
Your goal is to define the **Identifier Strings** for the survey based on the input content.

**Input:**
User requirements and content outline.

**Task:**
1.  **Define Page IDs:** List every page `name` (e.g., "page_intro", "page_details").
2.  **Define Question IDs:** List every question `name` (e.g., "q_name", "q_email").
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
2.  Set `mode` (usually "display") and `questionsOnPageMode` (usually "standard").
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

**Tools:**
Use `get_schema_elements_tool` to check available types.
Use `resolve_schema_reference_tool` to check properties of specific elements.

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
        return {"messages": [response]}

# --- Graph ---

def get_graph(checkpointer=None):
    workflow = StateGraph(AgentCState)
    
    workflow.add_node("phase_1", run_phase_1)
    workflow.add_node("phase_2", run_phase_2)
    workflow.add_node("phase_3", run_phase_3)
    workflow.add_node("phase_4", run_phase_4)
    workflow.add_node("phase_5", run_phase_5)
    
    workflow.add_edge(START, "phase_1")
    workflow.add_edge("phase_1", "phase_2")
    workflow.add_edge("phase_2", "phase_3")
    workflow.add_edge("phase_3", "phase_4")
    workflow.add_edge("phase_4", "phase_5")
    workflow.add_edge("phase_5", END)
    
    return workflow.compile(checkpointer=checkpointer)
