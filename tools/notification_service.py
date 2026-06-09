import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

async def send_attestation_ready_email(user_email: str, user_name: str, doc_type: str) -> bool:
    """Envoie un email de notification asynchrone pour informer l'utilisateur que son document est prêt."""
    email_user = os.getenv("EMAIL_USER")
    email_pass = os.getenv("EMAIL_PASSWORD")

    if not email_user or not email_pass:
        print("Erreur: EMAIL_USER ou EMAIL_PASSWORD manquant dans .env pour l'envoi de la notification.")
        return False
        
    try:
        msg = MIMEMultipart()
        msg["From"] = email_user
        msg["To"] = user_email
        msg["Subject"] = "📄 Votre attestation est disponible - Portail Secrétariat Général"

        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                    <h2 style="color: #4f46e5;">Secrétariat Général</h2>
                    <p>Bonjour <strong>{user_name}</strong>,</p>
                    <p>Nous vous informons que votre demande pour le document suivant : <strong>{doc_type}</strong> a été validée par le Secrétariat Général.</p>
                    <p>Votre document PDF est désormais prêt et disponible au téléchargement dans votre espace personnel sur le portail.</p>
                    <br>
                    <p style="margin-bottom: 5px;">Cordialement,</p>
                    <p style="margin-top: 0;"><strong>Le Secrétariat Général</strong><br>
                    <em style="color: #666; font-size: 0.9em;">Smart Automation Technologies</em></p>
                </div>
            </body>
        </html>
        """
        
        msg.attach(MIMEText(body, "html", "utf-8"))

        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(email_user, email_pass)
        server.send_message(msg)
        server.quit()
        
        print(f"Notification email sent to {user_email} for {doc_type}")
        return True
    except Exception as e:
        print(f"Erreur lors de l'envoi de l'email de notification à {user_email} : {e}")
        return False

async def send_pdf_attachment_email(user_email: str, user_name: str, doc_type: str, pdf_path: str) -> bool:
    """Envoie un email avec le PDF généré en pièce jointe."""
    from email.mime.application import MIMEApplication
    import os

    email_user = os.getenv("EMAIL_USER")
    email_pass = os.getenv("EMAIL_PASSWORD")

    if not email_user or not email_pass:
        print("Erreur: EMAIL_USER ou EMAIL_PASSWORD manquant dans .env pour l'envoi de la pièce jointe.")
        return False
        
    if not os.path.exists(pdf_path):
        print(f"Erreur: Le fichier {pdf_path} n'existe pas.")
        return False

    try:
        msg = MIMEMultipart()
        msg["From"] = email_user
        msg["To"] = user_email
        msg["Subject"] = f"📄 Votre document : {doc_type} - Secrétariat Général"

        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                    <h2 style="color: #4f46e5;">Secrétariat Général</h2>
                    <p>Bonjour <strong>{user_name}</strong>,</p>
                    <p>Veuillez trouver en pièce jointe le document suivant : <strong>{doc_type}</strong>.</p>
                    <br>
                    <p style="margin-bottom: 5px;">Cordialement,</p>
                    <p style="margin-top: 0;"><strong>Le Secrétariat Général</strong><br>
                    <em style="color: #666; font-size: 0.9em;">Smart Automation Technologies</em></p>
                </div>
            </body>
        </html>
        """
        
        msg.attach(MIMEText(body, "html", "utf-8"))

        with open(pdf_path, "rb") as f:
            pdf_attachment = MIMEApplication(f.read(), _subtype="pdf")
            pdf_attachment.add_header('Content-Disposition', 'attachment', filename=os.path.basename(pdf_path))
            msg.attach(pdf_attachment)

        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(email_user, email_pass)
        server.send_message(msg)
        server.quit()
        
        print(f"PDF email sent to {user_email} for {doc_type}")
        return True
    except Exception as e:
        print(f"Erreur lors de l'envoi de l'email PDF à {user_email} : {e}")
        return False

