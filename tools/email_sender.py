import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

def send_invitation_email(titre: str, date: str, destinataires: list[str]) -> bool:
    """Envoie une invitation par e-mail via SMTP."""
    email_user = os.getenv("EMAIL_USER")
    email_pass = os.getenv("EMAIL_PASSWORD")

    if not email_user or not email_pass:
        print("Erreur: EMAIL_USER ou EMAIL_PASSWORD manquant dans .env")
        return False
        
    try:
        msg = MIMEMultipart()
        msg["From"] = email_user
        msg["To"] = ", ".join(destinataires)
        msg["Subject"] = f"Convocation : {titre}"

        body = f"""
        Bonjour,

        Vous êtes convoqué(e) à la réunion suivante :
        Titre : {titre}
        Date : {date}

        Veuillez confirmer votre présence.

        Cordialement,
        Le Secrétariat
        """
        
        msg.attach(MIMEText(body, "plain", "utf-8"))

        # Configuration SMTP (pour Gmail par défaut)
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(email_user, email_pass)
        server.send_message(msg)
        server.quit()
        
        return True
    except Exception as e:
        print(f"Erreur lors de l'envoi de l'email : {e}")
        return False
