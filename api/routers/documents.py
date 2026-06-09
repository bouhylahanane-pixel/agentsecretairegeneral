from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
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
from tools.notification_service import send_pdf_attachment_email

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
    entreprise: Optional[str] = None
    service: Optional[str] = None
    encadrant: Optional[str] = None
    date_debut: Optional[str] = None
    date_fin: Optional[str] = None
    heure: Optional[str] = None
    lieu: Optional[str] = None
    objet: Optional[str] = None
    participants: Optional[str] = None
    recruteur: Optional[str] = None
    salle: Optional[str] = None


class GenerateDocumentResponse(BaseModel):
    pdf_path: str
    message: str


class DocumentUser(BaseModel):
    user_type: str
    nom: str
    email: str
    poste: Optional[str] = None
    departement: Optional[str] = None
    date_recrutement: Optional[str] = None
    date_debut: Optional[str] = None
    date_fin: Optional[str] = None
    ecole_etudes: Optional[str] = None
    sujet_stage: Optional[str] = None


@router.get("/users", response_model=list[DocumentUser])
def get_users_for_documents(current_user: dict = Depends(require_roles(["admin", "secretaire", "employee"]))):
    import sqlite3
    from api.routers.auth import DB_PATH
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    users = []
    
    # Get employees
    cursor.execute("SELECT nom, prenom, email, poste, departement, date_recrutement FROM employes WHERE poste != 'stagiaire'")
    for row in cursor.fetchall():
        nom_complet = f"{row['prenom']} {row['nom']}" if row['prenom'] else row['nom']
        users.append(DocumentUser(
            user_type="employee",
            nom=nom_complet,
            email=row["email"],
            poste=row["poste"],
            departement=row["departement"],
            date_recrutement=row["date_recrutement"]
        ))
        
    # Get stagiaires
    cursor.execute("SELECT nom, prenom, email, date_debut, date_fin, ecole_etudes, sujet_stage FROM stagiaires")
    for row in cursor.fetchall():
        nom_complet = f"{row['prenom']} {row['nom']}" if row['prenom'] else row['nom']
        users.append(DocumentUser(
            user_type="stagiaire",
            nom=nom_complet,
            email=row["email"],
            date_debut=row["date_debut"],
            date_fin=row["date_fin"],
            ecole_etudes=row["ecole_etudes"],
            sujet_stage=row["sujet_stage"]
        ))
        
    conn.close()
    return users


class SendEmailRequest(BaseModel):
    email: str
    nom: str
    type: str
    pdf_path: str


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
        "entreprise": requete.entreprise,
        "service": requete.service,
        "encadrant": requete.encadrant,
        "date_debut": requete.date_debut,
        "date_fin": requete.date_fin,
        "heure": requete.heure,
        "lieu": requete.lieu,
        "objet": requete.objet,
        "participants": requete.participants,
        "recruteur": requete.recruteur,
        "salle": requete.salle,
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
    current_user: dict = Depends(require_roles(["admin", "secretaire", "employee"])),
):
    pdf_path = generate_document_pdf(requete)
    return GenerateDocumentResponse(pdf_path=pdf_path, message="Document genere avec succes.")


@router.post("/send-email")
async def send_email_route(
    payload: SendEmailRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_roles(["admin", "secretaire", "employee"])),
):
    import os
    doc_type = normalize_document_type(payload.type)
    doc_label = doc_type.replace("_", " ").title()
    
    # Ensure PDF path starts with outputs/
    if not payload.pdf_path.startswith("outputs/"):
        raise HTTPException(status_code=400, detail="Chemin du fichier invalide.")
        
    full_path = os.path.join(".", payload.pdf_path)
    
    background_tasks.add_task(
        send_pdf_attachment_email,
        payload.email,
        payload.nom,
        doc_label,
        full_path
    )
    
    return {"message": "Envoi de l'email planifié avec succès."}
