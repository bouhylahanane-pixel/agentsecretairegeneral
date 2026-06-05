"""
Routeur : arborescence des instances (Comités → Réunions).
GET  /api/instances — arborescence complète
POST /api/instances — créer un comité ou une réunion
"""
from fastapi import APIRouter, HTTPException

from data.instances_store import (
    add_committee,
    add_meeting_to_committee,
    get_instances_tree,
    delete_meeting_from_committee
)
from models.api_schemas import ComiteCreate, InstanceTreeResponse, ReunionSousComiteCreate

router = APIRouter(prefix="/api/instances", tags=["Instances"])


@router.get("", response_model=InstanceTreeResponse)
async def lire_arborescence_instances():
    """Retourne l'arborescence des comités et de leurs réunions."""
    return get_instances_tree()


@router.post("")
async def creer_instance(payload: dict):
    """
    Crée un comité (type=comite) ou une réunion sous un comité (type=reunion).
    Corps attendu :
    - Comité : {"type": "comite", "nom": "...", "description": "..."}
    - Réunion : {"type": "reunion", "committee_id": "...", "reunion": {...}}
    """
    type_entite = payload.get("type", "comite")

    if type_entite == "comite":
        modele = ComiteCreate(**{k: v for k, v in payload.items() if k in ("nom", "description", "membres")})
        comite = add_committee(modele.nom, modele.description, modele.membres)
        return {"message": "Comité créé avec succès", "comite": comite}

    if type_entite == "reunion":
        modele = ReunionSousComiteCreate(**payload)
        reunion = add_meeting_to_committee(
            modele.committee_id,
            modele.reunion.titre,
            modele.reunion.date,
            modele.reunion.heure,
            modele.reunion.lieu,
            modele.reunion.statut,
        )
        if reunion is None:
            raise HTTPException(status_code=404, detail="Comité introuvable")
        return {"message": "Réunion ajoutée au comité", "reunion": reunion}

    raise HTTPException(status_code=400, detail="Type invalide : utiliser 'comite' ou 'reunion'")

@router.delete("/{committee_id}/meetings/{meeting_id}")
async def supprimer_reunion(committee_id: str, meeting_id: str):
    """Supprime une réunion d'un comité."""
    success = delete_meeting_from_committee(committee_id, meeting_id)
    if not success:
        raise HTTPException(status_code=404, detail="Comité ou réunion introuvable")
    return {"message": "Réunion supprimée avec succès"}
