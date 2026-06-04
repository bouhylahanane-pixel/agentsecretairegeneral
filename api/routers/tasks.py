"""
Routeur : extraction automatique de tâches (Qui / Quoi / Quand).
POST /api/tasks/extract
"""
from fastapi import APIRouter

from models.api_schemas import ExtractTasksRequest, ExtractTasksResponse, TacheExtraite
from services.llm_service import extraire_taches_reunion

router = APIRouter(prefix="/api/tasks", tags=["Extraction de tâches"])


@router.post("/extract", response_model=ExtractTasksResponse)
async def extraire_taches(requete: ExtractTasksRequest):
    """Extrait un plan d'actions structuré depuis un texte de réunion ou de PV."""
    resultat = extraire_taches_reunion(requete.texte_reunion)
    taches = [TacheExtraite(**t) for t in resultat["taches"]]
    return ExtractTasksResponse(
        taches=taches,
        synthese=resultat["synthese"],
        nombre_taches=resultat["nombre_taches"],
        moteur=resultat["moteur"],
    )
