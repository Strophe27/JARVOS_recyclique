# Livraison — Paheko outbox hardening v2 (plan `.cursor/plans`)

**Date :** 2026-04-18  
**Plan source :** `.cursor/plans/paheko_outbox_hardening_v2_121f6d80.plan.md`  
**Branche :** `cursor/paheko-outbox-hardening-v2-9abb`  
**PR GitHub :** voir dépôt `Strophe27/JARVOS_recyclique` — PR ouverte sur cette branche vers `master` (titre du type « feat(paheko): durcissement outbox live-snapshot »).

## Synthèse technique

Implémentation des seeds **PAHEKO-SYNC-REL-01**, **AGR-01**, **SNAP-01**, **DEL-01** (+ correctifs QA secondaires) : agrégat live-snapshot honnête (`sync_aggregate_unavailable`, pas de `resolu` factice sur erreur agrégat), rang **rejete** domine **a_reessayer**, champ **`partial_success`**, garde **DELETE** super-admin sur batch partiel / livré / payload illisible (409), OpenAPI bump **0.1.25-draft**, Peintre (`live-snapshot-normalize`, bandeau, santé admin, notice caisse), doc mode d’emploi super-admin § Paheko support.

## Fichiers utiles

- Audit amont : [2026-04-18_01_audit-red-team-paheko-outbox-synthese-agents.md](./2026-04-18_01_audit-red-team-paheko-outbox-synthese-agents.md)
- Tests ajoutés / étendus : `recyclique/api/tests/test_paheko_outbox_hardening_v2.py`, `recyclique/api/tests/test_exploitation_live_snapshot.py`
- Kanban associé : carte archivée — `references/idees-kanban/archive/2026-04-18_durcissement-sync-paheko-outbox-post-audit.md`

## Suite recommandée

Valider **pytest** + **vitest** en local ou via CI sur la PR avant merge ; pas de journal BMAD `sprint-status` modifié pour ce chantier documentaire/hors story unique.
