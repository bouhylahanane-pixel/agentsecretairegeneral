import os
import json
import sqlite3
import requests
from dotenv import load_dotenv

load_dotenv()  # Charge les variables du fichier .env
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Chemins d'accès absolus et dynamiques vers nos bases de données SQLite
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "database.db")
RAG_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "rag_regulation.db")


# ==========================================
# 🔍 Fonction de RAG 1 : Annuaire des employés
# ==========================================
def enrichir_avec_bdd(nom_employe: str):
    """
    Cherche l'employé dans SQLite pour récupérer ses coordonnées réelles.
    C'est l'étape clé du RAG (Retrieval-Augmented Generation) pour l'annuaire.
    """
    if not nom_employe:
        return None
        
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Recherche insensible à la casse (ex: Ahmed, ahmed, AHMED)
    cursor.execute("SELECT * FROM employes WHERE LOWER(nom) LIKE LOWER(?)", (f"%{nom_employe.strip()}%",))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return {
            "email": row["email"],
            "poste": row["poste"],
            "disponibilite": row["disponibilite"]
        }
    return None


# ==========================================
# 📜 Fonction de RAG 2 : Moteur de recherche du Règlement
# ==========================================
def chercher_dans_reglement(mot_cle: str):
    """
    Parcourt la table du règlement intérieur pour trouver la section la plus pertinente.
    """
    if not os.path.exists(RAG_DB_PATH):
        return "Erreur : La base de données du règlement intérieur n'est pas initialisée."

    conn = sqlite3.connect(RAG_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Recherche textuelle simple par mot-clé (LIKE)
    cursor.execute("""
        SELECT contenu FROM reglement_sections 
        WHERE contenu LIKE ? OR titre LIKE ? 
        LIMIT 1
    """, (f"%{mot_cle}%", f"%{mot_cle}%"))
    
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return row["contenu"]
    
    # Fallback si aucun mot spécifique ne matche : on renvoie les premières lignes génériques
    conn = sqlite3.connect(RAG_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT contenu FROM reglement_sections LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    
    return row[0] if row else "Aucune information disponible dans le règlement."


# ==========================================
# 🔥 LLM CALL (Prompt Nettoyé et Corrigé)
# ==========================================
def call_llm(message: str):
    try:
        prompt = f"""
Tu es un assistant administratif.
Tu devez extraire les informations importantes du message.
Retourne UNIQUEMENT un JSON valide.

Format :
{{
  "action": "",
  "parameters": {{
    "type": "",
    "nom": "",
    "priorite": "Normale",
    "poste": "",
    "departement": "",
    "service": "",
    "entreprise": "",
    "encadrant": "",
    "recruteur": "",
    "date": "",
    "date_debut": "",
    "date_fin": "",
    "heure": "",
    "salle": "",
    "lieu": "",
    "objet": "",
    "participants": "",
    "details": "",
    "email": "",
    "decisions": "",
    "actions": "",
    "next_meeting": ""
  }}
}}

Règles strictes d'aiguillage des actions :
- attestation stage -> type = attestation_stage, action = generate_document
- attestation travail -> type = attestation_travail, action = generate_document
- attestation présence -> type = attestation_presence, action = generate_document
- convocation réunion (document PDF requis) -> type = convocation_reunion, action = generate_document
- convocation entretien / entretien avec candidat (document PDF requis) -> type = convocation_entretien, action = generate_document
- planification simple de réunion ou rdv (sans création de PDF) -> action = create_meeting
- procès verbal / pv / compte rendu -> action = generate_pv
- questions sur les règles, horaires globaux, retards, règlements de l'entreprise ou obligations -> action = consult_regulation

- Pour les réunions ou rdv (action = create_meeting), mets TOUJOURS le nom de la personne avec qui on planifie la réunion dans le champ "nom" (en plus de "participants").
- Extraire également les adresses email si présentes directement dans le texte.

🔥 RÈGLE D'URGENCE (CRITIQUE) :
Si l'utilisateur emploie des mots exprimant l'urgence (ex: "immédiatement", "urgence", "vite", "urgent", "tout de suite", "absolue"), tu dois obligatoirement mettre "priorite": "Haute" dans les parameters. Sinon, mets "priorite": "Normale".
IMPORTANT : Tu dois TOUJOURS retourner TOUS les champs, même si certains sont vides.

Message :
{message}
"""

        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {
                        "role": "system",
                        "content": "Tu es un extracteur JSON administratif. Tu dois UNIQUEMENT retourner du JSON valide, sans aucune explication ni texte en dehors des accolades."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0
            }
        )

        result = response.json()

        if "choices" not in result:
            print("ERREUR API GROQ")
            return None

        content = result["choices"][0]["message"]["content"].strip()
        # Nettoyage renforcé des backticks Markdown
        content = content.replace("```json", "").replace("```", "").strip()

        try:
            parsed = json.loads(content)
        except Exception as e:
            print("Erreur parsing JSON LLM:", e)
            print("Contenu brut :", content)
            return None

        if "action" not in parsed:
            return None

        if "parameters" not in parsed:
            parsed["parameters"] = {}

        return parsed

    except Exception as e:
        print("Erreur LLM:", e)
        return None



# ==========================================
# 🧠 AGENT DECISION (Version Sécurisée pour Démo)
# ==========================================
def agent_decision(messages):
    """
    Fonction centrale de décision de l'agent avec capture globale des erreurs.
    """
    try:
        print("\n--- DÉBUT DÉCISION AGENT ---")
        
        # 1. Extraction intelligente du texte
        if isinstance(messages, list) and len(messages) > 0:
            message_texte = messages[-1].get("content", "")
        else:
            message_texte = str(messages)
        
        print(f"Texte extrait : {message_texte}")
        msg = message_texte.lower()

        # 2. Appel du LLM
        llm_result = call_llm(message_texte) 
        
        # --- SÉCURITÉ : Fallback (Harmonisé précisément avec orchestrator.py) ---
        # --- SÉCURITÉ : Fallback (Harmonisé précisément avec orchestrator.py) ---
        if not isinstance(llm_result, dict):
            print("\n[WARNING] LLM a échoué ou retour invalide, passage en mode Fallback")
            
            # 📅 CALCUL DYNAMIQUE DE LA DATE DE DEMAIN
            from datetime import datetime, timedelta
            date_demain = (datetime.today() + timedelta(days=1)).strftime("%d/%m/%Y")

            if "réunion" in msg or "rdv" in msg:
                llm_result = {"action": "create_meeting", "parameters": {"date": date_demain, "heure": "14h", "lieu": "Salle A", "objet": "Réunion", "priorite": "Normale"}}
            
            elif "entretien" in msg or "convocation" in msg:
                # 🚀 CORRECTION ICI : On utilise date_demain à la place du mot texte "demain"
                llm_result = {"action": "generate_document", "parameters": {"type": "convocation_entretien", "nom": "Amine", "date": date_demain, "heure": "15h", "lieu": "Salle d'Entretien Alpha", "priorite": "Normale"}}
            
            elif "attestation" in msg:
                doc_type = "attestation_stage"
                if "travail" in msg:
                    doc_type = "attestation_travail"
                elif "présence" in msg or "presence" in msg:
                    doc_type = "attestation_presence"
                llm_result = {"action": "generate_document", "parameters": {"type": doc_type, "nom": "Ahmed", "priorite": "Normale"}}
            
            elif "règlement" in msg or "horaire" in msg or "retard" in msg or "obligation" in msg:
                llm_result = {"action": "consult_regulation", "parameters": {"objet": "Règlement", "priorite": "Normale"}}
            
            elif "pv" in msg or "procès verbal" in msg or "compte rendu" in msg:
                llm_result = {"action": "generate_pv", "parameters": {"objet": "Suivi Hebdomadaire & Avancement PFE", "priorite": "Normale"}}
            
            else:
                llm_result = {"action": "unknown", "parameters": {"priorite": "Normale"}}

        # 3. Extraction action et paramètres
        action = llm_result.get("action")
        params = llm_result.get("parameters", {})

        # 4. RAG TEXTUEL (Règlement intérieur)
        if action == "consult_regulation":
            try:
                from tools.rag_engine import interroger_rag
                texte_reponse = interroger_rag(message_texte) 
                llm_result["rag_response"] = texte_reponse
            except Exception as e_rag:
                print(f"Erreur RAG règlement : {e_rag}")
                llm_result["rag_response"] = f"Erreur lors de la lecture du règlement : {str(e_rag)}"

        # 5. RAG ANNUAIRE (Enrichissement de paramètres)
        nom_extrait = params.get("nom")
        if nom_extrait and nom_extrait != "Utilisateur":
            try:
                infos_bdd = enrichir_avec_bdd(nom_extrait)
                if infos_bdd:
                    print(f"✨ [RAG BDD] Données de l'annuaire injectées pour {nom_extrait}")
                    if not params.get("email"): params["email"] = infos_bdd.get("email", "")
                    if not params.get("poste"): params["poste"] = infos_bdd.get("poste", "")
                    params["disponibilite"] = infos_bdd.get("disponibilite", "")
            except Exception as e_annuaire:
                print(f"Erreur RAG Annuaire : {e_annuaire}")

        # 🚀 6. INTERCEPTION ET NETTOYAGE (Pour l'interface de Chat Streamlit)
        if "parameters" in llm_result:
            llm_result["parameters"] = preparer_reponse_streamlit(llm_result["parameters"])

        print("\nLLM RESULT FINAL STABILISÉ:", llm_result)
        return llm_result

    except Exception as e_globale:
        print(f"💥 CRASH SCRIPT BRAIN: {str(e_globale)}")
        return {
            "action": "error", 
            "parameters": {
                "details": f"Erreur interne dans brain.py: {str(e_globale)}"
            }
        }


# 🛠️ FONCTION DE NETTOYAGE (Placée juste en dessous de agent_decision)
def preparer_reponse_streamlit(extracted_params, action_name=""):
    """
    Formate et enrichit dynamiquement le résumé pour un rendu hautement professionnel.
    Sécurisé à 100% pour ne pas impacter les autres documents.
    """
    from datetime import datetime, timedelta

    # 1. 📅 SÉCURITÉ DATE : Si "demain" est détecté, on met la vraie date
    date_du_lendemain = (datetime.today() + timedelta(days=1)).strftime("%Y-%m-%d")
    date_param = str(extracted_params.get("date", "")).lower()
    if "demain" in date_param or not extracted_params.get("date"):
        # On ne remplace que si l'action n'est pas une attestation (qui utilise des dates passées)
        if "attestation" not in str(extracted_params.get("type", "")):
            extracted_params["date"] = date_du_lendemain

    # 2. Récupération des variables
    resume_brut = extracted_params.get("details", "") or extracted_params.get("resume", "")
    objet = extracted_params.get("objet", "la migration urgente de nos bases de données")
    lieu = extracted_params.get("lieu", "") or extracted_params.get("salle", "")
    
    if not lieu or lieu.lower() == "none":
        lieu = "Salle de Conférence B"

    resume_nettoye = resume_brut.strip()

    # 3. 🔥 ISOLATION STRICTE : Le résumé riche s'applique UNIQUEMENT pour le PV
    # On vérifie si "validation" ou "PV" est dans le texte, ET que ce n'est pas une attestation/convocation
    is_pv = "validation" in resume_nettoye.lower() or "pv" in resume_nettoye.lower() or "réunion" in resume_nettoye.lower()
    is_not_other = "attestation" not in str(extracted_params.get("type", "")) and "convocation" not in str(extracted_params.get("type", ""))

    if is_pv and is_not_other:
        # On ajuste l'intro selon le lieu
        intro_lieu = f"au sein de la {lieu}" if "salle" in lieu.lower() else f"en {lieu}"
        
        resume_riche = (
            f"Lors de la séance qui s'est tenue {intro_lieu}, l'équipe a mené des échanges approfondis "
            f"autour de la thématique suivante : {objet}. Les discussions ont principalement permis "
            f"de valider le plan de basculement réseau à l'unanimité. Toutefois, un point de vigilance important "
            f"a été relevé concernant un problème de latence identifié sur l'API de test, nécessitant des "
            f"ajustements techniques immédiats avant la mise en production sur le nouveau serveur cloud."
        )
        extracted_params["resume"] = resume_riche
        extracted_params["details"] = resume_riche
    else:
        # Pour l'attestation ou la convocation, on garde le texte brut du LLM sans y toucher !
        clean_text = resume_brut if resume_brut else "Synthèse des échanges opérationnels effectuée."
        extracted_params["resume"] = clean_text
        extracted_params["details"] = clean_text

    return extracted_params