# Comparatif headless kiosque vente — story 13.8 (2026-04-12)

**Méthode** : Chrome **headless** (`puppeteer-core` + binaire système), identifiants **uniquement** via variables d'environnement `PROOF_USER` / `PROOF_PASS` (ne pas versionner les valeurs). Script : `peintre-nano/scripts/capture-kiosque-comparatif-13-8.mjs`.

## Peintre (`http://localhost:4444/cash-register/sale`)

- **Signals JSON** : `references/artefacts/2026-04-12_08_preuves-kiosque-13-8-headless/signals-peintre-4444.json`
- **Capture pleine page** : `references/artefacts/2026-04-12_08_preuves-kiosque-13-8-headless/kiosque-peintre-4444-sale.png`
- **Constats DOM** (résumé) : `data-testid="cash-register-sale-kiosk"` présent ; grille `data-testid="cashflow-kiosk-category-grid"` présente ; extraits texte incluant **« Catégories »** et noms de catégories issus de `GET /v1/categories/`. Pas de `data-wizard-step` (stack Peintre / FlowRenderer, attendu vs legacy).

## Legacy (`http://localhost:4445`)

- **Tentative automatisée** : login OK, puis parcours **virtuel** `…/virtual/session/open?register_id=…` + saisie fond de caisse + navigation vers `…/virtual/sale`.
- **Résultat dans cet environnement** : la capture finale reste sur le **hub** `/cash-register` (signals : pas de grille catégories, pas de `data-wizard-step`). Hypothèses : refus API ou permissions `caisse.virtual.access` / état poste différent de la recette documentée matrice **03b** (2026-04-11).
- **Référence visuelle legacy déjà tenue** : matrice `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`, ligne **`ui-pilote-03b-caisse-virtuelle-legacy-urls`** (preuves MCP 2026-04-11).

## Synthèse produit (P0 « grille → ligne »)

- **Peintre** : preuve **automatisée** d’une surface kiosque avec **grille catégories** sur l’alias nominal `/cash-register/sale` (alignement intention blueprint 13.8 pour ce tronçon).
- **Legacy côte-à-côte même run** : non stabilisé en headless sans rejouer le parcours MCP humain ou une recette API identique à **03b** ; l’écart ne remet pas en cause le livrable Peintre mais **documente** la dépendance à l’environnement pour une capture legacy synchronisée.
