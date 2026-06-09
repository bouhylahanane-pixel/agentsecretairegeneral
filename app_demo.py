import os
import io  # 🟢 Pour manipuler proprement les flux binaire en mémoire
import pandas as pd
import requests
import streamlit as st

# 🟢 Lecture du fichier .env
from dotenv import load_dotenv
load_dotenv()

# Le composant d'enregistrement au clic libre
from streamlit_mic_recorder import mic_recorder

# Import de ta fonction Text-to-Speech existante
from services.voice_service import text_to_speech

# Base URL de ton API FastAPI (Aligné sur ton port 8001)
API_URL = "http://127.0.0.1:8001"
 

# Configuration de la page
st.set_page_config(page_title="Dashboard & Agent IA", layout="wide", page_icon="🤖")

st.title("💼 Système Agentique & Dashboard Analytics")
st.markdown("---")

# Menu de navigation
menu = st.sidebar.radio("Navigation", ["📊 Tableau de Bord", "💬 Assistant IA Admin", "📝 Génération de PV"])


# 🎙️ FONCTION DE TRANSCRIPTION DYNAMIQUE ET SÉCURISÉE
def transcrire_audio_whisper(audio_bytes):
    filename = "outputs/audio/prompt_vocal.wav"
    os.makedirs("outputs/audio", exist_ok=True)
    
    with open(filename, "wb") as f:
        f.write(audio_bytes)
        
    with st.spinner("⏳ Whisper analyse votre voix..."):
        url = "https://api.groq.com/openai/v1/audio/transcriptions"
        headers = {"Authorization": f"Bearer {os.environ.get("GROQ_API_KEY")}"}
        
        mots_cles_fixes = ["génère", "attestation de stage", "relevé de notes", "certificat", "dashboard", "analytics"]
        
        noms_dynamiques = []
        try:
            logs_res = requests.get(f"{API_URL}/analytics/logs").json()
            if logs_res:
                noms_dynamiques = list(set([str(log.get("utilisateur", "")).strip() for log in logs_res if log.get("utilisateur")]))
        except Exception as e:
            print(f"Impossible de récupérer les noms pour le contexte Whisper: {e}")
            
        if "Meryem" not in noms_dynamiques:
            noms_dynamiques.append("Meryem")
            
        liste_totale = mots_cles_fixes + noms_dynamiques
        invite_contexte = ", ".join(liste_totale)
        
        with open(filename, "rb") as audio_file:
            files = {
                "file": ("prompt_vocal.wav", audio_file, "audio/wav"),
                "model": (None, "whisper-large-v3"),
                "language": (None, "fr"),
                "prompt": (None, invite_contexte)
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
        stats_res = requests.get(f"{API_URL}/analytics/stats").json()

        col1, col2, col3 = st.columns(3)
        col1.metric("Requêtes Traitées", stats_res.get("total_requests", 0))
        col2.metric("Urgence(s) Détectée(s) 🚨", stats_res.get("total_urgencies", 0))
        col3.metric("Temps de Réponse Moyen", f"{stats_res.get('average_response_time_ms', 0)} ms")

        st.markdown("---")
        
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

    if "messages" not in st.session_state:
        st.session_state.messages = []
    if "input_vocal_tampon" not in st.session_state:
        st.session_state.input_vocal_tampon = ""

    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])
            if msg["role"] == "assistant" and msg.get("audio_path"):
                if os.path.exists(msg["audio_path"]):
                    st.audio(msg["audio_path"], format="audio/mp3")
            
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
    
    if "pv_ready" not in st.session_state:
        st.session_state.pv_ready = False
    if "current_pv" not in st.session_state:
        st.session_state.current_pv = ""
    if "current_transcription" not in st.session_state:
        st.session_state.current_transcription = ""
    if "pdf_template_path" not in st.session_state:
        st.session_state.pdf_template_path = None
    if "reunion_audio_bytes" not in st.session_state:
        st.session_state.reunion_audio_bytes = None
    if "reunion_audio_name" not in st.session_state:
        st.session_state.reunion_audio_name = "reunion_audio.wav"
    if "reunion_audio_mime" not in st.session_state:
        st.session_state.reunion_audio_mime = "audio/wav"
    if "audio_source" not in st.session_state:
        st.session_state.audio_source = None

    col_audio, col_resultat = st.columns([1, 1])
    
    with col_audio:
        st.info("ℹ️ Enregistrez votre réunion en direct ou déposez un fichier existant.")
        
        st.markdown("### 🎙️ Option 1 : Enregistrer en direct")
        audio_reunion = mic_recorder(
            start_prompt="🎤 Démarrer l'enregistrement",
            stop_prompt="🛑 Arrêter et valider",
            just_once=True,
            key="pv_reunion_mic"
        )
        
        if audio_reunion and "bytes" in audio_reunion:
            if st.session_state.reunion_audio_bytes != audio_reunion["bytes"]:
                st.session_state.reunion_audio_bytes = audio_reunion["bytes"]
                st.session_state.reunion_audio_name = "enregistrement_direct.webm"
                st.session_state.reunion_audio_mime = "audio/webm"
                st.session_state.audio_source = "micro"
                st.success("✅ Enregistrement micro capturé avec succès !")
        
        st.markdown("<br>", unsafe_allow_html=True)
        st.markdown("---")
        
        st.markdown("### 📂 Option 2 : Importer un fichier audio")
        fichier_audio = st.file_uploader(
            "Formats acceptés : MP3, WAV, M4A, MP4 (Audios WhatsApp)", 
            type=["mp3", "wav", "m4a", "mp4"],
            key="pv_reunion_upload"
        )
        
        if fichier_audio is not None:
            fichier_bytes = fichier_audio.getvalue()
            if st.session_state.reunion_audio_bytes != fichier_bytes:
                st.session_state.reunion_audio_bytes = fichier_bytes
                st.session_state.reunion_audio_name = fichier_audio.name
                ext = fichier_audio.name.split('.')[-1].lower()
                
                if ext in ["mp4", "m4a"]:
                    st.session_state.reunion_audio_mime = "audio/mp4"
                else:
                    st.session_state.reunion_audio_mime = f"audio/{ext}"
                    
                st.session_state.audio_source = "upload"
                st.success(f"✅ Fichier {fichier_audio.name} chargé en mémoire !")
                
        st.markdown("<br>", unsafe_allow_html=True)
        bouton_generer = st.button("🚀 Lancer la génération du PV", use_container_width=True, type="primary")

        if st.session_state.pv_ready:
            st.markdown("---")
            if st.button("🔄 Effacer et refaire un enregistrement", use_container_width=True):
                st.session_state.pv_ready = False
                st.session_state.current_pv = ""
                st.session_state.current_transcription = ""
                st.session_state.pdf_template_path = None
                st.session_state.reunion_audio_bytes = None
                st.session_state.audio_source = None
                st.rerun()

    with col_resultat:
        st.markdown("### 📄 Résultat du Procès-Verbal")
        
        contenu_audio_bytes = st.session_state.get("reunion_audio_bytes")
            
        if bouton_generer and contenu_audio_bytes and not st.session_state.get("pv_ready", False):
            with st.spinner("⏳ Traitement et mise en page du PV en cours..."):
                try:
                    # 🔀 AIGUILLAGE PAR FLUX BRUT SÉCURISÉ (ZÉRO ERREUR MULTIPART)
                    if st.session_state.get("audio_source") == "upload" and fichier_audio is not None:
                        nom_fichier = st.session_state.reunion_audio_name
                        
                        # Réinitialisation et lecture propre des octets
                        fichier_audio.seek(0)
                        raw_file_bytes = fichier_audio.read()
                        
                        # Envoi en binaire pur avec en-tête pour transmettre le nom du fichier
                        headers_brut = {
                            "Content-Type": "application/octet-stream",
                            "X-File-Name": nom_fichier
                        }
                        
                        response = requests.post(
                            f"{API_URL}/agent/upload-pv", 
                            data=raw_file_bytes, 
                            headers=headers_brut, 
                            timeout=900
                        )
                        
                    else:
                        # Option 1 (Micro direct) : Inchangé
                        headers_flux = {"Content-Type": "application/octet-stream"}
                        response = requests.post(
                            f"{API_URL}/agent/generate-pv", 
                            data=contenu_audio_bytes,
                            headers=headers_flux,
                            timeout=900
                        )
                    
                    if response and response.status_code == 200:
                        data = response.json()
                        st.session_state.current_pv = data.get("pv_markdown", "")
                        st.session_state.current_transcription = data.get("transcription", "")
                        st.session_state.pdf_template_path = data.get("pdf_path", None)
                        st.session_state.pv_ready = True
                        st.rerun()
                    else:
                        st.error(f"Erreur backend ({response.status_code}) : {response.text}")
                        
                except Exception as e:
                    st.error(f"Impossible de joindre le serveur backend : {str(e)}")
                    
        elif bouton_generer and not contenu_audio_bytes:
            st.warning("⚠️ Veuillez d'abord enregistrer un audio ou téléverser un fichier avant de lancer la génération.")
        
        # 🔒 TON CODE D'AFFICHAGE DE RESTE STRICTEMENT INTACT ICI :
        if st.session_state.get("pv_ready", False):
            st.markdown(st.session_state.current_pv)
            st.markdown("---")
            
            pdf_path = st.session_state.get("pdf_template_path")
            if pdf_path and os.path.exists(pdf_path):
                with open(pdf_path, "rb") as file:
                    st.download_button(
                        label="📥 Télécharger le PV Officiel (Format PDF)",
                        data=file,
                        file_name=os.path.basename(pdf_path),
                        mime="application/pdf",
                        use_container_width=True
                    )
            else:
                st.warning("⚠️ Le fichier PDF officiel n'a pas été trouvé ou généré sur le serveur.")
            
            st.download_button(
                label="📄 Télécharger la version brute (.md)",
                data=st.session_state.current_pv,
                file_name="PV_Réunion_Secrétariat.md",
                mime="text/markdown",
                use_container_width=True
            )
            st.markdown("---")
            
            with st.expander("🔍 Voir la transcription complète (Whisper)"):
                st.write(st.session_state.current_transcription)
        else:
            if not contenu_audio_bytes:
                st.info("📢 Enregistrez un flux audio ou déposez un fichier, puis cliquez sur le bouton pour lancer la rédaction.")