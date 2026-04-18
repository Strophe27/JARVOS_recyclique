# Project Context Analysis

## Requirements Overview

**Functional Requirements:**

Le perimetre fonctionnel confirme pour `JARVOS_recyclique` v2 est celui d'une evolution brownfield de `recyclique-1.4.4`, sans refonte from scratch. Les capacites coeur a supporter des la v2 sont :
- `cashflow` comme preuve terrain critique ;
- `reception flow` comme preuve terrain critique ;
- `synchronisation Paheko` avec reprise et reconciliation ;
- `bandeau live` comme preuve modulaire legere mais complete ;
- `declaration eco-organismes` comme premier grand module metier ;
- `adherents / vie associative minimale` comme preuve metier complementaire ;
- `integration HelloAsso` dans un perimetre minimum maintenable ;
- `config admin simple` pour piloter activation, ordre et variantes simples de blocs/modules.

Nuance structurante deja visible dans les sources :
- brownfield = noyau metier, API, donnees, continuites terrain et historique ;
- le frontend v2 `Peintre_nano` = greenfield controle, sans que cela transforme la v2 en refonte produit complete.

Ordre de preuve et de structuration deja visible dans les sources actives, **apres** les prerequis structurants du PRD (audit backend/API/donnees, retro-engineering `Paheko`, spec multi-contextes, contrat socle sync, gouvernance `CREOS`, runtime `Peintre_nano` minimal) :
- la chaine modulaire doit d'abord etre prouvee en petit via `bandeau live` ;
- les flows `cashflow` et `reception flow` servent ensuite de preuves terrain critiques ;
- `declaration eco-organismes` valide le socle sur un vrai grand module metier ;
- `adherents / vie associative minimale` apporte une preuve metier complementaire ;
- les epics et stories ne sont pas encore detailles ici, l'architecture doit donc preparer ce decoupage sans le presupposer.

Architecturalement, ces exigences impliquent une chaine complete et coherente :
- contrats backend cote `Recyclique` ;
- contrats UI declaratifs via `CREOS` ;
- runtime de composition cote `Peintre_nano` ;
- adaptation de rendu via le canal web ;
- calcul des permissions et des contextes cote `Recyclique` ;
- application au rendu cote `Peintre_nano` ;
- revalidation serveur pour les actions sensibles ;
- fallbacks, blocages et journalisation sur toute la chaine.

**Non-Functional Requirements:**

Les exigences non fonctionnelles dominantes sont structurantes et non optionnelles :
- fiabilite terrain sur les parcours critiques ;
- justesse comptable avec `Paheko` comme autorite finale du flux financier ;
- resilience par enregistrement local dans `Recyclique`, retry et sync reportable ;
- zero fuite de contexte entre `site`, `caisse`, `session`, `poste`, `role`, `groupe` et operateur ;
- securite avec revalidation cote backend, PIN pour actions sensibles et journalisation exploitable ;
- explicabilite des erreurs, blocages, fallbacks et quarantaines ;
- historicisation, rejeu et analyse future des donnees ;
- performance minimale compatible terrain : fluidite clavier du `cashflow` et absence de penalite visible apportee par le frontend compose `Peintre_nano` ;
- donnees exploitables au grain des totaux et des operations detaillees ;
- installabilite reproductible en environnement officiel `Debian` ;
- ouverture open source sans dependance proprietaire au fonctionnement de base.

Le projet doit en outre articuler explicitement deux flux distincts :
- flux financier : `Paheko` = verite comptable finale ; `Recyclique` = terrain + zone tampon + synchronisation ;
- flux matiere : `Recyclique` = verite principale.

Ces NFRs orientent directement l'architecture vers un modele fortement contractuel, tracable et defensif, avec separation claire des responsabilites entre metier, comptabilite, moteur UI et adaptation de canal, sans jamais confondre ces deux flux.

**Scale & Complexity:**

Le projet releve d'une complexite elevee car il combine :
- brownfield critique avec conservation de flows metier existants ;
- integration externe comptable structurante ;
- moteur UI compose integral pour toute la v2, mais avec un profil de capacites volontairement minimal au depart ;
- modularite reelle exigee de bout en bout ;
- contraintes multi-contextes et multi-sites ;
- gouvernance contractuelle `OpenAPI` / `CREOS` ;
- exigences d'audit, de reprise et de resilience.

- Domaine principal : application web full-stack brownfield avec backend metier, UI composee et integration comptable
- Niveau de complexite : eleve
- Frontieres architecturales deja visibles: noyau metier, auth/permissions, gestion de contexte, journal/audit, moteur sync, quarantaine/reconciliation, contrats API, manifests `CREOS`, runtime `Peintre_nano`, adaptateur React, config admin, modules metier prioritaires

## Technical Constraints & Dependencies

Decisions de cadrage deja verrouillees par les documents d'entree :
- posture brownfield stricte a partir de `recyclique-1.4.4` ;
- toute l'UI v2 doit passer par `Peintre_nano` ;
- `Recyclique` reste l'autorite metier, des permissions et des contextes ;
- `Paheko` reste l'autorite comptable officielle ;
- integration `Paheko` en priorite API-first ;
- plugin Paheko minimal autorise seulement si l'API officielle ne suffit pas ;
- SQL non autorise comme chemin transactionnel nominal ;
- `CREOS` doit rester minimal, documentaire, versionnable et validable, aligne sur la grammaire JARVOS avec transport documentaire en v2 ;
- `Peintre_nano` et `CREOS` demarrent avec un profil minimal initial : cadre applicatif (routage, habillage), slots, widgets, actions declaratives, raccourcis declaratifs, flows simples, fallbacks et journalisation ;
- packaging initial de `Peintre_nano` comme package/workspace interne, extraction future seulement si les contrats deviennent suffisamment stables ;
- parametres critiques et mappings sensibles reserves au niveau super-admin/expert avec forte tracabilite ;
- environnement officiel cible : `Debian`.

Contraintes de perimetre deja explicites :
- aucun livrable UX separe n'est charge ici ; les implications UI/UX proviennent du PRD et des documents `Peintre_nano` / `CREOS` ;
- `HelloAsso` est bien dans le perimetre v2, mais ne doit pas devenir une dependance bloquante pour l'installation minimale du coeur produit ;
- les capacites riches hors socle initial (edition conviviale de flows, personnalisation avancee, analytics riches, pilotage agentique) restent hors noyau v2.

Dependances structurantes encore a produire ou a verifier :
- audit backend/API/donnees ;
- retro-engineering `Paheko` sur donnees reelles ;
- specification multi-contextes/multi-caisses ;
- formalisation des schemas `CREOS` ;
- definition du contrat socle de sync et reconciliation ;
- pipeline de validation des contrats (`OpenAPI`, schemas `CREOS`, smoke tests de rendu) ;
- strategie de coexistence et de migration brownfield depuis `recyclique-1.4.4` ;
- cadrage des dependances externes et secrets d'integration pour `HelloAsso` et les futurs connecteurs ;
- **HelloAsso (maj. 2026-04-12) :** arbitrage et spec consolides sous `references/migration-paheko/` (`2026-04-12_specification-integration-helloasso-recyclique-paheko.md`, `2026-04-12_brouillon-arbitrage-helloasso-et-promesse-recyclique-paheko.md`) ; recherche Perplexity associee dans `references/recherche/` avec erratum sur les quotas API ; story **9.4** dans `epics.md` pour critere d'acceptation trace.

## Cross-Cutting Concerns Identified

Preoccupations transverses affectant plusieurs composants :
- isolation stricte des contextes ;
- calcul et propagation securisee des permissions ;
- strategie fallback / blocage / retry selon criticite ;
- auditabilite et correlation inter-systemes ;
- gouvernance des contrats `OpenAPI` / `CREOS` ;
- resilience de sync et gestion de quarantaine ;
- coherence des flows critiques entre backend, runtime UI et comptabilite ;
- preuve de la chaine modulaire complete via `bandeau live` avant extension a plus grande echelle ;
- migration brownfield sans casse des habitudes terrain essentielles ;
- modularite prouvee par une chaine complete, pas par simple decoupage visuel.
