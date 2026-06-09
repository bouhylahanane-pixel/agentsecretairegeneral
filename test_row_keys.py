import sqlite3

conn = sqlite3.connect('c:/Users/hananebouhyla/Documents/pfe/agentsecretairegeneral/data/database.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute("SELECT * FROM employes")
row = cursor.fetchone()

if row:
    print("Keys:", row.keys())
    if "poste" in row.keys():
        print("Yes, 'poste' is in keys.")
    else:
        print("No, 'poste' is NOT in keys!")
else:
    print("No rows found.")

conn.close()
