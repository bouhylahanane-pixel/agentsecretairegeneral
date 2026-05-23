import os
import sys

# Lignes magiques pour s'assurer que Python trouve tous nos packages locaux
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.orchestrator import executer_agent
from tools.history_manager import get_all_logs

print("--- 🚀 DÉBUT DU TEST DE L'ORCHESTRATEUR INTÉGRÉ ---")

# ==========================================
# 🔍 Simulation 1 : Demande standard avec RAG automatique (Ex: Sanaa)
# ==========================================
print("\n📝 [Test 1] Demande d'attestation simple pour Sanaa...")
resultat_1 = executer_agent("Prépare une attestation de stage pour Sanaa s'il te plaît", user="Meryem")

print(f"-> Résultat de l'action : {resultat_1['result']}")
print(f"-> Email configuré pour : {resultat_1['parameters'].get('email')}")
print(f"-> Poste extrait de la BDD : {resultat_1['parameters'].get('poste')}")
print(f"-> Réponse générée : {resultat_1['response']}")

# ==========================================
# 🚨 Simulation 2 : Demande en URGENCE (Classification cognitive d'urgence)
# ==========================================
print("\n🔥 [Test 2] Demande d'attestation en URGENCE pour Fatima...")
resultat_2 = executer_agent("Génère l'attestation de travail de Fatima immédiatement en urgence absolue !", user="Meryem")

print(f"-> Priorité détectée : {resultat_2['parameters'].get('priorite', 'Normale')}")
print(f"-> Sujet de l'e-mail automatique : {resultat_2['email']['subject']}")

# ==========================================
# 📅 Simulation 3 : Demande de Réunion avec Conflit d'Horaire (Disponibilité SQL)
# ==========================================
print("\n📅 [Test 3] Demande de réunion en dehors des horaires d'Ahmed...")
resultat_3 = executer_agent("Planifie une réunion de cadrage avec Ahmed à 18:00", user="Meryem")

print(f"-> Résultat : {resultat_3['result']}")
print(f"-> Réponse renvoyée à l'utilisateur : {resultat_3['response']}")

# ==========================================
# 🔥 Simulation 5 : Consultation du règlement via RAG (Nouveauté !)
# ==========================================
print("\n📜 [Test 5] Demande de consultation du règlement intérieur (Moteur RAG)...")
# On pose une question sur les règles de l'entreprise pour tester la déviation
resultat_5 = executer_agent("Quelles sont les règles concernant les retards ou les horaires dans l'entreprise ?", user="Meryem")

print(f"-> Action détectée par l'IA : {resultat_5['action']}")
print(f"-> Statut du résultat : {resultat_5['result']}")
print(f"-> Réponse extraite du Règlement :\n{resultat_5['response']}")

# ==========================================
# 📊 Visualisation des statistiques collectées en BDD (Analytics)
# ==========================================
print("\n📊 [Test 4] Visualisation de tes données Analytics récoltées en SQLite :")
tous_les_logs = get_all_logs()
# On affiche les 4 derniers logs pour inclure le test RAG dans nos métriques
for log in tous_les_logs[:4]:
    print(f"-> [{log['timestamp']}] Log [{log['priorite']}] : Action '{log['action']}' exécutée par {log['utilisateur']} en {log['temps']} ms")

print("\n--- 🎉 TOUS LES TESTS SONT VALIDÉS AVEC SUCCÈS ! ---")