import sqlite3
import os

DB_PATH = 'data/database.db'

def test_trigger(participants_str):
    target_emails = []
    if participants_str:
        noms = [p.strip() for p in participants_str.split(",") if p.strip()]
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        for nom in noms:
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
                target_emails.append(res[0])
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
                    target_emails.append(res_stg[0])
        conn.close()

    target_emails = list(set(target_emails))
    if not target_emails:
        target_emails = ["fallback@example.com"]
    
    print(f"For '{participants_str}', target_emails: {target_emails}")

test_trigger("Hanane")
test_trigger("meryem")
test_trigger("employe")
