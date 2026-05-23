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
    # 1. Extraction des données envoyées par l'orchestrateur (avec valeurs par défaut)
    utilisateur = data.get("user", "Meryem")  # Par défaut, c'est toi l'utilisatrice !
    action_requise = data.get("action", "Action Inconnue")
    
    # Intégration de tes suggestions réelles :
    priorite = data.get("priorite", "Normale") # "Haute" si urgent, sinon "Normale"
    temps_execution = data.get("temps_execution", 0) # En millisecondes, utile pour tes futurs graphiques

    # 2. Connexion à SQLite et insertion directe
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
    
    # On laisse un petit print temporaire dans le terminal pour voir que ça marche
    print(f"📊 Log enregistré en BDD : [{priorite}] {action_requise} par {utilisateur}")

# ==========================================
# 📊 Fonction bonus pour  futur Frontend React
# ==========================================
def get_all_logs():
    """Renvoie tous les logs pour alimenter ton Dashboard Data Analytics."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM logs_activite ORDER BY timestamp DESC")
    rows = cursor.fetchall()
    conn.close()
    
    logs = []
    for row in rows:
        logs.append({
            "id": row["id"],
            "timestamp": row["timestamp"],
            "utilisateur": row["utilisateur"],
            "action": row["action_requise"],
            "priorite": row["priorite"],
            "temps": row["temps_execution"]
        })
    return logs
def get_analytics_stats():
    """Calcule les métriques globales pour le tableau de bord."""
    import sqlite3
    import os
    
    # Construction du chemin absolu propre
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    db_path = os.path.join(project_root, "data", "database.db")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 1. Nombre total de requêtes
        cursor.execute("SELECT COUNT(*) FROM logs")
        total_requetes = cursor.fetchone()[0] or 0
        
        # 2. Nombre d'urgences (Priorité Haute)
        cursor.execute("SELECT COUNT(*) FROM logs WHERE priorite = 'Haute'")
        total_urgences = cursor.fetchone()[0] or 0
        
        # 3. Temps de réponse moyen
        cursor.execute("SELECT AVG(temps) FROM logs")
        temps_moyen = cursor.fetchone()[0] or 0
    except sqlite3.OperationalError:
        # Sécurité au cas où la table n'existe pas encore ou que le fichier est vide
        total_requetes, total_urgences, temps_moyen = 0, 0, 0
    finally:
        conn.close()
    
    return {
        "total_requests": total_requetes,
        "total_urgencies": total_urgences,
        "average_response_time_ms": round(temps_moyen, 2)
    }

def get_activity_by_action():
    """Récupère la répartition des actions pour les graphiques."""
    import sqlite3
    import os
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    db_path = os.path.join(project_root, "data", "database.db")
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT action, COUNT(*) as quantite FROM logs GROUP BY action")
        rows = cursor.fetchall()
        resultat = {row["action"] if row["action"] else "Règlement/Autre": row["quantite"] for row in rows}
    except sqlite3.OperationalError:
        resultat = {}
    finally:
        conn.close()
        
    return resultat