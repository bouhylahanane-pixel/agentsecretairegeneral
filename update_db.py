import re
import sqlite3
import os

db_manager_path = 'data/database_manager.py'

with open(db_manager_path, 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'infos_entreprise = \[\s*\((.*?)\)\s*\]', content, re.DOTALL)
if match:
    new_infos = '''infos_entreprise = [
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
    ]'''
    
    content = content[:match.start()] + new_infos + content[match.end():]
    with open(db_manager_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fichier python mis à jour.")

# Inject directly into DB
conn = sqlite3.connect('data/database.db')
cursor = conn.cursor()

cursor.execute("DELETE FROM documents_rag WHERE type_doc = 'culture_entreprise'")

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
print("Base de données mise à jour avec les nouvelles infos d'entreprise.")
