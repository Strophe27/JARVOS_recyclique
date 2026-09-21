# Travail différé (dépôt)

## Deferred from: code review of 10-1-outiller-la-ci-minimale-pour-recyclique-peintre-nano-et-les-contrats (2026-09-21)

- Peloton Peintre `npm run test` : 3 tests en échec (`live-activity-presence-bridge`, `bandeau-live-live-source`, `bandeau-live-sandbox-compose` e2e) + erreurs associées mock `getLiveSnapshotBasePrefix` — préexistant avant story 10.1 ; job `peintre-nano-minimal` restera rouge sur `master` jusqu’à correction tests/code Peintre (hors scope anti-abus 10.1).
- Triggers morts `main`/`develop` dans `.github/workflows/deploy.yaml` — dette YAML documentée ; pas de refonte deploy prod (AC5) ; intégration canonique assurée par `ci-minimal.yml` sur `master`.
