import uuid
from typing import Any, Annotated

from fastapi import APIRouter, Depends, HTTPException, WebSocket
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter(prefix="/formzed-chat", tags=["Chat"])

from app.formzed.service.main_graph import get_main_graph
from langgraph.checkpoint.postgres import PostgresSaver
from langchain_core.messages import HumanMessage
from app.db.sync_db import get_sync_db_connection

def get_checkpointer(conn):
    """
    Get a PostgresSaver instance using the provided connection.
    """
    return PostgresSaver(conn)

def get_graph(checkpointer):
    return get_main_graph(checkpointer)

@router.post("", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    conn = Depends(get_sync_db_connection)
):
    thread_id = request.thread_id or str(uuid.uuid4())
    
    # Get checkpointer
    checkpointer = get_checkpointer(conn)
    
    # Compile graph with checkpointer
    graph = get_graph(checkpointer)
    
    # Config for the thread
    config = {"configurable": {"thread_id": thread_id}}
    
    # Run the graph
    input_message = HumanMessage(content=request.message)
    
    try:
        # Invoke the graph
        # The graph state is MessagesState, so passing {"messages": [msg]} appends.
        input_data = {"messages": [input_message]}
        if request.current_json:
            import json
            # Ensure it's a string for the state
            input_data["final_json"] = json.dumps(request.current_json)
            
        final_state = graph.invoke(input_data, config=config)
        
        # Extract response
        messages = final_state["messages"]
        last_message = messages[-1]
        
        # Handle dict or object
        if isinstance(last_message, dict):
            response_text = last_message.get("content", "")
        else:
            response_text = last_message.content if hasattr(last_message, "content") else str(last_message)
        
        # Serialize history for response
        history = []
        for msg in messages:
            if isinstance(msg, dict):
                msg_type = msg.get("type", "unknown")
                content = msg.get("content", "")
            else:
                msg_type = msg.type if hasattr(msg, "type") else "unknown"
                content = msg.content if hasattr(msg, "content") else str(msg)
            history.append({"type": msg_type, "content": content})
            
        # Extract final_json if available
        final_json = final_state.get("final_json")

        return ChatResponse(
            response=response_text,
            thread_id=thread_id,
            history=history,
            final_json=final_json
        )
        
    except Exception as e:
        print(f"Error invoking graph: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Close connection if it was opened
        if conn:
            conn.close()
        
@router.get("/history/{thread_id}")
def get_history(
    thread_id: str,
    conn = Depends(get_sync_db_connection)
):
    try:
        checkpointer = get_checkpointer(conn)
        
        graph = get_graph(checkpointer)
        config = {"configurable": {"thread_id": thread_id}}
        
        state = graph.get_state(config)
        if not state or not state.values:
            # raise HTTPException(status_code=404, detail="Thread not found")
            return {"thread_id": thread_id, "history": []}
            
        messages = state.values.get("messages", [])
        history = []
        for msg in messages:
            if isinstance(msg, dict):
                msg_type = msg.get("type", "unknown")
                content = msg.get("content", "")
            else:
                msg_type = msg.type if hasattr(msg, "type") else "unknown"
                content = msg.content if hasattr(msg, "content") else str(msg)
            history.append({"type": msg_type, "content": content})
            
        final_json = state.values.get("final_json")
            
        return {"thread_id": thread_id, "history": history, "final_json": final_json}
    except Exception as e:
        print(f"Error getting history: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@router.get("/threads")
def get_threads(conn = Depends(get_sync_db_connection)):
    try:
        # PostgresSaver uses a table named 'checkpoints' by default
        # We need to query for distinct thread_ids
        with conn.cursor() as cur:
            cur.execute("SELECT DISTINCT thread_id FROM checkpoints")
            rows = cur.fetchall()
            # rows are dicts because of row_factory=dict_row in get_sync_db_connection
            thread_ids = [row['thread_id'] for row in rows if row.get('thread_id')]
            return {"threads": thread_ids}
    except Exception as e:
        print(f"Error getting threads: {e}")
        # If table doesn't exist yet, return empty list
        if "relation \"checkpoints\" does not exist" in str(e):
            return {"threads": []}
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@router.websocket("/ws/{thread_id}")
async def websocket_endpoint(websocket: WebSocket, thread_id: str):
    await websocket.accept()
    conn = None
    try:
        while True:
            data = await websocket.receive_text()
            
            # Open DB connection per message to ensure freshness and avoid timeouts
            conn = get_sync_db_connection()
            try:
                checkpointer = get_checkpointer(conn)
                graph = get_graph(checkpointer)
                config = {"configurable": {"thread_id": thread_id}}
                
                # Parse incoming data
                message_content = data
                current_json = None
                
                try:
                    import json
                    parsed_data = json.loads(data)
                    if isinstance(parsed_data, dict) and "message" in parsed_data:
                        message_content = parsed_data["message"]
                        current_json = parsed_data.get("current_json")
                except json.JSONDecodeError:
                    # Not JSON, treat as raw string message
                    pass
                
                input_message = HumanMessage(content=message_content)
                
                # Run graph synchronously
                input_data = {"messages": [input_message]}
                if current_json:
                    input_data["final_json"] = json.dumps(current_json) if isinstance(current_json, dict) else current_json
                
                # Note: In a production app with high concurrency, this should be run in a threadpool
                # to avoid blocking the asyncio event loop.
                final_state = graph.invoke(input_data, config=config)
                
                messages = final_state["messages"]
                last_message = messages[-1]
                
                if isinstance(last_message, dict):
                    response_text = last_message.get("content", "")
                else:
                    response_text = last_message.content if hasattr(last_message, "content") else str(last_message)
                
                # Serialize history
                history = []
                for msg in messages:
                    if isinstance(msg, dict):
                        msg_type = msg.get("type", "unknown")
                        content = msg.get("content", "")
                    else:
                        msg_type = msg.type if hasattr(msg, "type") else "unknown"
                        content = msg.content if hasattr(msg, "content") else str(msg)
                    history.append({"type": msg_type, "content": content})
                
                # Extract final_json if available
                final_json = final_state.get("final_json")
                print(f"DEBUG: final_state keys: {final_state.keys()}")
                print(f"DEBUG: final_json type: {type(final_json)}")
                print(f"DEBUG: final_json value (first 100 chars): {str(final_json)[:100]}")

                import json
                response_data = {
                    "type": "message",
                    "content": response_text,
                    "history": history,
                    "thread_id": thread_id,
                    "final_json": final_json
                }
                await websocket.send_text(json.dumps(response_data))
                
            except Exception as e:
                print(f"Error processing message: {e}")
                import traceback
                traceback.print_exc()
                await websocket.send_text(json.dumps({"error": str(e)}))
            finally:
                if conn:
                    conn.close()
                    conn = None
                    
    except WebSocketDisconnect:
        print(f"Client disconnected from thread {thread_id}")
    except Exception as e:
        print(f"WebSocket error: {e}")


