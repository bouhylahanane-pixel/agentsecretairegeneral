import os
import json
import requests
from fastapi import FastAPI, Request, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from models.schemas import UserRequest  # 👈 Rétablit UserRequest pour la ligne 254
from services.orchestrator import executer_agent
from tools.meeting import list_meetings, find_meeting_by_date, delete_meeting, get_all_pv_history, save_meeting_to_history

# EXTRACTION CORRIGÉE : Ajout de get_all_logs pour ton tableau de bord
from tools.history_manager import get_analytics_stats, get_activity_by_action, get_all_logs

import shutil

# 1. Initialisation unique de l'application FastAPI
app = FastAPI(
    title="Agent Secrétariat Intelligent",
    description="Système agentique avancé pour le Secrétariat Général",
    version="3.0",
)

# 2. CORS — origines autorisées (Vite React + Streamlit)
ORIGINES_FRONTEND = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINES_FRONTEND,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Routeurs API modulaires (/api/*)
from api.routers import (
    analyze, auth, documents, users, tasks,
    document_requests, instances, minutes, chat
)

app.include_router(instances.router)
app.include_router(analyze.router)
app.include_router(auth.router)
app.include_router(minutes.router)
app.include_router(chat.router)
app.include_router(tasks.router)
app.include_router(documents.router)
app.include_router(document_requests.router)

from api.routers import users
app.include_router(users.router)

from api.routers import config
app.include_router(config.router)

from api.routers.auth import get_current_user, require_roles

from dotenv import load_dotenv
load_dotenv()

# 🟢 Récupération sécurisée de la clé Groq stockée dans l'environnement (chargée par ton .env)

from data.database_manager import init_db
from tools.rag_engine import init_rag_table
from api.routers.document_requests import init_document_requests_table

@app.on_event("startup")
async def startup_event():
    print("Initialisation de la base de données...")
    init_db()
    init_rag_table()
    init_document_requests_table()
    print("Bases de données prêtes.")


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
async def get_global_stats(current_user: dict = Depends(require_roles(["admin", "secretaire", "employee", "stagiaire"]))):
    """Retourne les compteurs clés (Total demandes, Urgences, Temps moyen)."""
    return get_analytics_stats()


@app.get("/analytics/chart", tags=["Analytics"])
async def get_chart_data(current_user: dict = Depends(require_roles(["admin", "secretaire"]))):
    """Retourne les données agrégées pour le graphique de répartition des actions."""
    return get_activity_by_action()


@app.get("/analytics/logs", tags=["Analytics"])
async def get_raw_logs(current_user: dict = Depends(require_roles(["admin", "secretaire"]))):
    """Retourne la liste complète des logs pour alimenter ton tableau de données (React/Streamlit)."""
    return get_all_logs()


# ==========================================
# 🤖 ROUTES DE L'AGENT IA (Synchronisée avec app_demo.py)
# ==========================================
@app.post("/agent/process", tags=["Agent"])
async def process_agent(data: dict, current_user: dict = Depends(require_roles(["admin", "secretaire", "employee"]))):
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


@app.post("/agent/generate-pv", tags=["Agent"])
async def generate_pv(request: Request, current_user: dict = Depends(require_roles(["admin", "secretaire"]))):
    """
    Version optimisée : Nettoie les erreurs phonétiques (critérium, Southrimlit)
    et attribue correctement les tâches au narrateur (Meryem).
    """
    temp_audio_path = "temp_enregistrement_reunion.wav"
    
    try:
        # 1. ÉCRITURE DU FLUX RÉSEAU
        with open(temp_audio_path, "wb") as buffer:
            async for chunk in request.stream():
                buffer.write(chunk)

        if not os.path.exists(temp_audio_path) or os.path.getsize(temp_audio_path) == 0:
            raise HTTPException(status_code=400, detail="Le flux audio est vide.")

        # 2. Transcription Whisper enrichie
        whisper_url = "https://api.groq.com/openai/v1/audio/transcriptions"
        headers = {"Authorization": f"Bearer {os.environ.get("GROQ_API_KEY")}"}
        
        # Vocabulaire renforcé pour éviter "critérium" et "Southrimlit"
        invite_contexte = "Secrétariat Intelligent, suivi de projet, Meryem, Sanaa, Ahmed, Scikit-Learn, Streamlit, FastAPI, SQLite, frontend, backend, route API."

        with open(temp_audio_path, "rb") as audio_file_obj:
            files = {
                "file": ("enregistrement.wav", audio_file_obj, "audio/wav"),
                "model": (None, "whisper-large-v3"),
                "language": (None, "fr"),
                "prompt": (None, invite_contexte)
            }
            whisper_response = requests.post(whisper_url, headers=headers, files=files)
        
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

        if whisper_response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Échec Whisper : {whisper_response.text}")
        
        transcription_brute = whisper_response.json().get("text", "")
        
        # 🔄 Post-nettoyage manuel des pires erreurs phonétiques avant l'envoi au LLM
        transcription_brute = transcription_brute.replace("critérium intelligent", "Secrétariat Intelligent")
        transcription_brute = transcription_brute.replace("Southrimlit", "Streamlit")
        transcription_brute = transcription_brute.replace("aux frontales", "au frontend")
        transcription_brute = transcription_brute.replace("Skiit-Learn", "Scikit-Learn")

        if not transcription_brute.strip():
            return {"pv_markdown": "⚠️ L'enregistrement audio ne contient aucun contenu vocal."}

        # 3. Analyse Llama 3.3 avec contexte utilisateur ("Je" = Meryem)
        llm_url = "https://api.groq.com/openai/v1/chat/completions"
        
        prompt_systeme = (
            "Tu es un secrétaire de direction expert. Extrais les informations clés sous forme d'un objet JSON valide.\n"
            "IMPORTANT : La personne qui parle et dit 'Je / De mon côté' est exclusivement Meryem. Attribue-lui ses actions en son nom (Meryem).\n"
            "Format JSON attendu :\n"
            "{\n"
            '  "date": "Date de la réunion (AAAA-MM-JJ)",\n'
            '  "participants": "Sanaa, Ahmed, Meryem",\n'
            '  "objet": "Sujet principal de la réunion",\n'
            '  "details": "Synthèse rédigée et détaillée des échanges (sans puces)",\n'
            '  "decisions": ["Décision 1", "Décision 2"],\n'
            '  "actions": ["Tâche 1 par Responsable", "Tâche 2 par Responsable"],\n'
            '  "next_meeting": "Date ou À définir"\n'
            "}"
        )

        llm_payload = {
            "model": "llama-3.3-70b-versatile",
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": prompt_systeme},
                {"role": "user", "content": f"Transcription de la réunion :\n{transcription_brute}"}
            ],
            "temperature": 0.1  # Baissée à 0.1 pour un respect strict des mots du texte
        }

        llm_response = requests.post(llm_url, headers=headers, json=llm_payload)
        
        if llm_response.status_code == 200:
            str_contenu = llm_response.json()["choices"][0]["message"]["content"]
            pv_data = json.loads(str_contenu)
            
            # Forcer les corrections dans les champs textuels générés
            for clé in ["objet", "details"]:
                if clé in pv_data and isinstance(pv_data[clé], str):
                    pv_data[clé] = pv_data[clé].replace("critérium intelligent", "Secrétariat Intelligent")
                    pv_data[clé] = pv_data[clé].replace("Southrimlit", "Streamlit")
                    pv_data[clé] = pv_data[clé].replace("aux frontales", "au frontend")
                    pv_data[clé] = pv_data[clé].replace("Skiit-Learn", "Scikit-Learn")

            parts = pv_data.get('participants', 'Meryem, Sanaa, Ahmed')
            parts_str = ", ".join([str(p) for p in parts]) if isinstance(parts, list) else str(parts)

            # Extraire la date dynamique trouvée par le LLM (2026-05-26)
            date_reunion = pv_data.get('date', '2026-05-26')

            # 4. Reconstruction du format Markdown
            pv_markdown_dynamique = f"""# 📝 PROCÈS-VERBAL DE RÉUNION
**Date :** {date_reunion}
**Participants :** {parts_str}

## 🎯 1. Ordre du jour
{pv_data.get('objet')}

## 💬 2. Synthèse des échanges
{pv_data.get('details')}

## 📌 3. Décisions retenues
"""
            decisions_list = pv_data.get('decisions', [])
            for d in (decisions_list if isinstance(decisions_list, list) else str(decisions_list).split(',')):
                d_clean = str(d).lstrip('• ').strip()
                if d_clean: pv_markdown_dynamique += f"- {d_clean}\n"

            pv_markdown_dynamique += "\n## 📅 4. Plan d'action\n"
            actions_list = pv_data.get('actions', [])
            for a in (actions_list if isinstance(actions_list, list) else str(actions_list).split(',')):
                a_clean = str(a).lstrip('• ').strip()
                if a_clean: pv_markdown_dynamique += f"- {a_clean}\n"

            pv_markdown_dynamique += f"\n**Prochaine échéance :** {pv_data.get('next_meeting')}"

            nom_fichier_pv_md = "proces_verbal_reunion.md"
            with open(nom_fichier_pv_md, "w", encoding="utf-8") as f:
                f.write(pv_markdown_dynamique)
                
            # 5. Génération du PDF avec application STRICTE de la date et suppression des puces dupliquées
            from tools.pdf_generator import generate_pv_pdf
            
            decisions_clean = [str(d).lstrip('• ').strip() for d in decisions_list if str(d).strip()]
            actions_clean = [str(a).lstrip('• ').strip() for a in actions_list if str(a).strip()]
            
            decisions_str = "<br/>".join([f"• {d}" for d in decisions_clean])
            actions_str = "<br/>".join([f"• {a}" for a in actions_clean])

            params_pour_pdf = {
                "objet": str(pv_data.get("objet", "Suivi de projet et mise en place du Secrétariat Intelligent")),
                "lieu": "Salle de Réunion",
                "participants": parts_str,
                "details": str(pv_data.get("details", "")).replace("\n", "<br/>"),
                "decisions": decisions_str,
                "actions": actions_str,
                "next_meeting": str(pv_data.get("next_meeting", "Lundi matin prochain à 10h")),
                "date": str(date_reunion)  # 👈 Transmis explicitement ici
            }
            
            chemin_pdf_officiel = generate_pv_pdf(params_pour_pdf)
            
            # 6. Sauvegarde historique SQLite
            try:
                save_meeting_to_history(
                    date=str(date_reunion),
                    participants=parts_str,
                    objet=str(pv_data.get("objet")),
                    details=str(pv_data.get("details")),
                    decisions=json.dumps(decisions_clean, ensure_ascii=False),
                    actions=json.dumps(actions_clean, ensure_ascii=False),
                    next_meeting=str(pv_data.get("next_meeting")),
                    transcription=str(transcription_brute),
                    pdf_path=str(chemin_pdf_officiel)
                )
            except Exception as e_history:
                print(f"⚠️ Échec d'écriture SQL : {e_history}")
            
            return {
                "transcription": transcription_brute,
                "pv_markdown": pv_markdown_dynamique,
                "nom_fichier": nom_fichier_pv_md,
                "pdf_path": chemin_pdf_officiel
            }
        else:
            raise HTTPException(status_code=500, detail=f"Échec LLM Groq : {llm_response.text}")

    except Exception as e:
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================================
# 🆕 OPTION 2 : NOUVELLE ROUTE SÉCURISÉE POUR L'IMPORTATION DE FICHIERS AUDIO
# =========================================================================
@app.post("/agent/upload-pv", tags=["Agent"])
async def upload_pv(request: Request, current_user: dict = Depends(require_roles(["admin", "secretaire"]))):
    """
    Cette route reçoit le fichier importé sous forme de flux binaire brut
    pour éviter les erreurs de parsing HTTP 'multipart' sur les fichiers longs.
    """
    # On récupère le nom du fichier depuis les en-têtes personnalisés ou on met un nom par défaut
    nom_fichier_origine = request.headers.get("X-File-Name", "audio_importe.mp4")
    temp_upload_path = f"temp_upload_{nom_fichier_origine}"
    
    try:
        # 1. Écriture du flux réseau brut directement sur le disque
        with open(temp_upload_path, "wb") as buffer:
            async for chunk in request.stream():
                buffer.write(chunk)
            
        if not os.path.exists(temp_upload_path) or os.path.getsize(temp_upload_path) == 0:
            raise HTTPException(status_code=400, detail="Le fichier importé est vide.")

        # 2. Transcription via Whisper Groq
        whisper_url = "https://api.groq.com/openai/v1/audio/transcriptions"
        headers = {"Authorization": f"Bearer {os.environ.get("GROQ_API_KEY")}"}
        invite_contexte = "Secrétariat Intelligent, suivi de projet, Meryem, Sanaa, Ahmed, Scikit-Learn, Streamlit, FastAPI, SQLite, frontend, backend, route API."

        # Détermination du content_type
        content_type_standard = "audio/mpeg"
        if nom_fichier_origine.lower().endswith(".wav"):
            content_type_standard = "audio/wav"
        elif nom_fichier_origine.lower().endswith((".mp4", ".m4a")):
            content_type_standard = "audio/mp4"

        with open(temp_upload_path, "rb") as audio_file_obj:
            files = {
                "file": (nom_fichier_origine, audio_file_obj, content_type_standard),
                "model": (None, "whisper-large-v3"),
                "language": (None, "fr"),
                "prompt": (None, invite_contexte)
            }
            whisper_response = requests.post(whisper_url, headers=headers, files=files, timeout=300)
        
        if os.path.exists(temp_upload_path):
            os.remove(temp_upload_path)

        if whisper_response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Échec Whisper (Upload) : {whisper_response.text}")
        
        transcription_brute = whisper_response.json().get("text", "")
        
        # Nettoyage phonétique
        transcription_brute = transcription_brute.replace("critérium intelligent", "Secrétariat Intelligent")
        transcription_brute = transcription_brute.replace("Southrimlit", "Streamlit")
        transcription_brute = transcription_brute.replace("aux frontales", "au frontend")
        transcription_brute = transcription_brute.replace("Skiit-Learn", "Scikit-Learn")

        if not transcription_brute.strip():
            return {"pv_markdown": "⚠️ Le fichier audio ne contient aucun contenu vocal identifiable."}

        # 3. Analyse par Llama 3.3
        llm_url = "https://api.groq.com/openai/v1/chat/completions"
        prompt_systeme = (
            "Tu es un secrétaire de direction expert. Extrais les informations clés sous forme d'un objet JSON valide.\n"
            "IMPORTANT : La personne qui parle et dit 'Je / De mon côté' est exclusivement Meryem. Attribue-lui ses actions en son nom (Meryem).\n"
            "Format JSON attendu :\n"
            "{\n"
            '  "date": "Date de la réunion (AAAA-MM-JJ)",\n'
            '  "participants": "Sanaa, Ahmed, Meryem",\n'
            '  "objet": "Sujet principal de la réunion",\n'
            '  "details": "Synthèse rédigée et détaillée des échanges (sans puces)",\n'
            '  "decisions": ["Décision 1", "Décision 2"],\n'
            '  "actions": ["Tâche 1 par Responsable", "Tâche 2 par Responsable"],\n'
            '  "next_meeting": "Date ou À définir"\n'
            "}"
        )

        llm_payload = {
            "model": "llama-3.3-70b-versatile",
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": prompt_systeme},
                {"role": "user", "content": f"Transcription de la réunion :\n{transcription_brute}"}
            ],
            "temperature": 0.1
        }

        llm_response = requests.post(llm_url, headers=headers, json=llm_payload, timeout=300)
        
        if llm_response.status_code == 200:
            str_contenu = llm_response.json()["choices"][0]["message"]["content"]
            pv_data = json.loads(str_contenu)
            
            for clé in ["objet", "details"]:
                if clé in pv_data and isinstance(pv_data[clé], str):
                    pv_data[clé] = pv_data[clé].replace("critérium intelligent", "Secrétariat Intelligent")
                    pv_data[clé] = pv_data[clé].replace("Southrimlit", "Streamlit")
                    pv_data[clé] = pv_data[clé].replace("aux frontales", "au frontend")
                    pv_data[clé] = pv_data[clé].replace("Skiit-Learn", "Scikit-Learn")

            parts = pv_data.get('participants', 'Meryem, Sanaa, Ahmed')
            parts_str = ", ".join([str(p) for p in parts]) if isinstance(parts, list) else str(parts)
            date_reunion = pv_data.get('date', '2026-05-26')

            # 4. Reconstruction du format Markdown (Reste impeccable avec des puces standards)
            pv_markdown_dynamique = f"""# 📝 PROCÈS-VERBAL DE RÉUNION
**Date :** {date_reunion}
**Participants :** {parts_str}

## 🎯 1. Ordre du jour
{pv_data.get('objet')}

## 💬 2. Synthèse des échanges
{pv_data.get('details')}

## 📌 3. Décisions retenues
"""
            decisions_clean = [str(d).lstrip('•- ').strip() for d in pv_data.get('decisions', []) if str(d).strip()]
            for d in decisions_clean:
                pv_markdown_dynamique += f"- {d}\n"

            pv_markdown_dynamique += "\n## 📅 4. Plan d'action\n"
            actions_clean = [str(a).lstrip('•- ').strip() for a in pv_data.get('actions', []) if str(a).strip()]
            for a in actions_clean:
                pv_markdown_dynamique += f"- {a}\n"

            pv_markdown_dynamique += f"\n**Prochaine échéance :** {pv_data.get('next_meeting')}"

            nom_fichier_pv_md = "proces_verbal_reunion.md"
            with open(nom_fichier_pv_md, "w", encoding="utf-8") as f:
                f.write(pv_markdown_dynamique)
                
            # 5. Génération du PDF : Alignement et puces parfaites pour TOUTES les lignes
            from tools.pdf_generator import generate_pv_pdf
            
            # Technique de l'alignement : la première ligne reçoit la puce du générateur, 
            # les lignes suivantes reçoivent une puce explicite.
            decisions_pdf_str = ""
            if decisions_clean:
                decisions_pdf_str = decisions_clean[0]  # Pas de puce manuelle (le générateur va la mettre)
                if len(decisions_clean) > 1:
                    # On ajoute une puce • devant toutes les lignes suivantes
                    decisions_pdf_str += "<br/>" + "<br/>".join([f"• {d}" for d in decisions_clean[1:]])

            actions_pdf_str = ""
            if actions_clean:
                actions_pdf_str = actions_clean[0]  # Pas de puce manuelle
                if len(actions_clean) > 1:
                    actions_pdf_str += "<br/>" + "<br/>".join([f"• {a}" for a in actions_clean[1:]])

            params_pour_pdf = {
                "objet": str(pv_data.get("objet", "Suivi de projet et mise en place du Secrétariat Intelligent")),
                "lieu": "Salle de Réunion",
                "participants": parts_str,
                "details": str(pv_data.get("details", "")).replace("\n", "<br/>"),
                "decisions": decisions_pdf_str, 
                "actions": actions_pdf_str,      
                "next_meeting": str(pv_data.get("next_meeting", "Lundi matin prochain à 10h")),
                "date": str(date_reunion)
            }
            
            chemin_pdf_officiel = generate_pv_pdf(params_pour_pdf)
            
            # 6. Sauvegarde historique SQLite
            try:
                save_meeting_to_history(
                    date=str(date_reunion),
                    participants=parts_str,
                    objet=str(pv_data.get("objet")),
                    details=str(pv_data.get("details")),
                    decisions=json.dumps(decisions_clean, ensure_ascii=False),
                    actions=json.dumps(actions_clean, ensure_ascii=False),
                    next_meeting=str(pv_data.get("next_meeting")),
                    transcription=str(transcription_brute),
                    pdf_path=str(chemin_pdf_officiel)
                )
            except Exception as e_history:
                print(f"⚠️ Échec d'écriture SQL (Upload) : {e_history}")
            
            return {
                "transcription": transcription_brute,
                "pv_markdown": pv_markdown_dynamique,
                "nom_fichier": nom_fichier_pv_md,
                "pdf_path": chemin_pdf_officiel
            }
        else:
            raise HTTPException(status_code=500, detail=f"Échec LLM Groq (Upload) : {llm_response.text}")

    except Exception as e:
        if os.path.exists(temp_upload_path):
            os.remove(temp_upload_path)
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# 🎤 ROUTE DE TRANSCRIPTION SIMPLE
# ==========================================
@app.post("/agent/transcribe", tags=["Agent"])
async def transcribe_audio(request: Request, current_user: dict = Depends(require_roles(["admin", "secretaire"]))):
    """Transcrit un flux audio brut en texte avec Whisper Groq."""
    temp_audio_path = "temp_transcribe_reunion.wav"
    try:
        with open(temp_audio_path, "wb") as buffer:
            async for chunk in request.stream():
                buffer.write(chunk)

        if not os.path.exists(temp_audio_path) or os.path.getsize(temp_audio_path) == 0:
            raise HTTPException(status_code=400, detail="Le flux audio est vide.")

        whisper_url = "https://api.groq.com/openai/v1/audio/transcriptions"
        headers = {"Authorization": f"Bearer {os.environ.get("GROQ_API_KEY")}"}
        invite_contexte = "Secrétariat Intelligent, suivi de projet, Meryem, Sanaa, Ahmed, Scikit-Learn, Streamlit, FastAPI, SQLite."

        with open(temp_audio_path, "rb") as audio_file_obj:
            files = {
                "file": ("enregistrement.wav", audio_file_obj, "audio/wav"),
                "model": (None, "whisper-large-v3"),
                "language": (None, "fr"),
                "prompt": (None, invite_contexte)
            }
            whisper_response = requests.post(whisper_url, headers=headers, files=files)
        
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

        if whisper_response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Échec Whisper : {whisper_response.text}")
        
        transcription_brute = whisper_response.json().get("text", "")
        
        transcription_brute = transcription_brute.replace("critérium intelligent", "Secrétariat Intelligent")
        transcription_brute = transcription_brute.replace("Southrimlit", "Streamlit")
        transcription_brute = transcription_brute.replace("aux frontales", "au frontend")
        transcription_brute = transcription_brute.replace("Skiit-Learn", "Scikit-Learn")

        return {"text": transcription_brute}

    except Exception as e:
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agent/structure-text", tags=["Agent"])
async def structure_text(data: dict, current_user: dict = Depends(require_roles(["admin", "secretaire"]))):
    """
    Reçoit un texte ou compte-rendu brut sous format JSON et utilise Llama 3.3
    pour extraire l'ordre du jour, les décisions, le plan d'action et générer le PV PDF officiel.
    """
    transcription_brute = data.get("text", "")
    if not transcription_brute.strip():
        raise HTTPException(status_code=400, detail="Le texte à structurer est vide.")
        
    try:
        # Analyse par Llama 3.3
        llm_url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {"Authorization": f"Bearer {os.environ.get("GROQ_API_KEY")}"}
        prompt_systeme = (
            "Tu es un secrétaire de direction expert. Extrais les informations clés sous forme d'un objet JSON valide.\n"
            "Format JSON attendu :\n"
            "{\n"
            '  "date": "Date de la réunion (AAAA-MM-JJ)",\n'
            '  "participants": "Sanaa, Ahmed, Meryem",\n'
            '  "objet": "Sujet principal de la réunion",\n'
            '  "details": "Synthèse rédigée et détaillée des échanges (sans puces)",\n'
            '  "decisions": ["Décision 1", "Décision 2"],\n'
            '  "actions": ["Tâche 1 par Responsable", "Tâche 2 par Responsable"],\n'
            '  "next_meeting": "Date ou À définir"\n'
            "}"
        )

        llm_payload = {
            "model": "llama-3.3-70b-versatile",
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": prompt_systeme},
                {"role": "user", "content": f"Texte brut ou Notes de la réunion :\n{transcription_brute}"}
            ],
            "temperature": 0.1
        }

        llm_response = requests.post(llm_url, headers=headers, json=llm_payload, timeout=300)
        
        if llm_response.status_code == 200:
            str_contenu = llm_response.json()["choices"][0]["message"]["content"]
            pv_data = json.loads(str_contenu)
            
            for clé in ["objet", "details"]:
                if clé in pv_data and isinstance(pv_data[clé], str):
                    pv_data[clé] = pv_data[clé].replace("critérium intelligent", "Secrétariat Intelligent")
                    pv_data[clé] = pv_data[clé].replace("Southrimlit", "Streamlit")
                    pv_data[clé] = pv_data[clé].replace("aux frontales", "au frontend")
                    pv_data[clé] = pv_data[clé].replace("Skiit-Learn", "Scikit-Learn")

            parts = pv_data.get('participants', 'Meryem, Sanaa, Ahmed')
            parts_str = ", ".join([str(p) for p in parts]) if isinstance(parts, list) else str(parts)
            date_reunion = pv_data.get('date', '2026-06-03')

            # Reconstruction du format Markdown
            pv_markdown_dynamique = f"""# 📝 PROCÈS-VERBAL DE RÉUNION
**Date :** {date_reunion}
**Participants :** {parts_str}

## 🎯 1. Ordre du jour
{pv_data.get('objet')}

## 💬 2. Synthèse des échanges
{pv_data.get('details')}

## 📌 3. Décisions retenues
"""
            decisions_clean = [str(d).lstrip('•- ').strip() for d in pv_data.get('decisions', []) if str(d).strip()]
            for d in decisions_clean:
                pv_markdown_dynamique += f"- {d}\n"

            pv_markdown_dynamique += "\n## 📅 4. Plan d'action\n"
            actions_clean = [str(a).lstrip('•- ').strip() for a in pv_data.get('actions', []) if str(a).strip()]
            for a in actions_clean:
                pv_markdown_dynamique += f"- {a}\n"

            pv_markdown_dynamique += f"\n**Prochaine échéance :** {pv_data.get('next_meeting')}"

            nom_fichier_pv_md = "proces_verbal_reunion.md"
            with open(nom_fichier_pv_md, "w", encoding="utf-8") as f:
                f.write(pv_markdown_dynamique)
                
            # Génération du PDF
            from tools.pdf_generator import generate_pv_pdf
            decisions_pdf_str = ""
            if decisions_clean:
                decisions_pdf_str = decisions_clean[0]
                if len(decisions_clean) > 1:
                    decisions_pdf_str += "<br/>" + "<br/>".join([f"• {d}" for d in decisions_clean[1:]])

            actions_pdf_str = ""
            if actions_clean:
                actions_pdf_str = actions_clean[0]
                if len(actions_clean) > 1:
                    actions_pdf_str += "<br/>" + "<br/>".join([f"• {a}" for a in actions_clean[1:]])

            params_pour_pdf = {
                "objet": str(pv_data.get("objet", "Suivi de projet")),
                "lieu": "Salle de Réunion",
                "participants": parts_str,
                "details": str(pv_data.get("details", "")).replace("\n", "<br/>"),
                "decisions": decisions_pdf_str,
                "actions": actions_pdf_str,
                "next_meeting": str(pv_data.get("next_meeting", "À définir")),
                "date": str(date_reunion)
            }
            
            chemin_pdf_officiel = generate_pv_pdf(params_pour_pdf)
            
            # Sauvegarde historique SQLite
            try:
                save_meeting_to_history(
                    date=str(date_reunion),
                    participants=parts_str,
                    objet=str(pv_data.get("objet")),
                    details=str(pv_data.get("details")),
                    decisions=json.dumps(decisions_clean, ensure_ascii=False),
                    actions=json.dumps(actions_clean, ensure_ascii=False),
                    next_meeting=str(pv_data.get("next_meeting")),
                    transcription=str(transcription_brute),
                    pdf_path=str(chemin_pdf_officiel)
                )
            except Exception as e_history:
                print(f"⚠️ Échec d'écriture SQL (Structure) : {e_history}")
            
            return {
                "transcription": transcription_brute,
                "pv_markdown": pv_markdown_dynamique,
                "nom_fichier": nom_fichier_pv_md,
                "pdf_path": chemin_pdf_officiel
            }
        else:
            raise HTTPException(status_code=500, detail=f"Échec LLM LLaMA : {llm_response.text}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# 📋 ROUTES DE GESTION DES RÉUNIONS (SQL)
# ==========================================
@app.get("/meetings", tags=["Meetings"])
async def get_meetings(current_user: dict = Depends(require_roles(["admin", "secretaire"]))):
    """Récupère la liste de toutes les réunions programmées."""
    return list_meetings()


@app.get("/meetings/search/{date}", tags=["Meetings"])
async def search_meetings(date: str, current_user: dict = Depends(require_roles(["admin", "secretaire"]))):
    """Recherche les réunions prévues à une date spécifique."""
    return find_meeting_by_date(date)


@app.delete("/meetings/delete/{meeting_id}", tags=["Meetings"])
async def remove_meeting(meeting_id: int, current_user: dict = Depends(require_roles(["admin", "secretaire"]))):
    """Supprime une réunion du calendrier à partir de son ID."""
    return delete_meeting(meeting_id)


# 🟢 NOUVELLE ROUTE : ACCÉDER À L'HISTORIQUE DES PV GENERES
@app.get("/meetings/history", tags=["Meetings"])
async def get_meetings_history(current_user: dict = Depends(require_roles(["admin", "secretaire"]))):
    """Récupère la liste de tous les procès-verbaux archivés en BDD."""
    return get_all_pv_history()


@app.post("/meetings/create", tags=["Meetings"])
async def plan_meeting(data: dict, current_user: dict = Depends(require_roles(["admin", "secretaire"]))):
    """Crée une nouvelle réunion programmée dans le calendrier."""
    from tools.meeting import create_meeting
    resultat = create_meeting(data)
    if "Conflit" in resultat:
        raise HTTPException(status_code=400, detail=resultat)
    return {"message": resultat}


@app.post("/meetings/trigger-invitations", tags=["Meetings"])
async def trigger_invitations(data: dict, current_user: dict = Depends(require_roles(["admin", "secretaire"]))):
    """Déclenche les invitations SMTP pour les réunions planifiées avec le PDF."""
    meeting_title = data.get("titre", "Réunion du Secrétariat")
    meeting_date = data.get("date", "2026-06-05")
    meeting_heure = data.get("heure", "10:00")
    meeting_objet = data.get("objet", "Ordre du jour non spécifié")
    participants_str = data.get("participants", "")
    
    from tools.history_manager import save_history
    from services.email_service import send_email
    from tools.pdf_generator import generate_convocation_reunion_pdf
    import sqlite3
    from data.database_manager import DB_PATH

    target_emails = []
    if participants_str:
        noms = [p.strip() for p in participants_str.split(",") if p.strip()]
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        for nom in noms:
            search_term = f"%{nom}%"
            # Chercher dans les employés (gère nom+prenom ou prenom+nom)
            query_emp = """
                SELECT email FROM employes 
                WHERE (COALESCE(prenom, '') || ' ' || COALESCE(nom, '')) LIKE ? 
                   OR (COALESCE(nom, '') || ' ' || COALESCE(prenom, '')) LIKE ?
                   OR prenom LIKE ? 
                   OR nom LIKE ?
            """
            cursor.execute(query_emp, (search_term, search_term, search_term, search_term))
            res = cursor.fetchone()
            
            if res and res[0]:
                target_emails.append(res[0])
            else:
                # Chercher dans les stagiaires si non trouvé dans employés
                query_stg = """
                    SELECT email FROM stagiaires 
                    WHERE (COALESCE(prenom, '') || ' ' || COALESCE(nom, '')) LIKE ? 
                       OR (COALESCE(nom, '') || ' ' || COALESCE(prenom, '')) LIKE ?
                       OR prenom LIKE ? 
                       OR nom LIKE ?
                """
                cursor.execute(query_stg, (search_term, search_term, search_term, search_term))
                res_stg = cursor.fetchone()
                if res_stg and res_stg[0]:
                    target_emails.append(res_stg[0])
        conn.close()

    # Nettoyer les doublons
    target_emails = list(set(target_emails))

    # Si aucun email n'est trouvé, utiliser l'email de l'utilisateur actuel comme secours
    if not target_emails:
        target_emails = [current_user.get("email", "bouhyla.hanane@etu.uae.ac.ma")]
    
    # Génération du PDF de convocation
    pdf_params = {
        "titre": meeting_title,
        "date": meeting_date,
        "heure": meeting_heure,
        "lieu": "Salle de Réunion (Automatique)",
        "objet": meeting_objet,
        "participants": participants_str
    }
    try:
        pdf_filename = generate_convocation_reunion_pdf(pdf_params)
        import os
        if pdf_filename:
            pdf_filename = os.path.abspath(pdf_filename)
    except Exception as e:
        print(f"Erreur lors de la génération du PDF: {e}")
        pdf_filename = None

    print(f"--- PREPARATION ENVOI EMAIL ---")
    print(f"Titre: {meeting_title}")
    print(f"Participants trouvés: {target_emails}")
    print(f"PDF généré à: {pdf_filename}")
    
    # Envoi de l'email pour CHAQUE participant avec le PDF en pièce jointe
    success_count = 0
    for dest_email in target_emails:
        body = f"Bonjour,\n\nVous êtes convoqué(e) à la réunion '{meeting_title}' prévue le {meeting_date} à {meeting_heure}.\n\nVeuillez trouver la convocation officielle en pièce jointe.\n\nCordialement,\nLe Secrétariat"
        print(f"Envoi vers {dest_email}...")
        res = send_email(
            to_email=dest_email,
            subject=f"Convocation : {meeting_title}",
            body=body,
            attachment_path=pdf_filename
        )
        print(f"Resultat pour {dest_email}: {res}")
        if "succès" in res:
            success_count += 1
    
    print(f"--- FIN ENVOI EMAIL: {success_count} réussis ---")
    
    if success_count > 0:
        save_history({
            "user": current_user.get("name", "Secrétaire"),
            "action": f"SMTP Invitations sent: {meeting_title}",
            "priorite": "Moyenne",
            "temps_execution": 420
        })
        emails_sent_str = ", ".join(target_emails)
        return {
            "status": "success",
            "message": f"Succès: {success_count} email(s) envoyé(s) à {emails_sent_str}."
        }
    else:
        raise HTTPException(status_code=500, detail="Échec de l'envoi de l'email SMTP. Assurez-vous que vos identifiants SMTP sont corrects dans le fichier .env.")


# ==========================================
# 📁 ROUTE DE TÉLÉCHARGEMENT DE DOCUMENTS (PDF & MD)
# ==========================================
@app.get("/download/{file_path:path}", tags=["Documents"])
def download_file(file_path: str, current_user: dict = Depends(require_roles(["admin", "secretaire", "employee"]))):
    """Permet au frontend de télécharger les documents générés (PDF ou Markdown)."""
    normalized_path = file_path.replace("\\", "/")
    clean_path = os.path.basename(normalized_path)

    # Configuration dynamique du type de fichier selon son extension
    media_type = "text/markdown" if clean_path.endswith(".md") else "application/pdf"

    candidate_paths = [normalized_path, clean_path]
    for candidate_path in candidate_paths:
        if not candidate_path:
            continue
        if os.path.exists(candidate_path):
            return FileResponse(
                path=candidate_path,
                filename=os.path.basename(candidate_path),
                media_type=media_type,
            )

    raise HTTPException(status_code=404, detail=f"Fichier introuvable : {file_path}")
# ==========================================
# 🌐 DYNAMIC FRONTEND DATA
# ==========================================

from data.database_manager import DB_PATH
import sqlite3

@app.get("/api/demandes", tags=["Frontend"])
async def get_demandes(current_user: dict = Depends(get_current_user)):
    """Récupère les demandes entrantes depuis la BDD."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT req_id, from_email, subject, date, urgency, email_brut FROM demandes_entrantes")
    lignes = cursor.fetchall()
    conn.close()
    
    resultat = []
    for l in lignes:
        resultat.append({
            "id": l[0],
            "from": l[1],
            "subject": l[2],
            "date": l[3],
            "urgency": l[4],
            "email_brut": l[5]
        })
    return resultat

@app.get("/api/notifications", tags=["Frontend"])
async def get_notifications(current_user: dict = Depends(get_current_user)):
    """Récupère des notifications réelles depuis les demandes et les logs système."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    notifications_reelles = []

    try:
        cursor.execute("""
            SELECT id, requester_name, requester_email, document_type, status, created_at, updated_at
            FROM document_requests
            ORDER BY id DESC
            LIMIT 8
        """)
        for row in cursor.fetchall():
            status = row["status"]
            notif_type = "info"
            if status == "pending":
                notif_type = "warning"
            elif status in ("ready", "delivered"):
                notif_type = "success"
            elif status == "rejected":
                notif_type = "error"

            demandeur = row["requester_name"] or row["requester_email"] or "Utilisateur"
            notifications_reelles.append({
                "id": f"doc-{row['id']}",
                "type": notif_type,
                "text": f"Demande document #{row['id']} - {demandeur} - {row['document_type']} - {status}",
                "time": row["updated_at"] or row["created_at"] or "",
            })
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("""
            SELECT id, timestamp, utilisateur, action_requise, priorite
            FROM logs_activite
            ORDER BY id DESC
            LIMIT 8
        """)
        for row in cursor.fetchall():
            priorite = row["priorite"] or "Normale"
            notif_type = "warning" if priorite == "Haute" else "info"
            if "READY" in (row["action_requise"] or "") or "GENERATED" in (row["action_requise"] or ""):
                notif_type = "success"
            if "REJECTED" in (row["action_requise"] or "") or "ERROR" in (row["action_requise"] or ""):
                notif_type = "error"
            notifications_reelles.append({
                "id": f"log-{row['id']}",
                "type": notif_type,
                "text": row["action_requise"] or "Activité système",
                "time": row["timestamp"] or "",
            })
    except sqlite3.OperationalError:
        pass
    finally:
        conn.close()

    return notifications_reelles[:12]

if __name__ == "__main__":
    import uvicorn
    # Port 8000 — aligné avec le frontend Vite (import.meta.env.VITE_API_BASE_URL)
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
