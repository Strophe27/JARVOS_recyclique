# Blueprint portage kiosque vente legacy vers Peintre_nano (Story **13.7**)

Date : **2026-04-12**  
Epic **13** — analyse **documentaire** uniquement ; **aucune** implementation UI reservee a la story **13.8**.

## Sommaire

- [Resume et perimetre](#resume-et-perimetre)
- [Rappel constats 13.6 utiles au kiosque](#rappel-constats-136-utiles-au-kiosque)
- [Superposition etats wizard legacy vs Peintre](#superposition-etats-wizard-legacy-vs-peintre)
- [Tableau blocs legacy vers Peintre](#tableau-blocs-legacy-vers-peintre)
- [Workflows clavier et densite operateur](#workflows-clavier-et-densite-operateur)
- [Mutualisation : reutiliser / etendre / creer](#mutualisation--reutiliser--etendre--creer)
- [CREOS : widget_props vs RuntimeDemoApp vs nouveau widget](#creos--widget_props-vs-runtimedemoapp-vs-nouveau-widget)
- [OpenAPI ContextEnvelope permissions](#openapi-contextenvelope-permissions)
- [Epilogue — prerequis story 13.8](#epilogue--prerequis-story-138)

---

## Resume et perimetre

**Objectif** : decomposer la surface **kiosque vente** legacy (`/cash-register/sale` et branches **virtuel** / **differe** sur le **meme** agencement `Sale.tsx`) en cibles reviewables **CREOS / widgets / slots / OpenAPI / ContextEnvelope**, pour que **13.8** implemente sans improvisation ni duplication de metier dans le routeur.

**Sources legacy lues** (extraits cites en fin de section [References fichiers](#references-fichiers)) :

- `Sale.tsx` : layout **3 colonnes** (`grid-template-columns: 1fr 2fr 1fr`), breakpoints **1200px** (colonne ticket masquee) et **768px** (pile verticale, `data-wizard-step` pilote visibilite pave via `numpadMode`).
- `SaleWrapper.tsx` : provider `CashStoreProvider` uniquement.
- `useCashWizardStepState` : machine d'etapes metier **`category` | `subcategory` | `weight` | `quantity` | `price`** ; inactivite **5 min** → retour **`category`**.
- `CenterColumn` expose **`data-wizard-step={numpadMode}`** avec valeurs **`idle` | `quantity` | `price` | `weight`** (couplage presentation / pave, distinct des etapes `CashWizardStep`).
- `SaleWizard.tsx` : panneaux **`data-step="category" | "subcategory" | "weight"`** et **`StepContent` `quantity` / `price`** ; **tablist** ARIA ; raccourcis **`cashKeyboardShortcuts`** (positions AZERTY categories) + **`keyboardShortcutHandler`** (legacy) ; gestion **Tab** documentee (focus piège dans l'etape).
- `Ticket.tsx`, `FinalizationScreen.tsx`, `CashSessionHeader.tsx`, `CashKPIBanner.tsx`, `Numpad.tsx`.

**Sources Peintre** :

- Manifeste : `contracts/creos/manifests/page-cashflow-nominal.json` (`page_key` **`cashflow-nominal`**, slots **`main`** / **`aside`**).
- Runtime : `RuntimeDemoApp.tsx` — alias kiosque, **`withCashflowNominalKioskSaleDashboard`** (`sale_kiosk_minimal_dashboard: true`), **`suppressCashflowNominalWorkspaceSaleAndAside`** (hub / session open / close **sans** wizard+ticket lateral).
- Widgets : `register-cashflow-widgets.ts` — `cashflow-nominal-wizard` → `CashflowNominalWizard.tsx` ; `caisse-brownfield-dashboard` ; `caisse-current-ticket` (cf. `peintre-nano/src/domains/cashflow/README.md`).
- Doc normative : `peintre-nano/docs/03-contrats-creos-et-donnees.md` § **11.3** (alias `/cash-register/sale`), § **13.1–13.3**, **RCN-02**, extension **13.6** (`sale_kiosk_minimal_dashboard`).

**Hors strategie par defaut** : pas d'**iframe legacy** ni de second frontend parallele comme solution par defaut (alignement `sprint-change-proposal-2026-04-12-parite-caisse-legacy-stricte.md` § 2.2).

---

## Rappel constats 13.6 utiles au kiosque

D'apres `references/artefacts/2026-04-12_04_certification-caisse-equivalence-legacy-13-6.md` et preuves `references/artefacts/2026-04-12_04_certification-13-6-preuves/` :

- Certification **troncon** hub → fond → **cadre** kiosque (**RCN-01**, **RCN-02**), chrome demo, **pas de double hub** sur reload (`sale_kiosk_minimal_dashboard`).
- Marqueur test **`data-testid="cash-register-sale-kiosk"`** (`RootShell.tsx`).
- Le **contenu riche** wizard / ticket / finalisation **n'etait pas** l'objet d'equivalence stricte : **13.7** porte la **granularite interne** du frame vente.

Aucune nouvelle capture MCP n'est **requise** pour combler l'inventaire structurel (le gap **POST /v1/sales/** authentifie reste nomme en **13.6** ; 13.7 ne refait pas la certification).

---

## Superposition etats wizard legacy vs Peintre

### Legacy — deux niveaux d'etat

| Niveau | Mechanisme | Etats / valeurs | Role |
|--------|--------------|-----------------|------|
| **Metier / etapes article** | `useCashWizardStepState` (singleton) | `category` → (`subcategory` si besoin) → `weight` → `quantity` → `price` → retour `category` ; timeout **5 min** → `category` | Pilotage **SaleWizard** (tablist, contenus etapes) |
| **Presentation pave** | `Sale.tsx` `numpadMode` + `data-wizard-step` sur `CenterColumn` | `idle` \| `quantity` \| `price` \| `weight` | Affiche/masque **Numpad** (`LeftColumn` cache si voisin `data-wizard-step="idle"` ; centre **span 2** si `idle`) |

### Peintre — `cashflow-nominal` sur alias kiosque

| Zone | Comportement actuel (code + doc 03) |
|------|-------------------------------------|
| **Slots** | `main` : `caisse-brownfield-dashboard` (hub **supprime** du corps utile sur kiosque via `sale_kiosk_minimal_dashboard`) + `cashflow-nominal-wizard` ; `aside` : `caisse-current-ticket` |
| **Wizard** | `CashflowNominalWizard` : **FlowRenderer** + brouillon `cashflow-draft-store` + flux **6.x** (ticket en attente, remboursement, encaissements speciaux / sociaux) integres dans le **meme** widget — **modele d'etat different** du legacy (pas de tablist category/subcategory identique) |
| **Transitions** | **Presentation** : `RuntimeDemoApp` (chemin URL → `suppress…`, `withCashflowNominalKioskSaleDashboard`, `hideNav`, marqueur kiosque) — **sans** regles metier caisse dans le routeur (doc 03) |
| **Donnees** | Appels via clients types `sales-client.ts`, enveloppe `ContextEnvelope`, permissions `caisse.*` (cf. README domaine cashflow) |

**Separation presentation vs serveur** : cote legacy, `fetchCategories` au mount (`Sale.tsx`) et stores caisse alimentent les grilles ; les transitions d'etapes `CashWizardStepStateManager` sont **locales** jusqu'a `submitSale` / POST. Cote Peintre, le **FlowRenderer** orchestre des etapes declaratives ; toute nouvelle etape **metier** doit rester **cote flow / widget** ou **OpenAPI**, pas dans `syncSelectionFromPath`.

---

## Tableau blocs legacy vers Peintre

### Valeurs autorisees — colonne « Statut ligne matrice » (AC #1)

**Une seule etiquette AC par ligne** (pas de compose `X / Y` dans cette colonne). Les precisions restent dans « Cible Peintre » ou « API / contrat ».

| Valeur AC | Role |
|-----------|------|
| `Reproduire tel quel` | Intention UX et/ou rendu a conserver sans changement de semantique pour le perimetre 13.8 retenu (ex. flux deja alignes certification / doc 03). |
| `Adapter langage Peintre (justification)` | Ecart volontaire ou structure UI / flow differente du legacy ; la **justification** est portee dans les autres colonnes ou en note de ligne. |
| `Reporter / gap contrat` | Depend d'un **slot** / **widget** non manifeste, d'un **contrat** ou **operationId** non fige, ou d'une **preuve** (ex. POST authentifie kiosque) a completer avant implementation. |
| `Hors scope (ref)` | Hors 13.8 nominal ou confie a un autre epic ; **(ref)** = document ou epic explicite. |

### Legende de mapping (anciens libelles → valeur AC)

Lecture des brouillons ou notes d'equipe qui utilisaient un vocabulaire plus court :

| Ancien libelle ou usage | Valeur AC retenue |
|-------------------------|-------------------|
| OK ; deja couvert ; equivalence troncon / pilotes **03d** / RCN | `Reproduire tel quel` |
| Partiel ; parite a verrouiller 13.8 ; ecart structurel wizard / modale (sans blocage contrat seul) | `Adapter langage Peintre (justification)` |
| Derogation PO (en dehors du tableau clavier AC #3) | `Adapter langage Peintre (justification)` — lier au correct course ou a la matrice pilote |
| Reporter ; gap OpenAPI ; HITL / preuve POST | `Reporter / gap contrat` |
| Hors 13.8 ; KPI reserves hub ; autre epic | `Hors scope (ref)` |

**Note** : la sous-section [Workflows clavier](#workflows-clavier-et-densite-operateur) (AC #3) conserve les mentions **Reproduire** / **Derogation PO** / **non applicable** ; ce vocabulaire **ne** remplace **pas** les quatre valeurs AC du tableau ci-dessous.

| Bloc legacy | Fichier(s) source | Etape / etat UI | Cible Peintre (`page_key` / slot / widget) | API / contrat (famille) | Statut ligne matrice |
|-------------|-------------------|-----------------|--------------------------------------------|-------------------------|------------------------|
| En-tete session (caissier, session, badge differe, fermer session) | `CashSessionHeader.tsx`, `Sale.tsx` | Toujours visible en kiosque | `cashflow-nominal` **main** — pas de slot dedie aujourd'hui : header **absent** du manifeste ; wizard + shell **minimalChrome** (13.6). Piste : slot **header-kiosk** ou **widget_props** shell sans metier dans le routeur. | `users/me` legacy vs `ContextEnvelope` Peintre ; navigation `session/close` | `Reporter / gap contrat` |
| Bandeau KPI (stats live, dernier ticket, lien externe) | `CashKPIBanner.tsx`, hooks `useCashLiveStats` / `useVirtualCashLiveStats` | Toujours visible sous header | **Absent** du manifeste `page-cashflow-nominal.json`. Piste : widget optionnel si le PO tranche **kiosque** vs **hub uniquement**. | `stats/live`, `cash-sessions/*` (familles inventoriees matrice **03**) ; lier `operationId` en revue OpenAPI si conserve. | `Reporter / gap contrat` |
| Colonne pave numerique | `Numpad.tsx`, `Sale.tsx` | `numpadMode` != `idle` ; cache si `idle` + grille categorie | **Absent** en widget dedie ; saisies **Mantine** dans `CashflowNominalWizard`. | N/A presentation | `Adapter langage Peintre (justification)` |
| **SaleWizard** — selection categorie | `SaleWizard.tsx` (`data-step="category"`) | `stepState.currentStep === 'category'` | `cashflow-nominal-wizard` / **main** — etapes **flow** (pas de tablist categories identique legacy). | `GET /v1/categories` (legacy store) | `Adapter langage Peintre (justification)` |
| **SaleWizard** — sous-categorie | idem `subcategory` | Si categorie parent avec enfants | idem | categories | `Adapter langage Peintre (justification)` |
| **SaleWizard** — poids / multi-pesee | `MultipleWeightEntry`, `data-step="weight"` | `weight` | idem — masques poids dans flow | line items / pesee selon contrat | `Adapter langage Peintre (justification)` |
| **SaleWizard** — quantite | `data-step="quantity"` | `quantity` | idem | idem | `Adapter langage Peintre (justification)` |
| **SaleWizard** — prix / presets / calculateur | `data-step="price"`, `PresetButtonGrid`, `PriceCalculator` | `price` | idem + encaissements speciaux **panneaux** separes Peintre | `presets`, ventes | `Adapter langage Peintre (justification)` |
| Grilles categories — **intention** parcours (selection categorie / navigation) | `CategorySelector`, `EnhancedCategorySelector` | Tab **Categorie** | Flow + categories via auth/runtime ; conserver l'intention **parcours** categorie → article. | categories | `Reproduire tel quel` |
| Grilles categories — **rendu** chrome, badges, raccourcis AZERTY | `ShortcutBadge`, grilles legacy | Tab **Categorie** | Rendu **Mantine** / flow CREOS ; raccourcis a recroiser avec [Workflows clavier](#workflows-clavier-et-densite-operateur). | categories | `Adapter langage Peintre (justification)` |
| **Ticket** lateral — liste, edition, notes, finaliser | `Ticket.tsx` | Footer fixe + scroll | Slot **`aside`** — `caisse-current-ticket` | `recyclique_sales_getSale` (README) ; actions vente | `Adapter langage Peintre (justification)` |
| Pied ticket — **Finaliser vente** | `Ticket.tsx` → `handleFinalizeSale` | declenche `FinalizationScreen` | Actions dans wizard / ticket brownfield | POST vente — preuve **POST** authentifiee kiosque : gap **13.6** / **HITL** | `Reporter / gap contrat` |
| **FinalizationScreen** (modale) | `FinalizationScreen.tsx` | Overlay plein ecran | Flow etape paiement / **postCreateSale** dans wizard (pas modale separee identique). | `submitSale` / OpenAPI ventes | `Adapter langage Peintre (justification)` |
| Popup succes | `Sale.tsx` inline apres `submitSale` | Toast / div fixe | Pattern defensif 6.9 / etats wizard | — | `Adapter langage Peintre (justification)` |
| Chargement / erreur session | `loading` sur header + stores | `CashSessionHeader` `isLoading` | `DATA_STALE`, `CashflowClientErrorAlert` (wizard) | sync / session | `Adapter langage Peintre (justification)` |
| Navigation **Fermer session** | `handleCloseSession` | URL `…/session/close` selon branche reel / virtuel / differe | Alias runtime deja mappes (doc 03 **13.3**) ; pilotes **03d**, RCN. | session close | `Reproduire tel quel` |

**Arbitrage KPI (trace unique)** : tant que le PO ne tranche pas **kiosque** vs **hub uniquement**, le bandeau KPI reste `Reporter / gap contrat` (dependances stats + manifeste). Si le PO classe le KPI **strictement** hors cadre 13.8, reclasser la ligne en `Hors scope (ref)` avec renvoi explicite (epic / proposal) — **sans** conserver un double statut dans la colonne.

---

## Workflows clavier et densite operateur

| Action utilisateur | Legacy (comportement) | Cible Peintre **13.8** | Testable par |
|--------------------|------------------------|-------------------------|--------------|
| Chiffres 0-9 / pave / AZERTY top-row | `Sale.tsx` `keydown` global (hors input) alimente `handleNumpadDigit` ; map AZERTY **numerique** | Si pave reintroduit ou equivalence : **meme** principe hors champs texte | **e2e** + manuel clavier |
| `.` `,` decimal | `handleNumpadDecimal` | Idem si mode pave | e2e |
| **Backspace** / **Escape** | efface / clear | Idem | e2e |
| **Enter** sur etape **category** avec lignes ticket | **Finaliser vente** (`handleFinalizeSale`) | **Reproduire** ou **Derogation PO** si risque conflit avec validation champ | **manuel** + e2e |
| **Tab** dans wizard | `handleTabKey` — cycle focus dans l'etape (`SaleWizard.tsx`) | Ordre de tab **explicite** dans flow ou **Derogation PO** | **manuel** |
| **Touches A-Z** positions | `CashKeyboardShortcutHandler` — selection **categorie** par position (26 max) | **Reproduire** si grille categories conservee ; sinon **Derogation PO** (accessibilite / clavier AZERTY) | **manuel** + MCP snapshot focus |
| Raccourcis legacy secondaires | `keyboardShortcutHandler` (branches selon mode) | Auditer doublons avec `cashKeyboard…` ; documenter | **manuel** |
| Focus auto **prix** a l'entree | `useEffect` + `data-testid="price-input"` | Comparer premier focus Peintre (`CashflowNominalWizard`) | **manuel** |

**Regle correct course** : toute equivalence **stricte** clavier non reproduite en **13.8** doit etre tracee **Derogation PO** avec lien proposal / matrice.

---

## Mutualisation : reutiliser / etendre / creer

| Composant legacy (chemin) | Strategie | Justification |
|---------------------------|-----------|-----------------|
| `Numpad.tsx` | **Creer** ou **etendre** widget `caisse-numpad` **si** PO impose pave tactile identique | Aujourd'hui absent de Peintre kiosque ; pourrait servir **reception** ou **caisse admin** si mutualise |
| `SaleWizard.tsx` (grilles, tablist) | **Non-partage** direct ; **portage logique** vers **flows CREOS** + `CashflowNominalWizard` | Trop couple styled-components + stores legacy |
| `Ticket.tsx` | **Etendre** `caisse-current-ticket` **ou** sous-composants dans widget existant | Slot **aside** deja prevu |
| `FinalizationScreen.tsx` | **Etendre** etapes **FlowRenderer** / wizard | Eviter seconde modale hors contrat |
| `CashSessionHeader.tsx` | **Creer** slot **header-kiosk** ou **widget** `caisse-session-strip` | Manifeste actuel ne porte pas l'en-tete legacy |
| `CashKPIBanner.tsx` | **Creer** widget optionnel **ou** **Hors scope** si KPI restent hub | Depend produit |
| `CategorySelector` / `EnhancedCategorySelector` | **Etendre** data-driven dans wizard ou widget **categories** mutualisable | Alignement OpenAPI categories |

---

## CREOS : widget_props vs RuntimeDemoApp vs nouveau widget

| Ajustement | Ou le poser | Exemples deja en prod |
|------------|-------------|----------------------|
| Libelles hub, cartes, CTA session | **`widget_props`** sur `caisse-brownfield-dashboard` dans `page-cashflow-nominal.json` | `workspace_heading`, `presentation_surface`, `cash_register_hub_base_path` |
| Masquage hub sur reload kiosque | **`widget_props`** injectes par **`RuntimeDemoApp.withCashflowNominalKioskSaleDashboard`** | `sale_kiosk_minimal_dashboard: true` |
| Retrait wizard+ticket sur hub / session | **`RuntimeDemoApp`** filtre slots (`suppressCashflowNominalWorkspaceSaleAndAside`) | Pas dans le JSON statique seul |
| Nouveau pave / header kiosque | **Nouveau widget** enregistre + slot dans manifeste **ou** extension **aside** / **main** ordonnee | Eviter logique dans `RuntimeDemoApp` au-dela du routage d'alias |

**Regle** : ne pas melanger **surcouche route** (alias, hide nav, remount keys) avec **regles metier article** (quantites, presets) — ces dernieres restent **stores / API / flow**.

---

## OpenAPI ContextEnvelope permissions

| Sujet | Reference documentee |
|-------|----------------------|
| Hierarchie de verite | `03-contrats-creos-et-donnees.md` § principe general |
| Permissions caisse | `page-cashflow-nominal.json` `required_permission_any_keys` ; enveloppe demo `PERMISSION_CASHFLOW_*` dans `CashflowNominalWizard.tsx` |
| Operations ventes | `peintre-nano/src/domains/cashflow/README.md` — `recyclique_sales_createSale`, `getSale` ; completer depuis `contracts/openapi/recyclique-api.yaml` en revue |
| **Gap a ouvrir** | Header KPI **live** si conserve : lier explicitement aux `operationId` stats (matrice **03** mentionne familles) |

---

## Epilogue — prerequis story **13.8**

- **Prerequis** : **checklist** de la [tableau blocs](#tableau-blocs-legacy-vers-peintre) + [workflows clavier](#workflows-clavier-et-densite-operateur) **approuvees** par le PO (pas besoin de reecrire les AC de **13.8** ici).
- **Story suivante** : `_bmad-output/implementation-artifacts/13-8-implementer-la-traduction-kiosque-legacy-retenue-dans-peintre-nano.md` (implementation serielle post-blueprint).
- **Priorisation suggeree** (planification seulement) :
  - **P0** : en-tete session + coherence fermeture session (deja route alias) ; ticket + finalisation alignes **POST** reviewable.
  - **P1** : pave / focus / raccourcis categories si le PO valide une **equivalence stricte** (cf. tableau blocs + workflows clavier, sans reutiliser la colonne « Statut ligne matrice » comme shorthand **OK**).
  - **P2** : bandeau KPI kiosque si PO valide le perimetre.

---

## References fichiers

- `recyclique-1.4.4/frontend/src/pages/CashRegister/Sale.tsx` (grille, `data-wizard-step`, handlers clavier globaux, lignes ~18–115, ~483–574, ~576–677).
- `recyclique-1.4.4/frontend/src/pages/CashRegister/SaleWrapper.tsx`.
- `recyclique-1.4.4/frontend/src/hooks/useCashWizardStepState.ts`.
- `recyclique-1.4.4/frontend/src/components/business/SaleWizard.tsx` (`data-step`, tablist ~1317+, shortcuts ~383+).
- `recyclique-1.4.4/frontend/src/utils/cashKeyboardShortcuts.ts`.
- `recyclique-1.4.4/frontend/src/components/business/Ticket.tsx`, `FinalizationScreen.tsx`, `CashSessionHeader.tsx`, `CashKPIBanner.tsx`, `components/ui/Numpad.tsx`.
- `contracts/creos/manifests/page-cashflow-nominal.json`.
- `peintre-nano/src/app/demo/RuntimeDemoApp.tsx`, `peintre-nano/src/domains/cashflow/CashflowNominalWizard.tsx`, `peintre-nano/docs/03-contrats-creos-et-donnees.md`.
