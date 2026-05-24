import sqlite3
import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Chemin vers la base de données unique
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
def rechercher_documents_pertinents(query: str, limit: int = 4) -> str:
    init_rag_table() 
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Nettoyage de la requête pour extraire les mots clés significatifs
    mots = [m for m in query.lower().split() if len(m) > 2]
    
    rows = []
    if mots:
        # Recherche multi-mots sur le contenu ET le titre pour maximiser les chances de trouver le bon fichier
        query_sql = "SELECT titre, contenu FROM documents_rag WHERE " + " OR ".join(["contenu LIKE ? OR titre LIKE ?"] * len(mots))
        params = []
        for m in mots:
            params.extend([f"%{m}%", f"%{m}%"])
        
        cursor.execute(query_sql, params)
        rows = cursor.fetchall()
    
    # Sécurité (Fallback) : Si la recherche par mots-clés ne donne rien, 
    # on prend les 4 blocs les plus importants/généraux (ex: FAQ ou Règlement) pour ne pas laisser l'IA vide.
    if len(rows) == 0:
        cursor.execute("SELECT titre, contenu FROM documents_rag ORDER BY id ASC LIMIT ?", (limit,))
        rows = cursor.fetchall()
    
    conn.close()
    
    # Formater le contexte de manière limpide pour Llama 3
    return "\n\n".join([f"DOCUMENT/SECTION : {r['titre']}\nCONTENU : {r['contenu']}" for r in rows[:limit]])

# ==========================================
# 🧠 Pipeline RAG Complet
# ==========================================
def interroger_rag(question: str) -> str:
    """Récupère le contexte dans SQLite puis interroge Groq pour répondre."""
    contexte = rechercher_documents_pertinents(question)
    
    try:
        prompt = f"""
Tu es l'assistant virtuel du Secrétariat Général de Smart Automation Technologies Tanger. 
Utilise EXCLUSIVEMENT les sections fournies ci-dessous pour répondre.
Sois précis, professionnel et cite les rôles, les noms (ex: Souhaila Ben, Ahmed Ahmadi) ou les délais si applicables.

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

# ==========================================
# 🚀 AJOUT ICI : BLOC DE TEST POUR LE TERMINAL
# ==========================================
if __name__ == "__main__":
    print("\n--- 🛰️ DEBUT DU TEST RAG PIPELINE ---")
    
    # 1. Vérification de la clé API
    if not GROQ_API_KEY:
        print("❌ Erreur : GROQ_API_KEY n'est pas configurée dans ton fichier .env !")
    else:
        print(f"🔑 Clé API détectée : {GROQ_API_KEY[:8]}...")

    # 2. Vérification de la base de données
    print(f"📂 Chemin de la base : {DB_PATH}")
    if os.path.exists(DB_PATH):
        print("💾 Le fichier database.db existe bien.")
    else:
        print("❌ Erreur : Le fichier database.db est introuvable au chemin indiqué.")

    # 3. Test de la recherche de contexte
    print("\n🔍 1. Test de l'extraction de contexte...")
    ma_question = "Quels sont les horaires pendant le Ramadan et qui valide les heures supplémentaires ?"
    contexte_extrait = rechercher_documents_pertinents(ma_question)
    print("--- Contexte trouvé en base ---")
    print(contexte_extrait if contexte_extrait else "⚠️ Aucun contexte trouvé (Base vide ?)")
    print("-------------------------------")

    # 4. Envoi au LLM Llama 3.3
    print("\n🧠 2. Envoi de la question et du contexte à Llama (Groq)...")
    test_reponse = interroger_rag(ma_question)
    print("\n🤖 RÉPONSE FINALE DE LLAMA :")
    print(test_reponse)
        
    print("\n--- 🏁 FIN DU TEST ---")