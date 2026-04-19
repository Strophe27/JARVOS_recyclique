# Index — references/config-modules-site-id/

Pack **normatif** pour la configuration des modules **persistée serveur**, **scoping par `site_id`**, liste blanche **`module_key`**, alignement **CREOS** et contraintes **QA2**. À croiser avec la gouvernance OpenAPI / CREOS (`references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`) et le bandeau live (`2026-04-02_07_signaux-exploitation-bandeau-live-premiers-slices.md`).

**Ce n’est pas** une implémentation backend : les chemins OpenAPI sont un **brouillon** avant fusion dans `contracts/openapi/recyclique-api.yaml`.

---

## Fichiers principaux

| Fichier | Rôle |
|---------|------|
| [livrable-normatif-architecture.md](livrable-normatif-architecture.md) | **Référence QA** : intention produit, architecture cible, exigences normatives (reject-early, tenant, ACL, cache, audit), risques résiduels, critères de recette, limites. |
| [ADR-001-configuration-modules-json-par-site.md](ADR-001-configuration-modules-json-par-site.md) | **ADR** : décision sur JSON site-scopé, registre `module_key`, sécurité et concurrence ; conséquences et suivis. |
| [openapi-module-config.yaml](openapi-module-config.yaml) | **OpenAPI 3.1** brouillon : `GET`/`PATCH` `/v1/sites/{site_id}/module-config/{module_key}`, schéma `ModuleConfigDocument`, codes 403/404/409/413/422. |

---

## Schémas JSON par module

Répertoire [schemas/](schemas/README.md) : schémas **payload** par `module_key` et version (ex. pilote **kpi-live-banner**).

---

## Liens utiles (hors dossier)

| Ressource | Usage |
|-----------|--------|
| `references/peintre/index.md` | ADR CSS/config Peintre ; croisement UI. |
| `references/artefacts/2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md` | Authz multi-contextes, PIN, panel super-admin. |
| `contracts/openapi/recyclique-api.yaml` | Contrat API canonique — **cible de fusion** pour les routes ci-dessus. |

---

_Charger ce dossier pour : session **implémentation** configuration modules, **revue sécu**, **story OpenAPI**, ou alignement **Peintre** bandeau / SuperAdmin._
