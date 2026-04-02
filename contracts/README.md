# Contrats reviewables — JARVOS Recyclique v2

Artefacts **versionnes** partagés entre `recyclique` (backend) et `peintre-nano` (frontend v2).

**Gouvernance normative (Story 1.4)** : document pivot unique — [`references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`](../references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md) (hiérarchie AR39, OpenAPI vs CREOS, versionnement / drift, runtime Peintre_nano borné, lien `data_contract.operation_id` ↔ `operationId`).

| Zone | Role |
|------|------|
| `openapi/` | Source de verite **reviewable** de l'API v2. Fichier canonique draft : `recyclique-api.yaml` (**writer Recyclique**, **Piste B**), `operationId` **stables** ; consommé en codegen / validation CI. Le sous-dossier `generated/` (types / clients) n'apparaît **que** lorsque le pipeline de codegen est branché ; son absence dans un clone ne signifie pas une erreur. |
| `creos/schemas/` | Schemas JSON **CREOS** (manifests, extensions widgets). Voir `creos/schemas/README.md`. |
| Manifests **navigation / page** (exemples Piste A) | Aujourd'hui dans le package **`peintre-nano/`** : [`peintre-nano/public/manifests/`](../peintre-nano/public/manifests/), [`peintre-nano/src/fixtures/manifests/`](../peintre-nano/src/fixtures/manifests/). Un dossier futur `creos/manifests/` au niveau repo pourra accueillir des lots reviewables partagés ; il n'est **pas** requis pour valider le runtime tant que les chemins sont documentés ici, dans la gouvernance 1.4 et dans les stories. |

**Convention `data_contract.source` :** aligner avec les **tags** OpenAPI des operations (ex. tag `members`, `stats`) ; les exemples manifests peuvent utiliser une forme prefixee (`recyclique.members`) — la **CI Epic 10** fixera la regle de correspondance tag ↔ `source` pour eviter la derive.

References BMAD : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`, instruction `references/peintre/2026-04-01_instruction-cursor-contrats-donnees.md`.
