# Index — consolidation-1.4.5

Référentiel durable pour l'audit brownfield et l'assainissement de la base active `recyclique-1.4.4/` en vue de la consolidation `1.4.5`.

> Charger cet index pour toute session d'audit, de consolidation, de priorisation technique ou de préparation d'une refonte fondée sur l'existant.

**Voir aussi (2026-03-31) :** interop Paheko, matrice caisse/poids, TODO reunion et **eco-organismes** dans [migration-paheko/](../migration-paheko/) ; audit global des dossiers `references/` : [artefacts/2026-03-31_02_audit-references-00-synthese-globale.md](../artefacts/2026-03-31_02_audit-references-00-synthese-globale.md).

Les rapports datés **2026-03-23** décrivent un audit brownfield de la base active `recyclique-1.4.4/` (backend + frontend): constats reformules, chemins indicatifs, recommandations ordonnees. La synthese et le backlog servent de point d'entree pour la planification; valider tout chiffre ou chemin sur l'arbre source avant implementation.

---

## Audit brownfield

- **`2026-03-23_prochaine-passe-assainissement-1.4.5.md`** — Note de relance pour un futur contexte vierge, avec l'ordre recommande de la prochaine passe et les lots a ouvrir ensuite.
  _(Charger si : tu reprends le projet apres les vagues 1 a 4 et que tu veux savoir par quoi continuer sans relire tout l'historique.)_

- **`2026-03-23_journal-assainissement-1.4.5.md`** — Journal chronologique des audits, lots executes, validations et decisions de cloture.
  _(Charger si : tu veux savoir rapidement ce qui a deja ete fait, dans quel ordre, et quels lots sont fermes.)_

- **`2026-03-23_protocole-journalisation-lots-1.4.5.md`** — Regle simple de journalisation pour les prochains runs et pour la coordination entre sous-agents, QA et agent parent.
  _(Charger si : tu reprends l'assainissement et que tu dois continuer le journal sans perdre la methode.)_

- **`2026-03-23_synthese-audit-consolidation-1.4.5.md`** — Synthèse maître de l'audit brownfield backend + frontend, avec constats clés, risques et priorités.
  _(Charger si : tu veux comprendre rapidement l'état global de la base active et la logique de priorisation.)_

- **`2026-03-23_backlog-assainissement-1.4.5.md`** — Backlog priorisé des actions d'assainissement issues de l'audit, exploitable par les futurs agents.
  _(Charger si : tu dois planifier ou exécuter des lots de consolidation technique avant évolution métier ou refonte.)_

- **`2026-03-23_audit-backend-architecture-1.4.4.md`** — Audit de l'architecture backend, des routeurs FastAPI, des services et des patterns structurels.
  _(Charger si : tu interviens sur le backend applicatif, la structure des couches ou la cohérence des patterns.)_

- **`2026-03-23_audit-backend-data-1.4.4.md`** — Audit des modèles, migrations, accès aux données et cohérence SQLAlchemy/Alembic.
  _(Charger si : tu touches aux modèles, migrations, repositories ou à la stabilité des données.)_

- **`2026-03-27_note-decision-db-migrations-legacy-1.4.5.md`** — Note de décision pour la phase finale DB/migrations: Alembic comme source de vérité, statut de `create_schema.py`, héritages legacy à inventorier et préchecks avant chantier dédié.
  _(Charger si : tu dois lancer ou cadrer le chantier DB/migrations legacy sans le mélanger aux lots runtime.)_

- **`2026-03-27_chantier-db-legacy-cartographie-matrice-1.4.5.md`** — Cartographie Alembic head `e8f9a0b1c2d3`, écarts vs modèles et vs `create_schema.py` / scripts parallèles, inventaire legacy classé, matrice de décision, séquence d'exécution, préchecks et rollback. **Session d'analyse :** code + `alembic heads` ; **état physique BDD** : cible générique non lue à la rédaction ; **instance Docker locale** ensuite documentée dans **prechecks-base-reelle**.
  _(Charger si : exécution ou reprise du chantier DB legacy, handoff agent, ou préparation migrations après préchecks base réelle.)_

- **`2026-03-27_chantier-db-legacy-decision-execution-1.4.5.md`** — **Préchecks + décision d'exécution (historique) :** blocage **accès hôte** (`alembic current` / SQL) sans secrets valides ou avec mot de passe erroné ; décision **aucune migration** tant que l'état physique n'est pas lu. **Pour constats effectifs sur stack Docker locale** (`current`, enums, DDL) : **`2026-03-27_chantier-db-legacy-prechecks-base-reelle-1.4.5.md`**. **Type :** synthèse exécution / blocage + renvoi terrain.
  _(Charger si : go/no-go migrations, reprise après obtention d'une URL BDD valide, ou audit « où en est la base ».)_

- **`2026-03-27_chantier-db-legacy-prechecks-base-reelle-1.4.5.md`** — **Préchecks terrain sur base Docker locale :** `alembic heads` = `e8f9a0b1c2d3` (dépôt) ; `alembic current` = `a7b3c9d2014f` ; enums `userrole` / `userstatus` conformes ; absence FK `users.site_id` et colonnes messagerie encore `telegram_*` / `telegram_user_id` ; **verdict en retard** (2 révisions : `d4e5f6a7b8c1`, `e8f9a0b1c2d3`) ; alerte image `api-migrations` sans rebuild. **Type :** constat réel + recommandation (backup puis upgrade), lecture seule.
  _(Charger si : alignement BDD vs Alembic, préparation `upgrade head`, ou piège image Docker migrations.)_

- **`2026-03-27_chantier-db-legacy-execution-controlee-1.4.5.md`** — **Exécution contrôlée sur base Docker locale :** backup `pg_dump` effectué, correction du point bloquant `api-migrations` via montage du dossier `api/migrations`, `alembic upgrade head` exécuté avec application de `d4e5f6a7b8c1` puis `e8f9a0b1c2d3`, contrôles post-run (`alembic current`, `alembic_version`, FK `users.site_id`, colonnes renommées, enums) **tous conformes**. **Type :** rapport final d'exécution / succès.
  _(Charger si : tu veux la preuve d'exécution, le résultat final réel de la migration locale, ou le protocole exact à rejouer sur un autre environnement.)_

- **`2026-03-27_validation-docker-local-installation-1.4.5.md`** — **Fiabilisation installation locale Docker :** inventaire des projets Compose sur la machine (`recyclic` historique, `recyclic-local` vs `recyclique-144` partageant le même `docker-compose.yml`), conflits de ports et volumes, relecture `alembic_version` sur la stack active, fragilités (`api-migrations`, `.env`), **protocole** build / up / migrations / smoke, **sans** déploiement ni modification Compose dans la session. **Type :** cartographie hôte + guide d'exécution locale ; décision garder/supprimer stacks à trancher avec l'exploitant.
  _(Charger si : validation Docker Desktop, choix de stack locale, handoff avant `compose up` ou nettoyage de projets.)_

- **`2026-03-23_audit-backend-config-ops-1.4.4.md`** — Audit des dépendances, scripts, Docker, settings et cohérence d'exécution backend.
  _(Charger si : tu travailles sur l'environnement, le packaging, l'exécution locale/CI ou la configuration.)_

- **`2026-03-23_audit-backend-tests-1.4.4.md`** — Audit de la stratégie de test backend, des fixtures et de la fiabilité de la boucle de validation.
  _(Charger si : tu veux fiabiliser ou étendre les tests backend.)_

- **`2026-03-23_audit-frontend-architecture-1.4.4.md`** — Audit de la structure frontend, du bootstrap, du routing, des stores, hooks et services.
  _(Charger si : tu interviens sur l'architecture React, les flux applicatifs ou les gros points d'entrée frontend.)_

- **`2026-03-23_audit-frontend-coherence-technique-1.4.4.md`** — Audit des patterns techniques frontend, des duplications, de la dette JS/TS et des choix de stack.
  _(Charger si : tu veux réduire la dette frontend, unifier les patterns ou préparer une base plus lisible.)_

- **`2026-03-23_audit-frontend-auth-permissions-1.4.4.md`** — Audit des guards, permissions, rôles, flux de session et cohérence d'accès frontend.
  _(Charger si : tu modifies l'auth frontend, les routes protégées ou les règles d'accès.)_
