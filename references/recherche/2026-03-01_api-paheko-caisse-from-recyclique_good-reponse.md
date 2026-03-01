Oui, exactement — et c'est la bonne approche. Voici comment la structurer proprement.

## Ticket par ticket vs. consolidation de session

**Enregistrer ticket par ticket dans Paheko est la meilleure granularité** pour deux raisons  :
- Le champ `reference` (numéro de pièce comptable) peut accueillir ton `ticket_id` RecyClique — ça donne une **traçabilité directe** sans table de jointure
- L'API retourne l'`id` de la transaction Paheko créée, que tu stockes côté RecyClique — la correspondance est bidirectionnelle

La consolidation par session (une seule écriture pour toute la journée) ferait perdre toute la granularité et rendrait les remboursements impossibles à lier.

***

## Champs exacts à envoyer par ticket

Pour un ticket simple (un seul moyen de paiement), type `REVENUE` simplifié  :

```json
POST /api/accounting/transaction
{
  "id_year": 3,
  "label": "Vente caisse #TK-2026-00142",
  "date": "2026-03-01",
  "type": "REVENUE",
  "amount": 35.00,
  "credit": "707",
  "debit": "512",
  "reference": "TK-2026-00142",
  "notes": "Mobilier x1 (30€) + Textile x2 (5€) | Session #42 | Op: Marie"
}
```

Pour un ticket **multi-paiements** (espèces + CB), type `ADVANCED` multi-lignes  :

```json
{
  "id_year": 3,
  "label": "Vente caisse #TK-2026-00142",
  "date": "2026-03-01",
  "type": "ADVANCED",
  "reference": "TK-2026-00142",
  "notes": "Session #42 | Op: Marie",
  "lines": [
    { "account": "707", "credit": 35.00, "label": "Ventes marchandises" },
    { "account": "512", "debit": 20.00, "label": "Espèces" },
    { "account": "514", "debit": 15.00, "label": "CB" }
  ]
}
```

Pour un **remboursement**, tu crées une nouvelle transaction avec les débits/crédits inversés **et tu la lies au ticket original** via `linked_transactions`  :

```json
{
  "id_year": 3,
  "label": "REMBOURSEMENT #TK-2026-00142",
  "date": "2026-03-01",
  "type": "REVENUE",
  "amount": -35.00,
  "credit": "512",
  "debit": "707",
  "reference": "RMB-TK-2026-00142",
  "linked_transactions": [98]   ← id_paheko du ticket original
}
```

***

## Structure de la table de correspondance

Une table simple côté PostgreSQL RecyClique suffit  :

```sql
CREATE TABLE paheko_sync (
  id                    SERIAL PRIMARY KEY,
  ticket_id             VARCHAR(50) NOT NULL,      -- TK-2026-00142
  paheko_transaction_id INTEGER NOT NULL,           -- retourné par l'API Paheko
  paheko_year_id        INTEGER NOT NULL,           -- id_year Paheko
  sync_type             VARCHAR(20) NOT NULL,       -- 'sale' | 'refund'
  synced_at             TIMESTAMPTZ DEFAULT NOW(),
  sync_status           VARCHAR(20) DEFAULT 'ok',  -- 'ok' | 'error' | 'pending'
  error_message         TEXT,
  UNIQUE(ticket_id, sync_type)
);
```

Le flux dans ton middleware FastAPI devient alors :

```
Ticket finalisé dans RecyClique
        ↓
POST /api/accounting/transaction → Paheko
        ↓ réponse: { "id": 98, ... }
INSERT INTO paheko_sync (ticket_id='TK-…', paheko_transaction_id=98, ...)
```

***

## Gestion des erreurs et idempotence

Un point critique : **si le POST à Paheko échoue** (réseau, timeout), tu dois pouvoir rejouer sans créer de doublon. Deux stratégies  :

- **Avant d'envoyer**, vérifie via `GET /api/sql` que `reference = 'TK-2026-00142'` n'existe pas déjà dans `acc_transactions`
- **Ou** utilise la table `paheko_sync` avec `sync_status = 'pending'` et un worker de retry qui recheck les tickets non synchronisés

La première est plus simple, la seconde plus robuste pour un usage en production avec connexion intermittente (tablette en ressourcerie avec Wi-Fi fragile).