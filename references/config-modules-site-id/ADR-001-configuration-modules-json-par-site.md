# ADR-001 — Configuration des modules en JSON scoping par `site_id`

**Statut** : Proposée  
**Date** : 2026-04-19  
**Contexte** : JARVOS Recyclique / Peintre (`peintre-nano`), bandeau KPI live, panneau SuperAdmin « Gestion des modules » ; besoin de paramètres **transverses** (sessions et navigateurs) et **alignés multi-site**.

---

## Contexte

- La configuration affichage / modules ne doit pas reposer sur **`localStorage`** comme source de vérité : elle est **locale au navigateur** et ne garantit ni la cohérence multi-poste ni le rattachement **tenant / `site_id`**.
- **CREOS** sert d’**adressage** et de catalogue d’UI (`module_key`, types de widget) ; la persistance des **valeurs** de configuration relève d’une **couche serveur** distincte du manifeste seul.
- Un rapport **QA2 fusionné** (2026-04-19) exige des garde-fous **reject-early**, une matrice **rôle × `module_key` × site**, liste blanche des clés, et des contraintes **cache / audit / conflits (409)**.

---

## Décision

1. **Persistance** : exposer une **API REST générique** par site pour lire et mettre à jour des documents de configuration **versionnés** (`schema_version` + `payload`), stockés côté serveur (ex. **JSONB** indexé par **`site_id`** + **`module_key`**).
2. **Liste blanche** : tout **`module_key`** accepté en lecture ou écriture doit figurer dans un **registre serveur** aligné sur le catalogue CREOS (états : actif, déprécié, alias).
3. **Sécurité** : l’**adhésion au site** et l’**autorisation par module** sont vérifiées **côté serveur** pour chaque requête ; le chemin `site_id` n’est pas une preuve suffisante sans policy explicite (éviter IDOR et confused deputy).
4. **Concurrence** : **ETag** / version pour **optimistic locking** ; réponse **409** en cas de conflit documentée pour les clients.
5. **Spécification transport** : le brouillon **OpenAPI** `openapi-module-config.yaml` et les **schémas JSON** par module (ex. pilote **kpi-live-banner**) matérialisent le contrat ; intégration ultérieure dans `contracts/openapi/recyclique-api.yaml` après revue Epic 1.4 / équipe backend.

---

## Conséquences

### Positives

- Moins de **migrations DDL** pour chaque nouveau réglage de **préférences module** ; évolution par **schéma JSON** versionné.
- **Un point d’entrée** HTTP documenté pour les agents et le front ; tests d’acceptation réutilisent le même contrat.

### Négatives / dette

- Risque de **god-namespace** si tout est poussé dans le JSON générique : maintenir une **classification** (config UI vs données métier) et des **schémas** stricts par module.
- Le **merge** avec `sites.configuration` / `admin_settings` / `settings` doit être **explicité** (ADR complémentaire ou tableau de précédence) pour éviter les comportements divergents.

### Suivi

- Implémentation backend + alignement OpenAPI canonique ; tests négatifs IDOR et scénarios 409 ; décision sur la **précédence** des magasins de configuration existants.

---

## Références

- [livrable-normatif-architecture.md](livrable-normatif-architecture.md)  
- [openapi-module-config.yaml](openapi-module-config.yaml)  
- [schemas/README.md](schemas/README.md)  
- Gouvernance contrats / CREOS : `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`  
- Bandeau / slices (contexte métier) : `references/artefacts/2026-04-02_07_signaux-exploitation-bandeau-live-premiers-slices.md`
