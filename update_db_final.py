import sqlite3
conn = sqlite3.connect('data/database.db')
cursor = conn.cursor()
cursor.execute("UPDATE employes SET email = 'hananeymed2020@gmail.com' WHERE prenom = 'Hanane' OR nom = 'Hanane'")
conn.commit()
conn.close()
print("Updated Hanane's email in database to hananeymed2020@gmail.com")
