# Matrice d'alignement vision → canon brownfield (Epic 25 — story 25.1)

**Date :** 2026-04-19  
**Projet :** JARVOS_recyclique  
**Objectif :** une vue unique des exigences importées (PRD vision, PRD canon, research, readiness, QA2) avec statut explicite et classification de périmètre Epic 25.

---

## Légende

### Colonne « Statut alignement »

| Valeur | Signification |
|--------|----------------|
| **canonique** | Décision ou implémentation déjà ancrée dans le brownfield et/ou `prd.md` BMAD — base de vérité pour le dépôt tant qu’une ADR ne dit pas le contraire. |
| **cible** | Intention produit / vision documentée ; pas encore traduite en epics FR1–FN ni en code sans passage par ADR ou spec. |
| **ADR requise** | Décision structurante manquante ; toute story de build qui trancherait sans ADR est **interdite** (gel + règle epics §25). |
| **hors gate** | Hors readiness implémentation telle que rapportée (ex. PWA offline-first **NOT READY**) ; reste traçable sans élargir le périmètre assumé du gel. |

### Colonne « Périmètre Epic 25 »

| Valeur | Signification |
|--------|----------------|
| **noyau Epic 25** | Objet direct des stories 25.1–25.5 (matrice, ADR PIN, ADR async, spec multisite, readiness). |
| **future story** | Candidat backlog **après** fermeture ADR / spec / gate (pas bloquant la clôture documentaire 25.*). |
| **hors périmètre assumé du gel** | Sujet nommé pour éviter le **scope creep** ; n’est pas une promesse de livraison dans la séquence `25-*` courante. |

---

## Matrice principale

| Sujet importé | Statut alignement | Sources minimales (chemins repo) | Périmètre Epic 25 | Peut devenir story de dev ? | Tant que non clos |
|----------------|-------------------|----------------------------------|-------------------|-----------------------------|-------------------|
| **PIN opérateur caisse** (serveur, JWT, step-up) | canonique | `_bmad-output/planning-artifacts/prd.md` (§4.1, §11.2, tableau gouvernance) ; readiness § synthèse | noyau Epic 25 (référence) | Oui — déjà couvert par epics existants ; pas de fusion avec PIN kiosque sans ADR | Maintenir la distinction documentaire. |
| **PIN kiosque PWA** (secret de poste, lockout métier, offline) | cible + **ADR requise** | `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md` (Epic 2) ; `prd.md` (PIN dual) ; research §5.1 | noyau Epic 25 | **Non** avant **25.2** (ADR PIN) | Story 25.2 ; puis epics/stories kiosque explicites. |
| **Async écritures Paheko** (outbox SQL, idempotence, reprise) | canonique (chemin nominal) | Architecture + `prd.md` §5 ; chaîne `cash-accounting-paheko-canonical-chain` (réf. prd) ; research §3.1, §4 | noyau Epic 25 | Oui — déjà livré côté epics 8 / 22–23 ; évolutions **changent** sémantique → **ADR** | Tant que **25.3** non clos, ne pas imposer « Redis seul » comme vérité. |
| **Formulation « file Redis » pour Paheko** (vision) | cible + **ADR requise** | PRD vision NFR5 ; `prd.md` (gouvernance Redis vs outbox) ; sprint-change 2026-04-19 | noyau Epic 25 | **Non** avant **25.3** | ADR async + reformulation / couche transport. |
| **Multisite analytique** (sites, projets Paheko, rattachements) | mixte : canon partiel brownfield + cible vision | `prd.md` ; research §4 (Epic 3 vision) ; readiness tableau | noyau Epic 25 | Partiellement — spec **25.4** avant extension large | Invariants et mappings dans 25.4. |
| **Permissions / rôles / groupes additifs** | canonique (socle v2) | `epics.md` FR14–FR15 ; Epic 2 stories ; research §6 | noyau Epic 25 | Oui — existant ; extension kiosque = **25.4** + ADR si écart | Ne pas élargir sans spec 25.4. |
| **Device / token matériel kiosque** (IndexedDB, révocation IP) | cible + **hors gate** | PRD vision Epic 1 ; readiness **PWA NOT READY** ; research §4 | future story | **Non** tant que gate PWA / ADR PIN non fermés | Hors séquence exécutable immédiate post-gel. |
| **File / queue offline** (IndexedDB, conflits stock) | cible + **hors gate** | PRD vision Epic 1.2 ; research §3.2 ; readiness | future story | **Non** sans socle PWA + ADR | Documentaire jusqu’à nouveau gate. |
| **Auto-suspend** / plages horaires | cible vision | PRD vision Epic 4.1 ; research §4 | hors périmètre assumé du gel | Futur epic hors 25.* (à re-prioriser) | Ne pas confondre avec gel BMAD ; sujet nommé, non livré en 25.*. |
| **Canaux d’alerte** (Telegram, Push, fallback) | cible vision | PRD vision Epic 4.2 | hors périmètre assumé du gel | Idem | Idem. |
| **Gel BMAD** (DS hors `25-*`) | canonique (process) | `sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md` ; `sprint-status.yaml` ; `prd.md` encart gel | noyau Epic 25 | N/A — règle de pilotage | Levée documentée uniquement. |
| **Chantier audit / refactor API** (qualité Paheko) | canonique (recommandé P0) | research §4 dernière ligne ; Kanban chantier ; QA2 synthèse | hors périmètre assumé du gel (orthogonal mais gate qualité) | Oui — parallèle ; ne remplace pas ADR 25.2/25.3 | Coexistence avec gel : pas d’excuse pour court-circuiter ADR. |

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
