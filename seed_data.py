# -*- coding: utf-8 -*-
"""
Script d'injection de données de démonstration complètes.
Exécute toutes les insertions nécessaires pour alimenter le Dashboard,
le registre des réunions, l'historique des PV et les logs d'activité.
"""
import sqlite3
import os
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "database.db")

def seed_all():
    # 1. Initialiser la BDD (tables + colonnes manquantes)
    from data.database_manager import init_db, insérer_employes_test, inserer_stagiaires_test
    init_db()
    insérer_employes_test()
    inserer_stagiaires_test()

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # ============================================================
    # 2. RÉUNIONS PLANIFIÉES (table reunions)
    # ============================================================
    cursor.execute("DELETE FROM reunions")
    reunions = [
        ("Comité de Direction - Bilan T1 2026",         "2026-06-05", "09:00", "10:30", 1),
        ("Revue de Sprint #14 - Agent IA",              "2026-06-06", "14:00", "15:00", 1),
        ("Point RH - Intégration Nouveaux Stagiaires",  "2026-06-09", "10:00", "11:00", 1),
        ("Réunion Budget Prévisionnel S2",              "2026-06-10", "09:30", "11:00", 1),
        ("Formation Interne - Sécurité des Données",    "2026-06-12", "14:30", "16:00", 1),
        ("Conseil d'Administration Extraordinaire",     "2026-06-16", "09:00", "12:00", 1),
        ("Suivi Projet Digitalisation Secrétariat",     "2026-06-18", "11:00", "12:00", 1),
    ]
    cursor.executemany("""
        INSERT INTO reunions (titre, date, heure_debut, heure_fin, organisateur_id)
        VALUES (?, ?, ?, ?, ?)
    """, reunions)

    # ============================================================
    # 3. LOGS D'ACTIVITÉ (table logs_activite) - pour le Dashboard
    # ============================================================
    cursor.execute("DELETE FROM logs_activite")
    logs = [
        ("2026-06-01 09:15:00", "Meryem",  "generate_document",  "Normale", 1250),
        ("2026-06-01 09:32:00", "Meryem",  "generate_document",  "Normale", 980),
        ("2026-06-01 10:05:00", "Sanaa",   "create_meeting",     "Normale", 420),
        ("2026-06-01 10:45:00", "Ahmed",   "generate_document",  "Haute",   2100),
        ("2026-06-01 11:20:00", "Meryem",  "consult_regulation", "Normale", 310),
        ("2026-06-01 14:00:00", "Hanane",  "generate_document",  "Normale", 1500),
        ("2026-06-01 15:30:00", "Meryem",  "generate_pv",        "Haute",   8500),
        ("2026-06-01 16:10:00", "Karima",  "generate_document",  "Normale", 1100),
        ("2026-06-02 08:45:00", "Meryem",  "create_meeting",     "Normale", 350),
        ("2026-06-02 09:00:00", "Omar",    "generate_document",  "Normale", 1320),
        ("2026-06-02 09:30:00", "Sanaa",   "generate_document",  "Haute",   1800),
        ("2026-06-02 10:15:00", "Ahmed",   "consult_regulation", "Normale", 280),
        ("2026-06-02 11:00:00", "Meryem",  "generate_document",  "Normale", 950),
        ("2026-06-02 14:30:00", "Amine",   "generate_document",  "Normale", 1600),
        ("2026-06-02 15:00:00", "Meryem",  "generate_pv",        "Normale", 7200),
        ("2026-06-02 16:45:00", "Layla",   "process_email",      "Normale", 520),
        ("2026-06-03 08:30:00", "Meryem",  "generate_document",  "Normale", 1050),
        ("2026-06-03 09:15:00", "Hanane",  "create_meeting",     "Haute",   380),
        ("2026-06-03 10:00:00", "Sanaa",   "generate_document",  "Normale", 1400),
        ("2026-06-03 10:45:00", "Meryem",  "consult_regulation", "Normale", 290),
        ("2026-06-03 11:30:00", "Ahmed",   "generate_document",  "Normale", 1150),
        ("2026-06-03 14:00:00", "Meryem",  "generate_pv",        "Haute",   9100),
        ("2026-06-03 15:30:00", "Omar",    "process_email",      "Normale", 450),
        ("2026-06-03 16:00:00", "Karima",  "generate_document",  "Normale", 1300),
        ("2026-06-03 16:30:00", "Meryem",  "create_meeting",     "Normale", 400),
    ]
    cursor.executemany("""
        INSERT INTO logs_activite (timestamp, utilisateur, action_requise, priorite, temps_execution)
        VALUES (?, ?, ?, ?, ?)
    """, logs)

    # ============================================================
    # 4. HISTORIQUE DES PV (table historique_pv)
    # ============================================================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS historique_pv (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            participants TEXT,
            objet TEXT,
            details TEXT,
            decisions TEXT,
            actions TEXT,
            next_meeting TEXT,
            transcription TEXT,
            pdf_path TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("DELETE FROM historique_pv")

    pvs = [
        (
            "2026-05-26",
            "Meryem, Sanaa, Ahmed",
            "Suivi de projet - Secrétariat Intelligent",
            "Meryem a présenté l'avancement du module de génération automatique de PV. Sanaa a validé les tests d'intégration du RAG avec la base documentaire. Ahmed a confirmé la mise en production du pipeline de transcription Whisper.",
            json.dumps(["Validation du module PV pour la production", "Lancement de la phase de tests utilisateurs", "Allocation d'un budget supplémentaire pour l'infrastructure cloud"], ensure_ascii=False),
            json.dumps(["Meryem : Finaliser l'interface React du générateur de PV", "Sanaa : Préparer le rapport de tests d'intégration", "Ahmed : Configurer le serveur de production"], ensure_ascii=False),
            "2026-06-02 à 10h00",
            "Transcription complète de la réunion du 26 mai...",
            "outputs/pv_2026-05-26.pdf"
        ),
        (
            "2026-06-02",
            "Meryem, Hanane, Karima, Omar",
            "Comité de Direction - Revue Stratégique T2",
            "Karima a présenté les résultats financiers du premier trimestre. Omar a détaillé la stratégie commerciale pour le second semestre. Hanane a exposé l'état d'avancement des développements techniques. Meryem a coordonné les décisions et planifié les prochaines échéances.",
            json.dumps(["Augmentation du budget R&D de 15%", "Lancement du nouveau module de convocations automatiques", "Recrutement de 2 développeurs supplémentaires"], ensure_ascii=False),
            json.dumps(["Karima : Soumettre le rapport financier au CA", "Omar : Préparer le plan commercial S2", "Hanane : Livrer le module de convocations d'ici le 15 juin", "Meryem : Organiser le prochain conseil d'administration"], ensure_ascii=False),
            "2026-06-09 à 09h30",
            "Transcription complète de la réunion du 2 juin...",
            "outputs/pv_2026-06-02.pdf"
        ),
        (
            "2026-06-03",
            "Meryem, Sanaa, Amine",
            "Point Technique - Pipeline IA et Sécurité",
            "Amine a présenté les résultats de l'audit de sécurité du serveur FastAPI. Sanaa a confirmé la stabilité du module RAG après les dernières optimisations. Meryem a proposé l'ajout d'un système de journalisation avancé pour tracer toutes les actions de l'agent IA.",
            json.dumps(["Mise en place du chiffrement TLS pour les communications API", "Activation de la journalisation avancée", "Migration vers Python 3.12 planifiée"], ensure_ascii=False),
            json.dumps(["Amine : Déployer les certificats SSL sur le serveur", "Sanaa : Documenter les endpoints de l'API v3", "Meryem : Implémenter le système de logs dans le frontend"], ensure_ascii=False),
            "2026-06-10 à 14h00",
            "Transcription complète de la réunion du 3 juin...",
            "outputs/pv_2026-06-03.pdf"
        ),
    ]
    cursor.executemany("""
        INSERT INTO historique_pv (date, participants, objet, details, decisions, actions, next_meeting, transcription, pdf_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, pvs)

    conn.commit()
    conn.close()
    print("=" * 60)
    print("  INJECTION DE DONNÉES TERMINÉE AVEC SUCCÈS")
    print("=" * 60)
    print(f"  - 9 employés + 4 stagiaires")
    print(f"  - {len(reunions)} réunions planifiées")
    print(f"  - {len(logs)} logs d'activité")
    print(f"  - {len(pvs)} procès-verbaux archivés")
    print("=" * 60)

if __name__ == "__main__":
    seed_all()
