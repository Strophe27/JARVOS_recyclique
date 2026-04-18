# Registre — cohérence transverse du shell recomposé (Epic 5, story 5.8)

**Date :** 2026-04-08  
**Périmètre :** validation transverse post-stories 5.1–5.7 (navigation, dashboard, listings, consultations, admin, libellés, layouts, états).  
**Références :** `contracts/creos/manifests/`, `contracts/openapi/recyclique-api.yaml`, `peintre-nano/src/app/demo/runtime-demo-manifest.ts`, checklist [2026-04-07_03_checklist-pr-peintre-sans-metier.md](./2026-04-07_03_checklist-pr-peintre-sans-metier.md).

---

## 1. Grille de validation (AC 1, 9)

### 1.1 Manifests transverses servis et chaîne runtime

| Fichier CREOS | `page_key` / rôle | Chargement |
|---------------|-------------------|------------|
| `navigation-transverse-served.json` | Navigation unique reviewable | `runtimeServedManifestLoadResult` dans `runtime-demo-manifest.ts` → `loadManifestBundle` |
| `page-transverse-dashboard.json` | `transverse-dashboard` | Idem, index bundle 4 |
| `page-transverse-admin-placeholder.json` | `transverse-admin-placeholder` | Index 5 |
| `page-transverse-admin-access-overview.json` | `transverse-admin-access-overview` | Index 6 |
| `page-transverse-admin-site-overview.json` | `transverse-admin-site-overview` | Index 7 |
| `page-transverse-listing-articles.json` | `transverse-listing-articles` | Index 8 |
| `page-transverse-listing-dons.json` | `transverse-listing-dons` | Index 9 |
| `page-transverse-consultation-article.json` | `transverse-consultation-article` | Index 10 |
| `page-transverse-consultation-don.json` | `transverse-consultation-don` | Index 11 |
| `page-bandeau-live-sandbox.json` (Epic 4, même bundle servi) | `bandeau-live-sandbox` | Index 3 (variante `use_live_source`) |

**Résolution page :** `RuntimeDemoApp` lit `selectedEntry.pageKey` depuis la nav **filtrée** (`filterNavigation(bundle.navigation, envelope)`), puis `bundle.pages.find(p => p.pageKey === key)`. Aucune arborescence métier transverse **exclusive** au code React : les chemins et clés proviennent du manifeste servi ; le routage navigateur est synchronisé avec ces chemins (pushState / URL profonde).

**Hiérarchie attendue (story) :** OpenAPI (contrats données) → enveloppe consommée côté UI (`ContextEnvelopeStub` / adaptateur auth) → `NavigationManifest` + `PageManifest` CREOS → `UserRuntimePrefs` (présentation locale uniquement, sans révéler la nav masquée — tests 3.5).

### 1.2 Parcours à exécuter (manuel ou e2e)

| Parcours | URL indicative | Preuve automatisée |
|----------|----------------|-------------------|
| Dashboard | `/dashboard` | `navigation-transverse-5-1.e2e.test.tsx`, `transverse-templates-5-6.e2e.test.tsx`, `transverse-states-5-7.e2e.test.tsx` |
| Listing articles | `/listings/articles` | Idem 5.1, 5.7 (empty) |
| Listing dons | `/listings/dons` | Idem 5.1 |
| Consultation article | `/consultation/article` | Idem 5.1, gabarit consultation (5.6) |
| Consultation don | `/consultation/don` | Idem 5.1 |
| Admin hub | `/admin` | Idem 5.1 |
| Admin access | `/admin/access` | Idem 5.1 |
| Admin site | `/admin/site` | Idem 5.1 |
| Navigation depuis manifest | Entrées `nav.transverse.*` + démo | Idem + `FilteredNavEntries` + `resolveNavEntryDisplayLabel` |

---

## 2. Isolation de contexte et permissions (AC 2)

**Scénarios documentés (jeu minimal reproductible via tests Vitest / jsdom) :**

1. **Nominal :** enveloppe par défaut démo avec permissions transverses + marqueur `site` → entrées dashboard, admin, listings, consultations visibles selon clés (`tests/e2e/navigation-transverse-5-1.e2e.test.tsx`).
2. **Refus / filtrage permissions :** sans clés transverses (`transverse.dashboard.view`, etc.) → entrées dashboard/admin masquées ; sans `transverse.listings.hub.view` → listings masqués, hub consultation conservé si permission consultation présente.
3. **Contexte `contexts_any: ["site"]` :** enveloppe sans marqueur site (`siteId` null, `contextMarkers` vides) → **toutes** les entrées transverses à visibilité site masquées (pas de fuite d’entrées « site » hors contexte site côté affichage nav).
4. **Enveloppe interdite / dégradée / périmée :** `filterNavigation` retourne `entries: []` (voir `filter-navigation-for-context.test.ts`, `context-envelope-freshness.test.ts`).

**Écart explicite :** la preuve **cross-site / cross-caisse** au sens production (multi-sites réels, fuite de données API) dépend du backend et de jeux de données terrain ; le registre considère la **couche UI** alignée sur l’enveloppe servie, avec dette « scénarios E2E navigateur + API réelle » pour Epic 6+ / gate Epic 10.

---

## 3. Layouts et états transverses (AC 3)

- **Gabarits :** `resolveTransverseMainLayoutMode` (`hub` vs `consultation`) pour `transverse-dashboard`, `transverse-listing-*`, `transverse-admin*`, fiches `transverse-consultation-*` ; enveloppement via `wrapUnmappedSlotContent` → `TransverseMainLayout` dans `RuntimeDemoApp` (story 5.6).
- **États chargement / vide / erreur :** slot `transverse-page-state-slot`, query `?transverseState=…` — couverture `transverse-states-5-7.e2e.test.tsx` + unitaires 5.7 ; pas d’effondrement du shell sur cas non critiques documentés.
- **Fallbacks runtime :** `reportRuntimeFallback`, `WidgetResolveFallback`, rejets manifeste — inchangés, couverts par tests 3.6 / 3.7 / registre widgets.

**Constat :** pas de deuxième pile « dashboard admin parallèle » hors `peintre-nano` pour le lot transverse servi.

---

## 4. Widgets et `data_contract` vs OpenAPI (AC 4)

| Zone | Widgets data (fetch métier) | `operation_id` OpenAPI | Statut |
|------|-----------------------------|-------------------------|--------|
| Pages transverses 5.2–5.4 (dashboard, listings, consultations, admin) | Aucun — uniquement `demo.text.block` | N/A (gap assumé, texte dans manifests) | **Écart documenté** dans les CREOS (`dashboard.data-gap`, `listing.hub.data-gap`, etc.) |
| Bac à sable bandeau live | `bandeau-live` | `recyclique_exploitation_getLiveSnapshot` | **Aligné** — `widgets-catalog-bandeau-live.json` + tests `creos-bandeau-live-manifests-4-1.test.ts` |

**Constat :** aucun appel Paheko / HelloAsso / e-mail depuis le front dans le périmètre transverse ; le slice data transverse attend des `operation_id` futurs (Epic 6+ / OpenAPI).

---

## 5. Libellés et visibilité (AC 5)

- Clés `label_key` `nav.transverse.*` dans `navigation-transverse-served.json`.
- Affichage : `presentationLabels` issus de l’enveloppe pour les clés connues (ex. dashboard démo) ; sinon repli sur la clé — cohérent avec la politique « libellés = présentation, pas source de vérité métier ».
- Nav / masquage : autorité `ContextEnvelope` + règles CREOS `visibility` ; pas de permission déduite côté UI au-delà du filtrage manifeste + enveloppe.

---

## 6. Registre explicite des gaps (AC 6)

### (a) Écarts contractuels ou runtime

- **Données transverses :** pas de widgets `data_contract` sur dashboard / listings / consultations / admin du lot — dépendance aux futurs `operation_id` et réponses API.
- **Preuve multi-contexte terrain :** à renforcer avec API réelle et profils utilisateurs réels (voir §2).

### (b) Dettes assumées

- **Mocks / adaptateur démo :** `createMockAuthAdapter`, `createDefaultDemoEnvelope` pour la majorité des e2e transverses ; backend réel optionnel via stack Docker (`README` racine).
- **Pages démo héritées :** `demo-home`, `demo-guarded-page`, etc. restent dans le **même** bundle servi pour compatibilité démo / régressions — non confondues avec le périmètre « transverse produit » mais présentes dans le chargement.

### (c) Écrans encore sur frontend-legacy

- Toute la **surface métier riche** (caisse, réception, adhérents, sync, etc.) reste sur `recyclique-1.4.4/frontend` (`http://localhost:4445` en local) tant que les epics 6–9 n’ont pas migré les flows — voir [2026-04-07_02_coexistence-frontends-locaux.md](./2026-04-07_02_coexistence-frontends-locaux.md).

### (d) Recommandations Epic 6+ (hors implémentation ici)

- Publier les `operation_id` listes / fiches transverses dans OpenAPI et raccorder des widgets data allowlistés.
- Ajouter des e2e **contre API dockerisée** pour permission réelle et marqueurs de contexte multi-site.
- Garder la promotion des manifests sous `contracts/creos/manifests/` comme gate reviewable (alignement Epic 10).

---

## 7. Synthèse roadmap / opérabilité (AC 8)

Les **points d’accès transverses** livrés en Epic 5 (dashboard, listings, consultations, admin transverse, bandeau sandbox) sont **utilisables** dans `peintre-nano` avec le bundle CREOS servi et une enveloppe démo ou backend conforme au contrat. Le **frontend legacy** demeure nécessaire pour l’exploitation métier complète jusqu’à migration progressive des epics domaine.

**Non-objectif respecté (AC 7) :** aucun gros flow métier ni page hardcodée hors runtime n’a été ajouté dans cette story ; livrable = documentation + validation par inspection et tests existants.

---

## 8. Preuves reproductibles (AC 9)

### Stack locale (documentée README racine)

```powershell
# Depuis la racine du dépôt JARVOS_recyclique
docker compose up --build
```

- **Peintre_nano :** `http://localhost:4444` (service `frontend`).
- **API :** `http://localhost:8000`.
- **Legacy :** `http://localhost:4445` (comparaison / périmètre non migré).

Parcours manuels : mêmes URLs que §1.2 (clic nav ou accès direct).

### Tests (rerun 2026-04-08)

```powershell
Set-Location peintre-nano
npm test
```

**Résultat :** 35 fichiers, **208** tests, **tous verts** (Vitest `run`). Les e2e transverses 5.1, 5.6, 5.7 couvrent navigation, gabarits et états sans dupliquer toute la batterie 5.7 pour cette passe documentaire.

### Checklist PR Peintre (rappel — cochée pour clôture 5.8)

- Pas de route métier transverse **uniquement** dans Peintre sans manifeste.
- Navigation / pages depuis contrats CREOS reviewables.
- `operation_id` pour tout widget data officiel (bandeau OK ; transverse = gap assumé).
- Pas d’intégration externe directe depuis le front transverse.
- Types OpenAPI générés non édités à la main (hors périmètre changement ici).
- Pas de Zustand / source de vérité métier parallèle identifiée sur le shell transverse servi.

---

## 9. Fichiers d’autorité consultés (audit rapide)

- `peintre-nano/src/app/PageRenderer.tsx` — `buildPageManifestRegions`, `WidgetResolveFallback`
- `peintre-nano/src/runtime/report-runtime-fallback.ts`
- `peintre-nano/src/runtime/filter-navigation-for-context.ts`
- `peintre-nano/src/app/templates/transverse/*`
- `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`
