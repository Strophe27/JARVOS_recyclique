# Story 25.11 : Spike — contrats API et types pour enveloppe de contexte (sans PWA)

Status: done

**Story key :** `25-11-spike-contrats-api-et-types-enveloppe-contexte-sans-pwa`  
**Epic :** 25 — phase 2 (impl)  
**Implementation artifact :** `_bmad-output/implementation-artifacts/25-11-spike-contrats-api-et-types-enveloppe-contexte-sans-pwa.md`

## Dépendances (prérequis)

- **25.7** — **done** : checklist exécutable des champs normatifs §2–3 de la spec **25.4** ; ancrage obligatoire pour savoir quels champs de l’enveloppe de contexte sont **normatifs** vs **vision-later**. Fichier : `_bmad-output/implementation-artifacts/checklists/25-7-checklist-spec-25-4-sections-2-3.md`.
- **25.10** — **done** (ordre linéaire recommandé et contexte phase 2) : taxonomie causes racines outbox ; utile pour ne pas confondre évolution « enveloppe contexte » avec signaux mapping/builder/HTTP.
- Graphe machine : `_bmad-output/planning-artifacts/architecture/epic-25-phase2-dag-2026-04-21.yaml` (`depends_on` explicite pour **25-11** : **25-7**).

## Contexte produit (obligatoire)

- **Spike sans PWA** : aucun **Service Worker**, aucune **persistance IndexedDB en production**, aucune livraison **offline-first** produit dans le périmètre de cette story. Le spike se limite à **contrats** (fragment OpenAPI et/ou types partagés) pour l’**enveloppe de contexte** et, si pertinent, des **payloads sensibles** explicitement listés (sans rouvrir le fond **ADR 25-2** / **ADR 25-3**).
- **Ancrage checklist 25-7** : les IDs `CTX-*` et le tableau §2.1–§3.2 font foi pour « quels champs sont normatifs » ; toute proposition de schéma doit **mapper** ou **justifier l’écart** par rapport à ces lignes (ou renvoyer à une story ultérieure si hors train).
- **Références normatives à citer dans le livrable** :
  - **ADR 25-2** : `_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md`
  - **ADR 25-3** : `_bmad-output/planning-artifacts/architecture/2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md`
  - **Spec 25.4** : `_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md` (§2 modèle de contexte, §3 changement de contexte ; lien logique avec enveloppe et step-up).
- **Gate brownfield « API quality P0 »** : le livrable doit **affirmer explicitement** qu’il **ne ferme pas** seul ce gate. Voir § « Non-fermeture du gate API P0 » ci-dessous pour les liens et la liste de rappel des P0 / conditions de GO.

## Story (BDD)

As a platform engineer,  
I want a short spike producing an OpenAPI fragment or shared types for the context envelope and sensitive payloads,  
So that Peintre and backend agree on shapes before broad refactors.

## Acceptance criteria

Source normative : `_bmad-output/planning-artifacts/epics.md` — **Story 25.11** (texte en anglais, aligné mot pour mot avec l’epic).

**Given** checklist **25.7** anchors which fields are normative  
**When** this story is delivered  
**Then** the spike cites ADR **25-2**, ADR **25-3**, and spec **25.4** and ships one happy-path example plus at least one negative example  
**And** the deliverable explicitly states it does **not** close the brownfield **API quality P0** audit gate by itself (link or issue list for remaining P0s)  
**And** no Service Worker, IndexedDB production persistence, or offline-first product delivery is part of this spike

### Interprétation exécutable (livrabes minimaux)

- **Happy-path** : au moins **un** exemple JSON (ou YAML d’exemple OpenAPI) d’enveloppe de contexte **cohérent** avec les champs **normatifs** attendus d’après la spec **25.4** §2–3 et la checklist **25-7** (ex. présence site / caisse / session / permissions effectives selon les lignes `normative-spec` applicables au spike — sans inventer de champs « vision-later » comme obligatoires).
- **Négatif** : au moins **un** exemple ou cas documenté d’**échec de validation** ou d’**état refusé** (ex. champ obligatoire manquant, incohérence site/caisse, ou réponse d’erreur typée alignée avec les garde-fous existants type **25.8** / `CONTEXT_STALE` si le spike touche les en-têtes de liaison — **sans** imposer une implémentation complète hors scope spike).
- **Forme du livrable** : au choix maîtrisé — **fragment OpenAPI** (`components/schemas` réutilisable) et/ou **types TypeScript** alignés (ex. génération depuis `contracts/openapi/recyclique-api.yaml` ou fichier dédié sous `contracts/` / doc d’implémentation courte) ; l’important est la **traçabilité** vers checklist **25.7** + **ADR 25-2** / **25-3** + spec **25.4**.

### Non-fermeture du gate API P0 (obligatoire dans le livrable)

Le document de fin de spike doit contenir une phrase explicite du type : *« Ce spike ne clôt pas le gate brownfield API quality P0. »* et au moins **un** des supports suivants :

- Lien vers la note : `_bmad-output/planning-artifacts/2026-04-20-note-readiness-cible-post-epic25-decisions.md` (§2, ligne **Gate qualité API (audit brownfield P0)** — **Ouvert**).
- Lien vers le rapport de readiness : `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md` (synthèse **gate qualité API** / arbitrage P0 pour équipes Paheko/caisse).
- Liste de rappel : backlog audit **§7** du livrable `references/artefacts/2026-04-02_02_audit-brownfield-backend-api-donnees-critiques.md` (items **B1–B7** P0–P2 — cités comme **pistes restantes**, pas comme « résolus par 25.11 »).

## Definition of Done

- [x] Un document de spike (markdown dans `_bmad-output/implementation-artifacts/` ou sous `references/artefacts/` avec nom daté) cite **ADR 25-2**, **ADR 25-3**, **spec 25.4** et **checklist 25-7** avec chemins de fichier.
- [x] **Un** exemple happy-path + **un** exemple négatif (voir § Interprétation exécutable).
- [x] Fragment OpenAPI et/ou types partagés **proposés** (diff ou fichier d’exemple) sans livrer PWA (pas de SW, pas d’IndexedDB prod, pas offline-first produit).
- [x] Section **« Non-fermeture gate API P0 »** présente avec lien ou liste comme ci-dessus.
- [x] Revue rapide : cohérence avec le code existant cité en Dev Notes (pas de contradiction avec `ContextEnvelope` backend / client actuels sans le noter).

## Tasks / Subtasks

- [x] Lire **checklist 25-7** + §2–3 **spec 25.4** + **ADR 25-2** / **25-3** (focus champs enveloppe, identité poste/opérateur, async/outbox si mentionné) (AC: Acceptance criteria)
- [x] Cartographier l’existant : `recyclic_api/services/context_envelope_service.py`, endpoints contexte dans `recyclic_api/api/api_v1/endpoints/users.py`, `contracts/openapi/recyclique-api.yaml`, `peintre-nano/src/types/context-envelope.ts` (AC: Interprétation exécutable)
- [x] Rédiger **happy-path** + **négatif** (AC: Acceptance criteria)
- [x] Proposer **fragment OpenAPI** (`components/schemas` / `$ref`) et/ou **alignement types** Peintre + procédure `generate` si applicable (AC: Interprétation exécutable)
- [x] Rédiger la section **non-fermeture gate API P0** avec liens (AC: **And** deliverable explicitly states…)
- [x] Valider hors scope : aucun SW / IndexedDB prod / offline-first (AC: dernier **And**)

## Dev Notes

### Périmètre technique suggéré

- Backend : enveloppe et recalcul — `context_envelope_service`, schémas Pydantic associés aux réponses `me/context`.
- Contrat : `contracts/openapi/recyclique-api.yaml` ; génération client TypeScript Peintre si le repo utilise déjà ce flux.
- Frontend : `peintre-nano/src/types/context-envelope.ts`, `context-envelope-freshness.ts` — éviter divergence sans documenter la stratégie (single source vs duplicate temporaire).

### Anti-patterns

- Étendre IndexedDB ou SW « pour faciliter les tests » : **hors scope**.
- Fermer implicitement le **gate API P0** en reformulant l’audit sans tickets / propriétaires.
- Marquer des champs **vision-later** de la checklist comme **obligatoires** dans le schéma sans story produit.

### Project Structure Notes

- Racine dépôt : `recyclique/api/src/recyclic_api/`, `contracts/openapi/`, `peintre-nano/src/`.
- Artefacts BMAD : `_bmad-output/implementation-artifacts/`, `_bmad-output/planning-artifacts/architecture/`.

### References

- `_bmad-output/planning-artifacts/epics.md` — **Story 25.11**
- `_bmad-output/implementation-artifacts/checklists/25-7-checklist-spec-25-4-sections-2-3.md`
- `_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md` (**spec 25.4**)
- `_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md` (**ADR 25-2**)
- `_bmad-output/planning-artifacts/architecture/2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md` (**ADR 25-3**)
- `_bmad-output/planning-artifacts/architecture/epic-25-phase2-dag-2026-04-21.yaml`
- `_bmad-output/planning-artifacts/2026-04-20-note-readiness-cible-post-epic25-decisions.md` (gate API P0)
- `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md` (gate API P0)
- `references/artefacts/2026-04-02_02_audit-brownfield-backend-api-donnees-critiques.md` (backlog §7)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Trace Epic 25 — ADR

| Élément | Valeur |
|--------|--------|
| Nouvelle ADR structurante requise ? | **ADR N/A** — spike de **contrats/types** sous **spec 25.4** et **ADR 25-2** / **25-3** déjà **acceptées** ; pas de nouveau choix d’architecture. |
| Justification | Le livrable est documentaire / contrat (fragment OpenAPI, types, exemples) ; les ADR existantes restent la norme pour PIN, async Paheko, Redis auxiliaire. |

## Alignement sprint / YAML

- Post-**DS** : `sprint-status.yaml` : clé `25-11-spike-contrats-api-et-types-enveloppe-contexte-sans-pwa` → **`done`** (GATE pytest API + lint Peintre ; QA doc `tests/test-summary-story-25-11-context-envelope-contracts.md` ; CR APPROVE).
- **Epic 25** reste **`in-progress`** (phase 2).
- Prochaine story pilotée : **`25-12`** (ou parallèle DAG) selon `epic-25-phase2-dag-2026-04-21.yaml`.

## Dev Agent Record

### Agent Model Used

Composer (agent Task DS bmad-dev-story)

### Debug Log References

Aucun — livrable documentaire + fragment YAML + commentaire TypeScript ; pas d’exécution de tests pytest imposée (aucune modification de logique backend).

### Completion Notes List

- Document spike `_bmad-output/implementation-artifacts/2026-04-20-spike-25-11-contrats-enveloppe-contexte.md` : références ADR 25-2 / 25-3 / spec 25.4 / checklist 25-7, exemples happy-path et négatifs (forbidden + 409), section gate API P0 non clos, carte CTX-* → champs.
- Fragment `contracts/openapi/fragments/context-envelope-examples-25-11.yaml` : exemples nommés pour revue ; schémas canoniques inchangés dans `recyclique-api.yaml`.
- `peintre-nano/src/types/context-envelope.ts` : bloc JSDoc de traçabilité 25.7 sans changement de types.

### File List

- `_bmad-output/implementation-artifacts/2026-04-20-spike-25-11-contrats-enveloppe-contexte.md` (créé)
- `contracts/openapi/fragments/context-envelope-examples-25-11.yaml` (créé)
- `peintre-nano/src/types/context-envelope.ts` (modifié — commentaire)
- `_bmad-output/implementation-artifacts/25-11-spike-contrats-api-et-types-enveloppe-contexte-sans-pwa.md` (statut + DoD + tâches + Dev Agent Record)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (25-11 → review, trace DS)

---

**Note create-story (CS) :** contexte produit imposé (spike sans PWA) ; AC BDD alignés **epics §25.11** ; ancrage **25-7** + **ADR 25-2** / **25-3** + **spec 25.4** ; gate **API P0** explicitement non clos par ce seul livrable.
