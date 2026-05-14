import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication

from dotenv import load_dotenv

load_dotenv()
EMAIL_ADDRESS = os.getenv("EMAIL_USER")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587




def send_email(
    to_email,
    subject,
    body,
    attachment_path=None
):

    try:

        msg = MIMEMultipart()

        msg["From"] = EMAIL_ADDRESS
        msg["To"] = to_email
        msg["Subject"] = subject

        msg.attach(MIMEText(body, "plain"))

        # =========================
        # 🔥 Pièce jointe
        # =========================

        if attachment_path:

            with open(attachment_path, "rb") as f:

                part = MIMEApplication(
                    f.read(),
                    Name=attachment_path.split("/")[-1]
                )

            part[
                "Content-Disposition"
            ] = (
                f'attachment; '
                f'filename="{attachment_path.split("/")[-1]}"'
            )

            msg.attach(part)

        # =========================
        # 🔥 Connexion SMTP
        # =========================

        server = smtplib.SMTP(
            SMTP_SERVER,
            SMTP_PORT
        )

        server.starttls()

        server.login(
            EMAIL_ADDRESS,
            EMAIL_PASSWORD
        )

        server.send_message(msg)

        server.quit()

        return "Email envoyé avec succès"

    except Exception as e:

        return f"Erreur email : {str(e)}"