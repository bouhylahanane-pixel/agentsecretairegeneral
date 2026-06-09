import smtplib
import os
import email.utils
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from dotenv import load_dotenv

load_dotenv()

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
EMAIL_ADDRESS = os.getenv("EMAIL_USER", "votre.email@gmail.com")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "votre_mot_de_passe_application_google")

def send_email(to_email, subject, body, attachment_path=None):
    if EMAIL_ADDRESS == "votre.email@gmail.com" or EMAIL_PASSWORD == "votre_mot_de_passe_application_google":
        print(f"MOCK EMAIL: Simulation d'envoi d'email à {to_email} avec le sujet '{subject}'")
        return "Email envoyé avec succès"

    try:
        msg = MIMEMultipart('alternative')
        msg["From"] = f"Secrétaire Général <{EMAIL_ADDRESS}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        msg['Date'] = email.utils.formatdate(localtime=True)
        msg['Message-ID'] = email.utils.make_msgid(domain="agentsecretairegeneral.com")

        # Plain text
        msg.attach(MIMEText(body, "plain", "utf-8"))
        
        # HTML text to look more professional and avoid spam
        html_body = f"""
        <html>
            <body>
                <p>Bonjour,</p>
                <p>{body.replace(chr(10), '<br>')}</p>
                <br>
                <p>Cordialement,<br><b>Le Secrétariat Général</b></p>
                <p style="font-size: 10px; color: gray;">Cet e-mail est généré automatiquement.</p>
            </body>
        </html>
        """
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        # Attachment
        if attachment_path and os.path.exists(attachment_path):
            with open(attachment_path, "rb") as f:
                filename = os.path.basename(attachment_path)
                part = MIMEApplication(f.read(), Name=filename)
            part["Content-Disposition"] = f'attachment; filename="{filename}"'
            msg.attach(part)

        # Send
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        server.send_message(msg)
        server.quit()

        return "Email envoyé avec succès"

    except Exception as e:
        return f"Erreur email : {str(e)}"