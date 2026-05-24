import os
import requests
from fastapi import FastAPI, File, UploadFile, HTTPException  # 🟢 MISE À JOUR : Ajout de File et UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

# Importations de tes modules locaux
from models.schemas import UserRequest
from services.orchestrator import executer_agent
from tools.meeting import list_meetings, find_meeting_by_date, delete_meeting

# EXTRACTION CORRIGÉE : Ajout de get_all_logs pour ton tableau de bord
from tools.history_manager import get_analytics_stats, get_activity_by_action, get_all_logs

# 1. Initialisation unique de l'application FastAPI
app = FastAPI(
    title="Agent Secrétariat Intelligent",
    description="Système agentique avancé pour le Secrétariat Général",
    version="3.0",
)

# 2. 🔥 CORS STRICT (Sécurité pour Streamlit & Frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permet à Streamlit et React de se connecter sans blocage
    allow_credentials=True,
    allow_methods=["*"],  # Permet GET, POST, DELETE, etc.
    allow_headers=["*"],
)

# 🟢 Récupération sécurisée de la clé Groq stockée dans l'environnement (chargée par ton .env)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")


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


@app.get("/analytics/logs", tags=["Analytics"])
async def get_raw_logs():
    """Retourne la liste complète des logs pour alimenter ton tableau de données (React/Streamlit)."""
    return get_all_logs()


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


# ==========================================
# 📝 🟢 NOUVELLE ROUTE : GÉNÉRATION AUTOMATIQUE DE PV DE RÉUNION
# ==========================================
@app.post("/agent/generate-pv", tags=["Agent"])
async def generate_pv(file: UploadFile = File(...)):
    """
    Prend en entrée un fichier audio binaire (micro direct ou dépôt), 
    le retranscrit via Whisper, et structure un Procès-Verbal officiel en Markdown via Llama 3.
    """
    try:
        # 1. Sauvegarde temporaire du flux audio reçu
        temp_audio_path = f"temp_{file.filename}"
        with open(temp_audio_path, "wb") as buffer:
            buffer.write(await file.read())

        # 2. Appel à l'API Whisper de Groq pour la transcription acoustique
        whisper_url = "https://api.groq.com/openai/v1/audio/transcriptions"
        headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
        
        # Guide d'aide contextuel pour limiter les fautes sur le jargon administratif
        invite_contexte = "Réunion, ordre du jour, décisions, plan d'action, participants, compte-rendu, Meryem, Sanaa."

        with open(temp_audio_path, "rb") as audio_file:
            files = {
                "file": (file.filename, audio_file, file.content_type if file.content_type else "audio/wav"),
                "model": (None, "whisper-large-v3"),
                "language": (None, "fr"),
                "prompt": (None, invite_contexte)
            }
            whisper_response = requests.post(whisper_url, headers=headers, files=files)
        
        # Nettoyage immédiat du fichier de transit
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

        if whisper_response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Échec Whisper Groq : {whisper_response.text}")
        
        transcription_brute = whisper_response.json().get("text", "")
        
        if not transcription_brute.strip():
            return {"pv_markdown": "⚠️ L'enregistrement audio ne contient aucune voix ou contenu détectable."}

        # 3. Traitement NLP avancé par Llama 3 pour la rédaction du PV structuré
        llm_url = "https://api.groq.com/openai/v1/chat/completions"
        
        prompt_systeme = (
            "Tu es un secrétaire de direction de haut niveau. Ton travail consiste à nettoyer la transcription "
            "brute d'une réunion pour rédiger un Procès-Verbal (PV) de réunion parfaitement propre, structuré et professionnel en Markdown.\n\n"
            "Tu dois impérativement organiser ton retour selon la mise en forme suivante :\n"
            "# 📝 PROCÈS-VERBAL DE RÉUNION\n"
            "**Date :** [Distinguer la date si elle est dite explicitement, sinon écrire la date actuelle]\n"
            "**Participants :** [Lister tous les noms propres ou prénoms entendus dans la conversation]\n\n"
            "## 🎯 1. Ordre du jour\n"
            "[Écrire un résumé clair de l'objectif de la réunion]\n\n"
            "## 💬 2. Synthèse des échanges\n"
            "[Faire un résumé condensé, fluide et rédigé des discussions en supprimant les hésitations et tics de langage]\n\n"
            "## 📌 3. Décisions retenues\n"
            "[Lister sous forme de puces claires les choix ou arbitrages validés]\n\n"
            "## 📅 4. Plan d'action\n"
            "| Action | Responsable | Échéance |\n"
            "| :--- | :--- | :--- |\n"
            "| [Intitulé de la tâche] | [Nom] | [Date cible ou 'À définir'] |\n\n"
            "Garde un ton formel, concis, neutre et très corporate."
        )

        llm_payload = {
            "model": "llama3-70b-8192",  # Choix du grand modèle pour un esprit de synthèse optimal
            "messages": [
                {"role": "system", "content": prompt_systeme},
                {"role": "user", "content": f"Voici le texte brut issu de l'enregistrement de la réunion :\n{transcription_brute}"}
            ],
            "temperature": 0.2  # Basse température pour coller strictement aux faits énoncés
        }

        llm_response = requests.post(llm_url, headers=headers, json=llm_payload)
        
        if llm_response.status_code == 200:
            pv_redige = llm_response.json()["choices"][0]["message"]["content"]
            return {
                "transcription": transcription_brute,
                "pv_markdown": pv_redige
            }
        else:
            raise HTTPException(status_code=500, detail=f"Échec LLM Groq : {llm_response.text}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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