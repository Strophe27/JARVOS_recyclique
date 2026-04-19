# Spécification convergée — socle multisite, permissions, invariants poste / kiosque et projection Recyclique → Paheko

**Date :** 2026-04-20  
**Epic :** 25 — alignement PRD vision kiosque / multisite / permissions (brownfield + ADR)  
**Stories amont :** 25.1 (matrice vision → canonique), 25.2 (ADR PIN kiosque / opérateur / secret de poste — *proposed*), 25.3 (ADR async Paheko / outbox / Redis auxiliaire — *proposed*)  
**Statut :** spécification d’exécution pour stories futures ; ne remplace pas le PRD canonique ni le PRD vision tant que ceux-ci ne sont pas absorbés par décision explicite.

---

## 1. Contexte et périmètre

### 1.1 Sources normatives citées (obligations AC 25.4)

Les règles ci-dessous **s’appuient explicitement** sur :

- **`_bmad-output/planning-artifacts/prd.md`** — hiérarchie documentaire (PRD canonique vs PRD vision), §2.4 extension PWA / readiness, §4.1 contexte avant écran, permissions additives §4.1 / §6.3, distinction PIN opérateur (canon) vs PIN kiosque (cible), chaîne financière et gouvernance importée.
- **`references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md`** — cible produit : multi-sites, kiosques PWA, NFR (UTC, immuabilité comptable, file résiliente vers Paheko dans la formulation vision), modèle Sites / Kiosques / analytique Paheko **1:1 projet** (intention cible).
- **`_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md`** — écarts brownfield vs vision (PIN serveur vs PIN local, outbox SQL vs « job Redis », PWA non démontrée, gate qualité API pour touches Paheko).
- **`_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md`** — verdict **GO conditionnel** cœur v2, **NO-GO** pour programme massif PWA / kiosque tant que ADR, FR/epics et gate API ne sont pas alignés ; extension PWA **NON PRÊTE** / **NOT READY**.

### 1.2 Brownfield canonique aujourd’hui vs cible PRD vision

| Sujet | Canon brownfield (exécution actuelle) | Cible PRD vision 2026-04-19 (non canonique jusqu’à absorption) |
|--------|--------------------------------------|------------------------------------------------------------------|
| Contexte métier | `ContextEnvelope` / recalcul explicite ; **contexte avant écran** (`prd.md` §4.1) | Même principe étendu aux postes PWA et hiérarchies sites avancées |
| Permissions | Modèle **additif** rôles + groupes ; clés techniques autorisent, pas les libellés UI | Revue habilitations, masquages par site (vision Epic 3.2) |
| Identité caisse | PIN **opérateur** serveur, session JWT ; step-up pour actions sensibles | PIN **kiosque** / secret de poste, lockout métier, offline — **ADR 25-2** |
| Paheko | Chaîne **caisse → snapshot figé → builder → outbox PostgreSQL** ; Redis **auxiliaire** — **ADR 25-3** | Formulation « file Redis » dans la vision = à lire comme **transport / observabilité**, pas comme seconde vérité durable |

### 1.3 Gel d’exécution hors `25-*`

Tant que le correct course documenté dans `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md` n’est pas levé, **aucune nouvelle story d’implémentation** ne doit étendre le périmètre kiosque / PWA **en dehors** de la séquence Epic 25 et des artefacts qu’il produit. Cette spec **ne lève pas** ce gel.

---

## 2. Modèle de contexte (invariants)

### 2.1 `site`

- **Brownfield :** le site est une dimension de contexte métier portée par l’enveloppe de contexte et les données de caisse / admin ; les opérations sensibles doivent résoudre un site **explicite**, pas inféré par l’UI seule.
- **Vision :** typologie FIXE / NOMADE / EXTERNE, lien analytique immuable avec Paheko après première vente — **cible** ; toute évolution de schéma ou de contrainte d’immuabilité relève de stories dédiées après readiness.
- **Invariant transversal :** aucune permission ni écriture comptable ne doit « fuiter » vers un site non sélectionné ou non autorisé pour l’acteur (aligné **zero fuite de contexte**, `prd.md` §4.4).

### 2.2 `caisse` (cash register)

- Rattachement obligatoire à un **site** cohérent avec la session et les mappings Paheko.
- La caisse est le pivot **terrain** des opérations encaissement ; le **référentiel comptable** pour Paheko passe par la chaîne canonique (journal détaillé, snapshot, builder), pas par l’écran de vente seul.

### 2.3 `session` (caisse)

- Une session ouverte porte le contexte **site + caisse + opérateur** (et traces d’audit).
- **Clôture :** produit un **snapshot comptable figé** ; une session clôturée n’est pas recalculée silencieusement (`cash-accounting-paheko-canonical-chain.md`).

### 2.4 `poste` / `kiosque`

- **Poste (canon) :** terminal où l’opérateur agit ; l’autorité serveur prime en ligne pour le PIN opérateur et les permissions.
- **Kiosque (cible vision + ADR 25-2) :** peut combiner **token / secret de poste** et **PIN kiosque** selon le modèle hybride *proposed* ; les invariants de lockout, step-up et offline sont **définis dans l’ADR 25-2**, pas redécidés ici.
- **Invariant :** ne jamais confondre **identité opérateur** (droits métier, audit) et **identité de poste** (ancrage matériel / PWA) dans les journaux ou les payloads sortants.

### 2.5 Rôle, groupe, permission effective

- **Rôles et groupes** servent l’affectation de permissions ; le calcul **additif** (union) est le socle v2 (`prd.md` §4.1, §6.3).
- **Portée (`scope`) :** toute permission sensible doit être évaluable relativement au **site / caisse / contexte** courant ; les stories admin (ex. groupes, audit) restent la surface de preuve pour les habilitations effectives.
- Les **libellés** personnalisés ou affichés en UI **ne font pas foi** pour la sécurité.

---

## 3. Comportement de changement de contexte

### 3.1 Bascule site / caisse

- Tout changement de site ou de caisse doit **invalider ou recalculer** le contexte applicatif côté backend (enveloppe / session) avant d’autoriser une action métier ou comptable.
- Le client (`Peintre_nano`) ne doit pas conserver d’état métier contradictoire avec le contexte serveur après une bascule ; les erreurs de synchronisation doivent être **explicites** (pas de continuation sur un contexte stale).

### 3.2 PIN, step-up et kiosque

- Le **PIN opérateur** (vérification serveur, actions sensibles) reste **canon** (`prd.md` §11.2).
- Le **PIN kiosque**, **secret de poste**, lockout métier vs rate limit HTTP, step-up et politique offline sont régis par **`2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md`** (*proposed*).
- Lors d’un changement de contexte nécessitant une **revalidation** (site/caisse sensible, escalation), le comportement attendu est : **refus par défaut** jusqu’à preuve d’identité conforme à l’ADR — pas de « meilleur effort ».

---

## 4. Projection Recyclique → Paheko (fermeture sans silence)

Référence de chaîne : **`cash-accounting-paheko-canonical-chain.md`** — le builder consomme le **snapshot figé**, l’**outbox** porte les sous-écritures ; transport et idempotence : **`2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md`** (*proposed*).

### 4.1 Enregistrements et axes de mapping obligatoires

Avant toute **écriture comptable** ou **émission de batch outbox** pour une session clôturée, les éléments suivants doivent être **résolus de manière non ambiguë** (aligné Epic 8, story **8-3** — correspondances site / caisse / emplacements Paheko) :

- identifiant **site** et **caisse** Recyclique cohérents avec la session clôturée ;
- **mappings** vers entités Paheko requises par le builder (ex. projet / emplacement / axes analytiques selon le contrat en vigueur) — pas d’invention par défaut ;
- **révision de paramètres comptables** (`accounting_config_revision_id` et dérivés) présente dans le snapshot ou traçable de façon équivalente pour expliquer les comptes utilisés.

### 4.2 État d’échec visible si mapping absent ou ambigu

Si une correspondance requise **manque**, est **invalide** ou **ambiguë** (plusieurs candidats sans règle de désambiguïcation approuvée) :

- **Aucune** sous-écriture Paheko ne doit être marquée comme « envoyée avec succès » pour le périmètre concerné.
- L’opérateur et/ou la **supervision** doivent voir un **statut explicite** (ex. échec de préparation comptable, entrée en quarantaine, corrélation d’erreur) — pas un message générique inexploitable.
- Les mécanismes de **corrélation inter-systèmes** et d’**audit** (Epic 8, stories **8-4**, **8-5**) s’appliquent pour la traçabilité et la résolution.

### 4.3 Interdiction de substitution silencieuse

Il est **interdit** de :

- substituer **silencieusement** un autre **site**, **emplacement**, **projet** ou **axe analytique** « proche » lorsque le mapping attendu est absent ;
- retomber sur un **site par défaut** ou une **caisse générique** pour débloquer une sync Paheko sans décision humaine tracée ;
- réécrire le contexte analytique **après coup** sans régularisation explicite (l’immuabilité comptable côté vision et le snapshot figé côté canon interdisent la « correction invisible »).

Toute dérogation ponctuelle doit passer par un **flux expert** (step-up, trace d’audit, éventuelle écriture de régularisation côté process métier — hors périmètre de ce document).

### 4.4 Blocage sélectif, supervision renforcée, quarantaine / reprise

Alignement avec les fondations **Epic 8** :

- **Blocage sélectif** (**8-6**) : les actions critiques finales (ex. clôtures, validations) peuvent être bloquées tant que la sync / le mapping / l’intégrité ne sont pas au vert — la spec **renforce** que le **défaut de mapping Paheko** est une cause légitime de blocage ou de report.
- **Quarantaine et résolution** (**8-4**) : les écarts persistants ou les échecs de livraison outbox font l’objet de **quarantaine** et de **levée manuelle** contrôlée, pas de retry aveugle infini.
- **Supervision** : les tableaux / outils de supervision caisse–compta doivent exposer les **causes racines** (mapping, builder, outbox) pour corrélation (**8-5**).

---

## 5. Stories et travaux aval (après relecture humaine de cette spec)

| Catégorie | Identifiants / périmètre | Commentaire |
|-----------|---------------------------|-------------|
| **Débloqués par la spec seule** (documentation / cadrage pour futurs devs) | Stories **techniques** ou **refactors** qui **ne présupposent pas** PWA production ni nouveau modèle de menace kiosque hors ADR | Ex. : poursuite **chantier audit API** (orthogonal mais gate qualité pour Paheko — cf. readiness) une fois gel levé ; doc / contrats qui citent explicitement cette spec comme source. |
| **Gated — ADR 25-2 / 25-3 non « accepted »** | Implémentations **code** PIN kiosque, secret de poste, offline ; tout changement qui **contredit** outbox PostgreSQL comme vérité ou Redis comme seul durable | Tant que statut *proposed*, les stories kiosque restent **conceptionnelles** ou **spikes** sous contrôle Epic 25. |
| **Gated — readiness 25.5** | **`25-5-rejouer-le-gate-readiness-cible-et-rebaseliner-le-backlog-25-apres-fermeture-des-decisions`** | Rejeu du rapport **`implementation-readiness-report-2026-04-19.md`** ; première story impl **kiosque / PWA** ne peut pas être promue **ready-for-dev** sans cette fermeture. |
| **Gated — correct course / gel** | Stories hors **`25-*`** en **pause** explicite (`sprint-change-proposal-2026-04-19-…`) | Le YAML conserve des epics `in-progress` pour l’historique ; le gel est **process**, pas rétroactivité des statuts. |
| **Gated — extension PWA / kiosque delivery** | Epics / stories type **13.8** (impl kiosque Peintre), **12.x** réception PWA, nouvelles stories auth kiosque nommées dans l’ADR 25-2 | **NOT READY** readiness tant que 25.5 et levée de gel non tracées. |
| **Fondations déjà livrées (référence)** | **8-3**, **8-4**, **8-5**, **8-6** ; chaîne **22.x** / **23.x** | Déjà **done** ; cette spec **ne les remplace pas** mais **ferme les règles de projection** pour éviter les divergences futures. |

---

## 6. Réconciliation avec les ADR 25-2 et 25-3

- **Aucune contradiction** introduite : cette spec **consomme** les ADR *proposed* sans rouvrir le choix outbox / Redis ni le modèle PIN.
- **Écarts résiduels** entre PRD vision (formulation Redis, PIN local pur) et brownfield sont **nommés** dans la research et le readiness ; ils sont **fermés côté architecture** par les ADR 25-2 et 25-3 — pas par cette spec.
- Si une **nouvelle** incohérence structurante apparaissait en implémentation, elle devrait donner lieu à un **ADR additionnel** (hors 25-2 / 25-3) ; aucun besoin identifié **au stade 25.4**.

---

## 7. Références complémentaires (hors les quatre citations minimales)

- `references/vision-projet/2026-04-19_matrice-alignement-vision-canonical-epic25-25-1.md` — traçabilité vision → canonique.
- `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` — chaîne d’autorité caisse → Paheko.
- `_bmad-output/planning-artifacts/epics.md` — Story 25.4, AR11 / AR12.
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md` — gel hors `25-*`.
