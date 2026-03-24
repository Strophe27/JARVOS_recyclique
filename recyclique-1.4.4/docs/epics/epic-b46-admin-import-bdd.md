# EPIC-B46: Administration - Import / Restauration Base de Données

**Statut:** Done ✅ (Toutes les stories complétées)
**Module:** Admin Settings + Backend API + Ops
**Priorité:** Haute (critique pour continuité de service)

---

## 1. Contexte

Dans l’écran `Administration > Settings`, une fonctionnalité d’**import de sauvegarde** est présente dans l’interface mais désactivée. Le diagnostic (B46-P0) a révélé que l’implémentation actuelle (lecture de fichier SQL texte par SQLAlchemy) est **structurellement défaillante** avec des dumps réels.

Pour fiabiliser cette fonctionnalité critique, une refonte architecturale a été décidée : **l’alignement sur le standard `pg_restore`** et le format de dump binaire (`.dump`), déjà utilisés par les scripts Ops de maintenance.

---

## 2. Objectif de l’Epic

Mettre en place un **processus fiable, traçable et sûr** d’import / restauration de base de données depuis l’interface d’administration, en respectant :

- **Standardisation** : Utilisation exclusive du format `.dump` (binaire custom PostgreSQL) et de l’outil `pg_restore`.
- **Sécurité** : Dump automatique pré-import obligatoire et stocké de manière persistante.
- **Robustesse** : Abandon du parsing SQL manuel au profit des outils systèmes éprouvés.

---

## 3. Portée

**Inclus dans cet epic :**
- Spécification technique du nouveau flux basé sur `pg_restore`.
- Refonte complète de l’endpoint d’import pour utiliser les commandes système.
- Mise à jour de l’UI pour n’accepter que les fichiers `.dump` valides.
- Intégration des sauvegardes automatiques pré-import dans le circuit de backup officiel.
- Audit et documentation.

**Exclus (hors scope immédiat) :**
- Refonte générale de la stratégie de sauvegarde (backups automatiques planifiés, offsite, etc.) - sauf alignement nécessaire.

---

## 4. Critères d’acceptation de l’Epic

1. **Format unique** : L’application n’accepte et ne produit que des dumps au format binaire (`pg_dump -Fc`), extension `.dump`.
2. **Restauration fiable** : L’import via l’UI utilise `pg_restore` (avec `--clean --if-exists`) et réussit sur des bases de production réelles.
3. **Sécurité des données** : Aucun import ne démarre sans avoir généré avec succès un backup de l’état courant, stocké dans le volume de backups persistant.
4. **Validation** : Le fichier uploadé est validé (`pg_restore --list`) avant toute tentative de restauration.
5. **UX alignée** : L’admin est clairement informé qu’il doit fournir un fichier `.dump` (et non `.sql`) et des risques encourus.

---

## 5. Stories (Ordre d’exécution)

### ✅ Story B46-P0 – Diagnostic Import BDD Admin
**Statut** : Done
Diagnostic complet réalisé. Décision prise d’abandonner l’approche SQL textuel pour `pg_restore`.
> Livrable : `docs/audits/audit-import-bdd-admin.md`

---

### 🚀 Story B46-P1 – Conception du Standard de Restauration (.dump)
**Objectif** :
Définir le protocole technique strict pour l’import :
- Format de fichier imposé (`.dump` / `pg_dump -Fc`).
- Validation technique préalable (header, version Postgres).
- Gestion du backup de sécurité (emplacement, nommage).
- Spécification de l’UI (changement des messages et types de fichiers acceptés).

---

### ✅ Story B46-P2 – Refonte Implémentation Import (Backend + UI)
**Statut** : Done ✅
**Objectif** :
Réécrire l'endpoint d'import pour :
1. Recevoir un `.dump`.
2. Le valider via `pg_restore --list`.
3. Lancer un `pg_dump` de sauvegarde vers le volume monté.
4. Exécuter `pg_restore` en mode système.
5. Mettre à jour le frontend pour refléter ces changements.

> Implémentation complète avec configuration Docker pour les 3 environnements (dev, staging, prod). Review QA passée (Quality Score: 95/100).

---

### ✅ Story B46-P3 – Audit, Logs & Documentation
**Statut** : Done ✅
**Objectif** :
- Intégrer les actions d'import dans les logs d'audit (qui, quoi, quel fichier).
- Mettre à jour la documentation Ops (`docs/runbooks/database-recovery.md`) pour inclure la restauration via UI.
- Vérifier l'alignement final avec les scripts de maintenance.

> Implémentation complète : audit logs intégrés, documentation mise à jour, historique UI fonctionnel. Review QA passée (Quality Score: 100/100).

---

### ✅ Story B46-P4 – Sauvegardes Automatiques & Supervision
**Statut** : Done ✅
**Objectif** :
Mettre en place et/ou remettre d’aplomb un **mécanisme de sauvegardes automatiques BDD** (service Docker ou cron + script), avec logs et documentation Ops, servant de **filet de sécurité** complémentaire aux backups ponctuels déclenchés par le flux d’import (B46-P2).

> Implémentation complète : service Docker backup opérationnel, script standalone fonctionnel, documentation exhaustive, intégration dans scripts de déploiement. Review QA passée (Quality Score: 95/100).

> Détail dans `../stories/story-b46-p4-backup-automation.md`.

---

## 6. Risques

1. **Incompatibilité de versions** : `pg_restore` peut être capricieux si la version du dump est plus récente que le serveur.
   - *Mitigation* : Validation stricte de la version au début du processus.
2. **Timeouts** : Les gros dumps peuvent prendre du temps.
   - *Mitigation* : Configuration de timeouts longs ou passage en tâche asynchrone (Background Task).
3. **Erreur fatale pendant le restore** : Si `pg_restore` plante au milieu, la base peut être inutilisable.
   - *Mitigation* : Le backup de sécurité créé juste avant permet une restauration rapide via script Ops (filet de sécurité ultime).

---

## 7. Métriques de succès

- **Taux de succès** : 100% des imports de dumps valides réussissent sans intervention manuelle.
- **Sécurité** : 100% des imports sont précédés d'un backup vérifiable sur disque.
- **Clarté** : Les admins ne tentent plus d'uploader des fichiers `.sql` texte.
