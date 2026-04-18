# Hypothèse post-V2 — `Peintre` autonome et applications contributrices

**Statut :** hypothèse produit / architecture — **hors périmètre v2** et **hors backlog** tant qu’elle n’est pas promue (PRD / epic / ADR dédiée).  
**Date :** 2026-04-07  
**Rôle :** documenter une trajectoire où `Peintre` devient un **moteur UI générique** de l’écosystème JARVOS, tandis que `Recyclique` devient une **application contributrice** qui apporte ses contrats, widgets, flows et extensions backend.  
**Position de prudence :** trajectoire **possible et cohérente** avec le cadrage actuel, mais **non engagée** tant qu’un besoin produit ou écosystème réel ne justifie pas le coût d’extraction et de packaging.  
**Important :** ce document **n’est pas** une feuille de route implicite de la v2 ; il décrit une **option de trajectoire post-promotion**, pas un critère de design qui remplacerait les epics actifs.

---

## 1. Question à clarifier

La v2 actuelle traite `Peintre_nano` comme le **frontend Recyclique v2**.  
L’hypothèse post-v2 consiste à demander :

> Peut-on, plus tard, faire exister `Peintre` comme **produit / repo autonome**, avec un **socle moteur** propre et un périmètre applicatif minimal, puis permettre à une application comme `Recyclique` de lui **fournir** à l’installation ou au build ce dont elle a besoin : manifests, widgets, flows, raccourcis, pages, et éventuellement bundles UI dédiés ?

Cette question est **distincte** du marketplace de modules complémentaires :

- ici, on parle d’abord de la relation **moteur UI** <-> **application contributrice** ;
- le marketplace ajoute ensuite une couche de **distribution / licences / catalogue**.

---

## 2. Hypothèse cible (post-promotion, pas backlog v2)

Dans une évolution ultérieure, **après promotion explicite du sujet**, on vise potentiellement :

- un **repo / package `Peintre`** autonome ;
- un **socle UI** fournissant le shell, le runtime de composition, le registre, les slots, le rendu des flows, les règles de validation, les fallbacks et l’adaptateur React ;
- une ou plusieurs **applications contributrices** (`Recyclique`, puis peut-être d’autres applications JARVOS) qui apportent :
  - leurs `NavigationManifest` / `PageManifest` ;
  - leurs schémas et contrats `OpenAPI` / `CREOS` ;
  - leurs widgets et flows ;
  - leurs bindings métier ;
  - leurs extensions backend, **sans court-circuiter** la frontière actuelle où l’application métier concernée reste l’**autorité** de ses opérations, permissions, contextes et intégrations.

Lecture simple :

- **`Peintre`** = moteur d’affichage générique ;
- **`Recyclique`** = commanditaire métier + contributions UI/backend ;
- **installation finale** = assemblage des deux.

### Hypothèse de propriété des contrats

Dans cette trajectoire, l’hypothèse la plus prudente est la suivante :

- **l’application contributrice** reste le **writer canonique** de ses contrats reviewables (`OpenAPI`, manifests `CREOS`, schémas métier dérivés) ;
- **`Peintre`** consomme des **artefacts publiés** ou référencés, mais ne devient **pas** la nouvelle source de vérité métier ;
- l’extraction éventuelle vers plusieurs repos ne devra **pas** créer une double vérité `contracts/` entre moteur et application.

Le modèle exact de publication / consommation multi-repo reste **à décider plus tard** (ADR dédiée si promotion), mais l’invariant est déjà posé : **la vérité métier et contractuelle reste du côté de l’application contributrice**.

---

## 3. Ce que le cadrage actuel prépare déjà

La trajectoire est **partiellement préparée** par les décisions déjà posées :

- `Peintre_nano` est explicitement pensé comme **moteur d’affichage / télécran agnostique** ;
- le frontend est annoncé comme **extractible plus tard** vers un repo dédié ;
- la structure métier, la navigation et les permissions restent **commanditaires** côté `Recyclique` ;
- `CREOS` porte la **grammaire commune** de composition ;
- `OpenAPI` reste la source de vérité sur les opérations et schémas backend ;
- la hiérarchie de vérité (`OpenAPI > ContextEnvelope > NavigationManifest > PageManifest > UserRuntimePrefs`) borne déjà ce que `Peintre` a le droit d’inventer ou non.

Autrement dit : l’architecture actuelle **ne ferme pas** cette évolution, mais cela **ne justifie pas** d’anticiper dès maintenant une extraction complète ou un packaging multi-repo dans les epics actifs.

---

## 4. Ce que la v2 actuelle n’implémente pas encore

La v2 actuelle **n’implémente pas** encore :

- un `Peintre` publié comme produit autonome ;
- un mécanisme d’installation séparée de contributions applicatives dans `Peintre` ;
- des bundles applicatifs `Recyclique` injectés dans un shell `Peintre` externe ;
- un protocole de packaging et versioning entre moteur et applications contributrices ;
- un mode officiel de déploiement où `Peintre` serait vide puis rempli par installation.

Aujourd’hui, le modèle réel reste :

- `Peintre_nano` = frontend Recyclique v2 ;
- `Recyclique` = backend + commanditaire + contrats ;
- les domaines UI (`cashflow`, `reception`, etc.) vivent encore dans le monorepo côté `peintre-nano/src/domains/`.

**Conséquence pratique :** l’idée d’un `Peintre` “presque vide” doit être lue comme une **hypothèse ultérieure après promotion**, pas comme une cible d’implémentation immédiate pour les epics actifs.

---

## 5. Recommandation actuelle : ne pas faire la dichotomie complète en V2

### Recommandation nette

**Je ne recommande pas** de lancer maintenant une **séparation totale** `Peintre autonome` / `Recyclique contributrice` au milieu de la v2, même si nous ne sommes “que” à Epic 4.

### Pourquoi

Parce qu’une vraie dichotomie demanderait au minimum :

- un format de **packaging** des contributions applicatives ;
- un contrat de **compatibilité versionnée** entre moteur et application ;
- une stratégie de **build / intégration / release** multi-repo ;
- une clarification sur ce qui vit dans le **shell**, ce qui vit dans l’**app contributrice**, et ce qui vit dans des **modules optionnels** ;
- une adaptation du workflow de dev, de CI et de déploiement.

Ce n’est **pas** une petite extraction cosmétique.  
Le risque, si on le fait maintenant, est de **ralentir fortement** la preuve v2 avant d’avoir validé les slices métier prioritaires (`bandeau`, `cashflow`, `reception`).

### Donc : que faire en v2 ?

La bonne stratégie est plutôt :

1. **continuer la v2 telle quelle** ;
2. **préserver les frontières** qui rendent l’extraction possible ;
3. **éviter** les raccourcis qui coupleraient irréversiblement `Peintre` au métier Recyclique ;
4. **documenter** clairement la trajectoire future.

---

## 6. Garde-fous V2 à maintenir absolument

Pour que l’extraction reste une **évolution** et non une **refonte**, la v2 doit continuer à respecter ces garde-fous :

- `Peintre_nano` **n’invente pas** de routes, pages, permissions ou structure métier hors contrats commanditaires ;
- les widgets et flows restent branchés via le **registre**, les **slots** et les contrats, pas via du couplage implicite au backend ;
- `Recyclique` reste l’**auteur métier** et l’**autorité de vérité** ;
- `Peintre_nano` reste un **runtime de rendu**, pas un second backend métier ;
- les contrats `OpenAPI` / `CREOS` restent **stables, reviewables et gouvernés** ;
- les imports et dépendances ne doivent pas rendre `Peintre` dépendant des détails internes métier de `Recyclique`.

En clair : ce qu’il faut **durcir maintenant**, ce sont les **frontières**, pas la **séparation physique complète**.

---

## 7. Lecture de trajectoire possible (pas une roadmap engagée)

Une trajectoire raisonnable **pourrait** être :

### Étape A — v2

- monorepo ;
- `Peintre_nano` = frontend Recyclique v2 ;
- contrats commanditaires + runtime borné ;
- domaines UI encore présents dans `peintre-nano`.

### Étape B — post-v2 (si déclencheurs réunis)

- extraction de `Peintre` vers un repo / package dédié ;
- formalisation d’une surface de contribution applicative `Recyclique -> Peintre` ;
- séparation plus nette entre **moteur**, **app contributrice**, **modules optionnels**.

### Étape C — plus tard encore (si le besoin le justifie réellement)

- packaging officiel des contributions ;
- installation ou mise à jour d’une application contributrice dans un `Peintre` autonome ;
- éventuellement marketplace / catalogue au-dessus.

---

## 8. Risque principal à surveiller

Le vrai danger n’est pas de “ne pas extraire maintenant”.  
Le vrai danger est de **laisser croire** que `Peintre_nano` est agnostique alors qu’on y laisserait entrer de plus en plus de **logique métier Recyclique codée en dur**.

Si cela se produit, alors la séparation future deviendra :

- coûteuse ;
- lente ;
- fragile ;
- potentiellement refondante.

Donc la question n’est pas seulement “quand extraire ?”, mais :

> sommes-nous encore en train de construire `Peintre` comme un moteur borné, ou sommes-nous en train d’y recoder Recyclique en façade ?

---

## 9. Déclencheurs qui justifieraient de promouvoir ce sujet

Cette hypothèse doit monter d’un cran dès qu’un des cas suivants apparaît :

1. besoin d’un **second commanditaire** réel autre que `Recyclique` ;
2. besoin d’un **repo dédié `Peintre`** pour des raisons d’équipe, de release ou de réutilisation ;
3. besoin d’un **protocole officiel de packaging** entre moteur UI et application contributrice ;
4. besoin d’installer une application contributrice **sans recompiler tout le shell** ;
5. besoin de distinguer proprement **moteur UI**, **app métier**, **marketplace**, **modules optionnels** dans les releases et le support.

**Clarification :** ici, **second commanditaire** signifie d’abord **second package applicatif / second writer métier** derrière les mêmes invariants contractuels, **pas** un simple second tenant, ni une simple seconde instance d’hébergement du même produit.

---

## 10. Décision pratique recommandée aujourd’hui

Pour l’instant :

- **ne pas** réarchitecturer toute la v2 autour d’un `Peintre` autonome ;
- **oui** à la documentation de la trajectoire ;
- **oui** au durcissement des frontières en v2 ;
- **oui** à une future promotion en chantier si les déclencheurs ci-dessus apparaissent.

**Discipline de lecture :** les étapes ci-dessus ne valent **pas engagement roadmap** ; elles décrivent une trajectoire possible **si** les déclencheurs métier et techniques sont réunis.

Formulation courte :

> Continuer la v2 actuelle, mais comme si l’extraction future devait rester possible sans chirurgie lourde.

---

## 11. Où enregistrer les mises à jour futures

1. **Document maître (BMAD) :** ce fichier sous `planning-artifacts/architecture/`.
2. **Visibilité agents :** lien dans [references/index.md](../../../references/index.md) et dans l’index architecture.
3. Si la trajectoire devient un vrai chantier : promouvoir en **ADR dédiée**, **PRD addendum** ou **epic**.

---

## 12. Références internes

- [project-structure-boundaries.md](./project-structure-boundaries.md) — bornage runtime / auteur métier / extractibilité.
- [core-architectural-decisions.md](./core-architectural-decisions.md) — extractibilité future et rôle du frontend.
- [post-v2-hypothesis-marketplace-modules.md](./post-v2-hypothesis-marketplace-modules.md) — couche supérieure de distribution commerciale et de modules complémentaires.
- [references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md](../../../references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md) — hiérarchie de vérité et runtime Peintre borné.
