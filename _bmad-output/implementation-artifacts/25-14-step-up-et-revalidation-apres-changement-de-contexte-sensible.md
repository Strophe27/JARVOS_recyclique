# Story 25.14 : Step-up et revalidation après changement de contexte sensible

Status: done

<!-- Note : validation optionnelle — validate-create-story avant dev-story. -->

**Story key :** `25-14-step-up-et-revalidation-apres-changement-de-contexte-sensible`  
**Epic :** 25 — phase 2 (impl)  
**Fichier story :** `_bmad-output/implementation-artifacts/25-14-step-up-et-revalidation-apres-changement-de-contexte-sensible.md`

## Dépendances (DAG et prérequis)

- **25-8** — **done** : refus sur contexte stale (`CONTEXT_STALE` / en-têtes `X-Recyclique-Context-*`), erreurs explicites ; ne pas régresser ce socle. Story : `25-8-refus-par-defaut-et-erreurs-explicites-apres-bascule-site-ou-caisse.md`.
- **25-13** — **done** : journalisation opérateur vs poste/kiosque sur au moins un chemin cashflow ; utiliser ces traces pour **preuves** là où l’AC exige des logs corrélés. Story : `25-13-journalisation-identite-operateur-versus-poste-ou-kiosque-tranche-minimale.md`.
- Graphe machine : `_bmad-output/planning-artifacts/architecture/epic-25-phase2-dag-2026-04-21.yaml` — nœud **25-14** `depends_on` : **25-8**, **25-13**.

## Story (BDD)

As a caisse security owner,  
I want step-up or revalidation after sensitive context changes per ADR **25-2** and spec **3.2**,  
So that default deny holds until identity proof matches the ADR model.

## Acceptance criteria

Source normative : `_bmad-output/planning-artifacts/epics.md` — **Story 25.14** (reprise alignée titre epic ; ponctuation FR dans ce fichier).

**Given** **25.8** is delivered and **25.13** is available for log proof where needed  
**When** this story is delivered  
**Then** a documented matrix maps context-change scenarios to required proof (operator PIN, post secret, forbidden combinations) and tests cover representative rows  
**And** offline kiosk PIN tolerance and device token flows stay explicitly out of scope here  
**And** multi-client divergence risks (two tabs, in-flight requests) are either tested or explicitly documented as follow-up with owner

### Ancres checklist 25.7 (spec 25.4 §3.2)

Fichier : `_bmad-output/implementation-artifacts/checklists/25-7-checklist-spec-25-4-sections-2-3.md`

| ID | Rôle pour 25.14 |
|----|------------------|
| `CTX-SWITCH-3-2-OPERATOR-PIN-CANON-PRD-11-2` | PIN opérateur serveur canon — ne pas substituer un autre mécanisme pour les actions sensibles §11.2 lorsque le backend est en ligne. |
| `CTX-SWITCH-3-2-KIOSQUE-POSTE-STEPUP-ADR-25-2` | PIN kiosque, secret de poste, lockout, step-up : **ADR 25-2** ; la matrice documentée doit **citer** l’ADR pour chaque ligne « preuve requise ». |
| `CTX-SWITCH-3-2-REVALIDATION-DEFAULT-DENY` | Après changement de contexte sensible : **refus par défaut** jusqu’à preuve conforme — cohérent avec **25.8** (pas de continuation silencieuse). |

Spec **25.4** §3.2 : `_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md` — section **3.2 PIN, step-up et kiosque**.

## Interprétation exécutable (livrables)

1. **Matrice (document versionné in-repo)**  
   - Emplacement recommandé : `_bmad-output/implementation-artifacts/` ou `references/artefacts/` (nom daté, ex. `2026-04-20-matrice-step-up-revalidation-contexte-sensible-25-14.md`).  
   - Colonnes minimales suggérées : *scénario de changement de contexte* (ex. bascule site, bascule caisse / session, combinaisons avec escalation) ; *régime* (en ligne — périmètre de cette story) ; *preuve requise* (PIN opérateur via `X-Step-Up-Pin`, secret de poste si modèle ADR applicable côté serveur, rôle kiosque) ; *combinaisons interdites / anti-patterns* (ex. accepter PIN kiosque local à la place du step-up opérateur serveur pour une action §11.2 en ligne — voir ADR §1 séparation normative et §5 offline).  
   - Références obligatoires dans l’en-tête du doc : **ADR 25-2**, **spec 25.4 §3.2**, **PRD §11.2** (PIN opérateur), story **25-8** (ordre : stale avant mutation / codes stables).

2. **Implémentation**  
   - S’appuyer sur le module existant `recyclique/api/src/recyclic_api/core/step_up.py` (`verify_step_up_pin_header`, `X-Step-Up-Pin`, codes `STEP_UP_*`) et sur les gardes contexte `enforce_optional_client_context_binding` / `enforce_optional_client_context_binding_from_claim` (story **25-8**).  
   - Définir quelles **routes** ou **transitions d’état** après **reprise** d’un contexte frais (post-bascule) exigent une **revalidation** explicite (step-up) en plus du simple alignement d’en-têtes — sans élargir hors périmètre (pas de PWA offline, pas de file device token).  
   - Si de nouveaux champs ou en-têtes touchent l’enveloppe de contexte : coordonner avec les artefacts **25.11** (`contracts/openapi/fragments/context-envelope-examples-25-11.yaml`, `peintre-nano/src/types/context-envelope.ts`).

3. **Preuves logs (là où l’AC « Given 25.13 » s’applique)**  
   - Pour au moins un scénario représentatif, corréler **événement de step-up réussi** ou **refus** avec la politique de champs **25.13** (opérateur vs ancrage poste) sur le chemin déjà instrumenté ou un chemin adjacent justifié.

4. **Deux onglets / requêtes en vol**  
   - Soit **tests automatisés** (ex. enchaînement deux contextes / séquence requêtes) qui montrent l’absence de contournement ou le refus explicite, soit une sous-section **« Suivi »** dans la matrice avec *propriétaire*, *risque*, *critère de clôture* — pas de silence.

## Hors scope (explicite)

- **Tolérance PIN kiosque offline** et **flux device token** complets (enrôlement, rotation, sync lockout PWA) : **hors** 25.14 ; renvoi **readiness PWA** / stories **13.8** / **25.15** selon le sujet.  
- **UI kiosque** complète « passer la main » : peut être partiellement préparée côté contrat mais la livraison produit large reste hors cette story si non nécessaire aux lignes de matrice retenues.  
- **Nouvelle ADR** : non requise si le comportement **étend** l’**ADR 25-2** *accepted* sans contradiction ; sinon **correct course**.

## Definition of Done

- [x] Matrice **documentée** (scénarios × preuve × combinaisons interdites) + liens **ADR 25-2**, **spec 25.4 §3.2**, **checklist 25.7** (`CTX-SWITCH-3-2-*`).  
- [x] Comportement **revalidation / step-up** aligné **refus par défaut** après changement de contexte sensible, **sans régression** **25.8** (`CONTEXT_STALE`, OpenAPI).  
- [x] **Pytest** dédié story : `recyclique/api/tests/test_story_25_14_step_up_revalidation_apres_changement_contexte_sensible.py` — couvre des **lignes représentatives** de la matrice (pas besoin d’exhaustion complète si la matrice liste explicitement le report).  
- [x] Risque **deux onglets / in-flight** : **testé** ou **documenté** en suivi avec propriétaire.  
- [x] **Hors scope** rappelé : offline kiosk PIN tolerance, device token flows.  
- [x] Si gate parent l’exige : **test-summary** QA sous `_bmad-output/implementation-artifacts/tests/` (même pattern que **25-12** / **25-13**).

## Tasks / Subtasks

- [x] Lire **ADR 25-2**, **spec 25.4 §3.2**, **checklist 25.7** (`CTX-SWITCH-3-2-*`), stories **25-8** et **25-13** (AC + impl actuelle) (AC: **Given** / **Then**)
- [x] Rédiger la **matrice** markdown (scénarios, preuves, interdits, suivi two-tabs si besoin) (AC: **Then** documented matrix)
- [x] Cartographier les **routes / mutations** concernées après bascule sensible ; ordonner **context binding** puis **step-up** où pertinent (AC: **Then** / **And** default deny)
- [x] Implémenter ou **étendre** `step_up` / routes sans casser les codes d’erreur existants (AC: **Then**)
- [x] Ajouter corrélation **logs / audit** avec politique **25.13** sur au moins un scénario représentatif (AC: **Given 25.13**)
- [x] Écrire **pytest** `test_story_25_14_step_up_revalidation_apres_changement_contexte_sensible.py` (AC: **Then** tests)
- [x] Mettre à jour **OpenAPI** / types **25.11** si contrat public change ; noter dans la matrice (AC: coordination contrat)

## Dev Notes

### Ancres code (point de départ)

- Step-up PIN : `recyclique/api/src/recyclic_api/core/step_up.py` (`STEP_UP_PIN_HEADER`, `verify_step_up_pin_header`, constantes `SENSITIVE_OPERATION_*`).
- Contexte stale / binding : recherche `enforce_optional_client_context_binding` dans `recyclique/api/src/recyclic_api/api/api_v1/endpoints/` (ex. `sales.py`, `cash_sessions.py`).
- Enveloppe : `recyclique/api/src/recyclic_api/services/context_envelope_service.py`, schémas `context_envelope.py`.
- Journalisation critique : `recyclique/api/src/recyclic_api/services/sale_service.py`, `recyclique/api/src/recyclic_api/core/audit.py` (patterns **25-13**).

### Anti-patterns

- Utiliser le **PIN kiosque** ou un **jeton poste** seul pour **contourner** le **step-up opérateur serveur** sur une action **§11.2** en ligne → viole **ADR 25-2** et **CTX-SWITCH-3-2-OPERATOR-PIN-CANON-PRD-11-2**.  
- Oublier **409** `CONTEXT_STALE` quand le client envoie des en-têtes désalignés **avant** de traiter un step-up → régression **25-8**.  
- Mélanger dans un même champ JSON **identité opérateur** et **ancrage poste** sans la légende **25-13**.

### Intelligence story précédente (25-13)

- Politique de champs distincts opérateur / poste pour preuves d’audit ; pytest story dédié et éventuel **test-summary** ; ne pas dupliquer toute la story 25.13 — **consommer** pour corrélations **25-14**.

### Intelligence story 25-8

- Garde-fou : sans en-têtes de liaison, pas de 409 « stale » artificiel ; avec en-têtes valides désalignés → **409** `CONTEXT_STALE`, `retryable: false`. La **25-14** ajoute la couche **« quelle preuve après contexte frais / sensible »**, pas le remplacement du mécanisme stale.

### Testing / gates (rappel parent)

- **Pytest** : fichier normatif **`recyclique/api/tests/test_story_25_14_step_up_revalidation_apres_changement_contexte_sensible.py`** (brief Story Runner).  
- Exécution ciblée attendue au **GATE** parent après DS ; en CS, ne pas exécuter la suite complète sauf besoin local.

### Project Structure Notes

- Backend : `recyclique/api/src/recyclic_api/`, tests `recyclique/api/tests/`.  
- Artefacts BMAD : `_bmad-output/implementation-artifacts/`, `_bmad-output/planning-artifacts/architecture/`.

### References

- `_bmad-output/planning-artifacts/epics.md` — **Story 25.14**
- `_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md` — **ADR 25-2**
- `_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md` — **§3.2**
- `_bmad-output/implementation-artifacts/checklists/25-7-checklist-spec-25-4-sections-2-3.md`
- `_bmad-output/implementation-artifacts/25-8-refus-par-defaut-et-erreurs-explicites-apres-bascule-site-ou-caisse.md`
- `_bmad-output/implementation-artifacts/25-13-journalisation-identite-operateur-versus-poste-ou-kiosque-tranche-minimale.md`
- `_bmad-output/planning-artifacts/architecture/epic-25-phase2-dag-2026-04-21.yaml`
- `_bmad-output/planning-artifacts/prd.md` — **§11.2** (PIN opérateur)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Trace alignement sprint

- **DS 2026-04-20 (bmad-dev-story Task) :** impl matrice + extension `step_up.py` + pytest gate + test-summary ; `development_status` **`ready-for-dev`** → **`review`** ; **epic-25** inchangé **in-progress** ; prochaine étape **GATE** parent.

## Dev Agent Record

### Agent Model Used

(Task BMAD — bmad-dev-story / DS)

### Debug Log References

### Completion Notes List

- Matrice versionnée avec citation **ADR 25-2** par ligne « preuve », suivi deux onglets, cartographie routes (binding **25.8** puis step-up).
- `step_up.py` : constante `STEP_UP_PROOF_SERVER_OPERATOR_PIN`, doc module 25.14, logs `operator_user_id` / `proof` / `proof_expected` pour corrélation **25.13** ; pas de changement d’ordre sur les routes (déjà conformes).
- Pytest : chemins remboursement exceptionnel (aligné matrice cashflow) + spot-check **25.8** sur correction vente.

### File List

- `_bmad-output/implementation-artifacts/25-14-step-up-et-revalidation-apres-changement-de-contexte-sensible.md` (story — statut **done**, DoD / tasks cochés)
- `_bmad-output/implementation-artifacts/2026-04-20-matrice-step-up-revalidation-contexte-sensible-25-14.md` (matrice Story 25.14)
- `_bmad-output/implementation-artifacts/tests/test-summary-story-25-14-step-up-revalidation-contexte-sensible.md` (synthèse QA)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (trace + `25-14` → **done**)
- `recyclique/api/src/recyclic_api/core/step_up.py` (extension 25.14)
- `recyclique/api/tests/test_story_25_14_step_up_revalidation_apres_changement_contexte_sensible.py` (gate pytest)

## Change Log

- **2026-04-20 — DS :** Matrice ADR 25-2 ; extension journalisation `step_up` (preuve serveur, corrélation 25.13) ; pytest story + test-summary ; sprint-status **25-14** → **review**.
