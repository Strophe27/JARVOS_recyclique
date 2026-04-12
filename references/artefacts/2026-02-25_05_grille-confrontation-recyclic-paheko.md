# Grille confrontation RecyClique vs Paheko

**Usage :** Document **utilisable par un agent** pour préparer et mettre à jour la confrontation (capacités RecyClique + besoins à venir vs Paheko core + plugin Caisse + module Saisie au poids). À mettre à jour au fur et à mesure des décisions et des validations (instance dev, BDD, analyste).

**Références :** [artefact 2026-02-25_04](2026-02-25_04_analyse-plugins-caisse-decisions-push.md), [Kanban idees-kanban](../idees-kanban/index.md), [versioning](../versioning.md).

---

## Comment utiliser cette grille

- **RecyClique (attendu / existant)** : ce que RecyClique vise ou ce qui existe déjà (1.4.4, brief, vision).
- **Paheko + plugins (connu / à valider)** : ce qu'on sait de Paheko (core, Caisse, Saisie au poids) ou ce qu'il reste à valider avec une instance / les BDD.
- **À creuser / décision** : question ouverte ou décision à prendre.
- **Statut** : `—` non traité | `en cours` | `décidé`.

---

## 1. Caisse et sync financière
| Critère | RecyClique (attendu / existant) | Paheko + plugins (connu / à valider) | À creuser / décision | Statut |
|--------|----------------------------------|--------------------------------------|------------------------|--------|
| Source de vérité caisse | RecyClique pilote la saisie (éventuellement offline) ; sync vers backend. | Paheko = source de vérité compta. Plugin Caisse : tables `plugin_caisse_*`, écritures compta via `syncAccounting` (pas à la fermeture). | Push par ticket au fil de l'eau ; clôture = syncAccounting + contrôle. | décidé |
| Push des ventes | Données caisse poussées vers Paheko (POST plugin recyclique), par ticket au fil de l'eau. | Plugin PHP reçoit, écrit dans plugin_caisse_*, appelle POS::syncAccounting(). Clôture = contrôle totaux. | Granularité : par ticket. File d'attente = Redis Streams (côté FastAPI), workers consommateurs, retry si Paheko down. | décidé |
| Montants, devises | Centimes en 1.4.4. | Plugin Caisse : montants en centimes. | Alignement RecyClique ↔ Paheko : **centimes partout**, pas de conversion. À valider en BDD Recyclic (schéma dev en double precision) : si stockage actuel en unités, conversion à l'écriture plugin. | décidé |

---

## 2. Catégories (caisse, produits, EEE)
| Critère | RecyClique (attendu / existant) | Paheko + plugins (connu / à valider) | À creuser / décision | Statut |
|--------|----------------------------------|--------------------------------------|------------------------|--------|
| Catégories boutique | Catégories / sous-catégories libres par magasin. **Source officielle EEE** (liste open data) et mapping dans RecyClique ; module décla éco-organismes dans RecyClique. | Plugin Caisse : table `plugin_caisse_categories` (produits). Module Saisie au poids : catégories entrées/sorties, motif. | **Plugin recyclique crée ou matche les catégories à la volée** (libellé/code) au push ; fallback config admin si référentiel préalable souhaité. À préciser avec dumps BDD. | décidé |
| EEE / flux matière | RecyClique gère catégories EEE, objectif décla éco-organismes. Liste officielle EEE dans RecyClique. | Saisie au poids : flag Ecologic (LIV, PRE, DEC_REE), poids, stats. Pas de multi-éco-organismes natif. | Voir axe 4 (décla éco-organismes). | décidé |

---

## 3. Poids et Saisie au poids
| Critère | RecyClique (attendu / existant) | Paheko + plugins (connu / à valider) | À creuser / décision | Statut |
|--------|----------------------------------|--------------------------------------|------------------------|--------|
| Saisie des poids | Réception + tickets réception dans RecyClique (flux matière, déclarations). **Aucune sync manuelle.** | Module Brindille `saisie_poids` : entrées/sorties pondérées, catégories, flag Ecologic. | Rôle exact du module Saisie au poids Paheko (fusion avec plugin caisse ? plugin custom unique ?). | décidé |
| Stockage | Compta matière / poids peut rester **uniquement dans RecyClique**. | `module_data_saisie_poids` (JSON). | **RecyClique = source de vérité** pour les poids déclaratifs. Paheko Saisie au poids optionnel (stats locales, export manuel) ou alimenté en lecture seule par le plugin ; pas de sync bidirectionnelle. | décidé |

---

## 4. Déclarations éco-organismes
| Critère | RecyClique (attendu / existant) | Paheko + plugins (connu / à valider) | À creuser / décision | Statut |
|--------|----------------------------------|--------------------------------------|------------------------|--------|
| Périmètre | Module(s) agnostique(s) dans **RecyClique**. Liste officielle EEE dans RecyClique. Sorties par éco-organisme à la date dite pour saisie sur les sites partenaires. | Saisie au poids : un référentiel Ecologic (LIV, PRE, DEC_REE), export déclarations manuel. | RecyClique = module décla, multi-éco-organismes. | décidé |
| Données déclaratives | Poids, flux, catégories mappées, périodes (T1–T4). Produites par RecyClique. | Saisie au poids + export formaté. | **RecyClique produit et conserve** les données déclaratives. Paheko peut garder une copie minimale (ex. via Saisie au poids si alimenté) pour traçabilité compta ; pas d'obligation. Détail dans PRD module décla. | décidé |

---

## 5. Offline et résilience
| Critère | RecyClique (attendu / existant) | Paheko + plugins (connu / à valider) | À creuser / décision | Statut |
|--------|----------------------------------|--------------------------------------|------------------------|--------|
| Saisie caisse hors ligne | RecyClique doit permettre la saisie caisse même sans réseau ; sync au retour. | Paheko = serveur ; pas d'offline natif. | RecyClique gère le buffer offline ; push vers Paheko quand en ligne. File d'attente = Redis Streams (côté FastAPI). | décidé |
| Paheko indisponible | Pas d'écriture directe RecyClique → BDD Paheko. | N/A. | Retry via stream Redis, notification utilisateur. Pas de double écriture. | décidé |

---

## 6. Rôles et périmètre (qui fait quoi)
| Critère | RecyClique (attendu / existant) | Paheko + plugins (connu / à valider) | À creuser / décision | Statut |
|--------|----------------------------------|--------------------------------------|------------------------|--------|
| Interface caisse terrain | RecyClique : UI dédiée workflows terrain. | Paheko natif : accès super-admin. | Claire séparation : terrain = RecyClique ; compta / admin = Paheko. | décidé |
| **Interfaces compta / admin** | **Objectif** : tout faire depuis RecyClique (bilan, factures, rapprochement bancaire, traçabilité). Plus d'accès admin Paheko en idéal. Plus tard JARVOS Nano/Mini. | Paheko = backend compta. | Décision : vues et workflows compta dans RecyClique. | décidé |
| Utilisateurs / auth | v0.1.0 : auth séparée (compte Paheko + compte FastAPI/JWT). SSO reporté v0.2. | Comptes Paheko, API credentials. | **v0.1** : auth séparée (Paheko pour admin/API, JWT FastAPI pour app terrain). **v0.2** : SSO à documenter. Figer dans PRD ; voir references/recherche pour recherche existante. | décidé |
| Module correspondance | Middleware RecyClique : traducteur domaine RecyClique → API Paheko (sessions, ventes, catégories → comptes/catégories Paheko). | Pas de module correspondance côté Paheko ; plugin recyclique reçoit le push et écrit. | **Décidé** : périmètre et règles détaillés dans la [matrice correspondance caisse/poids](../migration-paheko/audits/matrice-correspondance-caisse-poids.md) et les audits `migration-paheko/audits/`. Champs et règles exacts à préciser avec dumps BDD + instance dev + analyste. | décidé |

---

## 7. Sécurité
| Critère | RecyClique (attendu / existant) | Paheko + plugins (connu / à valider) | À creuser / décision | Statut |
|--------|----------------------------------|--------------------------------------|------------------------|--------|
| Canal push | HTTPS, authentification du client (FastAPI) vers plugin Paheko. | Plugin exposé sous /p/recyclique/api.php ; à protéger (token, IP, ou auth Paheko). | **Sécuriser par secret partagé** (header ou paramètre) + HTTPS ; optionnel : whitelist IP, ou credentials API Paheko. À figer dans PRD (v0.2). | décidé |
| Données sensibles | Pas de secrets en dur (checklist import 1.4.4). | Config Paheko, credentials API. | **Alignement bonnes pratiques** : pas de secrets en dur ; variables d'environnement / secrets manager ; config Paheko et credentials API gérés de même façon. | décidé |

---

## 8. Calendrier et fichiers
| Critère | RecyClique (attendu / existant) | Paheko + plugins (connu / à valider) | À creuser / décision | Statut |
|--------|----------------------------------|--------------------------------------|------------------------|--------|
| Agenda | v0.1.0 = placeholders ; Recyclic + services externes ; utilisateur = ref Paheko. | Pas de calendrier collaboratif natif (extension Agenda = individuel). | Décision prise : placeholders v0.1.0. Voir artefact 2026-02-25_01. | décidé |
| Fichiers / politique documentaire | Chantier ouvert (matrice, backends, scan factures, upload). | Paheko : gestion fichiers, WebDAV, upload. | Frontière RecyClique ↔ Paheko à définir dans le **chantier fichiers** (artefact 02) ; pas de décision technique en session. À trancher lors des versions fichiers (post-v0.1). | en cours |

---

## Mise à jour (agent)

Lors d'une session de confrontation ou après validation (instance dev, BDD, décision avec l'analyste) : mettre à jour les lignes concernées (colonnes RecyClique / Paheko, À creuser, Statut). Ajouter une section « Historique des mises à jour » en bas du fichier si besoin (date, résumé court).

---

## Historique des mises à jour

- **2026-02-25** : Décisions matrice (plan dd736e79) : axe 6 module correspondance → **décidé** ; renvoi à la [matrice correspondance caisse/poids](../migration-paheko/audits/matrice-correspondance-caisse-poids.md) et audits migration-paheko/audits/.
- **2026-02-25** : Session de confrontation (agent) : montants/devises (centimes), catégories caisse (plugin à la volée), stockage poids (RecyClique source de vérité), données déclaratives (RecyClique produit et conserve), auth v0.1 (figer en PRD), module correspondance (en cours — dumps BDD + analyste), sécurité canal push (secret partagé + HTTPS), données sensibles (bonnes pratiques), fichiers (en cours — chantier 02). Détail dans [artefact 08](2026-02-25_08_session-confrontation-recyclic-paheko.md).
- **2026-02-25** : Décisions push par ticket, Redis Streams (file d'attente), source EEE RecyClique, réception/poids sans sync manuelle, interfaces compta dans RecyClique. Grille mise à jour ; questions restantes dans [artefact 07](2026-02-25_07_decisions-push-redis-source-eee.md).

