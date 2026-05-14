# =========================
# 📄 DOCUMENT TEMPLATE
# =========================

def document_template(params):

    doc_type = params.get("type", "")

    nom = params.get("nom", "Utilisateur")

    # 🔹 ATTESTATION STAGE
    if doc_type == "attestation_stage":

        return f"""
Bonjour {nom},

Votre attestation de stage a été générée avec succès.

Entreprise :
{params.get("entreprise", "-")}

Département :
{params.get("departement", params.get("service", "-"))}

Encadrant :
{params.get("encadrant", "-")}

Période :
{params.get("date_debut", "-")} → {params.get("date_fin", "-")}

Cordialement,
Service Administratif
"""

    # 🔹 ATTESTATION TRAVAIL
    elif doc_type == "attestation_travail":

        return f"""
Bonjour {nom},

Votre attestation de travail a été générée.

Poste :
{params.get("poste", "-")}

Département :
{params.get("departement", "-")}

Date début :
{params.get("date_debut", "-")}

Cordialement,
Service RH
"""

    # 🔹 ATTESTATION PRÉSENCE
    elif doc_type == "attestation_presence":

        return f"""
Bonjour {nom},

Votre attestation de présence a été générée.

Date :
{params.get("date", "-")}

Lieu :
{params.get("lieu", "-")}

Cordialement,
Administration
"""

    # 🔹 CONVOCATION RÉUNION
    elif doc_type == "convocation_reunion":

        return f"""
Bonjour {nom},

Votre convocation de réunion a été préparée.

Sujet :
{params.get("objet", "-")}

Lieu :
{params.get("lieu", "-")}

Heure :
{params.get("heure", "-")}

Participants :
{params.get("participants", "-")}

Cordialement,
Direction
"""

    # 🔹 CONVOCATION ENTRETIEN
    elif doc_type == "convocation_entretien":

        return f"""
Bonjour {nom},

Votre convocation d'entretien a été générée.

Poste :
{params.get("poste", "-")}

Recruteur :
{params.get("recruteur", "-")}

Salle :
{params.get("salle", "-")}

Heure :
{params.get("heure", "-")}

Cordialement,
Service RH
"""

    return """
Bonjour,

Votre document a été généré avec succès.

Cordialement
"""


# =========================
# 📅 MEETING TEMPLATE
# =========================

def meeting_template(params):

    return f"""
Bonjour,

Votre réunion a été programmée.

Date :
{params.get("date", "-")}

Lieu :
{params.get("lieu", "-")}

Cordialement
"""


# =========================
# 🔹 DEFAULT TEMPLATE
# =========================

def default_template():

    return """
Bonjour,

Votre demande a été reçue.

Cordialement
"""