import asyncio
import nest_asyncio

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


def executer_agent(message: str, user: str):

    # =========================
    # 🔥 DÉCISION IA
    # =========================

    decision = agent_decision(message)

    print("LLM RESULT:", decision)

    action = decision["action"]
    params = decision["parameters"]

    # =========================
    # 🔥 NORMALISATION
    # =========================

    # salle -> lieu
    if not params.get("lieu") and params.get("salle"):
        params["lieu"] = params["salle"]

    # lieu -> salle
    if not params.get("salle") and params.get("lieu"):
        params["salle"] = params["lieu"]

    # nom vide
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

        email_data = process_email(params["message"])

        action_data = email_data["action_data"]

        action = action_data["action"]
        params = action_data["parameters"]

    # =========================
    # 🔥 ACTION CREATE MEETING
    # =========================

    if action == "create_meeting":

        result = create_meeting(params)

        response = meeting_template(params)

    # =========================
    # 🔥 ACTION PROCÈS VERBAL
    # =========================

    elif action == "generate_pv":

        pv_result = generate_pv(params)

        result = pv_result["message"]

        filename = pv_result["file"]

        download_url = f"/download/{filename}"

        response = (
            "Le procès-verbal a été généré avec succès."
        )

        # 🔥 EMAIL AUTO
        try:

            if params.get("email"):

                send_email(
                    to_email=params.get("email"),
                    subject="Procès verbal réunion",
                    body="Veuillez trouver le procès-verbal ci-joint.",
                    attachment_path=filename
                )

                print("EMAIL PV ENVOYÉ")

        except Exception as e:

            print("ERREUR EMAIL PV :", e)

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

        response = "Salle réservée."

    # =========================
    # 🔥 ACTION ÉQUIPEMENT
    # =========================

    elif action == "check_equipment":

        result = check_equipment(params)

        response = "Équipement vérifié."

    # =========================
    # 🔥 ACTION DOCUMENTS
    # =========================

    elif action == "generate_document":

        doc_type = params.get("type")

        # =========================
        # 🔹 ATTESTATION STAGE
        # =========================

        if doc_type == "attestation_stage":

            filename = generate_attestation_stage_pdf(params)

            try:

                if params.get("email"):

                    send_email(
                        to_email=params.get("email"),
                        subject="Attestation de stage",
                        body="Veuillez trouver votre attestation ci-jointe.",
                        attachment_path=filename
                    )

                    print("EMAIL ATTESTATION STAGE ENVOYÉ")

            except Exception as e:

                print("ERREUR EMAIL :", e)

        # =========================
        # 🔹 ATTESTATION TRAVAIL
        # =========================

        elif doc_type == "attestation_travail":

            filename = generate_attestation_travail_pdf(params)

            try:

                if params.get("email"):

                    send_email(
                        to_email=params.get("email"),
                        subject="Attestation de travail",
                        body="Veuillez trouver votre attestation ci-jointe.",
                        attachment_path=filename
                    )

                    print("EMAIL ATTESTATION TRAVAIL ENVOYÉ")

            except Exception as e:

                print("ERREUR EMAIL :", e)

        # =========================
        # 🔹 ATTESTATION PRÉSENCE
        # =========================

        elif doc_type == "attestation_presence":

            filename = generate_attestation_presence_pdf(params)

            try:

                if params.get("email"):

                    send_email(
                        to_email=params.get("email"),
                        subject="Attestation de présence",
                        body="Veuillez trouver votre attestation ci-jointe.",
                        attachment_path=filename
                    )

                    print("EMAIL ATTESTATION PRÉSENCE ENVOYÉ")

            except Exception as e:

                print("ERREUR EMAIL :", e)

        # =========================
        # 🔹 CONVOCATION RÉUNION
        # =========================

        elif doc_type == "convocation_reunion":

            # 🔥 Sauvegarde réunion
            create_meeting(params)

            # 🔥 Génération PDF
            filename = generate_convocation_reunion_pdf(params)

            # 🔥 EMAIL AUTO
            try:

                if params.get("email"):

                    send_email(
                        to_email=params.get("email"),
                        subject="Convocation réunion",
                        body="Veuillez trouver la convocation ci-jointe.",
                        attachment_path=filename
                    )

                    print("EMAIL CONVOCATION ENVOYÉ")

            except Exception as e:

                print("ERREUR EMAIL :", e)

        # =========================
        # 🔹 CONVOCATION ENTRETIEN
        # =========================

        elif doc_type == "convocation_entretien":

            filename = generate_convocation_entretien_pdf(params)

            try:

                if params.get("email"):

                    send_email(
                        to_email=params.get("email"),
                        subject="Convocation entretien",
                        body="Veuillez trouver la convocation ci-jointe.",
                        attachment_path=filename
                    )

                    print("EMAIL ENTRETIEN ENVOYÉ")

            except Exception as e:

                print("ERREUR EMAIL :", e)

        else:

            filename = "document inconnu"

        result = f"PDF généré: {filename}"

        download_url = f"/download/{filename}"

        response = document_template(params)

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
        
    # =========================
    # 🔥 HISTORIQUE
    # =========================

    save_history({
        "user": user,
        "action": action,
        "parameters": params,
        "result": result,
        "download_url": download_url,
        "response": response
    })

    # =========================
    # 🔥 RETURN FINAL
    # =========================

    return {
    "user": user,
    "action": action,
    "parameters": params,
    "result": result,
    "download_url": download_url,
    "response": response,
    "audio_url": audio_url,

    "email": {
        "subject": "Réponse automatique",
        "body": response,
        "attachment": filename
    }
}