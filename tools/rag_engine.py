import sqlite3
import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Chemin vers la base de données unique
# Vérifie que dans rag_engine.py tu as bien :
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "database.db")
# ==========================================
# 🛠️ Initialisation de la table (Vérification)
# ==========================================
def init_rag_table():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents_rag (
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

# ==========================================
# 🔍 Recherche par similarité de mots-clés
# ==========================================
def rechercher_documents_pertinents(query: str, limit: int = 5) -> str:
    # AJOUT DE SÉCURITÉ : On s'assure que la table existe avant de lire
    init_rag_table() 
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # 1. On cherche avec les mots-clés
    mots = [m for m in query.lower().split() if len(m) > 2]
    
    if mots:
        query_sql = "SELECT titre, contenu FROM documents_rag WHERE " + " OR ".join(["contenu LIKE ?"] * len(mots))
        params = [f"%{m}%" for m in mots]
        cursor.execute(query_sql, params)
    
    rows = cursor.fetchall()
    
    # 2. SI AUCUN RÉSULTAT (ou très peu) : on récupère tout le règlement
    # Cela garantit que l'IA a TOUJOURS le texte sous les yeux
    if len(rows) < 2:
        cursor.execute("SELECT titre, contenu FROM documents_rag")
        rows = cursor.fetchall()
    
    conn.close()
    
    return "\n\n".join([f"SECTION : {r['titre']}\nCONTENU : {r['contenu']}" for r in rows[:limit]])
# ==========================================
# 🧠 Pipeline RAG Complet
# ==========================================
def interroger_rag(question: str) -> str:
    """Récupère le contexte dans SQLite puis interroge Groq pour répondre."""
    contexte = rechercher_documents_pertinents(question)
    
    try:
        prompt = f"""
Tu es l'assistant virtuel du Secrétariat Général. 
Utilise EXCLUSIVEMENT les sections du règlement fournies ci-dessous pour répondre.
Si l'information est présente, résume-la. Si tu n'es pas sûr à 100%, ne dis pas "je ne sais pas", mais reformule ce que tu as trouvé dans le contexte.

CONTEXTE :
{contexte}

QUESTION :
{question}

RÉPONSE :
"""

        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": "Tu es un agent administratif d'entreprise."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.1
            }
        )
        
        result = response.json()
        return result["choices"][0]["message"]["content"].strip()
        
    except Exception as e:
        print("Erreur RAG :", e)
        return "Impossible d'interroger la base de connaissances pour le moment."

# ==========================================
# 📥 Indexer un document
# ==========================================
def indexer_document(titre: str, type_doc: str, contenu: str, meta_data_dict: dict = None):
    init_rag_table()
    meta_json = json.dumps(meta_data_dict) if meta_data_dict else "{}"
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO documents_rag (titre, type_doc, contenu, source, meta_data)
        VALUES (?, ?, ?, ?, ?)
    """, (titre, type_doc, contenu, "système", meta_json))
    conn.commit()
    conn.close()