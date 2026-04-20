# Audit AR12 / ADR 25-3 — Redis auxiliaire vs vérité durable outbox PostgreSQL (chemin async Paheko)

**Date :** 2026-04-20  
**Story :** 25.12 — `25-12-audit-code-ar12-redis-auxiliaire-async-paheko`  
**Périmètre :** transport / état / supervision des écritures **Paheko** après la chaîne canonique jusqu’à l’outbox (pas un inventaire général de tout Redis du dépôt sans qualification).

## Références normatives (chemins absolus repo)

| Document | Chemin |
|---------|--------|
| **ADR 25-3** (acceptée) | `d:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\_bmad-output\planning-artifacts\architecture\2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md` |
| **AR12** (epics) | `d:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\_bmad-output\planning-artifacts\epics.md` |
| **Chaîne canonique** | `d:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\_bmad-output\planning-artifacts\architecture\cash-accounting-paheko-canonical-chain.md` |
| **Spec 25.4** (croisement projection / outbox) | `d:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\_bmad-output\planning-artifacts\architecture\2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md` |

**Rappel ADR 25-3 (interprétation audit) :** l’outbox **durable** et autorité pour la file comptable async vers Paheko est **PostgreSQL** ; **Redis** ne doit pas tenir lieu de **source de vérité métier** ni de **file durable** pour cet axe ; usages Redis autorisés comme **auxiliaires** (buffering, dispatch, rate limiting, caches techniques), dans la limite où ils ne remplacent pas l’outbox SQL.

## Synthèse exécutive

- Sur le **cœur du chemin async Paheko** (enqueue SQL, modèles `paheko_outbox_*`, processeur, transitions, admin outbox, builders / client HTTP Paheko, agrégation supervision outbox en lecture SQL), **aucun import ni appel** à `get_redis()` / `redis` n’a été trouvé après lecture ciblée des modules listés ci‑dessous.
- La **persistance de l’intention de synchronisation** repose sur la table **`paheko_outbox_items`** (idempotence **`idempotency_key`** côté SQL + contrainte unique), pas sur Redis.
- Les usages Redis ailleurs dans l’API (idempotence HTTP caisse/ventes, cache session, step‑up, etc.) sont **hors cœur processeur outbox** ; pour **Paheko accounting** ils se classent comme **auxiliaires** tant qu’ils ne stockent pas l’état durable de la file outbox (conforme à l’esprit AR12 pour cet axe).

**Écarts matériels vs ADR 25-3 / AR12 sur ce périmètre :** **aucun** identifié à la date du rapport.

## Tableau allowed / forbidden (touchpoints qualifiés)

### A. Dans le périmètre « async Paheko » (cœur outbox + mapping + supervision SQL)

| Zone | Fichiers / modules (pointeurs) | Verdict ADR 25-3 / AR12 | Commentaire |
|------|----------------------------------|-------------------------|-------------|
| Enqueue outbox + lecture admin | `recyclique/api/src/recyclic_api/services/paheko_outbox_service.py` | **Allowed** (pas Redis) | Insertion `PahekoOutboxItem` en base ; idempotence **`PahekoOutboxItem.idempotency_key`** SQL |
| Processeur async | `recyclique/api/src/recyclic_api/services/paheko_outbox_processor.py` | **Allowed** (pas Redis) | Boucle métier DB + HTTP Paheko ; états `outbox_status` / `sync_state_core` persistés SQL |
| Audit transitions | `recyclique/api/src/recyclic_api/services/paheko_outbox_transition_audit.py` | **Allowed** (pas Redis) | Journal `paheko_outbox_sync_transitions` |
| Builder batch / payload | `recyclique/api/src/recyclic_api/services/paheko_close_batch_builder.py`, `paheko_transaction_payload_builder.py` | **Allowed** (pas Redis) | Construction payload à partir du modèle / snapshot |
| Client HTTP Paheko | `recyclique/api/src/recyclic_api/services/paheko_accounting_client.py` | **Allowed** (pas Redis) | Transport vers Paheko |
| Mapping | `recyclique/api/src/recyclic_api/services/paheko_mapping_service.py`, `recyclique/api/src/recyclic_api/models/paheko_cash_session_close_mapping.py`, schémas `schemas/paheko_mapping.py` | **Allowed** (pas Redis) | Projection / mapping avant succès outbox |
| Modèles + schémas API outbox | `recyclique/api/src/recyclic_api/models/paheko_outbox.py`, `models/paheko_outbox_sync_transition.py`, `schemas/paheko_outbox.py` | **Allowed** (pas Redis) | Vérité structurée alignée PostgreSQL |
| Admin outbox | `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_paheko_outbox.py` | **Allowed** (pas Redis) | Opérations sur lignes SQL |
| Planificateur tâche outbox | `recyclique/api/src/recyclic_api/services/scheduler_service.py` (`run_paheko_outbox_task` → `process_next_paheko_outbox_item`) | **Allowed** (pas Redis dans ce flux) | Exécution DB + processeur |
| Politique finale / quarantaine | `recyclique/api/src/recyclic_api/services/paheko_sync_final_action_policy.py` | **Allowed** (pas Redis) | Requêtes `PahekoOutboxItem` |
| Présentation clôture (corrélation outbox) | `recyclique/api/src/recyclic_api/application/cash_session_close_presentation.py` | **Allowed** (pas Redis) | Expose `paheko_outbox_item_id` issu du service |
| Supervision bandeau (agrégat outbox) | `recyclique/api/src/recyclic_api/services/exploitation_live_snapshot_service.py` | **Allowed** (pas Redis) | Agrégation **SQL** sur `PahekoOutboxItem` |

**Forbidden** pour ce périmètre : persister ou reconstruire la **file / état durable** de l’outbox Paheko **uniquement** depuis Redis ; remplacer **`paheko_outbox_items`** par une file Redis ; utiliser Redis comme **seule** preuve d’idempotence métier pour l’outbox. **Constat :** aucun fichier du tableau ci‑dessus ne présente de touchpoint Redis.

### B. Hors cœur « processeur outbox » mais dans l’écosystème caisse / API (à classer explicitement)

| Zone | Fichiers représentatifs | Verdict | Commentaire |
|------|-------------------------|---------|-------------|
| Idempotence HTTP clôture caisse | `api/api_v1/endpoints/cash_sessions.py` + `services/idempotency_support.py` | **Allowed (auxiliaire)** | Cache TTL de **réponses** idempotentes ; **ne remplace pas** la ligne outbox SQL ni `outbox_status` |
| Autres idempotences / imports DB | `sales.py`, `db_import.py`, `db_purge.py`, etc. | **Hors périmètre async Paheko** (qualifié) | Pas sur le chemin processor → Paheko |
| Step‑up / sécurité | `core/step_up.py`, endpoints expert comptable | **Hors périmètre async Paheko** | Rate limit / lockout PIN |
| Activité / auth cache | `services/activity_service.py`, `core/auth.py` | **Hors périmètre async Paheko** | Signaux session / cache utilisateur |
| Santé | `api/api_v1/endpoints/health.py`, `main.py` | **Hors périmètre** | `ping` infrastructure |

## Risques et anti‑patterns (mitigation)

| Risque | Mitigation |
|--------|------------|
| **Grep‑only** sans lien causal outbox | Revue fichier par fichier sur les modules `paheko_*` listés ; garde‑fu **pytest** listé ci‑dessous |
| **Nouveau code** introduisant Redis dans `paheko_outbox_*` | Repasser cet audit ; exécuter le pytest 25.12 en CI |
| Confusion **idempotence HTTP** vs **outbox durable** | Documenter que la **vérité file async** est **`paheko_outbox_items`** (cf. `enqueue_cash_session_close_outbox`) |

## Recommandations runtime (au moins une — livrées)

1. **Test (CI / local)** — garde régression AR12 sur le chemin qualifié :  
   `pytest recyclique/api/tests/test_story_25_12_ar12_paheko_async_path_no_redis.py -q`  
   (vérifie l’absence de motifs Redis dans les sources listés du périmètre async Paheko.)  
   Après correctif **CR1** (`cr_loop=1`), ce garde-fou couvre aussi explicitement `recyclique/api/src/recyclic_api/services/scheduler_service.py` (glue `run_paheko_outbox_task` → processeur outbox), en cohérence avec le tableau section A.

2. **Probe staging (manuelle)** — après déploiement sur un environnement de test :  
   - Requête SQL : lignes récentes dans `paheko_outbox_items` avec transitions cohérentes dans `paheko_outbox_sync_transitions`.  
   - Vérifier les logs applicatifs `paheko_outbox_enqueue` / `paheko_outbox_process` sans stratégie de file Redis pour l’état métier.

3. **Checklist canary (release)** — avant bascule prod : exécuter le pytest ci‑dessus ; confirmer qu’aucun nouveau fichier sous `services/paheko_*.py` ou `admin_paheko_outbox.py` n’importe `recyclic_api.core.redis`.

## Hors scope (rappel story)

**Pas de big bang** de refonte hybride de la chaîne async sans **nouvel ADR** explicite — cet audit ne livre pas de refonte, seulement constats et garde‑fous.

## Issues / backlog (écarts)

| ID interne | Sujet | Statut |
|------------|-------|--------|
| — | Aucun écart matériel identifié sur le périmètre qualifié | N/A |

*(Si un écart apparaît ultérieurement : créer une issue « Redis comme vérité outbox Paheko » et traiter comme escalade architecture.)*

## Méthode

- Inventaire `redis` / `get_redis` sous `recyclique/api/src/recyclic_api` puis **lecture** des modules `paheko_*`, `admin_paheko_outbox`, `cash_session_close_presentation`, `exploitation_live_snapshot_service` (sections outbox), `scheduler_service` (tâche outbox).
- Pas de modification de l’ADR 25-3 dans le cadre de cette story.
