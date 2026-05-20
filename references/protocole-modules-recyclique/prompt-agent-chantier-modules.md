> **Emplacement :** `references/protocole-modules-recyclique/prompt-agent-chantier-modules.md`  
> **Version :** 2026-05-20  
> **Usage :** coller ce prompt en tête de session agent (Cursor / BMAD) pour **créer ou étendre un module optionnel v2** — pas pour rédiger le pack lui-même (sauf mission explicite « rédaction chantier »).  
> **Sources normatives :** pack [`references/protocole-modules-recyclique/`](index.md) ; cadrage [`00-MOD-cadrage-chantier.md`](00-MOD-cadrage-chantier.md) ; cookbook [`06-MOD-cookbook-nouveau-module-optionnel.md`](06-MOD-cookbook-nouveau-module-optionnel.md) **Livré** ; modèle structure [`references/operations-speciales-recyclique/2026-04-18_prompt-ultra-operationnel-operations-speciales-recyclique_v1-1.md`](../operations-speciales-recyclique/2026-04-18_prompt-ultra-operationnel-operations-speciales-recyclique_v1-1.md).

Tu travailles sur le dépôt **JARVOS_recyclique** (Recyclique v2). Ta mission est de **livrer un module optionnel** (ou une extension bornée d’un module existant) en respectant la chaîne modulaire PRD §4.2 et le pack protocole modules — **sans** réintroduire l’architecture v0.1 (`module.toml`, `ModuleBase`, EventBus Redis générique).

**Prérequis lecture obligatoire (dans cet ordre, avant toute modification) :**

1. [`references/protocole-modules-recyclique/index.md`](index.md) — glossaire, ordre de lecture, hors-scope.
2. [`references/protocole-modules-recyclique/02-MOD-taxonomie-types-de-modules.md`](02-MOD-taxonomie-types-de-modules.md) — classifier le livrable (slice / workflow step / …).
3. [`references/protocole-modules-recyclique/05-MOD-registre-module-key.md`](05-MOD-registre-module-key.md) — `module_key`, statut, schéma JSON, ops OpenAPI.
4. Protocoles croisés : [`03-MOD-protocole-backend.md`](03-MOD-protocole-backend.md), [`04-MOD-protocole-front-creos.md`](04-MOD-protocole-front-creos.md).
5. **Exécution module :** [`06-MOD-cookbook-nouveau-module-optionnel.md`](06-MOD-cookbook-nouveau-module-optionnel.md) — **livré** (livrable principal pas à pas).
6. **Arbitrages ouverts :** [`09-MOD-lacunes-et-questions-ouvertes.md`](09-MOD-lacunes-et-questions-ouvertes.md) — tensions T-*, questions HITL ; **ne pas** supposer si un point y est listé.
7. Réconciliation : [`01-MOD-matrice-choix-modularite.md`](01-MOD-matrice-choix-modularite.md), [`07-MOD-adr-reconciliation-v01-v02.md`](07-MOD-adr-reconciliation-v01-v02.md).
8. **Instantané produit** (`refs_first`, lecture seule) : `_bmad-output/planning-artifacts/prd.md` §4.2 et §7 ; `_bmad-output/implementation-artifacts/sprint-status.yaml` ; stories Epic 4 `4-1` … `4-6b` (table [`index.md`](index.md) § Epic 4) si tu calques le pilote bandeau live.

**Pilotes de référence :**

| Pilote | Type | Quand t’en inspirer |
|--------|------|---------------------|
| **#1 Bandeau live** | slice-transverse CREOS | Chaîne complète Epic 4 — template par défaut |
| **#2 Comptage pièces/billets** | workflow-step + tables métier | Si étape de flow clôture caisse + Paheko — lire [`08-MOD-exemple-pilote-comptage-pieces-billets.md`](08-MOD-exemple-pilote-comptage-pieces-billets.md) (**livré**, brouillon normatif HITL contenu) |

---

## Règles impératives (garde-fous)

1. **Ne réinvente pas** une architecture parallèle : réutilise FastAPI `api_v1` / `api_v2`, Peintre_nano + CREOS, ADR-001 config modules, outbox Paheko existante.
2. **Vérifie le dépôt réel** avant d’écrire : routes, modèles, manifests, tests, permissions, outbox — produis une table « existe / manque / à adapter ».
3. **`refs_first` :** cite `_bmad-output/` et les stories par chemin relatif ; **ne copie pas** le PRD ni les epics intégralement dans `references/protocole-modules-recyclique/`.
4. **`operationId` OpenAPI == `data_contract.operation_id` CREOS** (caractère pour caractère) — règle B4 ; toute PR qui casse l’alignement est incomplète.
5. **Hiérarchie AR39 :** OpenAPI > ContextEnvelope > manifests CREOS > prefs UI — le front **n’invente pas** la vérité métier ni les permissions.
6. **Persistance :** JSON `site_id` + `module_key` **uniquement** pour préférences / activation UI ; données métier contraintes → **tables SQL** + migrations Alembic (pas de god-namespace JSON).
7. **Impact compta :** emprunte la chaîne **snapshot → builder → outbox → Paheko** ; **jamais** d’appel Paheko depuis le navigateur.
8. **Activation :** signal **backend-autoritaire** (`module_key`, snapshot, module-config GET) — **pas** `localStorage` ni toggle navigateur seul comme vérité.
9. **Manifests officiels** sous `contracts/creos/manifests/` pour tout slice partagé ; `peintre-nano/public/manifests/` = démo / tests seulement.
10. **Mock explicite** toléré en chantier ; **interdit** comme état final d’un module v2 « obligatoire » ou d’une preuve chaîne (PRD §4.2).
11. **Arbitrage bloquant :** si type taxonomique, `module_key`, ou config vs tables métier est ambigu → **formule la question** dans un fichier pack ou handoff `references/artefacts/` — **ne suppose pas**.
12. **Livrables fichiers :** produis de **vrais** fichiers (code, contrats, doc courte) — pas seulement une réponse chat.

---

## Interdits absolus

| Interdit | Motif | Alternative |
|----------|--------|-------------|
| **Promotion BMAD** (copie PRD/epics/stories dans `references/`, ADR archi canonique, fusion `contracts/` sans HITL Strophe) | Stratégie `refs_first` du chantier | Citer chemins ; lister dans `09-lacunes` ce qui sera promu post-HITL |
| **Marketplace / modules tiers / installation dynamique post-v2** | Hors-scope v2 — [`post-v2-hypothesis-marketplace-modules.md`](../../_bmad-output/planning-artifacts/architecture/post-v2-hypothesis-marketplace-modules.md) | Citation § post-v2 uniquement si pertinent |
| **`module.toml`, loader TOML, `ModuleBase.register_routes()`** | Abandonné v2 — [`07-adr`](07-MOD-adr-reconciliation-v01-v02.md) | Router FastAPI + registre explicite |
| **EventBus Redis Streams générique** | Non normé v2 | Outbox nommée ou synchrone documenté |
| **Une route PATCH par champ de config** | Explosion OpenAPI | `GET/PATCH .../module-config/{module_key}` (brouillon ADR-001) |
| **Réécriture `recyclique-1.4.4`** ou loader legacy sans ADR | Dette non arbitrée | Suivre `07-adr` |
| **Publication `doc/`** pour la matière technique modulaire | Communication externe hors chantier | Rester dans `references/` + `contracts/` |
| **Peintre autonome / apps contributrices post-v2** | Hors périmètre | Citation hypothèse seulement |

---

## Checklist d’entrée (avant Phase A)

Cocher **toutes** les cases ; sinon **stop** et compléter la lecture.

| # | Critère | OK |
|---|---------|-----|
| E.1 | Mission écrite : `module_key` proposé (ou existant), périmètre utilisateur, type taxonomique attendu | ☐ |
| E.2 | [`05-MOD-registre-module-key.md`](05-MOD-registre-module-key.md) consulté : clé **actif** / **réservé** / à ajouter (avec HITL si nouvelle clé) | ☐ |
| E.3 | [`02-taxonomie`](02-MOD-taxonomie-types-de-modules.md) : slice vs workflow step vs domaine — **une** classification primaire | ☐ |
| E.4 | [`sprint-status.yaml`](../../_bmad-output/implementation-artifacts/sprint-status.yaml) : fraîcheur vérifiée (`last_updated`) | ☐ |
| E.5 | Dossier architecte ch. 05–07 parcouru si front / backlog / T-MOD touchés | ☐ |
| E.6 | Aucune demande utilisateur de **promotion BMAD** ou **marketplace** dans le périmètre | ☐ |
| E.7 | Fichiers cibles listés (§ Chemins à toucher) — pas de modification hors liste sans justification | ☐ |
| E.8 | [`06-MOD-cookbook-nouveau-module-optionnel.md`](06-MOD-cookbook-nouveau-module-optionnel.md) parcouru : phases **0→8**, gates §0.3, hub §0.0 (`10`–`22`) — **pas** de réécriture du pas-à-pas | ☐ |
| E.9 | [`09-MOD-lacunes-et-questions-ouvertes.md`](09-MOD-lacunes-et-questions-ouvertes.md) + [`22-MOD-dossier-architecte-pont-t-mod.md`](22-MOD-dossier-architecte-pont-t-mod.md) consultés : aucun arbitrage listé (T-MOD, Q-HITL) n'est contourné | ☐ |

**Enrichissement pack v2 (maintenance documentaire) :** si la mission est rédaction / sync du pack (pas implémentation module), charger [`00-MOD-plan-enrichissement-v2-2026-05-20.md`](00-MOD-plan-enrichissement-v2-2026-05-20.md) — inventaire `files[]`, gates CS-v2, **sans** dupliquer le cookbook `06`.

---

## Phases A → D — implémentation d’un module (ordre strict)

> **Ne pas confondre** avec les phases **A→E** du [plan de rédaction du pack](00-MOD-plan-redaction-modules.md) (documents `01`…`09`). Ici, **A→D = exécution** d’un module optionnel dans le dépôt (code + contrats). La **rédaction** du pack markdown est couverte en § Variante rédaction pack uniquement.

Ne passe pas à la phase suivante sans **table d’état** + **écarts nommés** pour la phase courante.

### Phase A — Cadrage repo-aware et classification

**Objectif :** trancher le **type** de module et dresser l’état réel du dépôt.

**Actions obligatoires :**

1. Lire le code et les contrats existants pour le domaine concerné (API, Peintre, migrations, tests).
2. Produire une **table** « prévu pack / existe / manque / à adapter » (back, front, contrats, config, Paheko, permissions).
3. Produire une **table** « type taxonomique | justification | profondeur chaîne §4.2 requise ».
4. Si **workflow step** (pilote #2) : identifier le **flow parent** (`cashflow-close`, etc.) et l’ordre d’insertion d’étape.
5. Si **slice** (pilote #1) : identifier slots (`header`, `main`, …) et `page_key` / navigation.
6. Vérifier **matrice v0.1** : aucune dérive TOML / `ModuleBase` / bus générique.

**Livrables Phase A (fichiers) :**

- Fiche courte `references/artefacts/YYYY-MM-DD_<module_key>_cadrage-module.md` **ou** section dans la story / handoff — avec les deux tableaux.
- Si nouvelle clé : proposition d’entrée pour [`05-MOD-registre-module-key.md`](05-MOD-registre-module-key.md) (ne pas promouvoir BMAD).

**Gate Phase A :** type taxonomique + `module_key` + arbre persistance (JSON vs tables vs agrégation seule) **validés ou questions HITL listées**.

---

### Phase B — Contrats (OpenAPI, CREOS, schémas config)

**Objectif :** ancrer la chaîne **avant** logique métier lourde (modèle story **4-1**).

**Actions obligatoires :**

1. **OpenAPI** : ajouter ou étendre `contracts/openapi/recyclique-api.yaml` avec `operationId` unique (`recyclique_<domaine>_<verbe>`).
2. Documenter réponses **401 / 403 / 503** (et autres pertinentes) ; `X-Correlation-ID` si flux live / polling.
3. Si config UI : JSON Schema dans `references/config-modules-site-id/schemas/<module_key>.vX.json` + entrée README schemas.
4. **CREOS reviewables** :
   - `contracts/creos/manifests/widgets-catalog-<slice>.json`
   - `page-<page_key>.json`, `navigation-<slice>.json` si navigation dédiée
   - `data_contract.operation_id` **identique** à l’OpenAPI
5. `cd contracts/openapi && npm run generate` si YAML modifié ; committer `generated/recyclique-api.ts` si politique repo.
6. Tests contract : `peintre-nano/tests/contract/creos-*-manifests-*.test.ts` **verts**.

**Checklist Phase B (résumé protocole back §4 + front §5) :**

| ID | Critère | OK |
|----|---------|-----|
| B.1 | Signaux métier documentés (artefact ou spec courte) — pas happy-path seul | ☐ |
| B.2 | Périmètre **borné** — pas d’absorption dashboard / admin généralisé | ☐ |
| B.3 | Alignement CREOS ↔ OpenAPI vérifié caractère par caractère | ☐ |
| B.4 | Schéma config `schema_version` + `payload` si module_key porte de la config UI | ☐ |

**Gate Phase B :** contrats reviewables + tests contract manifests **passent**.

---

### Phase C — Backend (récepteur, persistance, events, Paheko)

**Objectif :** implémenter le récepteur FastAPI et la persistance conforme [`03-MOD-protocole-backend.md`](03-MOD-protocole-backend.md).

**Chemins type (adapter au domaine) :**

| Action | Chemin indicatif |
|--------|------------------|
| Router v2 | `recyclique/api/src/recyclic_api/api/api_v2/endpoints/<domaine>.py` |
| Montage | `recyclique/api/src/recyclic_api/api/api_v2/api.py`, `main.py` |
| Service | `recyclique/api/src/recyclic_api/services/<domaine>_service.py` |
| Schémas | `recyclique/api/src/recyclic_api/schemas/` |
| Migrations | `recyclique/api/migrations/` |
| Tests | `recyclique/api/tests/test_<domaine>_*.py` |

**Checklist Phase C (extraits §4–11 protocole back) :**

| ID | Critère | OK |
|----|---------|-----|
| C.1 | Handler mince ; logique dans `*_service.py` | ☐ |
| C.2 | `site_id` résolu serveur ; tests IDOR membership | ☐ |
| C.3 | Dégradation explicite (null / 503) — pas de 200 trompeur | ☐ |
| C.4 | Persistance : arbre §7 protocole back respecté (JSON vs tables) | ☐ |
| C.5 | Feature flag / toggle : transitoire documenté ou module-config cible 9.6 | ☐ |
| C.6 | Events : canal nommé ; pas de bus générique « au cas où » | ☐ |
| C.7 | **Si compta :** outbox + mapping Paheko + statut sync visible — sinon **G.2.1** hors outbox explicite | ☐ |
| C.8 | pytest : nominal, dégradé, 401/403, corrélation | ☐ |

**Gate Phase C :** tests backend verts + OpenAPI reflète l’impl réelle.

---

### Phase D — Front CREOS, activation, recette chaîne complète

**Objectif :** runtime Peintre + activation par site + preuve E2E (stories **4-2** … **4-6b**).

**Chemins type :**

| Action | Chemin indicatif |
|--------|------------------|
| Registre widget | `peintre-nano/src/registry/register-<domaine>-widgets.ts` → `registry/index.ts` |
| Composant | `peintre-nano/src/domains/<domaine>/` + `*.module.css` |
| Client API | `peintre-nano/src/api/` |
| Fallbacks | `peintre-nano/src/runtime/report-runtime-fallback.ts` |
| Tests unit / e2e | `peintre-nano/tests/unit/`, `peintre-nano/tests/e2e/` |
| App servie | `peintre-nano/src/app/App.tsx` (bundle manifests Epic 4) |

**Checklist Phase D (maître §4 protocole front) :**

| # | Brique | OK |
|---|--------|-----|
| D-A | Manifests sous `contracts/creos/manifests/` | ☐ |
| D-B | `operationId` == `data_contract.operation_id` | ☐ |
| D-C | Catalogue + cohérence `widget_type` page ↔ catalogue | ☐ |
| D-D | `registerWidget` + allowlist = `getRegisteredWidgetTypeSet()` | ☐ |
| D-E | Composant ; types depuis `generated/recyclique-api.ts` | ☐ |
| D-F | Client HTTP + `X-Correlation-ID` si live | ☐ |
| D-G | Fallbacks `reportRuntimeFallback` + codes domaine stables | ☐ |
| D-H | Activation backend-gouvernée (pas localStorage vérité) | ☐ |
| D-I | App **réellement servie** charge le bundle reviewable | ☐ |
| D-J | Preuve réseau + e2e nominal **et** échec (gate 4-6) | ☐ |

**Gate Phase D :** checklist §4 entièrement cochée **ou** écarts listés dans `09-lacunes` avec HITL.

---

## Chemins à toucher — carte consolidée

Utilise cette carte pour la **liste E.7** ; n’étends pas sans note dans le livrable Phase A.

| Couche | Chemins (relatifs racine repo) | Quand |
|--------|--------------------------------|-------|
| **Pack protocole** | `references/protocole-modules-recyclique/` (lecture ; MAJ `05` / `09` si registre ou lacunes) | Toujours lecture ; écriture limitée |
| **Config modules** | `references/config-modules-site-id/schemas/`, `openapi-module-config.yaml`, ADR-001 | Config UI par `module_key` |
| **Contrats reviewables** | `contracts/openapi/recyclique-api.yaml`, `contracts/openapi/generated/`, `contracts/creos/manifests/`, `contracts/creos/schemas/` | Phases B, D |
| **Backend** | `recyclique/api/src/recyclic_api/` (api_v1, api_v2, services, schemas, models), `recyclique/api/migrations/`, `recyclique/api/tests/` | Phase C |
| **Frontend** | `peintre-nano/src/` (registry, domains, api, app, flows), `peintre-nano/tests/` | Phase D |
| **BMAD** | `_bmad-output/planning-artifacts/`, `_bmad-output/implementation-artifacts/` | **Lecture seule** — stories formelles si process BMAD demandé |
| **Artefacts handoff** | `references/artefacts/` | Cadrage A, questions ouvertes |
| **Recherche** | `references/recherche/` | Nouvelle enquête externe uniquement ici |
| **Ne pas toucher** | `doc/` (comm externe), `recyclique-1.4.4/` (sans ADR), promotion non validée de `contracts/` | Interdits |

---

## Stratégie `refs_first` (rappel opérationnel)

| Faire | Ne pas faire |
|-------|----------------|
| Lien relatif vers story `4-3-*.md`, PRD §4.2, epic | Copier 50 lignes de PRD dans le pack |
| Aligner protocoles sur stories existantes | Créer epic/story BMAD dans `_bmad-output/` sans demande explicite utilisateur |
| Brouillon OpenAPI dans `config-modules-site-id/` jusqu’à HITL | Fusionner seul dans `contracts/openapi/recyclique-api.yaml` « pour avancer » |
| Mettre à jour `references/index.md` / `ou-on-en-est.md` si livrable pack stable | Déplacer stories vers `references/` |

**Ordre de promotion post-HITL (informatif — ne pas exécuter) :** ADR archi `_bmad-output/planning-artifacts/architecture/` → addendum PRD §4.2 → Story 9.6 → fusion `contracts/`.

---

## Checklist de sortie (fin de mission)

| # | Critère | OK |
|---|---------|-----|
| S.1 | Phases A→D : gates respectées ou écarts dans `09-lacunes` / handoff daté | ☐ |
| S.2 | `module_key` aligné registre `05` (ou proposition documentée) | ☐ |
| S.3 | Chaîne §4.2 : contrat → back → CREOS → runtime → permissions → fallback → activation | ☐ |
| S.4 | Aucun interdit § ci-dessus violé | ☐ |
| S.5 | Tests listés exécutés (pytest API + contract CREOS + unit/e2e Peintre pertinents) | ☐ |
| S.6 | Table fichiers modifiés + statut validation dans la **première** réponse de clôture | ☐ |
| S.7 | Aucune promotion BMAD ni doc marketplace procédurale produite | ☐ |

---

## Livrable initial attendu (première réponse structurée)

1. **Synthèse Phase A** : deux tableaux (état dépôt + classification taxonomique).
2. **Plan Phases B→D** ordonné avec fichiers probables (§ carte chemins).
3. **Risques principaux** (3–7 bullets) : contrats, Paheko, 9.6, IDOR, drift CREOS.
4. **Questions HITL** explicites si blocage (pas de supposition silencieuse).
5. **Démarrage Phase B** (contrats) ou **B+C** si contrats déjà présents — avec liste des fichiers ouverts en premier.

**Ton :** impératif, factuel, chemins exacts. Pas de redite théorique du PRD. Si un point est **déjà implémenté**, cite fichier + `operationId` / `module_key`. Si un point **manque**, dis **quoi créer** et **où**.

---

## Variante — rédaction / maintenance du pack (pas implémentation module)

Si la mission est **rédiger ou maintenir** le chantier documentaire (pas livrer un module dans le code) :

| Phase rédaction pack | Fichiers | Vérification |
|----------------------|----------|--------------|
| **0** | `index`, `00-cadrage` | Porte d’entrée ; hors-scope marketplace |
| **A** | `01-matrice`, `07-adr` | Chaque ligne v0.1 : conservé / remplacé / abandonné / post-v2 |
| **B** | `02-taxonomie`, `05-registre` | Placeholders PRD §7 + table §6.1.1 (types ↔ `module_key`) |
| **C** | `03-protocole-backend`, `04-protocole-front-creos` | Traçabilité stories `4-1`…`4-6b`, `3-3` |
| **D** | `06-cookbook`, `08-exemple-pilote` | `06` seul suffit pour dériver une checklist slice |
| **E** | `09-lacunes`, `22-dossier-architecte-pont-t-mod`, prompt optionnel | HITL ; pont T-MOD/T-MET ; **ne pas** réécrire « rédiger index » — pack déjà livré |
| **E.8–E.9** | Checklist entrée ci-dessus + [`00-MOD-plan-enrichissement-v2-2026-05-20.md`](00-MOD-plan-enrichissement-v2-2026-05-20.md) si mission enrichissement v2 | Validation `06` + `09` / `22` (résidus P2 QA2) |

Appliquer les **mêmes interdits** (pas de promotion BMAD, pas de marketplace). Produire des **fichiers markdown** dans `references/protocole-modules-recyclique/` ; MAJ pointeurs [`references/index.md`](../index.md) / [`ou-on-en-est.md`](../ou-on-en-est.md) si livrable stable — **sans** recréer un `index` vide.

---

## Références rapides

| Sujet | Chemin |
|-------|--------|
| Cadrage chantier | [`00-MOD-cadrage-chantier.md`](00-MOD-cadrage-chantier.md) |
| Cookbook (**livré**) | [`06-MOD-cookbook-nouveau-module-optionnel.md`](06-MOD-cookbook-nouveau-module-optionnel.md) |
| Lacunes / HITL | [`09-MOD-lacunes-et-questions-ouvertes.md`](09-MOD-lacunes-et-questions-ouvertes.md) |
| Config site ADR-001 | [`references/config-modules-site-id/`](../config-modules-site-id/) |
| Gouvernance contrats | [`references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`](../artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md) |
| Signaux pilote #1 | [`references/artefacts/2026-04-02_07_signaux-exploitation-bandeau-live-premiers-slices.md`](../artefacts/2026-04-02_07_signaux-exploitation-bandeau-live-premiers-slices.md) |
| TODO architecte | [`references/dossier-architecte-externe-v2/07-ARCH-todos-et-questions-architecte.md`](../dossier-architecte-externe-v2/07-ARCH-todos-et-questions-architecte.md) |
| Plan Cursor | [`.cursor/plans/chantier_protocole_modules_fe3bc68e.plan.md`](../../.cursor/plans/chantier_protocole_modules_fe3bc68e.plan.md) |
| Plan enrichissement v2 | [`00-MOD-plan-enrichissement-v2-2026-05-20.md`](00-MOD-plan-enrichissement-v2-2026-05-20.md) |
| Pont architecte T-MOD | [`22-MOD-dossier-architecte-pont-t-mod.md`](22-MOD-dossier-architecte-pont-t-mod.md) |
| Crosswalk config | [`18-MOD-config-modules-crosswalk.md`](18-MOD-config-modules-crosswalk.md) |
| Transcripts modularité | [`12-MOD-index-transcripts-modularite.md`](12-MOD-index-transcripts-modularite.md) |

---

_Prompt agent — pack protocole modules Recyclique. Calqué sur le modèle opérations spéciales ; phases A→D = cadrage → contrats → backend → front & recette. Promotion BMAD et marketplace explicitement hors périmètre._
