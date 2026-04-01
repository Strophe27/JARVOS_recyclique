# Starter Template Evaluation

## Primary Technology Domain

Application web full-stack brownfield, avec backend metier et API separes du frontend, et un futur moteur UI compose interne (`Peintre_nano`) a integrer progressivement sans refonte from scratch du produit.

La stack existante observee dans `recyclique-1.4.4` est :
- frontend : `React` + `Vite` + `react-router-dom` + `Mantine` + `Zustand` ;
- backend : `FastAPI` + `SQLAlchemy` + `Alembic` + `Redis` ;
- orchestration Docker separee `api` / `frontend`, ce qui reste compatible avec la cible `Recyclique` / `Peintre_nano`.

Lecture revisee apres approfondissement :
- le **backend** reste un brownfield de reference, mais avec refontes selectives possibles sur flux, contrats, donnees et sync ;
- le **frontend v2 `Peintre_nano`** ne doit pas reutiliser le frontend existant comme fondation architecturale ;
- le frontend existant devient surtout une **matiere de migration** pour recopier les ecrans, workflows et comportements metier a preserver ;
- la cible `Peintre_nano` impose un substrat nativement compatible avec `CSS Grid`, templates de page, slots, widgets, flows declaratifs, et futures capacites d'edition graphique / resize / adaptation dynamique.

## Starter Options Considered

**Option A - Conserver le frontend actuel comme fondation principale et le refactorer progressivement**

Avantages :
- forte reutilisation apparente ;
- confort court terme ;
- migration ecran par ecran possible sans rupture immediate.

Limites :
- le frontend actuel n'a pas ete concu comme moteur de composition ;
- risque d'empiler `Peintre_nano` comme une couche supplementaire sur une SPA metier existante ;
- compatibilite structurelle faible avec `CSS Grid` comme moteur global, templates semantiques, zone roles, variants et futur editeur de flows/layout ;
- forte probabilite de dette cachee et de compromis durables.

Verdict :
- utile comme reference de migration ;
- mauvais socle architectural pour la v2 composee.

**Option B - Refaire tout le produit frontend + backend from scratch**

Avantages :
- coherence maximale du socle ;
- grande liberte de redecoupe ;
- architecture neuve potentiellement tres propre.

Limites :
- contredit la ligne directrice brownfield ;
- jette une partie de la valeur metier, des habitudes terrain, des contrats implicites et de l'historique utile ;
- risque delivery trop eleve pour la v2.

Verdict :
- trop risquee pour ce projet.

**Option C - Backend brownfield avec refontes selectives pilotees par contrats + frontend `Peintre_nano` greenfield + migration progressive des ecrans**

Avantages :
- respecte la valeur metier, les flux critiques et les acquis backend ;
- permet de repartir proprement a zero pour le frontend v2 `Peintre_nano` ;
- aligne naturellement la fondation frontend avec `Peintre_nano`, `CREOS`, `CSS Grid`, templates, flows et evolution future vers edition graphique et adaptation dynamique ;
- traite l'ancien frontend comme reference de migration plutot que comme contrainte structurelle ;
- permet de migrer les ecrans seulement quand leurs contrats backend sont suffisamment stabilises.

Limites :
- demande une strategie explicite de migration ;
- impose de poser tres tot une couche contractuelle fiable entre backend et frontend ;
- interdit de compter sur l'ancien frontend comme fondation v2, sauf pour la continuite terrain a court terme.

Verdict :
- meilleur compromis entre vision cible et prudence brownfield.

## Comparative Analysis Matrix

| Option | Description | Alignement vision Peintre | Risque delivery v2 | Reutilisation existant | Compatibilite future edition / resize / dynamique | Verdict |
|--------|-------------|---------------------------|--------------------|------------------------|-----------------------------------------------|---------|
| A | Frontend existant comme fondation principale | Faible | Moyen en apparence, eleve en vrai | Elevee | Faible | Mauvais choix structurel |
| B | From scratch complet frontend + backend | Moyen | Tres eleve | Faible | Elevee | Trop risque |
| C | Backend brownfield pilote par contrats + `Peintre_nano` greenfield + migration progressive | Tres fort | Maitrisable | Bonne cote metier, sans package moteur separe | Tres forte | Meilleur choix |

## Selected Starter: Brownfield baseline + targeted frontend scaffold for `Peintre_nano`

**Rationale for Selection:**

Le bon choix n'est pas un starter externe de projet complet, mais :
- conserver le produit et le backend existants comme base brownfield ;
- autoriser des refontes selectives backend sur les flux, modeles et sync, tant qu'elles restent pilotees par une surface contractuelle stable ;
- creer un nouveau frontend v2 dans le depot, structure autour de `Peintre_nano` ;
- utiliser le frontend historique uniquement comme reference de migration des ecrans et comportements ;
- poser des le depart un socle compatible avec la suite : `CSS Grid`, templates, slots, widgets, flows simples, separation layout global / layout interne, et ouverture future vers variants, `container queries`, `subgrid`, editeur graphique et IA.

Le frontend v2 ne doit donc pas dependre directement des details internes de base de donnees ou de services instables. Il doit dependre d'une couche de contrats suffisamment claire :
- endpoints cibles ;
- DTOs / schemas de reponse ;
- contextes de rendu et permissions ;
- auth/session et regles de revalidation ;
- erreurs metier ;
- etats de sync utiles a l'UI ;
- pagination, filtres et recherche quand ils sont requis par le domaine ;
- idempotence et contraintes des actions sensibles ;
- uploads, exports et traitements asynchrones quand ils existent ;
- contrats `CREOS`.

La migration progressive des ecrans ne commence qu'apres pose de cette couche contractuelle minimale. Un domaine peut etre considere comme **suffisamment stable** pour migration lorsque :
- ses DTOs et erreurs sont explicitement nommes et coherents ;
- ses contextes et permissions utiles au rendu sont fixes a un niveau exploitable ;
- ses breaking changes sont rendus visibles et maitrisables ;
- le frontend peut generer ou consommer ses types et schemas sans dependre des details internes du backend.

Cela evite de reparer ou remodeler le frontend brownfield juste pour devoir le refaire ensuite.

**Initialization Command:**

```bash
npm create vite@latest peintre-nano -- --template react-ts
```

Commande a adapter a la structure cible du depot, idealement dans le dossier dedie `peintre-nano/` plutot qu'en nouveau projet autonome a la racine.
Ce bootstrap ne suffit pas a lui seul : la phase de scaffold doit aussi fixer explicitement l'alignement ou la divergence vis-a-vis des briques frontend existantes (`Mantine`, `Zustand`).

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
- `TypeScript` + `React` pour le nouveau frontend v2 `Peintre_nano` ;
- conservation du backend `FastAPI` comme socle serveur/metier de reference.

**Styling Solution:**
- le starter ne decide pas la peau CSS finale ;
- la decision structurante est deja prise ailleurs : `CSS Grid` comme moteur de layout global de `Peintre_nano` ;
- le choix Tailwind / CSS Modules / autre reste une decision d'implementation, pas d'architecture.
- pour la phase de migration, une decision explicite doit etre prise avant reproduction massive des ecrans : soit reutiliser provisoirement `Mantine` comme kit de widgets/adaptation, soit definir un autre kit UI cible avec regles claires de transition.

**Build Tooling:**
- `Vite` reste le meilleur scaffold cible pour un frontend interne moderne ;
- tres bon alignement avec l'existant et faible friction pour un workspace `Peintre_nano`.

**Testing Framework:**
- le starter n'est pas suffisant a lui seul ;
- la cible doit rester coherente avec l'outillage deja present : `Vitest`, `Playwright`, tests backend Python, et futur pipeline de validation des contrats.

**Code Organization:**
- le nouveau frontend v2 doit vivre dans `peintre-nano/`, distinct du frontend brownfield ;
- les composants et ecrans historiques deviennent une source de migration, pas la fondation du runtime v2.
- l'usage de `Zustand` dans `Peintre_nano` ne doit pas etre presume par heritage : il doit etre soit repris explicitement pour certains besoins de runtime, soit remplace par une autre approche documentee.

**Development Experience:**
- demarrage rapide ;
- faible friction d'integration ;
- bonne compatibilite avec un frontend compose minimal en React/TypeScript ;
- meilleur compromis pour lancer `Peintre_nano` sans regenerer le produit complet.

## Decision Refinement

La decision de socle frontend/backend retenue est :
- `Recyclique` backend/API/donnees : **brownfield avec refontes selectives pilotees par contrats** ;
- `Peintre_nano` frontend v2 : **greenfield** ;
- frontend historique : **reference de migration** ;
- migration des ecrans : **progressive et post-contracts**, pas immediate.

## Transition Runtime and Coexistence

Pendant la transition, une coexistence temporaire des deux fronts peut etre necessaire, mais elle doit rester :
- explicite ;
- limitee dans le temps ;
- pilotee par routes, domaines ou feature flags clairement identifies.

Regles de transition :
- l'ancien frontend ne doit plus recevoir de nouveaux investissements structurants ;
- il ne sert qu'a la continuite terrain des zones non encore migrees ;
- `Peintre_nano` porte uniquement les routes ou domaines deja branches ;
- la logique metier critique doit converger vers les contrats backend, pas vers deux implementations UI rivales ;
- un domaine sort du frontend historique lorsqu'il est disponible dans `Peintre_nano` avec contrats stables, contexte correct et couverture de validation suffisante.

## Note

La bonne lecture implementation n'est pas "creer une nouvelle application complete", mais plutot :
- **Story 0 / scaffold** : creer ou structurer `peintre-nano/` comme frontend v2 a partir du socle `Vite` cible ;
- **stories suivantes** : etablir la couche contractuelle minimale des flows prioritaires ;
- prouver `Peintre_nano` sur un premier cas simple (`bandeau live`) ;
- puis migrer les premiers ecrans metier seulement quand leurs contrats backend sont suffisamment stables.

## Handoff to Step 4

Pour l'etape suivante, les decisions deja acquises sont :
- backend brownfield pilote par contrats ;
- `Peintre_nano` frontend v2 greenfield ;
- `Peintre_nano` comme socle UI integral de la v2 ;
- `CREOS` minimal documentaire ;
- `CSS Grid` comme moteur de layout global.

Restent a trancher plus finement dans les decisions architecturales :
- la strategie concrete de contrats `OpenAPI` / `CREOS` ;
- les regles de coexistence runtime et de sortie de l'ancien frontend ;
- la gouvernance de versionnement et des breaking changes ;
- les premiers domaines a verrouiller pour migration et preuve de chaine.
