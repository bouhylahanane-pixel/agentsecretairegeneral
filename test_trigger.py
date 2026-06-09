from main import trigger_invitations
import asyncio

data = {
    "titre": "Reunion de Test",
    "date": "2026-06-15",
    "heure": "14:00",
    "objet": "Sujet de test",
    "participants": "Hanane, Ahmed, Meryem"
}

user = {
    "email": "souhaben535@gmail.com",
    "name": "Secrétaire",
    "roles": ["secretaire"]
}

async def run():
    res = await trigger_invitations(data, user)
    print(res)

asyncio.run(run())
