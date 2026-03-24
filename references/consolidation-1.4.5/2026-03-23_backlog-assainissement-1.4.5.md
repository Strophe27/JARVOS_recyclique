# Backlog d'assainissement — consolidation 1.4.5

**Date:** 2026-03-23  
**Source:** audits `2026-03-23_audit-*-1.4.4.md` et synthese `2026-03-23_synthese-audit-consolidation-1.4.5.md`.  
**Priorite:** P0 = bloquant securite / prod / schema; P1 = fort impact technique; P2 = dette et qualite.

Colonnes: ID | Priorite | Zone | Action | Justification | Fichiers (indicatif)

| ID | Priorite | Zone | Action | Justification | Fichiers |
|----|----------|------|--------|---------------|----------|
| CFG-01 | P0 | Backend ops | Unifier `POSTGRES_DB` entre compose, app et migrations | Eviter connexion a une base erronee ou migrations sans effet | docker-compose*.yml, Settings, alembic URL |
| CFG-02 | P0 | Backend ops | Choisir une source canonique des dependances et synchroniser pyproject / requirements | Builds et CI non reproductibles | pyproject.toml, requirements*.txt |
| CFG-03 | P0 | Backend ops | Separer image API prod des deps dev | Surface d'attaque et image alourdie | Dockerfile |
| DATA-01 | P0 | Backend data | Initialiser Alembic avec revisions versionnees et baseline alignee prod | Message "use migrations" sans chaine reelle; schema non trace | migrations/versions/, env.py |
| DATA-02 | P0 | Backend data | Exporter tous les modeles tables dans `models/__init__.py` pour `target_metadata` | Tables invisibles pour autogenerate / revision | models/__init__.py, email_event.py, autres |
| AUTHZ-01 | P0 | Frontend | Unifier `ProtectedRoute` et `authStore` (admin, permissions) | Comportement d'autorisation divergent | ProtectedRoute*, authStore* |
| OPS-01 | P1 | Backend ops | Lire CORS et FRONTEND_URL depuis Settings; supprimer hors env sauf fallback dev | Variables compose inutiles; config en dur | compose, Settings, main/app CORS |
| OPS-02 | P1 | Backend ops | Corriger reference `scripts/get-version.sh` ou ajouter le script | Build / demarrage casse | docker-compose, scripts/ |
| OPS-03 | P1 | Backend ops | Aligner README port API avec compose (4433 vs 8000) | Erreurs d'acces utilisateur | README, compose |
| OPS-04 | P1 | Backend ops | Durcir Dockerfile.migrations / alembic.ini: pas d'URL ou mot de passe figes | Fuite de secrets / mauvais environnement | Dockerfile.migrations, alembic.ini |
| OPS-05 | P1 | Backend ops | Documenter / pinner runtime Python identique local et Docker (3.11 vs 3.13) | Ecarts de comportement | Dockerfile, doc, CI |
| ARCH-01 | P1 | Backend | Normaliser endpoints health (main vs v1) et documenter la semantique | Monitoring et sante ambigus | main.py, endpoints/health* |
| ARCH-02 | P1 | Backend | Definir et appliquer une politique unique de transactions (qui commit) | Etats incoherents multi-couches | services/, repositories/ |
| ARCH-03 | P1 | Backend | Retirer HTTPException des services; lever au niveau route | Couplage presentation / domaine | services/* |
| ARCH-04 | P1 | Backend | Extraire logique ORM et metier hors routes (ex. export CSV reception) | Tests et reutilisation impossibles | routes reception*, services |
| ARCH-05 | P1 | Backend | Decouper admin.py, cash_sessions.py, auth.py, reduire main.py | Maintenance et revue | endpoints/admin.py, cash_sessions.py, auth.py, main.py |
| ARCH-06 | P1 | Backend | Cartographier routeurs `/admin` dans api_v1/api.py | Collisions et maintenance | api_v1/api.py |
| DATA-03 | P1 | Backend data | Ajouter ForeignKey sur User.site_id | Integrite referentielle | models User* |
| DATA-04 | P1 | Backend data | Normaliser acces SQLAlchemy (select/execute vs Session.query vs SQL brut) | Performance et lisibilite | auth.py, services/* |
| DATA-05 | P1 | Backend data | Aligner tests DB sur Postgres ou documenter limites SQLite + schema | Faux sentiment de couverture | tests/, conftest.py |
| TREE-01 | P2 | Backend | Supprimer ou documenter arbre duplique api/api/api_v1 si present | Confusion sur la source de code | arborescence api/ |
| TEST-01 | P1 | Backend tests | Isoler la DB (rollback, savepoints, cleanup apres commit) | Flakiness et pollution entre tests | conftest.py, tests/* |
| TEST-02 | P1 | Backend tests | Eliminer collision username `inactive_user` entre tests | Echecs intermittents | tests/* |
| TEST-03 | P1 | Backend tests | Revoir conftest (faux reportlab/openpyxl, mock log_audit) | Masque integrations reelles | conftest.py |
| TEST-04 | P2 | Backend tests | Realigner pytest.ini, marqueurs, remplacer `not telegram` fragile | Exclusions implicites cassees | pytest.ini |
| TEST-05 | P2 | Backend tests | Reparer README tests / lien guide manquant | Onboarding | tests/README.md |
| TEST-06 | P2 | Backend tests | Integrer pytest-cov en CI ou en script local | Visibilite couverture | CI, pytest.ini |
| FE-01 | P1 | Frontend | Completer initializeAuth (user, permissions); traiter TODO | Session incomplete au refresh | auth init* |
| FE-02 | P1 | Frontend | Retirer window.useAuthStore et exposition auth window en prod | Surface globale / debug | App.jsx, store |
| FE-03 | P1 | Frontend | Remplacer redirection 401 par navigation router | Perte etat SPA | interceptors / auth flow |
| FE-04 | P1 | Frontend | Resoudre dualite useAuth vs useAuthStore | Double modele | useAuth.ts, useAuthStore* |
| FE-05 | P2 | Frontend | Brancher route PendingUsers ou retirer la page | Code inaccessible | App.jsx, PendingUsers* |
| FE-06 | P2 | Frontend | Realigner tests public-routes sur routeur reel | Tests non representatifs | tests public-routes* |
| FE-07 | P2 | Frontend | Aligner role manager / type User dans ProtectedRoute | Comparaisons invalides | ProtectedRoute*, types User |
| FE-08 | P2 | Frontend | Unifier categoryService / categoriesService et cash session services | Duplication API | services/* |
| FE-09 | P2 | Frontend | Decouper TicketForm, LegacyImport, SaleWizard | Fichiers > 1400-2200 lignes | composants concernes |
| FE-10 | P2 | Frontend | Decider React Query: usage reel ou retrait QueryClientProvider | Complexite sans benefice | providers, package.json |
| FE-11 | P2 | Frontend | Regle unique appels HTTP (axiosClient vs generated vs services/api.ts) | Triple piste | clients API |
| FE-12 | P2 | Frontend | Unifier notifications Mantine vs react-hot-toast | UX dupliquee | App, composants |
| FE-13 | P2 | Frontend | Documenter stack Mantine + styled; nettoyer App.jsx, Categories_old, lazy routes | Dette et confusion | App.jsx, doc |
| FE-14 | P2 | Frontend | Factoriser hooks polling / live stats | Requetes dupliquees | hooks stats* |
| FE-15 | P2 | Frontend | Nettoyer package.json (react-app vs Vite, Playwright en dev, typescript explicite) | Config incoherente | package.json |
| FE-16 | P2 | Frontend | ProtectedRoute: gerer etat loading | Flash contenu non autorise | ProtectedRoute* |
| TEST-07 | P2 | Backend tests | Ajouter scenario health representatif des dependances | Couverture sante reelle | tests/*, health* |

---

## Notes d'utilisation

- Les chemins dans la colonne Fichiers sont des indices; confirmer par recherche dans `recyclique-1.4.4/` avant implementation.
- Reordonner les ID dans un outil de suivi (issue tracker) si des dependances de lot changent.
