import requests
import json
import os
from dotenv import load_dotenv

load_dotenv() # Charge les variables du fichier .env
GROQ_API_KEY = os.getenv("GROQ_API_KEY")


# =========================
# 🔥 LLM CALL
# =========================
def call_llm(message: str):

    try:

        prompt = f"""
Tu es un assistant administratif.

Tu dois extraire les informations importantes du message.

Retourne UNIQUEMENT un JSON valide.

Format :

{{
  "action": "",
  "parameters": {{
    "type": "",
    "nom": "",
    "poste": "",
    "departement": "",
    "service": "",
    "entreprise": "",
    "encadrant": "",
    "recruteur": "",
    "date": "",
    "date_debut": "",
    "date_fin": "",
    "heure": "",
    "salle": "",
    "lieu": "",
    "objet": "",
    "participants": "",
    "details": ""
    ```python
    "decisions": "",
    "actions": "",
    "next_meeting": ""

  }}
}}

Règles :

- attestation stage -> type = attestation_stage
- attestation travail -> type = attestation_travail
- attestation présence -> type = attestation_presence
- convocation réunion -> type = convocation_reunion
- convocation entretien -> type = convocation_entretien
- procès verbal / pv / compte rendu -> action = generate_pv
- extraire également les adresses email
Si action = generate_pv :
extraire :
- objet
- participants
- resume
- decisions
- actions
- next_meeting
- date
- heure
- lieu

Extraire tous les champs possibles.

IMPORTANT :

Tu dois TOUJOURS retourner TOUS les champs.

Même si certains champs sont vides.

Exemple incorrect :

{{
  "type": "attestation_stage"
}}

Exemple correct :

{{
  "action": "generate_document",
  "parameters": {{
    "type": "attestation_stage",
    "nom": "Mohamed",
    "poste": "",
    "departement": "RH",
    "service": "",
    "entreprise": "TechCorp",
    "encadrant": "Mme Sara",
    "recruteur": "",
    "date": "",
    "date_debut": "2025-06-01",
    "date_fin": "2025-07-30",
    "heure": "",
    "salle": "",
    "lieu": "",
    "objet": "",
    "participants": "",
    "details": ""
    "email": ""

```

  }}
}}

Message :
{message}
"""

        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {
                        "role": "system",
                        "content": """
Tu es un extracteur JSON administratif.

Tu dois UNIQUEMENT retourner du JSON valide.

NE JAMAIS expliquer.
NE JAMAIS ajouter du texte.
NE JAMAIS oublier les champs.

Tu dois remplir TOUS les champs possibles.
Si action = generate_pv :
extraire :
- objet
- participants
- résumé
- date
- heure
- lieu
"""
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0
            }
        )

        result = response.json()

        print("\nGROQ RESPONSE:\n")
        print(result)

        if "choices" not in result:
            print("ERREUR API GROQ")
            return None

        content = result["choices"][0]["message"]["content"].strip()

        print("\nLLM RAW RESPONSE:\n")
        print(content)

        # 🔥 sécurisation JSON
    
# 🔥 nettoyage markdown
        content = content.replace("```json", "")
        content = content.replace("```", "")
        content = content.strip()

# 🔥 sécurisation JSON
        try:
            parsed = json.loads(content)

        except Exception as e:
            print("Erreur parsing JSON LLM:", e)
            print(content)
            return None


        # 🔥 sécurisation structure
        if "action" not in parsed:
            return None

        if "parameters" not in parsed:
            parsed["parameters"] = {}

        return parsed

    except Exception as e:
        print("Erreur LLM:", e)
        return None



# =========================
# 🧠 AGENT DECISION
# =========================

def agent_decision(message: str):
    
    print("\nMESSAGE USER:")
    print(message)

    msg = message.lower()
    


    
    # =========================
    # 🔥 LLM PRINCIPAL
    # =========================

    llm_result = call_llm(message)
    print("\nLLM RESULT:")
    print(llm_result)

    if llm_result:
        return llm_result
    
    print("\nFALLBACK ACTIVÉ")

    # =========================
    # 🔁 FALLBACK
    # =========================

    if "réunion" in msg or "rdv" in msg:

        return {
            "action": "create_meeting",
            "parameters": {
                "date": "demain",
                "heure": "14h",
                "lieu": "Salle A",
                "objet": "Réunion",
                "participants": ""
            }
        }

    if "attestation" in msg:

        return {
            "action": "generate_document",
            "parameters": {
                "type": "attestation_stage"
            }
        }

    return {
        "action": "unknown",
        "parameters": {}
    }