# Matrice d'intégration Paheko — opérations v2 et gaps API

**Date :** 2026-04-02  
**Dernière mise à jour :** 2026-04-02 — cohérence / lisibilité (lien **Story 1.7** → artefact **07**) ; **§6 bis** aligné fichier Perplexity (compta asso, avoirs, durées).

**Story BMAD :** Epic 1 — `1-6-produire-la-matrice-dintegration-paheko-et-les-gaps-api-reels`  
**Piste :** B (prérequis Recyclique / Paheko). **Pas Peintre_nano.**

**Statut sprint :** voir `_bmad-output/implementation-artifacts/sprint-status.yaml` (clé `1-6-produire-la-matrice-dintegration-paheko-et-les-gaps-api-reels`).

---

## Documents liés (ordre de lecture recommandé)

| Ordre | Artefact | Rôle pour la matrice 1.6 |
|-------|----------|---------------------------|
| 1 | `2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md` | **Sync, quarantaine, états FR24, audit qui/quoi/quand** — cette matrice dit **comment** on pousse (API vs plugin vs hors scope), pas **pourquoi** un état est `en_quarantaine` (déjà en **05**). |
| 2 | `2026-04-02_01_surface-travail-v2-mode-reference-paheko.md` | **Où** tourne Paheko en dev (Docker, etc.) — utile pour **valider** les preuves (liste endpoints, code plugin) contre **ta** instance de référence (**1.1**). |
| 3 | `2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` | **Recyclique** expose le futur contrat HTTP reviewable ; la matrice **ne crée pas** de routes Recyclique — elle classe **Paheko** (côté cible). Cohérence erreurs JSON / `correlation_id` (**AR21**, **1.4**). |
| **Sources de preuve Paheko** | `references/paheko/liste-endpoints-api-paheko.md`, `references/paheko/analyse-brownfield-paheko.md` | Inventaire **documenté** — toute route citée en §2 doit **s’y retrouver** ou être marquée **[à valider]** / **gap** (§4). |
| **Audits migration** | `references/migration-paeco/audits/` (ex. matrice caisse / poids, audit caisse) | Décisions brownfield + plugin Caisse — **pas** une API REST inventée. |
| **Recyclique v2 surface** | `contracts/openapi/recyclique-api.yaml` | **Distinct** de cette matrice : ici on regarde **Paheko** comme cible d’intégration. |
| **Recherche remboursements / compta asso** | `references/recherche/2026-04-02_remboursements-compta-associations-loi-1901_perplexity_reponse.md` | Synthèse **§6 bis** : avoirs, conservation pièces, contre-passation Paheko, périmètre expert-comptable. |
| **Suite Epic 1 — Story 1.7** | `references/artefacts/2026-04-02_07_signaux-exploitation-bandeau-live-premiers-slices.md` | **Après** cette matrice : signaux **bandeau live** (F1–F6), autorité backend vs runtime local, cas limites, alignement OpenAPI / **Epic 4** — **sans** rouvrir la sémantique sync (**05**) ni le contexte (**03**). |

**Compléments :** `references/paheko/index.md`, `references/dumps/schema-paheko-dev.md` (compréhension modèle — **AR9**, pas chemin nominal). `_bmad-output/planning-artifacts/epics.md` (**FR5**, **FR40**, **FR41**, **AR8**, **AR9**, **FR39**).

---

## 0. Lire d'abord — en bref

**Ce que dit ce document (sans jargon).** Pour chaque **gros type d’opération** (vente, clôture, compta, adhérents, etc.), on indique si Paheko est censé être touché par **l’API HTTP officielle**, par un **plugin** (code Paheko), par du **SQL** seulement pour analyse, ou **pas** dans le périmètre v2. Si on ne sait pas, on le met dans **§4** avec une **conséquence** (produit ou backlog), **sans inventer** une route Paheko.

**Pourquoi c’est pas la même chose que le contrat sync (05).** Le **05** dit : *quand* une opération est en retard, en quarantaine, résolue, etc. Le **06** dit : *par quel tuyau* (API Paheko documentée vs extension) on essaie d’atteindre Paheko pour cette opération — et **où** il manque encore une preuve.

**Remboursements / avoirs / clôture comptable (cadre asso, non-TVA).** Les règles de principe (ticket immuable, avoir, totaux vers Paheko, contre-passation) sont résumées en **§6 bis** ; le **détail**, exemples d’écritures et sources : `references/recherche/2026-04-02_remboursements-compta-associations-loi-1901_perplexity_reponse.md`.

**Rôles côté humain (rappel — aligné Story 1.3 / 05).**

| Rôle | Ce qui compte pour cette matrice |
|------|----------------------------------|
| **Bénévole** (terrain) | Flux caisse / réception ; **pas** « opérateur » au sens métier ambigu — voir **03** / **05**. Les routes **user** côté Paheko peuvent être **admin** (import CSV, etc.) : ce n’est **pas** le même profil que la caisse. |
| **Admin local** (Paheko / association) | Paramétrage emplacements, services, imports — souvent **API admin** ou UI Paheko. |
| **Super-admin** | Chemins sensibles, SQL `/api/sql`, plugins — **FR40** : pas SQL transactionnel nominal. |
| **Responsable ressourcerie** | Décisions levée quarantaine / arbitrages **FR26–FR27** — **05** §6 ; ici : conséquence **quand** le gap API bloque une réconciliation. |

**Règle anti-invention.** Aucun chemin `/api/...` Paheko **ne figure** comme « certain » **sans** `liste-endpoints-api-paheko.md` (ou citation explicite du code plugin / audit). Sinon : **[à valider]** ou ligne dans **§4**.

---

## Heuristiques — valider sans lire 40 pages

Tu peux dire « OK pour le fond » si **tout** ce qui suit est vrai :

1. **Une ligne du tableau §2** = une **opération métier** que tu reconnais, pas un détail d’implémentation.
2. **Caisse v2** : tu **confirmes** que les **tickets** vivent dans **Recyclique** et que **Paheko** reçoit surtout des **écritures comptables** (API `/api/accounting/...`), pas un miroir du plugin POS Paheko — **ou** tu fais une **réserve** (§4).
3. **§4** : chaque **gap** = « ce qu’on ne sait pas encore » avec une **suite** (produit ou story) — pas une liste de défauts bloquants pour avancer la spec.
4. **SQL** : uniquement **analyse / admin** — **pas** le chemin nominal des ventes (**FR5**, **FR40**).
5. **Recyclique** reste **writer** de **son** OpenAPI (**AR19**, **04**) — ce fichier **n’ajoute** pas d’`operationId` Recyclique.
6. Les règles **avoir / clôture / quatre totaux** (§**6 bis**) te semblent **alignées** avec ta vision terrain — sinon noter l’écart dans **§4** ou en marge du fichier Perplexity.

Si tu bloques sur un point : **une** phrase dans le fichier `ou-on-en-est.md` ou en commentaire de suivi — pas besoin de relire tout.

---

## Traçabilité Acceptance Criteria → sections

| AC (Story 1.6, `epics.md`) | Sections |
|----------------------------|----------|
| Chaque opération majeure : API officielle / plugin minimal / SQL analyse-admin / hors scope v2 ; pas d’hypothèse non supportée sur le chemin par défaut | §2 (table), §5 (garde-fous) |
| Liste de **gaps** et **inconnues** réelles ; chaque lien → conséquence produit ou backlog | §4 |
| Si plugin : **rationale** explicite (API insuffisante) ; pas de SQL transactionnel nominal | §2 colonne Notes, §5 |

---

## 1. Objet et périmètre

**Objet.** Classer **chaque opération métier majeure** visée par la v2 (Recyclique → Paheko) selon le **mécanisme d’intégration** autorisé par **FR40** / **FR5** / **AR9**, avec **preuve** ou mention **inconnu à valider**.

**Périmètre.** Couche **intégration backend** Recyclique → Paheko (**AR8**) ; vocabulaire sync (**FR39**, contrat **05**) — **ne pas redéfinir** `a_reessayer`, `en_quarantaine`, `resolu`, `rejete`.

**Non-objectifs.** Implémentation connecteurs, workers, détail OpenAPI Recyclique par opération : **Epics 2, 8** et stories dédiées.

### 1 bis. Décision produit — chemin nominal v2 (Strophe, 2026-04-02)

Cette section **prime** sur les lignes du tableau qui décrivent encore l’**historique brownfield** (plugin Caisse / POS dans Paheko).

| Principe | Contenu |
|----------|---------|
| **Ordre** | **1)** API HTTP officielle Paheko documentée ; **2)** étude de faisabilité ; **3)** si et **seulement si** l’API ne suffit pas : plugin **existant** ou plugin **nouveau** — jamais l’inverse. |
| **Tickets / session de vente** | **Recyclique** est la source du **détail** (lignes, paiements, etc.). **On n’utilise pas** le plugin **POS / Caisse Paheko** comme chemin nominal pour recréer les tickets côté Paheko. |
| **Ce qui part vers Paheko** | **Écritures comptables** et événements de **clôture** attendus par la compta (via domaine **`/api/accounting/...`**), conformément à la liste d’endpoints — **pas** une réplication du module caisse Paheko. |
| **Plugin matière / saisie poids** | **Pas** utilisés dans le nominal v2 pour « remplacer » la compta : même logique **API d’abord** ; options modules Paheko = **hors nominal** ou plus tard. |
| **Gaps (§4)** | Ce sont des **questions ouvertes** (forme des écritures, remboursements, mapping) avec **piste** (backlog, recherche, atelier métier) — **pas** une obligation d’avoir tout tranché en Epic 1. |

**Recherches utiles.** `2026-02-24_api-paheko-caisse_perplexity_reponse.md` (pas d’API REST POS documentée ; compta en **API**). `2026-04-02_remboursements-compta-associations-loi-1901_perplexity_reponse.md` (avoirs, clôture, contre-passation — **§6 bis**).

---

## 2. Table principale — opération → classification → mécanisme → preuve

**Légende — Classification** (exactement une par ligne) :

- **API officielle** — route documentée dans `liste-endpoints-api-paheko.md` sous `/api/…`.
- **Plugin minimal** — extension Paheko (PHP, `ext/p/…`) **justifiée** car l’API ne couvre pas le besoin nominal.
- **SQL analyse-admin uniquement** — lecture / export / investigation (`GET`/`POST` `/api/sql` **selon doc**), **hors** chemin transactionnel métier.
- **Hors scope v2** — pas d’intégration Paheko obligatoire pour cette brique en v2, ou reporté (**AR38**).

| Opération métier majeure (Recyclique v2 → Paheko) | Classification | Mécanisme Paheko (nominal) | Preuve / source | Notes |
|--------------------------------------------------|----------------|----------------------------|-----------------|-------|
| **Représentation comptable** (écritures, transactions, pièces, **y compris** agrégats issus des ventes Recyclique) | API officielle | `POST` … `/api/accounting/transaction` ; lectures `GET` … transaction, journaux, charts, years | `liste-endpoints-api-paheko.md` § Accounting ; `analyse-brownfield-paheko.md` § 3.2 | **Chemin nominal v2** pour tout ce qui doit exister **côté compta Paheko**. Idempotence **→ §4**. |
| **Lecture contrôle comptable** (journal, exercice, export) | API officielle | `GET` … journal, `…/export/…` | Liste endpoints | Export = lecture. |
| **Détail ticket de caisse** (lignes, paiements, session) — **vie du ticket** | **N/A Paheko (nominal v2)** | **Recyclique** (autorité terrain) ; **pas** de push vers le plugin POS/Caisse Paheko | §**1 bis** ; recherche `2026-02-24_api-paheko-caisse_perplexity_reponse.md` (pas d’API REST POS documentée) | **Ancien** scénario brownfield = plugin Caisse ; **v2** = pas de miroir ticket dans Paheko via ce plugin. |
| **Clôture de caisse (terrain) → enregistrement comptable côté Paheko** | API officielle | Écritures / lots via **`/api/accounting/...`** (forme exacte **→ §4** gap) | Liste endpoints § Accounting ; **05** (états sync) | **Nominal** : **pas** la clôture « native » plugin Caisse comme chemin principal ; **synchroniser** la compta attendue. |
| **Remboursement / annulation / correction** (effet comptable) | API officielle | `POST /api/accounting/transaction` (ou séquence équivalente documentée) | Liste ; **§6 bis** ; `besoins-terrains.md` §1 | **Recyclique** : **avoir** lié au ticket (ticket d’origine **immuable**). **Paheko** : jour J même total net ; **J+N** = contre-passation le jour du remboursement (détail comptes **→ expert-comptable**). |
| **Correspondances site / caisse / emplacement** (**FR41**) | **Recyclique** + appui Paheko **sans** API dédiée | Mapping **dans Recyclique** ; côté Paheko : comptes / paramètres **selon doc** (pas d’endpoint `mapping` dans la liste) | Matrice migration ; liste endpoints | **FR42** ; **quarantaine** **05**. Plugin **seulement** si étude montre un trou **non** comblable par API. |
| **Référence historique — ancien couple Recyclique ↔ plugin Caisse Paheko** | *Brownfield* | `plugin_pos_*`, extension Caisse (audits migration) | `matrice-correspondance-caisse-poids.md` | **Ne pas** confondre avec le **nominal v2** (§**1 bis**). Utile pour migration / comparaison seulement. |
| **Réception / flux matière** (sans obligation Paheko v2) | Hors scope v2 | N/A | **FR29** Recyclique autorité matière | |
| **Copie optionnelle** réception / stats → Saisie au poids | Plugin minimal | Module `saisie_poids` (données module) | `analyse-brownfield-paheko.md` addendum | Pas d’API HTTP métier documentée pour ce module. |
| **Adhérents / membres** (CRUD, abonnement, import CSV) | API officielle | `POST /api/user/...`, subscribe, import | Liste § User | Niveaux **write** / **admin** ; **Epic 9**. |
| **Import abonnements / services (CSV)** | API officielle | `POST|PUT /api/services/subscriptions/import` | Liste § Services | **Admin** ; batch. |
| **Pièces jointes** sur transaction comptable | API officielle (contraint) | `POST /api/accounting/transaction` avec `move_attachments_from` | Liste ; `analyse-brownfield-paheko.md` § 3.3 | **Gap** upload générique **§4**. |
| **Pages web / PJ site** | API officielle (lecture) | `GET /api/web/...` | Liste § Web | Hors flux caisse nominal. |
| **Investigation / exports ad hoc** | SQL analyse-admin uniquement | `/api/sql` en **lecture** ou export ; schéma `schema-paheko-dev.md` | Liste § SQL | **Uniquement** analyse — **FR40**. |
| **Déclarations éco-organismes** | Hors scope v2 (Paheko obligatoire) | N/A | **FR59** | |
| **HelloAsso** | Hors scope v2 (cette matrice) | — | **FR47**, **Epic 9** | |
| **Upload fichier générique** (hors CSV user/services, hors `move_attachments_from`) | Plugin minimal | WebDAV `/dav/` ou endpoint **plugin** Recyclique | `analyse-brownfield-paheko.md` § 3.3 | **Rationale :** pas d’upload `/api` générique documenté. **Pas** `/api/sql` en écriture métier. |

---

## 3. Synthèse par domaine (Epics 6–9 / 8)

| Domaine | Classification dominante | Renvoi |
|---------|----------------------------|--------|
| Caisse v2 | **Tickets / détail** dans **Recyclique** ; **Paheko** = **écritures comptables** via **API** `/api/accounting/...` (§**1 bis**) ; brownfield plugin = **référence** seulement | §2 ; Epic **6** ; **8** |
| Réception v2 | **Hors scope** Paheko obligatoire ; option Saisie au poids **plugin** | §2 ; Epic **7** |
| Sync / quarantaine | Transport + **05** + outbox **AR11** | **05** ; Epic **8** |
| Adhérents | **API** | §2 ; Epic **9** |

**Chaînage Epic 1 (rappel).** Cette matrice (**1.6**) complète les **gaps Paheko** après le contrat sync (**05**). La suite documentaire **même epic** est **1.7** (signaux d’exploitation / bandeau live) : `references/artefacts/2026-04-02_07_signaux-exploitation-bandeau-live-premiers-slices.md`.

---

## 4. Gaps API réels et inconnues — conséquence produit / backlog

| Gap / inconnu | État | Conséquence produit | Backlog (indicatif) |
|---------------|------|---------------------|---------------------|
| **Forme des écritures** (clôture : totaux ventes / avoirs / espèces / écarts) dans l’API Paheko | À valider en impl. | Erreurs mapping → **en_quarantaine** (**05**) | **Epic 8** + jeux de test ; doc Paheko ; **1.1** ; aligner export de clôture sur **§6 bis** |
| **Remboursements / annulations** — cadre associatif FR, traçabilité | **Couvert** (Perplexity + **§6 bis**) | Principes **§6 bis** ; **comptes exacts** et **inter-exercices** : **expert-comptable** | **6-4** ; `besoins-terrains.md` ; PIN : `2026-04-02_pin-ouverture-caisse-operateur-pos-rgpd_perplexity_reponse.md` |
| **Idempotence** / doublons côté Paheko (inventaire API) | À valider | Risque relivraison (**05**, **AR24**) | **8-2**, **8-5** ; spike version Paheko cible |
| **Pas d’upload fichier générique** `/api` | Confirmé | Pas de PJ « upload direct » sans WebDAV / plugin | **Epic 8** ou **plugin** Recyclique |
| **Saisie au poids** sans surface `/api` métier | Confirmé | Copie Recyclique → Paheko = option **hors nominal** ; plugin / manuel | **7** / **8** si option retenue |
| **FR41** sans endpoint dédié « mapping » | Confirmé | Mapping **dans Recyclique** ; livraison comptable **FR42** | **8-3** |
| **Ancien scénario plugin Caisse** (migration / parité) | Documenté brownfield | Comparaison uniquement ; **pas** le chemin v2 (§**1 bis**) | Audits migration ; pas de backlog « miroir POS » obligatoire en v2 |
| **Version Paheko cible** (compatibilité API) | À valider | CI / tests bout-en-bout | **Epic 10** ; **1.1** |

---

## 5. Garde-fous explicites (FR5, FR40, AR9)

- **Interdiction** du nominal « SQL écriture » / mutation métier via `/api/sql` pour remplacer API ou plugin documenté (**FR5**, **FR40**).
- **Plugin** : autorisé **uniquement** si preuve d’**insuffisance** de l’API officielle pour l’opération.
- **Cohérence 1.4** : cette matrice **ne définit pas** les routes Recyclique — **OpenAPI** reviewable (**AR39**).

---

## 6. Références

- `references/paheko/liste-endpoints-api-paheko.md`, `references/paheko/analyse-brownfield-paheko.md`
- `references/migration-paeco/audits/` (index et audits caisse / poids)
- `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md`
- `references/artefacts/2026-04-02_01_surface-travail-v2-mode-reference-paheko.md`
- `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`
- `references/recherche/2026-02-24_api-paheko-caisse_perplexity_reponse.md` (API compta vs absence API POS documentée)
- `references/recherche/2026-04-02_remboursements-compta-associations-loi-1901_perplexity_reponse.md` (compta asso, avoirs, clôture — **§6 bis**)
- `references/recherche/2026-04-02_pin-ouverture-caisse-operateur-pos-rgpd_perplexity_reponse.md` (remboursement = action sensible, rétention logs)
- `references/besoins-terrains.md` (remboursements terrain ; NF525 hors assujettis TVA — **aligné** recherche 2026-04-02)
- `references/artefacts/2026-04-02_07_signaux-exploitation-bandeau-live-premiers-slices.md` (Story **1.7** — signaux bandeau live, suite Epic 1 après **06**)
- `_bmad-output/planning-artifacts/epics.md`

### 6 bis. Synthèse recherche — comptabilité association, remboursements, Recyclique ↔ Paheko

**Source complète (prompt + réponse Perplexity) :** `references/recherche/2026-04-02_remboursements-compta-associations-loi-1901_perplexity_reponse.md`.

| Sujet | Synthèse pour le produit |
|--------|---------------------------|
| **Cadre légal** | Loi **1901** seule : pas d’obligation comptable **unique** ; statuts / taille / financements → obligations **graduées**. Activité économique (boutique) → **PCA 2018**, partie double, obligation renforcée **2020** (détail : fichier Perplexity §1). **NF525** : **pas** d’obligation pour **non assujettis TVA** (LF 2016 / CGI art. 286 — cohérent `besoins-terrains.md` §2). |
| **Recyclique** | **Ne pas** modifier le ticket d’origine ; **avoir** = document **nouveau** (réf. type `AVOIR-[id ticket source]`, montant négatif, opérateur, mode remboursement, horodatage, **raison**). Ticket source **immuable**. |
| **Paheko** | **Clôture** = agrégats **par jour** (pas ticket par ticket). **Même jour** : une **écriture de clôture** avec **total net** (ventes − remboursements du jour) peut suffire — Paheko n’a pas besoin de séparer les deux lignes si tout est dans le même lot. **J+N** : **contre-passation** le jour du remboursement ; exemple type **512** / **707** puis **709** / **512** (schéma et montants fictifs dans le fichier Perplexity §2). **Exercice déjà clôturé dans Paheko** : **ne pas** modifier l’exercice passé ; cas limite (ex. **77** ou correction) → **expert-comptable**. |
| **Export vers Paheko** | **Quatre totaux** à distinguer pour des journaux lisibles : (1) ventes brutes **707**, (2) remboursements / avoirs du jour **709**, (3) espèces caisse **531** / **5311**, (4) **écarts** **658** / **758** — puis écriture(s) selon le journal de caisse Paheko (détail : fichier Perplexity §2 fin). |
| **Conservation & durées** | **Livres + pièces** (tickets, avoirs, bons) **10 ans** après clôture (**L123-22**) ; **logs** auth / accès **6 mois à 1 an** glissant (CNIL) ; **fiscal** si contrôle **6 ans** (LPF L102 B). **RGPD** : pas d’effacement sur données nécessaires à une **obligation légale** comptable (**art. 17(3)(b)**). |
| **Backlog produit (Recyclique)** — rappel | Audit **immuable** (ticket, avoir, ouverture/clôture) ; **`source_ticket_id`** sur avoir ; **raison** obligatoire sur avoir ; export clôture **structuré** ; conservation **10 ans** en base (**soft delete** seulement). Détail : fichier Perplexity §3. |
| **Hors scope outil** | Compte exact **709** vs **707** au débit ; **inter-exercices** (vente N, remboursement N+1) ; **comptes annuels certifiés** (seuil subventions **153 k€** etc.) ; **assujettissement TVA** potentiel ; arbitrage **DDFIP** — **expert-comptable / juriste**. |

**Références normatives citées dans la recherche (à ouvrir depuis le fichier Perplexity) :** PCA **2018** / recueil non lucratif **ANC** (`anc.gouv.fr`) ; pages Paheko saisie écritures / exemples ; BOFiP / Dolibarr sur **périmètre NF525** (non-TVA).

---

## 7. Données sensibles

Aucun secret, credential, PII réel dans ce document.

---

## 8. Validation humaine (HITL) — Story 1.6

**Checklist courte (Strophe).**

- [ ] La distinction **05** (états sync) vs **06** (tuyau Paheko) est claire pour toi.
- [ ] §**1 bis** : **API d’abord**, tickets dans **Recyclique**, **écritures** vers Paheko — tu **valides** cette lecture.
- [ ] **§4** : chaque gap a une **suite** identifiable (même indicatif).
- [ ] **§6 bis** : avoirs, **quatre totaux**, durées, périmètre **pro** — OK ou réserve notée (le détail et les **sources** sont dans le fichier Perplexity).
- [ ] Aucune **route Paheko** ajoutée **sans** source ou sans **[à valider]**.

**Date :** _______________ **Signature / note :** _______________
