"""
Schémas Pydantic pour les nouvelles routes API (/api/*).
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# --- Arborescence Instances ---
class ReunionInstance(BaseModel):
    """Réunion rattachée à un comité."""
    titre: str = Field(..., min_length=2, description="Intitulé de la séance")
    date: str = Field(..., description="Date AAAA-MM-JJ")
    heure: str = Field(default="10:00")
    lieu: str = Field(default="Salle de Réunion")
    statut: str = Field(default="planifiee")


class ComiteCreate(BaseModel):
    """Création d'un comité dans l'arborescence."""
    nom: str = Field(..., min_length=2)
    description: str = Field(default="")


class ReunionSousComiteCreate(BaseModel):
    """Ajout d'une réunion sous un comité existant."""
    committee_id: str
    reunion: ReunionInstance


class InstanceTreeResponse(BaseModel):
    """Réponse GET de l'arborescence complète."""
    committees: list[dict]
    meta: dict


# --- Analyse e-mail ---
class AnalyzeEmailRequest(BaseModel):
    """Corps de la requête POST /api/analyze-email."""
    email_brut: str = Field(..., min_length=10, description="Contenu intégral de l'e-mail")
    expediteur: str | None = None
    sujet: str | None = None


class AnalyzeEmailResponse(BaseModel):
    """Résultat de classification LLaMA."""
    classification: Literal["Urgent", "Routine", "Légal"]
    score_confiance: float
    resume: str
    analyse_detaillee: str
    actions_recommandees: list[str]
    delai_reponse_suggere: str
    moteur: str


# --- Génération PV ---
class GenerateMinutesRequest(BaseModel):
    """Corps POST /api/generate-minutes."""
    ordre_du_jour: str = Field(..., min_length=3)
    participants: list[str] = Field(default_factory=list)
    notes_brutes: str = Field(..., min_length=10)
    date_reunion: str | None = None


class GenerateMinutesResponse(BaseModel):
    """PV généré en Markdown et HTML."""
    date: str
    participants: str
    pv_markdown: str
    pv_html: str
    decisions: list[str]
    actions: list[str]
    prochaine_reunion: str
    moteur: str
    pdf_path: str | None = None
    nom_fichier_md: str | None = None


# --- Extraction de tâches ---
class ExtractTasksRequest(BaseModel):
    """Corps POST /api/tasks/extract."""
    texte_reunion: str = Field(..., min_length=20)


class TacheExtraite(BaseModel):
    """Une ligne du plan d'action."""
    qui: str
    quoi: str
    quand: str
    priorite: str = "moyenne"


class ExtractTasksResponse(BaseModel):
    """Plan d'actions structuré."""
    taches: list[TacheExtraite]
    synthese: str
    nombre_taches: int
    moteur: str
