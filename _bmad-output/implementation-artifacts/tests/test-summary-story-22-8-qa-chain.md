# Résumé QA / preuves — Story 22.8 (chaîne caisse → snapshot → écritures → sync)

**Date du document :** 2026-04-16  
**Story :** `22-8-rebaseliner-les-preuves-qualite-et-valider-bout-en-bout-la-chaine-caisse-snapshot-ecriture-paheko`  
**Référence architecture :** `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md`

## Objectif

Consolidation **honnête** des preuves sur le **rail comptable canonique** (référentiel → journal paiements → snapshot figé → builder Paheko → outbox), sans fusionner en un « tout vert » unique. Distinction stricite : **preuve locale** / **preuve réelle Paheko** / **hors périmètre** / **dette**.

---

## C4 — Gate pytest Epic 22 (Story Runner — PASS constaté)

**Date de constat :** 2026-04-16  
**Statut :** **PASS** (exit code 0)

**Exécution :** depuis le répertoire `recyclique/api/`, commande effective :

```text
python -m pytest tests/test_story_22_6_accounting_close_snapshot.py tests/test_story_22_7_paheko_close_batch_builder.py tests/test_story_22_2_dual_read_aggregate_compare.py tests/test_story_8_1_paheko_outbox_slice.py
```

**Périmètre du run :** uniquement les **4** fichiers ci-dessus (API pytest) ; **aucun** test e2e `peintre-nano` n’est inclus dans cette commande — cohérent avec la matrice (Peintre nommé, hors peloton C4).

**Mesure :** **40** tests collectés (16 + 4 + 7 + 13), durée indicative **~75 s** (Story Runner) ; sur une autre machine la durée peut dépasser légèrement (ex. **~86 s** sur machine locale **2026-04-16**, exit code **0**).

**Honnêteté 8.7 — colonne « Paheko réel » :** ces pytest constituent une **preuve locale** (base de tests, mocks HTTP / transport selon fichier, pas une instance Paheko distante). Ils **ne remplissent pas** et **ne remplacent pas** la colonne « preuve réelle Paheko » de la matrice ; toute équivalence implicite avec un Paheko de production reste **interdite** (cf. anti-abus `MockTransport`, story 8.7).

**Peloton alternatif documenté dans la story** (non inclus dans ce run) : `tests/test_story_22_7_outbox_processor_batch.py` — utile en complément si on étend le gate ; **non rejoué ici** (pas de double exécution du peloton déjà PASS).

---

## Matrice d’honnêteté — chaîne canonique (logique 8.7, quatre colonnes)

| Étape (minimum story) | Preuve locale | Preuve réelle Paheko | Hors périmètre | Dette restante |
|------------------------|---------------|----------------------|----------------|----------------|
| **Session + vente** (journal paiements canonique, scénarios 22.1–22.5 : mixte, don, gratuité, remboursement, etc.) | **Oui — ciblage pytest** : `test_story_22_1_payment_canonical_schema.py`, `test_story_22_3_expert_accounting.py`, `test_story_22_4_cash_sale_arbitrage.py`, `test_story_22_5_refund_canonical_authority.py` ; clôture / session : `test_cash_sessions.py`, `test_cash_session_close_*.py` (non listés exhaustivement ici). **E2e Peintre** (optionnel story) : ex. `tests/e2e/cashflow-nominal-6-1.e2e.test.tsx`, `tests/e2e/cash-register-session-close-13-3.e2e.test.tsx` — *hors peloton C4 ; non rejoués dans ce livrable DS* (le **PASS** § C4 ne les inclut pas). | **Non** à ce peloton : la vente ne constitue pas une « écriture Paheko » directe ; l’alignement comptable distant passe par la clôture / batch (lignes suivantes). | Parité **pure** UI legacy / navigation hub (Epic 11–13) sans critère comptable canonique ; scénarios **hors** caisse (réception, etc.). | **Dette nommée :** preuve E2E **headless** non rejouée dans ce DS ; couverture **exercice antérieur clos** / autorité Paheko peut nécessiter scénario terrain ou mock explicite (cf. 22.5). |
| **Snapshot figé — 22.6** | **Oui — fichier présent** : `tests/test_story_22_6_accounting_close_snapshot.py` (snapshot JSON figé, corrélation batch, invariants locaux). | **Non** : le snapshot est **produit et stocké côté Recyclique** ; ce n’est pas une preuve d’écriture distante. | Recalcul « mouvant » post-clôture présenté comme autorité (hors modèle cible). | Vérifier que les **anciennes** preuves de clôture Epic 6 (agrégats locaux) ne sont **pas** confondues avec le **snapshot comptable canonique** (étape 3 du delta archi). |
| **Batch builder + outbox — 22.7** | **Oui — fichiers présents** : `tests/test_story_22_7_paheko_close_batch_builder.py` (N sous-écritures déterministes), `tests/test_story_22_7_outbox_processor_batch.py` (processor / états locaux). | **Partiel / à ne pas sur-interpréter** : les pytest utilisent en général **HTTP mocké** (`MockTransport` ou équivalent) — **ce n’est pas** automatiquement une preuve d’écriture multi-lignes sur un **Paheko réel** avec la même sémantique qu’en production. | Refonte **hors périmètre** 22.8 : pas de changement métier ici ; schéma distant Paheko complet hors matrice 1.6 si non cadré. | **Dette nommée — D1 :** « Écriture Paheko réelle » pour le **batch canonique** (N sous-écritures + corrélation unique) : à tracer comme en **8.7** — soit procédure + preuve terrain, soit **constat B** (impossibilité / fenêtre), **sans** convertir les mocks en équivalence tacite. |
| **Visibilité sync** (statuts locaux, corrélations, états partiels / quarantaine — héritage Epic 8) | **Oui — ancrage** : `tests/test_story_8_1_paheko_outbox_slice.py` + comportements 8.2–8.6 dans la base de tests existante ; états batch 22.7 dans les tests dédiés. Le registre **Epic 8** (`references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md`) documente déjà la colonne « Paheko réel » pour le slice **historique**. | **Héritée de 8.7** pour l’ancienne unité de sync ; pour le **batch N lignes** post-22.7, la ligne « observable distant » peut exiger **mise à jour de registre** ou nouvelle trace datée — **non consolidée dans ce DS**. | Observabilité **Peintre** pure (bandeaux, navigation) sans lecture statut outbox backend. | **Dette nommée — D2 :** aligner explicitement le **registre Epic 8 §2** (ou annexe) sur **1 batch idempotent / N sous-écritures** si ce n’est pas déjà fait — éviter de réutiliser uniquement les preuves « une transaction » comme couverture du rail 22. |

---

## Relève honnête — preuves Epic 6 / Epic 8 vs rail canonique

Sources rapides : `6-7-mettre-en-place-la-cloture-locale-exploitable-de-caisse.md`, `8-7-valider-la-reconciliation-reelle-avec-paheko.md`, `cash-accounting-paheko-canonical-chain.md`.

| Zone | Statut par rapport au rail canonique | Commentaire |
|------|--------------------------------------|-------------|
| **Epic 6 (dont 6.7 clôture locale)** | **Encore valide** pour : parcours caisse terrain, clôture **locale** exploitable, step-up / idempotence, relais **vers** supervision admin **sans** simuler Epic 8. | **Insuffisant** pour : snapshot comptable **figé** au sens 22.6, journal paiements **canonique** distinct du legacy, batch **N sous-écritures** Paheko. Ne pas recycler les preuves 6.x comme autorité **comptable canonique intermédiaire**. |
| **Epic 8 (8.1–8.6 + tests)** | **Encore valide** pour : outbox durable, retries, idempotence, quarantaine, corrélation, politique blocage — **validés surtout avec mocks** en CI. | Le rail **22.7** change l’unité canonique de sync (**1 batch / N écritures**). Les anciennes preuves **slice cash_session_close** ne prouvent **pas** seules le nouveau contrat batch multi-lignes. |
| **8.7** | **Encore valide** comme **disciplines** : quatre colonnes, option (A) Paheko réel vs (B) constat, anti-abus `MockTransport`. | **À compléter** pour Epic 22 : lignes de preuve **spécifiques** au builder batch + états partiels par sous-écriture (cf. matrice ci-dessus, dettes D1/D2). |
| Fichiers / tests **à privilégier** pour la chaîne actuelle | — | `test_story_22_6_*.py`, `test_story_22_7_*.py`, `test_story_22_2_dual_read_aggregate_compare.py` (bascule / agrégats), en plus des gates 8.x ciblés. |

Synthèse une phrase : **Epic 6 et Epic 8 restent des fondations « terrain » et « transport »** ; le **delta canonique** (snapshot + builder + batch outbox) est porté par **Epic 22** — les preuves d’époque ne doivent pas être **substituées** au document d’architecture et aux pytest 22.x.

---

## Baseline réutilisable — Epic 10 (gates de readiness)

Epic 10 industrialise la **CI minimale**, la **chaîne OpenAPI**, les **manifests CREOS**, la **couverture de tests ciblée** et les **gates beta / v2 vendable** (`epics.md`, FR73 : jalons de gouvernance en Epic 1, **validation effective** en Epic 10). Pour la **readiness comptable caisse → Paheko**, ce livrable fournit un **modèle d’honnêteté** réimportable : **(1)** commandes pytest **nommées** par étape ; **(2)** séparation explicite **local / Paheko réel / hors scope / dette** ; **(3)** interdiction de réimporter implicitement les **vieilles** preuves Epic 6–8 comme couverture du **rail canonique** ; **(4)** critère d’entrée CI : gate pytest Story Runner **PASS** ou sous-ensemble **documenté** (pas de faux vert). Epic 10 peut **brancher** ses critères 10.4 / 10.7 / 10.8 sur cette baseline sans dupliquer le récit métier.

---

## Liste nominative rapide (critère C1 — extraits)

| Preuve / fichier | Encore valide | Insuffisante / à compléter | À ne plus présenter comme |
|------------------|---------------|----------------------------|---------------------------|
| Story **6.7** + e2e / captures clôture locale | Oui (parcours, sécurité, admin) | Snapshot canonique 22.6 | Preuve « compta canonique complète » |
| Stories **8.1–8.6** + pytest | Oui (transport, états) | Batch N sous-écritures 22.7 | Couverture équivalente **écriture réelle** Paheko |
| **8.7** registre + matrice 4 colonnes | Oui (méthode + slice historique) | Ligne batch multi-lignes post-22.7 | Statut « tout couvert » sans mise à jour |
| **22.6 / 22.7** pytest listés | Cible actuelle chaîne figée + builder | — | — |

---

## e2e minimal nommé (C3)

**Chemin documenté** : enchaînement **Peintre** — ouverture / vente / clôture session — tests indicatifs `peintre-nano/tests/e2e/cashflow-nominal-6-1.e2e.test.tsx`, `peintre-nano/tests/e2e/cash-register-session-close-13-3.e2e.test.tsx` ; scénario remboursement canonique : `peintre-nano/tests/e2e/cashflow-refund-22-5.e2e.test.tsx`.

**AC « chaîne e2e » (caisse → snapshot → écriture → sync visible) — décision QA worker 22.8 :** **aucun nouveau fichier e2e ajouté.** La chaîne **métier canonique** (snapshot figé, builder sous-écritures, outbox / slice) est couverte par le **peloton pytest backend** (C4) ; un e2e UI **supplémentaire** qui pousserait la clôture jusqu’à l’observation outbox / Paheko risquerait la **flakiness** (timers, mocks réseau, état session) sans gain proportionnel hors périmètre story **preuves**. La couverture e2e pour le parcours **utilisateur** (caisse / clôture) reste assurée par la **combinaison** des e2e existants nommés ci-dessus + les pytest listés en C4 (cohérence 8.7).

Pour une **procédure manuelle** reproductible (HITL, colonne Paheko réel ou constat B), réutiliser la logique **8.7** (checklist clôture → outbox → observation distante ou constat B).

---

## Références croisées

- `_bmad-output/implementation-artifacts/8-7-valider-la-reconciliation-reelle-avec-paheko.md`
- `_bmad-output/implementation-artifacts/22-6-construire-le-snapshot-comptable-fige-de-cloture-de-session.md`
- `_bmad-output/implementation-artifacts/22-7-generer-les-ecritures-avancees-multi-lignes-paheko-et-adapter-la-sync-epic-8.md`
- `references/artefacts/2026-04-10_01_sync-paheko-exploitabilite-terrain-epic8-squelette.md` (registre Epic 8)
