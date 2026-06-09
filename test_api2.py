import sqlite3

conn = sqlite3.connect('c:/Users/hananebouhyla/Documents/pfe/agentsecretairegeneral/data/database.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute("SELECT id, utilisateur, action_requise FROM logs_activite")
for r in cursor.fetchall():
    print(dict(r))

conn.close()
