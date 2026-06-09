import sqlite3
import jwt
import bcrypt
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from passlib.context import CryptContext
import os

router = APIRouter(prefix="/api/auth", tags=["Auth"])

# Clé secrète pour signer les JWT (à mettre en variable d'environnement en prod)
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "super_secret_key_smart_automation")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 heures

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "database.db")

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

def verify_password(password: str, stored_password: str | None) -> tuple[bool, str]:
    if not stored_password:
        return False, "missing"

    try:
        return pwd_context.verify(password, stored_password), "passlib"
    except Exception as passlib_error:
        if stored_password.startswith(("$2a$", "$2b$", "$2y$")):
            try:
                return bcrypt.checkpw(password.encode("utf-8"), stored_password.encode("utf-8")), "bcrypt_direct"
            except Exception as bcrypt_error:
                return False, f"bcrypt_error:{type(bcrypt_error).__name__}"

        return password == stored_password, f"legacy_plaintext:{type(passlib_error).__name__}"

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
    
    # 1. Check employes
    cursor.execute("SELECT * FROM employes WHERE email = ?", (email,))
    user = cursor.fetchone()
    
    is_stagiaire = False
    
    # 2. If not found, check stagiaires
    if not user:
        cursor.execute("SELECT * FROM stagiaires WHERE email = ?", (email,))
        user = cursor.fetchone()
        if user:
            is_stagiaire = True

    conn.close()
    
    if user:
        user_dict_temp = dict(user)
        is_valid, verification_mode = verify_password(password, user_dict_temp.get("mot_de_passe") or "")
            
        with open("debug_login.txt", "a") as f:
            stored_password = user_dict_temp.get("mot_de_passe") or ""
            f.write(
                f"EMAIL: {email} | HASH_PRESENT: {bool(stored_password)} | "
                f"HASH_LEN: {len(stored_password)} | HASH_PREFIX: {stored_password[:4]} | "
                f"VERIFY_MODE: {verification_mode} | IS_VALID: {is_valid}\n"
            )
            
        if is_valid:
            user_dict = dict(user)
            if "mot_de_passe" in user_dict:
                del user_dict["mot_de_passe"]
                
            if is_stagiaire:
                user_dict["role"] = "stagiaire"
                user_dict["poste"] = "stagiaire"
                user_dict["departement"] = user_dict.get("ecole_etudes", "Stage")
                
            return user_dict
            
    with open("debug_login.txt", "a") as f:
        f.write(f"EMAIL: {email} | USER_FOUND: {bool(user)} | RETURNING NONE\n")
    return None

def normalize_role(poste: str) -> str:
    if not poste:
        return "employee"
    poste_lower = poste.lower()
    if "admin" in poste_lower:
        return "admin"
    if "secretaire" in poste_lower or "secrétaire" in poste_lower:
        return "secretaire"
    if "stagiaire" in poste_lower:
        return "stagiaire"
    return "employee"

def require_roles(allowed_roles: list[str]):
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(status_code=403, detail="Opération non autorisée pour ce rôle.")
        return current_user
    return role_checker

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM employes WHERE email = ?", (email,))
    user = cursor.fetchone()
    
    is_stagiaire = False
    if not user:
        cursor.execute("SELECT * FROM stagiaires WHERE email = ?", (email,))
        user = cursor.fetchone()
        if user:
            is_stagiaire = True

    conn.close()
    
    if user is None:
        raise credentials_exception
        
    user_dict = dict(user)
    is_active = user_dict.get("is_active", 1)
    if is_active == 0 or is_active is False:
        raise HTTPException(status_code=403, detail="Compte désactivé.")
        
    if is_stagiaire:
        user_dict["role"] = "stagiaire"
    else:
        user_dict["role"] = normalize_role(user_dict.get("poste", ""))
        
    return user_dict

@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest):
    user = get_user_by_credentials(credentials.email.strip(), credentials.password.strip())
    
    if not user:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect.")
        
    is_active = user.get("is_active", 1)
    if is_active == 0 or is_active is False:
        from tools.history_manager import save_history
        save_history({
            "user": user["email"], 
            "action": f"LOGIN_BLOCKED_DISABLED_ACCOUNT: {user['email']}", 
            "priorite": "Haute",
            "temps_execution": 0
        })
        raise HTTPException(status_code=403, detail="Compte désactivé. Veuillez contacter l'administrateur.")
    
    # Mise à jour last_login
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE employes SET last_login = ? WHERE id = ?", (datetime.utcnow().isoformat(), user["id"]))
        conn.commit()
    except Exception:
        pass
    finally:
        conn.close()

    # Construire le payload
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    normalized_role = normalize_role(user["poste"])
    access_token = create_access_token(
        data={"sub": user["email"], "id": user["id"], "role": normalized_role}, 
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
            "role": normalized_role,
            "departement": user.get("departement", user.get("ecole_etudes", "Stage"))
        }
    }

@router.get("/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    full_name = f"{current_user.get('prenom', '')} {current_user.get('nom', '')}".strip()
    return {
        "user": {
            "name": full_name,
            "email": current_user["email"],
            "role": current_user["role"],
            "departement": current_user.get("departement", current_user.get("ecole_etudes", "Stage"))
        }
    }
