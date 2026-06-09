import requests

base_url = "http://127.0.0.1:8000"

login_data = {"username": "souhaben535@gmail.com", "password": "secretariat2026"}
try:
    # First, let's login
    r_login = requests.post(f"{base_url}/auth/login", data=login_data)
    token = r_login.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Now trigger invitation
    data = {
        "titre": "Reunion de Test",
        "date": "2026-06-15",
        "heure": "14:00",
        "objet": "Sujet de test",
        "participants": "Hanane, Ahmed, Meryem"
    }
    r = requests.post(f"{base_url}/meetings/trigger-invitations", json=data, headers=headers)
    print("STATUS:", r.status_code)
    print("RESPONSE:", r.json())
except Exception as e:
    print(e)
