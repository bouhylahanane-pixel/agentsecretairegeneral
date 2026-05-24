import os
import re
from gtts import gTTS

def nettoyer_texte_pour_lecture(texte):
    """
    Nettoie le texte des balises Markdown, des symboles bruts
    et structure les phrases pour que la lecture gTTS soit fluide et naturelle.
    """
    if not texte:
        return ""
        
    # 1. On supprime les astérisques du gras Markdown (ex: **Entreprise** -> Entreprise)
    texte_propre = texte.replace("**", "")
    
    # 2. On rend la lecture des listes et des blocs d'information plus humaine
    # Au lieu de s'arrêter brutalement sur les deux-points ":", on fluidifie la transition
    texte_propre = texte_propre.replace("Entreprise :", "Pour l'entreprise,")
    texte_propre = texte_propre.replace("Études suivies :", "Concernant les études suivies,")
    texte_propre = texte_propre.replace("Sujet du Stage :", "Le sujet du stage est,")
    texte_propre = texte_propre.replace("Encadrant :", "Sous la direction de,")
    texte_propre = texte_propre.replace("Période :", "Pour la période,")
    texte_propre = texte_propre.replace(" au ", " jusqu'au ")
    
    # 3. On remplace les tirets de listes par des virgules pour l'énumération vocale
    texte_propre = texte_propre.replace("\n- ", ", ")
    texte_propre = texte_propre.replace("\n* ", ", ")
    
    # 4. On transforme les retours à la ligne restants en points pour forcer une pause respiratoire de l'IA
    texte_propre = texte_propre.replace("\n", ". ")
    
    # 5. Nettoyage final des espaces multiples pour éviter les blancs bizarres
    texte_propre = re.sub(r'\s+', ' ', texte_propre).strip()
    
    return texte_propre


# ==========================================
# 🔥 TEXTE -> AUDIO REVISITÉ (FLUIDE & PROPRE)
# ==========================================
def text_to_speech(text, output_path="outputs/audio/response.mp3"):
    """
    Prend la réponse brute de l'agent, nettoie sa structure textuelle
    et génère un fichier audio français fluide et agréable.
    """
    # Sécurité : Création dynamique du dossier s'il n'existe pas
    os.makedirs("outputs/audio", exist_ok=True)

    # Nettoyage intelligent du texte pour supprimer les bruits de syntaxe
    texte_vocal = nettoyer_texte_pour_lecture(text)
    
    # Sécurité au cas où le texte se retrouverait vide après filtrage
    if not texte_vocal:
        texte_vocal = "La demande a été traitée avec succès."

    # Initialisation du moteur Google Text-to-Speech avec le texte épuré
    tts = gTTS(text=texte_vocal, lang="fr")

    # Sauvegarde du fichier audio sur le serveur local
    tts.save(output_path)

    return output_path