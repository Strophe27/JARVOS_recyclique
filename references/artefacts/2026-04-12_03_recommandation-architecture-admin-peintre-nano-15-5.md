# Story 15.5 — Recommandation d'architecture admin sous Peintre_nano (mutualisation contract-driven)

**Date :** 2026-04-12  
**Story :** `15-5-produire-la-recommandation-darchitecture-pour-un-admin-peintre-nano-mutualise`  
**Epic :** 15  
**Entrées consolidées :** inventaire **15.1** (`2026-04-12_01_inventaire-surfaces-admin-legacy-15-1.md`), cartographie **15.2** (`2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md`), patterns **15.3** (`2026-04-12_02_patterns-mutualisables-anti-patterns-admin-legacy-15-3.md`), matrice **15.4** (bloc Epic 15 dans `2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`).  
**Normes Peintre :** `peintre-nano/docs/03-contrats-creos-et-donnees.md`, ADR P1/P2 `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md`, checklist `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`.

---

## 1. Objectif et principe directeur

Fournir une **recommandation actionnable** pour découper les futurs epics de portage admin vers Peintre_nano, en **maximisant la mutualisation** sans recréer une **seconde vérité métier** dans le front.

**Principe unique :** tout écran admin porté sous Peintre doit pouvoir être décrit comme une **chaîne reviewable** :

`OpenAPI` (autorité données / opérations) → `ContextEnvelope` (bornage contexte) → manifests CREOS (`NavigationManifest`, `PageManifest`) → runtime (rendu, guards, fallbacks) → `UserRuntimePrefs` (personnalisation locale **non métier**).

Le legacy a montré des **familles de patterns** répétées (§15.3) et des **écarts de contrat** (§15.2) : l'architecture cible **réinjecte** ces familles dans des **briques réutilisables** plutôt que de cloner écran par écran.

---

## 2. Taxonomie cible des briques admin

| Brique | Rôle | Où vit la « vérité » | Exemples issus du corpus 15.x |
|--------|------|----------------------|-------------------------------|
| **Widget CREOS** | Unité déclarative dans un `PageManifest` : slot, `data_contract` pointant vers un `operation_id` OpenAPI, états vides / erreur / stale visibles. | Contrat (OpenAPI + schéma manifeste) ; le widget **orchestre l'affichage**, pas la règle métier. | Tableau de sessions, liste utilisateurs, bloc KPI alimenté par agrégats API. |
| **Composant partagé (registre Peintre)** | Primitive React **hors** manifeste : layout interne, accessibilité, composition Mantine + CSS Modules (ADR P1). Réutilisé par plusieurs widgets ou pages. | Style et ergonomie ; **pas** de permission ni schéma métier inventé localement. | Barre de filtres générique, toolbar titre + CTA, pagination, modale de confirmation. |
| **Générateur / pattern de page** | **Recette** d'assemblage : « shell liste admin », « détail ressource », « hub secondaire », « console export », « wizard sensible » (noms famille §4 du livrable 15.3). | La recette référence des **slots** et des **widgets** ; les colonnes et actions viennent des contrats. | Écrans `/admin/users`, `/admin/session-manager`, `/admin/reception-reports` → mêmes **ossatures** avec manifests différents. |
| **Garde d'accès (guard)** | Alignement route / page avec rôles, step-up, contexte : **consommation** des signaux backend / envelope, jamais recalcul « au feeling ». | Backend + OpenAPI security + ContextEnvelope. | Routes `SUPER_ADMIN` vs `adminOnly` (15.2). |
| **Connecteur données (client généré)** | Appels typés issus de `contracts/openapi/generated/` ; corrélation / audit selon conventions API. | OpenAPI. | Tous les flux list/detail/export. |

**Règle de classement :** si une brique doit exposer une **nouvelle** règle d'autorisation ou un **nouveau** schéma métier pour être utile, ce n'est **pas** un widget Peintre seul : c'est un **gap de contrat** à traiter côté `contracts/` / backend (15.2).

---

## 3. Frontières widgets / composants / générateurs

| Question | Réponse opérationnelle |
|----------|------------------------|
| Qu'est-ce qui devient **widget CREOS** ? | Tout bloc **déclaratif** répété sur plusieurs pages admin avec le **même type de liaison données** (liste, détail lecture, actions liées à des `operation_id` stables). Les variations **colonne / filtre / libellé** passent par **props / schéma manifeste** ou données contrat, pas par fork de code. |
| Qu'est-ce qui reste **composant partagé** ? | Présentation pure : grilles, accordéons filtres, boutons, tableaux **sans** décision métier ; patterns **15.3** (shell liste, bloc filtres, cartes KPI). Mantine comme bibliothèque ciblée (ADR P1), jamais exposée dans le JSON CREOS. |
| Qu'est-ce qui devient **générateur** ? | Assemblages **stéréotypés** (liste + filtres + export + pagination + garde) documentés une fois ; chaque écran admin ne réinvente pas la structure. Le générateur = **convention de page** + **template CREOS** + widgets du registre. |
| Où tracer les **variations légitimes** ? | Matrice 15.4 : colonne équivalence / dérogation ; inventaire 15.1 : intention utilisateur. Variation **métier** = persona ou risque différent (15.3 §2) ; sinon → factorisation. |

### 3.1 Décision d'architecture complémentaire — ce qu'un « générateur » n'est pas

Pour éviter une dérive vers un **moteur opaque** ou une **troisième couche de vérité**, le terme **générateur** doit être compris comme :

- une **convention d'assemblage de code** dans Peintre ;
- un **template React/slots** réutilisable ;
- éventuellement un **helper d'auteur** pour produire un `PageManifest` cohérent ;
- **jamais** un runtime qui déduit seul routes, permissions, colonnes métier ou `operation_id`.

En conséquence :

1. Les **routes** restent déclarées via manifests / navigation officielle.
2. Les **permissions** restent portées par backend + `ContextEnvelope`, puis consommées par guards / widgets.
3. Les **colonnes, actions et exports** restent traçables à un contrat backend ou à une dérogation documentée.
4. Un générateur peut **accélérer l'écriture** d'une page admin, mais il ne doit pas rendre la page **illisible sans le générateur**.

---

## 4. Règles d'assemblage des écrans admin dans Peintre

1. **Une page admin = un `page_key` + `PageManifest` officiel** promu sous `contracts/creos/manifests/` quand le slice devient pilotage (checklist PR §4).
2. **Chaque widget métier officiel** référence explicitement `data_contract.operation_id` résolu dans `recyclique-api.yaml` (checklist §3).
3. **Navigation admin** : une seule source de vérité navigable (manifeste CREOS aligné routes), pas la désynchronisation `adminRoutes.js` / `App.jsx` du legacy (anti-pattern 15.3 §3).
4. **Exports, bulk, super-admin** : tracés comme **surfaces sensibles** (15.2) : permissions, audit, idempotence / step-up documentés **avant** composition UI.
5. **Stack UI** : CSS Modules + tokens + Mantine (P1) ; refus des parallèles styled-components / Mantine / HTML styled sans règle (anti-pattern §3.1 du livrable 15.3).
6. **Fraîcheur des données** : signaux / contrats v2 (bandeau live, ContextEnvelope) plutôt que **polling ad hoc** comme stratégie unique (anti-pattern §3.4 du livrable 15.3).
7. **Parité** : chaque ligne matrice 15.4 garde une **preuve attendue** ; pas de statut « validé » sans preuve déclarée.

---

## 5. Conventions de contrats admin à stabiliser (avant / pendant les epics de portage)

| Convention | Détail |
|------------|--------|
| **Nommage `page_key` / slice** | Préfixe cohérent `page-admin-*` ou domaine (`admin-users`, `admin-session-manager`, …) ; pas de clés orphelines dans le code seul. |
| **`operation_id`** | Obligatoire sur tout widget chargé par données ; si absent d'OpenAPI → **ligne gap 15.2** + story backend ou doc avant merge Peintre. |
| **ContextEnvelope** | Champs requis pour bornes d'affichage (site, caisse, rôle effectif) ; le front **filtre** l'affichage, ne **réattribue** pas les rôles. |
| **Manifests** | `NavigationManifest` pour entrées admin transverse ; `PageManifest` pour structure slots ; pas de duplication de hiérarchie métier dans le JSX. |
| **UserRuntimePrefs** | Densité, colonnes masquées **non normatives**, tri local **non autoritaire** — conformément doc 03. |
| **Preuve** | Pour chaque nouvel écran : mise à jour **matrice 15.4** + lien inventaire 15.1 + cartographie 15.2. |

### 5.1 Bornes de la configuration admin (alignement ADR P2)

Le portage admin doit intégrer explicitement la décision **P2** : les **surcharges runtime** vivent en **PostgreSQL**, mais cela ne signifie pas que « l'admin configure le métier depuis Peintre ».

Ce qui peut relever d'une surcharge runtime admin :

- ordre local d'affichage ;
- densité / variantes de présentation ;
- colonnes masquées non normatives ;
- activation contrôlée d'un module **déjà contractualisé**.

Ce qui ne doit **pas** relever d'une surcharge runtime admin :

- création d'une nouvelle route ou d'un nouveau `page_key` uniquement côté front ;
- définition de permissions effectives ;
- ajout d'une mutation sensible sans contrat backend ;
- réécriture locale d'un workflow métier.

Autrement dit : **PostgreSQL stocke des surcharges de présentation et d'activation, pas une autorité métier alternative**.

---

## 6. Rejets explicites (ne pas refaire)

1. **Portage écran par écran** en copiant les implémentations legacy (styled vs Mantine, doubles barres de filtres) sans passage par générateur + contrats.
2. **Seconde vérité métier** : permissions déduites du JSX, schémas locaux contournant OpenAPI, état global front source d'autorité (checklist §8).
3. **Navigation sur deux tables** (config nav vs routes réelles) sans réconciliation unique.
4. **Exports sensibles** sans colonne matrice / sans traçage permission + audit (15.2, 15.4).
5. **Fichiers `_old` ou doubles implémentations** dans le chemin utilisateur sans résolution de dette (15.1 exclusions).
6. **DSL de style parallèles** non couverts par l'ADR P1.

---

## 7. Prêt au portage par familles (décision de cadrage)

Toutes les familles admin ne sont **pas** au même niveau de maturité. Pour la suite, il faut distinguer :

| Classe | Critère | Familles concernées au vu de 15.1-15.4 | Décision |
|--------|---------|-----------------------------------------|----------|
| **A — Portables après contractualisation minimale** | Pattern clair, valeur utilisateur stable, architecture cible évidente ; quelques gaps OpenAPI encore à fermer | `users`, `pending`, `cash-registers`, `sites`, `session-manager`, `reports-hub`, `reception-*` hors exports sensibles | Préparer les futurs epics de portage |
| **B — Portage bloqué par gaps de contrat / sécurité** | Le besoin est légitime mais les contrats / permissions sont trop incomplets ou risqués | `groups`, `audit-log`, `email-logs`, `settings`, détails exports bulk, stats réception permissives, `users` tant que `G-OA-03` n'est pas traité | Stories backend / contrat avant implémentation Peintre |
| **C — À maintenir hors scope ou sous arbitrage explicite** | Valeur v2 non stabilisée, surface super-admin / import / dette historique forte | `import/legacy`, `quick-analysis`, certaines vues combinées super-admin | Décision produit / HITL requise avant découpe en epic |

### 7.1 Décision ferme

Le futur découpage ne doit **pas** traiter en même temps :

- les pages **A** prêtes à être structurées sous CREOS ;
- les pages **B** qui nécessitent d'abord un assainissement des contrats ;
- les pages **C** encore sous arbitrage produit.

Sinon, l'epic suivant mélangerait :

- du **portage UI**,
- de la **remédiation backend / OpenAPI**,
- et de la **stratégie produit**,

ce qui recréerait exactement le flou que l'Epic 15 est censé lever.

---

## 8. Non-décisions et suite (story 15.6+)

- **Ordre exact des epics de portage** par domaine (utilisateurs vs caisse vs réception admin) : confié à **15.6** et au pilotage `guide-pilotage-v2.md`, en respectant les **dettes de preuve** déjà nommées en 15.4.
- **Promotion CI** des garde-fous checklist (Epic 10) : recommandé mais hors périmètre de ce document.
- **Résolution des gaps OpenAPI** listés en 15.2 : stories backend / contrat **avant** « figement » UI finale.

---

## 9. Traçabilité critères de la story 15.5

| Livrable story | Section |
|----------------|---------|
| Vocabulaire briques admin | §2 |
| Frontières widgets / composants / générateurs | §3 |
| Règles d'assemblage | §4 |
| Conventions contrats | §5 |
| Rejets approches legacy | §6 |
| Non-décisions | §8 |

---

## 10. QA documentaire (substitut `bmad-qa-generate-e2e-tests`)

| Contrôle | Preuve |
|----------|--------|
| Consolidation 15.1–15.4 | §0 entêtes + renvois sections |
| Actionnable pour futurs epics | §4–§5–§7–§8 |
| Contract-driven, pas seconde vérité | §1, §5, §6 item 2 + doc 03 |
| Alignement ADR / checklist Peintre | §2–§4, références |

**Verdict :** **PASS**.

---

## 11. Revue (CR) — synthèse

**Verdict :** **Approuvé** pour pilotage des epics admin.

- **Forces :** hiérarchie de vérité respectée ; anti-patterns 15.3 intégrés comme rejets explicites ; lien direct matrice / inventaire / cartographie.
- **Réserve 1 :** lorsque de nouveaux `operation_id` ou pages CREOS sont ajoutés, **mettre à jour** 15.2 / 15.4 dans la même PR ou story dépendante pour éviter la dérive documentaire.
- **Réserve 2 :** `users` ne doit pas être considéré « prêt au portage complet » tant que le gap sécurité `G-OA-03` de 15.2 n'est pas traité côté backend / contrat.

**Action items :**

1. Utiliser la classification **A / B / C** du §7 comme entrée obligatoire de **15.6**.
2. Ouvrir un chantier contrat / backend spécifique pour les gaps bloquants de **15.2** avant tout epic Peintre sur les familles **B**.
