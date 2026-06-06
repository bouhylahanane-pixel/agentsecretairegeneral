# Changelog V1 — Secrétariat Général IA

## Backend
* Implémentation du système Auth avec JWT.
* Mise en place du RBAC (Role-Based Access Control) sur tous les endpoints.
* Rejet automatique et blocage API des comptes désactivés.
* Création du module complet CRUD users réservé aux administrateurs.
* Stabilisation de la route Documents (Génération dynamique).
* Refonte de la route PV (Upload Audio, Transcription Whisper, Restructuration Llama).
* Refonte de la route Réunions (Création, Suppression, Trigger SMTP minimal).
* Mise en place du Journal des Logs d'Activité analytiques.

## Frontend
* Intégration du composant `AuthContext` pour la gestion des sessions locales.
* Mise en place du composant `ProtectedRoute` avec redirection vers `/unauthorized`.
* Dynamisation de la `Sidebar` en fonction du rôle de l'utilisateur connecté.
* Création de la page `UsersPage` (Interface d'administration des comptes).
* Nettoyage du `Dashboard` V1 avec de vraies requêtes Analytics.
* Simplification de `Documents` V1.
* Rationalisation de `PV` V1 avec trois onglets (Audio, Micro, Texte).
* Stabilisation de `Réunions` V1.
* Création de la page `Historique` V1.
* Nettoyage massif et suppression du routage vers les composants hors périmètre V1 (`/chat`, `/smtp`, etc.).

## Sécurité
* Renvoi `401 Unauthorized` immédiat sur toutes les routes protégées appelées sans token ou avec un token invalide.
* Renvoi `403 Forbidden` immédiat sur toutes les routes appelées avec un rôle insuffisant.
* Protection backend interdisant la désactivation de son propre compte administrateur (Anti Self-Disable).
* Protection backend interdisant la rétrogradation de son propre rôle (Anti Self-Demotion).
* Rejet effectif des anciens tokens encore valides liés à un compte tout juste désactivé.

## Limites connues
* SMTP limité aux invitations de réunion.
* Pas d’export CSV ou de rapports externes.
* Pas de workflow de validation (Document Brouillon / Validé).
* Pas de signature électronique.
* Journal d'activité simple (non conforme à la norme stricte d'inaltérabilité).
* SGBD limité à SQLite (Pas de PostgreSQL en V1).
* Interface de consultation uniquement sur le backend (Pas d'administration serveur).
