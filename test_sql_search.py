import sqlite3

conn = sqlite3.connect('data/database.db')
cursor = conn.cursor()

def test_search(nom):
    search_term = f"%{nom}%"
    query_emp = """
        SELECT email FROM employes 
        WHERE (COALESCE(prenom, '') || ' ' || COALESCE(nom, '')) LIKE ? 
           OR (COALESCE(nom, '') || ' ' || COALESCE(prenom, '')) LIKE ?
           OR prenom LIKE ? 
           OR nom LIKE ?
    """
    cursor.execute(query_emp, (search_term, search_term, search_term, search_term))
    res = cursor.fetchone()
    if res and res[0]:
        print(f"'{nom}' found in employes:", res[0])
    else:
        query_stg = """
            SELECT email FROM stagiaires 
            WHERE (COALESCE(prenom, '') || ' ' || COALESCE(nom, '')) LIKE ? 
               OR (COALESCE(nom, '') || ' ' || COALESCE(prenom, '')) LIKE ?
               OR prenom LIKE ? 
               OR nom LIKE ?
        """
        cursor.execute(query_stg, (search_term, search_term, search_term, search_term))
        res_stg = cursor.fetchone()
        if res_stg and res_stg[0]:
            print(f"'{nom}' found in stagiaires:", res_stg[0])
        else:
            print(f"'{nom}' NOT FOUND")

test_search("Hanane")
test_search("meryem")
test_search("employe")

conn.close()
