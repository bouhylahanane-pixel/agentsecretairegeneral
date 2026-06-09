"""
Service centralisé d'appels LLM (Groq / LLaMA 3.3) avec repli heuristique local.
"""
from __future__ import annotations

import json
import os
import re
from datetime import datetime
from typing import Any

import requests

GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"
MODELE_LLAMA = "llama-3.3-70b-versatile"


def _appel_groq_json(prompt_systeme: str, contenu_utilisateur: str, temperature: float = 0.15) -> dict[str, Any] | None:
    """Appelle l'API Groq et parse la réponse JSON. Retourne None si indisponible."""
    if not os.environ.get("GROQ_API_KEY"):
        return None
    headers = {"Authorization": f"Bearer {os.environ.get("GROQ_API_KEY")}", "Content-Type": "application/json"}
    payload = {
        "model": MODELE_LLAMA,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": prompt_systeme},
            {"role": "user", "content": contenu_utilisateur},
        ],
        "temperature": temperature,
    }
    try:
        reponse = requests.post(GROQ_CHAT_URL, headers=headers, json=payload, timeout=120)
        if reponse.status_code == 200:
            texte = reponse.json()["choices"][0]["message"]["content"]
            return json.loads(texte)
    except Exception as exc:
        print(f"⚠️ Erreur Groq LLM : {exc}")
    return None

def transcrire_audio(file_bytes: bytes, filename: str) -> str | None:
    """Utilise l'API Whisper de Groq pour transcrire un fichier audio."""
    if not os.environ.get("GROQ_API_KEY"):
        return None
        
    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {"Authorization": f"Bearer {os.environ.get("GROQ_API_KEY")}"}
    files = {
        "file": (filename, file_bytes, "audio/webm")
    }
    data = {
        "model": "whisper-large-v3-turbo",
        "language": "fr",
        "response_format": "json"
    }
    
    try:
        reponse = requests.post(url, headers=headers, files=files, data=data, timeout=60)
        if reponse.status_code == 200:
            return reponse.json().get("text", "").strip()
        else:
            print(f"⚠️ Erreur Transcription Groq : {reponse.text}")
    except Exception as exc:
        print(f"⚠️ Erreur API Whisper : {exc}")
    return None


def analyser_email_brut(
    email_brut: str,
    expediteur: str | None = None,
    sujet: str | None = None,
) -> dict[str, Any]:
    """
    Classifie un e-mail (Urgent, Routine, Légal) et propose des actions.
    Utilise LLaMA 3.3 si la clé API est configurée, sinon simulation locale.
    """
    prompt = (
        "Tu es l'assistant du Secrétariat Général. Analyse l'e-mail et réponds en JSON strict :\n"
        "{\n"
        '  "classification": "Urgent" | "Routine" | "Légal",\n'
        '  "score_confiance": 0.0 à 1.0,\n'
        '  "resume": "synthèse en 2 phrases",\n'
        '  "analyse_detaillee": "rapport détaillé pour le secrétaire",\n'
        '  "actions_recommandees": ["action 1", "action 2"],\n'
        '  "delai_reponse_suggere": "immédiat" | "48h" | "hebdomadaire"\n'
        "}"
    )
    entete = f"Expéditeur: {expediteur or 'inconnu'}\nSujet: {sujet or 'sans objet'}\n\n"
    resultat_llm = _appel_groq_json(prompt, entete + email_brut)

    if resultat_llm:
        classification = resultat_llm.get("classification", "Routine")
        return {
            "classification": classification,
            "score_confiance": float(resultat_llm.get("score_confiance", 0.85)),
            "resume": resultat_llm.get("resume", ""),
            "analyse_detaillee": resultat_llm.get("analyse_detaillee", ""),
            "actions_recommandees": resultat_llm.get("actions_recommandees", []),
            "delai_reponse_suggere": resultat_llm.get("delai_reponse_suggere", "48h"),
            "moteur": "LLaMA-3.3-70b",
        }

    # --- Repli heuristique (sans clé API) ---
    texte = (email_brut + " " + (sujet or "")).lower()
    if any(m in texte for m in ["loi", "juridique", "conformité", "statutaire", "17-95", "légal"]):
        classification = "Légal"
        actions = [
            "Inscrire le point au prochain Conseil d'Administration",
            "Transmettre au service juridique pour avis",
        ]
        delai = "immédiat"
    elif any(m in texte for m in ["urgent", "audit", "obligation", "sous 15 jours", "impératif"]):
        classification = "Urgent"
        actions = [
            "Alerter la Secrétaire Générale (Meryem)",
            "Constituer le dossier de réponse sous 48h",
        ]
        delai = "immédiat"
    else:
        classification = "Routine"
        actions = [
            "Transférer au service concerné pour traitement standard",
            "Reporter au point de coordination hebdomadaire",
        ]
        delai = "hebdomadaire"

    return {
        "classification": classification,
        "score_confiance": 0.72,
        "resume": f"E-mail classé comme {classification} par analyse heuristique locale.",
        "analyse_detaillee": (
            f"Analyse automatique (mode hors-ligne) : le message de « {expediteur or 'expéditeur inconnu'} » "
            f"concernant « {sujet or 'sans objet'} » relève d'une priorité {classification}. "
            "Recommandation : valider avec le moteur LLaMA en configurant GROQ_API_KEY."
        ),
        "actions_recommandees": actions,
        "delai_reponse_suggere": delai,
        "moteur": "heuristique-local",
    }


def generer_pv_markdown(
    ordre_du_jour: str,
    participants: list[str],
    notes_brutes: str,
    date_reunion: str | None = None,
) -> dict[str, Any]:
    """Génère un procès-verbal structuré (Markdown + HTML) à partir des notes."""
    date_finale = date_reunion or datetime.now().strftime("%Y-%m-%d")
    liste_participants = ", ".join(participants) if participants else "À compléter"

    prompt = (
        "Tu es secrétaire de direction. À partir des notes, produis un JSON :\n"
        "{\n"
        '  "objet": "titre de la réunion",\n'
        '  "synthese": "paragraphe de synthèse",\n'
        '  "decisions": ["décision 1"],\n'
        '  "actions": ["Qui — Quoi — Quand"],\n'
        '  "prochaine_reunion": "date ou À définir"\n'
        "}"
    )
    entree = f"Ordre du jour: {ordre_du_jour}\nParticipants: {liste_participants}\nNotes:\n{notes_brutes}"
    donnees = _appel_groq_json(prompt, entree)

    if not donnees:
        decisions = re.findall(r"(?:décision|decision)\s*[:\-]?\s*(.+)", notes_brutes, re.I)
        if not decisions:
            decisions = ["Validation du plan d'action proposé en séance"]
        actions = re.findall(r"(?:action|tâche)\s*[:\-]?\s*(.+)", notes_brutes, re.I)
        if not actions:
            actions = ["Meryem — Finaliser le compte-rendu — sous 48h"]
        donnees = {
            "objet": ordre_du_jour or "Réunion du Secrétariat Général",
            "synthese": notes_brutes[:800] if notes_brutes else "Aucune note fournie.",
            "decisions": decisions[:5],
            "actions": actions[:5],
            "prochaine_reunion": "À définir",
        }

    markdown = f"""# 📝 PROCÈS-VERBAL DE RÉUNION

**Date :** {date_finale}  
**Participants :** {liste_participants}

---

## 🎯 1. Ordre du jour

{donnees.get('objet', ordre_du_jour)}

## 💬 2. Synthèse des échanges

{donnees.get('synthese', '')}

## 📌 3. Décisions retenues

"""
    for d in donnees.get("decisions", []):
        markdown += f"- {d}\n"

    markdown += "\n## 📅 4. Plan d'action (Qui — Quoi — Quand)\n\n"
    for a in donnees.get("actions", []):
        markdown += f"- {a}\n"

    markdown += f"\n**Prochaine échéance :** {donnees.get('prochaine_reunion', 'À définir')}\n"

    html = (
        "<!DOCTYPE html><html lang='fr'><head><meta charset='utf-8'>"
        "<title>Procès-Verbal</title>"
        "<style>body{font-family:Georgia,serif;max-width:800px;margin:2rem auto;"
        "line-height:1.6;color:#1e293b}h1{color:#4338ca}h2{border-bottom:1px solid #e2e8f0}"
        "ul{margin:0.5rem 0}</style></head><body>"
        + markdown.replace("# ", "<h1>").replace("## ", "<h2>").replace("\n- ", "<li>")
        + "</body></html>"
    )

    return {
        "date": date_finale,
        "participants": liste_participants,
        "pv_markdown": markdown,
        "pv_html": html,
        "decisions": donnees.get("decisions", []),
        "actions": donnees.get("actions", []),
        "prochaine_reunion": donnees.get("prochaine_reunion", "À définir"),
        "moteur": "LLaMA-3.3-70b" if os.environ.get("GROQ_API_KEY") else "heuristique-local",
    }


def extraire_taches_reunion(texte_reunion: str) -> dict[str, Any]:
    """Extrait un plan d'actions structuré (Qui / Quoi / Quand) depuis un texte de réunion."""
    prompt = (
        "Extrais les tâches de réunion en JSON :\n"
        "{\n"
        '  "taches": [\n'
        '    {"qui": "nom", "quoi": "description", "quand": "échéance", "priorite": "haute|moyenne|basse"}\n'
        "  ],\n"
        '  "synthese": "phrase récapitulative"\n'
        "}"
    )
    donnees = _appel_groq_json(prompt, texte_reunion)

    if donnees and "taches" in donnees:
        return {
            "taches": donnees["taches"],
            "synthese": donnees.get("synthese", ""),
            "nombre_taches": len(donnees["taches"]),
            "moteur": "LLaMA-3.3-70b",
        }

    # Repli : détection de lignes type "Nom — action — date"
    taches = []
    for ligne in texte_reunion.splitlines():
        ligne = ligne.strip()
        if not ligne or len(ligne) < 10:
            continue
        if "—" in ligne or " - " in ligne:
            parties = re.split(r"\s*[—\-]\s*", ligne, maxsplit=2)
            if len(parties) >= 2:
                taches.append({
                    "qui": parties[0].strip(),
                    "quoi": parties[1].strip(),
                    "quand": parties[2].strip() if len(parties) > 2 else "À définir",
                    "priorite": "moyenne",
                })
    if not taches:
        taches = [
            {
                "qui": "Meryem",
                "quoi": "Consolider le compte-rendu et diffuser le PV",
                "quand": "sous 48h",
                "priorite": "haute",
            }
        ]

    return {
        "taches": taches,
        "synthese": f"{len(taches)} tâche(s) identifiée(s) dans le compte-rendu.",
        "nombre_taches": len(taches),
        "moteur": "heuristique-local",
    }
