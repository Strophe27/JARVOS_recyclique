# Sprint Change Proposal — Epic 4 Convergence 2 : écart entre preuve BMAD et exposition UI réelle

**Date :** 2026-04-07  
**Workflow :** Correct Course (`bmad-correct-course`)  
**Destinataire :** Strophe  
**Statut :** Appliquee

---

## 1. Résumé du problème

### Énoncé

Les artefacts BMAD déclarent **Epic 4** et ses stories **4.1 → 4.6** comme terminées du point de vue exécution story par story.

Pourtant, lors d'une validation humaine réelle sur la stack Docker locale officielle :

- `http://localhost:4444/` affiche encore la **démo Epic 3** ;
- `http://localhost:4444/bandeau-live-sandbox` n'expose pas le slice `bandeau live` attendu ;
- aucune requête live réelle du bandeau n'est déclenchée sur cette page ;
- la page vue par l'utilisateur reste celle avec **`Indicateur démo 42`**.

### Type de déclencheur

- **Malentendu / glissement entre preuve technique et preuve utilisateur visible**
- **Critère de done trop large** autour du gate **Convergence 2**
- **Ecart de raccordement réel** entre les livrables Epic 4 et l'app effectivement servie

### Preuves

- `peintre-nano/src/app/App.tsx` monte uniquement `RuntimeDemoApp`.
- `peintre-nano/src/app/demo/runtime-demo-manifest.ts` charge uniquement les manifests de démo Epic 3 (`src/fixtures/manifests/valid/*`).
- Les manifests Epic 4 existent bien dans `contracts/creos/manifests/`, mais ne sont pas branchés dans le bundle réellement servi.
- La preuve story 4.6 (`references/artefacts/2026-04-07_03_preuve-convergence-2-bandeau-live.md`) précise que la preuve principale côté frontend repose sur **Vitest + jsdom + fetch mocké**, et renvoie la preuve réseau réelle à une vérification manuelle ultérieure.
- La visite réelle de `http://localhost:4444/bandeau-live-sandbox` montre toujours la page démo Epic 3, pas le slice Epic 4.

---

## 2. Analyse d'impact

### Epic impact

| Epic | Impact |
|------|--------|
| **Epic 4** | Impact direct et bloquant sur la clôture réelle : le gate Convergence 2 a été considéré comme franchi alors que le slice n'est pas exposé dans l'UI réellement servie. |
| **Epic 5** | Impact de séquencement : ne pas démarrer la recomposition transverse sur une hypothèse de chaîne modulaire “prouvée” tant que l'exposition réelle du slice n'est pas refermée. |
| **Epic 6 / 7** | Impact indirect : ces epics dépendent de la confiance dans la chaîne runtime réelle ; l'écart doit être fermé avant extension flows lourds. |
| **Epic 10** | Impact mineur : les sujets de doc / stack locale sont déjà en bonne voie ; ici le coeur du problème n'est pas Docker mais le branchement UI réel. |

### Story impact

| Story | Impact |
|------|--------|
| **4.2** | Story cohérente sur le registre et le widget lui-même. Elle ne promet pas explicitement le raccordement dans l'entrée UI réellement servie. |
| **4.3** | Story cohérente sur le fetch live, polling, corrélation et états métier. Le code live existe, mais il n'est pas exposé via le bon bundle/page dans l'app servie. |
| **4.4** | Fallbacks et rejets semblent couverts au niveau composant/tests. Pas la cause racine principale. |
| **4.5** | Toggle admin minimal cohérent sur le slice, mais lui aussi dépend d'un slice effectivement visible. |
| **4.6** | Story la plus impactée : elle affirme une preuve bout-en-bout observable sur stack locale officielle. C'est ici que le `done` est aujourd'hui trop généreux ou ambigu. |

### Conflits d'artefacts

| Artefact | Situation |
|----------|-----------|
| `epics.md` | Attend une preuve “en vrai” de la chaîne complète, incluant rendu widget et fallback. |
| `4-6-...md` | Interprète cette preuve comme satisfaite et marque la story `done`. |
| `2026-04-07_03_preuve-convergence-2-bandeau-live.md` | Requalifie implicitement la preuve frontend en preuve automatisée `jsdom` + mention d'une future preuve réseau réelle. |
| `guide-pilotage-v2.md` | Convergence 2 est cochée alors que la validation humaine réelle révèle une exposition UI incomplète. |
| `sprint-status.yaml` | Toutes les stories 4.1 à 4.6 sont `done`, mais l'epic reste `in-progress`, ce qui laisse une fenêtre de correction process. |
| `peintre-nano/src/app/App.tsx` et `runtime-demo-manifest.ts` | Restent alignés avec le socle Epic 3, pas avec le slice Epic 4 réellement servi. |

### Impact technique

- **Faible à moyen** côté code : le coeur du module existe déjà.
- **Moyen** côté process BMAD : il faut corriger la définition de “preuve” de fin Epic 4.
- **Faible** côté architecture : pas de remise en cause du design global, mais un trou de raccordement / exposition réelle.
- **Faible** côté Docker : la stack locale officielle fonctionne ; le problème est au niveau du bundle/page/UI servie.

---

## 3. Approche recommandée

### Option 1 — Rouvrir uniquement la story 4.6

**Verdict :** viable, mais incomplet seul.

Avantage :
- garde la logique “le problème est dans le gate final”.

Inconvénient :
- risque de masquer le fait qu'il existe un **travail fonctionnel de raccordement UI réel** qui n'est pas explicitement porté par une story dédiée ;
- mélange “validation” et “implémentation de dernier mile”.

### Option 2 — Ajouter une story complémentaire Epic 4.x de raccordement UI réel, puis refaire 4.6

**Verdict :** recommandé.

Idée :
- ne pas nier que 4.6 a été survalidée ;
- reconnaître qu'il manque un **dernier mile user-visible** :
  - brancher les manifests Epic 4 dans l'app réellement servie ;
  - gérer la sélection par `pathname` / route ;
  - aligner les permissions de démonstration ou le parcours d'accès ;
  - permettre la validation humaine réelle sur `4444`.

Ensuite :
- requalifier / rouvrir `4.6` comme gate de validation finale ;
- rejouer la preuve réelle ;
- seulement après, clôturer Epic 4.

### Option 3 — Considérer que le scope Epic 4 était purement “bac à sable / tests” et modifier le gate produit

**Verdict :** non recommandé.

Avantage :
- évite du backlog supplémentaire.

Inconvénient :
- contredit trop clairement la formulation “preuve bout-en-bout observable” et le sens de `Convergence 2` ;
- affaiblit la discipline produit avant Epic 5–7.

### Recommandation retenue

**Approche hybride, dominée par l'Option 2 :**

1. **Rouvrir fonctionnellement 4.6** comme gate non encore validé en conditions réelles.  
2. **Ajouter une nouvelle story Epic 4.x** de raccordement UI réel du slice `bandeau live` dans `peintre-nano` réellement servi.  
3. Une fois cette story faite, **rejouer 4.6** avec validation humaine réelle et corriger les artefacts de preuve / jalons.

Pourquoi :
- le problème n'est pas un bug d'implémentation profonde du widget ou de l'API ;
- le problème est un **trou de raccordement entre livrables techniques et exposition utilisateur réelle** ;
- ce trou mérite sa propre story pour rester lisible et ne pas surcharger artificiellement la seule story 4.6 ;
- en même temps, `4.6` ne peut plus rester `done` tant que la preuve observable n'est pas réellement satisfaite.

---

## 4. Propositions de changement détaillées

### 4.1 Changement recommandé sur l'Epic 4

**Ajouter une nouvelle story Epic 4.x** entre la réalisation du slice et la validation finale.

**Titre proposé :**  
`Brancher le slice bandeau live dans l'entrée UI réellement servie par Peintre_nano`

### 4.2 Positionnement recommandé

Ordre recommandé :

- `4.1` contrats / manifests
- `4.2` widget registre
- `4.3` source backend réelle
- `4.4` fallbacks
- `4.5` toggle admin minimal
- **4.6** raccordement UI réel / navigation / exposition utilisateur
- **4.7** validation finale chaîne complète observable

Si tu préfères éviter de renuméroter lourdement les stories déjà existantes :

- conserver les stories `4.1 → 4.6` telles qu'elles existent dans l'historique,
- **ajouter une story `4.6b` ou `4.6c`** de raccordement UI réel,
- puis **requalifier `4.6`** comme gate final à rejouer, ou créer une `4.7` finale.

### 4.3 Pourquoi une nouvelle story plutôt qu'une simple correction silencieuse

Le trou est assez spécifique pour mériter une traçabilité dédiée :

- il ne relève pas seulement d'un test manquant ;
- il ne relève pas non plus d'une erreur de wording mineure ;
- il s'agit d'une capacité produit observable manquante dans le chemin réellement servi.

Une simple réécriture de `4.6` sans nouvelle story risquerait de :

- diluer la responsabilité ;
- rendre floue la frontière entre “implémenter le raccordement” et “valider la preuve”.

### 4.4 Story la plus probablement défaillante aujourd'hui

**Story la plus en cause : `4.6`**

Raison :
- c'est elle qui affirme une preuve observable sur stack locale officielle ;
- c'est elle qui a permis de cocher `Convergence 2` ;
- or la validation humaine réelle montre que cette preuve n'était pas satisfaite dans l'UI servie.

**Mais** :
- la correction à faire ressemble davantage à **une story de raccordement manquante** qu'à une pure “réouverture code” d'une story précédente.

### 4.5 Proposition de backlog

**Proposition principale :**

- garder `4.1 → 4.5` comme `done`
- **retirer le caractère effectivement “fermé” de 4.6** dans le raisonnement produit
- ajouter une **story complémentaire de raccordement UI réel**
- rejouer ensuite une **story de validation finale** (4.6 requalifiée ou nouvelle 4.7)

### 4.6 Critères d'acceptation proposés pour la story complémentaire

- Le slice `bandeau live` est visible depuis l'app réellement servie sur `http://localhost:4444`
- La route dédiée (`/bandeau-live-sandbox` ou équivalent retenu) résout effectivement la bonne page
- L'URL navigateur influence réellement la page affichée
- Les manifests Epic 4 sont chargés par le bundle réellement monté, pas seulement par les tests
- La permission de démonstration / contexte de test permet de voir le slice sans contorsion manuelle opaque
- Le widget déclenche réellement les appels live quand le mode live est activé

### 4.7 Ajustements documentaires recommandés

**`4-6-...md`**

OLD:
- story marquée `done` avec preuve Convergence 2 acquise

NEW:
- story à requalifier comme **preuve partiellement satisfaite en automatisé**
- ajouter explicitement :
  - “preuve UI servie non encore fermée”
  - dépendance vers la nouvelle story de raccordement réel

Rationale:
- réaligner la story avec le constat de validation humaine

**`guide-pilotage-v2.md`**

OLD:
- `Convergence 2` cochée

NEW:
- soit décochée,
- soit annotée comme “preuve automatisée acquise, validation UI servie en correction”

Rationale:
- éviter un faux positif de jalon

**`sprint-status.yaml`**

OLD:
- `4-6-...: done`

NEW:
- à décider après validation utilisateur du correct course :
  - soit réouvrir `4-6`
  - soit ajouter `4-6b` / `4-7` en `backlog`

Rationale:
- ne pas modifier le tracking sans décision explicite

---

## 5. Impact MVP / planning

- **MVP produit :** inchangé sur le fond
- **Trajectoire Epic 4 :** ajustement modéré
- **Effort estimé :** faible à moyen
- **Risque :** faible si on traite maintenant, plus élevé si on laisse l'écart contaminer Epic 5

Timeline impact :
- une petite story de raccordement UI réel
- puis un re-run court de validation finale

Ce changement améliore :

- la sincérité du gate `Convergence 2`
- la confiance dans les prochains epics UI lourds
- la qualité de la validation humaine terrain

---

## 6. Handoff recommandé

| Rôle | Responsabilité |
|------|----------------|
| **Strophe** | Valider l'option backlog retenue : `4.6b/4.7` dédiée ou réouverture stricte de `4.6` |
| **Scrum / backlog BMAD** | Appliquer le correct course aux artefacts (`epics.md`, `sprint-status.yaml`, stories impactées) |
| **Dev / agent** | Implémenter le raccordement UI réel du slice dans `peintre-nano` |
| **QA / validation humaine** | Rejouer la preuve réelle sur stack Docker locale et confirmer visibilité, polling, corrélation, fallback |

### Recommandation finale

Ne pas considérer `Epic 4` comme réellement close tant que le slice n'est pas visible dans l'app réellement servie.  
Ajouter une **story complémentaire de raccordement UI réel**, puis refaire la **validation finale** avant de clôturer l'epic.

---

## 7. Validation humaine réelle à rejouer après correction

### Préparation

- Démarrer la stack locale officielle depuis la racine du mono-repo
- Vérifier `api` sur `8000`
- Vérifier `peintre-nano` sur `4444`

### Parcours attendu

1. Ouvrir `http://localhost:4444`
2. Accéder au slice `bandeau live` via la route ou navigation réellement prévue
3. Vérifier que le bandeau visible n'est plus la démo `42`
4. Ouvrir le réseau navigateur
5. Vérifier au moins un appel `GET /v2/exploitation/live-snapshot`
6. Vérifier la présence de `X-Correlation-ID`
7. Vérifier un cas nominal
8. Vérifier un cas d'échec endpoint / fallback visible

### Critère de succès humain

Une personne non auteure du code peut constater sans ambiguïté que :

- le slice Epic 4 est réellement servi
- il consomme le backend réel
- il expose un fallback visible
- la preuve `Convergence 2` est observable, pas seulement reconstruite depuis les tests

---

## 8. Checklist Correct Course — synthèse

| Section | Statut |
|---------|--------|
| 1 — Déclencheur clair | Fait |
| 2 — Impact epics / stories | Fait |
| 3 — Conflits artefacts | Fait |
| 4 — Évaluation des options | Fait |
| 5 — Proposition structurée | Fait |
| 6 — Approbation utilisateur | En attente |

