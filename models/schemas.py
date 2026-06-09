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

class UserResponse(BaseModel):
    id: int
    nom: str
    email: str
    role: str
    is_active: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    last_login: Optional[str] = None

class UserCreate(BaseModel):
    nom: str
    email: str
    role: str
    password: str
    is_active: Optional[bool] = True

class UserUpdate(BaseModel):
    nom: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserStatusUpdate(BaseModel):
    is_active: bool

class UserRoleUpdate(BaseModel):
    role: str

class UserPasswordReset(BaseModel):
    new_password: str
    confirm_password: str