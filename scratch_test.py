import time
import subprocess
import requests
import json
import sqlite3

def run_tests():
    print("Démarrage du serveur uvicorn...")
    import sys
    server = subprocess.Popen(["python", "-m", "uvicorn", "main:app", "--port", "8001"], stdout=sys.stdout, stderr=sys.stderr)
    time.sleep(3) # Wait for server to start

    try:
        base_url = "http://127.0.0.1:8001"
        
        # 1. Test /health
        res = requests.get(f"{base_url}/health")
        print("Health:", res.status_code, res.json())

        # 2. Setup mock users directly in DB just in case they don't exist
        conn = sqlite3.connect("data/database.db")
        cursor = conn.cursor()
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        hashed_pw = pwd_context.hash("password")
        
        test_users = [
            ("admin@test.com", "Admin Test", hashed_pw, "admin", 1),
            ("sec@test.com", "Sec Test", hashed_pw, "secretaire", 1),
            ("emp@test.com", "Emp Test", hashed_pw, "employee", 1),
            ("stag@test.com", "Stag Test", hashed_pw, "stagiaire", 1),
            ("dis@test.com", "Disabled Test", hashed_pw, "admin", 0),
        ]
        
        for u in test_users:
            cursor.execute("INSERT OR REPLACE INTO employes (email, nom, mot_de_passe, poste, is_active) VALUES (?, ?, ?, ?, ?)", u)
        conn.commit()
        
        def login(email):
            r = requests.post(f"{base_url}/api/auth/login", json={"email": email, "password": "password"})
            return r.json().get("access_token")

        # 3. Test Unauthorized
        print("\n--- Test Sans Token ---")
        assert requests.get(f"{base_url}/api/auth/me").status_code == 401
        assert requests.get(f"{base_url}/api/users").status_code == 401
        assert requests.get(f"{base_url}/analytics/logs").status_code == 401
        assert requests.post(f"{base_url}/api/documents/generate", json={}).status_code == 401
        assert requests.get(f"{base_url}/meetings").status_code == 401
        print("OK")

        # 4. Test Login Admin
        print("\n--- Test Admin ---")
        token_admin = login("admin@test.com")
        headers_admin = {"Authorization": f"Bearer {token_admin}"}
        
        me = requests.get(f"{base_url}/api/auth/me", headers=headers_admin)
        assert me.status_code == 200
        assert me.json()["user"]["role"] == "admin"
        
        assert requests.get(f"{base_url}/api/users", headers=headers_admin).status_code == 200
        assert requests.get(f"{base_url}/analytics/logs", headers=headers_admin).status_code == 200
        assert requests.get(f"{base_url}/meetings", headers=headers_admin).status_code == 200
        print("OK")

        # 5. Test Login Secretaire
        print("\n--- Test Secretaire ---")
        token_sec = login("sec@test.com")
        headers_sec = {"Authorization": f"Bearer {token_sec}"}
        
        assert requests.get(f"{base_url}/api/auth/me", headers=headers_sec).status_code == 200
        assert requests.get(f"{base_url}/api/users", headers=headers_sec).status_code == 403
        assert requests.get(f"{base_url}/analytics/logs", headers=headers_sec).status_code == 200
        assert requests.get(f"{base_url}/meetings", headers=headers_sec).status_code == 200
        print("OK")

        # 6. Test Login Employee
        print("\n--- Test Employee ---")
        token_emp = login("emp@test.com")
        headers_emp = {"Authorization": f"Bearer {token_emp}"}
        
        assert requests.get(f"{base_url}/api/auth/me", headers=headers_emp).status_code == 200
        assert requests.get(f"{base_url}/api/users", headers=headers_emp).status_code == 403
        assert requests.get(f"{base_url}/analytics/logs", headers=headers_emp).status_code == 403
        assert requests.get(f"{base_url}/meetings", headers=headers_emp).status_code == 403
        doc_res = requests.post(f"{base_url}/api/documents/generate", json={"type": "attestation_travail", "nom": "Test", "details": "", "optimiser_ia": False}, headers=headers_emp)
        assert doc_res.status_code == 200
        print("OK")

        # 7. Test Login Stagiaire
        print("\n--- Test Stagiaire ---")
        token_stag = login("stag@test.com")
        headers_stag = {"Authorization": f"Bearer {token_stag}"}
        
        assert requests.get(f"{base_url}/api/auth/me", headers=headers_stag).status_code == 200
        assert requests.get(f"{base_url}/api/users", headers=headers_stag).status_code == 403
        assert requests.get(f"{base_url}/analytics/logs", headers=headers_stag).status_code == 403
        assert requests.get(f"{base_url}/meetings", headers=headers_stag).status_code == 403
        assert requests.post(f"{base_url}/api/documents/generate", json={"type": "attestation_travail", "nom": "Test"}, headers=headers_stag).status_code == 403
        print("OK")

        # 8. Test disabled account
        print("\n--- Test Disabled Account ---")
        dis_res = requests.post(f"{base_url}/api/auth/login", json={"email": "dis@test.com", "password": "password"})
        assert dis_res.status_code in [400, 401, 403] # Depending on auth setup

        # Disable an active token
        cursor.execute("UPDATE employes SET is_active = 0 WHERE email = 'admin@test.com'")
        conn.commit()
        me_after_disable = requests.get(f"{base_url}/api/auth/me", headers=headers_admin)
        assert me_after_disable.status_code in [401, 403]
        
        # Restore
        cursor.execute("UPDATE employes SET is_active = 1 WHERE email = 'admin@test.com'")
        conn.commit()
        print("OK")

        print("\nTOUS LES TESTS SONT PASSES AVEC SUCCES")

    except Exception as e:
        print(f"\nERREUR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        server.terminate()
        conn.close()

if __name__ == "__main__":
    run_tests()
