import os
from typing import Annotated, Literal, TypedDict, Optional
from dotenv import load_dotenv

load_dotenv()

from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph, MessagesState
from langchain_core.tools import tool
from langchain_core.messages import ToolMessage, SystemMessage

# Define custom state
class AgentBState(MessagesState):
    input_outline: Optional[str]
    final_agent_b_output: Optional[str]

@tool
def submit_content_object(content_object: str):
    """Submit the final JSON-agnostic content object."""
    return "Content object submitted successfully."

tools = [submit_content_object]

# Define the system prompt for the Content Designer
SYSTEM_PROMPT = """You are Agent B: The Content Designer (Creative) for a SurveyJS form builder system.
Your goal is to take a structured survey outline and produce a detailed, JSON-agnostic content object.

Your Input:
You will receive a structured outline from Agent A (Product Manager).

Your Responsibilities:
1.  **Analyze the Outline**: Understand the pages, sections, and goals defined in the outline.
2.  **Design Content**: Write the specific questions, titles, descriptions, and choices.
    *   Focus on *what* needs to be asked (e.g., "Question: How was the crust?", "Type: Rating", "Options: 1-5").
    *   Do NOT worry about the specific SurveyJS JSON property names (that's Agent C's job).
    *   Ensure the tone is consistent and engaging.
3.  **Structure the Output**: Produce a clean, structured text or pseudo-JSON object that clearly defines:
    *   Global settings (from the outline).
    *   Pages (with titles/descriptions).
    *   Questions per page (with types, titles, choices, validation rules if implied).
4.  **Finalize**: Call the `submit_content_object` tool with your final design.

Example Output Format (in the tool call):
Global: Show Progress Bar (Top)
Page 1: Customer Info
  - Question 1: Name (Text)
  - Question 2: Email (Text, required)
Page 2: Feedback
  - Question 1: Rating (1-5 stars)
  - Question 2: Comments (Long text)

Be creative but stick to the requirements in the outline.
"""

# Define the model
model = ChatOpenAI(model="gpt-4o-mini", temperature=0).bind_tools(tools)

# Define the function that calls the model
def call_model(state: AgentBState):
    messages = state['messages']
    # If this is the first run, we might need to inject the input outline into the context
    # But typically the orchestrator will pass messages. 
    # If we want to be explicit, we can check if input_outline is in state and add it as a user message if not present.
    
    # For now, we assume the previous agent's output is passed as a message or we just use the system prompt.
    # Let's add the input_outline as a context message if it exists and isn't in messages
    
    input_outline = state.get("input_outline", "")
    context_message = f"Here is the survey outline to design content for:\n{input_outline}"
    
    messages_with_system = [SystemMessage(content=SYSTEM_PROMPT)] + messages
    if input_outline:
         messages_with_system.append(SystemMessage(content=context_message))

    response = model.invoke(messages_with_system)
    print(f"\n[Agent B] Model Response: {response.content}")
    if response.tool_calls:
        print(f"[Agent B] Tool Calls: {response.tool_calls}")
    return {"messages": [response]}

# Define the function that calls tools
def call_tools(state: AgentBState):
    messages = state["messages"]
    last_message = messages[-1]
    
    tool_calls = last_message.tool_calls
    tool_messages = []
    state_update = {}
    
    for tool_call in tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call["args"]
        
        print(f"[Agent B] Calling Tool: {tool_name} with args: {tool_args}")
        
        # Find and call the tool
        for tool in tools:
            if tool.name == tool_name:
                result = tool.invoke(tool_args)
                print(f"[Agent B] Tool Result: {result}")
                tool_messages.append(
                    ToolMessage(
                        content=str(result),
                        tool_call_id=tool_call["id"]
                    )
                )
                
                if tool_name == "submit_content_object":
                    state_update["final_agent_b_output"] = tool_args.get("content_object")
                    print(f"[Agent B] Setting final_agent_b_output...")
                break
    
    state_update["messages"] = tool_messages
    return state_update

# Define the function that determines whether to continue or not
def should_continue(state: AgentBState) -> Literal["tools", END]:
    messages = state['messages']
    last_message = messages[-1]
    if last_message.tool_calls:
        return "tools"
    return END

def should_continue_tools(state: AgentBState) -> Literal["agent", END]:
    if state.get("final_agent_b_output"):
        print("[Agent B] Final output found. Ending.")
        return END
    print("[Agent B] Final output NOT found. Looping back to agent.")
    return "agent"

def get_graph(checkpointer=None):
    workflow = StateGraph(AgentBState)
    workflow.add_node("agent", call_model)
    workflow.add_node("tools", call_tools)
    workflow.add_edge(START, "agent")
    workflow.add_conditional_edges("agent", should_continue)
    workflow.add_conditional_edges("tools", should_continue_tools)
    return workflow.compile(checkpointer=checkpointer)
