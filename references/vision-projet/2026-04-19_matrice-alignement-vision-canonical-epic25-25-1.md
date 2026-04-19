# Matrice d'alignement vision → canon brownfield (Epic 25 — story 25.1)

**Date :** 2026-04-19  
**Projet :** JARVOS_recyclique  
**Objectif :** une vue unique des exigences importées (PRD vision, PRD canon, research, readiness, QA2) avec statut explicite et classification de périmètre Epic 25.

---

## Légende

### Colonne « Statut alignement »

**Une seule valeur par ligne** parmi :

| Valeur | Signification |
|--------|----------------|
| **canonique** | Décision ou implémentation déjà ancrée dans le brownfield et/ou `prd.md` BMAD — base de vérité pour le dépôt tant qu’une ADR ne dit pas le contraire. |
| **cible** | Intention produit / vision documentée ; pas encore traduite en epics FR1–FN ni en code sans passage par ADR ou spec. |
| **ADR requise** | Décision structurante manquante ; toute story de build qui trancherait sans ADR est **interdite** (gel + règle epics §25). |
| **hors gate** | Hors readiness implémentation telle que rapportée (ex. PWA offline-first **NOT READY**) ; ou sujet **non prescriptif** pour la séquence décisionnelle Epic 25 (voir Notes) ; reste traçable sans élargir le périmètre assumé du gel. |

Toute nuance (ex. « cible + ADR », « mixte ») est portée dans la colonne **Notes**.

### Colonne « Périmètre Epic 25 »

| Valeur | Signification |
|--------|----------------|
| **noyau Epic 25** | Objet direct des stories 25.1–25.5 (matrice, ADR PIN, ADR async, spec multisite, readiness). |
| **future story** | Candidat backlog **après** fermeture ADR / spec / gate (pas bloquant la clôture documentaire 25.*). |
| **hors périmètre assumé du gel** | Sujet nommé pour éviter le **scope creep** ; n’est pas une promesse de livraison dans la séquence `25-*` courante. |

**Référentiels obligatoires (chemins repo)** — chaque ligne de la matrice principale cite **au moins un** de ces fichiers :

- `_bmad-output/planning-artifacts/prd.md`
- `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md` (PRD vision 2026-04-19)
- `_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md`
- `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md`
- `references/artefacts/2026-04-19_03_qa2-findings-revisions-cloture-bmad-passe.md`

---

## Matrice principale

| Sujet importé | Statut alignement | Notes | Sources minimales (chemins repo) | Périmètre Epic 25 | Peut devenir story de dev ? | Tant que non clos |
|----------------|-------------------|-------|----------------------------------|-------------------|-----------------------------|-------------------|
| **PIN opérateur caisse** (serveur, JWT, step-up) | canonique | — | `_bmad-output/planning-artifacts/prd.md` ; `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md` ; `references/artefacts/2026-04-19_03_qa2-findings-revisions-cloture-bmad-passe.md` | noyau Epic 25 (référence) | Oui — déjà couvert par epics existants ; pas de fusion avec PIN kiosque sans ADR | Maintenir la distinction documentaire. |
| **PIN kiosque PWA** (secret de poste, lockout métier, offline) | ADR requise | Cible produit documentée dans la PRD vision ; ne pas coder le modèle kiosque avant ADR dédiée. | `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md` ; `_bmad-output/planning-artifacts/prd.md` ; `_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md` ; `references/artefacts/2026-04-19_03_qa2-findings-revisions-cloture-bmad-passe.md` | noyau Epic 25 | **Non** avant **25.2** (ADR PIN) | Story 25.2 ; puis epics/stories kiosque explicites. |
| **Async écritures Paheko** (outbox SQL, idempotence, reprise) | canonique | Chemin nominal actuel ; toute évolution qui change la sémantique → **ADR 25.3**. | `_bmad-output/planning-artifacts/prd.md` ; `_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md` ; `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md` ; `references/artefacts/2026-04-19_03_qa2-findings-revisions-cloture-bmad-passe.md` | noyau Epic 25 | Oui — déjà livré côté epics 8 / 22–23 ; évolutions sensibles → ADR | Tant que **25.3** non clos, ne pas imposer « Redis seul » comme vérité. |
| **Formulation « file Redis » pour Paheko** (vision) | ADR requise | Tension vision NFR5 vs outbox ; arbitrage dans **25.3** + reformulation transport. | `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md` ; `_bmad-output/planning-artifacts/prd.md` ; `_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md` ; `references/artefacts/2026-04-19_03_qa2-findings-revisions-cloture-bmad-passe.md` | noyau Epic 25 | **Non** avant **25.3** | ADR async + reformulation / couche transport. |
| **Multisite analytique** (sites, projets Paheko, rattachements) | cible | Canon brownfield partiel ; cadrage / invariants en **25.4**. | `_bmad-output/planning-artifacts/prd.md` ; `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md` ; `_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md` ; `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md` | noyau Epic 25 | Partiellement — spec **25.4** avant extension large | Invariants et mappings dans 25.4. |
| **Permissions / rôles / groupes additifs** | canonique | Socle v2 ; extension kiosque = **25.4** + ADR si écart. | `_bmad-output/planning-artifacts/prd.md` ; `_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md` ; `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md` ; `references/artefacts/2026-04-19_03_qa2-findings-revisions-cloture-bmad-passe.md` | noyau Epic 25 | Oui — existant ; extension kiosque selon 25.4 | Ne pas élargir sans spec 25.4. |
| **Device / token matériel kiosque** (IndexedDB, révocation IP) | hors gate | Cible vision Epic 1 ; bloqué par gate PWA / readiness tant que non levé. | `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md` ; `_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md` ; `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md` ; `references/artefacts/2026-04-19_03_qa2-findings-revisions-cloture-bmad-passe.md` | future story | **Non** tant que gate PWA / ADR PIN non fermés | Hors séquence exécutable immédiate post-gel. |
| **File / queue offline** (IndexedDB, conflits stock) | hors gate | Aligné readiness PWA **NOT READY**. | `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md` ; `_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md` ; `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md` ; `references/artefacts/2026-04-19_03_qa2-findings-revisions-cloture-bmad-passe.md` | future story | **Non** sans socle PWA + ADR | Documentaire jusqu’à nouveau gate. |
| **Auto-suspend** / plages horaires | cible | Hors séquence 25.* ; nommé pour éviter scope creep. | `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md` ; `_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md` ; `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md` | hors périmètre assumé du gel | Futur epic hors 25.* (à re-prioriser) | Ne pas confondre avec gel BMAD ; sujet nommé, non livré en 25.*. |
| **Canaux d’alerte** (Telegram, Push, fallback) | cible | Idem — vision sans engagement Epic 25. | `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md` ; `_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md` ; `references/artefacts/2026-04-19_03_qa2-findings-revisions-cloture-bmad-passe.md` | hors périmètre assumé du gel | Idem | Idem. |
| **Gel BMAD** (DS hors `25-*`) | canonique | Règle de pilotage documentaire. | `_bmad-output/planning-artifacts/prd.md` ; `references/artefacts/2026-04-19_03_qa2-findings-revisions-cloture-bmad-passe.md` ; `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md` | noyau Epic 25 | N/A — règle de pilotage | Levée documentée uniquement. |
| **Chantier audit / refactor API** (qualité Paheko) | hors gate | **Orthogonal** à la décision produit / canon Epic 25 : chantier brownfield qualité, **non prescriptif** pour les livrables 25.* ; ne substitue pas une ADR (25.2/25.3) ni ne fige un statut « canonique » pour l’epic. Coexiste avec le gel sans court-circuiter les ADR. | `_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md` ; `references/artefacts/2026-04-19_03_qa2-findings-revisions-cloture-bmad-passe.md` ; `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md` | hors périmètre assumé du gel | Oui — parallèle (hors séquence 25.* comme engagement canon) | Priorité qualité distincte du gel décisionnel kiosque / async. |

---

## Travail documentaire vs story de code

| Type | Condition | Exemples |
|------|-----------|----------|
| **Reste documentaire** jusqu’à ADR / spec | Sujet avec statut **ADR requise** ou **hors gate** | PIN kiosque avant 25.2 ; Redis/outbox avant 25.3 ; PWA avant readiness + ADR |
| **Peut devenir story de dev** après fermeture | ADR approuvée + éventuellement spec 25.4 + rerun 25.5 | Nouvelles stories kiosque explicites dans `epics.md` / sprint |
| **Déjà couvert par epics existants** | Statut **canonique** sans tension avec vision | PIN opérateur, outbox Paheko actuelle, permissions v2 |

---

## Traçabilité QA2 — consolidation documentaire

Les réponses aux findings QA2 (frontmatter research, `inputDocuments`, tension Redis/outbox, etc.) sont résumées dans `references/artefacts/2026-04-19_03_qa2-findings-revisions-cloture-bmad-passe.md` ; cette matrice **ne les remplace pas** mais **ancre** les sujets dans les statuts ci-dessus pour le pilotage `25-*`.

---

**Fin du livrable story 25.1.**
