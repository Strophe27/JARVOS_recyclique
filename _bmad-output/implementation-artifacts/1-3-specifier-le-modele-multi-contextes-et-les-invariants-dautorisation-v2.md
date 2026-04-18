# Story 1.3 : Spécifier le modèle multi-contextes et les invariants d'autorisation v2

**Clé fichier (obligatoire) :** `1-3-specifier-le-modele-multi-contextes-et-les-invariants-dautorisation-v2`  
**Epic :** epic-1 — prérequis Piste B (backend, contrats, analyses, Paheko) — **pas** epic-3 Peintre_nano  
**Statut :** done

<!-- Validation optionnelle : exécuter validate-create-story avant dev-story. -->

## Story

En tant qu'**équipe backend et produit** (Piste B),  
je veux une **spécification canonique v2** des contextes, rôles, groupes, permissions et revalidations sensibles,  
afin que **tous les epics futurs** partagent le **même modèle d'isolation et d'autorisation**, sans double vérité côté UI.

## Acceptance Criteria

**Étant donné** que la v2 repose sur une **isolation stricte** entre sites, caisses, sessions, postes et opérateurs  
**Quand** la spécification multi-contextes est publiée  
**Alors** elle définit les **entités et champs minimaux canoniques** pour : `site`, `caisse`, `session`, `poste de réception`, `rôle`, `groupe`, `permissions`, et `PIN`  
**Et** elle énonce les **invariants de zéro fuite** et les **règles de changement de contexte** que les implémentations futures doivent préserver.

**Étant donné** que les permissions en v2 sont **additives** et **calculées par Recyclique**  
**Quand** le modèle d'autorisation est décrit  
**Alors** la story formalise les **clés techniques stables**, les **libellés personnalisables**, l'**appartenance multi-groupes**, et l'**autorité backend** sur les permissions effectives  
**Et** elle stipule que les **libellés UI ne sont jamais une vérité de sécurité**.

**Étant donné** que les actions sensibles exigent des garanties **plus fortes** qu'un simple filtrage d'affichage  
**Quand** les règles de sécurité sont finalisées  
**Alors** elles définissent les **comportements minimaux de step-up** : confirmation, PIN, revalidation de rôle  
**Et** elles précisent **quand** le système doit **bloquer**, **dégrader** ou **forcer un recalcul explicite** du contexte.

### Validation humaine (HITL) — critères de relecture

Un pair valide que la spec couvre bien : entités minimales (site, caisse, session, poste réception, rôle, groupe, permissions, PIN) ; invariants zéro fuite et règles de changement de contexte ; permissions additives calculées par Recyclique ; clés stables, libellés, multi-groupes, backend autorité ; **UI jamais vérité sécurité** ; step-up (confirmation, PIN, revalidation) et **quand** bloquer / dégrader / recalculer le contexte.

#### Journal HITL (élicitations terrain)

| Date | Bloc | Décision / réponse terrain | Fichier spec mis à jour |
|------|------|----------------------------|-------------------------|
| 2026-04-02 | A — isolation | **Opérateur = bénévole** (associations) : accréditation minimale ; pas d'autre site / caisse / session / poste / autre opérateur **sauf** habilitation explicite. **Administrateurs** peuvent franchir ces périmètres si leurs droits le permettent (ex. intervention sur un autre site). Toujours **autorité backend**. | `references/artefacts/2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md` — §1 bis, §3.0 |
| 2026-04-02 | B — visibilité / contexte perdu | **Toujours** geste **volontaire et visible** pour les changements de contexte métier. **Pas** de bascule « en arrière-plan » sans que la personne comprenne (voir §4.0 glossaire). Si le système est **perdu** : **par défaut bloquer** jusqu'à résolution ; **mode limité** seulement si c'est **clair** ce qui reste autorisé (sinon rester sur blocage). | Idem — §4.0 |
| 2026-04-02 | C — libellés / multi-groupes | **C1** : d'accord — **serveur** fait foi, pas les libellés UI. **C2** : d'accord — **plusieurs groupes**, droits **cumulés** (additif). Vigilance : additif ne retire pas les droits d'un autre groupe ; config des groupes = responsabilité admin (voir §5.0 « éléphants »). | Idem — §5.0 |
| 2026-04-02 | D — step-up / PIN | **Confirmation** : super-admin / fort impact ; édition tickets caisse & réception (données critiques) ; autres mutations critiques — liste exhaustive en Epic 2 / 1.4. **PIN** : ouverture / déverrouillage **sessions métier** (caisse, réception, futurs modules) ; distinct du mot de passe web — §6.0 D2. | Idem — §6.0 |
| 2026-04-02 | D — recherche Perplexity | Réponse archivée : `references/recherche/2026-04-02_pin-ouverture-caisse-operateur-pos-rgpd_perplexity_reponse.md` ; index recherche + spec §6.0 + `references/artefacts/index.md`. | Idem |
| 2026-04-02 | E — politique PIN | Adoption des **décisions produit** en spec §6.0 **E** : format (4 min / 6 recommandé sensibles), trivialités interdites, hash, lockout 3–5 essais → 5 min, escalade 10/jour → admin local, compteur UX, tableau reset (admin local, super-admin, soi-même + ancien PIN, jamais clair), PIN temporaire admin, **même mécanisme** caisse/réception avec **scopes** distincts. Impl. **Epic 2.4** / **FR71**. | Idem — §6.0 E, §2.8 |
| 2026-04-02 | F (suite) — cycle PIN métier + paramètres | **Déconnexion explicite** du contexte PIN (bouton « quitter la caisse » / équivalent) ; **timeout** inactivité → retour écran PIN **visible** ; **reprise** par admin : PIN admin sur le poste (invalidation contexte bénévole + audit) **ou** déconnexion métier forcée puis nouveau PIN. **§4.3** : **panel super-admin** — durées, variantes (ex. quitter caisse avec/sans déco web), activation combinaisons reprise A/B, **tout optionnel** dans les **bornes** sécurité. **§2.8** : PIN = **compte utilisateur** (bénévole cas principal ; admin sur poste métier = même mécanisme). Panel admin distant : mot de passe / revalidation / MFA, pas confondu avec PIN caisse (§6.0 D2). | `references/artefacts/2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md` — §2.8, §4.3, §6.0 D2, §6.3, §6.2 ; `references/artefacts/index.md` |
| 2026-04-02 | G — extensions panel (spec §4.4) | Tableau **extensions** super-admin : paramètres dérivés **§6.0 E** (pause lockout, bornes essais, seuil journalier, trivialités, compteur UX) ; **caisse vs réception** ; **préavis** avant verrouillage ; périmètre **`degraded`** borné ; **TTL / déclencheurs** recalcul / fraîcheur `ContextEnvelope` ; **audit** (rétention, granularité) ; **matrice step-up** par familles une fois `operationId` (1.4 / Epic 2). Sous-section **non optionnalisable** : additif vs deny, AR39, libellés, zéro fuite. | Idem — **§4.4** ; `references/artefacts/index.md` |

## Tasks / Subtasks

- [x] Rédiger le **document canonique** (livrable ci-dessous) en couvrant **explicitement** les trois blocs Given/When/Then (table de traçabilité AC → sections recommandée).
- [x] Décrire pour chaque entité minimale : **identité**, **champs obligatoires**, **relations** (cardinalités et dépendances), **cycle de vie** succinct, et **liens** avec les domaines brownfield déjà cartographiés (caisse, réception, auth, permissions, contexte) — en s'appuyant sur l'audit 1.2 sans le recopier.
- [x] Formaliser les **invariants d'isolation** (zéro fuite inter-site / inter-caisse / inter-session / inter-poste / entre opérateurs) et les **règles de bascule de contexte** (sélection site, ouverture session caisse, poste réception, etc.) : préconditions, effets, et cas d'**invalidation** ou de **recalcul**.
- [x] Documenter le **modèle additif** des permissions : union / composition, **clés techniques stables** (convention de nommage, stabilité semver / évolution), **libellés** séparés des clés, **multi-appartenance aux groupes**, et **seule source effective** = calcul backend (rappel explicite : pas de confiance aux manifests ou à l'UI pour l'autorisation métier).
- [x] Détailler le **step-up** minimal : quelles classes d'actions déclenchent **confirmation**, **PIN**, **revalidation** ; critères de **blocage** vs **mode dégradé** vs **recalcul forcé** du `ContextEnvelope` (sémantique métier — le schéma OpenAPI détaillé reste Story **1.4** / Epic **2**).
- [x] Section **alignement contractuel** : rappeler **AR39** — `OpenAPI` > `ContextEnvelope` > `NavigationManifest` > `PageManifest` > `UserRuntimePrefs` ; le `ContextEnvelope` est une **instance runtime dérivée du backend**, pas une source parallèle. Rappeler **AR19** — writer OpenAPI canonique = **Recyclique**. Renvoyer vers `contracts/README.md`, `contracts/openapi/`, `contracts/creos/` pour **vocabulaire partagé** (enums, clés permission) **sans** dupliquer la gouvernance complète réservée à la Story **1.4**.
- [x] Section **écarts éventuels** : comparer brièvement avec `peintre-nano/src/types/context-envelope.ts` (stub UI) — **non normatif** ; noter écarts ou champs « à aligner OpenAPI » pour éviter que le frontend ne fige une vérité métier.
- [x] Mettre à jour **`references/artefacts/index.md`** (convention projet : obligatoire pour tout nouvel artefact daté).
- [x] Vérifier **aucune donnée sensible** dans le document (pas de secrets, pas de dumps).

## Dev Notes

### Périmètre et anti-confusion

- **Livrable principal** : document de spécification sous `references/artefacts/` — **pas** d'implémentation backend, **pas** de modification de `peintre-nano/` pour satisfaire cette story.
- **Story 1.4** : ne pas fermer ici la gouvernance OpenAPI/CREOS ni rédiger `contracts/openapi/recyclique-api.yaml` ; la spec 1.3 **prépare** et **aligne** sémantiquement les concepts que 1.4 formalisera en contrats reviewables.
- **Epic 2** : les stories 2.2–2.4 **implémenteront** contexte, permissions effectives, step-up — la spec 1.3 est la **référence métier** qu'elles doivent respecter.

### Livrable canonique

- **Fichier principal (livré)** : `references/artefacts/2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md` — traçabilité **AC → sections** en tête du document ; **HITL A–G** intégrés (journal ci-dessus + spec §1 bis, §3.0, §4.0–§4.4, §5.0, §6.0–§6.3, §2.8).
- **Index** : `references/artefacts/index.md` mis à jour ; recherche Perplexity (PIN / caisse) : `references/recherche/2026-04-02_pin-ouverture-caisse-operateur-pos-rgpd_perplexity_reponse.md` + `references/recherche/index.md`.
- **Gouvernance contrats détaillée** : Story **1.4** — `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` (spec 1.3 = **quoi** métier ; 1.4 = **comment** reviewable).

### Intelligence story précédente (1.2)

- L'audit brownfield (`references/artefacts/2026-04-02_02_audit-brownfield-backend-api-donnees-critiques.md`) identifie : agrégation de contexte aujourd'hui **implicite** via multiples appels ; **ContextEnvelope** unique en cible v2 ; permissions via `users/me/permissions` à **canonicaliser** (clés stables, union additive) ; surfaces **sûres en premier** (auth, me, sites, session courante, lecture réception) — la spec 1.3 doit **s'appuyer** sur ces constats pour prioriser les invariants et les règles de recalcul.
- Backlog décisionnel **B1/B2** de l'audit : figer auth + contexte + permissions et publier ContextEnvelope minimal — la spec documente le **quoi** et le **pourquoi** avant le **comment** contractuel (1.4) et code (2.x).

### Guardrails architecture / contrats

- **AR39** (epics.md) : hiérarchie de vérité — toute exposition UI du contexte actif est une **projection** ; la décision d'accès reste **backend**.
- **AR19** : enums, clés permission, schémas — le **lieu reviewable** reste OpenAPI + CREOS ; la spec 1.3 définit la **sémantique** et les **invariants**, pas le YAML complet.
- **Peintre_nano** : types `ContextEnvelopeStub` illustrent un alignement structurel transitoire ; les **noms de champs** et **statuts runtime** peuvent diverger jusqu'à convergence OpenAPI — le document 1.3 doit trancher ou lister les **intentions canoniques** (ex. statuts `ok` / `degraded` / `forbidden` comme vocabulaire produit si retenu).

### Recherche technique « latest »

- **N/A** : story **documentaire métier** ; pas de dépendance à une version de framework. Réutiliser le vocabulaire du PRD / epics / audit.

### Tests

- **Pas de tests automatisés obligatoires** pour cette story documentaire.
- **Critère de qualité** : relecture HITL selon la section ci-dessus ; traçabilité AC → sections du document.

### Project Structure Notes

- Cohérence avec `guide-pilotage-v2.md` : Piste B produit des contrats qui ancrent la Piste A ; la spec 1.3 évite toute **seconde source de vérité** côté UI.
- Pour cadrage complémentaire : `references/migration-paheko/`, `references/vision-projet/` si besoin de relier postes caisse/réception au terrain réel — **sans** étendre le périmètre à la sync Paheko (Stories **1.5**, **1.6**, Epic **8**).

### Références

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 1, Story 1.3, AR19, AR39]
- [Source: `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — Pistes A/B, Convergence 1]
- [Source: `references/artefacts/2026-04-02_02_audit-brownfield-backend-api-donnees-critiques.md` — §3 contexte/permissions, §5–§7, §8 croisement contracts]
- [Source: `references/artefacts/2026-04-02_01_surface-travail-v2-mode-reference-paheko.md` — Story 1.1, mode référence]
- [Source: `contracts/README.md` — rôles OpenAPI / CREOS, `data_contract.source`]
- [Source: `contracts/creos/schemas/README.md` — extension widgets, lien futur `operationId`]
- [Source: `peintre-nano/src/types/context-envelope.ts` — comparaison non normative / écarts]
- [Source: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` — Piste B, frontières repo]

## Dev Agent Record

### Agent Model Used

Composer (agent Cursor) — phase DS `bmad-dev-story`, 2026-04-02.

### Debug Log References

_(aucun — livraison documentaire)_

### Completion Notes List

- Artefact canonique `references/artefacts/2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md` : traçabilité AC → §2–§8 ; **§6.0 D–E** (step-up, politique PIN), **§2.8**, **§4.3–§4.4** (panel super-admin + extensions), **§6.3** (cycle de vie PIN) ; **§1 bis** (opérateur = bénévole) ; aucune donnée sensible.
- HITL journal **A–G** (2026-04-02) aligné spec + index artefacts ; réponse Perplexity archivée sous `references/recherche/` (index recherche à jour).
- `sprint-status.yaml` : story **1-3** en **done**.
- **QA documentaire** : `_bmad-output/implementation-artifacts/tests/1-3-spec-multi-contextes-doc-qa-summary.md` (**PASS**, `gates_skipped_with_hitl: true`) ; entrée dans `tests/test-summary.md`.
- Tests automatisés produit : **N/A** (story documentaire).

### File List

- `references/artefacts/2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md` (créé ; révisions HITL 2026-04-02)
- `references/artefacts/index.md` (modifié)
- `references/recherche/2026-04-02_pin-ouverture-caisse-operateur-pos-rgpd_perplexity_reponse.md` (archivé — appui HITL D / §6.0)
- `references/recherche/index.md` (modifié — entrée Perplexity + lien spec 03)
- `_bmad-output/implementation-artifacts/tests/1-3-spec-multi-contextes-doc-qa-summary.md` (créé — synthèse QA doc)
- `_bmad-output/implementation-artifacts/tests/test-summary.md` (modifié — ligne story 1.3)
- `references/index.md` (modifié — pointeur Epic 1.3 à côté de 1.4)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modifié)
- `_bmad-output/implementation-artifacts/1-3-specifier-le-modele-multi-contextes-et-les-invariants-dautorisation-v2.md` (modifié — story / Dev Agent Record / statut)

### Change Log

| Date | Changement |
|------|------------|
| 2026-04-02 | DS : livraison spec multi-contextes v2, index artefacts, sprint `1-3` → `review`. |
| 2026-04-02 | HITL **A–G** : intégrations successives dans spec (§1 bis, §3.0, §4.x, §5.0, §6.0–§6.3, §2.8) ; Perplexity archivée ; index artefacts + recherche ; statut story **done**. |
| 2026-04-02 | QA documentaire : `1-3-spec-multi-contextes-doc-qa-summary.md` + `test-summary.md`. |
| 2026-04-02 | Révision cohérence : Dev Notes (chemin livré, lien pivot 1.4), Completion Notes / File List / Change Log alignés sur HITL **A–G** et livrables réels ; `references/index.md` (pointeur Epic 1.3). |
