import sqlite3
import os

# Adapte ce chemin si besoin selon ton arborescence
DB_PATH = os.path.join("data", "database.db")

def verifier_base():
    if not os.path.exists(DB_PATH):
        print("❌ Le fichier database.db est introuvable !")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # On regarde si la table existe et combien d'entrées elle a
    try:
        cursor.execute("SELECT count(*) FROM documents_rag")
        count = cursor.fetchone()[0]
        print(f"✅ La table 'documents_rag' contient {count} documents.")
        
        # On affiche un exemple de contenu
        cursor.execute("SELECT titre, contenu FROM documents_rag LIMIT 1")
        print("Exemple de contenu trouvé :", cursor.fetchone())
    except Exception as e:
        print(f"❌ Erreur lors de la lecture : {e}")
    
    conn.close()

verifier_base()