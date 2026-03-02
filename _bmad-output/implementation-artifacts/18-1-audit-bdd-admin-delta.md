# Audit BDD Admin — Delta 1.4.4 vs Implémentation actuelle

**Produit par :** Story 18.1  
**Date :** 2026-03-02  
**Périmètre :** Page admin BDD — Export, Import, Purge  
**Sources 1.4.4 :** `references/ancien-repo/repo/api/src/recyclic_api/api/api_v1/endpoints/db_export.py`, `db_import.py`, `db_purge.py`, `frontend/src/pages/Admin/Settings.tsx`, `frontend/src/services/adminService.ts`  
**Sources actuelles :** `api/routers/v1/admin/db.py`, `api/services/db_admin.py`, `frontend/src/admin/AdminDbPage.tsx`, `frontend/src/api/adminDb.ts`

---

## Introduction

La version 1.4.4 dispose d'une page admin BDD intégrée dans `Settings.tsx`, qui expose trois actions : Export, Import et Purge de la base PostgreSQL. Le backend utilise `pg_dump`/`pg_restore` en mode **Custom binaire** (`-F c`). L'implémentation actuelle utilise `pg_dump` en mode **SQL texte** pour l'export et, pour l'import, exécute directement des instructions SQL via SQLAlchemy — ce qui est fondamentalement incompatible avec les fichiers `.dump` binaires produits par la 1.4.4.

---

## Section 1 — Export

### 1.1 Backend 1.4.4 (`db_export.py`)

**Commande exacte :**
```
pg_dump
  -h <db_host>
  -p <db_port>
  -U <db_user>
  -d <db_name>
  -F c               ← format Custom (binaire compressé)
  -Z 9               ← compression niveau 9 (max)
  -f <export_path>   ← écriture dans un fichier temporaire
  --clean            ← inclut des DROP avant CREATE
  --if-exists        ← DROP IF EXISTS (évite les erreurs)
  --no-owner         ← pas de commandes OWNER TO
  --no-privileges    ← pas de GRANT/REVOKE
```

**Format de sortie :**
- Extension : `.dump` (ex. `recyclic_db_export_20260302_143000.dump`)
- Format : binaire propriétaire PostgreSQL (Custom format), non lisible en texte
- MIME type retourné : `application/octet-stream`
- Headers : `Content-Disposition: attachment; filename=recyclic_db_export_{timestamp}.dump`
- Compression intégrée au format Custom (niveau 9)

**Gestion des erreurs :**

| Cas | Code HTTP | Détail retourné |
|-----|-----------|-----------------|
| Scheme URL invalide | 500 | "Invalid database URL scheme (must be postgresql:// or postgres://)" |
| db_name manquant | 500 | "Database name is required in DATABASE_URL" |
| db_user manquant | 500 | "Database user is required in DATABASE_URL" |
| URL mal formée | 500 | "Invalid database URL format: {str(e)}" |
| `pg_dump` returncode != 0 | 500 | "Database export failed: {stderr}" |
| Fichier export non créé | 500 | "Export file was not created" |
| Timeout (> 600s) | 504 | "L'export de la base de données a pris trop de temps (timeout après 10 minutes)..." |
| Exception inattendue | 500 | "Erreur lors de l'export de la base de données: {str(e)}" |

**Audit trail :** Aucun audit structuré — seulement `logger.info` / `logger.error`. Pas d'écriture dans la table `audit_log`.

**Paramètres :**
- Timeout subprocess : 600 secondes (10 minutes)
- Mot de passe transmis via variable d'environnement `PGPASSWORD` (pas dans la commande)

**Permissions :** `super_admin` uniquement (`require_super_admin_role()`)

---

### 1.2 Backend actuel (`api/services/db_admin.py` + `api/routers/v1/admin/db.py`)

**Commande utilisée :**
```
pg_dump --no-owner --no-acl <url_complète>
```

- Pas de `-F c` → sortie en **SQL texte brut**
- Pas de `-Z` → pas de compression
- Pas de `-f` → sortie sur stdout, capturée en bytes
- L'URL complète est passée directement (credentials inclus dans la string)
- Timeout : 120 secondes (2 minutes)
- `check=True` → exception `CalledProcessError` si returncode != 0

**Gestion SQLite :** Une branche spécifique exporte le schéma via `sqlite_master` (pas pertinent pour la production, qui est PostgreSQL).

**Format de sortie :**
- Media type : `application/sql`
- Nom fichier : `recyclique-export.sql` (fixe, pas de timestamp)
- Format : SQL texte (instructions CREATE, INSERT, etc.)

**Gestion des erreurs :**
- Toutes les erreurs → HTTP 500 via `raise HTTPException(500, f"Erreur export BDD: {str(e)}")`
- `CalledProcessError`, `FileNotFoundError` (pg_dump absent), `TimeoutExpired` : toutes mappées à RuntimeError → HTTP 500

**Audit trail :** Aucun.

**Permissions :** `super_admin` OU `admin` (`require_permissions("super_admin", "admin")`)

---

### 1.3 Différences critiques — Export

| Aspect | 1.4.4 | Actuel | Impact |
|--------|-------|--------|--------|
| Format dump | `-F c` (binaire Custom) | SQL texte | **CRITIQUE** : les fichiers exportés sont incompatibles entre les deux versions |
| Extension fichier | `.dump` | `.sql` | **CRITIQUE** : l'import 1.4.4 n'accepte que `.dump` |
| Compression | `-Z 9` (intégrée) | Aucune | Important : dumps plus volumineux |
| Options sécurité | `--clean --if-exists --no-owner --no-privileges` | `--no-owner --no-acl` | Important : `--clean` absent, restauration plus risquée |
| Timestamp fichier | Oui (`YYYYMMDD_HHMMSS`) | Non (nom fixe) | Mineur |
| Timeout | 600s (10 min) | 120s (2 min) | Important : bases volumineuses pourraient échouer |
| PGPASSWORD | Variable d'env (sécurisé) | URL complète avec credentials | Important : sécurité |
| Permissions | super_admin seulement | super_admin ou admin | Important |
| Audit trail | Aucun dans les deux | — | — |
| HTTP 504 sur timeout | Oui | Non (HTTP 500) | Mineur |

---

## Section 2 — Import

### 2.1 Backend 1.4.4 (`db_import.py`)

**Séquence d'opérations :**

1. **Validation fichier** : extension `.dump` uniquement, taille ≤ 500 MB
2. **Validation dump** : `pg_restore --list <temp_dump_path>` (timeout 60s)
3. **Sauvegarde préalable** : `pg_dump -F c -Z 9 --clean --if-exists --no-owner --no-privileges -f /backups/pre_restore_{timestamp}.dump` (timeout 300s)
4. **Copie dans /backups** : pour accès depuis le conteneur API
5. **Fermeture connexions actives** : `psql -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '...' AND pid <> pg_backend_pid()"` (timeout 30s)
6. **Restauration** : `pg_restore -h ... -p ... -U ... -d ... --clean --if-exists --no-owner --no-privileges --disable-triggers --verbose --jobs=1 <dump_path>` (timeout 1200s = 20 min)

**Format accepté :**
- Extension : `.dump` uniquement (validation stricte)
- Taille max : 500 MB (HTTP 413 si dépassé)
- Format attendu : binaire Custom PostgreSQL

**Gestion des erreurs :**

| Cas | Code HTTP |
|-----|-----------|
| Pas de filename | 400 |
| Extension != .dump | 400 |
| Taille > 500 MB | 413 |
| URL DB invalide | 500 |
| Fichier corrompu (pg_restore --list fail) | 400 |
| Backup préalable impossible | 500 |
| Restauration échouée (vraies erreurs) | 500 |
| Timeout (> 1200s) | 504 |
| Exception inattendue | 500 |

Note : les warnings pg_restore (ex. `errors ignored on restore`) sont distingués des vraies erreurs et ne font pas échouer l'opération.

**Audit trail :**
- `AuditActionType.DB_IMPORT` via `log_system_action` dans **tous les cas** (succès ET échecs)
- Détails enregistrés : filename, file_size_bytes, file_size_mb, duration_seconds, backup_created, backup_path, success, error_type, error_message
- Robustesse : si la session DB est fermée après restauration, une nouvelle session est ouverte pour enregistrer l'audit

**Réponse succès :**
```json
{
  "message": "Import de la base de données effectué avec succès",
  "imported_file": "<filename>",
  "backup_created": "pre_restore_{timestamp}.dump",
  "backup_path": "/backups/pre_restore_{timestamp}.dump",
  "timestamp": "<ISO>"
}
```

**Permissions :** `super_admin` uniquement

---

### 2.2 Backend actuel (`api/routers/v1/admin/db.py` + `api/services/db_admin.py`)

**Logique :**
- Lecture du fichier uploadé → décodage UTF-8 → exécution SQL via `db.execute(text(stmt))` statement par statement
- Pas de subprocess, pas de `pg_restore`
- Un fichier `.dump` binaire est accepté mais traité comme du SQL texte : le décodage UTF-8 avec `errors="replace"` va corrompre le contenu binaire → échec garanti en pratique

**Format accepté :**
- Extensions : `.sql` OU `.dump` (les deux)
- Taille max : aucune limite
- Validation : aucune (pas de `pg_restore --list`)

**Sauvegarde préalable :** Aucune

**Fermeture connexions :** Non applicable (pas de restauration complète)

**Gestion des erreurs :**

| Cas | Code HTTP |
|-----|-----------|
| Pas de filename | 400 |
| Extension invalide (.csv etc.) | 400 |
| Fichier vide | 400 |
| Erreur d'encodage | 400 |
| Erreur SQL à l'exécution | 422 avec rollback au premier statement en erreur |

**Audit trail :**
- `write_audit_event` avec `action="admin.db.import"`, succès seulement
- Détails : `file={filename}` (minimal, pas de taille ni durée)

**Réponse succès :**
```json
{
  "ok": true,
  "message": "Import termine : {N} instruction(s) executee(s)",
  "filename": "<filename>"
}
```

**Permissions :** `super_admin` OU `admin`

---

### 2.3 Différences critiques — Import

| Aspect | 1.4.4 | Actuel | Impact |
|--------|-------|--------|--------|
| Outil de restauration | `pg_restore` (binaire) | `db.execute(text(sql))` (SQL texte) | **CRITIQUE** : incompatible avec les dumps `.dump` de production |
| Format accepté | `.dump` uniquement | `.sql` ou `.dump` | **CRITIQUE** : accepter `.dump` mais l'exécuter comme SQL est trompeur et inefficace |
| Sauvegarde préalable | Oui (`/backups/pre_restore_{timestamp}.dump`) | Non | **CRITIQUE** : aucun filet de sécurité en cas d'échec |
| Validation fichier | `pg_restore --list` | Aucune | Important : fichier corrompu non détecté avant restauration |
| Fermeture connexions actives | Oui (`pg_terminate_backend`) | Non | Important : risque de deadlock lors d'une vraie restauration |
| Taille max | 500 MB | Aucune | Important |
| Timeout restauration | 1200s (20 min) | Sans objet (pas de subprocess) | — |
| Audit trail | Succès ET échecs, détaillé | Succès seulement, minimal | Important |
| Disable triggers | `--disable-triggers` | Sans objet | — |
| Permissions | super_admin seulement | super_admin ou admin | Important |

---

## Section 3 — Purge

### 3.1 Backend 1.4.4 (`db_purge.py`)

**Périmètre de tables purgées (ordre FK) :**

| Ordre | Table | Description |
|-------|-------|-------------|
| 1 | `sale_items` | Lignes de vente (enfant de `sales`) |
| 2 | `sales` | Ventes (enfant de `cash_sessions`) |
| 3 | `ligne_depot` | Lignes de dépôt (enfant de `ticket_depot`) |
| 4 | `ticket_depot` | Tickets de dépôt |
| 5 | `cash_sessions` | Sessions de caisse |

**Tables préservées :** `users`, `sites`, `categories`, `cash_registers`

**Méthode :** `DELETE FROM <table>` via `text()` SQLAlchemy, transaction unique avec rollback en cas d'erreur.

**Réponse succès :**
```json
{
  "message": "Purge des données transactionnelles effectuée avec succès",
  "deleted_records": {
    "sale_items": <N>,
    "sales": <N>,
    "ligne_depot": <N>,
    "ticket_depot": <N>,
    "cash_sessions": <N>
  },
  "timestamp": "<NOW()>"
}
```

**Audit trail :** Aucun audit structuré — seulement `logger.warning`. Pas d'écriture dans `audit_log`.

**Gestion des erreurs :** Rollback + HTTP 500.

**Permissions :** `super_admin` uniquement

---

### 3.2 Backend actuel (`api/services/db_admin.py`)

**Périmètre de tables purgées (ordre FK) :**

| Ordre | Table | Description |
|-------|-------|-------------|
| 1 | `payment_transactions` | Paiements (enfant de `sales`) |
| 2 | `sale_items` | Lignes de vente |
| 3 | `sales` | Ventes |
| 4 | `cash_sessions` | Sessions de caisse |

**Tables manquantes vs 1.4.4 :**
- `ligne_depot` — non purgée
- `ticket_depot` — non purgée

**Tables en surplus vs 1.4.4 :**
- `payment_transactions` — purgée mais absente de la 1.4.4

**Méthode :** `table.delete()` via ORM SQLAlchemy + `db.flush()` (pas de commit dans le service — commit dans le routeur).

**Réponse succès :**
```json
{
  "message": "Purge terminee : {total} enregistrement(s) supprime(s)",
  "deleted_count": <total>
}
```

Note : la 1.4.4 retourne `deleted_records` (dict par table) ; l'actuel retourne `deleted_count` (total uniquement).

**Audit trail :** `write_audit_event` avec `action="admin.db.purge_transactions"`, succès seulement. Détails : comptage total uniquement (pas par table).

**Permissions :** `super_admin` OU `admin`

---

### 3.3 Comparaison périmètre tables — côte à côte

| Table | 1.4.4 | Actuel | Statut |
|-------|-------|--------|--------|
| `sale_items` | ✅ | ✅ | Aligné |
| `sales` | ✅ | ✅ | Aligné |
| `cash_sessions` | ✅ | ✅ | Aligné |
| `ligne_depot` | ✅ | ❌ | **Manquant dans actuel** |
| `ticket_depot` | ✅ | ❌ | **Manquant dans actuel** |
| `payment_transactions` | ❌ | ✅ | Surplus dans actuel (table nouvelle) |

---

## Section 4 — Frontend 1.4.4 (`Settings.tsx` + `adminService.ts`)

### 4.1 Export (1.4.4)

**Label carte :** "Export de la base de données"  
**Description :** "Génère un fichier .dump (format binaire PostgreSQL) complet de sauvegarde de la base de données. Utile pour les backups manuels ou avant des opérations de maintenance majeures."  
**Label bouton :** "💾 Exporter" → "⏳ Export en cours..." (pendant l'opération)  
**Bouton désactivé :** Oui pendant l'export (`disabled={exportingDatabase}`)

**Comportement UX :**
1. Clic bouton → `confirm()` natif : "⚠️ Voulez-vous vraiment exporter la base de données ? Cette opération peut prendre plusieurs minutes."
2. Si annulé → rien
3. Si confirmé → export déclenché, bouton en état loading "⏳ Export en cours..."
4. Succès → `alert('✅ Export de la base de données réussi ! Le fichier a été téléchargé.')`
5. Erreur → `alert('❌ Erreur lors de l\'export de la base de données: {message}')`

**WarningBox :** "⚠️ Attention : L'export peut prendre plusieurs minutes selon la taille de la base de données et consommer des ressources système importantes."

**Timeout client :** 20 minutes (`adminService.exportDatabase`, `timeout: 1200000`)

---

### 4.2 Import (1.4.4)

**Label carte :** "Import de sauvegarde"  
**Description :** "Importe un fichier .dump (format binaire PostgreSQL) de sauvegarde et remplace la base de données existante. Une sauvegarde automatique est créée avant l'import dans /backups."  
**Label bouton (carte)** : "📥 Importer" → "⏳ Import en cours..." (pendant l'opération)

**Comportement UX — Modale en 2 zones :**

Zone 1 — Sélection fichier :
- `<input type="file" accept=".dump" />` (uniquement `.dump`)
- Validation frontend immédiate :
  - Extension non `.dump` → `alert('❌ Veuillez sélectionner un fichier .dump (format binaire PostgreSQL)')`
  - Taille > 500 MB → `alert('❌ Le fichier est trop volumineux ({size} MB). La limite est de 500 MB.')`
- Prévisualisation : affichage du nom et de la taille sélectionnée

Zone 2 — Confirmation par saisie :
- Texte : "Confirmation requise : Pour confirmer, veuillez recopier exactement le mot suivant : **"RESTAURER"**"
- Champ input texte
- Bouton d'import final désactivé si `importConfirmationText !== 'RESTAURER'`
- Label bouton final : "🗄️ Remplacer la base de données" → "⏳ Import en cours..."
- Mauvaise saisie → `alert('❌ Le texte de confirmation ne correspond pas. Veuillez recopier exactement "RESTAURER".')`
- Succès : `alert('✅ Import réussi !\n\nFichier importé: {filename}\nSauvegarde créée: {backup}\n\n⚠️ La base de données a été remplacée par le contenu du fichier.')`
- Erreur : `alert('❌ Erreur lors de l\'import de la base de données: {message}')`

**Historique des imports :**
- Section dédiée "Historique des imports" affichant les 5 derniers imports
- Chaque entrée : nom fichier, date/heure, auteur, statut (succès/échec), taille MB, durée, backup créé
- Lien vers journal d'audit complet

**Timeout client :** 10 minutes (`adminService.importDatabase`, `timeout: 600000`)

---

### 4.3 Purge (1.4.4)

**Label carte :** "Purge des données transactionnelles"  
**Description :** "Supprime TOUTES les données de ventes, réceptions et sessions de caisse. Cette opération est irréversible et ne doit être utilisée qu'avant la mise en production."  
**Label bouton :** "🗑️ Purger les données" → "⏳ Purge en cours..."  
**WarningBox danger** : fond rouge — "⚠️ DANGER : Cette action supprimera définitivement toutes les données transactionnelles. Elle ne doit être utilisée qu'une seule fois avant le lancement officiel de l'application."

**Comportement UX — Modale 3 étapes :**

Étape 1 — Première confirmation :
- Titre : "⚠️ Confirmation de purge"
- Texte : "Êtes-vous sûr de vouloir supprimer toutes les données de ventes et de réceptions ? Cette action est irréversible."
- Boutons : "Annuler" | "Oui, je suis sûr" (danger)

Étape 2 — Deuxième confirmation :
- Titre : "🚨 Dernière chance"
- Texte : "Vraiment sûr(e) ? Toutes les transactions seront définitivement perdues."
- Boutons : "Annuler" | "Oui, je confirme" (danger)

Étape 3 — Confirmation par saisie :
- Titre : "🔐 Confirmation finale"
- Texte : "Pour confirmer, veuillez recopier exactement la phrase suivante : **"Adieu la base"**"
- Champ texte + bouton désactivé si saisie incorrecte
- Bouton : "🗑️ Supprimer définitivement" → "⏳ Suppression..."
- Mauvaise saisie → `alert('❌ Le texte de confirmation ne correspond pas. Veuillez recopier exactement "Adieu la base".')`
- Succès : `alert('✅ Purge réussie !\n\nEnregistrements supprimés :\n• sale_items: N\n• sales: N\n...')`
- Erreur : `alert('❌ Erreur lors de la purge des données: {message}')`

---

## Section 5 — Frontend actuel (`AdminDbPage.tsx` + `adminDb.ts`)

### 5.1 Export (actuel)

**Label carte :** "Export BDD"  
**Description :** "Télécharge une sauvegarde (dump SQL) de la base."  
**Label bouton :** "Export BDD" (pas de variation de label pendant l'export)  
**Bouton :** Mantine `Button` avec `loading={exportLoading}` (spinner Mantine, texte inchangé)

**Comportement UX :**
- Pas de dialog de confirmation préalable
- Succès → `setMessage('Export téléchargé.')` (Alert vert inline en haut de page)
- Erreur → `setError(message)` (Alert rouge inline)
- Pas de WarningBox

**Nom fichier téléchargé :** `recyclique-export.sql` (fixe, depuis Content-Disposition)

---

### 5.2 Import (actuel)

**Label carte :** "Import BDD"  
**Description :** "Envoie un fichier de sauvegarde SQL pour restauration."  
**Label bouton :** "Importer"

**Comportement UX :**
- Pas de modale
- `<input type="file" accept=".sql,.dump" />` (accepte les deux formats)
- Pas de validation de taille côté frontend
- Pas de confirmation par saisie de texte
- Bouton désactivé si `!importFile`
- Succès → `setMessage(res.message ?? 'Fichier {filename} importé.')` (inline)
- Erreur → `setError(res.detail ?? 'Import refusé')` (inline)
- Pas d'historique des imports

---

### 5.3 Purge (actuel)

**Label carte :** "Purge transactions"  
**Description :** "Supprime les données de transactions (sessions caisse, ventes, paiements)."  
**Label bouton :** "Purge transactions" (couleur orange, variant=light)

**Comportement UX — Modale 1 étape :**
- Titre : "Confirmer la purge"
- Texte : "Êtes-vous sûr de vouloir lancer la purge des transactions ? Les sessions caisse, ventes et paiements seront définitivement supprimés."
- Boutons : "Confirmer" (rouge) | "Annuler"
- Pas de double confirmation
- Pas de saisie de texte
- Succès → `setMessage(res.message ?? 'Purge effectuée.')` (inline)
- Erreur → `setError(message)` (inline)

---

## Section 6 — Conclusion : Liste ordonnée des écarts à corriger

### Écarts CRITIQUES (bloquants pour la parité 1.4.4)

| N° | Priorité | Écart | Description | Story cible |
|----|----------|-------|-------------|-------------|
| 1 | **CRITIQUE** | Format export : SQL texte au lieu de binaire `.dump` | `pg_dump` actuel n'a pas `-F c` → produit du SQL texte ; 1.4.4 produit un binaire Custom PostgreSQL. Les fichiers de sauvegarde existants (`.dump`) ne peuvent pas être importés. | 18.2 backend |
| 2 | **CRITIQUE** | Import via SQL texte au lieu de `pg_restore` | L'actuel exécute des instructions SQL via SQLAlchemy. Un fichier `.dump` binaire sera lu comme UTF-8 (corrompu) et échouera. `pg_restore` est requis pour restaurer les vrais backups PostgreSQL. | 18.2 backend |
| 3 | **CRITIQUE** | Absence de sauvegarde préalable à l'import | Aucune sauvegarde automatique avant restauration → perte totale irréversible en cas d'échec. La 1.4.4 crée `/backups/pre_restore_{timestamp}.dump` avant chaque import. | 18.2 backend |
| 4 | **CRITIQUE** | Tables `ligne_depot` et `ticket_depot` absentes de la purge | Les données de dépôt ne sont pas purgées dans l'actuel. Le périmètre est incomplet, laissant des données orphelines après purge. | 18.2 backend |

### Écarts IMPORTANTS (parité fonctionnelle et sécurité)

| N° | Priorité | Écart | Description | Story cible |
|----|----------|-------|-------------|-------------|
| 5 | **IMPORTANT** | Permissions export/import/purge : super_admin+admin au lieu de super_admin seul | La 1.4.4 restreint ces opérations dangereuses aux super_admin uniquement. L'actuel les expose aussi aux admin. | 18.2 backend |
| 6 | **IMPORTANT** | Absence de validation `pg_restore --list` avant import | Aucune vérification de l'intégrité du fichier avant de lancer la restauration. La 1.4.4 valide d'abord avec `pg_restore --list`. | 18.2 backend |
| 7 | **IMPORTANT** | Absence de fermeture des connexions actives avant import | La 1.4.4 exécute `pg_terminate_backend` avant la restauration pour éviter les deadlocks. L'actuel (avec pg_restore réel) ne le fait pas. | 18.2 backend |
| 8 | **IMPORTANT** | Timeout export 2 min vs 10 min | L'actuel expire après 120s. La 1.4.4 laisse 600s. Pour de grosses bases, l'export actuel échouera. | 18.2 backend |
| 9 | **IMPORTANT** | Pas de compression dans l'export | La 1.4.4 utilise `-Z 9` (compression maximale). L'actuel produit un fichier SQL non compressé potentiellement très volumineux. | 18.2 backend |
| 10 | **IMPORTANT** | Audit trail absent pour l'export | La 1.4.4 ne loggue pas non plus l'export dans l'audit — mais pour l'import, l'actuel loggue seulement le succès (pas les échecs). | 18.2 backend |
| 11 | **IMPORTANT** | Réponse purge : `deleted_count` total vs `deleted_records` dict par table | La 1.4.4 retourne `deleted_records` (dict avec le compte par table), nécessaire pour l'affichage frontend purge (sale_items: N, sales: N...). L'actuel retourne seulement `deleted_count` (total). Note : l'audit trail purge de l'actuel (`write_audit_event`) est en réalité meilleur que la 1.4.4 (seulement `logger.warning`) — pas d'écart de régression sur ce point. | 18.2 backend |
| 12 | **IMPORTANT** | UX import : pas de modale de confirmation, pas de validation taille | L'actuel présente directement un `<input file>` + bouton "Importer" sans protection. La 1.4.4 a une modale avec validation d'extension, de taille (500 MB), et saisie de "RESTAURER". | 18.3 frontend |
| 13 | **IMPORTANT** | UX purge : 1 étape vs 3 étapes | L'actuel n'a qu'une confirmation simple. La 1.4.4 a 3 étapes incluant la saisie de "Adieu la base". Risque d'activation accidentelle. | 18.3 frontend |
| 14 | **IMPORTANT** | Import accepte `.sql` en plus de `.dump` | L'actuel permet d'uploader un `.sql` alors que la 1.4.4 n'accepte que `.dump`. Cohérence du format cible. | 18.3 frontend |

### Écarts MINEURS (qualité UX / informationnel)

| N° | Priorité | Écart | Description | Story cible |
|----|----------|-------|-------------|-------------|
| 15 | **MINEUR** | Pas de dialog `confirm()` avant export | La 1.4.4 demande une confirmation native avant de lancer l'export. L'actuel déclenche directement. | 18.3 frontend |
| 16 | **MINEUR** | Labels et descriptions moins informatifs | "Export BDD" vs "Export de la base de données" ; descriptions raccourcies sans mention du format binaire `.dump`. | 18.3 frontend |
| 17 | **MINEUR** | Pas de WarningBox pour l'export | L'actuel n'a pas d'avertissement sur la durée potentielle de l'opération. | 18.3 frontend |
| 18 | **MINEUR** | Historique des imports absent | La 1.4.4 affiche les 5 derniers imports avec statut, taille, durée et backup. L'actuel n'a pas cette section. | 18.3 frontend |
| 19 | **MINEUR** | Nom fichier export sans timestamp | L'actuel télécharge `recyclique-export.sql` (fixe). La 1.4.4 produit `recyclic_db_export_{YYYYMMDD_HHMMSS}.dump`. | 18.2 backend |
| 20 | **MINEUR** | Feedback succès inline (Alert) vs alert() | La 1.4.4 utilise des `alert()` natifs pour succès/erreur. L'actuel utilise des composants Alert Mantine inline. Ce point est une divergence acceptable — l'Alert Mantine est même préférable UX. | 18.3 frontend |

---

*Document produit le 2026-03-02 dans le cadre de la story 18.1 — audit documentaire, aucun code modifié.*
