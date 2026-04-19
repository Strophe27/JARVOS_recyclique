# Story 25.4 : Spécifier le socle multisite, permissions et invariants de poste/kiosque pour la cible 2026-04-19

Status: done

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

## Checklist validation (VS — `bmad-create-story`, Epic 25.4)

Contrôle explicite contre `_bmad-output/planning-artifacts/epics.md` **Story 25.4** (pas de PASS sur liste vide).

- [x] **Périmètre Given** : hiérarchie de sites, identité poste ou kiosque, liaison analytique, permissions additives — reflété dans le premier **Given** des AC ci-dessus (aligné mot pour mot avec `epics.md` §25.4).
- [x] **Invariants Then** : `site`, `caisse`, `session`, `poste` ou `kiosque`, rôle, groupe, périmètre de permission, comportement de changement de contexte, distinction brownfield-canonical vs future-target — couverts par le **Then** des AC et par les tâches § Modèle de contexte / § Comportement de changement de contexte.
- [x] **Citations minimales** : `_bmad-output/planning-artifacts/prd.md`, `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md`, `_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md`, `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md` — listées dans l’**And** des AC et reprises dans **References**.
- [x] **Stories aval** : énumération « prêt après relecture » vs « gated » (ADR, readiness 25.5, correct course) — **And** des AC + DoD + tâche § Stories aval (clés `epics.md` / `sprint-status.yaml` quand elles existent).
- [x] **Projection Recyclique ↔ Paheko sans silence sur le mapping** : le livrable spec doit traiter **explicitement et dans le corps du texte** (pas uniquement par renvoi vague) : (1) quels enregistrements ou axes de mapping sont **obligatoires** avant toute écriture comptable ; (2) **état d’échec visible** (opérateur / supervision / corrélation) si mapping absent ou ambigu ; (3) **interdiction** de substituer silencieusement un autre site, emplacement, projet ou axe analytique ; (4) **conditions** de blocage sélectif, supervision renforcée et quarantaine / reprise — alignées `cash-accounting-paheko-canonical-chain.md` et stories Epic 8 (ex. `8-3`, `8-4`, `8-6`) ; dernier **And** des AC + DoD + tâche § Projection vers Paheko.
- [x] **Alignement sprint** : clé `25-4-specifier-le-socle-multisite-permissions-et-invariants-de-poste-kiosque-pour-la-cible-2026-04-19` en `done` (Story Runner 2026-04-20), `epic-25` en `done` — voir § Alignement sprint / YAML.

## Définition of Done (Epic 25 — documentaire)

- [x] **Spécification unique** publiée (Markdown) sous `_bmad-output/planning-artifacts/architecture/` — nom proposé : `2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md` (ajuster la date dans le préfixe si le DS valide un autre jour).
- [x] **Index architecture** : entrée ajoutée dans `_bmad-output/planning-artifacts/architecture/index.md` (section pertinente, p. ex. « Sécurité / identité kiosque » ou « Intégration / projection Paheko » selon la structure retenue).
- [x] **Citations minimales** : les quatre chemins obligatoires listés dans les AC sont cités **explicitement** dans le corps du livrable (pas seulement en en-tête YAML).
- [x] **Réconciliation** avec les ADR **25-2** et **25-3** (*proposed*) : la spec ne contredit pas les décisions déjà écrites ; les écarts éventuels sont nommés comme « à arbitrer » ou renvoient à une future ADR (trace en section dédiée).
- [x] **Projection Recyclique ↔ Paheko** : section dédiée couvrant au minimum mapping obligatoire, état d'échec visible si mapping absent, interdiction de fallback silencieux sur un autre axe/emplacement, lien avec blocage sélectif / supervision / quarantaine (cohérent avec `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` et Epic 8).
- [x] **Stories aval** : tableau ou liste numérotée (stories **prêtes à passer en implémentation** après relecture humaine de la spec vs **encore gated** : readiness 25.5, ADR non approuvés, gel correct course).
- [x] Fichier **story** (ce document) : section **Trace Epic 25 — ADR** et **File List** mises à jour post-DS ; `sprint-status.yaml` : entrée **25-4** alignée sur l'état réel (CS → ready-for-dev ; post-Story Runner : **done**, cohérent avec YAML).

## Tasks / Subtasks

- [x] Rédiger la spec structurée (AC: invariants + projection + énumération aval) (fichier architecture ci-dessus)
  - [x] **§ Contexte et périmètre** : ce qui est canon brownfield aujourd'hui vs cible PRD vision (sans élargir le gel hors `25-*`).
  - [x] **§ Modèle de contexte** : `site`, `caisse`, `session`, `poste` / `kiosque`, rôles, groupes, permissions effectives (rappel socle additif Epic 2 / `epics.md` si utile).
  - [x] **§ Comportement de changement de contexte** : bascule site/caisse, implications pour PIN (renvoi explicite ADR `_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md`).
  - [x] **§ Projection vers Paheko** : axes analytiques, correspondances site/emplacement/projet, échec visible, pas de substitution silencieuse, lien quarantaine / reprise (cf. chaîne canonique + ADR async `_bmad-output/planning-artifacts/architecture/2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md`).
  - [x] **§ Stories aval** : distinguer « débloquées par la spec seule » vs « nécessitent ADR approuvée / readiness 25.5 / correct course » — citer des clés `epics.md` ou `sprint-status.yaml` quand elles existent (ex. epic 12–13 kiosque backlog, **25-5**, futures stories auth kiosque nommées dans l'ADR 25-2).
  - [x] **§ Références bibliographiques** : les quatre sources obligatoires + chaîne canonique + ADR 25-2 / 25-3 + matrice **25-1** si besoin de cohérence (`references/vision-projet/2026-04-19_matrice-alignement-vision-canonical-epic25-25-1.md`).

- [x] Mettre à jour `_bmad-output/planning-artifacts/architecture/index.md` avec un lien vers la nouvelle spec.

- [x] Mettre à jour ce fichier story (Trace ADR, File List, statut) après livraison DS ; aligner `sprint-status.yaml`.

## Intelligence — story précédente (25.3)

- Les décisions **async Paheko** sont **verrouillées côté document** en *proposed* : outbox **PostgreSQL** durable, **Redis** auxiliaire seulement — la spec **25.4** ne doit pas réintroduire une « double vérité » transport/outbox.
- La **chaîne canonique** caisse → snapshot → builder → outbox reste le cadre pour toute phrase sur l'**autorité** et la **livraison** vers Paheko.

## Dev Notes

- **Nature du travail :** documentaire ; pas de commit de code applicatif dans cette story sauf correction de liens/docs si le Story Runner l'exige.
- **Ne pas confondre** : PIN **opérateur** (canon serveur, `prd.md` §11.2) vs PIN **kiosque** / secret de poste — traité dans l'ADR 25-2 ; la spec 25.4 **référence** ces notions pour les invariants de poste, sans les ré-ADRing.
- **Readiness** : le rapport `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md` classe l'extension PWA / kiosque **NOT READY** tant que décisions + découpage ne sont pas absorbés — la spec doit **assumer** cet état dans l'énumération « stories aval ».
- **Chantier audit API** (Kanban / handoff audit) : **orthogonal** au fond multisite ; mentionner seulement si un risque de dette bloque des touches Paheko/caisse (alignement matrice 25.1).

**Projection Recyclique → Paheko (obligations rédactionnelles pour la spec — anti-silence mapping)**  
Le document architecture livré par le DS doit contenir au minimum une sous-section qui nomme les **objets ou champs** côté Recyclique qui alimentent le builder / l’outbox vers Paheko (renvoi explicite à la chaîne canonique et, si utile, à l’existant `8-3` correspondances site–caisse–emplacements), et qui décrit **sans ambiguïté** le comportement quand une correspondance requise manque (pas de « meilleur effort » implicite).

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
| Nouvelle ADR **structurante** hors **25-2** / **25-3** requise par le livrable typique ? | **N/A** — **non** ; aucun arbitrage structurant supplémentaire identifié en DS au-delà du contenu des ADR **25-2** et **25-3** (*proposed*). |
| Justification (DS 2026-04-20) | La spec **`2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md`** **synthétise** invariants multisite / permissions / poste·kiosque et **ferme** la projection Recyclique → Paheko (mapping obligatoire, échec visible, interdiction de substitution silencieuse, blocage / supervision / quarantaine) **sans** rouvrir le transport outbox ni le modèle PIN. Les écarts vision ↔ brownfield restent **nommés** dans la research / readiness et **cadrés** par 25-2 / 25-3. |
| Si le **validate-create-story (VS)** ou le **DS** identifie un **arbitrage nouveau** (hors contenu des ADR 25-2 / 25-3) | Alors fichier additionnel sous `_bmad-output/planning-artifacts/architecture/` + index + trace dans cette story ; **sinon conserver N/A explicite** — **respecté (N/A)**. |
| Fichiers ADR hors 25-2/25-3 | **Aucun** — confirmé post-DS. |

## Alignement sprint / YAML

- Entrée dans `_bmad-output/implementation-artifacts/sprint-status.yaml` : clé `25-4-specifier-le-socle-multisite-permissions-et-invariants-de-poste-kiosque-pour-la-cible-2026-04-19` → **`done`** (Story Runner 2026-04-20, après VS/DS/GATE/QA/CR) ; **`epic-25`** → **`done`** une fois toutes les stories **25-1** à **25-5** en `done` (cf. YAML ; vérité opérationnelle : fichier sprint-status).

## Dev Agent Record

### Agent Model Used

GPT-5.2 (sous-agent Task `bmad-dev-story`, 2026-04-20).

### Debug Log References

— (story documentaire ; pas de suite de tests applicatifs).

### Completion Notes List

- Livrable principal : spec architecture Epic 25.4 avec citations minimales **dans le corps** du document §1.1 ; sections modèle de contexte, changement de contexte (renvoi ADR 25-2), projection Paheko (mapping / échec visible / pas de fallback / lien Epic 8), tableau stories aval, réconciliation ADR 25-2 / 25-3.
- Index `architecture/index.md` : nouvelle section « Socle multisite / permissions / projection Paheko » + entrée TOC.
- **ADR additionnelle :** **N/A** (justification dans **Trace Epic 25 — ADR**).
- Story passée en **done** ; YAML `development_status` **25-4** → `done` (aligné `_bmad-output/implementation-artifacts/sprint-status.yaml`, trace 2026-04-20).

### File List

- `_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md` (spec convergée — **créé** DS)
- `_bmad-output/planning-artifacts/architecture/index.md` (entrée + TOC — **mis à jour** DS)
- `_bmad-output/implementation-artifacts/25-4-specifier-le-socle-multisite-permissions-et-invariants-de-poste-kiosque-pour-la-cible-2026-04-19.md` (ce fichier — **mis à jour** DS : statut, DoD, tâches, trace ADR, Dev Agent Record)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (référence : `25-4` → `done`, **epic-25** → `done` ; commentaires `last_updated` — ne pas diverger du YAML)
