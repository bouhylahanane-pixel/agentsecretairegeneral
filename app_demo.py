import os
import pandas as pd
import requests
import streamlit as st

# Configuration de la page
st.set_page_config(page_title="Dashboard & Agent IA", layout="wide", page_icon="🤖")

st.title("💼 Système Agentique & Dashboard Analytics")
st.markdown("---")

# Base URL de ton API FastAPI
API_URL = "http://127.0.0.1:8001"

# Barre latérale de navigation
menu = st.sidebar.radio("Navigation", ["📊 Tableau de Bord", "💬 Assistant IA Admin"])

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
        col3.metric(
            "Temps de Réponse Moyen", f"{stats_res.get('average_response_time_ms', 0)} ms"
        )

        st.markdown("---")
        st.subheader("📊 Répartition des Actions Métier")

        # Récupération des données du graphique
        chart_res = requests.get(f"{API_URL}/analytics/chart").json()

        if chart_res:
            df = pd.DataFrame(list(chart_res.items()), columns=["Action", "Quantité"])
            st.bar_chart(df.set_index("Action"))
        else:
            st.info(
                "Aucune donnée d'action enregistrée pour le moment. Testez l'assistant pour générer des logs !"
            )

    except Exception as e:
        st.error(
            "Impossible de connecter le Dashboard au Backend FastAPI. Vérifiez qu'uvicorn tourne sur le port 8001."
        )

# ==========================================
# 💬 ONGLET 2 : ASSISTANT IA (INTERFACE DE CHAT)
# ==========================================
elif menu == "💬 Assistant IA Admin":
    st.subheader("🤖 Chat avec l'Assistant Administratif")

    # Initialisation de l'historique dans Streamlit
    if "messages" not in st.session_state:
        st.session_state.messages = []

    # 1. Affichage de l'historique persistant (avec boutons de téléchargement conservés)
    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])
            
            # Si le message historique contient un PDF associé, on ré-affiche le bouton de téléchargement
            if msg["role"] == "assistant" and msg.get("pdf_path"):
                p_path = msg["pdf_path"]
                if os.path.exists(p_path):
                    with open(p_path, "rb") as file:
                        st.download_button(
                            label="📥 Télécharger le PDF",
                            data=file,
                            file_name=os.path.basename(p_path),
                            mime="application/pdf",
                            key=f"dl_{p_path}_{st.session_state.messages.index(msg)}"  # Clé unique obligatoire pour Streamlit
                        )

    # 2. Zone d'écriture utilisateur
    if user_input := st.chat_input("Ex: Prépare une attestation de stage pour Sanaa..."):
        # Affichage immédiat du message utilisateur
        with st.chat_message("user"):
            st.markdown(user_input)
        st.session_state.messages.append({"role": "user", "content": user_input})

        # Appel à l'API FastAPI
        with st.spinner("L'agent réfléchit et vérifie la base de données..."):
            try:
                payload = {"message": user_input, "utilisateur": "Meryem"}
                response = requests.post(f"{API_URL}/agent/process", json=payload).json()

                agent_reply = response.get("response", "Je n'ai pas pu traiter la demande.")
                pdf_path = response.get("pdf_path", None)

                # Affichage de la réponse de l'agent en direct
                with st.chat_message("assistant"):
                    st.markdown(agent_reply)

                    # Gestion et affichage immédiat du bouton de téléchargement s'il est prêt
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

                # Sauvegarde du message ET du chemin du PDF associé dans l'état de la session
                st.session_state.messages.append(
                    {"role": "assistant", "content": agent_reply, "pdf_path": pdf_path}
                )
                
                # Force un rafraîchissement propre pour fixer l'état des composants
                st.rerun()

            except Exception as e:
                st.error(f"Erreur de communication avec l'agent : {str(e)}")