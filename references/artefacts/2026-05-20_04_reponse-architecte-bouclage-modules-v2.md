# Bouclage architecture modules v2 — 2ᵉ passe (réponse architecte)

**Date :** 2026-05-20 · **Verdict :** **GO final** (architecture)  
**Périmètre :** fermeture des zones ouvertes revue 1. Pas de code, PRD, marketplace, T-PEINT-1 impl., Q-HITL-09–11.

**Cross-références (lire dans cet ordre pour exécution)**

| Priorité | Fichier | Rôle |
|----------|---------|------|
| 1 | [2026-05-20_05_notes-architecte-loup-de-mer-modules-v2.md](2026-05-20_05_notes-architecte-loup-de-mer-modules-v2.md) | **Primordial** — pièges, heuristiques, pilotage agents (complète §I ci-dessous, non normatif) |
| 2 | Ce document (`04`) | Normatif bouclage : B.1 convention back, B.2 patron CREOS, C précédence, D priorisation, E delta |
| 3 | [2026-05-20_03_reponse-architecte-branchements-modules-v2.md](2026-05-20_03_reponse-architecte-branchements-modules-v2.md) | Revue 1 — GO sous réserves, matrice G initiale |
| — | [../dossier-architecte-externe-v2/09-ARCH-prompt-bouclage-architecte-externe.md](../dossier-architecte-externe-v2/09-ARCH-prompt-bouclage-architecte-externe.md) | Prompt 2ᵉ passe |
| — | [../protocole-modules-recyclique/06-MOD-cookbook-nouveau-module-optionnel.md](../protocole-modules-recyclique/06-MOD-cookbook-nouveau-module-optionnel.md) | Recette à appliquer |

---

## A.0 — Recoupe revue 1

**Verdict revue 1 recopié : GO sous réserves.**

Citations `2026-05-20_03_reponse-architecte-branchements-modules-v2.md` :
1. **Top P0 §A :** « L-03 / T-MOD-2 — ADR-007 Proposed → Accepted ; tant que non gelé le double récit v0.1/v2 reste ouvert dans BMAD » ; « T-MOD-3 fusion `openapi-module-config.yaml` dans `recyclique-api.yaml` + codegen ».
2. **G.1 ligne Bloquant L-04 :** « module-config → API canonique : `openapi-module-config.yaml` non fusionné dans `recyclique-api.yaml` → drift → correction T-MOD-3 ».
3. **§B T2 :** « Deux patterns, un protocole. Slice = page/slot transverse (bandeau). Workflow step = panel dans un flow existant, pas page orpheline ».

Réserves revue 1 confirmées non invalidées : T1, T4, T5, T6 maintenus ; bus affichage GO ; recette industrialisable sous réserves contrats.

---

## A — Verdict bouclage

**GO final** (réserves revue 1 fermées par actions documentaires ci-dessous ; G.5/T-MET-1 reporté hors verdict architecture).

Delta vs revue 1 :
- **L-09 fermé** : convention backend rédigée (B.1), prête `03-MOD §6 C.4`.
- **T2 tranché** : **patron par fiche + manifest CREOS** (pas de registre central de points d'entrée) — B.2.
- **L-07 fermé par DEC-03** : `module_key` JSON fait foi ; précédence figée (C) → `sites.configuration` rétrogradé.
- **L-04 reste Gap résiduel** (action T-MOD-3 ouverte, pas OK sans fusion OpenAPI) — non bloquant GO architecture, bloquant 2ᵉ module si non fait.
- **G.5/T-MET-1 reporté** : Bloquant métier accepté, hors replanification.

---

## B.1 — T3 : bloc prêt à coller `03-MOD` §6 C.4

> ### §6 C.4 — Convention d'enregistrement d'un module optionnel (back) — clôt L-09
>
> Toute brique backend d'un module optionnel suit **un seul** patron (pas de framework loader, cf. ADR-007) :
>
> 1. **Package** dédié sous `recyclic_api/modules/<module_key_snake>/` (routes, services, schemas, tests co-localisés) ; un package = un `module_key`.
> 2. **Router** : un `APIRouter` par module, inclus **explicitement** dans l'app au `lifespan`/bootstrap — **jamais** de `register_routes(app)` générique hérité d'un `ModuleBase`.
> 3. **Prefix** : routes sous `/v1/...` ou `/v2/...` selon maturité ; tag OpenAPI **aligné** sur le `module_key` (ex. tag `exploitation` pour `kpi-live-banner`).
> 4. **`operationId`** : préfixé par domaine, stable, unique, présent dans `contracts/openapi/recyclique-api.yaml` (B4 ; renommage = même PR YAML + CREOS + tests).
> 5. **Feature flag / activation** : lecture via `module_key` JSON scopé `site_id` (ADR-001, §D.3.5) ; `module_key` absent/désactivé → routes répondent en skip gracieux ou 404 homogène, **pas** de route fantôme.
> 6. **`module_key`** : entrée préalable dans `05-MOD-registre-module-key.md §3` (whitelist back) ; clé inconnue → 404/403 anti-énumération.
> 7. **Services async** : workers outbox / jobs **nommés** par module ; **pas** de subscription générique à un EventBus (Redis = auxiliaire only, AR12).
> 8. **Tables vs JSON** : données à contrainte SQL/audit/jointure → tables + Alembic ; flags d'activation → JSON `module_key` (arbre `06-MOD §0.2`).
> 9. **Tests** : pytest co-localisés — nominal + 401/403 + module on/off + skip + IDOR `site_id`.
> 10. **Anti-patterns rejetés** : `module.toml`/`ModuleBase`/`config.toml [modules]`/`ModuleRegistry.load_from_config`/second pattern d'enregistrement parallèle.
>
> **Exemple complet de référence :** bandeau live (`kpi-live-banner`, Epic 4 `4-1`…`4-6b`) — package, router, tag `exploitation`, `operationId` `recyclique_exploitation_getLiveSnapshot`, flag `bandeau_live_slice_enabled` (transitoire → 9.6). Détail code : `20-MOD-peintre-code-refs-bandeau-live.md`.

Sources : `03-MOD §6`, `11-MOD §6.1`, `15-MOD` (L-09), `20-MOD`.

---

## B.2 — T2 : patron slice / workflow step (≤ 1 page)

**Tranche : patron par fiche + manifest CREOS.** Pas de registre central des points d'entrée — chaque module se déclare par ses manifests CREOS reviewables + sa fiche cookbook. Le seul registre est `05-MOD` (`module_key` = whitelist/gouvernance), **pas** un catalogue de hooks. Cohérent DEC-PLAT (pas de couche plateforme) et D-01 (CREOS au centre).

| Critère | **Slice transverse** | **Workflow step** |
|---------|----------------------|-------------------|
| Déclaration UI | `PageManifest` + slot transverse (`header`/`aside`) ; entrée navigation dédiée | Panel **dans** un flow existant (`flow_id` / `workflow_id`), `widget_props` du wizard hôte — **pas** de page orpheline |
| Manifest type | `navigation-<slice>.json` + `page-<slice>.json` + `widgets-catalog-<slice>.json` | extension du `page-<flow>.json` hôte + catalogue widget du panel |
| Point d'insertion | slot nommé connu du shell | étape ordonnée du flow ; rendu conditionné `module_key` actif |
| Données | `data_contract.operation_id` ↔ OpenAPI ; souvent lecture | idem + persistance métier dédiée (tables) si état à conserver |
| Activation off | slice non rendu (skip slot) | étape sautée (skip gracieux) ou hôte inchangé |
| Référence | **`20-MOD-peintre-code-refs-bandeau-live.md`** (`kpi-live-banner`, slice) | patron générique `workflow_id` + panel ; **illustration nommée : comptage** (`08-MOD §11`) — métier **reporté**, aucun arbitrage skip/blocage/écart Paheko ici |

**Règle d'or commune :** ni slice ni step ne crée route/permission/page absente des contrats amont (AR39). Slice et step partagent les phases cookbook 0→8 ; seule la **phase 4 (front CREOS)** diffère (slot transverse vs panel de flow).

Sources : `04-MOD §8–§9`, `02-MOD §4.5`, `20-MOD`, `08-MOD §11`.

---

## C — Règle DEC-03 : précédence `module_key`

Texte prêt `03-MOD §D.3.5` (+ note `05-MOD §5`) :

> ### §D.3.5 — Précédence d'activation d'un module (DEC-03)
>
> L'activation/désactivation d'un module optionnel par site est tranchée par **une seule** autorité : le document **JSON `module_key`** scopé `site_id` (ADR-001).

| Rang | Source | Rôle | Règle |
|------|--------|------|-------|
| **1 (fait foi)** | JSON `module_key` (ADR-001, ETag/409) | Activation on/off + flags du module | **Autorité** ; lue par back (feature flag §6 C.4) et front (activation, jamais `localStorage`) |
| **2** | `sites.configuration` (PG) | Config site héritée legacy | **Subordonnée** : ne **réactive jamais** un `module_key` à `false` ; sert au fallback de paramètres non-module |
| **3** | Story 9.6 (merge admin) | Surface d'édition UI du JSON `module_key` | **N'introduit pas** de 4ᵉ autorité : écrit le JSON rang 1, déprécie le toggle `bandeau_live_slice_enabled` |

> **Conséquence :** en cas de divergence `sites.configuration` vs JSON `module_key`, **le JSON gagne** (Q-HITL-03 close, DEC-03). Le toggle transitoire `bandeau_live_slice_enabled` (`18-MOD §4`) est de la dette migrée par 9.6, **pas** une autorité concurrente.

Sources : ADR-001, `18-MOD §4–§5`, `05-MOD §2`.

---

## D — Priorisation finale (DEC-CREOS)

| Rang | ID | Action (1 ligne) | Dépend de | Bloque 2ᵉ module ? |
|------|-----|------------------|-----------|---------------------|
| **P0** | T-MOD-2 | ADR-007 → **Accepted** (décision **HITL Strophe**) + promotion `_bmad-output/.../architecture/` | — | Oui |
| **P0** | T-MOD-3 | Fusionner `openapi-module-config.yaml` → `contracts/openapi/recyclique-api.yaml` + `npm run generate` | T-MOD-2 | Oui |
| **P1** | T-MOD-1 | Figer convention back `03-MOD §6 C.4` (B.1) — **rédigé, valider HITL** | T-MOD-2 | Oui |
| **P1** | T-MOD-5 | Registre `module_key` : promouvoir clés actives + schémas JSON par clé | T-MOD-3 | Partiel (par clé) |
| **P1** | T-MOD-4 | Story 9.6 : panneau admin, merge JSON+PG, déprécie toggle | T-MOD-3, DEC-03 | Non (toggle couvre v1) |
| **P2** | T-PEINT-1 | Gardien du seuil — **reporté** (DEC-16, après 2–3 modules) | — | Non |
| — | T-MET-1 | Comptage / wizard / Paheko — **reporté, hors replanification bouclage** | — | Non (reporté) |

**CREOS au centre :** chaque rang renforce la chaîne contrats (OpenAPI ↔ manifests) ; aucun n'introduit de mécanisme hors CREOS/Peintre.

**Epic 10 — en clair (non dev) :** Epic 10 met en place une vérification automatique qui, à chaque modification, contrôle que les écrans déclarés (les « manifests » CREOS) restent cohérents avec l'API : un bouton ou un indicateur affiché correspond bien à une opération qui existe vraiment côté serveur, sans nom mal orthographié ni écran orphelin. C'est un **filet de sécurité** posé autour de CREOS, pas un remplacement : CREOS reste la grammaire qui décrit les écrans ; Epic 10 ne fait que tester cette grammaire en continu. Aujourd'hui ce contrôle est tenu à la main (relecture + tests locaux) ; l'automatiser réduit le risque d'erreur quand le nombre de modules grandit. Non bloquant pour un premier nouveau module.

---

## E — Delta matrice

| ID lacune | § G revue 1 | Statut revue 1 | Statut bouclage | Action doc (fichier + §) |
|-----------|-------------|----------------|-----------------|-------------------------|
| L-04 | G.1 | Bloquant | **Gap résiduel** | T-MOD-3 — fusion `contracts/openapi/recyclique-api.yaml` ; **pas OK** sans merge (`18-MOD §2`) |
| L-07 | G.1 | Bloquant | **OK** | DEC-03 — `03-MOD §D.3.5` (C ci-dessus) |
| L-09 | G.3 | Bloquant | **OK** | T3 — `03-MOD §6 C.4` (B.1) |
| L-08 | G.3 | Gap | **Gap (planifié)** | Story 9.6 — déprécie toggle (`18-MOD §4`) |
| L-05 | G.3 | Gap | **Gap (planifié)** | T-MOD-5 — `05-MOD §3` promotion clés + schémas |
| G.5/T-MET-1 | G.5 | Bloquant | **Inchangé — reporté** | Bloquant métier accepté pour GO architecture (`08-MOD`, hors bouclage) |

---

## F — Questions architecture (max 3)

1. **Codegen post-fusion T-MOD-3 :** le client généré doit-il exposer `module-config` comme API publique versionnée (`tags: ModuleConfig`) dès la fusion, ou rester interne jusqu'à 9.6 ? (impact stabilité contrat consommé par d'autres apps JARVOS).
2. **Convention `/v1` vs `/v2` pour nouveaux modules :** un module optionnel neuf cible-t-il `/v2` par défaut, ou suit-il la maturité de son domaine hôte ? (cohérence `03-MOD §6 C.4 point 3`).
3. **Granularité package :** un `module_key` = un package strict, ou regroupement autorisé par domaine (`cashflow` + ses workflow steps) ? (impact convention B.1 point 1).

---

## I — Recommandations et conseils (public non développeur)

> **Complément obligatoire pour dev / agents :** [2026-05-20_05_notes-architecte-loup-de-mer-modules-v2.md](2026-05-20_05_notes-architecte-loup-de-mer-modules-v2.md) (vieux loup de mer) — pièges terrain, heuristiques, séquence chantier. En cas de tension : pack normatif > notes loup de mer > chat.

---

**Ce qui est solide.** La mécanique d'affichage est mûre et prouvée : un écran réel (le bandeau live) circule de bout en bout, de l'API jusqu'au rendu, avec un comportement de repli propre en cas de données indisponibles. La séparation des rôles est claire : Recyclique décide du métier et des droits, Peintre se contente d'afficher ce qui est déclaré et autorisé. Les garde-fous contre l'ancien design (v0.1) sont explicites et faciles à faire respecter. La règle comptable est nette : tout flux financier passe par un seul rail vers Paheko, jamais par un raccourci.

**3 risques si l'ordre D est ignoré.**
- Coder la Story 9.6 (panneau admin) avant la fusion OpenAPI (T-MOD-3) ferait travailler l'équipe contre un brouillon, créant une dette de migration immédiate.
- Lancer un 2ᵉ module avant de figer la convention backend (T3) ferait réinventer le branchement à chaque fois, avec des incohérences durables.
- Laisser l'ADR-007 non acceptée maintient officiellement deux récits contradictoires, et un agent ou un dev pourrait légitimement réintroduire l'ancien design.

**5–7 interdits opérationnels (complète revue 1 §F).**
- Activer un module via `localStorage` ou préférences locales — seule l'autorité JSON `module_key` fait foi (DEC-03).
- Réintroduire `module.toml`, `ModuleBase`, un loader central ou un EventBus « module ».
- Consommer la route `module-config` comme officielle avant sa fusion dans le contrat canonique.
- Créer un registre central de points d'entrée de modules (on reste sur fiche + manifest CREOS).
- Faire calculer une règle métier ou comptable dans l'écran (Peintre) au lieu du serveur.
- Appeler Paheko depuis le navigateur.
- Promouvoir l'ADR-007 en « Accepted » sans validation humaine (Strophe).

**Trajectoire JARVOS.** L'objectif long terme est que Peintre devienne un moteur d'affichage partagé entre plusieurs applications, chacune restant maîtresse (« writer ») de ses propres contrats. CREOS est le langage commun qui rend cela possible : tant que chaque application décrit ses écrans dans cette grammaire et que le serveur reste l'autorité du métier et des droits, on peut mutualiser l'affichage sans mélanger les responsabilités. La bonne séquence est de **prouver d'abord la modularité en interne** — quelques modules Recyclique (caisse, réception en candidats naturels) branchés proprement sur les deux bus — **avant** d'ouvrir CREOS à d'autres applications. On évite ainsi de figer trop tôt des interfaces partagées qu'on ne maîtrise pas encore, et on garde la porte ouverte sans créer de couche plateforme prématurée (DEC-PLAT).

**3–5 règles d'or pour utiliser `06-MOD-cookbook` avec des agents IA.**
- Faire suivre les phases 0→8 et les gates G0→G8 dans l'ordre ; ne jamais sauter un gate sans tableau d'état (modifié / validé / ouvert / tests / fichiers).
- Exiger de l'agent un livrable **fichier** à chaque phase, jamais une réponse de chat seule.
- Rappeler en tête de session les interdits ci-dessus et la liste d'anti-patterns (`06-MOD §15`) — un agent réintroduit volontiers l'ancien design « au cas où ».
- Donner un seul `module_key` par session et un seul exemple de référence (le bandeau) pour éviter les patterns parallèles.
- Faire pointer l'agent vers les sources `refs_first` (PRD, epics, `contracts/`) en lecture, sans l'autoriser à les réécrire.

---

*Écart signalé : aucun. DEC-* respectées.*

---

_Retour : [2026-05-20_05_notes-architecte-loup-de-mer-modules-v2.md](2026-05-20_05_notes-architecte-loup-de-mer-modules-v2.md) · [03 revue 1](2026-05-20_03_reponse-architecte-branchements-modules-v2.md) · [index artefacts](index.md)_
