---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
workflowType: 'research'
lastStep: 6
research_type: 'technical'
research_topic: 'Migration PostgreSQL 15 → 17 (stack Recyclique / JARVOS)'
research_goals: 'Cadrer faisabilité, stratégies de migration (pg_upgrade vs dump/restore), impacts stack applicative (Python/SQLAlchemy/Alembic/Docker), risques et prochaines étapes BMAD (architecture, epics).'
user_name: 'Strophe'
date: '2026-04-11'
web_research_enabled: true
source_verification: true
---

# Migration PostgreSQL 15 → 17 (Recyclique) — recherche technique BMAD

**Date:** 2026-04-11  
**Author:** Strophe  
**Research Type:** technical  

> **Note de fraîcheur (post-implémentation 10.6d / 10.6e)** : ce document capture l'état de recherche et de dépôt observé au **2026-04-11 avant alignement final**. Les surfaces canoniques ont depuis été portées vers **PostgreSQL 17** dans `docker-compose.yml` racine et les workflows CI concernés ; se référer à l'ADR, au runbook PG17 et aux stories `10.6c` à `10.6e` pour l'état exécutable courant.

---

## Research Overview

Cette recherche technique répond au besoin de **passer la base PostgreSQL du projet Recyclique (mono-repo JARVOS) de la version 15 à la version 17** pour la stack **canonique** (`docker-compose.yml` racine, **`recyclique/api/`**, CI). Le dossier **`recyclique-1.4.4/`** est **hors périmètre** (legacy, non couvert par ce chantier). Les constats s’appuient sur la documentation officielle PostgreSQL, la compatibilité des clients Python courants, et l’état observé du dépôt pour ces surfaces.  

Les conclusions clés : la migration est **standard** pour une application SQLAlchemy + Alembic **dans l’hypothèse** d’extensions PostgreSQL limitées aux usages courants — **un inventaire `pg_extension` sur vos environnements réels reste obligatoire** avant engagement (cette recherche ne l’a pas exécuté sur une base de prod). Les méthodes recommandées sont **`pg_upgrade`** (souvent le meilleur compromis temps d’arrêt / espace) ou **`pg_dump` / `pg_restore`** (plus simple à raisonner en conteneur, au prix d’une fenêtre d’indisponibilité liée à la taille des données). Il est indispensable de **valider en préproduction**, d’exécuter **`pg_upgrade --check`** ou un cycle dump/restore de test, et de relire les **notes de version 16 et 17** pour les changements de comportement SQL rares mais possibles.

Le détail (paysage technique, intégration, architecture de déploiement, mise en œuvre et recommandations) est développé dans les sections suivantes ; un **résumé exécutif** et une **feuille de route** figurent en fin de document.

---

<!-- Contenu produit par le workflow Technical Research (étapes 1–6) -->

## Technical Research Scope Confirmation

**Research Topic:** Migration PostgreSQL 15 → 17 (stack Recyclique / JARVOS)  
**Research Goals:** Cadrer faisabilité, stratégies de migration, impacts applicatifs et Docker, risques, suite BMAD.

**Technical Research Scope:**

- Architecture Analysis — cluster PostgreSQL, conteneur Docker, volume de données  
- Implementation Approaches — `pg_upgrade`, dump/restore, réplication logique (option zéro downtime avancé)  
- Technology Stack — PostgreSQL 17, image Docker officielle, Python `psycopg2` / SQLAlchemy, Alembic  
- Integration Patterns — protocole filaire PostgreSQL, `libpq`, chaînes `DATABASE_URL`  
- Performance Considerations — statistiques post-migration (`ANALYZE`), paramètres serveur

**Research Methodology:**

- Données publiques actuelles avec citations URL  
- Validation croisée des affirmations sensibles (migration majeure, outils)  
- Ancrage sur les fichiers du dépôt JARVOS_recyclique  

**Scope Confirmed:** 2026-04-11  

---

## Technology Stack Analysis

*Contexte : migration majeure du **moteur** PostgreSQL ; la pile applicative Recyclique reste Python/FastAPI.*

### Programming Languages

- **Python 3** (API sous `recyclique/api/`) : le client **`psycopg2`** et **SQLAlchemy** dialoguent avec le serveur via **`libpq`** ; le numéro de version majeur du serveur n’impose pas de changement de langage.  
- Documentation **psycopg** : prise en charge des versions serveur sur une plage large — les builds récents restent adaptés aux serveurs PostgreSQL modernes ; pour le long terme, la communauté oriente les nouveaux projets vers **Psycopg 3**, sans que ce soit un prérequis au seul passage en PG 17.  
- Source : [Installation — Psycopg](https://www.psycopg.org/docs/install.html), [Psycopg features](https://www.psycopg.org/features/)

### Development Frameworks and Libraries

| Composant | Version observée (repo) | Commentaire PG 17 |
|-----------|-------------------------|-------------------|
| SQLAlchemy | `2.0.23` (`recyclique/api/pyproject.toml`) | Compatible ; surveiller requêtes SQL brutes et types spécifiques |
| Alembic | `1.12.1` (`recyclique/api/pyproject.toml`) | Les migrations restent valides ; tester `upgrade head` sur instance PG 17 |
| psycopg2-binary | `2.9.9` | Compatible usage courant avec PG 17 |

### Database and Storage Technologies

- **PostgreSQL** : les mises à jour **mineures** (15.x → 15.y) se font en remplaçant les binaires sur le même répertoire de données ; les mises à jour **majeures** (15 → 17) exigent une **migration** (`pg_upgrade`, dump/restore, ou réplication logique).  
- Source : [pg_upgrade](https://www.postgresql.org/docs/current/pgupgrade.html) (distinction majeur / mineur explicitée en introduction).

### Development Tools and Platforms

- **Docker** : l’image officielle `postgres:15` (racine du repo) doit être remplacée par **`postgres:17`** (ou tag patch précis, ex. `postgres:17.9` à l’époque de la migration — vérifier le tag sur [Docker Hub `postgres`](https://hub.docker.com/_/postgres)) une fois la procédure de migration validée.  
- **CI / tests** : aligner les jobs qui lèvent PostgreSQL sur la même version cible pour éviter les écarts dev/CI. **Constat dans ce dépôt (2026-04-11)** : `image: postgres:15` est encore pinnée dans  
  - `.github/workflows/alembic-check.yml` (service `postgres` des jobs Alembic),  
  - `.github/workflows/deploy.yaml` (jobs `test-fast` et `test-complete`, services `postgres`).  
  Ces fichiers devront être mis à jour **en même temps** que la stratégie de migration des données (pas seulement le `docker-compose` local).

### Cloud Infrastructure and Deployment

- En **VPS / compose** (hors legacy), la stratégie typique est : nouvelle instance ou nouveau conteneur + migration des données, ou `pg_upgrade` dans un conteneur outillage avec montage des volumes — le choix dépend du temps d’arrêt acceptable et de l’espace disque. Le **backend** et les migrations Alembic cibles sont **`recyclique/api/`**. Aucune recommandation d’exploitation n’est faite pour **`recyclique-1.4.4/`** dans ce document.

### Technology Adoption Trends

- Les fournisseurs et la documentation officielle insistent sur les **tests de pré-vérification** (`pg_upgrade --check`) et sur la **relecture des release notes** pour chaque saut majeur.  
- Source : [PostgreSQL 17.0 Release Notes](https://www.postgresql.org/docs/release/17.0/)

---

## Integration Patterns Analysis

### API Design Patterns

- L’API Recyclique utilise **HTTP/REST** (FastAPI) ; la base PostgreSQL est un **stockage transactionnel** derrière **SQLAlchemy**. Pas de changement de pattern d’API induit par PG 17 en l’absence de modification SQL.

### Communication Protocols

- Le client PostgreSQL utilise le **protocole natif** PostgreSQL (port 5432 par défaut), inchangé dans son principe entre versions majeures.  
- Les chaînes du type `postgresql://user:pass@host:5432/db` dans `docker-compose.yml` restent valides.

### Data Formats and Standards

- Les types **JSON/JSONB**, **UUID**, **ENUM** déjà utilisés par les migrations Alembic doivent être **re-testés** sur PG 17 ; les release notes signalent parfois des ajustements de parsing **`interval`** ou des règles sur **`search_path`** pour certains objets (index d’expression, vues matérialisées).  
- Source : [PostgreSQL 17.0 Release Notes](https://www.postgresql.org/docs/release/17.0/)

### System Interoperability Approaches

- **Redis** (cache / sessions dans la stack) reste orthogonal à la migration PostgreSQL ; pas d’intégration directe à migrer.

### Microservices Integration Patterns

- Architecture actuelle : **monolithe API + PostgreSQL + Redis** dans Compose — pas de pattern saga distribué impacté par la seule montée de version du SGBD.

### Event-Driven Integration

- Non applicable au périmètre strict PG 15→17 sauf si vous utilisez **LISTEN/NOTIFY** ou **réplication logique** pour la migration (hors scope par défaut).

### Integration Security Patterns

- Vérifier après migration les **méthodes d’authentification** (`pg_hba.conf`). Si vous utilisez **`SET SESSION AUTHORIZATION`**, consulter les **release notes** des versions traversées (15 → 16 → 17) : des ajustements de sémantique liés au statut superutilisateur ont été documentés dans le cycle PostgreSQL 17 ; valider le comportement dans vos rôles et procédures stockées.  
- Source : [PostgreSQL 17.0 Release Notes](https://www.postgresql.org/docs/release/17.0/) (section *Migration* / changements de compatibilité).

---

## Architectural Patterns and Design

### System Architecture Patterns

- **État persistant** : volume Docker `postgres_data` monté sur `/var/lib/postgresql/data` — répertoire **non compatible** entre majeures sans migration.  
- Options usuelles :  
  1. **Nouveau volume PG 17** + `pg_dump`/`pg_restore` depuis l’ancienne instance encore en 15.  
  2. **pg_upgrade** entre deux répertoires de données (souvent deux conteneurs ou un conteneur avec les deux versions de binaires), avec tests `--check` préalables.

### Design Principles and Best Practices

- **Sauvegarde** avant toute opération (cf. guides existants dans le repo : `pg_dump` custom format, copies hors machine).  
- **Environnement de staging** reproduisant la prod (volume représentatif, extensions, paramètres).

### Scalability and Performance Patterns

- Après migration majeure, exécuter **`ANALYZE`** (ou scripts recommandés post-`pg_upgrade` dans la doc) pour des plans d’exécution corrects.  
- Source : [pg_upgrade](https://www.postgresql.org/docs/current/pgupgrade.html) (étapes post-mise à niveau).

### Data Architecture Patterns

- **Alembic** conserve l’historique de schéma ; la cible PG 17 doit recevoir le même schéma qu’en 15 après migration des données. Éviter de mélanger « migration Alembic » et « migration serveur » le même jour sans procédure claire.

### Deployment and Operations Architecture

- **Compose canonique (dev local)** : `docker-compose.yml` à la racine — service `api` avec **`build.context: ./recyclique/api`** ; ligne **`image: postgres:15`** du service `postgres` à faire évoluer vers **`postgres:17`** **après** validation de la procédure de données. Documenter l’ordre d’opération (backup → migration → bascule → tests smoke).
- **Legacy** : les éventuels `docker-compose*` sous **`recyclique-1.4.4/`** ne font **pas** partie du périmètre de ce chantier ; ne pas les traiter comme livrables de la migration **15 → 17** décrite ici.

---

## Implementation Approaches and Technology Adoption

### Technology Adoption Strategies

| Stratégie | Avantages | Inconvénients |
|-----------|-----------|---------------|
| **pg_upgrade** | Rapide surtout avec `--link` si adapté ; réutilise les fichiers de données | Préparation (deux clusters), extensions doivent être compatibles ; lecture doc stricte |
| **pg_dump / pg_restore** | Reproductible, familier en Docker ; bon pour « nouvelle instance propre » | Temps lié à la taille ; besoin d’espace pour le dump |
| **Réplication logique** | Fenêtre de bascule réduite possible | Complexité opérationnelle plus élevée |

- Source générale : [pg_upgrade](https://www.postgresql.org/docs/current/pgupgrade.html)

### Development Workflows and Tooling

- Mettre à jour les **workflows GitHub** listés ci-dessus et tout script local qui pin `postgres:15`.  
- Garder **`psycopg2-binary`** et **SQLAlchemy** alignés avec les politiques de sécurité du projet (montées mineures indépendantes de PG 17 si besoin).

### Testing and Quality Assurance

- Suite de tests API / pytest contre base **PG 17** (conteneur dédié).  
- Vérifier les migrations Alembic **`upgrade` / `downgrade`** sur copie anonymisée.

### Deployment and Operations Practices

- Procédure minimale suggérée :  
  1. Backup complet + test de restauration.  
  2. Migration sur copie (staging).  
  3. Checklist applicative (caisse, stats, imports).  
  4. Fenêtre de maintenance prod + rollback documenté (restauration backup sur instance 15 si nécessaire).

### Risk Assessment and Mitigation

| Risque | Mitigation |
|--------|------------|
| Extensions PostgreSQL non supportées en 17 | Lister `SELECT * FROM pg_extension` en 15 ; vérifier disponibilité binaires pour 17 |
| Régression SQL / interval / search_path | Tests de charge fonctionnelle + relecture release notes 16 & 17 |
| Temps d’arrêt sous-estimé | Mesurer dump/restore sur jeu de données réaliste |

---

## Technical Research Recommendations (projet)

### Implementation Roadmap (suggestion)

1. **Inventaire** (hors **`recyclique-1.4.4/`**) : extensions PG, taille base, paramètres custom, alignement **compose racine + CI** et tout environnement **non legacy** officiellement supporté.  
2. **Spike** : un conteneur `postgres:17` + restauration dump depuis 15 ; exécuter tests automatisés sous **`recyclique/api/`**.  
3. **Choix** : trancher `pg_upgrade` vs dump/restore selon RTO/RPO et contraintes disque.  
4. **Documentation** : runbook opérateur (commandes exactes, rollback) pour les cibles **non legacy**.  
5. **BMAD suite** : **architecture** (fait — ADR), puis **epics/stories** (billets distincts : image Docker compose racine, CI, prod / env. supportés).

### Technology Stack Recommendations

- Passer l’image **`postgres:17`** (tag patch figé en prod).  
- Conserver **psycopg2 2.9.x** ou planifier **Psycopg 3** comme chantier séparé (hors scope strict PG 17).  
- S’assurer que **SQLAlchemy 2.0.x** couvre les usages (déjà le cas pour 2.0.23).

### Success Metrics and KPIs

- Zéro erreur sur **`alembic upgrade head`** après migration.  
- Jeux de tests API verts sur PG 17.  
- Temps de bascule mesuré ≤ objectif défini (à fixer métier).

---

## Synthèse exécutive et suite BMAD

### Executive Summary

La montée de **PostgreSQL 15 à 17** pour Recyclique est **faisable** avec les pratiques standard de la communauté : migration majeure hors simple remplacement d’image Docker, en privilégiant **`pg_upgrade`** (après `pg_upgrade --check`) ou **`pg_dump`/`pg_restore`**. La stack actuelle (**SQLAlchemy 2.0.23**, **Alembic 1.12.1**, **psycopg2-binary 2.9.9**) est **compatible** avec un serveur PostgreSQL 17 pour un usage typique d’API métier. Les risques principaux sont **opérationnels** (fenêtre de maintenance, sauvegarde, extensions) et **régression SQL** ponctuelle — couverts par tests sur **staging** et lecture des **release notes** officielles.

**Constats dans le périmètre du chantier :** le **`docker-compose.yml` racine** fixe **`image: postgres:15`** et un volume pour les données ; le service **`api`** est construit depuis **`recyclique/api/`** (backend canonique). L’API consomme PostgreSQL via **`DATABASE_URL`** vers le service `postgres`. Les workflows **`.github/workflows/alembic-check.yml`** et **`.github/workflows/deploy.yaml`** utilisent encore **`postgres:15`** — alignement requis avec la cible **17**. **`recyclique-1.4.4/`** est **hors scope** (legacy) pour cette migration. Toute montée de version majeure inclut une **procédure de migration des données**, pas seulement un changement de tag d’image.

**Recommandations prioritaires :**

1. Réaliser un **inventaire** (extensions, paramètres, volumétrie) sur les instances **15** des environnements **non legacy**.  
2. **Tester** la migration complète sur une copie (dump/restore ou `pg_upgrade --check` puis run).  
3. **Aligner** **`docker-compose.yml` racine**, la **CI** et tout **déploiement non legacy** sur **`postgres:17`** une fois la procédure validée — **sans** traiter `recyclique-1.4.4/`.  
4. Poursuivre en **stories** BMAD (image + CI + runbook + validation) ; l’**ADR** et la recherche technique sont déjà documentés.

### Table des matières

1. [Research Overview](#research-overview)  
2. [Périmètre et méthodologie](#technical-research-scope-confirmation)  
3. [Pile technique et PostgreSQL](#technology-stack-analysis)  
4. [Intégration applicative](#integration-patterns-analysis)  
5. [Architecture et déploiement](#architectural-patterns-and-design)  
6. [Mise en œuvre et adoption](#implementation-approaches-and-technology-adoption)  
7. [Recommandations projet](#technical-research-recommendations-projet)  
8. [Synthèse exécutive et suite BMAD](#synthèse-exécutive-et-suite-bmad)  
9. [Sources principales](#sources-principales)

### Sources principales

| Sujet | URL |
|------|-----|
| pg_upgrade (documentation officielle) | https://www.postgresql.org/docs/current/pgupgrade.html |
| Notes de version PostgreSQL 17.0 | https://www.postgresql.org/docs/release/17.0/ |
| Notes de version PostgreSQL 16.0 (saut 15 → 17 : relire aussi 16) | https://www.postgresql.org/docs/release/16.0/ |
| Notes de version (index) | https://www.postgresql.org/docs/release/ |
| Image Docker `postgres` (tags) | https://hub.docker.com/_/postgres |
| Psycopg — installation / fonctionnalités | https://www.psycopg.org/docs/install.html , https://www.psycopg.org/features/ |

---

## Technical Research Conclusion

Le chantier **PostgreSQL 15 → 17** est un **changement de plateforme** bien documenté par le projet PostgreSQL ; pour Recyclique, la suite BMAD logique est : **Technical Research** (ce document) → mise à jour ou complément **Create Architecture** (décision + contraintes d’exploitation) → **Create Epics and Stories** (tâches techniques et validation) → **Sprint Planning**. **Correct Course** n’est utile que si une **replanification de sprint** ou un conflit avec des livrables déjà engagés apparaît.

**Technical Research Completion Date:** 2026-04-11  
**Source Verification:** affirmations sur pg_upgrade et release notes appuyées par la documentation officielle PostgreSQL et la doc psycopg.  
**Technical Confidence Level:** élevé pour les pratiques générales de migration ; **moyen à confirmer** pour les détails spécifiques à vos extensions et volumétrie réelle jusqu’à inventaire et tests sur copie.
