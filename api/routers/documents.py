from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.routers.auth import require_roles
from services.llm_service import _appel_groq_json
from tools.pdf_generator import (
    build_pdf,
    generate_attestation_presence_pdf,
    generate_attestation_stage_pdf,
    generate_attestation_travail_pdf,
    generate_convocation_entretien_pdf,
    generate_convocation_reunion_pdf,
)

router = APIRouter(prefix="/api/documents", tags=["documents"])


class GenerateDocumentRequest(BaseModel):
    type: str
    nom: str
    details: Optional[str] = ""
    optimiser_ia: bool = False
    requester_email: Optional[str] = None
    requester_role: Optional[str] = None
    poste: Optional[str] = None
    departement: Optional[str] = None
    date_recrutement: Optional[str] = None
    motif: Optional[str] = None


class GenerateDocumentResponse(BaseModel):
    pdf_path: str
    message: str


def normalize_document_type(doc_type: str) -> str:
    labels = {
        "Attestation de Travail": "attestation_travail",
        "Attestation de Stage": "attestation_stage",
        "Attestation de Presence": "attestation_presence",
        "Attestation de Présence": "attestation_presence",
        "Convocation de Reunion": "convocation_reunion",
        "Convocation de Réunion": "convocation_reunion",
        "Convocation Entretien": "convocation_entretien",
        "Document administratif": "document_administratif",
    }
    return labels.get(doc_type, doc_type)


def generate_document_pdf(requete: GenerateDocumentRequest) -> str:
    generators = {
        "attestation_stage": generate_attestation_stage_pdf,
        "attestation_travail": generate_attestation_travail_pdf,
        "attestation_presence": generate_attestation_presence_pdf,
        "convocation_reunion": generate_convocation_reunion_pdf,
        "convocation_entretien": generate_convocation_entretien_pdf,
    }

    doc_type = normalize_document_type(requete.type)
    if doc_type not in generators and doc_type != "document_administratif":
        raise HTTPException(status_code=400, detail=f"Type de document non supporte: {doc_type}")

    params = {
        "nom": requete.nom,
        "details": requete.details,
        "date": datetime.now().strftime("%d/%m/%Y"),
        "requester_email": requete.requester_email,
        "requester_role": requete.requester_role,
        "poste": requete.poste,
        "departement": requete.departement,
        "date_recrutement": requete.date_recrutement,
        "motif": requete.motif,
    }

    if requete.optimiser_ia and requete.details:
        prompt = (
            f"Tu es secretaire de direction. Redige un contenu professionnel pour un document de type '{doc_type}'. "
            "Ne mets pas de date d'en-tete ni de formule de politesse finale. "
            "Redige uniquement le corps du texte de maniere formelle et professionnelle. "
            "Retourne uniquement un JSON avec la cle 'details_optimises' contenant le texte formel."
        )
        try:
            donnees = _appel_groq_json(prompt, requete.details)
            if donnees and "details_optimises" in donnees:
                params["details"] = donnees["details_optimises"]
        except Exception as exc:
            print(f"Erreur optimisation IA document: {exc}")

    try:
        if doc_type == "document_administratif":
            nom = requete.nom.replace(" ", "_") if requete.nom else "utilisateur"
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"outputs/attestations/document_administratif_{nom}_{timestamp}.pdf"
            details_html = (
                params.get("details")
                or "Document administratif etabli a la demande de l'interesse."
            ).replace("\n", "<br/>")
            pdf_path = build_pdf(
                "DOCUMENT ADMINISTRATIF",
                f"<b>Beneficiaire :</b> {params['nom']}<br/><br/>{details_html}<br/><br/>Fait le <b>{params['date']}</b>",
                filename,
            )
        else:
            pdf_path = generators[doc_type](params)

        return pdf_path[2:] if pdf_path.startswith("./") else pdf_path
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la generation du PDF: {exc}")


@router.post("/generate", response_model=GenerateDocumentResponse)
async def generate_document(
    requete: GenerateDocumentRequest,
    current_user: dict = Depends(require_roles(["admin", "secretaire"])),
):
    pdf_path = generate_document_pdf(requete)
    return GenerateDocumentResponse(pdf_path=pdf_path, message="Document genere avec succes.")
