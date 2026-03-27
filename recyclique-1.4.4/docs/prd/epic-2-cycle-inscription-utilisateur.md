# Epic 2 : Cycle d'Inscription Utilisateur

## Objectif de l'Epic

Permettre aux nouveaux bénévoles de s'inscrire sur la plateforme Recyclic via un workflow complet centré sur l’interface web (rattachement automate messager : hors périmètre actif documenté).

## Description de l'Epic

Cet epic couvre tout le processus d'inscription des utilisateurs, de la première interaction (y compris anciens canaux automate) jusqu'à la soumission du formulaire web et la création de la demande d'inscription en base de données.

## Stories

### Story 2.1 : Automate messager + interface web d'inscription ✅ TERMINÉE (historique)

**Titre** : Workflow complet d'inscription via automate messager et interface web.

**Description** : Implémentation du workflow d'inscription complet permettant aux nouveaux utilisateurs de s'inscrire via un automate messager (hors produit actif) et un formulaire web responsive.

**Critères d'Acceptation :**
- [x] L’automate messager répondait aux messages de nouveaux utilisateurs non autorisés (hors périmètre actif)
- [x] Bot fournit lien vers formulaire d'inscription web
- [x] Formulaire web collecte nom, prénom, contacts, ressourcerie
- [x] Soumission formulaire crée demande d'inscription en BDD
- [x] Gestion des erreurs (utilisateur déjà inscrit, bot indisponible)
- [x] Interface responsive (mobile-first)
- [x] Validation en temps réel côté client et serveur

**Fonctionnalités Implémentées :**

**Automate messager (historique) :**
- Handler d'inscription avec messages personnalisés
- Boutons inline pour redirection vers formulaire
- Détection des utilisateurs non autorisés
- Gestion des cas d'erreur (utilisateur déjà inscrit)

**Interface Web :**
- Formulaire React complet avec styled-components
- Validation côté client (champs obligatoires, format email, etc.)
- Chargement dynamique des ressourceries disponibles
- Messages d'erreur contextuels
- Design responsive mobile-first

**API Backend :**
- Endpoints CRUD complets pour les demandes d'inscription
- Validation Pydantic côté serveur
- Gestion des conflits (utilisateur existant, demande en cours)
- Codes de réponse appropriés (201, 400, 409, 500)

**Base de Données :**
- Table `registration_requests` avec tous les champs requis
- Relations avec les tables `sites` et `users`
- Indexes de performance
- Gestion des statuts (pending, approved, rejected)

**Status** : ✅ **TERMINÉE** - Workflow complet fonctionnel et testé.

## Résultats de l'Epic

**Score de Conformité :** 90% ✅

**Travail Accompli :**
- Automate messager documenté comme opérationnel à l’époque de l’epic (hors compose par défaut aujourd’hui)
- Interface web d'inscription complète et responsive
- API backend robuste avec validation complète
- Base de données configurée avec tous les schémas
- Tests d'intégration validés

**Points d'Attention :**
- Notifications aux admins : code présent mais pas testé en conditions réelles
- Workflow d'approbation : à implémenter dans l'Epic 3

**Impact sur le Projet :**
- Processus d'onboarding utilisateur complet
- Interface utilisateur moderne et intuitive
- Base solide pour la gestion des utilisateurs
- Workflow prêt pour l'étape d'approbation administrative

## Documents Sources

- `docs/story-1-2-detailed.md`
- Entrée d’index : Story 1.2 inscription (dossier `docs/archive/v1.2-and-earlier/`, fichier d’archive d’époque)
- `bot/src/handlers/registration.py`
- `frontend/src/pages/Registration.jsx`
- `api/src/recyclic_api/api/api/api_v1/endpoints/registration_requests.py`
