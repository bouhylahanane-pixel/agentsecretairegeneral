from gtts import gTTS
import os


# =========================
# 🔥 TEXTE -> AUDIO
# =========================

def text_to_speech(
    text,
    output_path="outputs/audio/response.mp3"
):

    os.makedirs(
        "outputs/audio",
        exist_ok=True
    )

    tts = gTTS(
        text=text,
        lang="fr"
    )

    tts.save(output_path)

    return output_path