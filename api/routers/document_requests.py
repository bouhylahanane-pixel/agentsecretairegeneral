import sqlite3
import re
from datetime import UTC, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.routers.auth import DB_PATH, get_current_user, require_roles
from api.routers.documents import GenerateDocumentRequest, generate_document_pdf
from services.llm_service import _appel_groq_json
from tools.history_manager import save_history

router = APIRouter(prefix="/api/document-requests", tags=["Document Requests"])

ALLOWED_STATUSES = {"pending", "in_progress", "ready", "delivered", "rejected"}
DOCUMENT_TYPES_BY_ROLE = {
    "employee": {"attestation_travail", "attestation_presence", "document_administratif"},
    "stagiaire": {"attestation_stage", "attestation_presence"},
    "secretaire": {
        "attestation_travail",
        "attestation_stage",
        "attestation_presence",
        "convocation_reunion",
        "convocation_entretien",
        "document_administratif",
    },
    "admin": {
        "attestation_travail",
        "attestation_stage",
        "attestation_presence",
        "convocation_reunion",
        "convocation_entretien",
        "document_administratif",
    },
}

STATUS_LOG_ACTIONS = {
    "in_progress": "DOCUMENT_REQUEST_IN_PROGRESS",
    "ready": "DOCUMENT_REQUEST_READY",
    "delivered": "DOCUMENT_REQUEST_DELIVERED",
    "rejected": "DOCUMENT_REQUEST_REJECTED",
}


class DocumentRequestCreate(BaseModel):
    document_type: str
    motif: Optional[str] = ""
    details: Optional[str] = ""


class DocumentRequestResponse(BaseModel):
    id: int
    requester_id: int
    requester_name: Optional[str] = None
    requester_email: Optional[str] = None
    requester_role: Optional[str] = None
    requester_poste: Optional[str] = None
    requester_departement: Optional[str] = None
    requester_date_recrutement: Optional[str] = None
    document_type: str
    motif: Optional[str] = None
    details: Optional[str] = None
    status: str
    secretary_comment: Optional[str] = None
    generated_file_path: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    processed_by: Optional[int] = None
    processed_at: Optional[str] = None
    ready_at: Optional[str] = None
    delivered_at: Optional[str] = None


class DocumentRequestStatusUpdate(BaseModel):
    status: str
    secretary_comment: Optional[str] = None


class DocumentRequestGeneratePayload(BaseModel):
    details_override: Optional[str] = None
    optimiser_ia: bool = False
    requester_name_override: Optional[str] = None
    requester_email_override: Optional[str] = None
    requester_role_override: Optional[str] = None
    poste_override: Optional[str] = None
    departement_override: Optional[str] = None
    date_recrutement_override: Optional[str] = None
    motif_override: Optional[str] = None


class DocumentRequestPrepareAiPayload(BaseModel):
    requester_name: Optional[str] = None
    requester_email: Optional[str] = None
    requester_role: Optional[str] = None
    poste: Optional[str] = None
    departement: Optional[str] = None
    date_recrutement: Optional[str] = None
    motif: Optional[str] = None
    details: Optional[str] = None


class DocumentRequestPrepareAiResponse(BaseModel):
    details: str
    moteur: str


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


def init_document_requests_table() -> None:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS document_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            requester_id INTEGER NOT NULL,
            requester_name TEXT,
            requester_email TEXT,
            requester_role TEXT,
            document_type TEXT NOT NULL,
            motif TEXT,
            details TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            secretary_comment TEXT,
            generated_file_path TEXT,
            created_at TEXT,
            updated_at TEXT,
            processed_by INTEGER,
            processed_at TEXT,
            ready_at TEXT,
            delivered_at TEXT
        )
        """
    )
    conn.commit()
    conn.close()


def get_connection() -> sqlite3.Connection:
    init_document_requests_table()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


DOCUMENT_REQUEST_SELECT = """
    SELECT
        document_requests.*,
        employes.poste AS requester_poste,
        employes.departement AS requester_departement,
        employes.date_recrutement AS requester_date_recrutement
    FROM document_requests
    LEFT JOIN employes ON employes.id = document_requests.requester_id
"""


def row_to_response(row: sqlite3.Row) -> DocumentRequestResponse:
    return DocumentRequestResponse(**dict(row))


def assert_allowed_document_type(role: str, document_type: str) -> None:
    if document_type not in DOCUMENT_TYPES_BY_ROLE.get(role, set()):
        raise HTTPException(status_code=403, detail="Type de document non autorisé pour votre rôle.")


def assert_valid_status(status: str) -> None:
    if status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail="Statut de demande invalide.")


def is_staff(user: dict) -> bool:
    return user.get("role") in {"admin", "secretaire"}


def full_name(user: dict) -> str:
    name = f"{user.get('prenom') or ''} {user.get('nom') or ''}".strip()
    return name or user.get("email") or "Utilisateur"


def log_document_request(user: dict, action: str, request_id: int) -> None:
    save_history(
        {
            "user": user.get("email", "system"),
            "action": f"{action}: #{request_id}",
            "priorite": "Normale",
            "temps_execution": 0,
        }
    )


def clean_text(value: Optional[str]) -> str:
    return (value or "").strip()


def role_label(role: Optional[str]) -> str:
    labels = {
        "employee": "salarié(e)",
        "stagiaire": "stagiaire",
        "secretaire": "membre du secrétariat",
        "admin": "administrateur",
    }
    return labels.get(clean_text(role).lower(), clean_text(role) or "bénéficiaire")


def document_label(document_type: str) -> str:
    labels = {
        "attestation_travail": "attestation de travail",
        "attestation_stage": "attestation de stage",
        "attestation_presence": "attestation de présence",
        "convocation_reunion": "convocation de réunion",
        "convocation_entretien": "convocation à un entretien",
        "document_administratif": "document administratif",
    }
    return labels.get(document_type, document_type.replace("_", " "))


def business_poste(value: Optional[str]) -> str:
    poste = clean_text(value)
    if poste.lower() in {"employee", "stagiaire", "secretaire", "admin"}:
        return ""
    return poste


def build_ai_document_context(row: sqlite3.Row, payload: DocumentRequestPrepareAiPayload) -> dict[str, str]:
    return {
        "document_type": row["document_type"],
        "document_label": document_label(row["document_type"]),
        "requester_name": clean_text(payload.requester_name) or clean_text(row["requester_name"]) or "Nom à confirmer",
        "requester_email": clean_text(payload.requester_email) or clean_text(row["requester_email"]),
        "requester_role": clean_text(payload.requester_role) or clean_text(row["requester_role"]),
        "poste": business_poste(payload.poste) or business_poste(row["requester_poste"]),
        "departement": clean_text(payload.departement) or clean_text(row["requester_departement"]),
        "date_recrutement": clean_text(payload.date_recrutement) or clean_text(row["requester_date_recrutement"]),
        "motif": clean_text(payload.motif) or clean_text(row["motif"]),
        "details": clean_text(payload.details) or clean_text(row["details"]),
    }


def fallback_document_preparation(context: dict[str, str]) -> str:
    nom = context["requester_name"]
    qualite = role_label(context["requester_role"])
    poste = context["poste"]
    departement = context["departement"]
    date_recrutement = context["date_recrutement"]
    motif = context["motif"]
    details = context["details"]

    pieces = [f"Le présent document est établi au nom de {nom}, identifié(e) comme {qualite}."]
    if poste:
        pieces.append(f"L'intéressé(e) occupe la fonction de {poste}.")
    if departement:
        pieces.append(f"Il/elle est rattaché(e) au département {departement}.")
    if date_recrutement:
        pieces.append(f"La date de recrutement enregistrée est le {date_recrutement}.")
    if motif:
        pieces.append(f"Le document est demandé pour le motif suivant : {motif}.")
    if details:
        pieces.append(f"Informations complémentaires à prendre en compte : {details}.")

    if context["document_type"] == "attestation_presence":
        return (
            f"Le Secrétariat Général atteste que {nom}, {qualite}"
            f"{f', occupant la fonction de {poste}' if poste else ''}"
            f"{f' au sein du département {departement}' if departement else ''}, "
            "est régulièrement identifié(e) dans les registres administratifs de l'organisation. "
            "Sa présence administrative est confirmée sur la base des éléments disponibles auprès du Secrétariat Général. "
            f"{f'Cette attestation est délivrée à sa demande pour le motif suivant : {motif}. ' if motif else ''}"
            f"{f'Observation à intégrer : {details}. ' if details else ''}"
            "Elle est délivrée pour servir et valoir ce que de droit."
        )

    return " ".join(pieces)


def sanitize_ai_document_text(text: str, context: dict[str, str]) -> str:
    nom = context["requester_name"]
    cleaned = text.replace("M. ou Mme ", "").replace("M ou Mme ", "")
    cleaned = re.sub(r"\b(M\.|Mme|Madame|Monsieur)\s+", "", cleaned)
    blocked_terms = [
        "bonheur",
        "félicitation",
        "félicitations",
        "souhaitons",
        "souhaite",
        "veuillez contacter",
        "pour tout complément",
        "ne sont pas disponibles",
        "n'est pas disponible",
        "non disponible",
    ]
    sentences = []
    for sentence in re.split(r"(?<=[.!?])\s+", cleaned.replace("\n", " ")):
        normalized = sentence.strip()
        if not normalized:
            continue
        if any(term in normalized.lower() for term in blocked_terms):
            continue
        sentences.append(normalized.rstrip(".!?"))

    result = ". ".join(sentences).strip()
    if result:
        return result + "."
    return fallback_document_preparation(context).replace("Nom à confirmer", nom)


def prepare_document_text_with_ai(context: dict[str, str]) -> DocumentRequestPrepareAiResponse:
    prompt = (
        "Tu es un assistant du Secrétariat Général. Rédige le corps d'un document administratif officiel "
        "en français, clair, naturel et institutionnel. N'ajoute pas d'en-tête, pas de signature, pas de date, "
        "pas de formule de politesse finale. Reste factuel et administratif : ne formule jamais de vœux, "
        "félicitations, appréciations personnelles ou phrases émotionnelles. Si le motif est personnel "
        "(mariage, visa, banque, CNSS, etc.), mentionne seulement des démarches administratives liées au motif. "
        "Ne mentionne jamais les champs absents ou indisponibles. "
        "Réponds uniquement avec un JSON strict au format "
        '{"details": "texte préparé"}.'
    )
    contenu = "\n".join(
        [
            f"Type de document: {context['document_label']}",
            f"Nom: {context['requester_name']}",
            f"Email: {context['requester_email'] or '-'}",
            f"Rôle: {role_label(context['requester_role'])}",
            f"Poste: {context['poste'] or '-'}",
            f"Département: {context['departement'] or '-'}",
            f"Date de recrutement: {context['date_recrutement'] or '-'}",
            f"Motif: {context['motif'] or '-'}",
            f"Informations déjà fournies: {context['details'] or '-'}",
        ]
    )

    resultat = _appel_groq_json(prompt, contenu, temperature=0.2)
    texte = clean_text(resultat.get("details") if resultat else None)
    if texte:
        return DocumentRequestPrepareAiResponse(
            details=sanitize_ai_document_text(texte, context),
            moteur="LLaMA-3.3-70b",
        )

    return DocumentRequestPrepareAiResponse(
        details=fallback_document_preparation(context),
        moteur="heuristique locale",
    )


def fetch_request_or_404(request_id: int) -> sqlite3.Row:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(f"{DOCUMENT_REQUEST_SELECT} WHERE document_requests.id = ?", (request_id,))
    row = cursor.fetchone()
    conn.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Demande de document introuvable.")
    return row


def fetch_requester_profile(requester_id: int) -> sqlite3.Row | None:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, nom, prenom, email, poste, departement, date_recrutement
        FROM employes
        WHERE id = ?
        """,
        (requester_id,),
    )
    row = cursor.fetchone()
    conn.close()
    return row


def assert_can_view(row: sqlite3.Row, user: dict) -> None:
    if is_staff(user):
        return
    if int(row["requester_id"]) != int(user["id"]):
        raise HTTPException(status_code=403, detail="Acces non autorise a cette demande.")


@router.post("", response_model=DocumentRequestResponse)
def create_document_request(
    payload: DocumentRequestCreate,
    current_user: dict = Depends(get_current_user),
):
    role = current_user.get("role", "employee")
    assert_allowed_document_type(role, payload.document_type)

    now = utc_now()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO document_requests (
            requester_id, requester_name, requester_email, requester_role,
            document_type, motif, details, status, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        """,
        (
            current_user["id"],
            full_name(current_user),
            current_user.get("email"),
            role,
            payload.document_type,
            payload.motif,
            payload.details,
            now,
            now,
        ),
    )
    request_id = cursor.lastrowid
    conn.commit()
    cursor.execute(f"{DOCUMENT_REQUEST_SELECT} WHERE document_requests.id = ?", (request_id,))
    row = cursor.fetchone()
    conn.close()

    log_document_request(current_user, "DOCUMENT_REQUEST_CREATED", request_id)
    return row_to_response(row)


@router.get("/me", response_model=list[DocumentRequestResponse])
def get_my_document_requests(current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        f"{DOCUMENT_REQUEST_SELECT} WHERE document_requests.requester_id = ? ORDER BY document_requests.id DESC",
        (current_user["id"],),
    )
    rows = cursor.fetchall()
    conn.close()
    return [row_to_response(row) for row in rows]


@router.get("", response_model=list[DocumentRequestResponse])
def get_all_document_requests(current_user: dict = Depends(require_roles(["admin", "secretaire"]))):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(f"{DOCUMENT_REQUEST_SELECT} ORDER BY document_requests.id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [row_to_response(row) for row in rows]


@router.get("/{request_id}", response_model=DocumentRequestResponse)
def get_document_request(request_id: int, current_user: dict = Depends(get_current_user)):
    row = fetch_request_or_404(request_id)
    assert_can_view(row, current_user)
    return row_to_response(row)


@router.patch("/{request_id}/status", response_model=DocumentRequestResponse)
def update_document_request_status(
    request_id: int,
    payload: DocumentRequestStatusUpdate,
    current_user: dict = Depends(require_roles(["admin", "secretaire"])),
):
    assert_valid_status(payload.status)

    now = utc_now()
    fields = ["status = ?", "updated_at = ?", "processed_by = ?", "processed_at = ?"]
    values: list[object] = [payload.status, now, current_user["id"], now]

    if payload.secretary_comment is not None:
        fields.append("secretary_comment = ?")
        values.append(payload.secretary_comment)
    if payload.status == "ready":
        fields.append("ready_at = ?")
        values.append(now)
    if payload.status == "delivered":
        fields.append("delivered_at = ?")
        values.append(now)

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM document_requests WHERE id = ?", (request_id,))
    existing_row = cursor.fetchone()
    if existing_row is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Demande de document introuvable.")
    if payload.status == "ready" and not existing_row["generated_file_path"]:
        conn.close()
        raise HTTPException(status_code=400, detail="Générez le PDF officiel avant de marquer la demande comme prête.")

    values.append(request_id)
    cursor.execute(f"UPDATE document_requests SET {', '.join(fields)} WHERE id = ?", values)
    conn.commit()
    cursor.execute(f"{DOCUMENT_REQUEST_SELECT} WHERE document_requests.id = ?", (request_id,))
    row = cursor.fetchone()
    conn.close()

    action = STATUS_LOG_ACTIONS.get(payload.status)
    if action:
        log_document_request(current_user, action, request_id)
    return row_to_response(row)


@router.post("/{request_id}/prepare-ai", response_model=DocumentRequestPrepareAiResponse)
def prepare_document_request_with_ai(
    request_id: int,
    payload: DocumentRequestPrepareAiPayload,
    current_user: dict = Depends(require_roles(["admin", "secretaire"])),
):
    row = fetch_request_or_404(request_id)
    if row["status"] == "rejected":
        raise HTTPException(status_code=400, detail="Impossible de préparer un document IA pour une demande refusée.")
    if row["status"] == "delivered":
        raise HTTPException(status_code=400, detail="La demande est déjà marquée comme récupérée.")

    assert_allowed_document_type(current_user.get("role", "employee"), row["document_type"])
    response = prepare_document_text_with_ai(build_ai_document_context(row, payload))
    log_document_request(current_user, "DOCUMENT_REQUEST_AI_PREPARED", request_id)
    return response


@router.post("/{request_id}/generate", response_model=DocumentRequestResponse)
def generate_document_from_request(
    request_id: int,
    payload: DocumentRequestGeneratePayload,
    current_user: dict = Depends(require_roles(["admin", "secretaire"])),
):
    row = fetch_request_or_404(request_id)
    if row["status"] == "rejected":
        raise HTTPException(status_code=400, detail="Impossible de générer un PDF pour une demande refusée.")

    assert_allowed_document_type(current_user.get("role", "employee"), row["document_type"])

    requester_profile = fetch_requester_profile(row["requester_id"])
    details = payload.details_override if payload.details_override is not None else (row["details"] or "")

    pdf_path = generate_document_pdf(
        GenerateDocumentRequest(
            type=row["document_type"],
            nom=payload.requester_name_override or row["requester_name"] or row["requester_email"] or "Utilisateur",
            details=details or "",
            optimiser_ia=payload.optimiser_ia,
            requester_email=payload.requester_email_override or row["requester_email"],
            requester_role=payload.requester_role_override or row["requester_role"],
            poste=business_poste(payload.poste_override) or business_poste(requester_profile["poste"] if requester_profile else None),
            departement=payload.departement_override or (requester_profile["departement"] if requester_profile else None),
            date_recrutement=payload.date_recrutement_override or (requester_profile["date_recrutement"] if requester_profile else None),
            motif=payload.motif_override or row["motif"],
        )
    )

    now = utc_now()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE document_requests
        SET generated_file_path = ?, status = 'ready', updated_at = ?,
            processed_by = ?, processed_at = ?, ready_at = ?
        WHERE id = ?
        """,
        (pdf_path, now, current_user["id"], now, now, request_id),
    )
    conn.commit()
    cursor.execute(f"{DOCUMENT_REQUEST_SELECT} WHERE document_requests.id = ?", (request_id,))
    updated = cursor.fetchone()
    conn.close()

    log_document_request(current_user, "DOCUMENT_REQUEST_GENERATED", request_id)
    log_document_request(current_user, "DOCUMENT_REQUEST_READY", request_id)
    return row_to_response(updated)
