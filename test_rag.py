from tools.rag_engine import interroger_rag
# Test de la fonction
try:
    print("Test RAG en cours...")
    res = interroger_rag("horaires")
    print("Résultat :", res)
except Exception as e:
    print("Erreur détectée :", e)
    