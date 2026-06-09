import sqlite3
import os
# pyrefly: ignore [missing-import]
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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
            disponibilite TEXT,
            mot_de_passe TEXT
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
        "heures_travail": "INTEGER",
        "disponibilite": "TEXT",
        "cin": "TEXT",
        "mot_de_passe": "TEXT",
        "is_active": "INTEGER DEFAULT 1",
        "created_at": "TEXT DEFAULT ''",
        "updated_at": "TEXT DEFAULT ''",
        "last_login": "TEXT"
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
            lieu TEXT,
            participants TEXT,
            objet TEXT,
            organisateur_id INTEGER,
            FOREIGN KEY (organisateur_id) REFERENCES employes(id)
        )
    """)
    
    cursor.execute("PRAGMA table_info(reunions)")
    colonnes_reunions = [col[1] for col in cursor.fetchall()]
    if "lieu" not in colonnes_reunions:
        cursor.execute("ALTER TABLE reunions ADD COLUMN lieu TEXT")
        print("Colonne lieu ajoutée à la table reunions")
    if "participants" not in colonnes_reunions:
        cursor.execute("ALTER TABLE reunions ADD COLUMN participants TEXT")
        print("Colonne participants ajoutée à la table reunions")
    if "objet" not in colonnes_reunions:
        cursor.execute("ALTER TABLE reunions ADD COLUMN objet TEXT")
        print("Colonne objet ajoutée à la table reunions")
    
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
    
    # 4. Table des demandes entrantes
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS demandes_entrantes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            req_id TEXT UNIQUE,
            from_email TEXT,
            subject TEXT,
            date TEXT,
            urgency TEXT,
            email_brut TEXT
        )
    """)
    
    # 5. Table des notifications
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type_notif TEXT,
            text TEXT,
            time_str TEXT
        )
    """)
    
    conn.commit()
    conn.close()
    print("La base de données SQLite a été initialisée et synchronisée avec succès !")

def insérer_employes_test():
    """Remplit la base avec un organigramme d'entreprise enrichi et réaliste.
    Ne réinitialise PAS les données si des employés existent déjà (pour préserver les modifications)."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Vérifier si des employés existent déjà — si oui, ne pas écraser les données
    cursor.execute("SELECT COUNT(*) FROM employes")
    count = cursor.fetchone()[0]
    if count > 0:
        conn.close()
        print(f"Les employés existent déjà ({count} enregistrements). Seed ignoré pour préserver les modifications.")
        return
    
    # Liste élargie et enrichie des employés avec les vrais e-mails de test
    hashed_password = pwd_context.hash("secretariat2026")
    employes = [
        # Contrats de 40h/semaine
        ("souhaila", "Ben", "souhaben535@gmail.com", "+212 6 61 11 22 33", "Tanger, Place Id厂商 (Iberia)", "secretaire", "Direction", "2023-05-10", 40, "08:30-16:30", hashed_password),
        ("Mohamed", "Alami", "mohamed.tech@entreprise.ma", "+212 6 65 44 33 22", "Tanger, Route de Tétouan", "employee", "Logistique", "2022-03-20", 40, "08:30-16:30", hashed_password),
        ("Karima", "Tazi", "karima.fin@entreprise.ma", "+212 6 67 11 22 44", "Tanger, Malabata", "employee", "Finance", "2021-11-15", 40, "08:30-16:30", hashed_password),
        ("Omar", "Mansouri", "omar.com@entreprise.ma", "+212 6 69 55 66 77", "Tanger, Quartier California", "employee", "Commercial", "2023-08-12", 40, "08:30-16:30", hashed_password),

        # Contrats de 35h/semaine
        ("Ahmed", "Ahmadi", "ahmed.drh@entreprise.ma", "+212 6 61 23 45 67", "Tanger, Branes", "employee", "Ressources Humaines", "2024-01-15", 35, "09:00-16:00", hashed_password),
        ("Sanaa", "El Amrani", "sanaa.rh@entreprise.ma", "+212 6 62 98 76 54", "Tanger, Boukhalef", "secretaire", "Ressources Humaines", "2024-11-01", 35, "09:00-16:00", hashed_password),
        ("Hanane", "Bouhyla", "hananeymed2020@gmail.com", "+212 6 63 99 88 77", "Tanger, Centre Ville", "employee", "Technique", "2024-06-01", 35, "09:00-16:00", "hanane123"),
        ("Amine", "Benjelloun", "amine.sys@entreprise.ma", "+212 6 63 45 12 89", "Tanger, Mesnana", "employee", "Technique", "2025-05-10", 35, "09:00-16:00", hashed_password),
        ("Layla", "Kadiri", "layla.mkt@entreprise.ma", "+212 6 68 00 11 22", "Tanger, Val Fleuri", "employee", "Marketing", "2025-02-02", 35, "09:00-16:00", hashed_password)
    ]
    
    cursor.executemany("""
        INSERT INTO employes (nom, prenom, email, telephone, adresse, poste, departement, date_recrutement, heures_travail, disponibilite, mot_de_passe)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    print("Les 4 profils de stagiaires ont été ajoutés de manière isolée et sécurisée !")

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
            "Smart Automation Technologies (SAT) est une entreprise marocaine de pointe basée à Tanger, spécialisée dans l'automatisation industrielle, la robotique, et l'intégration de systèmes intelligents. Elle a été fondée le 15 Janvier 2018 par Monsieur Younes El Fassi, un ingénieur visionnaire passionné par l'industrie 4.0. L'entreprise est située dans la Zone Franche de Tanger (Tanger Free Zone), Lot 45, Bâtiment A. Elle accompagne la dynamique industrielle de la région de Tanger-Tétouan-Al Hoceïma, particulièrement les secteurs automobile et aéronautique.",
            "data/smart_automation/histoire.txt",
            '{"categorie": "histoire", "ville": "Tanger"}'
        ),
        (
            "Services et Produits",
            "culture_entreprise",
            "Smart Automation Technologies propose trois domaines d'expertise majeurs : 1) La conception et le déploiement de chaînes de montage robotisées. 2) Le développement de logiciels sur-mesure de type ERP et de supervision industrielle (SCADA). 3) L'intégration de l'Intelligence Artificielle pour la maintenance prédictive et la gestion intelligente des ressources. SAT emploie actuellement 35 ingénieurs et techniciens hautement qualifiés.",
            "data/smart_automation/services.txt",
            '{"categorie": "services", "domaine": "IA et Robotique"}'
        )
    ]
    
    cursor.executemany("""
        INSERT INTO documents_rag (titre, type_doc, contenu, source, meta_data)
        VALUES (?, ?, ?, ?, ?)
    """, infos_entreprise)
    
    conn.commit()
    conn.close()
    print("Les données de Smart Automation Technologies Tanger ont été injectées avec succès !")


def inserer_mock_data_frontend():
    """Injecte les données mock du frontend dans la BDD."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Demandes
    cursor.execute("DELETE FROM demandes_entrantes")
    demandes = [
        ("req-01", "legal@entreprise.ma", "Notification de mise en conformité Loi 17-95 sur les SA", "03 Juin 14:22", "LEGAL COMPLIANCE", "Madame la Secrétaire Générale,\n\nConformément à la loi 17-95 relative aux sociétés anonymes, nous vous prions de transmettre les statuts mis à jour et le registre des décisions du Conseil avant le 15 juin.\n\nCordialement,\nService Juridique"),
        ("req-02", "mohamed.alami@logistique.ma", "Demande d'achat de licences logicielles CAO pour l'équipe technique", "03 Juin 11:05", "ROUTINE", "Bonjour,\n\nNous sollicitons l'achat de 5 licences CAO pour le département technique. Budget estimé : 45 000 MAD. Merci de valider pour imputation budgétaire.\n\nMohamed Alami"),
        ("req-03", "secretaire-general@finances.gov.ma", "Convocations audit fiscal obligatoire exercice 2025", "02 Juin 16:45", "HIGH URGENCY", "Notification officielle : audit de contrôle fiscal de l'administration. Délai impératif de 15 jours pour fournir l'ensemble des PV, registres et pièces comptables de l'exercice 2025.\n\nDirection des Finances"),
        ("req-04", "sanaa.rh@entreprise.ma", "Fiches d'objectifs et sujets de stage des 4 stagiaires IA", "02 Juin 09:30", "ROUTINE", "Bonjour Meryem,\n\nVeuillez trouver ci-joint les fiches d'objectifs des stagiaires (Meryem, Saad, etc.). À aborder lors du point de coordination hebdomadaire.\n\nSanaa — RH")
    ]
    cursor.executemany("""
        INSERT INTO demandes_entrantes (req_id, from_email, subject, date, urgency, email_brut)
        VALUES (?, ?, ?, ?, ?, ?)
    """, demandes)
    
    # Notifications
    cursor.execute("DELETE FROM notifications")
    notifications = [
        ("warning", "Nouvelle requête [HIGH URGENCY] détectée par LLaMA 3.3", "Il y a 5 min"),
        ("success", "PV_Conseil_2026-06-03.pdf généré et archivé avec succès", "Il y a 30 min"),
        ("info", "4 nouvelles tâches extraites du dernier PV", "Il y a 1h"),
        ("error", "Échec d'envoi SMTP (Convocations Conseil Stratégique)", "Il y a 2h")
    ]
    cursor.executemany("""
        INSERT INTO notifications (type_notif, text, time_str)
        VALUES (?, ?, ?)
    """, notifications)
    
    conn.commit()
    conn.close()
    print("Les données mock du frontend ont été migrées vers SQLite !")

# L'UNIQUE POINT D'ENTRÉE DU SCRIPT POUR TOUT LANCER D'UN COUP :
if __name__ == "__main__":
    init_db()                           # 1. Crée les tables et vérifie les colonnes
    insérer_employes_test()             # 2. Insère les employés
    inserer_stagiaires_test()           # 3. Insère les 4 stagiaires isolés
    inserer_infos_smart_automation()    # 4. Injecte les données RAG
    inserer_mock_data_frontend()        # 5. Injecte les données du dashboard