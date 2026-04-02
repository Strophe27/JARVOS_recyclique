# Spécification canonique v2 — modèle multi-contextes et invariants d'autorisation

**Date de livraison :** 2026-04-02  
**Story BMAD :** Epic 1 — `1-3-specifier-le-modele-multi-contextes-et-les-invariants-dautorisation-v2`  
**Périmètre :** sémantique métier et invariants — **pas** de schéma OpenAPI exhaustif (Story **1.4**) ni d'implémentation backend (Epics **2.x**).  
**Références croisées :** audit brownfield `2026-04-02_02_audit-brownfield-backend-api-donnees-critiques.md`, `epics.md` (Story 1.3, AR19, AR39), `guide-pilotage-v2.md` (Pistes A/B).

---

## Traçabilité Acceptance Criteria → sections

| Bloc Given/When/Then (Story 1.3) | Sections qui répondent |
|----------------------------------|-------------------------|
| Isolation stricte sites / caisses / sessions / postes / opérateurs ; entités minimales ; invariants zéro fuite ; règles de changement de contexte | §2, §3, §4 |
| Permissions additives calculées par Recyclique ; clés stables ; libellés ; multi-groupes ; autorité backend ; UI jamais vérité sécurité | §5 |
| Step-up (confirmation, PIN, revalidation) ; quand bloquer / dégrader / recalcul explicite du contexte | §6 |
| Alignement hiérarchie de vérité et contrats (préparation 1.4) | §7 |
| Écarts stub Peintre_nano | §8 |

---

## 1. Principes directeurs

1. **Une seule autorité pour l'autorisation métier** : le backend Recyclique calcule et impose les permissions effectives et le contexte d'exploitation exposé au client. Toute couche UI, manifeste ou cache local ne fait qu'**afficher** ou **demander** ; elle ne **décide** pas l'accès métier.
2. **ContextEnvelope comme projection runtime** : instance dérivée du backend, matérialisée dans les contrats (OpenAPI) en **1.4** et en code en **2.2** — voir §7.
3. **Permissions additives** : l'ensemble effectif est une **union** (ou composition additive définie) des droits issus des groupes et du rôle ; l'absence de permission ne s'« annule » pas par un libellé ou un flag UI.
4. **Step-up distinct du filtrage d'affichage** : masquer un bouton ne suffit pas ; les actions sensibles exigent des garanties renforcées côté serveur (§6).

---

## 2. Entités minimales canoniques

Chaque entité ci-dessous est décrite au niveau **sémantique** : identité stable, champs obligatoires conceptuels, relations, cycle de vie succinct, ancrage dans le brownfield (sans recopier l'audit 1.2).

### 2.1 Site

| Aspect | Spécification |
|--------|----------------|
| **Identité** | Identifiant technique stable (UUID ou entier selon modèle données — **fixé en OpenAPI 1.4**). |
| **Champs obligatoires (conceptuels)** | Identifiant ; libellé d'affichage (non autoritaire) ; statut d'activité si pertinent pour l'exposition opérateur. |
| **Relations** | Unité de périmètre pour caisses, postes de réception, rattachements utilisateurs ; contrainte d'intégrité **site ↔ opérateur** critique en brownfield (`User.site_id` signalé fragile dans l'audit). |
| **Cycle de vie** | Création / désactivation côté admin ; sélection par l'opérateur verrouille le **périmètre** des ressources visibles et actionnables. |
| **Lien brownfield** | `GET /v1/sites`, `GET /v1/sites/{id}`, `users/me` — ancrage multi-site / multi-contexte (audit §3.5). |

### 2.2 Caisse (registre / poste d'encaissement)

| Aspect | Spécification |
|--------|----------------|
| **Identité** | Identifiant stable de **caisse** (registre physique ou logique), distinct de la **session** d'encaissement. |
| **Champs obligatoires** | Identifiant ; rattachement **site** ; état d'exploitation (ouvert / fermé / maintenance) selon modèle métier. |
| **Relations** | 1 site → N caisses ; 1 caisse → 0..1 **session** active à un instant donné (invariant métier à préserver). |
| **Cycle de vie** | Configuration longue durée ; association opérateur via **session** et droits. |
| **Lien brownfield** | `/v1/cash-registers`, sessions (audit §3.1). |

### 2.3 Session (caisse)

| Aspect | Spécification |
|--------|----------------|
| **Identité** | Identifiant de **session d'encaissement** lié à une caisse et un opérateur (ou équipe) sur une plage temporelle. |
| **Champs obligatoires** | Identifiant session ; **caisse** ; **site** (dérivé ou explicite) ; opérateur responsable ; bornes temporelles ou état machine (ouverte / clôture en cours / clôturée). |
| **Relations** | Parent : caisse ; ancêtre : site ; enfant : ventes / transactions rattachées à la session. |
| **Cycle de vie** | Ouverture → étapes métier → clôture ; cas différés (dates réelles) = logique produit, pas sync externe (audit §3.6). |
| **Lien brownfield** | `/v1/cash-sessions/*`, `current`, `step` (audit §3.1). |

### 2.4 Poste de réception

| Aspect | Spécification |
|--------|----------------|
| **Identité** | Identifiant stable de **poste** de saisie réception (flux matière). |
| **Champs obligatoires** | Identifiant ; **site** ; état ouvert / fermé ; éventuellement mode différé (`opened_at` etc. brownfield). |
| **Relations** | 1 site → N postes ; poste → tickets / lignes en cours. |
| **Cycle de vie** | Ouverture par opérateur autorisé → traitement → fermeture. |
| **Lien brownfield** | `/v1/reception/postes/*` (audit §3.2). |

### 2.5 Rôle

| Aspect | Spécification |
|--------|----------------|
| **Identité** | Rôle métier ou organisationnel **attribué à un utilisateur** dans un périmètre (souvent site), distinct du **groupe** (voir §5). |
| **Champs obligatoires** | Clé technique stable du rôle ; périmètre d'application (ex. site) ; rattachement utilisateur. |
| **Relations** | Utilisateur ↔ rôles (N) dans le cadre autorisé ; le rôle peut **conditionner** l'éligibilité à des groupes ou des actions. |
| **Cycle de vie** | Attribution / révocation côté admin ; revalidation possible après changement sensible (§6). |
| **Lien brownfield** | Modèle admin utilisateurs / permissions (audit §3.4). |

### 2.6 Groupe

| Aspect | Spécification |
|--------|----------------|
| **Identité** | Identifiant de **groupe** de permissions (ensemble nommé géré côté admin). |
| **Champs obligatoires** | Identifiant groupe ; libellé d'affichage (UI) ; liste de **clés de permission** associées (côté serveur). |
| **Relations** | Utilisateur ↔ groupes (**multi-appartenance**) ; groupe ↔ permissions (N-N conceptuel). |
| **Cycle de vie** | CRUD admin groupes ; adhésion utilisateur ; changements imposent recalcul des permissions effectives. |
| **Lien brownfield** | `GET /v1/admin/groups`, liaison permissions / utilisateurs (audit §3.4). |

### 2.7 Permissions (effectives)

| Aspect | Spécification |
|--------|----------------|
| **Identité** | Non une entité persistante unique : **ensemble calculé** pour un couple (opérateur, contexte) à un instant T. |
| **Champs obligatoires (résultat)** | Liste de **clés techniques stables** (`permissionKeys` ou équivalent) ; éventuellement métadonnées de fraîcheur / version de politique (à figer OpenAPI 1.4). |
| **Relations** | Dérivé de : groupes, rôle(s), politique site/caisse, contraintes session et poste. |
| **Cycle de vie** | Recalcul à la connexion, au changement de contexte, après admin CRUD, après step-up ; **jamais** « figé » par le seul client. |
| **Lien brownfield** | `GET /v1/users/me/permissions` à canonicaliser (audit §3.4, backlog B1). |

### 2.8 PIN

| Aspect | Spécification |
|--------|----------------|
| **Identité** | Secret court lié au **compte opérateur** (ou politique équivalente) pour authentification rapide ou **step-up**, selon produit. |
| **Champs obligatoires** | Stockage et transport **hors spec documentaire** ; ici : existence d'un **état** « PIN configuré / non configuré », politique de verrouillage après échecs (détail implémentation Epic 2). |
| **Relations** | Compte utilisateur ; flux auth `/v1/auth/pin` (audit §3.3) ; mécanisme de **revalidation** pour actions sensibles (§6). |
| **Cycle de vie** | Définition, rotation, révocation ; ne **jamais** apparaître en clair dans logs, manifests ou documents. |
| **Lien brownfield** | Auth PIN, login (audit §3.3, §5 surfaces sûres). |

---

## 3. Invariants d'isolation (« zéro fuite »)

Les implémentations futures **doivent** garantir :

| Invariant | Énoncé |
|-----------|--------|
| **Inter-site** | Aucune donnée ni action métier d'un site A ne doit être accessible depuis un contexte actif site B sans **changement de contexte explicite** validé serveur et permissions recalculées. |
| **Inter-caisse** | Session et ventes de la caisse C1 ne sont pas mélangées à C2 ; sélection ou bascule explicite avec contrôle serveur. |
| **Inter-session** | Clôture ou expiration de session invalide les jetons d'action liés ; pas de réutilisation « silencieuse » d'un contexte session mort. |
| **Inter-poste (réception)** | Tickets et lignes rattachés au poste P ne s'appliquent pas à P' sans transition métier définie. |
| **Inter-opérateurs** | Préférences, brouillons ou verrous d'un opérateur ne deviennent pas permissions ou contexte d'un autre ; pas d'**escalade implicite** via UI partagée. |

**Violation** : toute API ou cache qui expose des IDs ou actions hors périmètre du `ContextEnvelope` courant **valide serveur** est non conforme.

---

## 4. Règles de bascule de contexte et recalcul

### 4.1 Types de bascule (exemples)

| Événement | Préconditions (conceptuelles) | Effet attendu | Invalidation / recalcul |
|-----------|-------------------------------|---------------|-------------------------|
| Sélection / changement de **site** | Utilisateur autorisé sur le site cible | Nouveau périmètre ; caisses / postes listés pour ce site | **Recalcul complet** ContextEnvelope + permissions |
| Ouverture **session caisse** | Caisse disponible ; droits caisse ; pas de session concurrente invalide | Contexte actif caisse + session | Recalcul ; émission nouvelle enveloppe |
| Clôture **session caisse** | Session ouverte ; règles métier de clôture respectées | Fin du contexte d'encaissement | Invalidation actions caisse ; recalcul |
| Ouverture / fermeture **poste réception** | Droits réception sur site | Contexte poste actif ou absent | Recalcul partiel (réception) |
| Changement **groupe / rôle** (admin) | Droits admin | — | **Recalcul obligatoire** à la prochaine requête autorisée ; option : invalidation session selon politique Epic 2 |
| Déconnexion / expiration token | — | Perte de tout contexte métier | Blocage ; pas de dégradation « fantôme » |

### 4.2 Recalcul explicite du ContextEnvelope

- Le **recalcul** est une opération **côté serveur** déclenchée par : login, refresh, changement de contexte utilisateur, réponse à un step-up, ou événement admin affectant les droits.
- Le client peut **demander** une enveloppe fraîche (endpoint dédié — à figer en 1.4 / 2.2) ; il ne **construit** pas l'enveloppe à partir de manifests ou de libellés.
- **Sémantique produit des états runtime** (alignée stub UI actuel) : `ok` (contexte cohérent et autorisé), `degraded` (exploitation limitée explicitement — pas d'inférence d'accès complet), `forbidden` (blocage dur). Les noms exacts et champs additionnels sont **OpenAPI 1.4**.

---

## 5. Modèle additif des permissions

### 5.1 Union / composition

- L'ensemble effectif = **union** des permissions accordées via tous les **groupes** membres, plus toute règle **additive** liée au **rôle** ou à la politique site (sans double soustraction implicite côté client).
- En cas de conflit métier futur (deny explicite), la politique **doit** être définie côté serveur et documentée dans OpenAPI / politique authz — **hors** présent document si non encore tranché ; la v2 par défaut est **additive pure**.

### 5.2 Clés techniques stables

- Convention : identifiants machine **stables** (ex. `caisse.access`, `reception.poste.open`, namespaces cohérents) ; évolution par **ajout** de clés plutôt que renommage ; si renommage, fenêtre de dépréciation gouvernée (semver / changelog) — **détail 1.4**.
- Les clés sont la **seule** entrée des contrôles d'accès serveur et des manifests `critical` ; les libellés ne participent pas à la décision.

### 5.3 Libellés personnalisables

- Libellés = couche **présentation** (i18n, branding) ; stockés ou surchargés séparément des clés ; **jamais** comparés pour autoriser une action.

### 5.4 Multi-appartenance aux groupes

- Un opérateur peut appartenir à **plusieurs** groupes ; les permissions s'**additionnent**.

### 5.5 Autorité backend et méfiance envers UI / manifests

- **Les libellés UI ne sont jamais une vérité de sécurité** (AC explicite).
- Les **NavigationManifest** / **PageManifest** peuvent **cacher** ou **réorganiser** l'UX mais ne **substituent** pas au backend pour : autorisation métier, périmètre site/caisse/session/poste, ni step-up.
- Toute donnée « permission » reçue via manifeste sans validation par **ContextEnvelope** / API autorisée = **non fiable** pour la sécurité.

---

## 6. Step-up sécurité : confirmation, PIN, revalidation

### 6.1 Classes d'actions (indicatif — affinage produit Epic 2.4)

| Classe | Mécanisme minimal | Exemples |
|--------|-------------------|----------|
| **Lecture sensible** | Optionnel : confirmation légère ou cache TTL court | Données personnelles agrégées |
| **Mutation métier standard** | Permission effective + contexte valide | Ajout ligne ticket |
| **Mutation à risque** | **Confirmation** explicite (UI) + **validation serveur** idempotente | Annulation, remboursement, correction |
| **Très sensible** | **PIN** ou **re-authentification** + jeton step-up à courte durée | Clôture caisse, export massif, changement de rôle appliqué à soi-même |
| **Admin transversal** | **Revalidation** rôle / MFA selon politique | Actions impactant plusieurs sites ou comptes |

### 6.2 Comportements : blocage, dégradation, recalcul forcé

| Situation | Comportement minimal attendu |
|-----------|------------------------------|
| Contexte **stale** (site changé côté admin, session fermée ailleurs) | **Blocage** des actions métier concernées jusqu'à **recalcul réussi** ; pas d'exécution sur cache client. |
| Perte partielle de données contextuelles (réseau, 503) | **Dégradation** contrôlée : lecture hors risque éventuelle selon politique ; **pas** d'écriture sensible ; signal `degraded` explicite. |
| Permission révoquée entre-temps | **Blocage** au prochain contrôle serveur ; UI peut afficher **forbidden**. |
| Step-up requis mais non satisfait | **Blocage** ; code métier distinct de « simple » 403 permission. |
| Succès step-up | **Recalcul** ou **émission** d'une preuve courte (token / claim) pour enchaîner l'action — schéma **1.4** / impl **2.4**. |

---

## 7. Alignement contractuel (AR39, AR19)

### 7.1 Hiérarchie de vérité (AR39)

Ordre strict, du plus autoritaire au moins :

1. **OpenAPI** (`contracts/openapi/`, fichier reviewable `recyclique-api.yaml` — Story **1.4**)  
2. **ContextEnvelope** — instance runtime **dérivée du backend**, pas une seconde source parallèle inventée par le frontend  
3. **NavigationManifest**  
4. **PageManifest**  
5. **UserRuntimePrefs** — personnalisation **non métier** (Story 3.5)

Toute exposition UI du contexte actif est une **projection** ; la **décision d'accès** reste **backend**.

### 7.2 Writer canonique OpenAPI (AR19)

- **Recyclique** (Piste B) est le **writer canonique** du schéma OpenAPI ; génération versionnée, non édition manuelle anarchique — détail procédural en **1.4**.

### 7.3 Renvois sans dupliquer la gouvernance 1.4

- **`contracts/README.md`** : rôles OpenAPI / CREOS, `data_contract.source`, tags.  
- **`contracts/openapi/`** : enums, schémas, `operationId` stables — **référence future** pour les clés permission et le ContextEnvelope.  
- **`contracts/creos/`** : schémas manifests / widgets ; lien `data_contract.operation_id` ↔ OpenAPI.

La présente spec définit le **quoi** et le **pourquoi** métier ; le **comment** reviewable (YAML, CI, drift) est **1.4**.

---

## 8. Écarts et notes — `peintre-nano/src/types/context-envelope.ts` (non normatif)

Le stub **Peintre_nano** illustre une structure transitoire ; **la vérité** reste OpenAPI + backend.

| Élément stub | Intention canonique v2 (ce document) | Écart / action |
|--------------|--------------------------------------|----------------|
| `schemaVersion` | Version de schéma ContextEnvelope côté API | À aligner sur champ OpenAPI 1.4 (nom / sémantique). |
| `siteId`, `activeRegisterId` | Identifiants site + caisse active | Cohérent conceptuellement ; peuvent manquer **session caisse**, **poste réception**, **opérateur** — **à enrichir** dans le contrat final, pas dans le stub seul. |
| `permissions.permissionKeys` | Liste clés stables | Aligné §5 ; source = calcul backend. |
| `issuedAt` (number ms) | Horodatage d'émission | Forme (epoch ms vs string ISO) à trancher OpenAPI. |
| `maxAgeMs` | Fraîcheur côté UI | Préférence locale / tests — **hors** vérité sécurité ; ne pas confondre avec TTL politique serveur. |
| `runtimeStatus` : `ok` / `degraded` / `forbidden` | Vocabulaire produit pour signaler cohérence contexte (§4.2, §6.2) | **Retenu** comme intention ; schéma et codes HTTP associés en **1.4** / **2.2**. |

**Risque** : figer dans le frontend des champs ou sémantiques **avant** publication OpenAPI — mitigé en traitant ce fichier comme **stub** et en suivant la hiérarchie §7.

---

## 9. Synthèse pour Epics 2, 3, 6, 7

- **Epic 2** : implémente ContextEnvelope, calcul permissions, step-up, session — **conforme** à §2–§6.  
- **Epic 3** : runtime consommateur ; **aucune** autorité métier supplémentaire.  
- **Epics 6–7** : parcours caisse / réception **garde** les invariants §3–§4.  
- **Epic 8 / Stories 1.5–1.6** : sync Paheko **ne remplace pas** les invariants de contexte local.

---

**Données sensibles :** ce document ne contient ni secrets, ni PIN, ni dumps.
