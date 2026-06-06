# Checklist Recette V1

## Authentification
- [ ] Test : Connexion réussie avec un compte valide.
- [ ] Test : Rejet de la connexion avec des identifiants invalides.
- [ ] Test : Déconnexion via le menu utilisateur.
- [ ] Test : Rafraîchissement de la page tout en gardant sa session active.

## Admin
- [ ] Test : La sidebar affiche bien les 6 menus (Dashboard, Documents, PV, Réunions, Utilisateurs, Historique).
- [ ] Test : Création d'un nouvel utilisateur dans `/users`.
- [ ] Test : Modification du rôle d'un utilisateur existant.
- [ ] Test : Impossible de désactiver son propre compte administrateur.
- [ ] Test : Impossible de modifier son propre rôle.

## Secretaire
- [ ] Test : L'accès à `/users` redirige vers "Accès Refusé" (`/unauthorized`).
- [ ] Test : La sidebar n'affiche pas "Utilisateurs".
- [ ] Test : Accès aux statistiques du Dashboard et au Journal d'Historique complets.

## Employee
- [ ] Test : Accès autorisé à `/dashboard` (Statistiques personnelles/restreintes).
- [ ] Test : Accès autorisé à `/documents` (Génération d'attestations).
- [ ] Test : L'accès direct à `/proces-verbaux`, `/reunions`, `/historique` et `/users` redirige vers `/unauthorized`.

## Stagiaire
- [ ] Test : Accès en lecture seule au `/dashboard`.
- [ ] Test : Toute tentative d'accès à toute autre page renvoie un 403 / `/unauthorized`.

## Documents
- [ ] Test : Sélectionner un type de document (Attestation de travail) et remplir le formulaire.
- [ ] Test : Cliquer sur "Générer le Document" et vérifier qu'aucune erreur réseau ne survient.
- [ ] Test : Téléchargement du PDF généré.

## Procès-Verbaux
- [ ] Test : Importer un fichier Audio / Vidéo et déclencher la génération.
- [ ] Test : Autoriser le microphone et déclencher un enregistrement en direct pour génération.
- [ ] Test : Copier-coller du texte brut (notes) et demander la restructuration IA.
- [ ] Test : L'historique des PV générés s'affiche sur la droite.

## Réunions
- [ ] Test : Ajouter une nouvelle réunion avec une date et heure valides.
- [ ] Test : Cliquer sur "Inviter" et vérifier l'apparition du message de succès.
- [ ] Test : Supprimer une réunion existante avec la confirmation.

## Historique
- [ ] Test : Affichage des dernières actions réalisées.
- [ ] Test : Recherche texte en temps réel dans le tableau (filtrage client).

## Sécurité
- [ ] Test : Désactiver un compte tiers, puis vérifier qu'il ne peut plus se connecter.
- [ ] Test : Tenter d'utiliser l'application avec un compte fraîchement désactivé (l'API backend doit bloquer l'accès).
- [ ] Test : Les appels directs sur l'API `/api/users` sans token admin retournent bien `401` ou `403`.

## Build / Lancement
- [ ] Test : Le backend démarre sans aucune erreur `ModuleNotFoundError` (`uvicorn main:app`).
- [ ] Test : Le frontend compile en production sans erreur TypeScript (`npm run build`).
