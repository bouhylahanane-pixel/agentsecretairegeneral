import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")

def init_db():
    """Initialise la base de données et crée les tables si elles n'existent pas."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Table des employés (Correction : NOT NULL au lieu de NOT EXISTS)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS employes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nom TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL,
            poste TEXT,
            disponibilite TEXT
        )
    """)
    
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
    print("La base de données SQLite a été initialisée avec succès !")

def insérer_employes_test():
    """Remplit la base avec un organigramme d'entreprise complet (10 personnes)."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM employes")
    if cursor.fetchone()[0] == 0:
        # Liste élargie à 10 employés pour simuler plusieurs départements
        employes = [
            # Direction & Secrétariat
            ("Fatima", "fatima.sec@entreprise.ma", "Secrétaire Générale", "08:00-16:30"),
            ("Meryem", "meryem.pfe@entreprise.ma", "Analyste Data & IA", "08:30-18:00"),
            
            # Ressources Humaines
            ("Ahmed", "ahmed.drh@entreprise.ma", "Directeur RH", "09:00-17:00"),
            ("Sanaa", "sanaa.rh@entreprise.ma", "Chargée de Recrutement", "09:00-17:30"),
            
            # Technique & Informatique
            ("Mohamed", "mohamed.tech@entreprise.ma", "Responsable Logistique", "10:00-18:00"),
            ("Youssef", "youssef.dev@entreprise.ma", "Développeur Senior", "09:00-18:00"),
            ("Amine", "amine.sys@entreprise.ma", "Administrateur Système", "08:00-16:00"),
            
            # Finance & Commercial
            ("Karima", "karima.fin@entreprise.ma", "Directrice Financière", "08:30-16:30"),
            ("Omar", "omar.com@entreprise.ma", "Responsable Commercial", "09:00-19:00"),
            ("Layla", "layla.mkt@entreprise.ma", "Social Media Manager", "09:30-17:30")
        ]
        cursor.executemany("""
            INSERT OR IGNORE INTO employes (nom, email, poste, disponibilite)
            VALUES (?, ?, ?, ?)
        """, employes)
        conn.commit()
        print("Les 10 employés ont été insérés avec succès.")
        
    conn.close()

if __name__ == "__main__":
    init_db()
    insérer_employes_test()