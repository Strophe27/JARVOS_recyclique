---
type: addendum-correct-course
date: 2026-04-20
story: 25.6
story_key: 25-6-lever-le-gel-process-correct-course-documenter-la-levee-et-le-pilotage-observable
sources_normatives:
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md
  - _bmad-output/planning-artifacts/2026-04-20-note-readiness-cible-post-epic25-decisions.md
---

# Addendum — levée du gel process (correct course 2026-04-19) et pilotage observable

**Date du présent addendum :** 2026-04-20 (alignée sur la livraison DS de la story **25.6**).  
**Statut :** acte de pilotage documentaire ; **aucune** réouverture du fond des **ADR 25-2** et **ADR 25-3** (elles restent la norme d’implémentation).

---

## 1. Rappel — gel imposé par le Sprint Change Proposal du 2026-04-19

**Document :** `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md`.

**Règle retenue (section 3, boucle implémentation) :** **`bmad-create-story` → `bmad-dev-story` … uniquement sur les clés `25-*` tant que le gel est actif.**

**Levée exigée (même document, section 3) :** décision **explicite** avant de relancer le DS sur les epics en suspens (ex. **13–15**) ou tout autre epic « hors 25 ».

Le présent addendum constitue cette **levée explicite et traçable** au sens des AC de la story **25.6**, avec **réplication** dans `_bmad-output/implementation-artifacts/sprint-status.yaml` (commentaires + clé `development_status`).

---

## 2. Croisement — note de readiness du 2026-04-20

**Document :** `_bmad-output/planning-artifacts/2026-04-20-note-readiness-cible-post-epic25-decisions.md`.

| Sujet (note §2 / §3 / §7) | Lecture après levée 25.6 |
|---------------------------|---------------------------|
| **Gel process (hors `25-*`)** | La note indiquait le gate **ouvert** tant que la levée n’était pas documentée. **Après ce addendum + YAML aligné**, les **nouvelles** exécutions **`bmad-dev-story`** hors clés **`25-*`** sont **réautorisées** sous les **conditions** du tableau « Encore gelé ou conditionnel » ci-dessous (équivalent à §7 : gates distincts du statut ADR). |
| **NOT READY PWA / kiosque massif** | **Inchangé** : orthogonal à la levée *process* ; pas de programme PWA massif autorisé par seule la story **25.6**. |
| **Gate qualité API (audit brownfield P0)** | **Conditionnel** pour promotions / merges touchant **Paheko** ou **caisse** (cf. note §2). |
| **Instantané post-2026-04-21** | La **vérité opérationnelle** des clés `development_status` reste **`sprint-status.yaml`** ; les encadrés historiques de la note ne remplacent pas le YAML courant. |
| **Candidat 13-8** | Rester aligné sur la note : **25.6** ne **ferme pas** seule la story **13.8** et n’est **pas** une livraison kiosque PWA. |

---

## 3. Ce qui est levé (process BMAD)

| Élément | Décision |
|---------|----------|
| **Gel d’exécution** du 2026-04-19 sur les **nouveaux** runs **`bmad-dev-story` / DS** **hors** les clés **`25-*`** | **Levé** à compter de la traçabilité **addendum + `sprint-status.yaml`** (date **2026-04-20**). |
| **Confusion « note dans le chat » vs déverrouillage observable** | **Réduit** : la règle applicable se lit dans ce fichier **et** dans les commentaires / clés YAML listés en section 5. |

**Non confondu avec :** clôture de l’**Epic 25** (la phase **25.6–25.15** peut continuer ; **`epic-25: done`** n’est **pas** exigé par cette story).

---

## 4. Ce qui reste gelé, conditionnel ou hors périmètre

| Zone | Statut | Référence rapide |
|------|--------|------------------|
| **Programme PWA / kiosque « massif »** | **NOT READY** (readiness rapport 2026-04-19 + note 2026-04-20) | Pas de GO implicite par la levée process. |
| **Promotions / merges sensibles Paheko ou caisse** | **Gate API P0** ou report **tracé** avec propriétaire | Note readiness §2 (gate qualité API). |
| **ADR 25-2 (PIN / kiosque / step-up / offline)** | **Acceptée — respect obligatoire ; fond non rouvert** | `_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md` |
| **ADR 25-3 (async Paheko / outbox / Redis)** | **Acceptée — respect obligatoire ; fond non rouvert** | `_bmad-output/planning-artifacts/architecture/2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md` |
| **Story 25.6 elle-même** | **N’implémente pas** la PWA kiosque ; **ne clôt pas** seule **13.8** | AC story **25.6** ; cohérent avec note readiness §2 / §5. |
| **DAG phase 2 Epic 25** | **25.6** reste racine pour la suite **25.7+** ; ne pas inférer une promotion automatique des clés **`25-7`…** sans Story Runner | `_bmad-output/planning-artifacts/architecture/epic-25-phase2-dag-2026-04-21.yaml` |

---

## 5. Liste vérifiable (minutes) — chemins et clés YAML

**Contrôle « pas papier seul » :** ouvrir **(1)** ce fichier **et** **(2)** `_bmad-output/implementation-artifacts/sprint-status.yaml` ; la même règle de levée / conditions doit apparaître dans les **commentaires** sous **epic-10, epic-13, epic-14, epic-15** et dans la trace **`# last_updated`** en tête de fichier.

| # | Vérification | Type |
|---|----------------|------|
| 1 | `_bmad-output/planning-artifacts/2026-04-20-addendum-levee-gel-process-correct-course-story-25-6.md` | Fichier (présent addendum) |
| 2 | `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md` | Source normative du gel |
| 3 | `_bmad-output/planning-artifacts/2026-04-20-note-readiness-cible-post-epic25-decisions.md` | Gates / NOT READY / 13-8 |
| 4 | `_bmad-output/implementation-artifacts/sprint-status.yaml` | Trace **`# last_updated`** (historique en tête de fichier) + cle racine **`last_updated`** (fraicheur canonique, ex. **2026-04-21** apres harmonisation post-QA2) — **DS 25-6** `ready-for-dev` → `review` → **Story Runner fin** → **`done`** |
| 5 | `development_status["25-6-lever-le-gel-process-correct-course-documenter-la-levee-et-le-pilotage-observable"]` | **`done`** après chaîne CS→VS→DS→GATE→QA→CR (trace YAML ligne `# last_updated` Story Runner fin **25-6**) |
| 6 | `development_status["epic-25"]` | **`in-progress`** (ne **pas** passer **`done`** dans le cadre de **25.6**) |
| 7 | Commentaires sous clés **`epic-10`**, **`epic-13`**, **`epic-14`**, **`epic-15`** | Mention **levée 2026-04-20** + renvoi addendum + conditions (PWA NOT READY, gate API P0, ADR) |
| 8 | `_bmad-output/implementation-artifacts/25-6-lever-le-gel-process-correct-course-documenter-la-levee-et-le-pilotage-observable.md` | **Status** : **`done`** post–Story Runner (après **`review`**) |
| 9 | `development_status["13-8-implementer-la-traduction-kiosque-legacy-retenue-dans-peintre-nano"]` | **Non modifié** par **25.6** (ex. reste **`review`** selon YAML courant) — pas de clôture substitut |

**Commandes rapides (grep) :**

```text
rg "25-6-lever-le-gel" _bmad-output/implementation-artifacts/sprint-status.yaml
rg "addendum-levee-gel-process" _bmad-output/implementation-artifacts/sprint-status.yaml
rg "Levée gel process \\(2026-04-20" _bmad-output/implementation-artifacts/sprint-status.yaml
```

---

## 6. Trace Epic 25 — ADR (story 25.6)

| Élément | Valeur |
|--------|--------|
| Nouvelle ADR structurante | **ADR N/A** |
| ADR **25-2** / **25-3** | **Respecter** ; **ne pas rouvrir** le fond sans incohérence bloquante |

---

**Fin de l’addendum — story 25.6, livraison DS 2026-04-20 ; clôture pilotage Story Runner (YAML **`25-6` → `done`**, synthèse QA `tests/test-summary-story-25-6-doc-qa.md`) ; alignements **`epics.md` §25** / cle racine **`last_updated`** complément **2026-04-21** (post-QA2).**
