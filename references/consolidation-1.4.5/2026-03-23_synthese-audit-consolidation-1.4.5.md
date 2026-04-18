# Synthese d'audit — consolidation 1.4.5 (brownfield)

**Date:** 2026-03-23  
**Portee:** backend et frontend de la base active `recyclique-1.4.4/`, en preparation de la consolidation `1.4.5`.  
**Documents detailles:** fichiers `2026-03-23_audit-*-1.4.4.md` et `2026-03-23_backlog-assainissement-1.4.5.md` dans ce dossier.

---

## Resume executif

Le backend presente une architecture applicative ou la persistance et les transactions sont reparties de facon imprevisible entre routes, services et depots, avec des fichiers d'endpoints monolithiques et une sante dupliquee. Les donnees et le schema ne sont pas solidement ancres: absence de revisions Alembic versionnees, metadata dependante d'exports `models` incomplets, acces SQLAlchemy heterogenes et tests partiellement decales par rapport a PostgreSQL. Cote ops, les dependances et la configuration (DB, CORS, ports, images Docker) souffrent de doubles sources de verite et de variables non consommees. Les tests backend manquent d'isolation et de documentation fiable.

Le frontend repose sur Mantine et styled-components (pas Bootstrap), avec de tres gros composants, des doubles couches API et services, deux modeles d'auth (`useAuth` / `useAuthStore`), et des incoherences entre gardes de route et store (notamment pour l'admin et les permissions). React Query est fourni sans usage clair; formulaires et notifications suivent plusieurs patterns paralleles.

Aucune invention hors des rapports thematiques: les actions concretes doivent etre validees sur l'arbre source au moment de l'implementation.

---

## Priorites transverses

1. **Une source de verite pour le schema et le runtime:** migrations versionnees + modeles exportes + meme Python et meme strategie DB entre tests et prod autant que possible.
2. **Une source de verite pour les dependances et l'infra:** pyproject ou requirements unique pour prod; compose / Settings / README alignes sur les memes noms de base et ports.
3. **Frontieres claires:** transactions et commits; HTTP leve au bord API; pas de logique metier / ORM lourde dans les routes.
4. **Un seul modele client auth + permissions:** store, `ProtectedRoute`, types `User` / roles, et tests sur la meme carte mentale.
5. **Unifier les appels reseau et les retours UX** cote frontend (client HTTP, notifications, formulaires) apres decision explicite sur React Query.

---

## Risques majeurs

- **Schema / prod:** deploiement ou Alembic qui ne voit pas tous les modeles; message "use migrations" sans chaine de migration reelle.
- **Donnees:** `User.site_id` sans FK; commits et tests qui laissent de la persistance partagee — bugs intermittents et integrite faible.
- **Securite et surface d'attaque:** deps dev dans l'image prod; secrets ou URLs figes dans migrations / ini; auth et stores exposes sur `window`.
- **AuthZ frontend:** admin / permissions / `ProtectedRoute` desalignes — acces refuse a tort ou accepte de facon incoherente selon le chemin.
- **Fiabilite des tests:** SQLite partiel vs Postgres, collisions de donnees, mocks larges masquant des integrations reelles.

---

## Proposition d'ordre des futurs lots

Les lots suivent une logique de deblocage: d'abord ce qui conditionne la verite du schema et de l'environnement, puis la structure backend, puis la fiabilite des tests, puis le frontend (auth en premier parmi les sujets UI).

| Lot | Theme | Objectif principal |
|-----|-------|-------------------|
| 1 | Config / deps / Docker / README | Meme noms DB, ports documentes, image prod sans dev deps, variables CORS et FRONTEND_URL consommees, dependances canoniques. |
| 2 | Data / Alembic | Exports `models`, baseline migrations, integration au deploiement, FK `site_id`, nettoyage arborescence dupliquee si confirmee. |
| 3 | Architecture backend | Sante unifiee, decoupe endpoints, politique transactions, HTTP hors services, logique hors routes, carte `/admin`. |
| 4 | Tests backend | Isolation DB, cible Postgres, pytest.ini / marqueurs, doc tests, couverture, moins de contournements fragiles. |
| 5 | Auth / permissions frontend | Alignement store / `ProtectedRoute`, `initializeAuth`, suppression exposition globale, routes et tests. |
| 6 | Coherence frontend | Regle HTTP unique, decision React Query, notifications et formulaires, nettoyage `App.jsx` et gros fichiers. |

Les lots 5 et 6 peuvent partiellement se chevaucher une fois les contrats API stabilises par les lots 1-3.

---

## References croisees

- `2026-03-23_audit-backend-architecture-1.4.4.md`
- `2026-03-23_audit-backend-data-1.4.4.md`
- `2026-03-23_audit-backend-config-ops-1.4.4.md`
- `2026-03-23_audit-backend-tests-1.4.4.md`
- `2026-03-23_audit-frontend-architecture-1.4.4.md`
- `2026-03-23_audit-frontend-coherence-technique-1.4.4.md`
- `2026-03-23_audit-frontend-auth-permissions-1.4.4.md`
- `2026-03-23_backlog-assainissement-1.4.5.md`
