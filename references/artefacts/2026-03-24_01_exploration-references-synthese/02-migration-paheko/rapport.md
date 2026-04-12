# Migration Paheko / PaEco et Recyclique

## Decisions prises

**Reunion terrain (5 dec. 2025, documente le 6 dec.)** — `references/migration-paheko/2025-12-05_compte-rendu-reunion-recyclique.md`

- **Tarification caisse** : prix a **0 par defaut**, montant global negocie en fin de transaction (option parametrable).
- **Categories** : renommage **Electromenager vers EEE** ; sous-categories normees (PAM, Ecrans, Gros hors froid, Gros froid) ; categorie **jardin thermique** ; sous-categorie **Cycles** (velos).
- **Eco-organismes** : vocabulaire **filieres normees** versus « eco-organismes » ; **separation** gestion interne des categories / declarations ; mapping automatique ; granularite = minimum requis par filiere.
- **Paheko** : **vision partagee** backend futur ; **report** de la discussion approfondie apres **2–3 mois** de routine comptable manuelle (automatisation pas immediate).
- Autres : cheques comptabilises a l'encaissement ; adhesion volontaire (RGPD) ; Perplexity Pro pour veille legale/compta.

**TODO post-reunion (6 dec. 2025)** — `references/migration-paheko/2025-12-05_todo-christophe-recyclique-paheko.md`

- Integration Paheko : fil Discord / collecte **correspondances Recyclic vers Paheko** ; reunion Paheko **apres** routine stabilisee ; connexion auto et push en **long terme**.

**Cartographie integration core (24–25 fev. 2026)** — `references/artefacts/2026-02-24_09_cartographie-integration-paheko-core.md`

- **Version Paheko cible v0.1.0** : **1.3.19.x** (alignee analyse brownfield) ; **un seul Compose monorepo** (Recyclic + Paheko + Postgres/Redis).
- Auth/users : **2e passe** (SSO ou lien Recyclic–Paheko) ; agenda traite a part (extension Agenda = individuel).

**Decisions confrontation push / resilience (25 fev. 2026)** — `references/artefacts/2026-02-25_07_decisions-push-redis-source-eee.md`, grille `2026-02-25_05`, session `2026-02-25_08`

- **Push caisse** : **par ticket** au fil de l'eau ; **cloture** = controle totaux + `syncAccounting` cote Paheko.
- **File d'attente** : **Redis Streams** (retry si Paheko indisponible).
- **EEE / decla** : **RecyClique** = liste open data, mapping boutique vers officiel, **module decla** dans RecyClique.
- **Reception / poids** : tout le flux reception dans RecyClique comme en 1.4.4 ; **pas de sync manuelle** vers Paheko.
- **Interfaces compta** : objectif **workflows compta dans RecyClique** ; Paheko = backend ; idealement plus d'admin Paheko au quotidien.

**Session confrontation detaillee (25 fev. 2026)** — `references/artefacts/2026-02-25_08_session-confrontation-recyclic-paheko.md`

- **Montants** : alignement **centimes** RecyClique vers Paheko (a valider si BDD Recyclic en unites vers conversion a l'ecriture plugin).
- **Categories caisse Paheko** : le **plugin recyclique cree ou matche a la volee** (libelle/code).
- **Source de verite poids** : **RecyClique** ; module Saisie au poids Paheko **conserve** ; copie optionnelle dans `module_data_saisie_poids` apres push ; pas de sync bidirectionnelle ; reevaluation possible en v0.5 (eco-organismes).
- **Donnees declaratives** : produites et conservees par **RecyClique** ; copie minimale Paheko possible, non obligatoire.
- **Auth** : **v0.1** auth separee (API Paheko + JWT FastAPI terrain) ; **v0.2** SSO a documenter.
- **Securite push** : **secret partage** + HTTPS ; bonnes pratiques secrets (env / secrets manager).

**Matrice correspondance (25 fev. 2026)** — `references/migration-paheko/audits/matrice-correspondance-caisse-poids.md`

- **1 session caisse RecyClique = 1 session Paheko** ; ouverture/cloture alignees ; conversion **kg vers g** au push si besoin (Paheko caisse souvent en g).

**Point global avant PRD (25 fev. 2026)** — `references/artefacts/2026-02-25_06_point-global-avant-prd.md`

- Backend dual FastAPI + Paheko ; modules (TOML, EventBus Redis Streams) ; versioning v0.1 vers v1.0 dans `references/versioning.md`.

**Guides historiques (nov. 2025)** — `2025-11_v1.3.17_recyclique-guide-complet.md`, `2025-11_paheko-recyclique-integration-first-search.md`

- decrivent stack PWA + FastAPI + Paheko + Postgres + Redis, extensions critiques (Caisse, Saisie au poids, etc.) ; **version Paheko des guides = 1.3.17**, **supplantee** pour la cible technique par **1.3.19.x** (artefact 09).

**Paheko (ref. technique)** — `references/paheko/README.md`, `analyse-brownfield-paheko.md`

- Archive **1.3.19** ; plugins/modules, API `/api`, credentials ; interet **plugin dedie** Recyclique pour routes et ecritures cote Paheko.

## Options encore ouvertes / questions

- **Perimetre exact du module correspondance** : champs et regles de mapping apres dumps BDD Recyclic + Paheko, instance dev, analyste.
- **Politique fichiers** : frontiere RecyClique vers Paheko, scan factures, upload vers chantier fichiers (artefact 02 / grille axe 8).
- **Strategie LLM/IA** : reportee apres brief ; v0.1 = placeholders.
- **Homogeneisation unites / schema BDD Recyclic** : centimes versus `double precision` ; poids caisse RecyClique versus **g** cote Paheko.
- **Emplacements / multi-POS** : mapping `register_id` / `site_id` vers `plugin_pos_locations`.
- **Ardoise / porte-monnaie Paheko** : absents 1.4.4 vers ignorer v0.1 ou implementer plus tard.
- **Reunion dec. 2025** : tarification « politique » hors consensus technique ; **Elo Asso vs Paheko** pour membres ; API Elo Asso ; timing reunion Paheko « quand routine OK ».
- **CI/CD, scripts deploiement** : « a decider plus tard » (cartographie 09).

## Pacing et phasage documentes (terrain + archi — pas la meme chose que `todo.md`)

> Ce bloc decrit ce qui est **ecrit dans les docs** (calendrier volontairement progressif). Ce n'est **pas** le mot « todo » de la requete utilisateur : les **TODO** actionnables sont dans `references/todo.md`, le Kanban, et `2025-12-05_todo-christophe-recyclique-paheko.md` (section plus haut).

- **Routine comptable manuelle 2–3 mois avant** automatisation / reunion Paheko approfondie (CR reunion dec. 2025 + note TODO Christophe + thread « saturation cognitive »).
- **Priorisation** : pas tout en parallele ; automation (bot Discord, etc.) **apres** routine.
- **Roadmap versions** : socle Docker + stub API (v0.1) vers slice caisse (v0.2) vers reception (v0.3) vers auth (v0.4) vers eco-organismes (v0.5) (versioning cite dans point global).
- **Hebergement matiere dans Paheko** : option **A** (RecyClique seul) ou **B** (copie optionnelle `module_data_saisie_poids`) selon besoin metier.
- **Offline** : buffer cote RecyClique, push a la reconnexion + Redis (grille axe 5).
- **SSO** explicitement **v0.2** ; agenda / fichiers **placeholders v0.1**.

## Fichiers sources cites (chemins)

- `references/migration-paheko/index.md`
- `references/migration-paheko/2025-12-05_compte-rendu-reunion-recyclique.md`
- `references/migration-paheko/2025-12-05_todo-christophe-recyclique-paheko.md`
- `references/migration-paheko/2025-11_paheko-recyclique-integration-first-search.md`
- `references/migration-paheko/2025-11_v1.3.17_recyclique-guide-complet.md`
- `references/migration-paheko/audits/index.md`
- `references/migration-paheko/audits/matrice-correspondance-caisse-poids.md`
- `references/paheko/index.md`, `README.md`, `analyse-brownfield-paheko.md`, `liste-endpoints-api-paheko.md`
- `references/artefacts/index.md` et artefacts 09, 05, 07, 08, 06 (fev. 2026)
- `references/dumps/schema-paheko-dev.md` (mention matrice)

## Suite recommandee pour une 2e passe

1. Instance Paheko dev (Docker) + BDD Recyclic + Paheko montees localement ; croiser `schema-*-dev.md` et la matrice pour figer le **module correspondance**.
2. Valider centimes / unites poids sur schema reel Recyclic 1.4.4 importe et ecrire la **sequence PRD** : ouverture session vers push ticket vers cloture vers `syncAccounting`.
3. Brief puis PRD : integrer decisions 05/07/08 ; traiter **chantier fichiers** et **SSO v0.2** en pistes separees ; mettre a jour la **grille 05** a chaque validation instance.
4. **Realigner guides 1.3.17** avec la cible **1.3.19.x** (note explicite « historique vs cible »).
5. Cote terrain : verifier l'etat des actions dec. 2025 et **planifier** la reunion Paheko si la fenetre « routine stabilisee » est atteinte.

## Meta

Rapport produit par sous-agent explore (2026-03-24) ; fichier materialise par l'orchestrateur.
