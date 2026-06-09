import sqlite3
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from models.schemas import UserResponse, UserCreate, UserUpdate, UserStatusUpdate, UserPasswordReset, UserRoleUpdate
from api.routers.auth import require_roles, get_current_user, normalize_role, pwd_context, DB_PATH
from tools.history_manager import save_history

router = APIRouter(prefix="/api/users", tags=["Users"])

def map_db_to_user(row):
    return UserResponse(
        id=row["id"],
        nom=row["nom"],
        email=row["email"],
        role=normalize_role(row["poste"]),
        is_active=bool(row["is_active"]) if "is_active" in row.keys() and row["is_active"] is not None else True,
        created_at=row["created_at"] if "created_at" in row.keys() else None,
        updated_at=row["updated_at"] if "updated_at" in row.keys() else None,
        last_login=row["last_login"] if "last_login" in row.keys() else None
    )

@router.get("", response_model=list[UserResponse])
def get_users(search: str = None, role: str = None, is_active: bool = None, current_user: dict = Depends(require_roles(["admin"]))):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    query = "SELECT * FROM employes WHERE 1=1"
    params = []
    
    if search:
        query += " AND (nom LIKE ? OR email LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])
    if is_active is not None:
        if is_active:
            query += " AND (is_active = 1 OR is_active IS NULL)"
        else:
            query += " AND is_active = 0"
        
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    users = []
    for r in rows:
        user_obj = map_db_to_user(r)
        if role and user_obj.role != role:
            continue
        users.append(user_obj)
    return users

@router.post("", response_model=UserResponse)
def create_user(user: UserCreate, current_user: dict = Depends(require_roles(["admin", "secretaire"]))):
    if user.role not in ["admin", "secretaire", "employee", "stagiaire"]:
        raise HTTPException(status_code=400, detail="Rôle invalide.")
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM employes WHERE email = ?", (user.email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Cet email existe déjà.")
        
    hashed_pwd = pwd_context.hash(user.password)
    now_str = datetime.utcnow().isoformat()
    
    try:
        cursor.execute("""
            INSERT INTO employes (nom, email, poste, mot_de_passe, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (user.nom, user.email, user.role, hashed_pwd, 1 if user.is_active else 0, now_str, now_str))
        new_id = cursor.lastrowid
        conn.commit()

        # Synchroniser avec la table stagiaires
        if user.role == "stagiaire":
            cursor.execute("""
                INSERT INTO stagiaires (nom, email, telephone, adresse, ecole_etudes, sujet_stage, date_debut, date_fin)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (user.nom, user.email, "", "", "À définir", "Stage d'application", now_str[:10], "À définir"))
            conn.commit()
    except sqlite3.OperationalError as e:
        if "no such column: is_active" in str(e) or "has no column named" in str(e):
            cursor.execute("""
                INSERT INTO employes (nom, email, poste, mot_de_passe)
                VALUES (?, ?, ?, ?)
            """, (user.nom, user.email, user.role, hashed_pwd))
            new_id = cursor.lastrowid
            conn.commit()
            
            # Synchroniser avec la table stagiaires
            if user.role == "stagiaire":
                cursor.execute("""
                    INSERT INTO stagiaires (nom, email, telephone, adresse, ecole_etudes, sujet_stage, date_debut, date_fin)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (user.nom, user.email, "", "", "À définir", "Stage d'application", now_str[:10], "À définir"))
                conn.commit()
        else:
            conn.close()
            raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))
        
    conn.row_factory = sqlite3.Row
    cursor.execute("SELECT * FROM employes WHERE id = ?", (new_id,))
    new_row = cursor.fetchone()
    conn.close()
    
    save_history({
        "user": current_user["email"], 
        "action": f"USER_CREATED: {user.email}", 
        "priorite": "Normale",
        "temps_execution": 0
    })
    
    return map_db_to_user(new_row)

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, current_user: dict = Depends(require_roles(["admin"]))):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM employes WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")
    return map_db_to_user(row)

@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user: UserUpdate, current_user: dict = Depends(require_roles(["admin", "secretaire"]))):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM employes WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")
        
    if row["email"] == current_user["email"]:
        if user.is_active is False:
            conn.close()
            raise HTTPException(status_code=400, detail="Impossible de désactiver son propre compte.")
        if user.role and user.role != "admin":
            conn.close()
            raise HTTPException(status_code=400, detail="Impossible de retirer son propre rôle admin.")

    if user.email and user.email != row["email"]:
        cursor.execute("SELECT id FROM employes WHERE email = ? AND id != ?", (user.email, user_id))
        if cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=400, detail="Cet email est déjà utilisé.")
            
    if user.role and user.role not in ["admin", "secretaire", "employee", "stagiaire"]:
        conn.close()
        raise HTTPException(status_code=400, detail="Rôle invalide.")
        
    update_fields = []
    params = []
    
    if user.nom is not None:
        update_fields.append("nom = ?")
        params.append(user.nom)
    if user.email is not None:
        update_fields.append("email = ?")
        params.append(user.email)
    if user.role is not None:
        update_fields.append("poste = ?")
        params.append(user.role)
    if user.is_active is not None:
        if "is_active" in row.keys():
            update_fields.append("is_active = ?")
            params.append(1 if user.is_active else 0)
        
    if update_fields:
        now_str = datetime.utcnow().isoformat()
        if "updated_at" in row.keys():
            update_fields.append("updated_at = ?")
            params.append(now_str)
        
        query = f"UPDATE employes SET {', '.join(update_fields)} WHERE id = ?"
        params.append(user_id)
        cursor.execute(query, params)
        conn.commit()

        # Synchroniser avec la table stagiaires
        if user.role is not None:
            if user.role == "stagiaire":
                # Vérifier si l'utilisateur est déjà dans la table stagiaires
                cursor.execute("SELECT id FROM stagiaires WHERE email = ?", (row["email"],))
                if not cursor.fetchone():
                    telephone = row["telephone"] if "telephone" in row.keys() else ""
                    adresse = row["adresse"] if "adresse" in row.keys() else ""
                    cursor.execute("""
                        INSERT INTO stagiaires (nom, email, telephone, adresse, ecole_etudes, sujet_stage, date_debut, date_fin)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (user.nom or row["nom"], user.email or row["email"], telephone, adresse, "À définir", "Stage d'application", now_str[:10], "À définir"))
                    conn.commit()
            else:
                # Si le rôle n'est plus stagiaire, le retirer de la table stagiaires
                cursor.execute("DELETE FROM stagiaires WHERE email = ?", (row["email"],))
                conn.commit()
        
    cursor.execute("SELECT * FROM employes WHERE id = ?", (user_id,))
    updated_row = cursor.fetchone()
    conn.close()
    
    save_history({
        "user": current_user["email"], 
        "action": f"USER_UPDATED: {updated_row['email']}", 
        "priorite": "Normale",
        "temps_execution": 0
    })
    
    return map_db_to_user(updated_row)

@router.patch("/{user_id}/status", response_model=UserResponse)
def update_user_status(user_id: int, status_update: UserStatusUpdate, current_user: dict = Depends(require_roles(["admin", "secretaire"]))):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM employes WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")
        
    if row["email"] == current_user["email"] and not status_update.is_active:
        conn.close()
        raise HTTPException(status_code=400, detail="Impossible de désactiver son propre compte.")
        
    now_str = datetime.utcnow().isoformat()
    if "is_active" in row.keys():
        cursor.execute("UPDATE employes SET is_active = ?, updated_at = ? WHERE id = ?", 
                       (1 if status_update.is_active else 0, now_str, user_id))
        conn.commit()
    
    cursor.execute("SELECT * FROM employes WHERE id = ?", (user_id,))
    updated_row = cursor.fetchone()
    conn.close()
    
    action_str = "USER_ENABLED" if status_update.is_active else "USER_DISABLED"
    save_history({
        "user": current_user["email"], 
        "action": f"{action_str}: {row['email']}", 
        "priorite": "Haute" if not status_update.is_active else "Normale",
        "temps_execution": 0
    })
    
    return map_db_to_user(updated_row)

@router.patch("/{user_id}/role", response_model=UserResponse)
def update_user_role(user_id: int, role_update: UserRoleUpdate, current_user: dict = Depends(require_roles(["admin", "secretaire"]))):
    if role_update.role not in ["admin", "secretaire", "employee", "stagiaire"]:
        raise HTTPException(status_code=400, detail="Rôle invalide.")
        
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM employes WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")
        
    if row["email"] == current_user["email"] and role_update.role != "admin":
        conn.close()
        raise HTTPException(status_code=400, detail="Impossible de retirer son propre rôle admin.")
        
    now_str = datetime.utcnow().isoformat()
    if "poste" in row.keys():
        if "updated_at" in row.keys():
            cursor.execute("UPDATE employes SET poste = ?, updated_at = ? WHERE id = ?", 
                           (role_update.role, now_str, user_id))
        else:
            cursor.execute("UPDATE employes SET poste = ? WHERE id = ?", 
                           (role_update.role, user_id))
        conn.commit()

        # Synchroniser avec la table stagiaires
        if role_update.role == "stagiaire":
            cursor.execute("SELECT id FROM stagiaires WHERE email = ?", (row["email"],))
            if not cursor.fetchone():
                telephone = row["telephone"] if "telephone" in row.keys() else ""
                adresse = row["adresse"] if "adresse" in row.keys() else ""
                cursor.execute("""
                    INSERT INTO stagiaires (nom, email, telephone, adresse, ecole_etudes, sujet_stage, date_debut, date_fin)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (row["nom"], row["email"], telephone, adresse, "À définir", "Stage d'application", now_str[:10], "À définir"))
                conn.commit()
        else:
            cursor.execute("DELETE FROM stagiaires WHERE email = ?", (row["email"],))
            conn.commit()
    
    cursor.execute("SELECT * FROM employes WHERE id = ?", (user_id,))
    updated_row = cursor.fetchone()
    conn.close()
    
    save_history({
        "user": current_user["email"], 
        "action": f"USER_ROLE_UPDATED: {row['email']} to {role_update.role}", 
        "priorite": "Haute",
        "temps_execution": 0
    })
    
    return map_db_to_user(updated_row)

@router.post("/{user_id}/reset-password")
def reset_password(user_id: int, passwords: UserPasswordReset, current_user: dict = Depends(require_roles(["admin", "secretaire"]))):
    if passwords.new_password != passwords.confirm_password:
        raise HTTPException(status_code=400, detail="Les mots de passe ne correspondent pas.")
        
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM employes WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")
        
    hashed_pwd = pwd_context.hash(passwords.new_password)
    now_str = datetime.utcnow().isoformat()
    
    if "updated_at" in row.keys():
        cursor.execute("UPDATE employes SET mot_de_passe = ?, updated_at = ? WHERE id = ?", (hashed_pwd, now_str, user_id))
    else:
        cursor.execute("UPDATE employes SET mot_de_passe = ? WHERE id = ?", (hashed_pwd, user_id))

    conn.commit()
    conn.close()
    
    save_history({
        "user": current_user["email"], 
        "action": f"USER_PASSWORD_RESET: {row['email']}", 
        "priorite": "Haute",
        "temps_execution": 0
    })
    
    return {"message": "Mot de passe réinitialisé avec succès."}
