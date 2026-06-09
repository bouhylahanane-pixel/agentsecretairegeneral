import sqlite3
conn = sqlite3.connect('data/database.db')
cursor = conn.cursor()
cursor.execute("UPDATE employes SET email = 'bouhyla.hanane@etu.uae.ac.ma' WHERE prenom = 'Hanane' OR nom = 'Hanane'")
conn.commit()
conn.close()
print("Reverted Hanane's email in database to bouhyla.hanane@etu.uae.ac.ma")
