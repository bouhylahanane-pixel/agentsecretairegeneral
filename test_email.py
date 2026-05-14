from services.email_service import send_email


result = send_email(
    to_email="EMAIL_TEST@gmail.com",
    subject="Convocation réunion",
    body="Veuillez trouver la convocation ci-jointe.",
    attachment_path="outputs/convocations/convocation_reunion_Utilisateur_20260512_131836.pdf"
)

print(result)