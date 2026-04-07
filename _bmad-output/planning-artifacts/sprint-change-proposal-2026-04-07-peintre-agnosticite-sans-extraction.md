# Sprint Change Proposal — préserver l’agnosticité future de `Peintre_nano` sans extraction prématurée

**Date :** 2026-04-07  
**Workflow :** Correct Course (`bmad-correct-course`)  
**Destinataire :** Strophe  
**Statut :** **Approuvé par Strophe (2026-04-07)** — implémentation documentaire demandée : durcissement du cadrage post-v2, mémo opérationnel, liens dans le guide de pilotage.

---

## 1. Résumé du problème

### Énoncé

Le projet porte simultanément :

- une **v2 active** où `Peintre_nano` est le **frontend Recyclique v2** dans le monorepo ;
- une **trajectoire post-v2** où `Peintre` pourrait devenir un **moteur autonome** et `Recyclique` une **application contributrice** ;
- une **hypothèse distincte** de **marketplace / modules complémentaires**.

Le risque n’est pas l’absence de vision post-v2. Le risque est double :

1. **sur-architecturer la v2** en lançant trop tôt une séparation complète `Peintre autonome` / `Recyclique contributrice` ;
2. **laisser dériver** les futurs epics (`5` à `10`) vers un `Peintre_nano` qui recoderait progressivement le métier `Recyclique`, rendant une extraction future coûteuse.

### Type de déclencheur

- **Émergence d’un besoin stratégique / trajectoire produit** : séparation future possible entre moteur UI, application contributrice et, plus tard, marketplace.
- **Risque d’interprétation** détecté pendant le cadrage : sans garde-fous visibles, les epics à venir peuvent confondre **extractibilité future** et **travail à faire maintenant**.

### Preuves / éléments déclencheurs

- Document créé et QAé : `post-v2-hypothesis-peintre-autonome-applications-contributrices.md`
- Hypothèse connexe : `post-v2-hypothesis-marketplace-modules.md`
- Explorations Epics `4` à `10` : principaux points de rupture autour du shell transverse, `cashflow`, `reception`, sync `Paheko`, config admin simple, CI contrats.

---

## 2. Analyse d’impact

### Impact épics

| Zone | Impact |
|------|--------|
| **Epic 4** | Sert de **preuve de chaîne modulaire** ; ne doit pas être relu comme preuve d’un packaging multi-repo ou d’un moteur `Peintre` autonome. |
| **Epic 5** | Très exposé au risque de recréer navigation, pages ou admin métier hors contrats commanditaires. |
| **Epic 6** | `cashflow` : fort risque de déplacer dans l’UI des règles de sécurité, de contexte, de stale data, de paiement ou d’audit. |
| **Epic 7** | `reception` : même risque côté flux matière, contexte, traçabilité, dégradations. |
| **Epic 8** | Sync `Paheko` : frontière backend critique à préserver. |
| **Epic 9** | Très fort risque de confusion entre modules v2 build-time, config admin simple, ACL, et marketplace post-v2. |
| **Epic 10** | CI / drift = filet indispensable pour conserver une extractibilité future crédible. |

### Impact artefacts

| Artefact | Impact |
|----------|--------|
| `guide-pilotage-v2.md` | **Doit** porter un rappel visible pour les agents superviseurs et créations de stories sur les epics futurs. |
| `epics.md` | Pas de réécriture structurelle immédiate recommandée ; les garde-fous existent déjà, mais ils doivent être mieux **relayés** opérationnellement. |
| Architecture (`project-structure-boundaries.md`, `navigation-structure-contract.md`) | Déjà globalement alignée ; les hypothèses post-v2 complètent sans contredire. |
| `references/artefacts/` | Bon emplacement pour un mémo opératoire daté, court et facilement citable. |

### Impact technique

- Aucun besoin immédiat de refactor multi-repo.
- Aucune nécessité de modifier la séquence produit v2.
- Besoin fort de **discipline documentaire et de review** pour éviter :
  - routes/pages métier inventées côté front ;
  - permissions ou contextes re-déduits côté UI ;
  - `operation_id` hors gouvernance ;
  - confusion `Peintre autonome` / `marketplace`.

---

## 3. Approche recommandée

**Approche retenue : ajustement direct modéré** — **pas** d’extraction `Peintre` en v2, **pas** de nouvel epic structurel, **oui** à un renforcement explicite des garde-fous visibles.

### Option 1 — Ajustement direct

**Verdict : viable**

- effort : **faible à modéré**
- risque : **faible**
- valeur : **élevée**

Consiste à :

1. durcir le document post-v2 `Peintre autonome` ;
2. créer un **mémo/checklist PR / create-story** ;
3. relier ce mémo au **guide de pilotage v2** ;
4. documenter la décision dans un **Sprint Change Proposal**.

### Option 2 — Rollback / refonte immédiate

**Verdict : non viable**

- disproportionné par rapport à l’état du projet ;
- casserait la dynamique avant les preuves `Epic 4`, puis `5`, `6`, `7`.

### Option 3 — Revue MVP / changement de cap produit

**Verdict : non nécessaire**

- le MVP v2 reste atteignable sans séparation complète ;
- le besoin post-v2 est réel comme trajectoire, mais pas comme priorité d’implémentation immédiate.

### Recommandation finale

Continuer la v2 **sans split complet**, mais avec une consigne explicite :

> durcir les **frontières** maintenant pour que l’extraction future reste une **évolution**, pas une **refonte**.

---

## 4. Propositions de changements concrets

### 4.1 Document post-v2 `Peintre autonome`

**Appliquer / vérifier :**

- propriété prudente des contrats en multi-repo ;
- clarification “second commanditaire” ;
- distinction nette avec l’hypothèse marketplace ;
- rappel que la v2 actuelle reste monorepo, `Peintre_nano` frontend Recyclique ;
- bannière explicite : pas une roadmap engagée.

### 4.2 Mémo opérationnel daté

Créer dans `references/artefacts/` un mémo court de type :

`2026-04-07_03_checklist-pr-peintre-sans-metier.md`

Contenu :

- checks de review PR / create-story ;
- signaux rouges ;
- articulation Epics `4` à `10`.

### 4.3 Guide de pilotage v2

Ajouter un lien visible vers le mémo dans `guide-pilotage-v2.md`, avec consigne explicite :

- à charger pour stories / PR touchant `Peintre_nano` dans les Epics `5` à `10` ;
- utile pour les agents superviseurs et les créations de stories.

### 4.4 Index artefacts

Ajouter l’entrée correspondante dans `references/artefacts/index.md`.

---

## 5. Handoff implémentation

| Champ | Valeur |
|-------|--------|
| **Classification** | **Modérée** — backlog / pilotage / discipline documentaire |
| **Rôles concernés** | PM / Architecte / Scrum Master documentaire / futurs agents de story |
| **Ce qui change dans le flux** | Les futures stories et PR autour de `Peintre_nano` disposent d’un garde-fou visible ; la trajectoire post-v2 n’est plus seulement implicite. |
| **Ce qui ne change pas** | Pas de split multi-repo, pas de nouvel epic structurel, pas de refonte v2. |

### Critères de succès

1. Le document post-v2 `Peintre autonome` est QAé et stabilisé.
2. Le mémo opérationnel existe, est indexé et relié au guide.
3. Un agent qui charge `guide-pilotage-v2.md` peut retrouver ce garde-fou avant de créer ou d’implémenter une story Epic `5` à `10`.
4. Les hypothèses `Peintre autonome` et `marketplace` restent **distinctes** dans la documentation.

---

## 6. Checklist Correct Course (synthèse)

| Section | Statut |
|---------|--------|
| 1 — Déclencheur identifié | Fait |
| 2 — Impact epics futurs (`5` à `10`) | Fait |
| 3 — Impact artefacts (guide, architecture, artefacts) | Fait |
| 4 — Option retenue : ajustement direct modéré | Fait |
| 5 — Handoff et livrables | Fait |
| 6 — Approbation utilisateur | Fait (demande explicite d’aller jusqu’au bout) |

---

## 7. Suite recommandée

Pas de nouvel arbitrage produit requis immédiatement.  
La prochaine étape logique est :

1. utiliser la checklist sur les futures stories Epic `5` à `10` ;
2. rouvrir un `correct course` seulement si un **déclencheur réel** apparaît :
   - repo dédié `Peintre`,
   - second package applicatif réel,
   - besoin de packaging officiel,
   - besoin d’installation sans rebuild complet du shell.

---

*Document généré selon la logique du workflow `bmad-correct-course`, en mode batch et avec mise en oeuvre documentaire directement demandée par l’utilisateur.*
