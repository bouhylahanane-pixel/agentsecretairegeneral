import sqlite3

conn = sqlite3.connect('c:/Users/hananebouhyla/Documents/pfe/agentsecretairegeneral/data/database.db')
cursor = conn.cursor()

# Remettre souhaila en secretaire (son role initial)
cursor.execute("UPDATE employes SET poste = 'secretaire' WHERE email = 'souhaben535@gmail.com'")
conn.commit()

# Verifier
conn.row_factory = sqlite3.Row
cursor = conn.cursor()
cursor.execute("SELECT id, nom, email, poste FROM employes WHERE email = 'souhaben535@gmail.com'")
row = cursor.fetchone()
print("Apres correction:", dict(row))
conn.close()
