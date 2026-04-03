# Story 2.5 — Fondations audit / persistance terrain (hooks Epic 8)

## Persistance terrain d’abord

- Les écritures métier (ventes, fermeture session, etc.) sont validées en base **sans** attente d’une sync comptable (Paheko) sur le chemin nominal.
- **Fermeture caisse** : `CashSessionService.close_session_with_amounts` commit la session ; l’entrée `audit_logs` est écrite **après** ce commit (ligne d’audit best-effort). Si l’audit échoue, l’opération métier reste persistée ; l’échec est journalisé côté application (`audit_persist_failed`).

## Schéma minimal `details_json` (événements critiques caisse)

Champs recommandés (fusionnés par `merge_critical_audit_fields`) :

| Champ | Rôle |
|--------|------|
| `request_id` | Corrélation HTTP (`X-Request-Id` / `request.state.request_id`) |
| `operation` | Identifiant stable d’opération (ex. `cash_session.close`, `cash_sale.create`) |
| `outcome` | `success` \| `refused` \| `error` |
| `user_id` | Acteur métier (UUID string) |
| `site_id` | Périmètre site si connu |
| `cash_register_id` | Poste de caisse si connu |
| `session_id` | Session de caisse si pertinent |

Types d’action dédiés (enum) : `cash_session_opened`, `cash_session_closed`, `cash_session_accessed`, `cash_sale_recorded`.

## Réserve Epic 8 (sync différée, quarantaine)

Sans implémenter le moteur de sync, les stories 8.x pourront s’appuyer sur :

- **État métier déjà persisté** dans les tables existantes (`sales`, `cash_sessions`, etc.).
- **Traçabilité** : corrélation `request_id` + `operation` + `outcome` dans `audit_logs`.
- **Extensions futures possibles** (non livrées en 2.5) : colonnes ou table dédiée type `outbox` / `sync_state` avec champs suggérés `external_sync_status`, `last_sync_at`, `quarantine_reason`, `retry_count` — à spécifier au moment d’Epic 8.
