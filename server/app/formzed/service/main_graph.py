import json
from typing import TypedDict, Annotated, List, Dict, Any, Optional
from langgraph.graph import StateGraph, END, START, MessagesState
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from app.formzed.service.agent_a import get_graph as get_agent_a_graph
from app.formzed.service.agent_b import get_graph as get_agent_b_graph
from app.formzed.service.agent_c import get_graph as get_agent_c_graph
from app.formzed.service.validator import validate_json

# Define the overall graph state
class MainState(MessagesState):
    # We track the outputs of each stage
    agent_a_output: Optional[str]
    agent_b_output: Optional[str]
    final_json: Optional[str]
    validation_error: Optional[str]

# Node for Agent A
def run_agent_a(state: MainState):
    print("--- Running Agent A ---")
    agent_a_graph = get_agent_a_graph()
    
    # We pass the current messages to Agent A
    input_state = {"messages": state["messages"]}
    
    result = agent_a_graph.invoke(input_state)
    
    # Update messages with the result from Agent A
    updates = {"messages": result["messages"]}
    
    # Check if Agent A produced a final output
    if "final_agent_a_output" in result and result["final_agent_a_output"]:
        updates["agent_a_output"] = result["final_agent_a_output"]
        
    return updates

# Node for Agent B
def run_agent_b(state: MainState):
    print("--- Running Agent B ---")
    agent_b_graph = get_agent_b_graph()
    
    # Agent B needs the output from Agent A
    outline = state.get("agent_a_output")
    if not outline:
        return {"messages": [AIMessage(content="Error: No outline provided by Agent A.")]}
        
    input_state = {
        "messages": [], # Agent B starts fresh
        "input_outline": outline
    }
    
    result = agent_b_graph.invoke(input_state)
    
    updates = {}
    if "final_agent_b_output" in result and result["final_agent_b_output"]:
        updates["agent_b_output"] = result["final_agent_b_output"]
        # Optionally append a summary message to the main history
        updates["messages"] = [AIMessage(content="Agent B has designed the content.")]
        
    return updates

# Node for Agent C
def run_agent_c(state: MainState):
    print("--- Running Agent C ---")
    agent_c_graph = get_agent_c_graph()
    
    content_object = state.get("agent_b_output")
    if not content_object:
        return {"messages": [AIMessage(content="Error: No content object provided by Agent B.")]}
    
    # If there's a validation error, pass it to Agent C
    messages = []
    if state.get("validation_error"):
        error_msg = f"The previous JSON was invalid. Fix this error: {state['validation_error']}"
        print(f"--- Passing Validation Error to Agent C: {error_msg} ---")
        messages.append(HumanMessage(content=error_msg))
        
    input_state = {
        "messages": messages,
        "input_content_object": content_object
    }
    
    # If we are retrying, we might want to pass the previous JSON too, but Agent C generates it from scratch or context.
    # Ideally, Agent C should see its previous attempt.
    # But for now, let's just pass the error and let it regenerate.
    
    result = agent_c_graph.invoke(input_state, config={"recursion_limit": 50})
    
    updates = {}
    if "final_agent_c_output" in result and result["final_agent_c_output"]:
        updates["final_json"] = result["final_agent_c_output"]
        updates["messages"] = [AIMessage(content=f"Final Survey JSON Generated:\n{result['final_agent_c_output']}")]
        # Clear previous validation error if any
        updates["validation_error"] = None
        
    return updates

# Node for Validation
def run_validation(state: MainState):
    print("--- Running Validation ---")
    json_str = state.get("final_json")
    if not json_str:
        return {"validation_error": "No JSON to validate."}
    
    try:
        json_data = json.loads(json_str)
        validation_result = validate_json(json_data)
        
        if validation_result == "Valid":
            print("--- JSON is Valid ---")
            return {"validation_error": None}
        else:
            print(f"--- JSON Validation Failed: {validation_result} ---")
            return {"validation_error": validation_result}
            
    except json.JSONDecodeError as e:
        print(f"--- JSON Decode Error: {e} ---")
        return {"validation_error": f"Invalid JSON format: {e}"}

# Router logic for entry
def route_entry(state: MainState):
    if state.get("final_json") and not state.get("validation_error"):
        return END
    if state.get("validation_error"):
        return "agent_c"
    if state.get("agent_b_output"):
        return "agent_c"
    if state.get("agent_a_output"):
        return "agent_b"
    return "agent_a"

# Router logic after Agent A
def route_after_agent_a(state: MainState):
    if state.get("agent_a_output"):
        return "agent_b"
    return END # Wait for user input

# Router logic after Agent C
def route_after_agent_c(state: MainState):
    if state.get("final_json"):
        return "validation"
    return END # Should not happen if Agent C always produces output or loops

# Router logic after Validation
def route_after_validation(state: MainState):
    if state.get("validation_error"):
        return "agent_c"
    return END

def get_main_graph(checkpointer=None):
    workflow = StateGraph(MainState)
    
    workflow.add_node("agent_a", run_agent_a)
    workflow.add_node("agent_b", run_agent_b)
    workflow.add_node("agent_c", run_agent_c)
    workflow.add_node("validation", run_validation)
    
    # Entry point routing
    workflow.add_conditional_edges(START, route_entry)
    
    # Edge from Agent A
    workflow.add_conditional_edges("agent_a", route_after_agent_a)
    
    # Edge from Agent B
    workflow.add_edge("agent_b", "agent_c")
    
    # Edge from Agent C
    workflow.add_conditional_edges("agent_c", route_after_agent_c)
    
    # Edge from Validation
    workflow.add_conditional_edges("validation", route_after_validation)
    
    return workflow.compile(checkpointer=checkpointer)
