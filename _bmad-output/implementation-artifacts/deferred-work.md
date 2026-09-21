# Travail différé (dépôt)

## Deferred from: code review of 10-3-valider-les-manifests-creos-et-les-parcours-de-rendu-critiques (2026-09-21)

- Smoke 10.3 : liste pages servies dupliquée depuis `runtime-demo-manifest.ts` — factoriser pour éviter dérive FM8.
- AC1c vs AC4 : bundle gouvernance (allowlist demo + sandbox pages) ≠ composition smoke — acceptable, unifier si maintenance pénible ; trace **[Review][Defer]** story 10.3 L246 + README manifests § lot pages / AC1c↔AC4.
- Crosswalk `collectOperationIdsFromOpenApi` : uniquement `paths` du YAML reviewable.
- Gate manifests : `readdirSync` plat sur `contracts/creos/manifests/` — convention **Arborescence** dans [`contracts/creos/manifests/README.md`](../../../contracts/creos/manifests/README.md) (pas de sous-dossiers tant que la gate n’est pas étendue).
- Validation widget Ajv avec `strict: false`.

## Deferred from: code review of 10-2-verifier-la-chaine-openapi-artefacts-generes-consommation-frontend (2026-09-21)

- Job `contracts-openapi` : `DATABASE_URL` / `REDIS_URL` sans services Postgres/Redis — OK tant que `app.openapi()` n’ouvre pas de session ; à revoir si import side-effect DB.
- Smoke `test_story_10_2_openapi_chain_ci_smoke.py` : assertion OR sur snapshot — durcir vers les trois chemins `git diff` explicites.
- Idempotence YAML : pas de test pytest double `--emit-contracts` (gate manuelle seulement).
- `openapi_chain.load_yaml_spec` : remplacer `assert` par erreur actionnable si YAML invalide.

## Deferred from: code review of 10-1-outiller-la-ci-minimale-pour-recyclique-peintre-nano-et-les-contrats (2026-09-21)

- Peloton Peintre `npm run test` : 3 tests en échec (`live-activity-presence-bridge`, `bandeau-live-live-source`, `bandeau-live-sandbox-compose` e2e) + erreurs associées mock `getLiveSnapshotBasePrefix` — préexistant avant story 10.1 ; job `peintre-nano-minimal` restera rouge sur `master` jusqu’à correction tests/code Peintre (hors scope anti-abus 10.1).
- Triggers morts `main`/`develop` dans `.github/workflows/deploy.yaml` — dette YAML documentée ; pas de refonte deploy prod (AC5) ; intégration canonique assurée par `ci-minimal.yml` sur `master`.
