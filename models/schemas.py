from pydantic import BaseModel
from typing import Optional, Dict

class UserRequest(BaseModel):
    message: str
    utilisateur: Optional[str] = "Agent"

    # 🔥 AJOUT EMAIL
    sender: Optional[str] = None
    subject: Optional[str] = None

class AgentDecision(BaseModel):
    action: str
    parameters: Dict

class AgentResponse(BaseModel):
    status: str
    result: str