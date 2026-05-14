from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle
)

from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

from datetime import datetime
import os

styles = getSampleStyleSheet()

# =========================
# 📁 Création automatique des dossiers
# =========================

os.makedirs("outputs/attestations", exist_ok=True)
os.makedirs("outputs/convocations", exist_ok=True)
os.makedirs("outputs/pv", exist_ok=True)

# =========================
# 🔧 Fonction générique PDF
# =========================

def build_pdf(title, text, filename):

    doc = SimpleDocTemplate(
    filename,
    rightMargin=40,
    leftMargin=40,
    topMargin=40,
    bottomMargin=40
)
    content = []

    # 🔥 Header professionnel
    title_table = Table([[title]], colWidths=[450])

    title_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.darkblue),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 18),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
    ]))

    content.append(title_table)

    content.append(Spacer(1, 20))

    content.append(Paragraph(text, styles["Normal"]))

    content.append(Spacer(1, 60))

    content.append(
        Paragraph(
            "<b>Signature et Cachet</b>",
            styles["Normal"]
        )
    )

    # 🔥 Footer professionnel
    content.append(Spacer(1, 40))

    content.append(
        Paragraph(
            "<font size='10'>"
            "Document généré automatiquement par le système IA administratif"
            "</font>",
            styles["Normal"]
        )
    )

    doc.build(content)
    return filename


# =========================
# 🔹 ATTESTATION STAGE
# =========================

def generate_attestation_stage_pdf(
    params,
    filename=None
):

    if filename is None:

        nom = params.get("nom", "utilisateur")

        nom = nom.replace(" ", "_")

        timestamp = datetime.now().strftime(
            "%Y%m%d_%H%M%S"
        )

        filename = (
            f"outputs/attestations/"
            f"attestation_stage_{nom}_{timestamp}.pdf"
        )

    text = f"""
    <b>Nom :</b> {params.get("nom", "Nom non précisé")}<br/><br/>

    <b>Entreprise :</b> {params.get("entreprise", "Entreprise non précisée")}<br/><br/>

    <b>Département / Service :</b> {params.get("departement", params.get("service", "-"))}<br/><br/>

    <b>Encadrant :</b> {params.get("encadrant", "-")}<br/><br/>

    <b>Période :</b> {params.get("date_debut", "-")} → {params.get("date_fin", "-")}<br/><br/>

    Fait à {params.get("ville", "Tanger")} le
    <b>{params.get("date") or datetime.today().strftime("%Y-%m-%d")}</b>
    """

    return build_pdf(
        "ATTESTATION DE STAGE",
        text,
        filename
    )


# =========================
# 🔹 ATTESTATION TRAVAIL
# =========================

def generate_attestation_travail_pdf(
    params,
    filename=None
):
    if filename is None:

        nom = params.get("nom", "utilisateur")

        nom = nom.replace(" ", "_")

        timestamp = datetime.now().strftime(
            "%Y%m%d_%H%M%S"
        )

        filename = (
            f"outputs/attestations/"
            f"attestation_travail_{nom}_{timestamp}.pdf"
        )

    text = f"""
    <b>Nom :</b> {params.get("nom", "Nom non précisé")}<br/><br/>

    <b>Poste :</b> {params.get("poste", "Non précisé")}<br/><br/>

    <b>Département :</b> {params.get("departement", "-")}<br/><br/>

    <b>Date début :</b> {params.get("date_debut", "-")}
    <br/><br/>

    Fait le
    <b>{params.get("date") or datetime.today().strftime("%Y-%m-%d")}</b>
    """
    

    return build_pdf(
        "ATTESTATION DE TRAVAIL",
        text,
        filename
    )


# =========================
# 🔹 ATTESTATION PRÉSENCE
# =========================

def generate_attestation_presence_pdf(
    params,
    filename=None
):
    if filename is None:

        nom = params.get("nom", "utilisateur")

        nom = nom.replace(" ", "_")

        timestamp = datetime.now().strftime(
            "%Y%m%d_%H%M%S"
        )

        filename = (
            f"outputs/attestations/"
            f"attestation_presence_{nom}_{timestamp}.pdf"
        )

    text = f"""
    <b>Nom :</b> {params.get("nom", "Nom non précisé")}<br/><br/>

    <b>Date :</b> {params.get("date") or datetime.today().strftime("%Y-%m-%d")
}<br/><br/>

    <b>Lieu :</b> {params.get("lieu", "-")}
    """

    return build_pdf(
        "ATTESTATION DE PRÉSENCE",
        text,
        filename
    )


# =========================
# 🔹 CONVOCATION RÉUNION
# =========================

def generate_convocation_reunion_pdf(
    params,
    filename=None
):
    if filename is None:

        nom = params.get("nom", "utilisateur")

        nom = nom.replace(" ", "_")

        timestamp = datetime.now().strftime(
            "%Y%m%d_%H%M%S"
        )

        filename = (
            f"outputs/convocations/"
            f"convocation_reunion_{nom}_{timestamp}.pdf"
        )

    text = f"""
   <b>Date :</b> {
   params.get("date") or datetime.today().strftime("%Y-%m-%d")
}<br/><br/>

    <b>Heure :</b> {params.get("heure", "-")}<br/><br/>

    <b>Lieu :</b> {params.get("lieu", "Salle A")}<br/><br/>

    <b>Objet :</b> {params.get("objet", "-")}<br/><br/>

    <b>Participants :</b> {params.get("participants", "-")}
    """

    return build_pdf(
        "CONVOCATION RÉUNION",
        text,
        filename
    )


# =========================
# 🔹 CONVOCATION ENTRETIEN
# =========================

def generate_convocation_entretien_pdf(
    params,
   filename=None
):
    if filename is None:

        nom = params.get("nom", "utilisateur")

        nom = nom.replace(" ", "_")

        timestamp = datetime.now().strftime(
            "%Y%m%d_%H%M%S"
        )

        filename = (
            f"outputs/convocations/"
            f"convocation_entretien_{nom}_{timestamp}.pdf"
        )

    text = f"""
    <b>Nom :</b> {params.get("nom", "-")}<br/><br/>

    <b>Poste :</b> {params.get("poste", "-")}<br/><br/>

    <b>Recruteur :</b> {params.get("recruteur", "-")}<br/><br/>

   <b>Date :</b> {
   params.get("date") or datetime.today().strftime("%Y-%m-%d")
}<br/><br/>

    <b>Heure :</b> {params.get("heure", "-")}<br/><br/>

    <b>Lieu :</b> {params.get("lieu", "Bureau RH")}<br/><br/>

    <b>Salle :</b> {params.get("salle", "-")}
    """

    return build_pdf(
        "CONVOCATION ENTRETIEN",
        text,
        filename
    )


# =========================
# 🔹 PROCÈS VERBAL
# =========================

def generate_pv_pdf(
    params,
   filename=None
):
    if filename is None:

        timestamp = datetime.now().strftime(
            "%Y%m%d_%H%M%S"
        )

        filename = (
            f"outputs/pv/"
            f"proces_verbal_{timestamp}.pdf"
        )
    text = f"""
    <b>Date :</b> {
   params.get("date") or datetime.today().strftime("%Y-%m-%d")
   
}<br/><br/>
    <b>Lieu :</b> {params.get("lieu", "-")}<br/><br/>

    <b>Sujet :</b> {params.get("objet", "-")}<br/><br/>

    <b>Participants :</b> {params.get("participants", "-")}<br/><br/>

    <b>Résumé :</b><br/>
    {params.get("resume", "Non précisé")}<br/><br/>

    <b>Décisions prises :</b><br/>
    {params.get("decisions", "Aucune décision précisée")}<br/><br/>

    <b>Actions à réaliser :</b><br/>
    {params.get("actions", "Aucune action précisée")}<br/><br/>

    <b>Prochaine réunion :</b><br/>
    {params.get("next_meeting", "Non définie")}


    """

    return build_pdf(
        "PROCÈS-VERBAL DE RÉUNION",
        text,
        filename
    )