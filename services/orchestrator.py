import asyncio
import nest_asyncio
import time  # Pour mesurer précisément le temps de réponse
from datetime import datetime
import sqlite3

from dotenv import load_dotenv
load_dotenv()

nest_asyncio.apply()
from agent.brain import agent_decision

from tools.meeting import (
    create_meeting,
    generate_pv,
    send_convocation
)

from tools.logistics import (
    reserve_room,
    check_equipment
)

from tools.document import generate_document
from tools.history_manager import save_history
from tools.email_processor import process_email
from services.email_service import send_email

from templates.email_templates import (
    document_template,
    meeting_template,
    default_template
)

from tools.pdf_generator import (
    generate_attestation_stage_pdf,
    generate_attestation_travail_pdf,
    generate_attestation_presence_pdf,
    generate_convocation_reunion_pdf,
    generate_convocation_entretien_pdf,
    generate_pv_pdf
)
from services.voice_service import text_to_speech

from data.database_manager import DB_PATH

def executer_agent(message: str, user: str):
    # Démarrage du chronomètre pour les statistiques Analytics
    start_time = time.time()

    # =========================
    # 🔥 DÉCISION IA (Avec RAG SQL)
    # =========================
    decision = agent_decision(message)
    print("LLM RESULT ENRICHI :", decision)

    action = decision.get("action", "unknown")
    params = decision.get("parameters", {})

    # ==========================================================
    # 🎯 CORRECTION D'INTENTION : Planifier entretien -> Convocation
    # ==========================================================
    if "entretien" in message.lower() and action != "generate_document":
        action = "generate_document"
        params["type"] = "convocation_entretien"

    # Extraction automatique de l'urgence classifiée par l'IA
    priorite = params.get("priorite", "Normale")

    # =========================
    # 🔥 NORMALISATION
    # =========================
    # salle -> lieu
    if not params.get("lieu") and params.get("salle"):
        params["lieu"] = params["salle"]

    # lieu -> salle
    if not params.get("salle") and params.get("lieu"):
        params["salle"] = params["lieu"]

    # nom par défaut
    if not params.get("nom"):
        params["nom"] = "Utilisateur"

    response = ""
    result = ""
    download_url = ""
    filename = ""
    audio_url = ""

    # =========================
    # 🔥 EMAIL PIPELINE
    # =========================
    if action == "process_email":
        email_data = process_email(params.get("message", ""))
        action_data = email_data.get("action_data", {})
        action = action_data.get("action", "unknown")
        params = action_data.get("parameters", {})
        priorite = params.get("priorite", "Normale")

    # ===================================================================
    # 🌍 ZONE D'IDENTIFICATION GLOBALE AMÉLIORÉE (Employés vs Stagiaires)
    # ===================================================================
    nom_recherche = params.get("nom", "Utilisateur")
    
    # Valeurs de secours globales appliquées d'office
    params["poste"] = "Collaborateur"
    params["departement"] = "Opérations"
    params["date_debut"] = datetime.now().strftime("%d/%m/%Y")
    params["cin"] = "Non précisée"
    
    role_utilisateur = None # Contiendra "employe" ou "stagiaire"

    if nom_recherche and nom_recherche != "Utilisateur":
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # 🔍 RECHERCHE 1 : Dans la table des EMPLOYÉS
            cursor.execute(
                """SELECT * FROM employes 
                   WHERE LOWER(?) LIKE '%' || LOWER(nom) || '%' 
                   OR LOWER(?) LIKE '%' || LOWER(prenom) || '%'
                   OR LOWER(nom) LIKE ? 
                   OR LOWER(prenom) LIKE ?""", 
                (nom_recherche, nom_recherche, f"%{nom_recherche}%", f"%{nom_recherche}%")
            )
            row = cursor.fetchone()
            
            if row:
                role_utilisateur = "employe"
                print(f"🎉 Employé identifié avec succès globalement : {row['prenom']} {row['nom']}")
                params["nom"] = f"{row['prenom']} {row['nom']}"
                
                colonnes = [d[0] for d in cursor.description]
                if "poste" in colonnes and row["poste"]:
                    params["poste"] = row["poste"]
                if "cin" in colonnes and row["cin"]:
                    params["cin"] = row["cin"]
                if "email" in colonnes and row["email"]:
                    params["email"] = row["email"]
                if "departement" in colonnes and row["departement"]:
                    params["departement"] = row["departement"]
                if "date_recrutement" in colonnes and row["date_recrutement"]:
                    params["date_debut"] = row["date_recrutement"]
                elif "date_debut" in colonnes and row["date_debut"]:
                    params["date_debut"] = row["date_debut"]
            
            else:
                # 🔍 RECHERCHE 2 : Si pas trouvé, on cherche dans la table STAGIAIRES
                cursor.execute(
                    """SELECT * FROM stagiaires 
                       WHERE LOWER(?) LIKE '%' || LOWER(nom) || '%' 
                       OR LOWER(?) LIKE '%' || LOWER(prenom) || '%'
                       OR LOWER(nom) LIKE ? 
                       OR LOWER(prenom) LIKE ?""", 
                    (nom_recherche, nom_recherche, f"%{nom_recherche}%", f"%{nom_recherche}%")
                )
                row_stagiaire = cursor.fetchone()
                
                if row_stagiaire:
                    role_utilisateur = "stagiaire"
                    print(f"🎓 Stagiaire identifié avec succès globalement : {row_stagiaire['prenom']} {row_stagiaire['nom']}")
                    params["nom"] = f"{row_stagiaire['prenom']} {row_stagiaire['nom']}"
                    params["poste"] = "Stagiaire"
                    
                    colonnes_stg = [d[0] for d in cursor.description]
                    if "email" in colonnes_stg and row_stagiaire["email"]:
                        params["email"] = row_stagiaire["email"]
                    if "ecole_etudes" in colonnes_stg and row_stagiaire["ecole_etudes"]:
                        params["ecole_etudes"] = row_stagiaire["ecole_etudes"]
                    if "sujet_stage" in colonnes_stg and row_stagiaire["sujet_stage"]:
                        params["sujet_stage"] = row_stagiaire["sujet_stage"]
                    if "date_debut" in colonnes_stg and row_stagiaire["date_debut"]:
                        params["date_debut"] = row_stagiaire["date_debut"]
                    if "date_fin" in colonnes_stg and row_stagiaire["date_fin"]:
                        params["date_fin"] = row_stagiaire["date_fin"]
                        
            conn.close()
        except Exception as e:
            print("Erreur lors de l'identification globale SQL :", e)

    # ==========================================================
    # 🔒 CONTRÔLE ET SÉCURITÉ DES PERMISSIONS SUR LES DOCUMENTS
    # ==========================================================
    if action == "generate_document":
        doc_type = params.get("type")
        
        # RÈGLE 1 : Un stagiaire ne peut pas générer d'attestation de travail
        if doc_type == "attestation_travail" and role_utilisateur == "stagiaire":
            response = f"Désolé {params['nom']}. En tant que stagiaire, vous n'avez pas l'autorisation de générer une attestation de travail. Seules les attestations de stage vous sont accessibles."
            result = f"Accès refusé : Tentative de génération d'attestation de travail par le stagiaire {params['nom']}"
            print(f"🛑 {result}")
            # On court-circuite directement l'exécution pour empêcher la suite (PDF + Mail)
            return {"user": user, "action": action, "parameters": params, "result": result, "download_url": "", "response": response, "pdf_path": ""}

        # RÈGLE 2 : Un employé sous contrat ne peut pas générer d'attestation de stage
        if doc_type == "attestation_stage" and role_utilisateur == "employe":
            response = f"Désolé {params['nom']}. Vous êtes enregistré en tant qu'employé permanent. Vous ne pouvez pas générer une attestation de stage."
            result = f"Accès refusé : Tentative de génération d'attestation de stage par l'employé {params['nom']}"
            print(f"🛑 {result}")
            return {"user": user, "action": action, "parameters": params, "result": result, "download_url": "", "response": response, "pdf_path": ""}

    # ==========================================================
    # 📜 SÉCURITÉ RAG : CONSULTATION DU RÈGLEMENT INTÉRIEUR
    # ==========================================================
    if action == "consult_regulation":
        response = decision.get("rag_response", "Je n'ai pas trouvé d'information à ce sujet dans le règlement.")
        result = "Consultation du règlement intérieur réussie."

    # =========================
    # 📅 ACTION CREATE MEETING
    # =========================
    elif action == "create_meeting":
        presence_dispo = params.get("disponibilite")
        heure_reunion = params.get("heure")
        nom_employe = params.get("nom")
        conflit_horaire = False

        if presence_dispo and heure_reunion:
            try:
                heure_debut_travail, heure_fin_travail = presence_dispo.split("-")
                h_travail_start = float(heure_debut_travail.split(":")[0]) + float(heure_debut_travail.split(":")[1])/60
                h_travail_end = float(heure_fin_travail.split(":")[0]) + float(heure_fin_travail.split(":")[1])/60

                heure_reunion_propre = heure_reunion.replace("h", ":").strip()
                if ":" in heure_reunion_propre:
                    h_reunion = float(heure_reunion_propre.split(":")[0]) + float(heure_reunion_propre.split(":")[1])/60
                else:
                    h_reunion = float(heure_reunion_propre)

                if h_reunion < h_travail_start or h_reunion > h_travail_end:
                    conflit_horaire = True
            except Exception as e:
                print("Note: Échec de l'analyse automatique de l'heure de présence:", e)

        if conflit_horaire:
            result = f"Conflit de présence : {nom_employe} n'est pas dans ses heures de service ({presence_dispo}) pour ce créneau de {heure_reunion}."
            response = f"Attention, {nom_employe} ne travaille pas à cette heure-là. Ses horaires de disponibilité enregistrés sont : {presence_dispo}. Veuillez proposer un autre créneau."
        else:
            result = create_meeting(params)
            response = meeting_template(params)

    # ==========================================================
    # 📝 ACTION PROCÈS VERBAL (Depuis action principale)
    # ==========================================================
    elif action == "generate_pv":
        if not params.get("objet"): params["objet"] = "Suivi Hebdomadaire & Avancement PFE"
        if not params.get("lieu"): params["lieu"] = "Salle de Réunion Principale"
        if not params.get("participants"): params["participants"] = "Meryem, Équipe Technique, Encadrant"
        
        if not params.get("resume") or params["resume"] == "":
            params["resume"] = message

        if not params.get("decisions") or params["decisions"] == "":
            params["decisions"] = "Validation de la roadmap cloud et mise en place des audits de sécurité."
        if not params.get("actions") or params["actions"] == "": 
            params["actions"] = "Finaliser les scripts de sauvegarde SQL et configurer les clés de chiffrement."
        if not params.get("next_meeting"): 
            params["next_meeting"] = "Après-demain à 10h00"

        try:
            filename = generate_pv_pdf(params)
            result = f"PV généré avec succès: {filename}"
            download_url = f"/download/{filename}"
            
            response = (
                f"Le Procès-Verbal de la réunion a été rédigé et exporté en PDF.\n\n"
                f"**Sujet de la réunion :** {params['objet']}\n\n"
                f"**Participants :** {params['participants']}\n\n"
                f"**Résumé des échanges :** {params['resume']}\n\n"
                f"**Prochaine réunion planifiée :** {params['next_meeting']}"
            )

            if params.get("email"):
                sujet_mail = "Procès verbal de réunion"
                if priorite == "Haute":
                    sujet_mail = f"[URGENT 🚨] {sujet_mail}"

                send_email(
                    to_email=params.get("email"),
                    subject=sujet_mail,
                    body="Veuillez trouver le procès-verbal de réunion ci-joint.",
                    attachment_path=filename
                )
                print("EMAIL PV ENVOYÉ")
        except Exception as e_pv:
            print("ERREUR CRITIQUES GÉNÉRATION PV :", e_pv)
            result = "Échec de la génération du PDF du PV."
            response = "Une erreur est survenue lors de la création du PDF pour le PV."

    # =========================
    # 🔥 ACTION CONVOCATION
    # =========================
    elif action == "send_convocation":
        result = send_convocation(params)
        response = "Convocations envoyées."

    # =========================
    # 🔥 ACTION RÉSERVATION SALLE
    # =========================
    elif action == "reserve_room":
        result = reserve_room(params)
        response = "La salle requise a été réservée."

    # =========================
    # 🔥 ACTION ÉQUIPEMENT
    # =========================
    elif action == "check_equipment":
        result = check_equipment(params)
        response = "Les équipements nécessaires ont été validés."

    # ==========================================================
    # 🔥 ACTION GENERATE DOCUMENT (Tous les types unifiés)
    # ==========================================================
    elif action == "generate_document":
        doc_type = params.get("type")
        sujet_mail = "Votre document administratif"
        
        if priorite == "Haute":
            sujet_mail = f"[URGENT 🚨] {sujet_mail}"

        # ------------------------------------------------------
        # 🔹 [1] ATTESTATION STAGE (Dynamisée avec études/sujet)
        # ------------------------------------------------------
        if doc_type == "attestation_stage":
            params["entreprise"] = "Smart Automation Technologies"
            params["departement"] = "Data & Analytics"
            
            # Récupération dynamique de l'encadrant Souhaila Ben
            params["encadrant"] = "Souhaila Ben (Secrétaire Générale)"
            try:
                conn = sqlite3.connect(DB_PATH)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT prenom, nom FROM employes WHERE LOWER(poste) LIKE '%secrétaire%' LIMIT 1")
                sec_row = cursor.fetchone()
                if sec_row:
                    params["encadrant"] = f"{sec_row['prenom'].capitalize()} {sec_row['nom'].capitalize()} (Secrétaire Générale)"
                conn.close()
            except Exception as e_sec:
                print("Note: Impossible de récupérer la secrétaire en BDD.", e_sec)
            
            filename = generate_attestation_stage_pdf(params)
            
            response = (
                f"Bonjour {params['nom']},\n\n"
                f"Votre attestation de stage a été générée avec succès.\n\n"
                f"**Entreprise :** {params['entreprise']}\n"
                f"**Études suivies :** {params.get('ecole_etudes', 'Cursus Data')}\n"
                f"**Sujet du Stage :** {params.get('sujet_stage', 'Projet IA')}\n"
                f"**Encadrant :** {params['encadrant']}\n"
                f"**Période :** du {params.get('date_debut')} au {params.get('date_fin')}\n\n"
                f"Cordialement, Service Administratif"
            )
            result = f"PDF généré: {filename}"
            download_url = f"/download/{filename}"

        # ------------------------------------------------------
        # 🔹 [2] ATTESTATION TRAVAIL 
        # ------------------------------------------------------
        elif doc_type == "attestation_travail":
            filename = generate_attestation_travail_pdf(params)
            
            response = (
                f"Bonjour {params['nom']},\n\n"
                f"Votre attestation de travail a été générée avec succès.\n\n"
                f"**Poste actuel :** {params['poste']}\n\n"
                f"**Département :** {params['departement']}\n\n"
                f"**Lieu d'affectation :** Smart Automation Technologies Tanger\n\n"
                f"Cordialement, Le Secrétariat Général"
            )
            result = f"PDF généré: {filename}"
            download_url = f"/download/{filename}"

        # ------------------------------------------------------
        # 🔹 [3] ATTESTATION PRÉSENCE
        # ------------------------------------------------------
        elif doc_type == "attestation_presence":
            if not params.get("lieu"): params["lieu"] = "Bureaux Principaux de Tanger"
            if not params.get("date"): params["date"] = datetime.now().strftime("%d/%m/%Y")

            filename = generate_attestation_presence_pdf(params)
            
            response = (
                f"Bonjour {params['nom']},\n\n"
                f"Votre attestation de présence a été correctement générée.\n\n"
                f"**Lieu d'affectation :** {params['lieu']}\n\n"
                f"**Date constatée :** {params['date']}\n\n"
                f"Cordialement, Direction Administrative"
            )
            result = f"PDF généré: {filename}"
            download_url = f"/download/{filename}"

        # ------------------------------------------------------
        # 🔹 [4] CONVOCATION RÉUNION
        # ------------------------------------------------------
        elif doc_type == "convocation_reunion":
            if not params.get("heure"): params["heure"] = "10:00"
            if not params.get("lieu"): params["lieu"] = "Salle de Conférence A"
            if not params.get("objet"): params["objet"] = "Réalignement de Projet Technique"
            if not params.get("participants"): params["participants"] = "Équipe Technique & Data"
            if not params.get("date"): params["date"] = datetime.now().strftime("%d/%m/%Y")

            create_meeting(params)
            filename = generate_convocation_reunion_pdf(params)
            
            response = (
                f"La convocation officielle à la réunion a été générée avec succès.\n\n"
                f"**Objet de la réunion :** {params['objet']}\n\n"
                f"**Date et Heure :** Le {params['date']} à {params['heure']}\n\n"
                f"**Lieu / Salle :** {params['lieu']}\n\n"
                f"**Membres convoqués :** {params['participants']}"
            )
            result = f"PDF généré: {filename}"
            download_url = f"/download/{filename}"

        # ------------------------------------------------------
        # 🔹 [5] CONVOCATION ENTRETIEN
        # ------------------------------------------------------
        elif doc_type == "convocation_entretien":
            if not params.get("entreprise"): params["entreprise"] = "InnovData & Analytics Corp"
            if params["poste"] == "Collaborateur": params["poste"] = "Data Analyst"
            if not params.get("recruteur"): params["recruteur"] = "Meryem (Responsable Technique)"
            if not params.get("date"): params["date"] = "Demain"
            if not params.get("heure"): params["heure"] = "15h00"
            if not params.get("salle"): params["salle"] = "Salle d'Entretien Alpha"
            
            params["lieu"] = params["salle"]
                
            filename = generate_convocation_entretien_pdf(params)
            
            response = (
                f"Bonjour {params['nom']},\n\n"
                f"Votre convocation pour l'entretien d'embauche a été générée avec succès.\n\n"
                f"**Poste visé :** {params['poste']}\n"
                f"**Date :** {params['date']} à {params['heure']}\n"
                f"**Lieu :** {params['salle']}\n"
                f"**Recruteur principal :** {params['recruteur']}\n\n"
                f"Cordialement,\nService des Ressources Humaines"
            )
            result = f"PDF généré: {filename}"
            download_url = f"/download/{filename}"

        else:
            filename = "document_inconnu"
            response = default_template()

        # Envoi d'email automatique global unifié
        try:
            if params.get("email"):
                send_email(
                    to_email=params.get("email"),
                    subject=sujet_mail,
                    body=f"Veuillez trouver la pièce jointe correspondant à votre demande ({doc_type}).",
                    attachment_path=filename
                )
                print(f"EMAIL {doc_type.upper()} TRANSMIS")
        except Exception as e:
            print(f"ERREUR EMAIL SUR {doc_type} :", e)

    # =========================
    # 🔥 ACTION INCONNUE
    # =========================
    else:
        result = "Action non reconnue"
        response = default_template()

    # =========================
    # 🔥 GÉNÉRATION AUDIO IA
    # =========================
    try:
        audio_path = text_to_speech(response)
        audio_url = f"/download/{audio_path}"
    except Exception as e:
        import traceback
        print("ERREUR AUDIO :")
        traceback.print_exc()
        audio_url = ""
        
    execution_time_ms = int((time.time() - start_time) * 1000)

    # =========================
    # 🔥 HISTORIQUE
    # =========================
    save_history({
        "user": user,
        "action": action,
        "parameters": params,
        "priorite": priorite,
        "temps_execution": execution_time_ms,
        "result": result,
        "download_url": download_url,
        "response": response
    })

    return {
        "user": user,
        "action": action,
        "parameters": params,
        "result": result,
        "download_url": download_url,
        "response": response,
        "pdf_path": filename,
        "audio_url": audio_url,
        "email": {
            "subject": "Réponse automatique de l'Agent",
            "body": response,
            "attachment": filename
        }
    }


if __name__ == "__main__":
    print("🛰️ Mode Test Réel - Sécurité & Droits d'Accès...")
    
    # 🧪 TEST 1 : Doit fonctionner (Meryem est stagiaire et demande son attestation de stage)
    resultat = executer_agent(
        message="Bonjour, je suis Meryem El khoumri. Pouvez-vous me générer mon attestation de stage s'il vous plaît ?", 
        user="Meryem_Direct"
    )
    print("\n🏁 Réponse finale Test 1 :", resultat["response"])
    print("-" * 50)

    # 🧪 TEST 2 : Doit être bloqué par la sécurité (Meryem est stagiaire et demande une attestation de travail)
    resultat_fraude = executer_agent(
        message="Bonjour, je suis Meryem El khoumri. J'ai besoin d'une attestation de travail immédiatement.", 
        user="Meryem_Direct"
    )
    print("\n🏁 Réponse finale Test 2 :", resultat_fraude["response"])