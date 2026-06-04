"""
Stockage en mémoire de l'arborescence Instances (Comités → Réunions).
Structure prête pour migration vers une table SQL dédiée.
"""
from __future__ import annotations

import copy
from datetime import datetime
from typing import Any
from uuid import uuid4

# État global modifiable — copie profonde à chaque lecture pour éviter les fuites
_instances_tree: dict[str, Any] = {
    "committees": [
        {
            "id": "com-audit",
            "nom": "Comité d'Audit & Conformité",
            "type": "comite",
            "description": "Supervision réglementaire et contrôles internes",
            "reunions": [
                {
                    "id": "reu-audit-1",
                    "titre": "Point trimestriel Loi 17-95",
                    "date": "2026-06-10",
                    "heure": "09:00",
                    "lieu": "Salle du Conseil",
                    "statut": "planifiee",
                }
            ],
        },
        {
            "id": "com-strategie",
            "nom": "Comité Stratégique Digital",
            "type": "comite",
            "description": "Pilotage transformation numérique du Secrétariat",
            "reunions": [
                {
                    "id": "reu-strat-1",
                    "titre": "Revue architecture IA & RAG",
                    "date": "2026-06-05",
                    "heure": "14:00",
                    "lieu": "Salle de Conférence A",
                    "statut": "planifiee",
                }
            ],
        },
    ],
    "meta": {
        "derniere_mise_a_jour": datetime.now().isoformat(),
        "version": 1,
    },
}


def _touch_meta() -> None:
    """Met à jour l'horodatage de dernière modification."""
    _instances_tree["meta"]["derniere_mise_a_jour"] = datetime.now().isoformat()


def get_instances_tree() -> dict[str, Any]:
    """Retourne une copie de l'arborescence complète."""
    return copy.deepcopy(_instances_tree)


def add_committee(nom: str, description: str = "") -> dict[str, Any]:
    """Crée un nouveau comité dans l'arborescence."""
    comite = {
        "id": f"com-{uuid4().hex[:8]}",
        "nom": nom.strip(),
        "type": "comite",
        "description": description.strip(),
        "reunions": [],
    }
    _instances_tree["committees"].append(comite)
    _touch_meta()
    return copy.deepcopy(comite)


def add_meeting_to_committee(
    committee_id: str,
    titre: str,
    date: str,
    heure: str = "10:00",
    lieu: str = "Salle de Réunion",
    statut: str = "planifiee",
) -> dict[str, Any] | None:
    """Ajoute une réunion sous un comité existant."""
    for comite in _instances_tree["committees"]:
        if comite["id"] == committee_id:
            reunion = {
                "id": f"reu-{uuid4().hex[:8]}",
                "titre": titre.strip(),
                "date": date,
                "heure": heure,
                "lieu": lieu.strip(),
                "statut": statut,
            }
            comite["reunions"].append(reunion)
            _touch_meta()
            return copy.deepcopy(reunion)
    return None


def find_committee(committee_id: str) -> dict[str, Any] | None:
    """Recherche un comité par identifiant."""
    for comite in _instances_tree["committees"]:
        if comite["id"] == committee_id:
            return copy.deepcopy(comite)
    return None
