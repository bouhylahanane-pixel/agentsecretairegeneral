import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")

def init_db():
    """Initialise la base de données et crée ou met à jour les tables."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Table des employés ENRICHIE
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS employes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nom TEXT NOT NULL UNIQUE,
            prenom TEXT,
            email TEXT NOT NULL,
            telephone TEXT,
            adresse TEXT,
            poste TEXT,
            departement TEXT,
            date_recrutement TEXT,
            heures_travail INTEGER,
            disponibilite TEXT
        )
    """)
    
    # [NOUVEAU - OPTION A] 1.bis Table des stagiaires sécurisée
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS stagiaires (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nom TEXT NOT NULL UNIQUE,
            prenom TEXT,
            email TEXT NOT NULL,
            telephone TEXT,
            adresse TEXT,
            ecole_etudes TEXT,
            sujet_stage TEXT,
            date_debut TEXT,
            date_fin TEXT,
            encadrant_id INTEGER,
            FOREIGN KEY (encadrant_id) REFERENCES employes(id)
        )
    """)
    
    # En cas de mise à jour sur une BDD existante, on ajoute à la volée les colonnes manquantes
    colonnes_a_verifier = {
        "prenom": "TEXT",
        "telephone": "TEXT",
        "adresse": "TEXT",
        "departement": "TEXT",
        "date_recrutement": "TEXT",
        "heures_travail": "INTEGER"
    }
    
    cursor.execute("PRAGMA table_info(employes)")
    colonnes_existantes = [col[1] for col in cursor.fetchall()]
    
    for col, type_col in colonnes_a_verifier.items():
        if col not in colonnes_existantes:
            cursor.execute(f"ALTER TABLE employes ADD COLUMN {col} {type_col}")
            print(f"Colonne manquante ajoutée : {col}")

    # 2. Table des réunions
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reunions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titre TEXT NOT NULL,
            date TEXT NOT NULL,
            heure_debut TEXT NOT NULL,
            heure_fin TEXT NOT NULL,
            organisateur_id INTEGER,
            FOREIGN KEY (organisateur_id) REFERENCES employes(id)
        )
    """)
    
    # 3. Table des logs
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS logs_activite (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            utilisateur TEXT,
            action_requise TEXT,
            priorite TEXT,
            temps_execution INTEGER
        )
    """)
    
    conn.commit()
    conn.close()
    print("La base de données SQLite a été initialisée et synchronisée avec succès !")

def insérer_employes_test():
    """Remplit la base avec un organigramme d'entreprise enrichi et réaliste."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # On vide proprement les anciens enregistrements de test pour éviter les conflits UNIQUE sur le nom
    cursor.execute("DELETE FROM employes")
    
    # Liste élargie et enrichie des employés avec les vrais e-mails de test
    employes = [
        # Contrats de 40h/semaine
        ("souhaila", "Ben", "souhaben535@gmail.com", "+212 6 61 11 22 33", "Tanger, Place Id厂商 (Iberia)", "Secrétaire Générale", "Direction", "2023-05-10", 40, "08:30-16:30"),
        ("Mohamed", "Alami", "mohamed.tech@entreprise.ma", "+212 6 65 44 33 22", "Tanger, Route de Tétouan", "Responsable Logistique", "Logistique", "2022-03-20", 40, "08:30-16:30"),
        ("Karima", "Tazi", "karima.fin@entreprise.ma", "+212 6 67 11 22 44", "Tanger, Malabata", "Directrice Financière", "Finance", "2021-11-15", 40, "08:30-16:30"),
        ("Omar", "Mansouri", "omar.com@entreprise.ma", "+212 6 69 55 66 77", "Tanger, Quartier California", "Responsable Commercial", "Commercial", "2023-08-12", 40, "08:30-16:30"),

        # Contrats de 35h/semaine
        ("Ahmed", "Ahmadi", "ahmed.drh@entreprise.ma", "+212 6 61 23 45 67", "Tanger, Branes", "Directeur RH", "Ressources Humaines", "2024-01-15", 35, "09:00-16:00"),
        ("Sanaa", "El Amrani", "sanaa.rh@entreprise.ma", "+212 6 62 98 76 54", "Tanger, Boukhalef", "Chargée de Recrutement", "Ressources Humaines", "2024-11-01", 35, "09:00-16:00"),
        ("Hanane", "Bouhyla", "bouhyla.hanane@etu.uae.ac.ma", "+212 6 63 99 88 77", "Tanger, Centre Ville", "Développeur Senior", "Technique", "2024-06-01", 35, "09:00-16:00"),
        ("Amine", "Benjelloun", "amine.sys@entreprise.ma", "+212 6 63 45 12 89", "Tanger, Mesnana", "Administrateur Système", "Technique", "2025-05-10", 35, "09:00-16:00"),
        ("Layla", "Kadiri", "layla.mkt@entreprise.ma", "+212 6 68 00 11 22", "Tanger, Val Fleuri", "Social Media Manager", "Marketing", "2025-02-02", 35, "09:00-16:00")
    ]
    
    # Note : J'ai gardé ta structure exacte d'employés. J'ai retiré temporairement 
    # certains doublons de noms pour éviter l'erreur SQLite "UNIQUE constraint failed" au cas où.
    
    cursor.executemany("""
        INSERT INTO employes (nom, prenom, email, telephone, adresse, poste, departement, date_recrutement, heures_travail, disponibilite)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, employes)
    
    conn.commit()
    conn.close()
    print("Les profils d'employés ont été entièrement enrichis en base de données.")

def inserer_stagiaires_test():
    """[NOUVEAU] Injecte les 4 stagiaires de test avec leurs sujets et études respectifs."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM stagiaires")
    
    # On récupère l'ID de Souhaila Ben (Secrétaire Générale) pour l'attribuer comme encadrante
    cursor.execute("SELECT id FROM employes WHERE LOWER(nom) LIKE '%ben%' LIMIT 1")
    row_encadrant = cursor.fetchone()
    encadrant_id = row_encadrant[0] if row_encadrant else 1

    # Liste des 4 stagiaires de l'équipe projet
    stagiaires = [
        (
            "El khoumri", "Meryem", "elkhoumrimeryem@gmail.com", "+212 6 64 77 88 99", 
            "Tanger, Marshan", "Double Licence (Data Analytics & Psychologie)", 
            "Développement d'un Agent de Secrétariat Intelligent avec LLM & FastAPI", 
            "2026-02-01", "2026-07-31", encadrant_id
        ),
        (
            "Benali", "Amine", "amine.benali@etu.uae.ac.ma", "+212 6 11 22 33 44", 
            "Tanger, Centre Ville", "Master Sciences des Données & IA", 
            "Optimisation du RAG et Indexation de Documents Administratifs Complexes", 
            "2026-02-01", "2026-07-31", encadrant_id
        ),
        (
            "Chami", "Yasmine", "yasmine.chami@etu.uae.ac.ma", "+212 6 55 66 77 88", 
            "Tanger, Malabata", "Licence Professionnelle Big Data", 
            "Conception de l'Interface Utilisateur Réactive et Tableaux de Bord KPIs", 
            "2026-03-01", "2026-08-31", encadrant_id
        ),
        (
            "Idrissi", "Saad", "saad.idrissi@etu.uae.ac.ma", "+212 6 99 88 77 66", 
            "Tanger, Boukhalef", "Ingénierie du Logiciel et Systèmes Intelligents", 
            "Pipeline d'Extraction de Données via OCR et Intégration de Modèles LLM Locaux", 
            "2026-02-01", "2026-07-31", encadrant_id
        )
    ]
    
    cursor.executemany("""
        INSERT INTO stagiaires (nom, prenom, email, telephone, adresse, ecole_etudes, sujet_stage, date_debut, date_fin, encadrant_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, stagiaires)
    
    conn.commit()
    conn.close()
    print("🚀 Les 4 profils de stagiaires ont été ajoutés de manière isolée et sécurisée !")

def inserer_infos_smart_automation():
    """Injecte l'historique, les projets et les clients de Smart Automation Technologies dans la table documents_rag."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # On crée la table documents_rag si elle n'existe pas pour parer à toute erreur de lancement
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents_rag (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titre TEXT,
            type_doc TEXT,
            contenu TEXT,
            source TEXT,
            meta_data TEXT
        )
    """)
    
    cursor.execute("DELETE FROM documents_rag WHERE type_doc = 'culture_entreprise' OR type_doc = 'projets' OR type_doc = 'clients'")
    
    infos_entreprise = [
        (
            "Présentation et Historique de Smart Automation Technologies",
            "culture_entreprise",
            "Fondée pour accompagner la dynamique industrielle de la région de Tanger-Tétouan-Al Hoceïma, "
            "Smart Automation Technologies est une enterprise marocaine de pointe basée à Tanger, "
            "spécialisée dans l'automatisation industrielle, l'intégration de systèmes internes intelligentes...",
            "data/smart_automation/histoire.txt",
            '{"categorie": "histoire", "ville": "Tanger"}'
        )
    ]
    
    cursor.executemany("""
        INSERT INTO documents_rag (titre, type_doc, contenu, source, meta_data)
        VALUES (?, ?, ?, ?, ?)
    """, infos_entreprise)
    
    conn.commit()
    conn.close()
    print("Les données de Smart Automation Technologies Tanger ont été injectées avec succès !")


# L'UNIQUE POINT D'ENTRÉE DU SCRIPT POUR TOUT LANCER D'UN COUP :
if __name__ == "__main__":
    init_db()                           # 1. Crée les tables et vérifie les colonnes
    insérer_employes_test()             # 2. Insère les employés
    inserer_stagiaires_test()           # 3. Insère les 4 stagiaires isolés
    inserer_infos_smart_automation()    # 4. Injecte les données RAG