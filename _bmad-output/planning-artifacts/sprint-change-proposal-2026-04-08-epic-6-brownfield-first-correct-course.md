# Sprint Change Proposal — Epic 6 brownfield-first

**Date :** 2026-04-08  
**Workflow :** Correct Course (`bmad-correct-course`)  
**Destinataire :** Strophe  
**Mode :** batch  
**Statut :** **Approuve et applique cote pilotage** ; conserve comme trace de decision pour la reapplique Epic 6 brownfield-first.

**En une phrase simple :** on **garde** les briques techniques deja construites, mais on **change** la facon de recomposer la caisse pour retrouver le parcours brownfield reel.

---

## 1. Resume du probleme

### Declencheur

La story **`6.10`** et son registre d'exploitabilite ont confirme une incoherence structurelle :

> la caisse v2 actuelle est techniquement riche, mais elle **ne correspond pas** au **workflow brownfield operatoire** attendu sur le terrain.

### Nature du probleme

- **Type principal :** approche implementation / UX inadaptée au besoin brownfield.
- **Formulation precise :** la v2 a reconstruit des **slices par page et par type d'action** (`/caisse`, `/caisse/remboursement`, `/caisse/don`, `/caisse/cloture`, etc.) autour de `FlowRenderer` et de manifests, alors que le brownfield organise la caisse comme un **parcours continu** :
  - dashboard poste de caisse ;
  - ouverture de session ;
  - vente kiosque continue ;
  - finalisation ;
  - cloture ;
  - gestionnaire / detail session admin.

### Preuves

- Code brownfield : `recyclique-1.4.4/frontend/src/App.jsx`, `recyclique-1.4.4/frontend/src/pages/CashRegister/Sale.tsx`, `recyclique-1.4.4/frontend/src/components/business/SaleWizard.tsx`
- Etat fonctionnel brownfield : `references/ancien-repo/fonctionnalites-actuelles.md`
- Corpus visuel : `_bmad-output/implementation-artifacts/screenshots/caisse/11-0__caisse-01-dashboard.png`, `11-0__caisse-02-ouverture-session.png`, `11-0__caisse-04-saisie-vente.png`, `11-0__caisse-05-fermeture-session-sans-transaction.png`, `11-0__caisse-06-detail-session-admin.png`, `_bmad-output/implementation-artifacts/screenshots/admin/governance/11-0__admin1-08-session-manager.png`
- V2 actuelle : `contracts/creos/manifests/navigation-transverse-served.json`, `contracts/creos/manifests/page-cashflow-*.json`, `peintre-nano/src/flows/FlowRenderer.tsx`, `peintre-nano/src/registry/register-cashflow-widgets.ts`
- Mapping produit par ce correct course : `references/artefacts/2026-04-08_05_mapping-brownfield-v2-caisse-epic6.md`

---

## 2. Analyse d'impact

### Impact epic

| Point | Impact |
|---|---|
| **Epic 6** | **Ne peut pas etre consideree fermee** dans sa forme actuelle. Les briques sont utiles, mais la baseline produit n'est pas la bonne. |
| **Story 6.10** | **Ne peut pas valider terrain** la caisse actuelle. Sa cible doit etre reformulee autour de la parite brownfield. |
| **Epic 8** | **Non rouverte**. Les frontieres restent valides : sync reelle, quarantaine, reconciliation finale et Paheko restent hors scope Epic 6. |
| **Epic 9** | **Non rouvert**. Les besoins adherents / modules complementaires restent bornes ; ils ne doivent pas etre absorbes par la correction Epic 6. |

### Impact artefacts

| Artefact | Impact |
|---|---|
| `epics.md` | l'intro Epic 6 et plusieurs stories 6.x doivent passer d'une logique "flows/pages slices" a une logique "workflow brownfield operatoire" ; c'est bien un **conflit d'alignement backlog/epic** a corriger |
| `guide-pilotage-v2.md` | ajouter un gate explicite de parite brownfield caisse avant validation terrain |
| `sprint-status.yaml` | geler la cloture d'Epic 6 ; sortir `6.10` de sa dynamique actuelle de fermeture |
| `6-1` a `6-10` | reclassification `keep` / `rewrite` ; rebaselining des AC et dev notes pour les stories concernees |
| `references/artefacts/2026-04-08_04_caisse-v2-exploitabilite-terrain-epic6.md` | a requalifier comme registre d'un etat intermediaire technique, pas comme preuve de validation terrain finale |

### Impact technique

- **A conserver** : backend, OpenAPI, permissions, step-up, tickets en attente, remboursement, encaissements speciaux, cloture locale, audit, defensive layer.
- **A changer** : la baseline UX/runtime et la facon de recomposer ces briques dans la caisse v2.
- **A ne pas faire maintenant** : recoder la nouvelle caisse ou rouvrir Epic 8 / 9.

---

## 3. Approche recommandee

### Option 1 — Ajustement direct mineur

**Verdict : non viable**

- effort : faible a moyen
- risque : eleve
- raison : cela continuerait a empiler des patches sur une baseline UX qui n'est pas la bonne

### Option 2 — Rollback massif

**Verdict : non viable**

- effort : eleve
- risque : eleve
- raison : les briques backend / contrats / tests deja produites ont de la valeur et doivent etre preservees

### Option 3 — Revue MVP / reduction de scope

**Verdict : non necessaire**

- le PRD reste valable
- le besoin n'est pas de reduire l'objectif, mais de **recentrer** la cible UX sur le brownfield reel

### Option retenue — Hybrid major rebaseline

**Approche retenue :** **correct course majeur brownfield-first**

1. **Preserver** les acquis backend et contractuels.
2. **Arreter** de traiter la caisse actuelle comme baseline UX acceptable.
3. **Rebaseliner Epic 6** autour du workflow brownfield continu.
4. **Requalifier `6.10`** comme validation finale d'une baseline comparable au legacy.

---

## 4. Propositions de changements concretes

### 4.1 Classification des stories 6.1 -> 6.10

| Story | Classement | Decision |
|---|---|---|
| `6.1` | `rewrite` | doit devenir la story de restitution brownfield du parcours continu : dashboard caisse -> ouverture -> vente -> finalisation |
| `6.2` | `keep` | garder l'intention et les acquis backend ; etendre la story au dashboard / ouverture reconstruits |
| `6.3` | `keep` | garder la capacite ticket en attente ; la rebrancher dans le poste de vente brownfield |
| `6.4` | `keep` | garder le remboursement sous controle ; conserver la capacite metier / API mais reajuster les AC pour le reconnecter au workflow caisse reel |
| `6.5` | `rewrite` | reintegrer les encaissements specifiques dans le poste caisse brownfield au lieu de pages separees |
| `6.6` | `rewrite` | meme logique pour les boutons / actions sociales dediees |
| `6.7` | `rewrite` | repositionner la cloture locale dans le continuum brownfield et retablir le lien vers supervision / session detail |
| `6.8` | `rewrite` | reancrer les corrections sensibles depuis le detail session / journal admin, pas depuis une page isolee |
| `6.9` | `keep` | conserver la couche defensive transverse ; la reappliquer a la baseline brownfield recomposee |
| `6.10` | `rewrite` | transformer la story en validation finale de parite brownfield + checklist terrain |

**Note de taxonomie :** aucune story n'est `superseded` dans cette proposition. Les capacites construites restent reutilisables ; c'est la baseline produit qui est corrigee.

### 4.2 Mises a jour proposees — `epics.md`

#### Epic 6 — intro

**Ancien sens a corriger :** la cible donne trop de poids a `FlowRenderer` / flows declaratifs comme forme visible du produit.

**Nouveau sens propose :**

> Epic 6 vise d'abord le **retour a un workflow caisse brownfield operatoire** dans `Peintre_nano` : dashboard caisse, ouverture de session, poste de vente continu, finalisation, cloture locale, supervision admin des sessions. Les manifests CREOS, `FlowRenderer` et les widgets sont des **mecanismes d'implementation**, pas la forme produit de reference.

#### Stories a retoucher dans `epics.md`

- `6.1` : remplacer l'objectif "parcours nominal via FlowRenderer" par "baseline brownfield continue"
- `6.5` et `6.6` : expliciter que ces variants vivent **dans** le poste caisse, pas comme fragmentation de pages
- `6.7` : ajouter explicitement le relais vers gestionnaire / detail session admin comme partie du workflow exploitable
- `6.8` : rattacher la correction sensible au **journal / detail session admin**
- `6.10` : reformuler la story comme **validation de parite brownfield** et non comme simple passe de coherence de la baseline actuelle

### 4.3 Mises a jour proposees — `guide-pilotage-v2.md`

Ajouter un point de controle explicite avant toute validation terrain Epic 6 :

> **Gate Epic 6 — Parite workflow brownfield caisse**  
> La caisse v2 restitue-t-elle un workflow operatoire comparable au legacy : dashboard poste, ouverture, vente continue, finalisation, cloture, supervision admin session ?

Ajouter aussi un rappel court :

- tant que ce gate est **non** franchi, **Epic 6 reste in-progress**
- `6.10` ne peut pas etre close / done
- le registre `references/artefacts/2026-04-08_04_caisse-v2-exploitabilite-terrain-epic6.md` doit etre lu comme **etat technique intermediaire**, pas comme validation terrain finale

### 4.4 Mises a jour proposees — `sprint-status.yaml`

**Avant approbation du correct course :**

- conserver `epic-6: in-progress`
- ajouter un commentaire explicite : `Epic 6 freeze de cloture en attente correct course brownfield-first`
- retirer toute lecture implicite "il ne reste qu'une validation finale"

**Apres approbation du correct course :**

- requalifier `6-10-valider-lexploitabilite-terrain-de-la-caisse-v2` en **`backlog`**
- ne pas marquer `6.10` `review` / `done` tant que la baseline brownfield recomposee n'est pas reappliquee
- conserver les stories `keep` comme acquis techniques documentes ; recreer / reecrire les stories `rewrite` avant reprise dev

### 4.5 Mises a jour proposees — fichiers `6-x`

| Fichier story | Action proposee |
|---|---|
| `6-1-*.md` | reecrire la story autour du continuum brownfield : dashboard + ouverture + vente + finalisation |
| `6-2-*.md` | conserver ; etendre les AC a l'entree dashboard et a l'ouverture |
| `6-3-*.md` | conserver ; rebrancher le held dans le poste caisse recompose |
| `6-4-*.md` | conserver ; expliciter le rattachement au flux caisse / historique reel |
| `6-5-*.md` | reecrire comme variante du poste caisse brownfield |
| `6-6-*.md` | reecrire comme variante du poste caisse brownfield |
| `6-7-*.md` | reecrire pour integrer cloture + relais session manager / detail |
| `6-8-*.md` | reecrire pour partir du detail session admin / journal des ventes |
| `6-9-*.md` | conserver ; mettre a jour les dev notes pour la nouvelle baseline brownfield |
| `6-10-*.md` | reecrire autour de la checklist de parite brownfield et du mapping brownfield -> v2 |

### 4.6 Ordre d'application recommande apres approbation

1. Mettre a jour `epics.md` pour figer la nouvelle cible Epic 6.
2. Mettre a jour `guide-pilotage-v2.md` pour ajouter le gate de parite brownfield.
3. Mettre a jour `sprint-status.yaml` pour geler la cloture Epic 6 et requalifier `6.10`.
4. Mettre a jour `references/artefacts/index.md` si de nouveaux artefacts de correct course sont ajoutes ou renommes.
5. Reecrire d'abord `6.1`, puis `6.7`, puis `6.8`, car ce sont les pivots structurels du nouveau parcours.
6. Reecrire ensuite `6.5`, `6.6` et `6.10`.
7. Mettre a jour les stories `keep` (`6.2`, `6.3`, `6.4`, `6.9`) pour les raccorder explicitement a la nouvelle baseline brownfield.
8. Seulement apres cela, relancer une vraie implementation Epic 6.

### 4.7 Bornes de perimetre

- **Epic 8 non rouvert** : pas de sync reelle, pas de quarantaine operationnelle complete, pas de reconciliation finale Paheko.
- **Epic 9 non rouvert** : pas de module adherents, pas de logique vie associative large, pas de modules complementaires hors caisse.
- **Decision explicite sur les variantes** : reel / virtuel / differe restent **dans le scope Epic 6** car elles font partie du workflow brownfield d'entree.
- **Rappel 6.5 / Epic 9** : l'adhesion reste un **flux caisse borne**, pas un deplacement du module adherents dans Epic 6.

---

## 5. Handoff implementation

| Champ | Valeur |
|---|---|
| **Classification** | **Major** |
| **Roles concernes** | PM / Architecte / Scrum Master d'abord ; Dev ensuite |
| **Responsabilite immediate** | approuver le correct course, rebaseliner les stories, geler la fermeture Epic 6 |
| **Responsabilite dev ulterieure** | reappliquer les stories `rewrite` sur une baseline brownfield-first, sans perdre les acquis backend |

### Criteres de succes

1. Un mapping brownfield -> v2 versionne existe et fait foi.
2. Une checklist de parite brownfield reutilisable existe.
3. Chaque story `6.1` a `6.10` a une decision explicite `keep` ou `rewrite` ; aucune `superseded` dans cette proposition.
4. `6.10` est reformulee comme validation finale de la baseline brownfield recomposee.
5. Epic 6 est explicitement **non fermee** tant que cette reapplique n'a pas ete faite.

### Communication simple

- **Ce qui reste vrai** : le travail backend / contrats / permissions / defensive layer deja fait garde sa valeur.
- **Ce qui change** : on ne valide pas la caisse actuelle comme baseline terrain.
- **Quand `6.10` redeviendra fermable** : quand une baseline brownfield-first aura ete reappliquee puis verifiee avec la checklist de parite.

### Roles et tempo recommandes

| Role | Action attendue juste apres approbation |
|---|---|
| PM / Architecte | valider le rebaseline Epic 6 et la nouvelle cible 6.10 |
| Scrum Master / pilotage | appliquer les mises a jour documentaires et resequencer le backlog |
| Dev | attendre la reecriture des stories `rewrite` avant de reprendre l'implementation |

---

## 6. Checklist Correct Course (synthese)

| Item BMAD | Statut | Note |
|---|---|---|
| 1.1 Declencheur identifie | Fait | `6.10` a revele l'ecart |
| 1.2 Probleme precise | Fait | baseline UX incorrecte |
| 1.3 Preuves rassemblees | Fait | code brownfield, captures, manifests, stories 6.x |
| 2.1 Epic actuel viable sans changement | Action-needed | non |
| 2.2 Changement epic requis | Fait | rebaseline brownfield-first |
| 2.3 Impact sur epics futurs | Fait | bornes Epic 8 / 9 preservees |
| 2.4 Nouvel epic requis | N/A | non |
| 2.5 Resequencement requis | Fait | oui, dans Epic 6 |
| 3.1 Conflit PRD / epic | Fait | PRD global non invalide, mais conflit d'alignement avec l'epic/backlog actuel |
| 3.2 Conflit architecture | Fait | oui, sur la forme produit cible |
| 3.3 Conflit UI/UX | Fait | oui, majeur |
| 3.4 Artefacts secondaires impactes | Fait | guide, sprint, stories, registre 6.10 |
| 4.4 Approche retenue | Fait | hybrid major rebaseline |
| 5.1 a 5.5 Proposition complete | Fait | mapping, classement, handoff, updates proposes |
| 6.3 Approbation utilisateur | Action-needed | en attente |
| 6.4 Mise a jour `sprint-status.yaml` | Action-needed | apres approbation |

---

## 7. Livrables produits par ce correct course

- `references/artefacts/2026-04-08_05_mapping-brownfield-v2-caisse-epic6.md`
- `references/artefacts/2026-04-08_06_checklist-parite-brownfield-caisse-epic6.md`
- `sprint-change-proposal-2026-04-08-epic-6-brownfield-first-correct-course.md`

---

## 8. Prochaine etape

**Decision prise :** correct course approuve ; reapplique cote pilotage.

Suite de reapplique :

1. appliquer les modifications documentaires sur `epics.md`, `guide-pilotage-v2.md` et `sprint-status.yaml`
2. reecrire les stories `rewrite`
3. rouvrir ensuite seulement la reprise d'implementation Epic 6 sur baseline brownfield-first

---

*Document genere selon la logique du workflow `bmad-correct-course` et borne a une proposition de changement exploitable avant reapplique.*
