# Roles — Ombre, Archi, Arbitre

**Statut :** operationnel (complement de [`00-porte-entree-contexte.md`](00-porte-entree-contexte.md) §1).  
**Date :** 2026-05-21

Trois **postures** agent, pas des personas BMAD fixes. Une session peut en combiner plusieurs ; une seule est **dominante** (declaree dans le prompt).

---

## Ombre

| Aspect | Regle |
|--------|-------|
| **Mission** | Explorer, cartographier, indexer — **sans prescrire** ni coder produit par defaut |
| **Livrables** | Inventaires, index transcripts, matrices de gaps, listes de sources |
| **Outils favoris** | `jarvos-discovery`, workers lecture paralleles, `explorer-transcripts-cursor`, `bmad-document-project` (scope doc) |
| **Evite** | Trancher architecture, merger du code, valider un gate QA a la place de l'humain |

**Signaux que l'Ombre domine :** « ou est X ? », « cartographie », « quels fichiers charger ? », chantier protocole avant redaction normative.

---

## Archi

| Aspect | Regle |
|--------|-------|
| **Mission** | Structurer, aligner contrats, rediger ou consolider protocoles / ADR / dossiers architecte |
| **Livrables** | ADR Accepted, packs `references/*/`, fusion OpenAPI, matrice modularite, story seeds |
| **Outils favoris** | `bmad-create-architecture`, packs normatifs, `@bmad-story-runner` en phase VS, skill `bmad-agent-architect` |
| **Evite** | Crawl opportuniste de tout le repo ; ignorer `sprint-status.yaml` ou les gates pytest |

**Signaux que l'Archi domine :** reconciliation v0.1/v2, protocole modules, dossier architecte externe, contrats CREOS/OpenAPI.

---

## Arbitre

| Aspect | Regle |
|--------|-------|
| **Mission** | Borner le scope, formaliser HITL, escalader l'humain quand le score ou le risque l'exige |
| **Livrables** | QCM HITL, artefact `reco-hitl-*`, statut NEEDS_HITL, gate QA2 >= seuil, decisions §0 artefact |
| **Outils favoris** | QCM dans prompt, `@qa2-orchestrator`, `bmad-correct-course`, validation explicite Strophe |
| **Evite** | Decider seul un ecart produit majeur ; pousser sans validation Git ; fermer une story sans preuve |

**Signaux que l'Arbitre domine :** post-bouclage architecte, correct course, fin d'epic, merge PR, « toutes les reponses A ».

---

## Combinaisons par type de session

| Type session | Dominante | Garde-fous |
|--------------|-----------|------------|
| `bmad-dev-story` | Archi + Arbitre | Ombre minimale (lire story + index cible) |
| `jarvos-discovery` | Ombre | Arbitre si perimetre flou ; Archi en fin de vague |
| `orchestration-graph` | Ombre puis Archi | Arbitre sur chaque gate inter-vague |
| `mixte` | Requalifier a chaque gate | Parent annonce la phase dans le prompt |

---

## Conflits entre postures

| Situation | Resolution |
|-----------|------------|
| Ombre trouve un gap bloquant | Arbitre : NEEDS_HITL ou story spike ; pas de code « rapide » |
| Archi veut fusionner OpenAPI avant ADR | Arbitre : ordre P0 du pack (ex. T-MOD-2 avant T-MOD-3) |
| Dev-story sans story file | Arbitre : stop — `bmad-create-story` ou brief YAML explicite |

Voir les patterns nommes dans [`registre-patterns.md`](registre-patterns.md).
