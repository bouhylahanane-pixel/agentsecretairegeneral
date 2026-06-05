from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from tools.pdf_generator import (
    generate_attestation_stage_pdf,
    generate_attestation_travail_pdf,
    generate_attestation_presence_pdf,
    generate_convocation_reunion_pdf,
    generate_convocation_entretien_pdf,
)
from services.llm_service import _appel_groq_json
from datetime import datetime
import os

router = APIRouter(prefix="/api/documents", tags=["documents"])

class GenerateDocumentRequest(BaseModel):
    type: str
    nom: str
    details: Optional[str] = ""
    optimiser_ia: bool = False

class GenerateDocumentResponse(BaseModel):
    pdf_path: str
    message: str

@router.post("/generate", response_model=GenerateDocumentResponse)
async def generate_document(requete: GenerateDocumentRequest):
    # Mapping des fonctions
    generators = {
        "attestation_stage": generate_attestation_stage_pdf,
        "attestation_travail": generate_attestation_travail_pdf,
        "attestation_presence": generate_attestation_presence_pdf,
        "convocation_reunion": generate_convocation_reunion_pdf,
        "convocation_entretien": generate_convocation_entretien_pdf,
    }

    # Accepter certains formats venant du frontend
    doc_type = requete.type
    if doc_type == "Attestation de Travail":
        doc_type = "attestation_travail"
    elif doc_type == "Attestation de Stage":
        doc_type = "attestation_stage"
    elif doc_type == "Attestation de Présence":
        doc_type = "attestation_presence"
    elif doc_type == "Convocation de Réunion":
        doc_type = "convocation_reunion"
    elif doc_type == "Convocation Entretien":
        doc_type = "convocation_entretien"

    if doc_type not in generators:
        raise HTTPException(status_code=400, detail=f"Type de document non supporté: {doc_type}")

    params = {
        "nom": requete.nom,
        "details": requete.details,
        "date": datetime.now().strftime("%d/%m/%Y")
    }

    if requete.optimiser_ia and requete.details:
        prompt = (
            f"Tu es secrétaire de direction. Rédige un contenu professionnel pour un document de type '{doc_type}'. "
            "Ne mets pas de date d'en-tête ni de formule de politesse finale (celles-ci sont gérées par le modèle PDF). "
            "Rédige uniquement le corps du texte de manière formelle et professionnelle. "
            "Retourne uniquement un JSON avec la clé 'details_optimises' contenant le texte formel."
        )
        try:
            donnees = _appel_groq_json(prompt, requete.details)
            if donnees and "details_optimises" in donnees:
                params["details"] = donnees["details_optimises"]
        except Exception as e:
            print(f"Erreur optimisation IA document: {e}")

    try:
        pdf_path = generators[doc_type](params)
        # S'assurer que le chemin commence bien correctement pour le frontend
        if pdf_path.startswith("./"):
            pdf_path = pdf_path[2:]
        return GenerateDocumentResponse(pdf_path=pdf_path, message="Document généré avec succès.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la génération du PDF: {str(e)}")
