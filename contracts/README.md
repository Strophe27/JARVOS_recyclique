# Contrats reviewables — JARVOS Recyclique v2

Artefacts **versionnes** partagés entre `recyclique` (backend) et `peintre-nano` (frontend v2).

**Gouvernance normative (Story 1.4)** : document pivot unique — [`references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`](../references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md) (hiérarchie AR39, OpenAPI vs CREOS, versionnement / drift, runtime Peintre_nano borné, lien `data_contract.operation_id` ↔ `operationId`). **Décisions terrain (HITL)** : lire **§0** et **§2.3** du pivot (périmètre reviewable vs démo, promotion manifests, politique `operationId`, CI).

| Zone | Role |
|------|------|
| `openapi/` | Source de verite **reviewable** de l'API v2. Fichier canonique draft : `openapi/recyclique-api.yaml` (**writer Recyclique**, **Piste B**), `operationId` **stables** ; consommé en codegen / validation CI. **Codegen TypeScript (Peintre_nano)** : depuis `contracts/openapi/`, exécuter `npm install` puis `npm run generate` — sortie `openapi/generated/recyclique-api.ts` (types `paths` / `components`). Le dossier `generated/` est versionné pour reproduire le même diff en PR ; régénérer après toute évolution du YAML. **Bandeau live (Epic 4 / Story 4.1)** : `GET /v2/exploitation/live-snapshot` (`recyclique_exploitation_getLiveSnapshot`), schéma `ExploitationLiveSnapshot` — ancrage contractuel du slice ; périmètre gelé / sémantique Epic 2.6–2.7 dans le YAML. En-tête **`X-Correlation-ID`** documenté sur l'opération. Sémantique métier : [`references/artefacts/2026-04-02_07_signaux-exploitation-bandeau-live-premiers-slices.md`](../references/artefacts/2026-04-02_07_signaux-exploitation-bandeau-live-premiers-slices.md). |
| `creos/schemas/` | Schemas JSON **CREOS** (manifests, extensions widgets). Voir `creos/schemas/README.md`. |
| Manifests **navigation / page / catalogue widgets** | **Démo / Epic 3 :** [`peintre-nano/public/manifests/`](../peintre-nano/public/manifests/), [`peintre-nano/src/fixtures/manifests/`](../peintre-nano/src/fixtures/manifests/). **Lots reviewables (jalon Epic 4.1) :** [`creos/manifests/`](creos/manifests/) — navigation + page + catalogue widget **bandeau live** (`data_contract.operation_id` ↔ OpenAPI). |

**Versionnement `info.version` du YAML (semver draft)** : le suffixe `-draft` indique un contrat encore évolutif. Tant que `0.x.y-draft`, incrémenter **y** (patch) pour corrections documentaires mineures, **x** (minor) pour ajouts rétro-compatibles (nouveaux champs optionnels, nouvelles opérations sans casser les clients existants). Passage **major** `1.0.0` ou toute **rupture** (schéma obligatoire, renommage `operationId` référencé CREOS) : procédure **B4** (mise à jour des références `data_contract.operation_id`, tests, doc **ou** ligne dans le journal ci-dessous).

**Renommages `operationId` (phase draft `0.x`) :** toute PR qui renomme un id **déjà référencé** ailleurs doit **co-mettre à jour** refs + tests + doc, **ou** ajouter une ligne datée dans la section suivante (évite les renommages « fantômes »). Voir pivot **§0.1 B4**.

### Journal des renommages `operationId` (brouillon, optionnel)

| Date | Ancien `operationId` | Nouveau `operationId` | PR / contexte |
|------|----------------------|------------------------|---------------|
| _(vide jusqu'au premier renommage documenté)_ | | | |

**Convention `data_contract.source` :** aligner avec les **tags** OpenAPI des operations (ex. tag `members`, `stats`) ; les exemples manifests peuvent utiliser une forme prefixee (`recyclique.members`) — la **CI Epic 10** fixera la regle de correspondance tag ↔ `source` pour eviter la derive.

References BMAD : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`, instruction `references/peintre/2026-04-01_instruction-cursor-contrats-donnees.md`.
