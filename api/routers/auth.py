import sqlite3
import jwt
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import os

router = APIRouter(prefix="/api/auth", tags=["Auth"])

# Clé secrète pour signer les JWT (à mettre en variable d'environnement en prod)
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "super_secret_key_smart_automation")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 heures

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "database.db")

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

def create_access_token(data: dict, expires_delta: timedelta):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user_by_credentials(email: str, password: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, nom, prenom, email, poste, departement 
        FROM employes 
        WHERE email = ? AND mot_de_passe = ?
    """, (email, password))
    
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return dict(user)
    return None

@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest):
    user = get_user_by_credentials(credentials.email, credentials.password)
    
    if not user:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect.")
    
    # Construire le payload
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"], "id": user["id"], "role": user["poste"]}, 
        expires_delta=access_token_expires
    )
    
    # Formater le nom complet pour le frontend
    full_name = f"{user.get('prenom', '')} {user.get('nom', '')}".strip()
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "name": full_name,
            "email": user["email"],
            "role": user["poste"],
            "departement": user["departement"]
        }
    }
