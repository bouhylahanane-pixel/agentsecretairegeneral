# Agent Secrétariat Général Intelligent

Système avancé d'assistant IA de Secrétariat Général combinant un backend Python/FastAPI avec LLM et une interface React/Vite.

## 🚀 Installation & Démarrage

### 1. Pré-requis
- Python 3.10+
- Node.js 18+

### 2. Configuration du Backend

```bash
# 1. Installer les dépendances
pip install -r requirements.txt

# 2. Configurer les variables d'environnement
# Copiez .env.example vers .env et ajoutez vos clés (GROQ_API_KEY, etc.)
cp .env.example .env

# 3. Démarrer le serveur (les bases de données s'initialiseront automatiquement)
uvicorn main:app --reload --host 0.0.0.1 --port 8000
```
Le backend sera disponible sur `http://localhost:8000`. Vous pouvez consulter la documentation de l'API sur `http://localhost:8000/docs`.

### 3. Configuration du Frontend

```bash
cd frontend

# 1. Installer les dépendances
npm install

# 2. Démarrer le serveur de développement
npm run dev
```
Le frontend sera disponible sur `http://localhost:5173`.

## 🛠️ Fonctionnalités Principales

- **Tableau de Bord KPI** : Suivi analytique complet
- **Agent Conversationnel IA (Groq/LLaMA 3.3)** : Analyse sémantique des requêtes
- **Générateur de Procès-Verbaux** : Création automatique de PV PDF à partir de l'audio
- **RAG (Retrieval-Augmented Generation)** : Base de connaissances documentaire (Règlement, FAQ)
- **Gestionnaire de Réunions** : Planification avec détection de conflits SQL
