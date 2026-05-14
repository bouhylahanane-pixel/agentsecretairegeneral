import json
import os
from datetime import datetime

# =========================
# 📁 Création dossier history
# =========================

os.makedirs("history", exist_ok=True)

HISTORY_FILE = "history/logs.json"


# =========================
# 🔥 Sauvegarde historique
# =========================

def save_history(data):

    history = []

    # Charger ancien historique
    if os.path.exists(HISTORY_FILE):

        with open(HISTORY_FILE, "r", encoding="utf-8") as f:

            try:
                history = json.load(f)

            except:
                history = []

    # Ajouter timestamp
    data["timestamp"] = datetime.now().strftime(
        "%Y-%m-%d %H:%M:%S"
    )

    # Ajouter nouvelle entrée
    history.append(data)

    # Sauvegarder
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:

        json.dump(
            history,
            f,
            ensure_ascii=False,
            indent=4
        )