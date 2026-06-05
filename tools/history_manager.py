import sqlite3
import os
from datetime import datetime

# On récupère le chemin dynamique vers notre base de données SQLite
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "database.db")

# ==========================================
# 🔥 Sauvegarde historique (Version SQL & Data)
# ==========================================
def save_history(data):
    """
    Insère un log d'activité directement dans la table SQL 'logs_activite'.
    S'adapte automatiquement si 'priorite' ou 'temps_execution' ne sont pas fournis.
    """
    utilisateur = data.get("user", "Meryem")  # Par défaut, c'est toi l'utilisatrice !
    action_requise = data.get("action", "Action Inconnue")
    priorite = data.get("priorite", "Normale") # "Haute" si urgent, sinon "Normale"
    temps_execution = data.get("temps_execution", 0) # En millisecondes

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO logs_activite (utilisateur, action_requise, priorite, temps_execution)
        VALUES (?, ?, ?, ?)
    """, (
        utilisateur,
        action_requise,
        priorite,
        temps_execution
    ))
    
    conn.commit()
    conn.close()
    
    print(f"Log enregistré en BDD : [{priorite}] {action_requise} par {utilisateur}")

# ==========================================
# 📊 Fonctions pour ton Tableau de Bord React
# ==========================================
def get_all_logs():
    """Renvoie tous les logs pour alimenter ton Dashboard Data Analytics."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Correction : Utilisation du bon nom de table (logs_activite)
    # Note : Si ta table contient un champ 'timestamp', assure-toi qu'il est créé par défaut en BDD
    try:
        cursor.execute("SELECT * FROM logs_activite ORDER BY id DESC")
        rows = cursor.fetchall()
    except sqlite3.OperationalError:
        rows = []
    finally:
        conn.close()
    
    logs = []
    for row in rows:
        # Gestion sécurisée des colonnes pour éviter les plantages
        colonnes = row.keys()
        logs.append({
            "id": row["id"],
            "timestamp": row["timestamp"] if "timestamp" in colonnes else datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "utilisateur": row["utilisateur"],
            "action": row["action_requise"],
            "priorite": row["priorite"],
            "temps": row["temps_execution"]
        })
    return logs

def get_analytics_stats():
    """Calcule les métriques globales (KPIs) pour le tableau de bord."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 1. Nombre total de requêtes (Correction de la table)
        cursor.execute("SELECT COUNT(*) FROM logs_activite")
        total_requetes = cursor.fetchone()[0] or 0
        
        # 2. Nombre d'urgences (Priorité Haute)
        cursor.execute("SELECT COUNT(*) FROM logs_activite WHERE priorite = 'Haute'")
        total_urgences = cursor.fetchone()[0] or 0
        
        # 3. Temps de réponse moyen (Correction du nom de colonne : temps_execution)
        cursor.execute("SELECT AVG(temps_execution) FROM logs_activite")
        temps_moyen = cursor.fetchone()[0] or 0
    except sqlite3.OperationalError as e:
        print("🚨 Erreur Analytics SQL :", e)
        total_requetes, total_urgences, temps_moyen = 0, 0, 0
    finally:
        conn.close()
    
    return {
        "total_requests": total_requetes,
        "total_urgencies": total_urgences,
        "average_response_time_ms": round(temps_moyen, 2)
    }

def get_activity_by_action():
    """Récupère la répartition des actions pour tes graphiques (Camembert / Barres)."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # Correction de la table (logs_activite) et de la colonne (action_requise)
        cursor.execute("SELECT action_requise, COUNT(*) as quantite FROM logs_activite GROUP BY action_requise")
        rows = cursor.fetchall()
        resultat = {row["action_requise"] if row["action_requise"] else "Règlement/Autre": row["quantite"] for row in rows}
    except sqlite3.OperationalError:
        resultat = {}
    finally:
        conn.close()
        
    return resultat