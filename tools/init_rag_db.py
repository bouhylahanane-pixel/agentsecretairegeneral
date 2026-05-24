import sqlite3
import os
from pathlib import Path

# Définition des chemins dynamiques et absolus
# __file__ est dans 'tools/', donc .parent est 'tools/', et .parent.parent est la racine du projet
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "database.db"

def initialiser_base_rag():
    """Crée le dossier data s'il n'existe pas et réinitialise la table."""
    # Sécurité : crée le dossier 'data' s'il a été supprimé accidentellement
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    cursor.execute("DROP TABLE IF EXISTS documents_rag")
    cursor.execute("""
        CREATE TABLE documents_rag (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titre TEXT NOT NULL,
            type_doc TEXT NOT NULL,
            contenu TEXT NOT NULL,
            source TEXT NOT NULL,
            meta_data TEXT
        )
    """)
    conn.commit()
    conn.close()
    print("✓ Base de données SQLite réinitialisée correctement.")

def charger_et_alimenter_tous_les_fichiers():
    """Scanne le dossier data/, découpe chaque fichier texte et l'insère dans SQLite."""
    if not DATA_DIR.exists():
        print(f"⚠️ Erreur : Le dossier {DATA_DIR} est introuvable.")
        return

    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    fichiers_traites = 0
    chunks_inseres = 0

    # Liste des fichiers textes présents dans ton dossier data
    fichiers_cible = [
        "reglement_interne.txt",
        "onboarding_offboarding.txt",
        "catalogue_formations_ia_data.txt",
        "faq_support_technique.txt"
    ]

    for nom_fichier in fichiers_cible:
        chemin_complet = DATA_DIR / nom_fichier
        if not chemin_complet.exists():
            print(f"📋 Fichier attendu absent : {nom_fichier}")
            continue

        with open(chemin_complet, "r", encoding="utf-8") as f:
            contenu_total = f.read()

        # Découpage par sous-section Markdown (##)
        blocs = contenu_total.split("##")
        
        # Récupération du titre principal (première ligne du fichier # ...)
        lignes_globales = blocs[0].strip().splitlines()
        titre_principal = lignes_globales[0].replace("#", "").strip() if lignes_globales else nom_fichier
        type_document = nom_fichier.replace(".txt", "")

        for bloc in blocs:
            bloc = bloc.strip()
            if not bloc or bloc.startswith("#"): 
                continue 
            
            lignes = bloc.splitlines()
            sous_titre = lignes[0].strip()
            texte_chunk = "\n".join(lignes[1:]).strip()

            if texte_chunk:
                titre_complet = f"{titre_principal} - {sous_titre}"
                cursor.execute("""
                    INSERT INTO documents_rag (titre, type_doc, contenu, source, meta_data) 
                    VALUES (?, ?, ?, ?, ?)
                """, (titre_complet, type_document, texte_chunk, f"data/{nom_fichier}", "{}")) # <-- Modifié ici avec le 'e'
                chunks_inseres += 1
        
        fichiers_traites += 1

    conn.commit()
    conn.close()
    print(f"🎯 RAG alimenté avec succès : {fichiers_traites} fichiers lus, {chunks_inseres} sections enregistrées.")

if __name__ == "__main__":
    initialiser_base_rag()
    charger_et_alimenter_tous_les_fichiers()