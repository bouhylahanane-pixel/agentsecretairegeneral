import sqlite3
import os
# On remonte d'un niveau avec '..' pour sortir de 'tools' et atteindre la racine
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "data", "database.db")
TXT_PATH = os.path.join(BASE_DIR, "data", "reglement_interne.txt")

def initialiser_base_rag():
    """Crée la table documents_rag avec la bonne structure."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. On supprime l'ancienne table pour repartir sur une base saine
    cursor.execute("DROP TABLE IF EXISTS documents_rag")
    
    # 2. On recrée la table avec toutes les colonnes nécessaires
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

def decouper_et_alimenter():
    """Lit, découpe et insère le texte dans la base."""
    if not os.path.exists(TXT_PATH):
        print(f"⚠️ Erreur : Le fichier {TXT_PATH} est introuvable.")
        return

    with open(TXT_PATH, "r", encoding="utf-8") as f:
        contenu_total = f.read()

    # --- DEBUT DU REMPLACEMENT ---
    sections_inserees = 0
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM documents_rag")


    sections = contenu_total.split("SECTION")
    
    for section in sections:
        section = section.strip()
        if not section: continue
        
        # Le titre est la première ligne
        lignes = section.splitlines()
        titre_actuel = "SECTION " + lignes[0].strip()
        contenu_propre = "\n".join(lignes[1:]).strip()
        
        if contenu_propre:
            cursor.execute("INSERT INTO documents_rag (titre, type_doc, contenu, source, meta_data) VALUES (?, ?, ?, ?, ?)", 
                           (titre_actuel, "reglement", contenu_propre, "data/reglement_interne.txt", "{}"))
            sections_inserees += 1
    # --- FIN DU REMPLACEMENT ---

    conn.commit()
    conn.close()
    print(f"✓ Alimentation réussie : {sections_inserees} sections insérées.")

if __name__ == "__main__":
    initialiser_base_rag()
    decouper_et_alimenter()