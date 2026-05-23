import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

# Importations de tes modules locaux
from models.schemas import UserRequest
from services.orchestrator import executer_agent
from tools.meeting import list_meetings, find_meeting_by_date, delete_meeting

# Extraction des fonctions d'extraction analytics
from tools.history_manager import get_analytics_stats, get_activity_by_action

# 1. Initialisation unique de l'application FastAPI
app = FastAPI(
    title="Agent Secrétariat Intelligent",
    description="Système agentique avancé pour le Secrétariat Général",
    version="3.0",
)

# 2. 🔥 CORS STRICT (Sécurité pour Streamlit & Frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permet à Streamlit de se connecter sans blocage
    allow_credentials=True,
    allow_methods=["*"],  # Permet GET, POST, DELETE, etc.
    allow_headers=["*"],
)


# ==========================================
# ⚙️ ROUTES SYSTÈME
# ==========================================
@app.get("/health", tags=["System"])
async def health():
    """Vérifie que l'API fonctionne correctement."""
    return {"status": "OK"}


# ==========================================
# 📊 ROUTES ANALYTICS
# ==========================================
@app.get("/analytics/stats", tags=["Analytics"])
async def get_global_stats():
    """Retourne les compteurs clés (Total demandes, Urgences, Temps moyen)."""
    return get_analytics_stats()


@app.get("/analytics/chart", tags=["Analytics"])
async def get_chart_data():
    """Retourne les données agrégées pour le graphique de répartition des actions."""
    return get_activity_by_action()


# ==========================================
# 🤖 ROUTES DE L'AGENT IA (Synchronisée avec app_demo.py)
# ==========================================
@app.post("/agent/process", tags=["Agent"])
async def process_agent(data: dict):
    """
    Traite la demande utilisateur envoyée depuis l'interface Streamlit.
    Gère la flexibilité entre un message unique et un historique complet.
    """
    user_name = data.get("utilisateur", "Meryem")
    
    # Récupération adaptative du texte utilisateur
    if "messages" in data and isinstance(data["messages"], list) and len(data["messages"]) > 0:
        # Si le frontend envoie un historique complet de messages
        message_texte = data["messages"]
    else:
        # Fallback sur le format actuel de app_demo.py (chaîne simple)
        message_texte = data.get("message", "")

    # 🔥 Exécution de la logique métier via ton orchestrateur central
    resultat_agent = executer_agent(message_texte, user_name)

    # Renvoie le dictionnaire complet attendu par app_demo.py (response, pdf_path, etc.)
    return resultat_agent


@app.post("/email/process", tags=["Email"])
async def process_email_endpoint(request: UserRequest):
    """Simule le traitement automatique d'un e-mail reçu par l'agent."""
    result = executer_agent(request.message, request.utilisateur)

    # Sécurisation si request.sender n'existe pas dans le schéma de base
    sender = getattr(request, "sender", "utilisateur@entreprise.ma")
    subject = getattr(request, "subject", "Demande administrative")

    return {
        "to": sender,
        "subject": f"Re: {subject}",
        "message": result.get("response", "Votre demande a été traitée."),
    }


# ==========================================
# 📅 ROUTES DE GESTION DES RÉUNIONS (SQL)
# ==========================================
@app.get("/meetings", tags=["Meetings"])
async def get_meetings():
    """Récupère la liste de toutes les réunions programmées."""
    return list_meetings()


@app.get("/meetings/search/{date}", tags=["Meetings"])
async def search_meetings(date: str):
    """Recherche les réunions prévues à une date spécifique."""
    return find_meeting_by_date(date)


@app.delete("/meetings/delete/{meeting_id}", tags=["Meetings"])
async def remove_meeting(meeting_id: int):
    """Supprime une réunion du calendrier à partir de son ID."""
    return delete_meeting(meeting_id)


# ==========================================
# 📁 ROUTE DE TÉLÉCHARGEMENT DE DOCUMENTS (PDF)
# ==========================================
@app.get("/download/{file_path:path}", tags=["Documents"])
def download_file(file_path: str):
    """Permet au frontend de télécharger les attestations PDF générées."""
    # Nettoyage si le frontend passe un chemin absolu au lieu d'un nom de fichier simple
    clean_path = os.path.basename(file_path) if "/" in file_path or "\\" in file_path else file_path

    if os.path.exists(clean_path):
        return FileResponse(
            path=clean_path,
            filename=os.path.basename(clean_path),
            media_type="application/pdf",
        )

    # Fallback si le fichier est stocké à la racine ou selon le chemin transmis
    if os.path.exists(file_path):
        return FileResponse(
            path=file_path,
            filename=os.path.basename(file_path),
            media_type="application/pdf",
        )

    return {"error": f"Fichier introuvable : {file_path}"}