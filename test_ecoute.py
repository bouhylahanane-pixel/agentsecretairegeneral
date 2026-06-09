import os
import sounddevice as sd
from scipy.io import wavfile
import requests
from dotenv import load_dotenv

load_dotenv()

def enregistrer_micro(duree=5, filename="outputs/audio/mon_vote.wav"):
    """Enregistre le son du micro pendant X secondes"""
    os.makedirs("outputs/audio", exist_ok=True)
    fs = 44100  # Fréquence d'échantillonnage
    print(f"🎙️ Enregistrement en cours pendant {duree} secondes... Parle !")
    
    # Capture de l'audio
    audio_data = sd.rec(int(duree * fs), samplerate=fs, channels=1, dtype='int16')
    sd.wait()  # Attend que l'enregistrement se termine
    print("🛑 Enregistrement terminé.")
    
    # Sauvegarde au format WAV
    wavfile.write(filename, fs, audio_data)
    return filename

def transcrire_audio_avec_groq(file_path):
    """Envoie le fichier audio à Groq pour obtenir le texte"""
    if not os.environ.get("GROQ_API_KEY"):
        return "Erreur : Clé GROQ_API_KEY manquante."
        
    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {"Authorization": f"Bearer {os.environ.get("GROQ_API_KEY")}"}
    
    with open(file_path, "rb") as audio_file:
        files = {
            "file": (os.path.basename(file_path), audio_file, "audio/wav"),
            "model": (None, "whisper-large-v3"),
            "language": (None, "fr")
        }
        
        response = requests.post(url, headers=headers, files=files)
        
    if response.status_code == 200:
        return response.json().get("text", "")
    else:
        return f"Erreur API Groq: {response.text}"

# --- TEST DU LABORATOIRE ---
if __name__ == "__main__":
    # 1. On enregistre ta voix pendant 5 secondes
    fichier_wav = enregistrer_micro(duree=5)
    
    # 2. On demande à l'IA de transcrire
    print("⏳ Analyse de ta voix par l'IA...")
    texte_recu = transcrire_audio_avec_groq(fichier_wav)
    
    print("\n✨ L'IA a compris :")
    print(f"> {texte_recu}")