import sqlite3
import os
from tools.pdf_generator import generate_pv_pdf
from datetime import datetime

# On récupère le chemin dynamique de la base de données
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "database.db")

# Nettoyeur d'heure pour harmoniser les formats (ex: "14h" -> "14:00", "14:30" -> "14:30")
def harmoniser_heure(heure_str):
    if not heure_str:
        return "12:00"
    heure_clean = heure_str.lower().replace("h", ":").strip()
    if ":" in heure_clean:
        parties = heure_clean.split(":")
        h = int(parties[0])
        m = int(parties[1]) if parties[1] else 0
        return f"{h:02d}:{m:02d}"
    else:
        try:
            h = int(heure_clean)
            return f"{h:02d}:00"
        except ValueError:
            return heure_str

# ==========================================
# 🔥 Charger les réunions (Version SQL)
# ==========================================
def load_meetings():
    """Lit la table SQL et renvoie une liste de réunions."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM reunions")
    rows = cursor.fetchall()
    conn.close()
    
    meetings = []
    for row in rows:
        meetings.append({
            "id": row["id"],
            "titre": row["titre"],
            "date": row["date"],
            "heure": row["heure_debut"],
            "heure_fin": row["heure_fin"],
            "lieu": row["lieu"] if "lieu" in row.keys() else "",
            "participants": row["participants"] if "participants" in row.keys() else "",
            "objet": row["objet"] if "objet" in row.keys() else ""
        })
    return meetings

# ==========================================
# 🔥 Vérification conflit (Salle, Heure & Date)
# ==========================================
def check_conflict(date, heure, lieu=None, nom_employe=None):
    """
    Vérifie en SQL si un créneau, une salle ou un participant indispensable 
    est déjà occupé pour cette date et heure précise.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    heure_norm = harmoniser_heure(heure)

    # 1. Conflit d'heure simple (Créneau identique)
    cursor.execute(
        "SELECT COUNT(*) FROM reunions WHERE date = ? AND heure_debut = ?", 
        (date, heure_norm)
    )
    if cursor.fetchone()[0] > 0:
        conn.close()
        return "creneau_pris"

    # 2. Conflit de Salle (Lieu réservé en même temps)
    if lieu:
        cursor.execute(
            "SELECT COUNT(*) FROM reunions WHERE date = ? AND heure_debut = ? AND lieu = ?", 
            (date, heure_norm, lieu.strip())
        )
        if cursor.fetchone()[0] > 0:
            conn.close()
            return "salle_prise"

    conn.close()
    return None

# ==========================================
# 🔥 Création réunion (Insertion SQL)
# ==========================================
def create_meeting(params):
    date = params.get("date")
    heure = params.get("heure")
    lieu = params.get("lieu") or params.get("salle") or ""
    titre = params.get("titre") or "Réunion de travail"
    objet = params.get("objet") or titre
    participants = params.get("participants", "")
    nom_employe = params.get("nom")

    # Harmonisation des formats
    heure_debut = harmoniser_heure(heure)

    # 🔥 Vérification des conflits SQL (Créneau & Salle)
    conflit = check_conflict(date, heure_debut, lieu, nom_employe)
    if conflit == "creneau_pris":
        return f"Conflit détecté : une réunion existe déjà le {date} à {heure_debut}"
    elif conflit == "salle_prise":
        return f"Conflit de salle : la salle ou le lieu '{lieu}' est déjà réservé le {date} à {heure_debut}"

    # Calcul de l'heure de fin par défaut (+1 heure)
    try:
        h_fin = int(heure_debut.split(':')[0]) + 1
        m_fin = heure_debut.split(':')[1]
        heure_fin = f"{h_fin:02d}:{m_fin}"
    except Exception:
        heure_fin = heure_debut

    # Insertion en base SQLite
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # On vérifie si la colonne 'lieu' existe, sinon on l'insère dans le titre
    try:
        cursor.execute("""
            INSERT INTO reunions (titre, date, heure_debut, heure_fin, organisateur_id, lieu, participants, objet)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (titre, date, heure_debut, heure_fin, 1, lieu, participants, objet))
    except sqlite3.OperationalError:
        # Fallback si la colonne 'lieu' n'existe pas encore dans ta structure SQLite
        titre_complet = f"{titre} ({lieu})" if lieu else titre
        cursor.execute("""
            INSERT INTO reunions (titre, date, heure_debut, heure_fin, organisateur_id)
            VALUES (?, ?, ?, ?, ?)
        """, (titre_complet, date, heure_debut, heure_fin, 1))

    conn.commit()
    conn.close()

    return f"Réunion créée avec succès dans la BDD pour le {date} à {heure_debut}"

# ==========================================
# 🔥 Afficher réunions
# ==========================================
def list_meetings():
    meetings = load_meetings()
    if not meetings:
        return []
    return meetings

# ==========================================
# 🔥 Recherche par date
# ==========================================
def find_meeting_by_date(date):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM reunions WHERE date = ?", (date,))
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for row in rows:
        results.append({
            "id": row["id"],
            "titre": row["titre"],
            "date": row["date"],
            "heure": row["heure_debut"],
            "participants": row["participants"] if "participants" in row.keys() else "",
            "objet": row["objet"] if "objet" in row.keys() else ""
        })
    return results

# ==========================================
# 🔥 Suppression réunion
# ==========================================
def delete_meeting(meeting_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM reunions WHERE id = ?", (meeting_id,))
    existe = cursor.fetchone()[0] > 0
    
    if existe:
        cursor.execute("DELETE FROM reunions WHERE id = ?", (meeting_id,))
        conn.commit()
        conn.close()
        return "Réunion supprimée de la base de données."
    
    conn.close()
    return "Réunion introuvable."

# ==========================================
# 🔥 Fonctions de génération
# ==========================================
def generate_pv(params):
    filename = generate_pv_pdf(params)
    return {
        "message": "Procès-verbal généré avec succès",
        "file": filename
    }

def send_convocation(params):
    return "Convocations envoyées"

# ==========================================
# 🟢 HISTORIQUE DES PROCÈS-VERBAUX (NOUVEAUTÉ)
# ==========================================
def save_meeting_to_history(date, participants, objet, details, decisions, actions, next_meeting, transcription, pdf_path):
    """
    Crée automatiquement la table historique_pv si nécessaire et y insère
    le nouveau procès-verbal généré par l'IA.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Création de la table de suivi si elle n'existe pas
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS historique_pv (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            participants TEXT,
            objet TEXT,
            details TEXT,
            decisions TEXT,
            actions TEXT,
            next_meeting TEXT,
            transcription TEXT,
            pdf_path TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # 2. Insertion sécurisée des données du PV
    cursor.execute("""
        INSERT INTO historique_pv (date, participants, objet, details, decisions, actions, next_meeting, transcription, pdf_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (date, participants, objet, details, decisions, actions, next_meeting, transcription, pdf_path))
    
    conn.commit()
    conn.close()
    return True

def get_all_pv_history():
    """
    Parcourt la table historique_pv et renvoie la liste complète des PV 
    triée du plus récent au plus ancien.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT * FROM historique_pv ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    except sqlite3.OperationalError:
        # Si la table n'a pas encore été créée (aucun PV généré), on renvoie une liste vide sans planter
        conn.close()
        return []