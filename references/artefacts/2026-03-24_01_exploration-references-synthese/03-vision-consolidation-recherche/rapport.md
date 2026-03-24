# Vision, consolidation 1.4.5, recherche, ancien repo

## Vision projet et roadmap (points saillants)

- **`references/vision-projet/index.md`** — Point d'entree : vision « construction projet », RAG/nano-mini, matiere Brief/PRD ; rappelle que l'ecosysteme JARVOS reste canonique dans `references/ecosysteme/` (pas de doublons).
- **`2026-01_archive_systeme-rag-intelligent.md`** — Archive d'un gros dossier « RAG intelligent » (LEANN, agents, etc.) ; **depasse** : la direction retenue est JARVOS Nano/Mini avec leurs propres technos.
- **`2026-02-25_rag-recyclic-nano-mini.md`** — Recyclic expose **toute la base documentaire** (Paheko + services tiers type K-Drive, Nextcloud) a JARVOS Nano/Mini pour indexation/RAG ; perimetre unifie, design d'ingestion a preciser ; renvoie au chantier fichiers / politique documentaire (artefacts + idee Kanban).
- **`vision-module-decla-eco-organismes.md`** — Vision **module(s) declarations eco-organismes** : agnostique, **plusieurs** eco-organismes, **categories libres par boutique** + mapping vers referentiels officiels par organisme ; liste EEE open data hebergee dans RecyClique ; **distinction nette** avec le module unique Paheko « Saisie au poids » (Ecologic, conventions integrees). Suite : confrontation avec Paheko, module « correspondance » separe (traducteur vers API Paheko).
- **`matiere_presentation-plateforme-recyclic.md`** — Matiere brute presentation / financeurs (janv. 2025) : positionnement open source, terrain, conformite, modularite, hebergement Jarvos ou self-host ; fonctionnalites (caisse PWA, depots, vocal/IA, roles, audit) ; stack FastAPI/React/Postgres/Redis/Docker ; roadmap court terme ; **module eco-organismes** ; ouverture **integration Paheko** (compta, adherents) dans la **prochaine refonte**.

## Consolidation / assainissement 1.4.5

- **`references/consolidation-1.4.5/index.md`** — Referentiel durable pour audit brownfield et assainissement de **`recyclique-1.4.4/`** vers **1.4.5** ; rapports dates **2026-03-23** (backend + frontend) ; valider chiffres/chemins sur l'arbre source avant implementation.
- **`2026-03-23_synthese-audit-consolidation-1.4.5.md`** — Resume executif : backend avec persistance/transactions **imprevisibles** entre routes, services et depots, endpoints **monolithiques**, sante dupliquee ; donnees/schema **peu ancres** (Alembic, metadata, acces SQLAlchemy heterogenes, tests decales vs PostgreSQL) ; ops avec **doubles sources de verite** ; frontend Mantine + styled-components, **gros composants**, double couche API/services, **deux modeles d'auth** (`useAuth` / `useAuthStore`), React Query peu clarifie. **Priorites** : une verite schema+runtime, une verite deps/infra, frontieres transactions/HTTP, **un seul modele auth frontend**, unifier appels reseau/UX. **Lots proposes** : 1 config/Docker, 2 data/Alembic, 3 archi backend, 4 tests backend, 5 auth frontend, 6 coherence frontend.
- **`2026-03-23_prochaine-passe-assainissement-1.4.5.md`** — Apres vagues 1–4 deja faites : **`recyclique-1.4.4/`** est dans le git du depot courant. Prochaine passe : **A** ops residuel (CORS/FRONTEND_URL via Settings, get-version, Python local vs Docker), **B** integrite donnees (**FK `User.site_id`**), **C** isolation tests backend (pilote), **D** frontend auth/UX (401, manager/User, loading ProtectedRoute), **E** pilote archi backend.
- **`2026-03-23_backlog-assainissement-1.4.5.md`** — Backlog tabulaire (P0–P2) : unification Postgres/compose/Settings, deps canoniques, image prod sans dev deps, Alembic + exports modeles, authZ frontend, puis archi (transactions, HTTPException, decoupe endpoints), donnees, tests isolation, nombreux tickets FE.

## Recherche externe (Perplexity etc.) — themes Paheko / migration

- **`references/recherche/index.md`** — Liste des prompts/reponses 2026-02-24 : **API caisse Paheko**, **Saisie au poids**, **version stable Paheko**, **auth/SSO** avec app externe, **catalogue plugins/modules**, **frameworks modules Python** et **hooks**, complements sur **UI par module** et pattern proche de Paheko (slots React + `module.toml`).
- **`contexte-pour-recherche-externe.md`** — Cible **JARVOS Recyclique v0.1.0** : refonte 1.4.4, integration **Paheko**, solo dev, Docker par ressourcerie, Gunicorn multi-workers. **Dual-backend** : architecture **« max Paheko »** ; **module de correspondance** = traducteur vers API Paheko. Decisions : utilisateurs **Paheko natifs**, import 1.4.4 avec checklist secu, modules **TOML + ModuleBase**, **Redis Streams** pour evenements.
- **`2026-02-24_api-paheko-caisse_perplexity_reponse.md`** (extrait) — API officielle documentee : compta, membres, web, utilitaires ; **pas d'endpoints caisse documentes** ; donnees caisse en tables SQLite du plugin ; acces possible **`POST /api/sql` (SELECT seulement)** ou **`GET /api/download`** pour la base — implication forte pour le design du « module correspondance ».
- **`2026-02-24_auth-sso-paheko-app-externe_perplexity_reponse.md`** (extrait) — API Paheko : **HTTP Basic** pour l'appel machine ; **OIDC** : Paheko est **consommateur** IdP externe ; **pas** d'exposition OIDC par Paheko pour les apps tierces — a cadrer pour SSO Recyclic vers Paheko.

## Ancien repo — decisions ou contraintes brownfield

- **`references/ancien-repo/index.md`** — Doc **referentielle** pour migration vers **JARVOS Recyclique v0.1.0** (pas le dev continu 1.4.4) : garder metier/regles/UX/decisions ; **refondre** backend/auth/stack ; aligner le nouveau backend sur besoins **sans** recopier l'implementation 1.4.4 ; **checklist import** a chaque import de code.
- **`project-overview.md`**, **`architecture-brownfield.md`**, **`technology-stack.md`**, **`integration-architecture.md`**, **`checklist-import-1.4.4.md`** — Stack, ecarts (Traefik, bot desactive), contrats, checklist securite a chaque pioche.

## Liste de fichiers a relire en profondeur

1. `references/vision-projet/matiere_presentation-plateforme-recyclic.md` (roadmap complete).
2. `references/consolidation-1.4.5/2026-03-23_journal-assainissement-1.4.5.md`
3. Audits backend/frontend detailles du meme dossier (2026-03-23).
4. `references/recherche/2026-02-24_extension-saisie-poids-paheko_perplexity_reponse.md` et `2026-02-24_version-paheko-stable_perplexity_reponse.md`
5. `references/artefacts/2026-02-24_07_design-systeme-modules.md` et `2026-02-24_08_decision-architecture-max-paheko.md`
6. `references/migration-paeco/categories-decla-eco-organismes.md`
7. `references/ancien-repo/api-contracts-api.md`, `data-models-api.md`, `v1.4.4-liste-endpoints-api.md`

## Meta

Rapport produit par sous-agent explore (2026-03-24) ; fichier materialise par l'orchestrateur.
