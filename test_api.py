import requests

# Assuming uvicorn is running on port 8000
base_url = "http://127.0.0.1:8000"

# 1. Login as mohamed
login_data = {"email": "mohamed.tech@entreprise.ma", "password": "secretariat2026"}
# Wait, from debug_login.txt, the password hash is legacy_plaintext:UnknownHashError and hash is 'secr' or 'secretariat2026'.
# Let's try 'secretariat2026'.
resp = requests.post(f"{base_url}/api/auth/login", json=login_data)
if resp.status_code == 200:
    token = resp.json()["access_token"]
    print("Logged in!")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Get users
    users_resp = requests.get(f"{base_url}/api/users", headers=headers)
    users = users_resp.json()
    user_to_edit = [u for u in users if u["email"] == "souhaben535@gmail.com"][0]
    print("Before:", user_to_edit["role"])
    
    # 3. Patch role
    patch_resp = requests.patch(f"{base_url}/api/users/{user_to_edit['id']}/role", headers=headers, json={"role": "stagiaire"})
    print("Patch status:", patch_resp.status_code)
    print("Patch response:", patch_resp.text)
    
    # 4. Get users again
    users_resp2 = requests.get(f"{base_url}/api/users", headers=headers)
    user_to_edit2 = [u for u in users_resp2.json() if u["email"] == "souhaben535@gmail.com"][0]
    print("After:", user_to_edit2["role"])
else:
    print("Login failed:", resp.status_code, resp.text)
