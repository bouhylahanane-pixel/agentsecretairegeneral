"""
Routeur : moteur d'analyse IA des e-mails (LLaMA 3.3).
POST /api/analyze-email
"""
from fastapi import APIRouter

from models.api_schemas import AnalyzeEmailRequest, AnalyzeEmailResponse
from services.llm_service import analyser_email_brut
from tools.history_manager import save_history

router = APIRouter(prefix="/api", tags=["Analyse IA"])


@router.post("/analyze-email", response_model=AnalyzeEmailResponse)
async def analyser_email(requete: AnalyzeEmailRequest):
    """
    Analyse un e-mail brut et retourne classification + actions recommandées.
    """
    resultat = analyser_email_brut(
        requete.email_brut,
        expediteur=requete.expediteur,
        sujet=requete.sujet,
    )

    # Journalisation pour le tableau de bord analytics
    try:
        save_history({
            "user": "Système IA",
            "action": f"Analyse e-mail [{resultat['classification']}] : {requete.sujet or 'sans objet'}",
            "priorite": "Haute" if resultat["classification"] == "Urgent" else "Moyenne",
            "temps_execution": 850,
        })
    except Exception:
        pass

    return AnalyzeEmailResponse(**resultat)
