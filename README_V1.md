# Secrétariat Général IA — V1

## 1. Présentation
Application web de secrétariat général assisté par IA permettant l’authentification par rôle, la génération de documents administratifs, la création de procès-verbaux, la gestion de réunions, la gestion des utilisateurs et le suivi d’activité.

## 2. Fonctionnalités V1
* Login sécurisé JWT.
* Gestion stricte des rôles (RBAC).
* Gestion complète des utilisateurs (Admin).
* Dashboard simplifié.
* Génération de documents PDF.
* Optimisation IA si disponible.
* Procès-verbaux IA depuis fichier audio, microphone ou notes textes.
* Gestion des réunions.
* Invitations aux réunions par email.
* Journal d’activité (Historique).

## 3. Rôles et permissions

| Module | Admin | Secrétaire | Employé | Stagiaire |
| :--- | :--- | :--- | :--- | :--- |
| **Dashboard** | ✅ Oui | ✅ Oui | ✅ Oui | ✅ Oui (Lecture seule) |
| **Documents** | ✅ Oui | ✅ Oui | ✅ Oui | ❌ Non |
| **Procès-Verbaux** | ✅ Oui | ✅ Oui | ❌ Non | ❌ Non |
| **Réunions** | ✅ Oui | ✅ Oui | ❌ Non | ❌ Non |
| **Utilisateurs** | ✅ Oui | ❌ Non | ❌ Non | ❌ Non |
| **Historique** | ✅ Oui | ✅ Oui | ❌ Non | ❌ Non |

## 4. Installation backend
```bash
python -m venv venv
# Activer l'environnement
source venv/bin/activate  # Sur macOS/Linux
venv\Scripts\activate     # Sur Windows

pip install -r requirements.txt
uvicorn main:app --reload
```

## 5. Installation frontend
```bash
cd frontend
npm install
npm run dev
# Pour compiler vers la production :
npm run build
```

## 6. Variables d’environnement
Définies dans le fichier `.env` à la racine :
* `GROQ_API_KEY` : Requis pour Whisper (audio) et Llama (texte).
* `JWT_SECRET_KEY` : (Optionnel) Clé de signature JWT.
* `SMTP_HOST` : Pour l'envoi d'invitations aux réunions.
* `SMTP_PORT`
* `SMTP_USER`
* `SMTP_PASSWORD`

## 7. Pages V1
* `/login` : Authentification
* `/dashboard` : Statistiques
* `/documents` : Génération
* `/proces-verbaux` : Génération IA
* `/reunions` : Calendrier
* `/users` : Panel Admin
* `/historique` : Activité
* `/unauthorized` : Erreur 403

## 8. Endpoints backend principaux
* **Auth** : `/api/auth/login`, `/api/auth/me`
* **Users** : `/api/users/*`
* **Dashboard/Analytics** : `/analytics/stats`, `/analytics/chart`, `/analytics/logs`
* **Documents** : `/api/documents/generate`, `/download/*`
* **Procès-Verbaux** : `/agent/generate-pv`, `/agent/upload-pv`, `/agent/transcribe`, `/agent/structure-text`, `/meetings/history`
* **Réunions** : `/meetings/*`
* **Historique** : `/analytics/logs`

## 9. Tests de validation
L'intégrité de la V1 a été validée par un protocole HTTP strict :
* `python -c "import main"`
* Lancement par `uvicorn`
* Validation HTTP (`scratch_test.py`)
* `npm run build`

Points validés :
* 401 sans token ;
* 403 rôle interdit ;
* accès admin ;
* compte désactivé bloqué ;
* génération document ;
* routes frontend correctement restreintes.

## 10. Limites V1
* SMTP limité aux invitations réunion (pas d’envoi d'email de documents).
* Pas d’export CSV de l'historique ou des utilisateurs.
* Pas de signature électronique des documents PDF.
* Pas de workflow de validation (Brouillon -> Validé).
* Logs simples, pas d'audit réglementaire complet ni d'inaltérabilité cryptographique.
* SQLite utilisé pour la V1 (pas de SGBD externe).
* Dépendance forte à l'API externe Groq pour l'IA/transcription.

## 11. Backlog V2
* Centre SMTP complet (Suivi, file d'attente, relances).
* Export CSV global.
* Audit avancé immuable.
* Dashboard technique (Statuts API, Logs erreurs).
* Workflow de validation des documents.
* Signature électronique certifiée.
* Gestion documentaire avancée (Stockage S3).
* Migration vers PostgreSQL et SQLAlchemy.
* Tests automatisés avec Pytest et Playwright.
