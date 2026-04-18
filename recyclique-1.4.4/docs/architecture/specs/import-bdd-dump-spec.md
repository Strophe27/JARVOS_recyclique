# RFC: Standardisation Import/Export BDD via Dump Binaire (.dump)

**Statut:** Draft
**Auteur:** James (Dev Agent)
**Date:** 2025-01-27
**Epic:** B46 - Administration Import/Restauration BDD

---

## 1. Résumé Exécutif

Ce document spécifie la bascule de l'ensemble des processus de sauvegarde et restauration de la base de données Recyclic vers un format unique et standardisé : le format **PostgreSQL Custom Dump (`.dump`)**.

L'objectif est d'éliminer les incohérences entre l'interface d'administration (actuellement basée sur des fichiers SQL texte fragiles) et les processus Ops automatisés (basés sur des dumps binaires robustes), afin de garantir une fiabilité totale des restaurations.

---

## 2. Standard Technique : Le Format `.dump`

### 2.1 Spécification du Format

Tous les composants du système (API, Scripts, UI) devront produire et consommer exclusivement ce format :

- **Outil** : `pg_dump`
- **Format** : Custom (`-Fc` ou `--format=custom`)
- **Extension** : `.dump`
- **Compression** : Native (niveau 9 recommandé)
- **Encodage** : UTF-8

**Avantages du format Custom :**
1. **Robustesse** : Binaire, compressé, intègre les métadonnées.
2. **Sélectivité** : Permet de restaurer sélectivement (schema seul, data seule, table spécifique) via `pg_restore`.
3. **Flexibilité** : Peut être converti en SQL texte à la volée si nécessaire (`pg_restore -f fichier.sql`).
4. **Performance** : Restauration parallèle possible (`-j`).

### 2.2 Commandes de Référence

#### Export (Backup)
```bash
pg_dump -h $HOST -p $PORT -U $USER -d $DB -F c -Z 9 -f "backup.dump" --no-password
```

#### Validation (Check)
```bash
pg_restore --list "backup.dump" > /dev/null
```

#### Import (Restore)
```bash
pg_restore -h $HOST -p $PORT -U $USER -d $DB --clean --if-exists --no-owner --no-privileges --verbose "backup.dump"
```

---

## 3. Architecture Cible Unifiée

### 3.1 Export Manuel (Admin Settings)
*Actuellement : SQL Texte* -> **Cible : Dump Binaire**

- **Endpoint** : `POST /api/v1/admin/db/export`
- **Modification** : Remplacer le flag `-F p` par `-F c`.
- **Nommage** : `recyclic_db_export_YYYYMMDD_HHMMSS.dump`
- **UX** : Le bouton "Exporter" télécharge désormais un fichier `.dump`.

### 3.2 Import Manuel (Admin Settings)
*Actuellement : Parsing SQL Texte (Cassé)* -> **Cible : Orchestration `pg_restore`**

- **Endpoint** : `POST /api/v1/admin/db/import`
- **Entrée** : Fichier `.dump` uniquement (rejet des `.sql`).
- **Processus** :
    1. **Validation** : Upload temporaire -> Check `pg_restore --list`.
    2. **Backup Sécurité** : Dump de l'état courant vers `/backups/pre_restore_YYYYMMDD.dump`.
    3. **Restauration** : Exécution système de `pg_restore`.
- **UX** : Modale demandant un fichier `.dump`. Message d'avertissement adapté.

### 3.3 Sauvegardes Automatiques (Ops)
*Actuellement : Déjà conforme (.dump)*

- **Script** : `scripts/backup-postgres.sh`
- **Emplacement** : `/backups` (volume monté).
- **Action** : Aucune modification requise (déjà aligné sur le standard).
- **Note** : Les fichiers générés par le script sont compatibles nativement avec le nouvel Import Manuel.

---

## 4. Matrice de Compatibilité & Migration

| Source | Format Actuel | Format Cible | Action Requise |
| :--- | :--- | :--- | :--- |
| **Export Admin** | `.sql` (Texte) | `.dump` (Binaire) | Refactor `db_export.py` |
| **Import Admin** | `.sql` (Texte) | `.dump` (Binaire) | Refactor `db_import.py` + `adminService.ts` |
| **Backup Auto** | `.dump` (Binaire) | `.dump` (Binaire) | Aucune (Référence) |
| **Anciens Backups** | `.sql` (Texte) | - | Documentation : utiliser `psql` manuel pour restaurer les vieux `.sql` |

---

## 5. Implémentation : Règles de Sécurité

### 5.1 Gestion des Erreurs d'Import
Contrairement à l'approche "SQLAlchemy" qui tentait de continuer après erreur, `pg_restore` est atomique au niveau système.

- Si `pg_restore` renvoie un code de sortie != 0 (et hors warnings non critiques) :
    - L'API renvoie une erreur 500 avec les logs de stderr.
    - La base est potentiellement dans un état incohérent.
    - **Mitigation** : Le "Backup Sécurité" créé à l'étape 2 permet une restauration immédiate (Rollback) via script Ops.

### 5.2 Volume de Backups
L'API doit avoir accès en écriture au volume de backups pour y déposer le "Backup Sécurité".
- **Docker Compose** : Ajouter le montage volume `backups:/backups` au service `api`.

---

## 6. Plan de Transition

1.  **B46-P2** : Refonte technique Backend (Export & Import).
2.  **B46-P2** : Mise à jour Frontend (Textes, Extensions fichiers).
3.  **Release** : Communication aux admins "Le format de sauvegarde a changé pour plus de fiabilité".














