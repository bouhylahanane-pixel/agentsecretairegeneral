import os
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from api.routers.auth import require_roles

router = APIRouter(prefix="/api/config", tags=["Config"])

ENV_PATH = os.path.join(os.path.dirname(__file__), "..", "..", ".env")

# Mapping between frontend key IDs and .env variable names
KEY_MAP = {
    "groq_api_key": "GROQ_API_KEY",
    "smtp_password": "EMAIL_PASSWORD",
    "smtp_email": "EMAIL_USER",
    "jwt_secret": "JWT_SECRET_KEY",
}


class ConfigUpdate(BaseModel):
    key_id: str
    value: str


class ConfigBulkUpdate(BaseModel):
    updates: list[ConfigUpdate]


def read_env_file() -> dict[str, str]:
    """Parse the .env file into a dict."""
    env_vars: dict[str, str] = {}
    if not os.path.exists(ENV_PATH):
        return env_vars
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, value = line.partition("=")
                env_vars[key.strip()] = value.strip()
    return env_vars


def write_env_file(env_vars: dict[str, str]):
    """Write the dict back to the .env file, preserving comments."""
    lines: list[str] = []
    existing_keys: set[str] = set()

    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                stripped = line.strip()
                if stripped and not stripped.startswith("#") and "=" in stripped:
                    key = stripped.split("=", 1)[0].strip()
                    if key in env_vars:
                        lines.append(f"{key}={env_vars[key]}\n")
                        existing_keys.add(key)
                    else:
                        lines.append(line if line.endswith("\n") else line + "\n")
                else:
                    lines.append(line if line.endswith("\n") else line + "\n")

    # Add any new keys that weren't in the file yet
    for key, value in env_vars.items():
        if key not in existing_keys:
            lines.append(f"{key}={value}\n")

    with open(ENV_PATH, "w", encoding="utf-8") as f:
        f.writelines(lines)


def mask_value(value: str) -> str:
    """Mask a secret value for display, showing only first 4 and last 4 chars."""
    if len(value) <= 8:
        return "••••••••"
    return value[:4] + "••••••••" + value[-4:]


@router.get("/keys")
async def get_config_keys(current_user: dict = Depends(require_roles(["admin"]))):
    """Get the current config keys (masked values)."""
    env_vars = read_env_file()
    result = []
    for frontend_id, env_name in KEY_MAP.items():
        raw_value = env_vars.get(env_name, "")
        result.append({
            "key_id": frontend_id,
            "env_name": env_name,
            "has_value": bool(raw_value),
            "masked_value": mask_value(raw_value) if raw_value else "",
        })
    return result


@router.put("/keys/{key_id}")
async def update_config_key(key_id: str, body: ConfigUpdate, current_user: dict = Depends(require_roles(["admin"]))):
    """Update a single config key in .env."""
    if key_id not in KEY_MAP:
        raise HTTPException(status_code=400, detail=f"Clé inconnue : {key_id}")

    env_name = KEY_MAP[key_id]
    env_vars = read_env_file()
    env_vars[env_name] = body.value
    write_env_file(env_vars)

    # Also update the current process environment so changes take effect immediately
    os.environ[env_name] = body.value

    return {"status": "ok", "message": f"La clé {env_name} a été mise à jour avec succès."}


@router.put("/keys")
async def update_all_config_keys(body: ConfigBulkUpdate, current_user: dict = Depends(require_roles(["admin"]))):
    """Update multiple config keys at once."""
    env_vars = read_env_file()

    for update in body.updates:
        if update.key_id not in KEY_MAP:
            continue
        env_name = KEY_MAP[update.key_id]
        if update.value:  # Only update non-empty values
            env_vars[env_name] = update.value
            os.environ[env_name] = update.value

    write_env_file(env_vars)
    return {"status": "ok", "message": "Toutes les clés ont été mises à jour."}
