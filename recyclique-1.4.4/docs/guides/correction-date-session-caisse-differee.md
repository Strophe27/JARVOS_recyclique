# Correction manuelle : date d'une session de caisse différée (8-11 → 8-10)

**Contexte :** Une cession de caisse différée a été saisie avec la date du **8 novembre** au lieu du **8 octobre**. Il faut corriger la date sans toucher aux montants ni aux ventes.

**Données concernées :**
- Table **`cash_sessions`** : colonnes `opened_at` (et éventuellement `closed_at`)
- Table **`sales`** : colonne `sale_date` (date réelle du ticket, alignée sur la session pour les sessions différées)

---

## 1. Depuis le VPS / SSH : options

### Option A : Base de données uniquement (recommandé)

Oui, **on peut faire la correction uniquement en base**. Il suffit de mettre à jour :
- `cash_sessions.opened_at` (et `closed_at` si la session est fermée)
- `sales.sale_date` pour toutes les ventes de cette session

Il n’y a pas d’écran d’admin dans l’app pour modifier la date d’une session après coup, donc **le passage par la base (ou un script) est nécessaire**.

### Option B : Script one-shot (optionnel)

On peut ajouter un script ou un endpoint admin “fix session date” si vous prévoyez d’autres corrections similaires. Pour une fois, le SQL direct est le plus simple.

---

## 2. Avant de commencer : diagnostic sur le VPS

Sur le serveur, depuis le répertoire du projet (ex. `/srv/recyclic`) :

- Utiliser **`docker compose`** (avec un espace), pas `docker-compose`.
- Un fichier **`.env`** (ou `.env.production` en prod) doit exister et contenir au minimum `POSTGRES_DB=recyclic` et `POSTGRES_PASSWORD=...`.
- Les conteneurs doivent être **démarrés** pour faire le dump et ouvrir psql.

**Commandes de diagnostic (à lancer une par une et noter le résultat) :**

```bash
cd /srv/recyclic
docker ps -a
ls -la .env .env.production 2>/dev/null || true
docker compose ps
docker compose -f docker-compose.prod.yml -p recyclic-prod ps 2>/dev/null || true
```

- Si `docker ps -a` montre un conteneur Postgres (ex. `recyclic-prod-postgres` ou `recyclic-postgres-1`), noter son **nom** et s’il est **Up** ou **Exited**.
- Si `docker compose ps` est vide mais qu’un conteneur Postgres existe avec `docker ps -a`, il a été lancé avec un autre fichier (ex. prod) : utiliser le bon `-f` et `-p` pour les commandes suivantes.

---

## 3. Procédure recommandée (SQL depuis le VPS)

**Règle projet :** avant toute modification des données, faire un **dump** de la base (voir [.cursor/rules/require-db-dump-before-reset.mdc](../../.cursor/rules/require-db-dump-before-reset.mdc)).

### Étape 0 : Démarrer Postgres si besoin, puis sauvegarde

**Si tu utilises le compose par défaut (docker-compose.yml) :**

```bash
cd /srv/recyclic
# S'assurer que .env existe avec POSTGRES_DB=recyclic et POSTGRES_PASSWORD=...
docker compose up -d postgres
docker compose ps
```

Puis (en une fois, après que postgres soit "Up") :

```bash
TS=$(date +%Y%m%d_%H%M%S)
docker compose exec -T postgres bash -c "pg_dump -U recyclic -d recyclic -Fc -f /tmp/recyclic_${TS}.dump"
docker cp $(docker compose ps -q postgres):/tmp/recyclic_${TS}.dump ./logs/
ls -la ./logs/recyclic_${TS}.dump
```

**Si tu utilises la prod (docker-compose.prod.yml) :**

```bash
cd /srv/recyclic
docker compose -f docker-compose.prod.yml -p recyclic-prod up -d postgres
docker compose -f docker-compose.prod.yml -p recyclic-prod ps
```

Puis :

```bash
TS=$(date +%Y%m%d_%H%M%S)
docker compose -f docker-compose.prod.yml -p recyclic-prod exec -T postgres bash -c "pg_dump -U recyclic -d recyclic -Fc -f /tmp/recyclic_${TS}.dump"
docker cp recyclic-prod-postgres:/tmp/recyclic_${TS}.dump ./logs/
ls -la ./logs/recyclic_${TS}.dump
```

(Le nom du conteneur en prod est en général `recyclic-prod-postgres`.)

### Étape 1 : Identifier la session

Se connecter à Postgres.

**Compose par défaut :**

```bash
docker compose exec postgres psql -U recyclic -d recyclic
```

**Compose prod :**

```bash
docker compose -f docker-compose.prod.yml -p recyclic-prod exec postgres psql -U recyclic -d recyclic
```

Ou directement via le nom du conteneur :

```bash
docker exec -it recyclic-prod-postgres psql -U recyclic -d recyclic
```

Puis en SQL (adapter l’année si besoin, ex. 2024) :

```sql
-- Sessions dont la date d'ouverture est le 8 novembre (à corriger en 8 octobre)
SELECT id, opened_at, closed_at, status, operator_id
FROM cash_sessions
WHERE opened_at >= '2024-11-08' AND opened_at < '2024-11-09'
ORDER BY opened_at;
```

Repérer l’**id** de la session à corriger (une seule en principe pour le 8-11).

### Étape 2 : Vérifier les ventes

```sql
SELECT id, sale_date, total_amount, created_at
FROM sales
WHERE cash_session_id = '<ID_SESSION>';
```

Noter le nombre de lignes et que les `sale_date` sont bien en novembre.

### Étape 3 : Corriger la session (8 novembre → 8 octobre)

Remplacez `'<ID_SESSION>'` par l’UUID trouvé à l’étape 1. L’année est en **2024** ; si vos données sont en 2025, changez les dates.

```sql
BEGIN;

-- Conserver l'heure, changer uniquement le jour (8 nov → 8 oct)
UPDATE cash_sessions
SET
  opened_at = date '2024-10-08' + (opened_at - date_trunc('day', opened_at)),
  closed_at = CASE
    WHEN closed_at IS NOT NULL THEN date '2024-10-08' + (closed_at - date_trunc('day', closed_at))
    ELSE NULL
  END
WHERE id = '<ID_SESSION>'
  AND opened_at >= '2024-11-08' AND opened_at < '2024-11-09';

-- Même correction pour la date des ventes de cette session
UPDATE sales
SET sale_date = date '2024-10-08' + (sale_date - date_trunc('day', sale_date))
WHERE cash_session_id = '<ID_SESSION>'
  AND sale_date >= '2024-11-08' AND sale_date < '2024-11-09';

-- Vérification
SELECT id, opened_at, closed_at FROM cash_sessions WHERE id = '<ID_SESSION>';
SELECT id, sale_date FROM sales WHERE cash_session_id = '<ID_SESSION>' LIMIT 5;

COMMIT;   -- ou ROLLBACK; en cas de doute
```

### Étape 4 : Contrôle rapide

- Dans l’interface Recyclic (journal de caisse / exports), la session doit apparaître au **8 octobre**.
- Les ventes de cette session doivent aussi apparaître au **8 octobre** dans les rapports et exports.

---

## 3. Si l’année ou le fuseau diffère

- **Année 2025 :** remplacer `2024-10-08` / `2024-11-08` par `2025-10-08` / `2025-11-08`.
- **Fuseau :** si les colonnes sont en `timestamptz` (recommandé), la conversion ci‑dessus reste valable ; en cas de stockage en heure locale, adapter éventuellement le `AT TIME ZONE` au fuseau du serveur.

---

## 4. Résumé

| Question | Réponse |
|----------|--------|
| Faut-il passer par la base ? | Oui, il n’y a pas d’écran pour modifier la date d’une session. |
| Quel(s) chiffre(s) / colonnes ? | `cash_sessions.opened_at` (et `closed_at`), puis `sales.sale_date` pour cette session. |
| Depuis le VPS / SSH ? | Se connecter à Postgres via `docker compose exec postgres psql -U recyclic -d recyclic` (ou avec `-f docker-compose.prod.yml -p recyclic-prod` en prod), puis exécuter le SELECT d’identification et les UPDATE ci‑dessus après backup. |

Une seule session (celle du 8-11) est modifiée ; les montants et le nombre de ventes ne changent pas.



dump : ./logs/recyclic_20260219_102529.dump