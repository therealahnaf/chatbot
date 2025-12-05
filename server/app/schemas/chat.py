from typing import Any, Optional
from pydantic import BaseModel

class ChatRequest(BaseModel):
    message: str
    thread_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    thread_id: str
    history: list[dict[str, Any]]
    final_json: Optional[str] = None
