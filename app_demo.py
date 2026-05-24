import os
import pandas as pd
import requests
import streamlit as st

# 🟢 AJOUTE CES DEUX LIGNES ICI POUR LIRE LE FICHIER .ENV :
from dotenv import load_dotenv
load_dotenv()
# Le composant d'enregistrement au clic libre
from streamlit_mic_recorder import mic_recorder

# Import de ta fonction Text-to-Speech existante
from services.voice_service import text_to_speech

# Base URL de ton API FastAPI (Aligné sur ton port 8001)
API_URL = "http://127.0.0.1:8001"
# Maintenant, cette ligne va fonctionner parfaitement !
GROQ_API_KEY = os.getenv("GROQ_API_KEY") 

# Configuration de la page
st.set_page_config(page_title="Dashboard & Agent IA", layout="wide", page_icon="🤖")

st.title("💼 Système Agentique & Dashboard Analytics")
st.markdown("---")

# 🟢 MISE À ZONE : Ajout du 3ème onglet dans le menu de navigation
menu = st.sidebar.radio("Navigation", ["📊 Tableau de Bord", "💬 Assistant IA Admin", "📝 Génération de PV"])


# 🎙️ FONCTION DE TRANSCRIPTION DYNAMIQUE ET SÉCURISÉE
def transcrire_audio_whisper(audio_bytes):
    filename = "outputs/audio/prompt_vocal.wav"
    os.makedirs("outputs/audio", exist_ok=True)
    
    with open(filename, "wb") as f:
        f.write(audio_bytes)
        
    with st.spinner("⏳ Whisper analyse votre voix..."):
        url = "https://api.groq.com/openai/v1/audio/transcriptions"
        headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
        
        # 1. Mots-clés administratifs fixes (les actions de ton système)
        mots_cles_fixes = ["génère", "attestation de stage", "relevé de notes", "certificat", "dashboard", "analytics"]
        
        # 2. Récupération DYNAMIQUE des noms présents dans l'historique ou la base
        noms_dynamiques = []
        try:
            logs_res = requests.get(f"{API_URL}/analytics/logs").json()
            if logs_res:
                # On extrait proprement tous les noms uniques des utilisateurs de tes logs
                noms_dynamiques = list(set([str(log.get("utilisateur", "")).strip() for log in logs_res if log.get("utilisateur")]))
        except Exception as e:
            # Sécurité au cas où l'API backend ne répond pas à cet instant
            print(f"Impossible de récupérer les noms pour le contexte Whisper: {e}")
            
        # 3. Fusion des deux listes (on s'assure d'inclure "Meryem" par défaut au cas où la base est vide)
        if "Meryem" not in noms_dynamiques:
            noms_dynamiques.append("Meryem")
            
        liste_totale = mots_cles_fixes + noms_dynamiques
        invite_contexte = ", ".join(liste_totale)
        
        with open(filename, "rb") as audio_file:
            files = {
                "file": ("prompt_vocal.wav", audio_file, "audio/wav"),
                "model": (None, "whisper-large-v3"),
                "language": (None, "fr"),
                "prompt": (None, invite_contexte) # L'API reçoit la liste actualisée en temps réel !
            }
            response = requests.post(url, headers=headers, files=files)
            if response.status_code == 200:
                return response.json().get("text", "")
            else:
                print(f"Erreur Groq Whisper: {response.text}")
    return ""

# ==========================================
# 📊 ONGLET 1 : TABLEAU DE BORD (DATA ANALYTICS)
# ==========================================
if menu == "📊 Tableau de Bord":
    st.subheader("📈 Métriques de Performance de l'Agent")

    try:
        # Récupération des stats globales
        stats_res = requests.get(f"{API_URL}/analytics/stats").json()

        # Affichage des cartes de métriques
        col1, col2, col3 = st.columns(3)
        col1.metric("Requêtes Traitées", stats_res.get("total_requests", 0))
        col2.metric("Urgence(s) Détectée(s) 🚨", stats_res.get("total_urgencies", 0))
        col3.metric("Temps de Réponse Moyen", f"{stats_res.get('average_response_time_ms', 0)} ms")

        st.markdown("---")
        
        # Organisation en deux colonnes pour un rendu visuel équilibré
        col_chart, col_table = st.columns([1, 1])
        
        with col_chart:
            st.subheader("📊 Répartition des Actions Métier")
            chart_res = requests.get(f"{API_URL}/analytics/chart").json()
            if chart_res:
                df = pd.DataFrame(list(chart_res.items()), columns=["Action", "Quantité"])
                st.bar_chart(df.set_index("Action"))
            else:
                st.info("Aucune donnée d'action enregistrée pour le moment.")

        with col_table:
            st.subheader("📋 Historique Récent des Activités")
            logs_res = requests.get(f"{API_URL}/analytics/logs").json()
            if logs_res:
                df_logs = pd.DataFrame(logs_res)
                df_display = df_logs[["timestamp", "utilisateur", "action", "priorite", "temps"]].copy()
                df_display.columns = ["Date/Heure", "Utilisateur", "Action Requise", "Priorité", "Temps (ms)"]
                st.dataframe(df_logs, width="stretch", hide_index=True)
            else:
                st.info("Aucun log d'activité disponible.")

    except Exception as e:
        st.error("Impossible de connecter le Dashboard au Backend FastAPI. Vérifiez qu'uvicorn tourne sur le port 8001.")


# ==========================================
# 💬 ONGLET 2 : ASSISTANT IA (INTERFACE DE CHAT MULTIMODALE)
# ==========================================
elif menu == "💬 Assistant IA Admin":
    st.subheader("🤖 Chat avec l'Assistant Administratif")

    # 🟢 SÉCURITÉ : Initialisation de l'historique ET du tampon vocal de session
    if "messages" not in st.session_state:
        st.session_state.messages = []
    if "input_vocal_tampon" not in st.session_state:
        st.session_state.input_vocal_tampon = ""

    # 1. Affichage de l'historique persistant
    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])
            
            # Si l'assistant a un fichier audio lié dans l'historique, on l'affiche
            if msg["role"] == "assistant" and msg.get("audio_path"):
                if os.path.exists(msg["audio_path"]):
                    st.audio(msg["audio_path"], format="audio/mp3")
            
            # Si le message historique contient un PDF associé
            if msg["role"] == "assistant" and msg.get("pdf_path"):
                p_path = msg["pdf_path"]
                if os.path.exists(p_path):
                    with open(p_path, "rb") as file:
                        st.download_button(
                            label="📥 Télécharger le PDF",
                            data=file,
                            file_name=os.path.basename(p_path),
                            mime="application/pdf",
                            key=f"dl_{p_path}_{st.session_state.messages.index(msg)}"
                        )

    st.markdown("---")

    # Conteneur pour aligner la zone d'écriture et le micro tout en bas
    col_input, col_mic = st.columns([5, 1])

    with col_mic:
        audio_recap = mic_recorder(
            start_prompt="🎤 Enregistrer",
            stop_prompt="🔴 Arrêter",
            just_once=True,
            use_container_width=True,
            key="chat_mic"
        )
        
        if audio_recap and "bytes" in audio_recap:
            transcription = transcrire_audio_whisper(audio_recap["bytes"])
            if transcription:
                st.session_state.input_vocal_tampon = transcription
                st.rerun()

    with col_input:
        user_input = st.chat_input("Ex: Prépare une attestation de stage pour Sanaa...")

    if st.session_state.input_vocal_tampon:
        user_input = st.session_state.input_vocal_tampon
        st.session_state.input_vocal_tampon = "" 

    if user_input:
        with st.chat_message("user"):
            st.markdown(user_input)
        st.session_state.messages.append({"role": "user", "content": user_input})

        with st.spinner("L'agent exécute l'action demandée..."):
            try:
                payload = {"message": user_input, "utilisateur": "Meryem"}
                response = requests.post(f"{API_URL}/agent/process", json=payload).json()

                agent_reply = response.get("response", "Je n'ai pas pu traiter la demande.")
                pdf_path = response.get("pdf_path", None)

                id_msg = len(st.session_state.messages)
                audio_output_path = f"outputs/audio/reply_{id_msg}.mp3"
                try:
                    text_to_speech(agent_reply, output_path=audio_output_path)
                except Exception as e_tts:
                    print(f"Erreur gTTS: {e_tts}")
                    audio_output_path = None

                with st.chat_message("assistant"):
                    st.markdown(agent_reply)

                    if audio_output_path and os.path.exists(audio_output_path):
                        st.audio(audio_output_path, format="audio/mp3")

                    if pdf_path and os.path.exists(pdf_path):
                        with open(pdf_path, "rb") as file:
                            st.download_button(
                                label="📥 Télécharger le PDF généré",
                                data=file,
                                file_name=os.path.basename(pdf_path),
                                mime="application/pdf",
                                key=f"dl_instant_{pdf_path}"
                            )
                    elif pdf_path:
                        st.warning("⚠️ Fichier PDF introuvable sur le serveur local.")

                st.session_state.messages.append(
                    {"role": "assistant", "content": agent_reply, "pdf_path": pdf_path, "audio_path": audio_output_path}
                )
                st.rerun()

            except Exception as e:
                st.error(f"Erreur de communication avec l'agent : {str(e)}")


# ==========================================
# 🟢 ONGLET 3 : 📝 GÉNÉRATION DE PV DE RÉUNION
# ==========================================
elif menu == "📝 Génération de PV":
    st.subheader("📝 Générateur Automatique de Procès-Verbaux (PV)")
    st.markdown("Transformez les fichiers audio ou les enregistrements de vos réunions en comptes-rendus structurés.")
    
    # Organisation visuelle en deux colonnes : Contrôles audio à gauche, affichage du PV à droite
    col_audio, col_resultat = st.columns([1, 1])
    
    with col_audio:
        st.info("ℹ️ Vous pouvez enregistrer votre réunion en direct ou téléverser un fichier existant.")
        
        # --- Option 1 : Micro en direct ---
        st.markdown("### 🎙️ Option 1 : Enregistrer la réunion en direct")
        audio_reunion = mic_recorder(
            start_prompt="🎤 Démarrer l'enregistrement",
            stop_prompt="🛑 Arrêter et générer le PV",
            just_once=True,
            key="pv_reunion_mic"
        )
        
        st.markdown("<br>", unsafe_allow_html=True)
        st.markdown("---")
        
        # --- Option 2 : Upload de fichier ---
        st.markdown("### 📂 Option 2 : Importer un fichier audio")
        fichier_audio = st.file_uploader(
            "Formats acceptés : MP3, WAV, M4A", 
            type=["mp3", "wav", "m4a"],
            key="pv_reunion_upload"
        )

    with col_resultat:
        st.markdown("### 📄 Résultat du Procès-Verbal")
        
        contenu_audio_bytes = None
        
        # Interception de la source audio active
        if audio_reunion and "bytes" in audio_reunion:
            contenu_audio_bytes = audio_reunion["bytes"]
            st.success("✅ Enregistrement en direct capturé avec succès !")
            
        elif fichier_audio is not None:
            contenu_audio_bytes = fichier_audio.read()
            st.success(f"✅ Fichier '{fichier_audio.name}' importé avec succès !")
            
        # 🔥 MODIFICATION : Déclenchement du traitement réel via FastAPI
        if contenu_audio_bytes:
            with st.spinner("⏳ Transcription de la réunion et mise en page du PV par l'IA..."):
                try:
                    # Préparation des fichiers binaires pour le format multipart/form-data
                    files = {"file": ("reunion_audio.wav", contenu_audio_bytes, "audio/wav")}
                    
                    # Appel vers notre nouvelle route FastAPI
                    response = requests.post(f"{API_URL}/agent/generate-pv", files=files)
                    
                    if response.status_code == 200:
                        data = response.json()
                        pv_markdown = data.get("pv_markdown", "")
                        transcription_brute = data.get("transcription", "")
                        
                        # Affichage du PV final mis en forme par Llama 3
                        st.markdown(pv_markdown)
                        
                        st.markdown("---")
                        # Un expander propre pour garder un œil sur la transcription si besoin
                        with st.expander("🔍 Voir la transcription complète (Whisper)"):
                            st.write(transcription_brute)
                    else:
                        st.error(f"Erreur du serveur backend ({response.status_code}) lors de la génération.")
                        
                except Exception as e:
                    st.error(f"Impossible de joindre le serveur backend : {str(e)}")
        else:
            st.info("📢 Veuillez enregistrer un flux audio ou déposer un fichier pour déclencher la rédaction automatique.")