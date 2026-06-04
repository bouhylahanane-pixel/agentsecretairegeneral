"""
Routeur : générateur automatique de procès-verbaux.
POST /api/generate-minutes
"""
import json
import os
from datetime import datetime

from fastapi import APIRouter

from models.api_schemas import GenerateMinutesRequest, GenerateMinutesResponse
from services.llm_service import generer_pv_markdown
from tools.meeting import save_meeting_to_history
from tools.pdf_generator import generate_pv_pdf

router = APIRouter(prefix="/api", tags=["Procès-verbaux"])


@router.post("/generate-minutes", response_model=GenerateMinutesResponse)
async def generer_proces_verbal(requete: GenerateMinutesRequest):
    """
    Génère un PV structuré (Markdown + HTML) à partir de l'ordre du jour,
    des participants et des notes brutes.
    """
    resultat = generer_pv_markdown(
        ordre_du_jour=requete.ordre_du_jour,
        participants=requete.participants,
        notes_brutes=requete.notes_brutes,
        date_reunion=requete.date_reunion,
    )

    # Génération PDF optionnelle et archivage
    try:
        decisions_str = "<br/>".join(f"• {d}" for d in resultat.get("decisions", []))
        actions_str = "<br/>".join(f"• {a}" for a in resultat.get("actions", []))
        params_pdf = {
            "objet": requete.ordre_du_jour,
            "lieu": "Salle de Réunion",
            "participants": resultat["participants"],
            "details": requete.notes_brutes[:2000].replace("\n", "<br/>"),
            "decisions": decisions_str or "Aucune décision formalisée",
            "actions": actions_str or "Aucune action formalisée",
            "next_meeting": resultat.get("prochaine_reunion", "À définir"),
            "date": resultat["date"],
        }
        chemin_pdf = generate_pv_pdf(params_pdf)
        save_meeting_to_history(
            date=resultat["date"],
            participants=resultat["participants"],
            objet=requete.ordre_du_jour,
            details=requete.notes_brutes[:1500],
            decisions=json.dumps(resultat.get("decisions", []), ensure_ascii=False),
            actions=json.dumps(resultat.get("actions", []), ensure_ascii=False),
            next_meeting=resultat.get("prochaine_reunion", "À définir"),
            transcription=requete.notes_brutes,
            pdf_path=chemin_pdf,
        )
        resultat["pdf_path"] = chemin_pdf
    except Exception as exc:
        print(f"⚠️ Archivage PV : {exc}")

    # Sauvegarde Markdown locale
    nom_md = f"proces_verbal_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
    with open(nom_md, "w", encoding="utf-8") as f:
        f.write(resultat["pv_markdown"])
    resultat["nom_fichier_md"] = nom_md

    return GenerateMinutesResponse(
        date=resultat["date"],
        participants=resultat["participants"],
        pv_markdown=resultat["pv_markdown"],
        pv_html=resultat["pv_html"],
        decisions=resultat.get("decisions", []),
        actions=resultat.get("actions", []),
        prochaine_reunion=resultat.get("prochaine_reunion", "À définir"),
        moteur=resultat["moteur"],
        pdf_path=resultat.get("pdf_path"),
        nom_fichier_md=resultat.get("nom_fichier_md"),
    )
