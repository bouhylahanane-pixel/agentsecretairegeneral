import sqlite3
import os

DB_PATH = 'c:/Users/hananebouhyla/Documents/pfe/agentsecretairegeneral/data/database.db'
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Supprimer tous les logs liés au chat
cursor.execute("DELETE FROM logs_activite WHERE action_requise LIKE 'Chat %'")
deleted = cursor.rowcount
print(f"Deleted {deleted} rows from logs_activite.")

conn.commit()
conn.close()
