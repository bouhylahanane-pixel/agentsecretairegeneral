import json
import os
from tools.pdf_generator import generate_pv_pdf
from datetime import datetime

MEETINGS_FILE = "data/meetings.json"


# =========================
# 🔥 Charger réunions
# =========================

def load_meetings():

    if not os.path.exists(MEETINGS_FILE):

        return []

    with open(MEETINGS_FILE, "r", encoding="utf-8") as f:

        return json.load(f)


# =========================
# 🔥 Sauvegarder réunions
# =========================

def save_meetings(meetings):

    with open(MEETINGS_FILE, "w", encoding="utf-8") as f:

        json.dump(
            meetings,
            f,
            indent=4,
            ensure_ascii=False
        )


# =========================
# 🔥 Vérification conflit
# =========================

def check_conflict(date, heure):

    meetings = load_meetings()

    for meeting in meetings:

        if (
            meeting["date"] == date
            and meeting["heure"] == heure
        ):

            return True

    return False


# =========================
# 🔥 Création réunion
# =========================

def create_meeting(params):

    meetings = load_meetings()

    date = params.get("date")
    heure = params.get("heure")

    # 🔥 Vérification conflit

    if check_conflict(date, heure):

        return (
            f"Conflit détecté : "
            f"une réunion existe déjà le "
            f"{date} à {heure}"
        )

    meeting = {

        "id": len(meetings) + 1,

        "titre": params.get("objet"),

        "date": date,

        "heure": heure,

        "lieu": params.get("lieu"),

        "participants": params.get("participants"),

        "created_at": datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S"
        )
    }

    meetings.append(meeting)

    save_meetings(meetings)

    return (
        f"Réunion créée avec succès "
        f"pour le {date} à {heure}"
    )


# =========================
# 🔥 Afficher réunions
# =========================

def list_meetings():

    meetings = load_meetings()

    if not meetings:

        return "Aucune réunion trouvée."

    return meetings


# =========================
# 🔥 Recherche par date
# =========================

def find_meeting_by_date(date):

    meetings = load_meetings()

    results = []

    for meeting in meetings:

        if meeting["date"] == date:

            results.append(meeting)

    return results


# =========================
# 🔥 Suppression réunion
# =========================

def delete_meeting(meeting_id):

    meetings = load_meetings()

    new_meetings = []

    deleted = False

    for meeting in meetings:

        if meeting["id"] != meeting_id:

            new_meetings.append(meeting)

        else:

            deleted = True

    save_meetings(new_meetings)

    if deleted:

        return "Réunion supprimée."

    return "Réunion introuvable."


# =========================
# 🔥 Génération PV
# =========================


def generate_pv(params):

    filename = generate_pv_pdf(params)

    return {
        "message": "Procès-verbal généré avec succès",
        "file": filename
    }


# =========================
# 🔥 Envoi convocation
# =========================

def send_convocation(params):

    return "Convocations envoyées"