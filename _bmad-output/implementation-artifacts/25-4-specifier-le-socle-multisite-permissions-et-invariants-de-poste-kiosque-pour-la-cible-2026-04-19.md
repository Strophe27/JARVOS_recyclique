# Story 25.4 : Spécifier le socle multisite, permissions et invariants de poste/kiosque pour la cible 2026-04-19

Status: ready-for-dev

**Story key :** `25-4-specifier-le-socle-multisite-permissions-et-invariants-de-poste-kiosque-pour-la-cible-2026-04-19`  
**Epic :** 25 — Socle d'alignement PRD vision kiosque / multisite / permissions, brownfield et ADR  
**Implementation artifact :** `_bmad-output/implementation-artifacts/25-4-specifier-le-socle-multisite-permissions-et-invariants-de-poste-kiosque-pour-la-cible-2026-04-19.md`

## Contexte produit

Après **25.1** (matrice vision → canonique), **25.2** (ADR PIN kiosque / opérateur / secret de poste — *proposed*) et **25.3** (ADR async Paheko / outbox / Redis auxiliaire — *proposed*), cette story **ferme une spécification unique** : modèle de contexte **multisite**, **permissions additives**, **invariants poste/kiosque**, et **règles de projection** `Recyclique` → cible comptable `Paheko`, pour que les stories d'implémentation futures ne divergent pas entre backend, `Peintre_nano` et intégrations.

## Story (BDD)

As a **platform and product team**,  
I want **a converged specification for multisite analytics, role/group permissions, kiosk or poste identity, and zero-leakage invariants**,  
So that **future implementation stories can reuse one stable context model across `Recyclique`, `Peintre_nano`, and `Paheko`**.

## Acceptance criteria

Source normative : `_bmad-output/planning-artifacts/epics.md` — **Story 25.4**.

**Given** the target scope includes site hierarchy, kiosk or poste identity, analytical linkage, and additive permissions  
**When** this specification is delivered  
**Then** it defines the retained invariants for `site`, `caisse`, `session`, `poste` or `kiosque`, role, group, permission scope, and context-switch behavior, with explicit notes on what remains brownfield-canonical versus future-target  
**And** it cites at minimum `_bmad-output/planning-artifacts/prd.md`, `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md`, `_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md`, and `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md`  
**And** the deliverable enumerates which downstream implementation stories can start immediately after approval and which still require another ADR or readiness gate  
**And** it closes the projection rules between `Recyclique` context and `Paheko` accounting target, including mandatory mapping, visible failure state when mapping is missing, prohibition of silent fallback to a substitute axis or emplacement, and the conditions for selective blocking, supervision, or quarantine

## Définition of Done (Epic 25 — documentaire)

- [ ] **Spécification unique** publiée (Markdown) sous `_bmad-output/planning-artifacts/architecture/` — nom proposé : `2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md` (ajuster la date dans le préfixe si le DS valide un autre jour).
- [ ] **Index architecture** : entrée ajoutée dans `_bmad-output/planning-artifacts/architecture/index.md` (section pertinente, p. ex. « Sécurité / identité kiosque » ou « Intégration / projection Paheko » selon la structure retenue).
- [ ] **Citations minimales** : les quatre chemins obligatoires listés dans les AC sont cités **explicitement** dans le corps du livrable (pas seulement en en-tête YAML).
- [ ] **Réconciliation** avec les ADR **25-2** et **25-3** (*proposed*) : la spec ne contredit pas les décisions déjà écrites ; les écarts éventuels sont nommés comme « à arbitrer » ou renvoient à une future ADR (trace en section dédiée).
- [ ] **Projection Recyclique ↔ Paheko** : section dédiée couvrant au minimum mapping obligatoire, état d'échec visible si mapping absent, interdiction de fallback silencieux sur un autre axe/emplacement, lien avec blocage sélectif / supervision / quarantaine (cohérent avec `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` et Epic 8).
- [ ] **Stories aval** : tableau ou liste numérotée (stories **prêtes à passer en implémentation** après relecture humaine de la spec vs **encore gated** : readiness 25.5, ADR non approuvés, gel correct course).
- [ ] Fichier **story** (ce document) : section **Trace Epic 25 — ADR** et **File List** mises à jour post-DS ; `sprint-status.yaml` : entrée **25-4** alignée sur l'état réel (CS → ready-for-dev ; post-DS : review / done selon Story Runner).

## Tasks / Subtasks

- [ ] Rédiger la spec structurée (AC: invariants + projection + énumération aval) (fichier architecture ci-dessus)
  - [ ] **§ Contexte et périmètre** : ce qui est canon brownfield aujourd'hui vs cible PRD vision (sans élargir le gel hors `25-*`).
  - [ ] **§ Modèle de contexte** : `site`, `caisse`, `session`, `poste` / `kiosque`, rôles, groupes, permissions effectives (rappel socle additif Epic 2 / `epics.md` si utile).
  - [ ] **§ Comportement de changement de contexte** : bascule site/caisse, implications pour PIN (renvoi explicite ADR `_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md`).
  - [ ] **§ Projection vers Paheko** : axes analytiques, correspondances site/emplacement/projet, échec visible, pas de substitution silencieuse, lien quarantaine / reprise (cf. chaîne canonique + ADR async `_bmad-output/planning-artifacts/architecture/2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md`).
  - [ ] **§ Stories aval** : distinguer « débloquées par la spec seule » vs « nécessitent ADR approuvée / readiness 25.5 / correct course » — citer des clés `epics.md` ou `sprint-status.yaml` quand elles existent (ex. epic 12–13 kiosque backlog, **25-5**, futures stories auth kiosque nommées dans l'ADR 25-2).
  - [ ] **§ Références bibliographiques** : les quatre sources obligatoires + chaîne canonique + ADR 25-2 / 25-3 + matrice **25-1** si besoin de cohérence (`references/vision-projet/2026-04-19_matrice-alignement-vision-canonical-epic25-25-1.md`).

- [ ] Mettre à jour `_bmad-output/planning-artifacts/architecture/index.md` avec un lien vers la nouvelle spec.

- [ ] Mettre à jour ce fichier story (Trace ADR, File List, statut) après livraison DS ; aligner `sprint-status.yaml`.

## Intelligence — story précédente (25.3)

- Les décisions **async Paheko** sont **verrouillées côté document** en *proposed* : outbox **PostgreSQL** durable, **Redis** auxiliaire seulement — la spec **25.4** ne doit pas réintroduire une « double vérité » transport/outbox.
- La **chaîne canonique** caisse → snapshot → builder → outbox reste le cadre pour toute phrase sur l'**autorité** et la **livraison** vers Paheko.

## Dev Notes

- **Nature du travail :** documentaire ; pas de commit de code applicatif dans cette story sauf correction de liens/docs si le Story Runner l'exige.
- **Ne pas confondre** : PIN **opérateur** (canon serveur, `prd.md` §11.2) vs PIN **kiosque** / secret de poste — traité dans l'ADR 25-2 ; la spec 25.4 **référence** ces notions pour les invariants de poste, sans les ré-ADRing.
- **Readiness** : le rapport `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md` classe l'extension PWA / kiosque **NOT READY** tant que décisions + découpage ne sont pas absorbés — la spec doit **assumer** cet état dans l'énumération « stories aval ».
- **Chantier audit API** (Kanban / handoff audit) : **orthogonal** au fond multisite ; mentionner seulement si un risque de dette bloque des touches Paheko/caisse (alignement matrice 25.1).

### Project Structure Notes

- Livrable principal : `_bmad-output/planning-artifacts/architecture/*.md` + index.
- Éviter les doublons avec le PRD vision : la spec **synthétise et tranche** pour l'exécution ; le PRD vision reste la **cible** non canonique jusqu'à absorption explicite.

### References

- `_bmad-output/planning-artifacts/epics.md` (Story 25.4, Epic 25, Additional Requirements AR11/AR12 si pertinent)
- `_bmad-output/planning-artifacts/prd.md` (préambule, §2.4 extension kiosque, §5 gouvernance importée, §11.2 PIN, chaîne Recyclique–Paheko)
- `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md`
- `_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md`
- `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md`
- `references/vision-projet/2026-04-19_matrice-alignement-vision-canonical-epic25-25-1.md`
- `_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md`
- `_bmad-output/planning-artifacts/architecture/2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md`
- `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md` (gel hors `25-*`)

## Trace Epic 25 — ADR

| Élément | Valeur |
|--------|--------|
| Nouvelle ADR **structurante** hors **25-2** / **25-3** requise par le livrable typique ? | **Non par défaut** — la story demande une **spec convergée** (invariants + projection), pas une troisième ADR Epic 25. |
| Justification | Les arbitrages structurants attendus pour le périmètre kiosque / async sont déjà portés par **25-2** et **25-3** (*proposed*). La spec **25.4** les **consomme** et **ferme les règles de projection** sans rouvrir transport/outbox ni modèle PIN sauf incohérence découverte en VS. |
| Si le **validate-create-story (VS)** ou le **DS** identifie un **arbitrage nouveau** (hors contenu des ADR 25-2 / 25-3) | Alors fichier additionnel sous `_bmad-output/planning-artifacts/architecture/` + index + trace dans cette story ; sinon conserver **N/A** explicite. |
| Fichiers ADR hors 25-2/25-3 | **Aucun au stade CS** — à confirmer post-VS / DS. |

## Alignement sprint / YAML

- Entrée attendue dans `_bmad-output/implementation-artifacts/sprint-status.yaml` : clé `25-4-specifier-le-socle-multisite-permissions-et-invariants-de-poste-kiosque-pour-la-cible-2026-04-19` → **`ready-for-dev`** après ce create-story ; **epic-25** reste **`in-progress`**.

## Dev Agent Record

### Agent Model Used

(à compléter au DS)

### Debug Log References

### Completion Notes List

### File List

- `_bmad-output/implementation-artifacts/25-4-specifier-le-socle-multisite-permissions-et-invariants-de-poste-kiosque-pour-la-cible-2026-04-19.md` (ce fichier — créé / mis à jour par CS)
