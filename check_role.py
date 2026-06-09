import sqlite3

conn = sqlite3.connect('c:/Users/hananebouhyla/Documents/pfe/agentsecretairegeneral/data/database.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()
cursor.execute("SELECT id, nom, email, poste FROM employes WHERE email = 'souhaben535@gmail.com'")
row = cursor.fetchone()
if row:
    print("DB actuelle:", dict(row))
else:
    print("Utilisateur non trouve")
conn.close()
