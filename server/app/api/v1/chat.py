from typing import Annotated, Optional, AsyncIterator
from uuid import UUID
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import json

from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from app.services.graph.workflow import create_graph, create_initial_messages
from app.core.logging import get_logger
from app.db.session import get_db
from app.services.knowledge_base.kb_service import KnowledgeBaseService
from app.services.conversation.conversation_service import ConversationService
from app.services.messages.message_service import MessageService
from app.api.deps import get_optional_user, security
from fastapi.security import HTTPAuthorizationCredentials
from app.integrations.openai_client import OpenAIClient
from app.schemas.conversation import ConversationCreate, MessageCreate

# Add system prompt first
from langchain_core.messages import SystemMessage
from app.services.graph.workflow import SYSTEM_PROMPT

logger = get_logger(__name__)


class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str


class QueryRequest(BaseModel):
    user_input: str
    conversation_history: list[ChatMessage] = []  # Optional conversation history
    conversation_id: Optional[UUID] = None
    conversation_title: Optional[str] = None


class QueryResponse(BaseModel):
    response: str


router = APIRouter(prefix="", tags=["Chat"])


def extract_agent_and_tool_info(messages):
    """Extract information about which agents and tools were used from messages."""
    agents_called = set()
    tools_called = set()
    
    for msg in messages:
        # Track AIMessages as agent outputs
        if isinstance(msg, AIMessage):
            # Try to infer which agent based on available tools
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                for tool_call in msg.tool_calls:
                    # Handle both dict and object tool_calls
                    if isinstance(tool_call, dict):
                        tool_name = tool_call.get("name", "unknown")
                    else:
                        tool_name = getattr(tool_call, "name", None)
                    
                    # Only add non-None tool names
                    if tool_name:
                        tools_called.add(tool_name)
                        
                        # Infer agent based on tool (for logging purposes)
                        if tool_name in ["search_knowledge_base"]:
                            agents_called.add("knowledge_base_tool")
        
        # Track ToolMessages as tool executions
        if isinstance(msg, ToolMessage):
            tool_name = getattr(msg, "name", None)
            if tool_name:
                tools_called.add(tool_name)
    
    # Filter out None values and sort (shouldn't have None now, but just to be safe)
    agents_list = sorted([a for a in agents_called if a is not None])
    tools_list = sorted([t for t in tools_called if t is not None])
    
    return agents_list, tools_list


# ------------------------------------------------------------------
# Endpoint
# ------------------------------------------------------------------
@router.post("/chat", summary="Chat with the multi-agent system", response_model=QueryResponse)
async def chat_endpoint(
    request: QueryRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    credentials: Annotated[
        Optional[HTTPAuthorizationCredentials], Depends(security)
    ] = None,
):
    """
    Chat endpoint with LangGraph agent using standard tool calling pattern.
    
    The system uses an LLM agent with access to multiple tools:
    - search_knowledge_base: Searches documentation and knowledge base
    
    The LLM automatically decides which tools to call based on user queries.
    """
    
    # Validate input
    if not request.user_input or not request.user_input.strip():
        raise HTTPException(status_code=400, detail="user_input is required and cannot be empty")

    logger.info("Chat request received", user_input=request.user_input[:100])
    
    # Get optional user if authenticated
    current_user = await get_optional_user(credentials, db)
    user_id = current_user.id if current_user else None
    
    if user_id:
        logger.info("Authenticated user", user_id=str(user_id))
    else:
        logger.info("Anonymous user request")
    
    # Create services with database session
    kb_service = KnowledgeBaseService(db=db)
    conversation_service = ConversationService(db=db)
    message_service = MessageService(db=db)
    
    # Create conversation if conversation_id is not provided
    conversation_id = request.conversation_id
    if not conversation_id and user_id:
        # Generate title from user input using AI
        openai_client = OpenAIClient()
        try:
            title_prompt = f"""Generate a concise, descriptive title (max 50 characters) for this user query: "{request.user_input[:200]}"

Return only the title, nothing else."""
            
            title_response = await openai_client.chat_completion(
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that generates concise titles for conversations."},
                    {"role": "user", "content": title_prompt}
                ],
                temperature=0.7,
                max_tokens=50
            )
            generated_title = title_response["content"].strip()
            # Truncate to 50 characters if needed
            generated_title = generated_title[:50] if len(generated_title) > 50 else generated_title
        except Exception as e:
            logger.warning(f"Failed to generate title with AI: {e}, using fallback")
            # Fallback: use first 50 characters of user input
            generated_title = request.user_input[:50].strip()
        
        # Create new conversation with generated title
        conversation_data = ConversationCreate(title=generated_title)
        new_conversation = await conversation_service.create_conversation(
            conversation_data=conversation_data,
            user_id=user_id
        )
        conversation_id = new_conversation.id
        logger.info(f"Created new conversation: id={conversation_id}, title={generated_title}")
    
    # Save user message if we have a conversation_id
    if conversation_id:
        try:
            user_message_data = MessageCreate(
                conversation_id=conversation_id,
                role="user",
                content=request.user_input,
                metadata=None
            )
            await message_service.create_message(user_message_data)
            logger.info(f"Saved user message to conversation {conversation_id}")
        except Exception as e:
            logger.warning(f"Failed to save user message: {e}", exc_info=True)
            # Continue even if message saving fails
    
    # Create the agent graph with services injected
    app = create_graph(
        kb_service=kb_service,
        user_id=user_id
    )

    # Build conversation history with previous messages
    messages = []
    
    # Add system prompt first
  
    messages.append(SystemMessage(content=SYSTEM_PROMPT))
    
    # Add conversation history if provided
    if request.conversation_history:
        logger.info(
            "Conversation history provided",
            history_length=len(request.conversation_history),
            history=[{"role": msg.role, "content": msg.content[:50] + "..." if len(msg.content) > 50 else msg.content} 
                     for msg in request.conversation_history]
        )
        for msg in request.conversation_history:
            if msg.role == "user":
                messages.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                messages.append(AIMessage(content=msg.content))
    
    # Add current user input
    messages.append(HumanMessage(content=request.user_input))
    
    # Log all messages being sent to the agent
    logger.info(
        "Messages being sent to agent",
        total_messages=len(messages),
        message_types=[type(msg).__name__ for msg in messages]
    )
    
    # Initial state with full conversation context
    initial_state = {
        "messages": messages
    }

    logger.info("Starting agent workflow with tool calling", user_input=request.user_input[:100])
    
    try:
        # Run the graph and get the final state
        final_state = await app.ainvoke(initial_state)

        # Log detailed workflow execution
        logger.info("Agent workflow completed - analyzing message flow")

    except Exception as e:
        logger.error("Agent workflow failed", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Agent workflow failed: {str(e)}"
        )

    # Extract messages from final state
    messages = final_state.get("messages", [])
    if not messages:
        logger.error("No messages in final state")
        raise HTTPException(
            status_code=500, 
            detail="No response generated by the agent system"
        )

    # Log detailed message flow with tool calls and results
    logger.info("=" * 80)
    logger.info("DETAILED CONVERSATION FLOW")
    logger.info("=" * 80)

    for idx, msg in enumerate(messages):
        msg_type = type(msg).__name__

        if msg_type == "SystemMessage":
            logger.info(f"[{idx}] SystemMessage: {msg.content[:100]}...")

        elif msg_type == "HumanMessage":
            logger.info(f"[{idx}] User Query: {msg.content}")

        elif msg_type == "AIMessage":
            # Check if AI is calling tools
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                logger.info(f"[{idx}] AI Message - CALLING TOOLS:")
                for tool_call in msg.tool_calls:
                    tool_name = tool_call.get("name") if isinstance(tool_call, dict) else getattr(tool_call, "name", None)
                    tool_args = tool_call.get("args") if isinstance(tool_call, dict) else getattr(tool_call, "args", {})
                    logger.info(f"  → Tool: {tool_name}")
                    logger.info(f"  → Args: {tool_args}")
            else:
                # AI's final response
                content_str = str(msg.content)
                logger.info(f"[{idx}] AI Response (length: {len(content_str)}):")
                logger.info(f"  → {content_str[:300]}..." if len(content_str) > 300 else f"  → {content_str}")

        elif msg_type == "ToolMessage":
            tool_name = getattr(msg, "name", "unknown")
            content_str = str(msg.content)
            logger.info(f"[{idx}] Tool Result - {tool_name}:")
            logger.info(f"  → Result length: {len(content_str)} chars")
            logger.info(f"  → Content: {content_str[:500]}..." if len(content_str) > 500 else f"  → Content: {content_str}")

    logger.info("=" * 80)

    # Extract agent and tool information for logging/debugging
    agents_called, tools_called = extract_agent_and_tool_info(messages)
    
    logger.info(
        "Workflow completed successfully",
        agents_called=agents_called,
        tools_called=tools_called,
        total_messages=len(messages)
    )

    # Get the last AIMessage (final response to user)
    final_message = None
    for msg in reversed(messages):
        if isinstance(msg, AIMessage):
            # Skip messages that only have tool calls (no content)
            if msg.content or not (hasattr(msg, "tool_calls") and msg.tool_calls):
                final_message = msg
                break

    if not final_message:
        logger.error("No AIMessage found in final state")
        raise HTTPException(
            status_code=500, 
            detail="No AI response found in the workflow"
        )

    # Extract and format content
    content = final_message.content
    
    # Handle different content types
    if isinstance(content, list):
        # Content might be a list of content blocks
        text_parts = []
        for item in content:
            if isinstance(item, dict):
                text_parts.append(item.get("text", ""))
            else:
                text_parts.append(str(item))
        response_text = "".join(text_parts)
    else:
        response_text = str(content) if content else ""
    
    # Clean up response text
    response_text = response_text.strip()
    
    if not response_text:
        logger.error("Empty response text generated")
        raise HTTPException(
            status_code=500, 
            detail="Empty response generated by the agent"
        )
    
    logger.info(
        "Chat response generated", 
        response_preview=response_text[:100],
        response_length=len(response_text)
    )
    
    # Save assistant response if we have a conversation_id
    if conversation_id:
        try:
            assistant_message_data = MessageCreate(
                conversation_id=conversation_id,
                role="assistant",
                content=response_text,
                metadata={
                    "agents_called": agents_called,
                    "tools_called": tools_called
                }
            )
            await message_service.create_message(assistant_message_data)
            logger.info(f"Saved assistant message to conversation {conversation_id}")
        except Exception as e:
            logger.warning(f"Failed to save assistant message: {e}", exc_info=True)
            # Continue even if message saving fails

    return QueryResponse(
        response=response_text,
        # Optionally include metadata
        # metadata={
        #     "agents_called": agents_called,
        #     "tools_called": tools_called,
        #     "iterations": final_state.get("iteration_count", 0)
        # }
    )


@router.post("/chat/stream", summary="Chat with streaming response")
async def chat_stream_endpoint(
    request: QueryRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    credentials: Annotated[
        Optional[HTTPAuthorizationCredentials], Depends(security)
    ] = None,
):
    """
    Streaming chat endpoint with LangGraph agent.
    
    Returns Server-Sent Events (SSE) stream with incremental text chunks.
    """
    
    # Validate input
    if not request.user_input or not request.user_input.strip():
        raise HTTPException(status_code=400, detail="user_input is required and cannot be empty")

    logger.info("Streaming chat request received", user_input=request.user_input[:100])
    
    # Get optional user if authenticated
    current_user = await get_optional_user(credentials, db)
    user_id = current_user.id if current_user else None
    
    if user_id:
        logger.info("Authenticated user", user_id=str(user_id))
    else:
        logger.info("Anonymous user request")
    
    # Create services with database session
    kb_service = KnowledgeBaseService(db=db)
    conversation_service = ConversationService(db=db)
    message_service = MessageService(db=db)

    # Create conversation if conversation_id is not provided
    conversation_id = request.conversation_id
    generated_title = None
    
    if not conversation_id:
        # Use provided title or generate one from user input using AI
        if request.conversation_title:
            generated_title = request.conversation_title[:50] if len(request.conversation_title) > 50 else request.conversation_title
        else:
            # Generate title from user input using AI
            openai_client = OpenAIClient()
            try:
                title_prompt = f"""Generate a concise, descriptive title (max 50 characters) for this user query: "{request.user_input[:200]}"

Return only the title, nothing else."""
                
                title_response = await openai_client.chat_completion(
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant that generates concise titles for conversations."},
                        {"role": "user", "content": title_prompt}
                    ],
                    temperature=0.7,
                    max_tokens=50
                )
                generated_title = title_response["content"].strip()
                # Truncate to 50 characters if needed
                generated_title = generated_title[:50] if len(generated_title) > 50 else generated_title
            except Exception as e:
                logger.warning(f"Failed to generate title with AI: {e}, using fallback")
                # Fallback: use first 50 characters of user input
                generated_title = request.user_input[:50].strip()
        
        # Create new conversation with generated title
        if user_id:
            conversation_data = ConversationCreate(title=generated_title)
            new_conversation = await conversation_service.create_conversation(
                conversation_data=conversation_data,
                user_id=user_id
            )
            conversation_id = new_conversation.id
            logger.info(f"Created new conversation: id={conversation_id}, title={generated_title}")
        else:
            # For anonymous users, we might not want to create conversations
            # Or handle it differently based on your requirements
            logger.warning("Cannot create conversation for anonymous user without user_id")
            conversation_id = None
    
    # Save user message if we have a conversation_id
    user_message_id = None
    if conversation_id:
        try:
            user_message_data = MessageCreate(
                conversation_id=conversation_id,
                role="user",
                content=request.user_input,
                metadata=None
            )
            user_message = await message_service.create_message(user_message_data)
            user_message_id = str(user_message.id)
            logger.info(f"Saved user message to conversation {conversation_id}, message_id={user_message_id}")
        except Exception as e:
            logger.warning(f"Failed to save user message: {e}", exc_info=True)
            # Continue even if message saving fails

    # Create the agent graph with services injected
    app = create_graph(
        kb_service=kb_service,
        user_id=user_id
    )

    # Build conversation history with previous messages
    messages = []
    
    # Add system prompt first
    messages.append(SystemMessage(content=SYSTEM_PROMPT))
    
    # Add conversation history if provided
    if request.conversation_history:
        logger.info(
            "Conversation history provided",
            history_length=len(request.conversation_history),
        )
        for msg in request.conversation_history:
            if msg.role == "user":
                messages.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                messages.append(AIMessage(content=msg.content))
    
    # Add current user input
    messages.append(HumanMessage(content=request.user_input))
    
    # Initial state with full conversation context
    initial_state = {
        "messages": messages
    }

    logger.info("Starting streaming agent workflow", user_input=request.user_input[:100])
    
    async def generate_stream() -> AsyncIterator[str]:
        """Generate streaming response chunks."""
        try:
            accumulated_content = ""
            last_ai_message_content = ""
            
            # Stream the graph execution
            async for chunk in app.astream(initial_state):
                # Process each chunk from the graph
                for node_name, node_state in chunk.items():
                    if "messages" in node_state:
                        # Get the last message from the state
                        state_messages = node_state.get("messages", [])
                        if state_messages:
                            last_message = state_messages[-1]
                            
                            # Check if it's an AIMessage with content
                            if isinstance(last_message, AIMessage):
                                content = last_message.content
                                
                                # Handle different content types
                                if isinstance(content, list):
                                    text_parts = []
                                    for item in content:
                                        if isinstance(item, dict):
                                            text_parts.append(item.get("text", ""))
                                        else:
                                            text_parts.append(str(item))
                                    content = "".join(text_parts)
                                else:
                                    content = str(content) if content else ""
                                
                                # Only stream new content (incremental)
                                if content and content != last_ai_message_content:
                                    # Extract the new chunk
                                    if len(content) > len(last_ai_message_content):
                                        new_chunk = content[len(last_ai_message_content):]
                                        last_ai_message_content = content
                                        accumulated_content = content
                                        
                                        # Send the chunk as SSE
                                        data = json.dumps({"chunk": new_chunk, "done": False})
                                        yield f"data: {data}\n\n"
            
            # Save assistant response if we have a conversation_id and accumulated content
            assistant_message_id = None
            if conversation_id and accumulated_content:
                try:
                    # Extract agent and tool info from final state if available
                    # For streaming, we'll keep metadata simple
                    assistant_message_data = MessageCreate(
                        conversation_id=conversation_id,
                        role="assistant",
                        content=accumulated_content,
                        metadata=None
                    )
                    assistant_message = await message_service.create_message(assistant_message_data)
                    assistant_message_id = str(assistant_message.id)
                    logger.info(f"Saved assistant message to conversation {conversation_id}, message_id={assistant_message_id}")
                except Exception as e:
                    logger.warning(f"Failed to save assistant message: {e}", exc_info=True)
                    # Continue even if message saving fails
            
            # Send final message with done flag and message IDs
            final_data = json.dumps({
                "chunk": "",
                "done": True,
                "full_response": accumulated_content,
                "conversation_id": str(conversation_id) if conversation_id else None,
                "conversation_title": generated_title if generated_title else None,
                "user_message_id": user_message_id,
                "assistant_message_id": assistant_message_id
            })
            yield f"data: {final_data}\n\n"
            
        except Exception as e:
            logger.error("Streaming agent workflow failed", error=str(e), exc_info=True)
            error_data = json.dumps({
                "error": f"Agent workflow failed: {str(e)}",
                "done": True
            })
            yield f"data: {error_data}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )

