# Story 23.4 : Paheko clôture — un seul builder (ventilation détaillée), suppression du mode agrégé

Status: done

**Story key :** `23-4-paheko-close-builder-unique-ventilation-detaillee-supprimer-agregue`  
**Epic :** 23 — Alignement produit post-Epic 22 (prolongement correct-course après clôture Epic 23 v1)  
**Contexte :** Décision architecte produit **ferme** (2026) : le mode agrégé `aggregated_v22_7` est **comptablement insuffisant** pour une association (pas de rapprochement bancaire honnête si espèces / chèque / CB sont fusionnés). Aucune configuration déploiement ne doit permettre de « revenir » à ce mode.

## Décision produit (source de vérité)

À intégrer telle quelle dans les Dev Notes et la doc exploit :

1. **Supprimer** la valeur `aggregated_v22_7` et **toute** logique de builder associée (pas seulement masquer le défaut).
2. **Renommer** le mode historique `per_payment_method_v1` en identifiant **neutre** (ex. `detailed` ou `standard`) — c’est désormais le **seul** chemin runtime ; le nom ne doit plus suggérer une alternative.
3. **Supprimer entièrement** la variable d’environnement **`PAHEKO_CLOSE_SALES_BUILDER_POLICY`** du modèle `Settings` et de la doc de déploiement. Aucun levier : même si un `.env` ancien la définit encore, **aucun attribut Settings ne doit la consommer** — une fois le champ retiré, le chargement ignore les clés non déclarées (voir Dev Notes § Config / `.env` orphelin).
4. **Tests** : le builder détaillé reste **couvert par pytest** unitairement / intégration ; **pas** de branche « agrégé » réservée aux tests prod-like sauf si explicitement rejetée par AC.
5. **Environnements** : le porteur (Strophe) confirme qu’**aucun état outbox / idempotence** hors bases dev/tests ne doit être migré ; rupture de chaînes `kind` / `builder_policy` **acceptable** (pas de compatibilité ascendante requise avec préprod vide).

## Alignement sprint-status

- Clé sprint : `23-4-paheko-close-builder-unique-ventilation-detaillee-supprimer-agregue` → **ready-for-dev** (create-story 2026-04-16).
- Epic parent : `epic-23` repassé **in-progress** le temps d’implémenter 23.4 (Epic 23 livré en 3 stories ; 23.4 = bétonnage politique builder post-epic).
- **`epic-23-retrospective` reste `done`** : la rétro documente la livrée « v1 » (23.1–23.3) ; l’extension 23.4 ne rouvre pas automatiquement une rétro (nouvelle rétro optionnelle après clôture 23.4 si l’équipe le souhaite).

## Story (BDD)

As a trésorier ou responsable comptable d’une association,  
I want que **toute** clôture de caisse qui pousse le bloc « ventes + dons » vers Paheko le fasse **uniquement** avec **ventilation par moyen de paiement** (lignes débit sur comptes du référentiel figé, crédits ventes / dons sur comptes globaux de la révision), **sans** possibilité cachée d’une écriture mono-ligne agrégée,  
So that le **rapprochement bancaire** et le **contrôle de caisse** restent possibles et la compta associative reste **défendable**.

## Acceptance criteria

1. **Plus d’agrégat** — *Given* le code du `paheko_close_batch_builder` et des appelants ; *When* on cherche `aggregated_v22_7` / `POLICY_AGGREGATED` / branche équivalente ; *Then* **aucun** chemin d’exécution ne génère la sous-écriture historique « une ligne ventes+dons » par le post-22.7 ; *And* toute mention retirée de `config` / `settings` / `docker-compose` en matière de choix de politique.
2. **Une seule politique** — *Given* `build_planned_sub_writes` (ou équivalent) ; *When* on construit le plan de clôture ; *Then* l’index 0 (ventes + dons) est **toujours** la version **détaillée** (ex-`per_payment_method_v1`, ex-ADVANCED multi-lignes) ; *And* le paramètre **`sales_policy` est supprimé** de toutes les signatures et tous les appels (plus d’override runtime — décision tranchée pour éviter deux implémentations).
3. **Variable d’environnement** — *Given* `recyclic_api.core.config.Settings` et le `docker-compose` racine ; *When* on cherche `PAHEKO_CLOSE_SALES_BUILDER_POLICY` ; *Then* le champ **n’existe plus** sur le modèle ; *And* après cette suppression, `PAHEKO_CLOSE_SALES_BUILDER_POLICY=…` dans un `.env` historique ne mappe sur **aucun** champ — le comportement attendu est déjà celui de **`model_config = ConfigDict(..., extra="ignore")`** dans `config.py` (pas de test obligatoire si on documente ce lien ; un micro-test optionnel de chargement peut renforcer la gate).
4. **Renommage** — *Given* constantes / champs d’observabilité `builder_policy` (ex. JSON outbox) ; *When* on embarque le build ; *Then* le libellé retenu (ex. `detailed` / `standard`) remplace `per_payment_method_v1` partout **côté productisé** (const Python, logs, doc) ; *And* **décider** si les clés d’idempotence / `sub_kind` existants (ex. `sales_donations_per_pm_v1`) changent : accepter la **rupture** en dev (Strophe) — **lister explicitement** dans le corps de PR / note DoD toute chaîne renommée (évite une double passe ou un renommage oublié).
5. **Non-régression tests** — *When* `pytest` ciblé story 23-1 + 22-7 + 8.x (fichiers listés en Dev Notes) est exécuté ; *Then* **vert** ; *And* les tests qui forçaient `aggregated` (ex. `test_story_8_3`, `test_story_8_4` — `monkeypatch` agrégé) sont **réécrits** pour le seul chemin valide (ou supprimés s’ils ne testaient que l’agrégat).
6. **Documentation** — *When* la story est finie ; *Then* **`doc/modes-emploi/mode-emploi-parametrage-comptable-superadmin.md`** et **`_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md`** ne mentionnent **plus** deux politiques ni `PAHEKO_CLOSE_SALES_BUILDER_POLICY` ; *And* un paragraphe explique : **ventilation détaillée = seul mode supporté**.

## Définition of Done

- [x] Code : builder + config + nettoyage des constantes exportées `__all__` si besoin.
- [x] OpenAPI : aucun schéma `builder_policy` / ancienne paire dans `contracts/` (vérifié).
- [x] `pytest` : peloton § Dev Notes vert (2026-04-16).
- [x] Revue doc interne (**chemins exacts** § AC6 : mode emploi + canonical-chain).
- [x] Chaînes observabilité : `builder_policy` → **`detailed`** ; `sub_kind` ventes+dons inchangé **`sales_donations_per_pm_v1`** (PR / AC4).

## Dev Notes — Ancrage fichiers (grep 2026-04-16)

| Zone | Chemins |
|------|---------|
| Builder | `recyclique/api/src/recyclic_api/services/paheko_close_batch_builder.py` (`POLICY_DETAILED`, ventilation unique ADVANCED) |
| Config | `recyclique/api/src/recyclic_api/core/config.py` (champ `PAHEKO_CLOSE_SALES_BUILDER_POLICY` retiré) |
| Compose | Racine `docker-compose.yml` — entrées env API si présentes |
| Tests | idem + `test_story_8_2_paheko_outbox_retry_idempotence.py` ; `tests/paheko_8x_test_utils.attach_latest_accounting_revision_to_session` |
| Doc | `doc/modes-emploi/mode-emploi-parametrage-comptable-superadmin.md`, `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` |

### Config / `.env` orphelin (liaison AC3)

Le fichier `recyclique/api/src/recyclic_api/core/config.py` définit déjà `model_config = ConfigDict(..., extra="ignore")` pour `Settings`. **Après** suppression du champ `PAHEKO_CLOSE_SALES_BUILDER_POLICY`, une variable d’environnement portant ce nom **ne peut plus** peupler un attribut : elle est ignorée comme toute clé non déclarée — conformément à la Décision produit §3 (aucune lecture résiduelle). Un test Pytest ciblant ce comportement est **recommandé mais optionnel** si la revue confirme le lien code ci-dessus.

### Payload / idempotence

- Si vous renommez les chaînes **`kind`** observabilité ou **`sub_kind`** dans les payloads déjà utilisées pour idempotence HTTP : **documenter** dans la PR (**liste explicite** des anciennes → nouvelles chaînes, cf. AC4) ; pas de migration données nécessaire pour les environnements **sans** stocks outbox réels (Décision produit §5).

### Hors périmètre

- Modifier les **comptes** du mapping Paheko clôture (7073 vs 707) — autre ticket / paramétrage terrain.
- UI Peintre : aucune bascule utilisateur (supprimée avec la variable).

## QA Gate (Story — pré DS)

Checklist minimale avant passage **review** :

| # | Vérification |
|---|----------------|
| Q1 | `grep -r "aggregated_v22_7\|POLICY_AGGREGATED\|PAHEKO_CLOSE_SALES_BUILDER_POLICY"` sur `recyclique/api/src` → **aucune** occurrence **fonctionnelle** résiduelle. **Hors périmètre du « zéro match »** : `CHANGELOG*`, commentaires d’intention explicite (« removed in 23.4 »), ou fichiers d’archive `_bmad-output/` — ces mentions sont acceptables si non exécutées. |
| Q2 | `grep` même motif dans `docker-compose.yml`, `.env.example` si présent — même logique (pas de clé / valeur encore utilisées au runtime). |
| Q3 | `pytest` **peloton complet** tableau § Dev Notes (23-1 + **22-7** ×2 + 8-3 + 8-4) → tout vert sur machine agent ou CI. |
| Q4 | Lecture doc courte : paragraphe « un seul mode » présent et sans contradiction avec Epic 23 stories 23.1–23.3. |

---

## Tasks / Subtasks (pour implémenteur)

- [x] Supprimer branche agrégée et `_effective_sales_policy` ; constante **`POLICY_DETAILED`** (`detailed`).
- [x] Retrait complet `PAHEKO_CLOSE_SALES_BUILDER_POLICY` (`Settings`).
- [x] Call sites : **`sales_policy` retiré** de `build_planned_sub_writes`, `build_cash_session_close_batch_from_enriched_payload`.
- [x] Tests 23-1 / 22-7 ×2 / 8-2 / 8-3 / 8-4 ; helper **`attach_latest_accounting_revision_to_session`** (+ moyen `cash` minimal si snapshot SQLite vide).
- [x] Doc mode emploi + canonical-chain § ventilation.
- [x] Story passée **`done`** après gates pytest + revue livrable.

---

## Dev Agent Record — Implémentation (BMAD DS / gates)

**Résumé livré :** un seul chemin Paheko pour ventes+dons (ADVANCED ventilé), observabilité `builder_policy=detailed`, suppression Settings env agrégée ; tests Epic 8 ré-alignés (sessions de test avec révision + ligne cash dans snapshot révision si besoin SQLite).

**Fichiers principaux touchés :**  
`paheko_close_batch_builder.py`, `config.py`, `paheko_8x_test_utils.py`, tests listés § Dev Notes, `mode-emploi-parametrage-comptable-superadmin.md`, `cash-accounting-paheko-canonical-chain.md`.
