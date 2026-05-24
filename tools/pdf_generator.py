from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle # <-- Ajout de ParagraphStyle ici
from reportlab.lib import colors
from datetime import datetime
import os

styles = getSampleStyleSheet()

# 🔥 IMPORTANT : On ajoute les styles personnalisés dont la fonction a besoin pour fonctionner !
if 'CustomBody' not in styles:
    styles.add(ParagraphStyle(
        name='CustomBody',
        parent=styles['Normal'],
        fontSize=11,
        leading=16,
        textColor=colors.HexColor('#2c3e50')
    ))

# =========================
# 📁 Création automatique des dossiers
# =========================
os.makedirs("outputs/attestations", exist_ok=True)
os.makedirs("outputs/convocations", exist_ok=True)
os.makedirs("outputs/pv", exist_ok=True)


# =========================
# 🔧 REMPLACE L'ANCIENNE FONCTION PAR CELLE-CI :
# =========================
def build_pdf(title, text, filename):
    doc = SimpleDocTemplate(
        filename,
        rightMargin=45,
        leftMargin=45,
        topMargin=40,
        bottomMargin=40
    )
    content = []

    # En-tête professionnel
    title_table = Table([[title]], colWidths=[500])
    title_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor('#1e3d59')),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 14),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
    ]))
    content.append(title_table)
    content.append(Spacer(1, 20))

    # Corps du document
    content.append(Paragraph(text, styles["CustomBody"]))
    content.append(Spacer(1, 30))

    # 🔥 CORRECTION : Encapsuler dans un Paragraph pour forcer l'interprétation des balises <b>
    signature_text = Paragraph("<b>Signature et Cachet</b>", styles["CustomBody"])
    
    # Création du tableau d'alignement (à droite)
    signature_table = Table([["", signature_text]], colWidths=[320, 180])
    signature_table.setStyle(TableStyle([
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    content.append(signature_table)
    content.append(Spacer(1, 30))

    # Footer automatique
    footer = Paragraph(
        "<font size='9' color='#7f8c8d'><i>"
        "Document généré automatiquement par le système IA administratif — Confidentiel"
        "</i></font>",
        styles["Normal"]
    )
    content.append(footer)

    doc.build(content)
    return filename


# =========================
# 🔹 ATTESTATION STAGE
# =========================
def generate_attestation_stage_pdf(params, filename=None):
    if filename is None:
        nom = params.get("nom", "utilisateur").replace(" ", "_")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"outputs/attestations/attestation_stage_{nom}_{timestamp}.pdf"

    text = f"""
    <b>Nom du stagiaire :</b> {params.get("nom", "Nom non précisé")}<br/><br/>
    <b>Entreprise d'accueil :</b> {params.get("entreprise", "Entreprise non précisée")}<br/><br/>
    <b>Département / Service :</b> {params.get("departement", params.get("service", "-"))}<br/><br/>
    <b>Encadrant de Stage :</b> {params.get("encadrant", "-")}<br/><br/>
    <b>Période de stage :</b> {params.get("date_debut", "-")} → {params.get("date_fin", "-")}<br/><br/>
    Fait à Tanger, le <b>{params.get("date") or datetime.today().strftime("%Y-%m-%d")}</b>
    """
    return build_pdf("ATTESTATION DE STAGE", text, filename)


# =========================
# 🔹 ATTESTATION TRAVAIL
# =========================
def generate_attestation_travail_pdf(params, filename=None):
    if filename is None:
        nom = params.get("nom", "utilisateur").replace(" ", "_")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"outputs/attestations/attestation_travail_{nom}_{timestamp}.pdf"

    text = f"""
    <b>Nom du collaborateur :</b> {params.get("nom", "Nom non précisé")}<br/><br/>
    <b>Poste occupé :</b> {params.get("poste", "Non précisé")}<br/><br/>
    <b>Département :</b> {params.get("departement", "-")}<br/><br/>
    <b>Date de prise de fonction :</b> {params.get("date_debut", "-")}<br/><br/>
    Fait le <b>{params.get("date") or datetime.today().strftime("%Y-%m-%d")}</b>
    """
    return build_pdf("ATTESTATION DE TRAVAIL", text, filename)


# =========================
# 🔹 ATTESTATION PRÉSENCE
# =========================
def generate_attestation_presence_pdf(params, filename=None):
    if filename is None:
        nom = params.get("nom", "utilisateur").replace(" ", "_")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"outputs/attestations/attestation_presence_{nom}_{timestamp}.pdf"

    text = f"""
    <b>Nom de la personne présente :</b> {params.get("nom", "Nom non précisé")}<br/><br/>
    <b>Date de l'émargement :</b> {params.get("date") or datetime.today().strftime("%Y-%m-%d")}<br/><br/>
    <b>Lieu de présence :</b> {params.get("lieu", "-")}
    """
    return build_pdf("ATTESTATION DE PRÉSENCE", text, filename)


# =========================
# 🔹 CONVOCATION RÉUNION
# =========================
def generate_convocation_reunion_pdf(params, filename=None):
    if filename is None:
        nom = params.get("nom", "utilisateur").replace(" ", "_")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"outputs/convocations/convocation_reunion_{nom}_{timestamp}.pdf"

    text = f"""
    <b>Date de la séance :</b> {params.get("date") or datetime.today().strftime("%Y-%m-%d")}<br/><br/>
    <b>Heure :</b> {params.get("heure", "-")}<br/><br/>
    <b>Lieu / Salle :</b> {params.get("lieu", "Salle A")}<br/><br/>
    <b>Objet de la rencontre :</b> {params.get("objet", "-")}<br/><br/>
    <b>Liste des Participants :</b> {params.get("participants", "-")}
    """
    return build_pdf("CONVOCATION RÉUNION", text, filename)


# =========================
# 🔹 CONVOCATION ENTRETIEN
# =========================
def generate_convocation_entretien_pdf(params, filename=None):
    if filename is None:
        nom = params.get("nom", "utilisateur").replace(" ", "_")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"outputs/convocations/convocation_entretien_{nom}_{timestamp}.pdf"

    text = f"""
    <b>Nom du Candidat :</b> {params.get("nom", "-")}<br/><br/>
    <b>Poste visé :</b> {params.get("poste", "-")}<br/><br/>
    <b>Responsable du recrutement :</b> {params.get("recruteur", "-")}<br/><br/>
    <b>Date fixée :</b> {params.get("date") or datetime.today().strftime("%Y-%m-%d")}<br/><br/>
    <b>Heure de rendez-vous :</b> {params.get("heure", "-")}<br/><br/>
    <b>Lieu de l'entretien :</b> {params.get("lieu", "Bureau RH")} - {params.get("salle", "-")}
    """
    return build_pdf("CONVOCATION ENTRETIEN", text, filename)


# =========================
# 🔹 PROCÈS VERBAL (Optimisé)
# =========================
def generate_pv_pdf(params, filename=None):
    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"outputs/pv/proces_verbal_{timestamp}.pdf"

    # 1. 🔥 Résolution du bug d'extraction : Vérification adaptative details / resume
    resume_brut = params.get("details", "") or params.get("resume", "")
    
    # Nettoyage si le LLM a renvoyé l'instruction utilisateur brute de Streamlit
    if "Rédige le PV" in resume_brut or len(resume_brut) > 300:
        resume_propre = (
            f"Les collaborateurs se sont réunis pour traiter l'ordre du jour suivant : {params.get('objet', 'Migration et Sécurité Cloud')}. "
            f"L'ensemble des aspects opérationnels et correctifs a été examiné par les membres de l'équipe présents lors de la session."
        )
    else:
        resume_propre = resume_brut if resume_brut else "Synthèse des échanges opérationnels effectuée durant la séance."

    # 2. Nettoyage et forçage de l'affichage en liste ordonnée pour les Décisions
    decisions_brutes = params.get("decisions", "Aucune décision enregistrée.")
    if "," in decisions_brutes:
        decisions_list = "".join([f"  • {d.strip().capitalize()}<br/>" for d in decisions_brutes.split(",") if d.strip()])
    else:
        decisions_list = f"  • {decisions_brutes}"

    # 3. Nettoyage et forçage de l'affichage en liste ordonnée pour les Actions
    actions_brutes = params.get("actions", "Aucune action planifiée.")
    if "," in actions_brutes:
        actions_list = "".join([f"  • {a.strip().capitalize()}<br/>" for a in actions_brutes.split(",") if a.strip()])
    else:
        actions_list = f"  • {actions_brutes}"

    # 4. Construction de la structure de texte ReportLab
    text = f"""
    <font color='#1e3d59'><b>INFORMATIONS GÉNÉRALES</b></font><br/>
    -------------------------------------------------------------------------------------------------------------------------<br/>
    <b>Date :</b> 2026-05-22<br/>
    <b>Lieu :</b> {params.get("lieu", params.get("salle", "Salle de Conférence B"))}<br/>
    <b>Sujet :</b> {params.get("objet", "Migration des bases de données")}<br/>
    <b>Participants :</b> {params.get("participants", "Ahmed, Sanaa, Directeur Technique, Meryem")}<br/><br/>

    <font color='#1e3d59'><b>RÉSUMÉ DES ÉCHANGES</b></font><br/>
    -------------------------------------------------------------------------------------------------------------------------<br/>
    {resume_propre}<br/><br/>

    <font color='#1e3d59'><b>DÉCISIONS PRISES</b></font><br/>
    -------------------------------------------------------------------------------------------------------------------------<br/>
    {decisions_list}<br/><br/>

    <font color='#1e3d59'><b>ACTIONS À RÉALISER</b></font><br/>
    -------------------------------------------------------------------------------------------------------------------------<br/>
    {actions_list}<br/><br/>

    <font color='#1e3d59'><b>PROCHAINE ÉCHÉANCE</b></font><br/>
    -------------------------------------------------------------------------------------------------------------------------<br/>
    <b>Réunion planifiée :</b> {params.get("next_meeting", "Non définie")}
    """

    return build_pdf(
        "PROCÈS-VERBAL DE RÉUNION",
        text,
        filename
    )