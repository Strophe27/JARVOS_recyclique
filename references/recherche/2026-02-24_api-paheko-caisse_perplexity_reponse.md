# \# Prompt recherche — API Paheko caisse

**Date :** 2026-02-24  
**Cible :** Perplexity Pro  
**Usage :** Trouver la documentation ou les sources de l'API caisse Paheko (sessions, ventes, paiements). Prérequis pour décision source de vérité caisse (architecture JARVOS Recyclique).

---

## Contexte projet

Voir `contexte-pour-recherche-externe.md` pour le contexte complet.

Nous intégrons Paheko comme backend financier ; la caisse native Paheko (plugin) est utilisée. La doc API générale Paheko (fossil.kd2.org, version 1.3.17) ne liste pas d'endpoints dédiés à la caisse / point de vente / sessions de vente. Nous devons savoir comment accéder par API aux sessions de caisse, ventes, paiements (pour le module de correspondance Recyclic → Paheko).

---

## Questions pour la recherche

1. **API caisse Paheko** : existe-t-il une documentation (wiki, manuel, dépôt) des endpoints API liés au plugin Caisse ? Chemins, méthodes HTTP, paramètres pour : sessions de caisse, ventes, lignes de ticket, moyens de paiement.
2. **Modèles / tables** : quelles tables ou entités métier (noms, structure sommaire) sont utilisées par le plugin Caisse (ex. registre, session, vente, paiement) ? Source : code source du plugin (fossil.kd2.org/paheko-plugins), doc, ou communauté.
3. **Où est documentée l'API caisse** : page wiki précise, fichier dans le repo du plugin, ou uniquement dans le code source ? Si uniquement code, indiquer le dépôt et les fichiers clés à lire.

Répondre en français. Citer sources et URLs.

Cette question touche un point critique : l'API Paheko officielle **ne documente aucun endpoint dédié au plugin Caisse**. Voici ce que révèlent la documentation officielle et les fichiers du projet.

## Réponse directe : pas d'API caisse documentée

La documentation API Paheko v1.3.17.1 (accessible à `paheko.cloud/api` et dans le guide PDF officiel) couvre **uniquement quatre domaines**  :[^1][^2]


| Domaine | Préfixe API | Routes disponibles |
| :-- | :-- | :-- |
| Comptabilité | `accounting/*` | Exercices, journaux, écritures, comptes |
| Membres | `user/*` | CRUD membres, catégories, import CSV |
| Site web | `web/*` | Pages, pièces jointes, HTML |
| Utilitaires | `download`, `sql` | Backup SQLite, requêtes SELECT |

Il n'existe **aucun chemin** de type `caisse/*`, `sales/*`, `pos/*` ou `sessions/*` dans la documentation officielle. Les endpoints mentionnés dans certains guides internes du projet (`POST api/cash/sessions`, `POST api/sales`, `GET api/products`) sont des **propositions architecturales**, pas des routes Paheko existantes.[^3][^2][^1]

## Où sont les données de la Caisse

Le plugin Caisse est une extension PHP qui stocke ses données dans des **tables dédiées de la base SQLite** de Paheko. Ces tables ne sont pas documentées publiquement, mais sont accessibles via deux approches :[^4][^2]

### 1. Endpoint `sql` (SELECT uniquement)

L'API expose un endpoint `POST /api/sql` qui accepte toute requête SQL `SELECT` sur la base  :[^2]

```bash
curl https://user:pass@mon-paheko.tld/api/sql \
  -d "SELECT * FROM plugin_caisse_sessions LIMIT 10"
```

> ⚠️ Les requêtes `INSERT`, `UPDATE`, `DELETE` ne sont **pas acceptées** via cet endpoint. Il est en lecture seule.[^2]

### 2. Téléchargement de la base complète

`GET /api/download` retourne le fichier SQLite complet, lisible hors ligne. C'est l'approche pour des rapports batch ou exports.[^2]

## Structure probable des tables du plugin Caisse

Les noms de tables suivent la convention `plugin_caisse_*` ou similaire. D'après le code source du plugin (dépôt `fossil.kd2.org/paheko-plugins`, miroir `github.com/paheko/paheko-plugins`)  et la documentation des modules, les entités logiques sont :[^5][^4]


| Entité logique | Nom de table probable | Contenu attendu |
| :-- | :-- | :-- |
| Session de caisse | `plugin_caisse_sessions` ou `caisse_sessions` | Ouverture/fermeture, fond initial, opérateur |
| Note (ticket) | `plugin_caisse_tabs` | Ligne de ticket, statut ouvert/clos |
| Produit vendu | `plugin_caisse_tab_items` | Produit, quantité, prix unitaire |
| Paiement | `plugin_caisse_payments` | Moyen de paiement, montant, référence |
| Produit catalogue | `plugin_caisse_products` | Nom, prix, code-barre, compte comptable |

> **À valider** : ces noms sont inférés depuis la structure logique documentée dans le guide officiel  et la convention Paheko des plugins. Les noms exacts **doivent être vérifiés en lisant le source** du plugin caisse dans `fossil.kd2.org/paheko-plugins`.[^2]

## Comment trouver les noms exacts

La seule source fiable pour les noms de tables est le **code source PHP du plugin** :

```
fossil.kd2.org/paheko-plugins  → répertoire caisse/
github.com/paheko/paheko-plugins → caisse/
```

Les fichiers clés à lire  :[^5]

- `caisse/lib/Caisse.php` ou équivalent — définit le schéma SQL (`CREATE TABLE`)
- `caisse/install.php` ou `caisse/schema.sql` — initialisation des tables

Une fois les noms exacts obtenus, l'accès depuis FastAPI se fait via `POST /api/sql` avec des `SELECT` ciblés.

## Recommandation architecturale pour RecyClique

Puisqu'il n'y a pas d'API caisse native, trois stratégies sont possibles pour votre middleware :

1. **Lecture via `/api/sql`** — suffisant pour synchronisation post-vente (lecture des sessions clôturées, réconciliation comptable). Latence acceptable, approche officielle.[^1][^2]
2. **Téléchargement SQLite périodique** — via `/api/download`, parsing direct des tables `caisse_*` côté Python. Plus performant pour batch, moins pour temps réel.
3. **Webhook custom / module Brindille** — créer un module Paheko qui, à chaque clôture de caisse, appelle un webhook FastAPI. Requiert développement Brindille côté Paheko.[^4]

> **Conclusion** : la caisse Paheko n'est **pas conçue pour être pilotée par API**. Elle est source de vérité comptable, pas un POS API-first. Le middleware RecyClique doit considérer Paheko comme un **système d'enregistrement** (pull sur clôture), pas un système transactionnel temps réel piloté par API.[^6][^1]
<span style="display:none">[^10][^11][^12][^13][^14][^15][^16][^17][^18][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://paheko.cloud/api

[^2]: paheko_guide_a4.pdf

[^3]: Paheko-RecyClique.md

[^4]: https://paheko.cloud/modules-developper

[^5]: https://github.com/paheko/paheko-plugins

[^6]: 2025-01-30_RETRAITEMENT_recyclique-guide-complet-Paheko.md

[^7]: https://paheko.cloud/extension-caisse

[^8]: https://www.youtube.com/watch?v=u7y_XNqoDXA

[^9]: https://docs.lacontrevoie.fr/technique/services-auxiliaires/paheko/

[^10]: https://www.api-expertises.fr/missions/caisse/

[^11]: https://github.com/paheko

[^12]: https://github.com/paheko/paheko-modules

[^13]: https://blog.alphorm.com/gerer-une-base-de-donnees-avec-php-8

[^14]: https://crusep-occitanie.org/site/index.php/paheko/description-de-paheko

[^15]: https://asso.paheko.cloud

[^16]: https://paheko.cloud/static/guide_livret.pdf

[^17]: https://www.youtube.com/watch?v=ht-IRA4Xxo8

[^18]: https://paheko.cloud/version-1-3-18

