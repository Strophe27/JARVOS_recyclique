# Sprint Change Proposal — Parité caisse : de « observable bornée » à « même site qu’avant dans Peintre »

**Date :** 2026-04-12  
**Révision :** 2026-04-12 **v3** — correctifs issus du **retour QA** appliqués : ordre §4, gates MCP (PR + nightly), nom exact colonne matrice, raccourci guide + lien rapide ; **v2** : intégration PO (équivalence **dans** Peintre / CREOS / API ; `references/peintre/`).  
**Auteur (workflow) :** Correct Course BMAD (`bmad-correct-course`)  
**Destinataire :** Strophe (PO / pilotage)  
**Langue :** français  

---

## 1. Résumé du problème (déclencheur)

**Constat produit (terrain)** : en comparant Legacy (`localhost:4445`) et Peintre (`localhost:4444`) sur la caisse, l’écart **visuel, workflow et raccourcis** reste **massif** au regard de l’intention utilisateur : *« le même site qu’avant, mais dans Peintre »*.

**Constat pilotage** : sur **deux volets** (notamment **Epic 11** et **Epic 13**, plus découpe **RCN-***), les stories et AC ont été formulées en **parité UI observable bornée** : checklists, preuves DevTools, matrice, **écarts nommés / gaps acceptés**, respect strict **CREOS / hiérarchie de vérité / pas de métier front**. C’est **cohérent avec le texte actuel des epics**, mais **pas équivalent** à la demande implicite ou explicite répétée : **réplication utilisateur complète** du legacy dans Peintre.

**Risque** : frustration récurrente, « livrables verts » (stories done) **sans** satisfaction terrain sur l’objectif ressenti.

**Précision PO (v2)** : l’équivalence visuelle / workflow / raccourcis ne signifie **pas** contourner Peintre (pas d’« iframe legacy » ni de second frontend parallèle comme stratégie par défaut). Elle signifie **traduire** le legacy en **langage Peintre** : manifests **CREOS**, **PageManifest** / **NavigationManifest**, **widgets** enregistrés et **slots**, layout et tokens conformes **ADR P1** (`references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md`), données et transitions **servies par l’API** / OpenAPI — la hiérarchie de vérité existante **reste**. Le travail supplémentaire porte sur **composition, props, textes, ordre, états UI et clavier**, jusqu’à satisfaction de la DoD produit, **dans** ce cadre.

**Corpus déjà disponible** (ne pas réinventer ; citer dans les stories et revues) :

- Index matière Peintre : `references/peintre/index.md` (ADR P1/P2, instructions Cursor, pipeline, fondations).
- Contrats et runtime caisse : `peintre-nano/docs/03-contrats-creos-et-donnees.md` ; manifests `contracts/creos/manifests/`.
- Matrice de parité : `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`.

---

## 2. Analyse d’impact

### 2.1 Epics et stories

| Zone | Impact |
|------|--------|
| **Epic 11** (parité UI legacy critique) | Intitulés et AC orientés **observable / alignement contractuel** — à **réinterpréter** ou **compléter** si la nouvelle règle produit est « équivalence stricte ». |
| **Epic 13** (caisse au-delà du kiosque) | Même logique ; stories **13.x** et **RCN-01** (13.4) **closes** sur une définition de succès **différente** de « clone utilisateur ». |
| **Découpe RCN-02 … RCN-06** | Tronçons **séquentiels** ; sans **changement de définition de done** en amont, ils **reproduiront** le même décalage. |
| **`guide-pilotage-v2.md`** | À aligner sur une **jalon / règle** explicite pour la caisse (voir §3). |

### 2.2 Artefacts techniques (tension à trancher)

- **ADR P1** (Mantine, tokens, CSS Modules) vs **legacy** (autre stack / composants) : l’équivalence se fait par **portage présentationnel** dans la stack Peintre (tokens, spacing, composition Mantine **dans** les widgets / layouts autorisés), pas par duplication d’une stack React legacy parallèle.
- **CREOS / manifests / widgets** : toute surface caisse reste **déclarée** (manifests, `widget_props`, registre). Le manifeste et les widgets portent la **fidélité utilisateur** (structure, libellés, ordre, états, focus / raccourcis **déclarés** dans le modèle Peintre) ; les **données** et règles métier viennent **uniquement** de l’**API** / contrats — le front ne devient pas source de vérité métier (aligné checklist `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`).

### 2.3 Process BMAD

- Les **create-story** / **Story Runner** suivent les **AC écrites**. Si l’AC ne dit pas « **indiscernable du legacy sur la liste L** (ou équivalence fonctionnelle + visuelle certifiée) », les agents **ne peuvent pas** deviner l’intention « clone total ».

---

## 3. Recommandation (chemin retenu)

**Approche recommandée :** **Direct Adjustment** au niveau **produit + pilotage**, avec portée **Majeure** sur la **définition de la caisse dans Peintre** (pas forcément rollback de code déjà utile).

1. **Adopter une définition unique et normative** (une seule phrase faisant foi dans `guide-pilotage-v2.md` + renvoi dans `epics.md` section caisse / parité) :

   > **Pour le périmètre caisse dans Peintre, la Definition of Done produit est l’équivalence utilisateur avec le legacy 1.4.4 sur les écrans et parcours listés dans la matrice de référence : disposition, libellés, enchaînements, états vides/chargement/erreur, raccourcis et CTA — le tout rendu via manifests CREOS, widgets et slots Peintre, données issues de l’API, sans contournement du modèle contractuel — sauf dérogation écrite signée PO (une ligne matrice = une dérogation max). Aucune story caisse ne peut être « done » avec uniquement des écarts « documentés » sans cette dérogation.**

2. **Mettre à jour la matrice** (`references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`) : ajouter la colonne normative **`Equiv. utilisateur / derogation PO`** (nom exact du tableau), placée **entre** `Story / lien` et `Ecarts / decisions`. Contenu autorisé par cellule : `OK`, `Derogation PO (<ref>)`, ou `Hors scope (<ref>)` ; **au plus une dérogation PO par ligne pilote** ; pas de passage à `Valide` sans `OK` ou dérogation explicite dans cette colonne (règles d’usage §5–6 du fichier matrice).

3. **Gates** : pour toute story **Epic 11 / Epic 13** (parité caisse) ou toute PR touchant une ligne `ui-pilote-03*` caisse : **preuve de non-régression visuelle / structurelle** — outil **MCP Cursor `user-chrome-devtools`** (snapshots a11y legacy `localhost:4445` vs Peintre `localhost:4444`, mêmes intentions) ; **à chaque PR** concernée ; optionnel **nightly** sur `main` si la CI peut invoquer le même MCP (sinon preuve manuelle documentée dans la matrice / story).

4. **Backlog** : nouvelle story (ou mini-epic) **« Caisse — certification équivalence legacy »** qui **re-passe** les écrans déjà « done » sous la **nouvelle** DoD (travail réel attendu : rapprochement UI + raccourcis + ordre d’interaction), **sans** nier le travail contractuel déjà fait (il devient **socle**, pas **fin**).

**Non recommandé sans arbitrage** : rollback massif du code Peintre — coût élevé, faible valeur si la cible est d’**ajuster** vers l’équivalence.

---

## 4. Propositions de modification détaillées (artefacts)

**Ordre d’application recommandé** : **4.1** `guide-pilotage-v2.md` → **4.2** matrice (colonne + règles) → **4.3** `epics.md` → **4.4** `sprint-status.yaml`. La matrice et `epics.md` peuvent être traités en parallèle si deux personnes ; sinon suivre cet ordre.

### 4.1 `guide-pilotage-v2.md`

- **Réalisé (2026-04-12)** : sous-paragraphe **« Règle caisse Peintre vs legacy (2026-04-12) »** (puce courte + lien vers ce proposal + gate MCP **`user-chrome-devtools`** à chaque PR caisse parité, nightly optionnel) ; entrée **Liens rapides** vers ce fichier.

### 4.2 `epics.md`

- **Réalisé (2026-04-12)** : notes agents **Epic 11** et **Epic 13** — DoD équivalence + renvoi guide / proposal (voir diff).

### 4.2bis Matrice `2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`

- **Réalisé (2026-04-12)** : colonne **`Equiv. utilisateur / derogation PO`** + règles d’usage **5 à 7** (voir fichier matrice).

### 4.3 Stories futures (RCN-02+, nouvelles stories de recertification)

- **AC type** : pour chaque tronçon, *« à l’issue du dev, comparaison structurée legacy/Peintre sur la checklist annexée ; zéro écart non classé (OK / dérogation PO / hors scope explicite) »* ; **et** *« chaque bloc visible est tracé vers manifeste CREOS + widget (ou gap explicite) ; aucune logique métier caisse dupliquée hors API »*.

### 4.4 `sprint-status.yaml`

- Après **approbation** de cette proposition : créer les clés de story **nouvelles** (ex. `13-5-…` ou epic dédié selon choix PO) ; **ne pas** effacer l’historique `done` sans **correct course** documenté (ce fichier sert de trace).

---

## 5. Remise à l’implémentation (handoff)

| Élément | Valeur |
|---------|--------|
| **Classification** | **Majeure** (changement de définition de succès produit + gates + matrice + epics/guide). |
| **Destinataires** | **PO (Strophe)** validation finale du texte normatif ; **SM / create-story** pour découper les stories de recertification ; **Architecte** pour trancher tensions ADR P1 vs fidélité visuelle ; **Dev** pour exécution. |
| **Critère de succès** | Les prochaines stories caisse **ne ferment** qu’avec équivalence **ou** dérogation **une ligne = une décision** ; ton ressenti « même site » devient **testable** et **traçable**. |

---

## 6. Approbation

- **Statut du document** : **approuvé en direction** par Strophe (lecture initiale) ; **v3** = corrections **QA** matérialisées sur guide, matrice, epics, et ce fichier (§3–§4).
- **Suite** : **4.4** `sprint-status.yaml` — créer les clés story de **recertification** quand le PO lance le découpage (ex. `13-5-…`) ; pas d’effacement d’historique `done` sans nouveau correct course.

---

## 7. Réponse aux questions « prêt à coller »

- **Où ?** Pas « n’importe où » : dans les **fichiers de pilotage** qui font foi (`guide-pilotage-v2.md`, `epics.md`, matrice), **après** accord sur ce **Sprint Change Proposal** (ou sa version révisée).  
- **Pourquoi ?** Pour que **create-story / Story Runner / dev** aient une **AC vérifiable** alignée sur ton objectif.  
- **Comment ?** Ce fichier **est** le correct course formalisé (étape livrable du workflow) ; la suite = **approbation** puis **édits** des artefacts listés au §4.

---

*Correct Course workflow — génération proposition ; checklist interactive complète optionnelle en session SM si besoin.*
