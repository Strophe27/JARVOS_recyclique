# Story B46-P1: Conception du Standard de Restauration (.dump)

**Statut:** Done (RFC validé et prêt pour implémentation)
**Épopée:** [EPIC-B46 – Administration Import / Restauration BDD](../epics/epic-b46-admin-import-bdd.md)
**Module:** Backend API + Ops
**Priorité:** Haute

---

## 1. Contexte

Suite au diagnostic (B46-P0), nous avons établi que l'import de fichiers `.sql` via SQLAlchemy est une impasse technique. La stratégie validée est de s'aligner sur les outils natifs de PostgreSQL déjà utilisés par les scripts Ops du projet.

Cette story a permis de **concevoir et spécifier** techniquement le nouveau protocole d'import avant son implémentation.

---

## 2. User Story

En tant que **Lead Developer / Architecte**,
je veux **définir les spécifications techniques précises du nouveau flux d'import BDD**,
afin que **l'implémentation (B46-P2) soit directe, sécurisée et sans ambiguïté sur les formats et commandes à utiliser.**

---

## 3. Critères d'acceptation

1. **Document de Spécification Technique (RFC)** créé dans `docs/architecture/specs/import-bdd-dump-spec.md` détaillant :
   - Le format de fichier exact attendu (`pg_dump -Fc`).
   - La commande exacte de validation (`pg_restore --list`).
   - La commande exacte de restauration (`pg_restore` avec options de nettoyage).
   - Le flux de sauvegarde automatique pré-import (nommage, destination persistante).

2. **Matrice des erreurs** définie :
   - Quels cas doivent échouer immédiatement (version incompatible, fichier corrompu).
   - Quels retours faire à l'utilisateur via l'API.

3. **Maquettes de l'impact UI** :
   - Description des changements nécessaires dans la modale d'import (accept `.dump` uniquement, messages d'avertissement mis à jour).

4. **Plan de migration** :
   - Comment gérer la transition pour les utilisateurs habitués (même si la feature était désactivée) ou les devs.

---

## 4. Tâches

- [x] **T1 - Spécification des Commandes Système**
  - Définir les flags exacts pour `pg_dump` (backup sécurité) et `pg_restore` (restauration).
  - Valider la compatibilité avec les versions Postgres (15) utilisées dans Docker.

- [x] **T2 - Définition du Flux de Fichiers**
  - Définir où sont stockés les fichiers uploadés temporaires.
  - Définir où sont stockés les backups de sécurité (volume `backups` ?).
  - Valider les permissions d'écriture du conteneur API.

- [x] **T3 - Rédaction du RFC**
  - Rédiger `docs/architecture/specs/import-bdd-dump-spec.md`.

- [x] **T4 - Validation**
  - Faire relire le RFC par le PO/Tech Lead.

---

## 5. Livrables

- `docs/architecture/specs/import-bdd-dump-spec.md` : Spécification complète du flux unifié.
