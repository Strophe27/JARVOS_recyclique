# Spécification canonique v2 — modèle multi-contextes et invariants d'autorisation

**Date de livraison :** 2026-04-02  
**Story BMAD :** Epic 1 — `1-3-specifier-le-modele-multi-contextes-et-les-invariants-dautorisation-v2`  
**Périmètre :** sémantique métier et invariants — **pas** de schéma OpenAPI exhaustif (Story **1.4**) ni d'implémentation backend (Epics **2.x**).  
**Suite normative (agents) :** après cette spec, lire `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` (Story **1.4**) puis `contracts/README.md`. **État projet :** [references/ou-on-en-est.md](../ou-on-en-est.md).  
**Références croisées :** audit brownfield `2026-04-02_02_audit-brownfield-backend-api-donnees-critiques.md`, `epics.md` (Story 1.3, AR19, AR39), `guide-pilotage-v2.md` (Pistes A/B).  
**Dernière mise à jour (HITL terrain) :** 2026-04-02 — §1 bis, §3.0 ; **§4.0 / §4.2** renvoient à **§4.4** (périmètre `degraded`, fraîcheur enveloppe) ; **§4.3–§4.4** — panel super-admin (extensions PIN, dégradé, audit, matrice step-up) + rappel **non** optionnalisable ; §5.0 (C) ; **§6.0 (D + E)** ; **§6.3** ; §2.8 ; recherche Perplexity : `references/recherche/2026-04-02_pin-ouverture-caisse-operateur-pos-rgpd_perplexity_reponse.md`. **Alignement dépôt :** story 1.3 (File List, Completion Notes, `references/index.md`) revue le même jour — contenu normatif inchangé.

---

## Traçabilité Acceptance Criteria → sections

| Bloc Given/When/Then (Story 1.3) | Sections qui répondent |
|----------------------------------|-------------------------|
| Isolation stricte sites / caisses / sessions / postes / opérateurs ; entités minimales ; invariants zéro fuite ; règles de changement de contexte ; paramètres d'exploitation et extensions panel super-admin | §2, §3, §4 (dont §4.3–§4.4) |
| Permissions additives calculées par Recyclique ; clés stables ; libellés ; multi-groupes ; autorité backend ; UI jamais vérité sécurité | §5 |
| Step-up (confirmation, PIN, revalidation) ; quand bloquer / dégrader / recalcul explicite du contexte ; cycle de vie session métier PIN | §6 |
| Alignement hiérarchie de vérité et contrats (préparation 1.4) | §7 |
| Écarts stub Peintre_nano | §8 |

---

## 1. Principes directeurs

1. **Une seule autorité pour l'autorisation métier** : le backend Recyclique calcule et impose les permissions effectives et le contexte d'exploitation exposé au client. Toute couche UI, manifeste ou cache local ne fait qu'**afficher** ou **demander** ; elle ne **décide** pas l'accès métier.
2. **ContextEnvelope comme projection runtime** : instance dérivée du backend, matérialisée dans les contrats (OpenAPI) en **1.4** et en code en **2.2** — voir §7.
3. **Permissions additives** : l'ensemble effectif est une **union** (ou composition additive définie) des droits issus des groupes et du rôle ; l'absence de permission ne s'« annule » pas par un libellé ou un flag UI.
4. **Step-up distinct du filtrage d'affichage** : masquer un bouton ne suffit pas ; les actions sensibles exigent des garanties renforcées côté serveur (§6).

---

## 1 bis. Contexte associations et vocabulaire terrain

- La v2 cible en particulier des **associations / ressourceries**. Sur le terrain, le terme **opérateur** (tel qu'utilisé dans ce document et dans les AC) correspond au **bénévole** : personne avec en général **l'accréditation la plus faible** sur un site, dont l'accès aux parties de l'application dépend de ce que l'organisation a configuré (groupes, rôles, permissions — toujours **calculées par le backend**).
- Les **administrateurs** (profils à **accréditation plus élevée** ; les **clés techniques** exactes seront figées en OpenAPI **1.4** / politique authz **Epic 2**) peuvent être **habilités** à des actions **hors périmètre bénévole** (ex. intervention sur un autre site pour un réglage). Ce n'est **pas** le profil par défaut du bénévole.
- Partout où le document dit « opérateur », sauf mention contraire, lire **d'abord** le cas **bénévole** ; les règles d'isolation §3 s'appliquent ; les **exceptions** passent par des **permissions explicites** sur le compte, pas par le libellé d'un rôle à l'écran.

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
| **Identité** | Secret court lié au **compte utilisateur** (tout profil **habilité** sur le poste métier) ; le **cas d'usage principal** terrain reste le **bénévole** (§1 bis). Les comptes à **accréditation plus élevée** (admin local, super-admin, etc.) utilisent le **même mécanisme PIN** lorsqu'ils agissent sur un **poste métier** (caisse, réception) — **pas** un second système parallèle. Distinct du **mot de passe web** (§6.0 D2). |
| **Champs obligatoires** | Stockage et transport **hors spec documentaire** ; politique produit **adoptée** : §6.0 **E** (format, lockout, reset, caisse vs réception). **Fin / reprise** de session métier PIN : §6.3. Implémentation détaillée **Epic 2.4** / **FR71**. |
| **Relations** | Compte utilisateur ; flux auth `/v1/auth/pin` (audit §3.3) ; mécanisme de **revalidation** pour actions sensibles (§6). |
| **Cycle de vie** | Définition, rotation, révocation ; **ouverture et clôture** de la **session métier** sur le poste (déconnexion explicite, timeout, reprise par profil habilité — §6.3) ; ne **jamais** apparaître en clair dans logs, manifests ou documents. |
| **Lien brownfield** | Auth PIN, login (audit §3.3, §5 surfaces sûres). |

---

## 3. Invariants d'isolation (« zéro fuite »)

### 3.0 Profil bénévole par défaut et franchissement réservé aux habilitations « administration »

*Validé en relecture terrain (HITL) le 2026-04-02.*

- **Bénévole (opérateur par défaut)** : en l'absence de permission explicite autorisant autre chose, il **ne** doit **pas** voir ni agir sur un **autre site**, une **autre caisse**, une **autre session de caisse**, un **autre poste de réception**, ni sur le contexte d'**un autre opérateur**. Être « autorisé sur plusieurs sites » ou franchir ces périmètres = **décision de configuration** (habilitations), matérialisée par le **calcul serveur** des permissions et par un **changement de contexte explicite** quand la story métier l'exige — **jamais** par un simple enchaînement d'écran sans validation serveur.
- **Administrateur** (sens terrain : accréditation élevée, à préciser par **clés** en 1.4) : peut recevoir des droits qui **permettent** ces franchissements lorsque c'est **nécessaire** (ex. aller sur un autre site pour régler un problème). L'interface peut offrir plus de gestes ; **chaque** action reste **autorisée ou refusée par le backend** selon les permissions effectives au moment T.
- Les deux cas ci-dessus sont **compatibles** avec le tableau d'invariants ci-dessous : il n'y a **pas** de « fuite » silencieuse ; un admin autorisé **change** de périmètre ou agit dans un périmètre **explicitement** couvert par ses droits, avec **recalcul** d'enveloppe / permissions comme en §4.

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

### 4.0 Visibilité des changements et contexte « perdu » (HITL terrain 2026-04-02)

**Règle produit — geste volontaire et visible**  
Pour le **bénévole** comme pour les profils plus élevés : tout **changement de contexte** pertinent pour la sécurité ou le périmètre métier (site, caisse, session caisse, poste de réception) doit résulter d'un **geste volontaire** de l'utilisateur **et** être **visible** à l'écran (ou équivalent clairement perceptible : bannière, écran dédié, message explicite). On **n'impose pas** à l'utilisateur de deviner qu'il n'est plus sur le même site ou la même session.

**Glossaire — « changement en arrière-plan » (à proscrire en v2)**  
On appelle ainsi une situation où le **contexte effectif** côté serveur (ou les permissions) **change** alors que l'utilisateur **n'a pas fait** d'action intentionnelle correspondante **et** que l'interface **ne le signale pas** clairement. Exemples types (à éviter par conception) :

- le **site actif** ou la **session** change sans écran de confirmation ni indication visible ;
- l'utilisateur croit encore être en caisse alors que la session a été **fermée ailleurs** ou **révoquée**, sans message immédiat ;
- une **mise à jour silencieuse** laisse l'écran sur d'anciennes données alors que le backend a déjà invalidé le contexte.

La v2 vise **zéro** bascule métier « surprise » : si le serveur invalide ou modifie le contexte, le client doit **refléter** l'état (recalcul, message, écran de reprise) — aligné §6.2 (contexte stale).

**Contexte ambigu ou incohérent (site non choisi, session douteuse, etc.)**  
*Préférence terrain validée HITL :* **bloquer** les actions métier sensibles jusqu'à ce que le contexte soit **rétabli** de façon explicite (reconnexion, re-sélection site, nouvelle session, selon le cas).  
**Mode limité** (`degraded` — §4.2, §6.2) n'est acceptable **que** si l'interface indique **clairement** ce qui reste autorisé et ce qui est interdit ; sinon, rester sur **blocage** plutôt que laisser l'utilisateur dans le flou. L'affinage détaillé (**quel** périmètre — écrans, familles d'actions — reste autorisé en limité, **borné** par le produit et **paramétrable** super-admin) : **§4.4** ; **design UX** et **Epic 2** pour l'implémentation concrète, dans le cadre de cette règle.

---

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
- **Paramétrage** du périmètre concret en `degraded` (familles d'écrans / types d'action autorisés en lecture ou limité) et des **déclencheurs / TTL** côté client pour **demander** une enveloppe fraîche : **§4.4** — le **recalcul et la décision d'autorisation** restent **serveur** (puces ci-dessus et §3).

### 4.3 Paramètres d'exploitation — **panel super-admin** (durées, variantes, tout optionnel côté politique)

*Complément HITL / produit 2026-04-02 ; précision 2026-04-02 : tout le paramétrage opérationnel est **éditable** par le **super-admin** dans son **panel dédié**.*

Les **invariants** §3–§4 (zéro fuite, pas de bascule silencieuse) restent **fixes** : le moteur **refuse** toute configuration qui les violerait. En revanche, **tout ce qui concerne les durées, les seuils, et les variantes de comportement** entre **session web** et **session métier PIN** (et les autres sujets listés ci-dessous) relève d'une **politique d'exploitation** : **réglable** par **super-admin** via le **panel super-admin** (avec **valeurs par défaut** au déploiement, **audit** des changements, et **bornes** serveur pour ne pas descendre **sous** un plancher de sécurité — ex. lockout PIN §6.0 E, interdiction des bascules silencieuses).

**Principe :** rien de tout cela n'est une **constante figée** dans le client ; le **serveur** applique la politique **effective** pour l'instance (ou la ressourcerie, selon modèle **Epic 2**).

| Famille (exemples — toutes **configurables** super-admin dans les limites de sécurité) | Rôle |
|----------------------------------------------------------------------------------------|------|
| **Inactivité** avant retour écran PIN (caisse / réception) | Durée(s) ; éventuellement **différent** caisse vs réception |
| **Durée de vie** jeton / preuve **step-up** après PIN réussi | TTL ; renouvellement |
| **Session web** vs **session métier PIN** | **Variantes** : ex. « quitter la caisse » **ferme-t-il aussi** la session navigateur ou **non** ; délai d'expiration **session web** indépendant ou lié ; **tout reste une option** de politique, pas un choix unique imposé par la spec |
| **Reprise admin** (§6.3) | Activer **A** et/ou **B** ; ordre d'affichage des gestes ; qui peut « forcer la sortie » |
| **Timeouts** divers (idle UI, rappels avant verrouillage) | Valeurs, activation / désactivation **dans les bornes** |

L'**inventaire exact** des clés, leurs min/max, l'UX du panel et les contrats **OpenAPI 1.4** relèvent de **Epic 2** ; la présente spec impose : **une couche de configuration super-admin** pour ces sujets, **pas** un comportement unique codé en dur sans possibilité de l'**adapter** par instance.

### 4.4 Extensions recommandées — paramétrage fin **super-admin** (même esprit que §4.3)

*Complément produit 2026-04-02 : leviers additionnels **éditables** dans le **panel super-admin**, avec **défauts**, **audit** des changements et **bornes** serveur (planchers / plafonds) pour ne pas violer §3–§4 ni la sécurité minimale.*

Les familles ci-dessous **complètent** le tableau §4.3 ; elles ne remplacent pas les invariants ni §6.0 **E** (qui fixe l’**intention** métier), mais en **déclinent** les **paramètres numériques** et **options** là où c’est pertinent.

| Extension | Rôle (paramétrable super-admin, dans les bornes) |
|-----------|--------------------------------------------------|
| **Politique PIN §6.0 E — détail** | Durée de **pause** après lockout (ex. 5 min) ; nombre d’**échecs** consécutifs avant pause (dans l’intervalle **3–5** ou plage étendue **si** le produit fixe un min/max) ; seuil **échecs / journée** avant escalade (ex. 10) ; **liste** des PIN **triviaux** interdits (évolutive) ; **afficher ou non** le **compteur** de tentatives restantes à l’UI. |
| **Caisse vs réception — colonnes parallèles** | Où le doc prévoit déjà une **sévérité** différente (lockout, timeouts), le panel expose des **réglages distincts** **caisse** / **réception** (même moteur, **scopes** séparés). |
| **Préavis avant verrouillage PIN** | **Avertissement** utilisateur **X secondes / minutes** avant retour écran PIN pour **inactivité** (activation on/off, durée) — aligné visibilité §4.0. |
| **Mode `degraded`** | **Sémantique** des états et règle « clair pour l’utilisateur » : **§4.2**, **§4.0**. Ici : **quelles familles** d’écrans ou **types d’action** restent autorisées en **lecture seule** ou **limité** ; le **super-admin** resserre ou élargit **dans un plafond** produit (on **n’autorise jamais** par config l’écriture sensible « comme si tout allait bien »). |
| **Fraîcheur du `ContextEnvelope`** | **Déclencheurs** de recalcul côté client (ex. à chaque navigation, toutes les **N** minutes, après certaines mutations) — compromis **perf** / **fraîcheur** ; le serveur impose un **minimum** de cohérence (pas de contournement des invariants). |
| **Audit et conformité** | **Rétention** des journaux pour événements **PIN**, **reprise admin**, **déconnexion métier forcée** ; **niveau de détail** (champs masqués, durées de conservation) — sous contraintes légales / RGPD (voir recherche archivée §6.0). |
| **Matrice step-up (futur)** | Une fois les **`operationId`** et familles d’actions stabilisés (**Epic 2**, **1.4**), le **super-admin** peut **assigner** à chaque **famille** le mécanisme minimal : **confirmation** seule, **PIN** (longueur / politique), **revalidation** / **MFA** — **sans** que les libellés UI deviennent source de décision (§5, §6). |

#### Ce qui **n’est pas** optionnalisable par simple toggle panel

- **Modèle additif pur** vs introduction d’une politique **deny** explicite : **changement d’architecture** moteur, pas un réglage UI isolé (§5.1).  
- **Hiérarchie AR39** (`OpenAPI` > `ContextEnvelope` > manifests > `UserRuntimePrefs`) : **non** désactivable.  
- **Principe** « **libellés UI ≠ vérité de sécurité** » : **non** contournable par configuration.  
- **Zéro fuite** et **interdiction des bascules silencieuses** : **invariants** ; seules les **durées** et **présentations** autour sont paramétrables.

---

## 5. Modèle additif des permissions

### 5.0 Relecture terrain (HITL 2026-04-02) — C1, C2 et points de vigilance

**C1 — Libellés et vérité de sécurité (validé)**  
Même si l'écran affiche un bouton, un menu ou un **nom de rôle** « sympathique », **seul le backend** tranche l'autorisation effective sur chaque action. Un libellé **ne remplace jamais** une permission calculée ; en cas de doute ou de retard d'affichage, **la réponse serveur** fait foi.

**C2 — Plusieurs groupes et cumul (validé)**  
Une même personne peut être dans **plusieurs** groupes à la fois ; les droits issus de chaque groupe se **cumulent** (union / modèle additif §5.1, §5.4).

**Éléphants possibles (pas des objections à C1/C2 — des conséquences à anticiper)**  

1. **L'additif ne « retire » rien tout seul** — Ajouter quelqu'un à un groupe **supplémentaire** ne lui **enlève** pas ce que lui donnait un autre groupe. Si un jour vous voulez des règles du type « ce groupe **interdit** explicitement telle action », ce n'est **pas** le comportement par défaut de la v2 ; il faudrait trancher une politique **deny** explicite (déjà mentionnée en §5.1 comme sujet futur si besoin). Tant que ce n'est pas tranché, on reste sur **additive pure**.

2. **Cumul = vigilance à la configuration** — Plus une personne est dans de **nombreux** groupes (ou des groupes **très larges**), plus l'ensemble des permissions effectives **grossit**. Le risque n'est pas « C2 est faux », c'est : **mal configurer** les groupes au tableau d'admin et se retrouver avec des bénévoles qui ont **trop** de clés sans s'en rendre compte. La spec dit **comment** le moteur combine ; **vous** gardez la main sur **qui** est dans **quel** groupe.

**Recommandation d'exploitation (process — intégration 2026-04-02)**  
Privilégier **peu de groupes**, **noms explicites**, **périmètre serré**. À l'assignation : **minimum de groupes** par personne (moindre privilège). Prévoir une **revue périodique** des adhésions (turnover des bénévoles). Le moteur additif reste **simple** ; le **réglage admin** fait la qualité de sécurité.

---

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

### 6.0 Décisions terrain (HITL blocs D et E — 2026-04-02)

**D1 — Confirmation (« es-tu sûr ? ») + validation serveur**  
En plus des cas déjà listés en §6.1, le terrain **associations / ressourcerie** valide au minimum une **confirmation explicite** pour :

1. Les opérations **super-admin** ou à **très fort impact** (configuration système, surfaces touchant largement l'intégrité ou la confidentialité des données).
2. Les **éditions ou corrections** portant sur des **documents métier engagés** : **ticket de caisse**, **ticket de réception** (ou équivalents), dès qu'il s'agit d'une **donnée critique** au sens exploitation.
3. De manière générale : toute **mutation** sur une **donnée jugée critique et sensible** — la **liste exhaustive** des `operationId` / écrans concernés sera **affinée** en **Epic 2** (matrice step-up) et en **gouvernance 1.4** ; la spec 1.3 fixe le **principe** et des **familles** d'exemples, pas le catalogue final.

**D2 — PIN (distinct du mot de passe de connexion) — rôles séparés**  
- **Mot de passe de connexion (web)** : ouvre l'accès à la **plateforme** et aux écrans autorisés selon l'**habilitation** (super-admin, **bénévole**, etc.) — toujours **décision serveur** (permissions calculées).  
- **PIN** : ne remplace **jamais** ce calcul. Il sert à **ouvrir** ou **déverrouiller** une **session métier** sur un **poste** (caisse, réception, futurs modules pour lesquels la personne est accréditée) : **preuve de présence / intention** au moment critique, une fois les droits déjà accordés.  
- **Usage validé terrain** : notamment **ouverture / déverrouillage session caisse** ; même logique pour **poste de réception** et extensions futures, avec **scopes** distincts (voir **E** ci-dessous).
- **Accès « panel » admin / super-admin depuis un navigateur** (hors poste caisse ou réception) : le **PIN poste métier** n'est **pas** obligatoirement le même geste que l'accès à ces écrans — on s'appuie sur **mot de passe web**, **revalidation** ou **MFA** selon politique **Epic 2** / §6.1 « Admin transversal ». En revanche, **sur le poste caisse ou réception**, un **admin habilité** saisit **son PIN** comme tout autre compte autorisé, pour les actions que ses **permissions** lui permettent (reprise de main, déblocage, etc. — §6.3).

**E — Politique PIN adoptée pour la v2 (décision produit)**  
Les règles suivantes **figent l'intention métier** pour le backlog Recyclique v2. L'**implémentation** (endpoints, codes d'erreur, bornes exactes des compteurs, paramètres éditables super-admin) reste **Epic 2.4** / **FR71** et contrats **OpenAPI 1.4**. L'argumentaire et références externes : **`references/recherche/2026-04-02_pin-ouverture-caisse-operateur-pos-rgpd_perplexity_reponse.md`**.  
**Paramètres numériques** et options de politique (lockout, préavis, compteur UX, caisse vs réception, etc.) : **§4.3–§4.4**.  
Dans les tableaux, **« opérateur »** = **bénévole / utilisateur terrain** au sens §1 bis (sauf mention contraire pour profils administration).

| Thème | Décision adoptée |
|--------|------------------|
| **Format** | Longueur **min. 4 chiffres** ; **6 chiffres recommandés** pour actions très sensibles (annulation, remboursement, forçage d'ouverture, etc.). |
| **Qualité** | Interdire les PIN **triviaux** (`1234`, `0000`, `1111`, etc.) ; liste et règles affinables en configuration. |
| **Stockage** | **Haché + salé** (ex. Argon2id ou bcrypt) ; **jamais** en clair ; **personne** ne peut lire le PIN d'un tiers. |
| **Lockout** | Après **3 à 5** échecs consécutifs : **pause 5 minutes** avant nouvel essai (borne 3–5 à fixer en impl., dans cet intervalle). |
| **Escalade** | Après **10** échecs sur une **journée** : notification / escalade vers **admin local** (responsable site ou équivalent). |
| **UX** | Afficher un **compteur** de tentatives restantes ; **pas** de verrouillage **définitif** sans procédure de déblocage documentée. |

**Qui peut réinitialiser le PIN ?**

| Acteur | Peut | Trace d'audit |
|--------|------|----------------|
| **Admin local** (responsable ressourcerie / périmètre site) | Réinitialiser le PIN d'un **bénévole** (ou utilisateur) de **son** site | Oui — horodaté, identité de l'admin |
| **Super-admin** | Réinitialiser tout PIN, débloquer compte gelé | Oui — idem ; alerte vers admin local si politique retenue |
| **Le bénévole lui-même** | Changer son PIN (**ancien PIN** requis) | Oui |
| **Quiconque** | Voir le PIN en clair | **Non** (hash irréversible) |

**Réinitialisation par admin** : générer un **PIN temporaire à usage unique** ; le bénévole doit le **changer** à la prochaine utilisation métier (principe).

**Caisse vs réception** : **un seul mécanisme PIN** côté produit ; **scopes** / clés permission **distincts** (ex. session caisse vs session poste réception) — pas deux piles techniques incompatibles. La **sévérité** du lockout pourra être **plus stricte caisse, plus souple réception** en paramétrage ultérieur ; le socle reste unique.

**Recherche externe (archivée)** : **`references/recherche/2026-04-02_pin-ouverture-caisse-operateur-pos-rgpd_perplexity_reponse.md`** — POS, RGPD/CNIL, conservation logs vs obligations comptables : **ne remplace pas** ce paragraphe **E** ; sert de **fond documentaire** et de citations pour Epic 2 / conformité.

**Piste encore ouverte (affinement Epic 2)**  
Les **flux détaillés** (endpoints, ordre des écrans, distinction stricte cookie web vs jeton métier PIN) et le raffinement « **poste physique enregistré** vs **navigateur partagé** » restent à **trancher en implémentation** — **§6.3** ci-dessous fixe déjà les **obligations produit** (déconnexion, timeout visible, reprise admin). Dans tous les cas : **cohérence** avec §3–§4 (aucun changement de contexte **silencieux**).

### 6.3 Session métier PIN : fin, timeout, déconnexion explicite et reprise par un profil habilité

*Complément HITL / produit 2026-04-02 — associations / ressourcerie, poste caisse ou réception.*

Après une saisie **PIN** réussie, une **session métier** (liée à la **caisse**, au **poste de réception** ou module équivalent) est considérée comme **active sur ce poste** pour ce **compte utilisateur**, sous réserve des permissions déjà calculées par le backend. Cette couche est **distincte** de la **session web** navigateur lorsque l'architecture la sépare (détail **Epic 2** / **1.4**) ; l'important est que **toute fin** de session métier PIN soit **comprise** par la personne à l'écran (aligné §4.0).

**1. Déconnexion explicite du contexte PIN (« quitter la caisse » / équivalent)**  
- L'interface doit offrir une action claire (**bouton ou flux dédié**) pour **terminer** la session métier PIN sur le poste : **déverrouillage** ou **sortie** du mode « caisse / réception sous PIN ».  
- Effet minimal attendu : **invalidation côté serveur** du contexte métier PIN pour ce poste ; retour à l'écran **saisie PIN** (ou équivalent) avant toute nouvelle action métier sensible.  
- **Coexistence avec la session web** : la spec **n'impose pas** un seul comportement — le **super-admin** règle dans le **panel** si « quitter la caisse » **prolonge** seule la session navigateur, **ou** déclenche **aussi** une déconnexion web (ou autres variantes **optionnelles**), dans les **bornes** §4.3. **Toujours** : l'état **métier** est **clos** côté serveur ; **jamais** de caisse « ouverte » fantôme.

**2. Timeout / inactivité**  
- En l'absence d'action métier pendant une durée définie (**paramétrable** §4.3 / panel super-admin), le système **ramène** l'utilisateur à l'écran **PIN** (ou état équivalent **bloqué** pour les écritures sensibles).  
- Le passage doit être **visible** (message, écran de reprise) — **pas** une expiration silencieuse qui laisserait croire que la caisse est encore « ouverte » au sens métier. Les **durées** et éventuels **préavis** avant verrouillage sont des **options** de configuration super-admin.

**3. Reprise par un administrateur (bénévole encore sous PIN, besoin de prendre la main)**  
Lorsqu'un **bénévole** (ou utilisateur terrain) est encore dans une **session métier PIN** active et qu'un **profil à accréditation plus élevée** doit intervenir **sur le même poste physique**, le **super-admin** **active** ou **désactive** et **combine** les familles suivantes selon la **politique** de l'instance (**panel** §4.3). Désactiver **toutes** les voies de reprise sans alternative relève d'un **choix d'exploitation** (déconseillé) — hors périmètre de cette spec ; le détail UX est **Epic 2**.  

| Famille | Comportement minimal |
|---------|----------------------|
| **A — Saisie du PIN de l'admin sur le poste** | L'admin saisit **son propre PIN** ; le backend **invalide** le contexte métier du **premier** utilisateur et **établit** le contexte métier pour l'**admin** **si et seulement si** ses permissions effectives le permettent. **Trace d'audit** : identité de l'admin, horodatage, poste / caisse (ou réception) concerné, et le fait qu'une **reprise** a eu lieu. |
| **B — Déconnexion métier forcée puis nouveau PIN** | Un geste réservé aux **profils habilités** (ex. « Forcer la sortie caisse ») **termine** la session métier du bénévole ; l'écran revient à la **saisie PIN** ; l'admin (ou un autre utilisateur autorisé) saisit ensuite **son** PIN. Même exigence d'**audit**. |

- **Interdit** : deux **contextes métier PIN** « actifs » **silencieusement** pour deux identités sur le même poste sans transition **serveur** explicite et **visible** pour l'utilisateur présent.

**4. Synthèse**  
**Bouton de déconnexion PIN** + **timeout** + **reprise admin** sont des **exigences produit v2** pour le cycle de vie du **verrou métier** sur poste. Les **durées**, **variantes** (lien ou non avec déconnexion web), et **activation** des modes de reprise sont **réglables** par **super-admin** (**panel** + §4.3). L'implémentation (UI, endpoints, codes d'erreur) est **Epic 2.4** / **2.2** et **OpenAPI 1.4**.

---

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
| **Fin** session métier PIN (déconnexion explicite, timeout §6.3, reprise admin) | **Invalidation** contexte métier côté serveur ; retour état **PIN requis** pour nouvelles écritures sensibles ; **recalcul** ContextEnvelope ; **audit** si reprise / déconnexion forcée. |

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

- **Epic 2** : implémente ContextEnvelope, calcul permissions, step-up, session — **conforme** à §2–§6 (y compris **§4.3–§4.4** panel super-admin : paramètres, extensions PIN / dégradé / fraîcheur / audit / matrice step-up, **§6.3** cycle de vie session métier PIN).  
- **Epic 3** : runtime consommateur ; **aucune** autorité métier supplémentaire.  
- **Epics 6–7** : parcours caisse / réception **garde** les invariants §3–§4.  
- **Epic 8 / Stories 1.5–1.6** : sync Paheko **ne remplace pas** les invariants de contexte local.

---

**Données sensibles :** ce document ne contient ni secrets, ni PIN, ni dumps.
