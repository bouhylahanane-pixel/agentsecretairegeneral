import sqlite3
import sys
import logging
from datetime import UTC, datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

logging.getLogger("passlib.handlers.bcrypt").setLevel(logging.ERROR)

from api.routers.auth import DB_PATH, pwd_context
from data.database_manager import init_db


V1_USERS = [
    {
        "nom": "Admin V1",
        "prenom": "Test",
        "email": "admin@test.com",
        "password": "admin123",
        "poste": "admin",
        "departement": "Direction",
    },
    {
        "nom": "Secretaire V1",
        "prenom": "Test",
        "email": "secretaire@test.com",
        "password": "secretaire123",
        "poste": "secretaire",
        "departement": "Secretariat General",
    },
    {
        "nom": "Employee V1",
        "prenom": "Test",
        "email": "employee@test.com",
        "password": "employee123",
        "poste": "employee",
        "departement": "Operations",
    },
    {
        "nom": "Stagiaire V1",
        "prenom": "Test",
        "email": "stagiaire@test.com",
        "password": "stagiaire123",
        "poste": "stagiaire",
        "departement": "Stage",
    },
]


def _row_count_for_email(cursor: sqlite3.Cursor, email: str) -> int:
    cursor.execute("SELECT COUNT(*) FROM employes WHERE email = ?", (email,))
    return int(cursor.fetchone()[0])


def seed_v1_users() -> list[dict]:
    init_db()

    db_path = Path(DB_PATH).resolve()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    now = datetime.now(UTC).isoformat()
    summary = []

    for user in V1_USERS:
        hashed_password = pwd_context.hash(user["password"])
        cursor.execute("SELECT id FROM employes WHERE email = ? ORDER BY id LIMIT 1", (user["email"],))
        existing = cursor.fetchone()

        if existing:
            cursor.execute(
                """
                UPDATE employes
                SET nom = ?, prenom = ?, poste = ?, departement = ?, mot_de_passe = ?,
                    is_active = 1, updated_at = ?
                WHERE id = ?
                """,
                (
                    user["nom"],
                    user["prenom"],
                    user["poste"],
                    user["departement"],
                    hashed_password,
                    now,
                    existing["id"],
                ),
            )
            action = "updated"
            user_id = existing["id"]
        else:
            cursor.execute(
                """
                INSERT INTO employes (
                    nom, prenom, email, poste, departement, mot_de_passe,
                    is_active, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
                """,
                (
                    user["nom"],
                    user["prenom"],
                    user["email"],
                    user["poste"],
                    user["departement"],
                    hashed_password,
                    now,
                    now,
                ),
            )
            action = "created"
            user_id = cursor.lastrowid

        summary.append(
            {
                "id": user_id,
                "email": user["email"],
                "role": user["poste"],
                "action": action,
                "is_active": 1,
                "hash_present": True,
                "hash_len": len(hashed_password),
                "hash_prefix": hashed_password[:4],
                "email_count_after": _row_count_for_email(cursor, user["email"]),
            }
        )

    conn.commit()
    conn.close()
    return summary


if __name__ == "__main__":
    print(f"Database: {Path(DB_PATH).resolve()}")
    for item in seed_v1_users():
        print(
            f"{item['action'].upper()}: {item['email']} | role={item['role']} | "
            f"active={item['is_active']} | hash=yes len={item['hash_len']} "
            f"prefix={item['hash_prefix']} | email_count={item['email_count_after']}"
        )
