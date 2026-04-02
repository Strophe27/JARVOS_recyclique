# Story 1.3 : Spécifier le modèle multi-contextes et les invariants d'autorisation v2

**Clé fichier (obligatoire) :** `1-3-specifier-le-modele-multi-contextes-et-les-invariants-dautorisation-v2`  
**Epic :** epic-1 — prérequis Piste B (backend, contrats, analyses, Paheko) — **pas** epic-3 Peintre_nano  
**Statut :** review

<!-- Validation optionnelle : exécuter validate-create-story avant dev-story. -->

## Story

En tant qu’**équipe backend et produit** (Piste B),  
je veux une **spécification canonique v2** des contextes, rôles, groupes, permissions et revalidations sensibles,  
afin que **tous les epics futurs** partagent le **même modèle d’isolation et d’autorisation**, sans double vérité côté UI.

## Acceptance Criteria

**Étant donné** que la v2 repose sur une **isolation stricte** entre sites, caisses, sessions, postes et opérateurs  
**Quand** la spécification multi-contextes est publiée  
**Alors** elle définit les **entités et champs minimaux canoniques** pour : `site`, `caisse`, `session`, `poste de réception`, `rôle`, `groupe`, `permissions`, et `PIN`  
**Et** elle énonce les **invariants de zéro fuite** et les **règles de changement de contexte** que les implémentations futures doivent préserver.

**Étant donné** que les permissions en v2 sont **additives** et **calculées par Recyclique**  
**Quand** le modèle d’autorisation est décrit  
**Alors** la story formalise les **clés techniques stables**, les **libellés personnalisables**, l’**appartenance multi-groupes**, et l’**autorité backend** sur les permissions effectives  
**Et** elle stipule que les **libellés UI ne sont jamais une vérité de sécurité**.

**Étant donné** que les actions sensibles exigent des garanties **plus fortes** qu’un simple filtrage d’affichage  
**Quand** les règles de sécurité sont finalisées  
**Alors** elles définissent les **comportements minimaux de step-up** : confirmation, PIN, revalidation de rôle  
**Et** elles précisent **quand** le système doit **bloquer**, **dégrader** ou **forcer un recalcul explicite** du contexte.

### Validation humaine (HITL) — critères de relecture

Un pair valide que la spec couvre bien : entités minimales (site, caisse, session, poste réception, rôle, groupe, permissions, PIN) ; invariants zéro fuite et règles de changement de contexte ; permissions additives calculées par Recyclique ; clés stables, libellés, multi-groupes, backend autorité ; **UI jamais vérité sécurité** ; step-up (confirmation, PIN, revalidation) et **quand** bloquer / dégrader / recalculer le contexte.

## Tasks / Subtasks

- [x] Rédiger le **document canonique** (livrable ci-dessous) en couvrant **explicitement** les trois blocs Given/When/Then (table de traçabilité AC → sections recommandée).
- [x] Décrire pour chaque entité minimale : **identité**, **champs obligatoires**, **relations** (cardinalités et dépendances), **cycle de vie** succinct, et **liens** avec les domaines brownfield déjà cartographiés (caisse, réception, auth, permissions, contexte) — en s’appuyant sur l’audit 1.2 sans le recopier.
- [x] Formaliser les **invariants d’isolation** (zéro fuite inter-site / inter-caisse / inter-session / inter-poste / entre opérateurs) et les **règles de bascule de contexte** (sélection site, ouverture session caisse, poste réception, etc.) : préconditions, effets, et cas d’**invalidation** ou de **recalcul**.
- [x] Documenter le **modèle additif** des permissions : union / composition, **clés techniques stables** (convention de nommage, stabilité semver / évolution), **libellés** séparés des clés, **multi-appartenance aux groupes**, et **seule source effective** = calcul backend (rappel explicite : pas de confiance aux manifests ou à l’UI pour l’autorisation métier).
- [x] Détailler le **step-up** minimal : quelles classes d’actions déclenchent **confirmation**, **PIN**, **revalidation** ; critères de **blocage** vs **mode dégradé** vs **recalcul forcé** du `ContextEnvelope` (sémantique métier — le schéma OpenAPI détaillé reste Story **1.4** / Epic **2**).
- [x] Section **alignement contractuel** : rappeler **AR39** — `OpenAPI` > `ContextEnvelope` > `NavigationManifest` > `PageManifest` > `UserRuntimePrefs` ; le `ContextEnvelope` est une **instance runtime dérivée du backend**, pas une source parallèle. Rappeler **AR19** — writer OpenAPI canonique = **Recyclique**. Renvoyer vers `contracts/README.md`, `contracts/openapi/`, `contracts/creos/` pour **vocabulaire partagé** (enums, clés permission) **sans** dupliquer la gouvernance complète réservée à la Story **1.4**.
- [x] Section **écarts éventuels** : comparer brièvement avec `peintre-nano/src/types/context-envelope.ts` (stub UI) — **non normatif** ; noter écarts ou champs « à aligner OpenAPI » pour éviter que le frontend ne fige une vérité métier.
- [x] Mettre à jour **`references/artefacts/index.md`** (convention projet : obligatoire pour tout nouvel artefact daté).
- [x] Vérifier **aucune donnée sensible** dans le document (pas de secrets, pas de dumps).

## Dev Notes

### Périmètre et anti-confusion

- **Livrable principal** : document de spécification sous `references/artefacts/` — **pas** d’implémentation backend, **pas** de modification de `peintre-nano/` pour satisfaire cette story.
- **Story 1.4** : ne pas fermer ici la gouvernance OpenAPI/CREOS ni rédiger `contracts/openapi/recyclique-api.yaml` ; la spec 1.3 **prépare** et **aligne** sémantiquement les concepts que 1.4 formalisera en contrats reviewables.
- **Epic 2** : les stories 2.2–2.4 **implémenteront** contexte, permissions effectives, step-up — la spec 1.3 est la **référence métier** qu’elles doivent respecter.

### Livrable canonique

- **Fichier principal** : `references/artefacts/YYYY-MM-DD_NN_spec-multi-contextes-invariants-autorisation-v2.md`  
  - `YYYY-MM-DD` = date de livraison ; `NN` = prochain numéro disponible ce jour sous `references/artefacts/` (01, 02, …).
- **Index** : `references/artefacts/index.md` mis à jour.

### Intelligence story précédente (1.2)

- L’audit brownfield (`references/artefacts/2026-04-02_02_audit-brownfield-backend-api-donnees-critiques.md`) identifie : agrégation de contexte aujourd’hui **implicite** via multiples appels ; **ContextEnvelope** unique en cible v2 ; permissions via `users/me/permissions` à **canonicaliser** (clés stables, union additive) ; surfaces **sûres en premier** (auth, me, sites, session courante, lecture réception) — la spec 1.3 doit **s’appuyer** sur ces constats pour prioriser les invariants et les règles de recalcul.
- Backlog décisionnel **B1/B2** de l’audit : figer auth + contexte + permissions et publier ContextEnvelope minimal — la spec documente le **quoi** et le **pourquoi** avant le **comment** contractuel (1.4) et code (2.x).

### Guardrails architecture / contrats

- **AR39** (epics.md) : hiérarchie de vérité — toute exposition UI du contexte actif est une **projection** ; la décision d’accès reste **backend**.
- **AR19** : enums, clés permission, schémas — le **lieu reviewable** reste OpenAPI + CREOS ; la spec 1.3 définit la **sémantique** et les **invariants**, pas le YAML complet.
- **Peintre_nano** : types `ContextEnvelopeStub` illustrent un alignement structurel transitoire ; les **noms de champs** et **statuts runtime** peuvent diverger jusqu’à convergence OpenAPI — le document 1.3 doit trancher ou lister les **intentions canoniques** (ex. statuts `ok` / `degraded` / `forbidden` comme vocabulaire produit si retenu).

### Recherche technique « latest »

- **N/A** : story **documentaire métier** ; pas de dépendance à une version de framework. Réutiliser le vocabulaire du PRD / epics / audit.

### Tests

- **Pas de tests automatisés obligatoires** pour cette story documentaire.
- **Critère de qualité** : relecture HITL selon la section ci-dessus ; traçabilité AC → sections du document.

### Project Structure Notes

- Cohérence avec `guide-pilotage-v2.md` : Piste B produit des contrats qui ancrent la Piste A ; la spec 1.3 évite toute **seconde source de vérité** côté UI.
- Pour cadrage complémentaire : `references/migration-paeco/`, `references/vision-projet/` si besoin de relier postes caisse/réception au terrain réel — **sans** étendre le périmètre à la sync Paheko (Stories **1.5**, **1.6**, Epic **8**).

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

- Artefact canonique `references/artefacts/2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md` : traçabilité AC → sections, entités §2, invariants §3, bascules §4, permissions additives §5, step-up §6, AR39/AR19 §7, écarts stub Peintre_nano §8 ; aucune donnée sensible.
- Index `references/artefacts/index.md` mis à jour ; `sprint-status.yaml` : story passée en `review`.
- Tests automatisés : **N/A** (story documentaire, Dev Notes).

### File List

- `references/artefacts/2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md` (créé)
- `references/artefacts/index.md` (modifié)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modifié)
- `_bmad-output/implementation-artifacts/1-3-specifier-le-modele-multi-contextes-et-les-invariants-dautorisation-v2.md` (modifié — story / Dev Agent Record / statut)

### Change Log

| Date | Changement |
|------|------------|
| 2026-04-02 | DS : livraison spec multi-contextes v2, index artefacts, sprint `1-3` → `review`. |

---

**Note create-story (CS) :** analyse contextuelle complétée — guide d’implémentation documentaire pour l’agent dev. **DS 2026-04-02 :** livrable canonique et index à jour ; sprint `1-3` en `review`.
