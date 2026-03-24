# Index — consolidation-1.4.5

Référentiel durable pour l'audit brownfield et l'assainissement de la base active `recyclique-1.4.4/` en vue de la consolidation `1.4.5`.

> Charger cet index pour toute session d'audit, de consolidation, de priorisation technique ou de préparation d'une refonte fondée sur l'existant.

Les rapports datés **2026-03-23** décrivent un audit brownfield de la base active `recyclique-1.4.4/` (backend + frontend): constats reformules, chemins indicatifs, recommandations ordonnees. La synthese et le backlog servent de point d'entree pour la planification; valider tout chiffre ou chemin sur l'arbre source avant implementation.

---

## Audit brownfield

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
