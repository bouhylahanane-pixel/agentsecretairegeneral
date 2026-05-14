from services.voice_service import text_to_speech

audio = text_to_speech(
    "Bonjour Meryem. Votre système IA fonctionne parfaitement."
)

print(audio)