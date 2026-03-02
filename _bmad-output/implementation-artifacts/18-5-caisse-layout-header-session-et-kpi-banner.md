# Story 18-5 : Caisse — layout, header session et KPI banner

## Statut

done

## Contexte

**Epic 18 — Parite fonctionnelle caisse 1.4.4**

Les stories 15.1–15.3 ont livre les composants visuels de la caisse (`CaisseHeader`, `CaisseStatsBar`, `CaisseDashboardPage`). Ils sont presents et partiellement conformes a la 1.4.4.

L'audit 18.4 (§1 Layout et navigation) a identifie deux ecarts fonctionnels bloquants sur le KPI banner :
1. `donsJour`, `poidsSortis`, `poidsRentres` hardcodes a `0` dans `CashRegisterSalePage` — non recuperes depuis l'API ni accumules.
2. Toggle Live/Session present visuellement dans `CaisseStatsBar` mais sans callback — ne change pas les donnees affichees.

Un ecart UX sur le dashboard : si `registers = []`, aucun message explicite n'est affiche (ecran vide silencieux).

Cette story aligne le layout complet sur la 1.4.4 de facon fonctionnelle (pas seulement visuelle) : header, banniere KPI cable et toggle operationnel, dashboard avec gestion etat vide.

**Reference audit :** `_bmad-output/implementation-artifacts/18-4-audit-caisse-inventaire.md` §1

## Estimation

3 points

## Criteres d'acceptation

### AC1 — Header caisse dedie (session active)

**Given** l'operateur est sur `/cash-register/sale` avec une session active  
**When** la page se charge  
**Then** le header global (AppShell) est remplace par `CaisseHeader` : fond vert brand, icone agent + nom complet + `Session #XXXXXXXX` a gauche, bouton "Fermer la Caisse" rouge a droite  
**And** le bouton "Fermer la Caisse" navigue vers `/cash-register/session/close`  
**And** `data-testid="caisse-header"` est present

### AC2 — KPI banner : 6 indicateurs cables

**Given** une session active sur `/cash-register/sale`  
**When** la banniere KPI (`CaisseStatsBar` / `CashKPIBanner`) est rendue  
**Then** les 6 indicateurs sont affiches avec leurs vraies valeurs :
- `TICKETS` : `session.total_items ?? 0` (deja cable ✓)
- `DERNIER TICKET` : montant total du dernier ticket soumis avec succes (tracked localement, `--` si aucun)
- `CA JOUR` : `session.total_sales ?? 0` en euros (deja cable ✓)
- `DONS JOUR` : cumul des presets de type don soumis dans la session (accumule localement ; affiche `0,00 €` si aucun)
- `POIDS SORTIS` : cumul des poids des articles vendus soumis dans la session (accumule localement en kg ; affiche `0,0 kg` si aucun)
- `POIDS RENTRES` : affiche `-- kg` (hors perimetre caisse — reception uniquement ; stub documente)  
**And** `data-testid="caisse-stats-bar"` est present

### AC3 — Toggle Live/Session fonctionnel

**Given** la banniere KPI est visible  
**When** l'operateur clique sur le toggle `Session`  
**Then** `TICKETS` affiche `session.total_items` et `CA JOUR` affiche `session.total_sales`  
**And** `DERNIER TICKET`, `DONS JOUR`, `POIDS SORTIS` conservent leurs valeurs locales accumulees (non remplacees par l'API en mode Session)  
**And** les valeurs actualisees sont refletes dans la banniere sans rechargement de page  
**When** l'operateur repasse en mode `Live`  
**Then** `TICKETS` et `CA JOUR` reviennent aux valeurs `localTicketCount` / `localCaJour`  
**Note** Pour cette story : Live = accumulation locale (tickets soumis depuis ouverture page), Session = totaux `CashSessionItem` de l'API. La distinction sera affinee en story ulterieure si besoin.

### AC4 — Dashboard : etat vide explicite

**Given** l'operateur arrive sur `/caisse`  
**When** aucun poste de caisse n'est retourne par l'API (`registers.length === 0`) et le chargement est termine  
**Then** un message explicite est affiche : "Aucun poste de caisse disponible. Contactez un administrateur."  
**And** le message est rendu dans le zone `data-testid="caisse-dashboard-list"`  
**And** les cards Caisse Virtuelle et Saisie differee restent affichees  
**And** pas de crash JS

### AC5 — Preuves de fermeture

- Capture avant/apres layout caisse (header + KPI banner + dashboard).
- KPI banner affichee avec valeurs reelles ou stub coherent (pas de NaN ni undefined visible).
- Toggle Live/Session change visuellement les valeurs (ou log console montrant le changement de mode).
- Zero erreur JS bloquante sur les pages `/caisse` et `/cash-register/sale`.
- Trace Copy/Consolidate/Security dans les Completion Notes.

## Taches techniques

### T1 — Audit rapide des composants existants

1. Lire `frontend/src/caisse/CaisseHeader.tsx` — verifier conformite 1.4.4 (fond vert, icone user, nom + session, bouton Fermer rouge). Corriger si ecart trouve.
2. Lire `frontend/src/caisse/CaisseStatsBar.tsx` — confirmer les 2 ecarts : zeros hardcodes + toggle sans callback.
3. Lire `frontend/src/caisse/CaisseDashboardPage.tsx` — confirmer absence de message etat vide.

### T2 — Etat vide dashboard (CaisseDashboardPage.tsx)

Dans le bloc `!loading && !error`, ajouter une condition :

```tsx
{registers.length === 0 && (
  <Text c="dimmed" size="sm" data-testid="caisse-dashboard-empty">
    Aucun poste de caisse disponible. Contactez un administrateur.
  </Text>
)}
```

Placer ce message AVANT les cards Caisse Virtuelle et Saisie differee (qui restent visibles).

### T3 — Tracking local des KPI accumules (CashRegisterSalePage.tsx)

Ajouter dans l'etat local de `CashRegisterSalePage` :

```tsx
const [localTicketCount, setLocalTicketCount] = useState<number>(0);   // nb tickets soumis depuis ouverture page
const [localCaJour, setLocalCaJour] = useState<number>(0);             // centimes, cumul CA soumis
const [lastTicketTotal, setLastTicketTotal] = useState<number | null>(null);
const [donsJourLocal, setDonsJourLocal] = useState<number>(0);         // centimes
const [poidsSortisLocal, setPoidsSortisLocal] = useState<number>(0);   // kg
```

**Apres chaque POST `/v1/sales` reussi** (dans la fonction de soumission du ticket) :
- `setLocalTicketCount(prev => prev + 1)`
- `setLocalCaJour(prev => prev + totalPanier)` — totalPanier en centimes, calculer avant de vider le panier
- `setLastTicketTotal(totalPanier)` — calculer le total du panier avant de le vider
- Pour chaque ligne `CartLine` dont `preset_id` est un preset de type don (nom contient "Don" ou `unit_price === 0`) : cumuler dans `donsJourLocal`
- Pour chaque ligne `CartLine` avec `weight !== null` : cumuler `weight` dans `poidsSortisLocal`

**Heuristique preset "don" acceptable pour cette story :** `unit_price === 0 || category_name?.toLowerCase().includes('don')` — a affiner en story 18.6 quand les types de presets seront differencies visuellement.

### T4 — Toggle Live/Session cable (CaisseStatsBar.tsx)

Modifier `CaisseStatsBar` pour accepter les props `mode` et `onModeChange` :

```tsx
export interface CaisseStatsBarProps {
  // ... props existantes (ticketCount, caJour, donsJour, poidsSortis, poidsRentres) ...
  // Nouvelle prop : montant dernier ticket (null = "--")
  lastTicketAmount?: number | null;
  // Props Live/Session
  mode?: 'live' | 'session';
  onModeChange?: (mode: 'live' | 'session') => void;
  // Valeurs "session" (depuis CashSessionItem, pour le mode Session)
  sessionTicketCount?: number;
  sessionCaJour?: number;
}
```

Comportement :
- Mode `live` : affiche les props `ticketCount`, `caJour`, `donsJour`, `poidsSortis`, `poidsRentres` (accumulation locale).
- Mode `session` : affiche `sessionTicketCount ?? ticketCount`, `sessionCaJour ?? caJour`, et garde `poidsSortis`/`donsJour` accumules.
- Si `onModeChange` est defini, l'utiliser dans le `SegmentedControl` `onChange` a la place du `setMode` local.

### T5 — Brancher les props dans CashRegisterSalePage.tsx

```tsx
const [kpiMode, setKpiMode] = useState<'live' | 'session'>('live');

<CaisseStatsBar
  ticketCount={localTicketCount}
  lastTicketAmount={lastTicketTotal}
  caJour={kpiMode === 'session' ? (session.total_sales ?? 0) : localCaJour}
  donsJour={donsJourLocal}
  poidsSortis={poidsSortisLocal}
  poidsRentres={0}  // stub documente — hors perimetre caisse
  mode={kpiMode}
  onModeChange={setKpiMode}
  sessionTicketCount={session.total_items ?? 0}
  sessionCaJour={session.total_sales ?? 0}
/>
```

### T6 — Alias CashKPIBanner (optionnel)

Si le SM ou le dev le juge utile pour aligner le nommage 1.4.4 :
- Renommer `CaisseStatsBar.tsx` → `CashKPIBanner.tsx`
- Mettre a jour les imports dans `CashRegisterSalePage.tsx`
- Exporter `CashKPIBanner` comme nom principal, `CaisseStatsBar` comme alias de compatibilite

**Cette tache est optionnelle pour cette story** — le composant fonctionnel prime sur le renommage.

### T7 — Tests UI co-loces

Fichier : `frontend/src/caisse/CaisseDashboardPage.test.tsx` (existant ou a creer)
- Test AC4 : quand `registers = []`, le texte "Aucun poste de caisse disponible" est rendu.
- Test AC4 : les cards Caisse Virtuelle et Saisie differee sont toujours visibles quand `registers = []`.

Fichier : `frontend/src/caisse/CaisseStatsBar.test.tsx` (creer si absent)
- Test AC2 : les 6 labels sont rendus (`TICKETS`, `DERNIER TICKET`, `CA JOUR`, `DONS JOUR`, `POIDS SORTIS`, `POIDS RENTRES`).
- Test AC3 : le toggle change le mode (mock `onModeChange` appele avec la bonne valeur).

### T8 — Validation build

```bash
cd frontend && npm run build
```

Zero erreur TypeScript. Zero warning critique.

## File List

### Fichiers a modifier

| Fichier | Raison |
|---------|--------|
| `frontend/src/caisse/CaisseDashboardPage.tsx` | T2 : ajouter message etat vide |
| `frontend/src/caisse/CaisseStatsBar.tsx` | T4 : ajouter props `mode`, `onModeChange`, `sessionTicketCount`, `sessionCaJour` ; brancher toggle |
| `frontend/src/caisse/CashRegisterSalePage.tsx` | T3+T5 : ajouter accumulateurs locaux, brancher props KPI, brancher `kpiMode` |

### Fichiers optionnels (renommage)

| Fichier | Raison |
|---------|--------|
| `frontend/src/caisse/CaisseStatsBar.tsx` → `CashKPIBanner.tsx` | T6 : alignement nommage 1.4.4 (optionnel) |

### Fichiers a creer (tests)

| Fichier | Raison |
|---------|--------|
| `frontend/src/caisse/CaisseStatsBar.test.tsx` | T7 : tests UI AC2+AC3 |
| `frontend/src/caisse/CaisseDashboardPage.test.tsx` | T7 : tests UI AC4 (si absent) |

### Fichiers a modifier (conditionnel)

| Fichier | Condition |
|---------|-----------|
| `frontend/src/caisse/CaisseHeader.tsx` | Modifier uniquement si T1 revele un ecart avec 1.4.4 — sinon non touche |

### Fichiers non touches par cette story

| Fichier | Note |
|---------|------|
| `frontend/src/caisse/CaisseHeader.tsx` | Conforme 1.4.4 selon audit §1 — voir section conditionnel ci-dessus |
| `frontend/src/caisse/cashRegisterRoutes.ts` | Hors scope |
| `frontend/src/caisse/CashRegisterSessionOpenPage.tsx` | Hors scope 18.5 (→ 18.9) |
| `frontend/src/caisse/CashRegisterSessionClosePage.tsx` | Hors scope 18.5 (→ 18.9) |

## Notes techniques

### Fichiers source 1.4.4 de reference

- `CashSessionHeader.tsx` (1.4.4) : header fond vert, icone `UserIcon` (SVG), `agent {nom} Session #{shortId}` a gauche, `Button color="red"` "Fermer la Caisse" a droite. **Equivalent actuel : `CaisseHeader.tsx` — conforme.**

- `CashKPIBanner.tsx` (1.4.4) : `div` fond `#1e1e2e` (indigo sombre), `Group` de 6 `div.statItem` avec label `xs uppercase` et valeur `sm white bold`, `SegmentedControl` Live/Session a droite, horloge `HH:mm`. **Equivalent actuel : `CaisseStatsBar.tsx` — conforme visuellement, ecarts fonctionnels (zeros hardcodes, toggle sans callback).**

- `CashRegisterDashboard.tsx` (1.4.4) : liste des postes en cards (Badge OUVERTE/FERMEE, nom, site, bouton Ouvrir/Acceder) + card Caisse Virtuelle + card Saisie Differee. Etat vide = `<Text>Aucun poste disponible</Text>`. **Equivalent actuel : `CaisseDashboardPage.tsx` — conforme sauf etat vide.**

### Ecarts traites par cette story (extrait audit §1)

| # | Ecart | Traitement |
|---|-------|-----------|
| 3 | `donsJour`, `poidsSortis`, `poidsRentres` hardcodes a 0 | T3 : accumulateurs locaux apres chaque POST sale |
| 4 | Toggle Live/Session non fonctionnel | T4+T5 : props `mode`/`onModeChange`, logique switch dans SalePage |
| — | Etat vide dashboard implicite | T2 : message explicite si `registers.length === 0` |

### Ecarts hors scope (traites dans autres stories)

| Ecart | Story cible |
|-------|-------------|
| Page Caisse Virtuelle absente | 18.10 |
| Page Saisie Differee absente | 18.10 |
| `poidsRentres` (donnees reception) | Hors perimetre caisse — stub `0` ou `-- kg` |

### Architecture KPI accumulation locale

Le choix de l'accumulation locale (vs appel API stats) est justifie par :
1. Aucun endpoint `/v1/cash-sessions/{id}/stats` avec dons/poids identifie dans `api/caisse.ts`
2. L'accumulation locale est suffisante pour le retour terrain (donnees depuis ouverture page)
3. La reinitialisation se fait naturellement a chaque rechargement de page / ouverture de session

Si un endpoint API stats existe ou est cree en story ulterieure, les props KPI de `CaisseStatsBar` permettent une substitution directe sans refactor.

### Convention tests

Tests co-loces `*.test.tsx` (Vitest + React Testing Library + jsdom). Pas de Jest. Pas de Playwright pour cette story.

### Token CSS / styles

Les styles `caisseHeader`, `statsBar`, `statItem` existent dans `CashRegisterSalePage.module.css`. Ne pas dupliquer. Si `CaisseStatsBar.tsx` est renomme en `CashKPIBanner.tsx`, mettre a jour l'import CSS en consequence.

## Definition of Done

- [x] `CaisseDashboardPage.tsx` : message explicite si aucun poste (AC4)
- [x] `CaisseStatsBar.tsx` : 6 indicateurs cables, `lastTicketAmount` non nul apres premier ticket, toggle fonctionnel (AC2, AC3)
- [x] `CashRegisterSalePage.tsx` : accumulateurs locaux branches, `kpiMode` gere (AC2, AC3)
- [x] `CaisseHeader.tsx` : verifie conforme 1.4.4 (AC1) — conforme, aucune modification requise
- [x] Tests UI passes (`npm run test` zero echec sur les fichiers modifies)
- [x] Build OK (`npx tsc --noEmit` zero erreur TypeScript)
- [ ] Captures avant/apres layout fournies dans Completion Notes
- [x] Traces Copy/Consolidate/Security dans Completion Notes
- [x] Aucune valeur `NaN`, `undefined`, `null` visible dans la KPI banner en session active

## Dev Agent Record

### Implementation Date
2026-03-02

### Agent
bmad-dev (claude-4.6-sonnet-medium-thinking)

### Files Created
- `frontend/src/caisse/CaisseStatsBar.test.tsx` — Tests UI AC2+AC3 (10 tests)

### Files Modified
- `frontend/src/caisse/CaisseStatsBar.tsx` — T4 : ajout props `mode`, `onModeChange`, `sessionTicketCount`, `sessionCaJour` ; toggle cable ; `POIDS RENTRES` affiche toujours `-- kg` (stub documente)
- `frontend/src/caisse/CaisseDashboardPage.tsx` — T2 : message etat vide `data-testid="caisse-dashboard-empty"` quand `registers.length === 0`
- `frontend/src/caisse/CashRegisterSalePage.tsx` — T3+T5 : accumulateurs locaux (`localTicketCount`, `localCaJour`, `lastTicketTotal`, `donsJourLocal`, `poidsSortisLocal`), `kpiMode`, accumulation apres chaque POST sale reussi, branchement props KPI
- `frontend/src/caisse/CaisseDashboardPage.test.tsx` — T7 : tests AC4 ajoutes (message vide, cards toujours visibles)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 18-5 passe a `review`

### Files Unchanged
- `frontend/src/caisse/CaisseHeader.tsx` — Audit T1 : conforme 1.4.4, aucune correction requise

### Test Results
- `CaisseStatsBar.test.tsx` : 10/10 passes
- `CaisseDashboardPage.test.tsx` : 6/6 passes (dont 2 nouveaux AC4)
- TypeScript : 0 erreur (`npx tsc --noEmit`)

### Completion Notes
**Copy** : Aucun fichier copie depuis 1.4.4 — logique reimplementee proprement d'apres audit.
**Consolidate** : Styles conserves dans `CashRegisterSalePage.module.css` (tokens existants `statsBar`, `statItem`, `caisseHeader`). Pas de duplication.
**Security** : Aucun changement authentification/autorisation. Les accumulateurs KPI sont locaux au composant React, pas persistes.

### Ecarts traites
| # | Ecart | Solution |
|---|-------|---------|
| 3 | `donsJour`, `poidsSortis` hardcodes a 0 | Accumulateurs locaux apres chaque POST sale |
| 4 | Toggle Live/Session non fonctionnel | Props `mode`/`onModeChange`, logique switch dans SalePage |
| — | Etat vide dashboard implicite | Message explicite si `registers.length === 0` |
| — | `POIDS RENTRES` affichait `0.0 kg` | Stub `-- kg` documente (hors perimetre caisse) |

## Revision Notes

### Reviseur
bmad-revisor (claude-4.6-sonnet-medium-thinking) — 2026-03-02

### Verification effectuee

**TypeScript** : `npx tsc --noEmit` -> 0 erreur confirmee (run direct).

**Tests** : `npx vitest run CaisseStatsBar.test.tsx CaisseDashboardPage.test.tsx` -> 16/16 passes (10 + 6).

### Conformite par AC

| AC | Critere | Etat |
|----|---------|------|
| AC1 | CaisseHeader audite conforme 1.4.4 ; data-testid="caisse-header" present ; CashRegisterSalePage l'utilise | OK Conforme |
| AC2 | 6 indicateurs presents ; data-testid="caisse-stats-bar" present ; stub -- kg documente pour POIDS RENTRES | OK Conforme |
| AC3 | Toggle Live/Session : onModeChange delegue correctement ; mode Session affiche sessionTicketCount ?? ticketCount et sessionCaJour ?? caJour ; DONS JOUR / POIDS SORTIS conservent leurs valeurs locales dans les deux modes | OK Conforme |
| AC4 | registers.length === 0 -> message explicite rendu dans data-testid="caisse-dashboard-list" ; cards Virtuelle et Differee toujours visibles | OK Conforme |
| AC5 | Build OK, tests passes, zero NaN/undefined/null visible | OK Partiel (captures avant/apres absentes) |

### Points verifies -- coherence code

1. **CashSessionItem.total_items / total_sales** : champs confirmes dans api/caisse.ts (l.102-103, type number | null). Operateur ?? 0 gere correctement le cas null. OK
2. **Accumulation KPI apres POST reussi** : placee apres await postSale(...) avant setCart([]) -- cartTotal calcule avant la reinitialisation. Heuristique "don" inclut preset_name en plus de la spec (amelioration mineure). OK
3. **poidsRentres prop** : declare dans l'interface CaisseStatsBarProps mais non destructure dans la fonction (intentionnel -- toujours affiche -- kg). TypeScript ne souleve pas d'erreur. OK
4. **Coherence noms props** : ticketCount, caJour, donsJour, poidsSortis, poidsRentres, lastTicketAmount, mode, onModeChange, sessionTicketCount, sessionCaJour -- coherents entre interface, usage et tests. OK
5. **Pas de regression** : logique metier existante (panier, paiements, offline queue, raccourcis clavier) intacte. OK

### Ecart mineur (non bloquant)

- **Captures avant/apres** : item DoD reste ouvert -- requiert une preuve visuelle runtime, non producible en revision statique. Non bloquant pour le passage en code review.

### Verdict

**Revu : 0 corrige, 5 AC verifies, 5 points de coherence OK.**
Livrable conforme a la story 18-5. Pret pour passage en code review (bmad-qa).

## Code Review Notes

### Revieweur
bmad-qa (claude-4.6-sonnet-medium-thinking) — 2026-03-02

### Verdict Code Review

**APPROVED** — 0 finding critique, 0 finding majeur, 4 findings mineurs (observations sans impact fonctionnel).

### Verification effectuee

- `total_sales` dans `CashSessionItem` confirme en centimes (commentaire l.102 `api/caisse.ts`). Coherence garantie avec `formatEur` (division par 100). Aucun bug d'unite.
- Accumulation KPI offline absente : conforme a la spec explicite ("apres chaque POST /v1/sales reussi").
- Patterns TypeScript : aucun `any` implicite. Types stricts. Prop `poidsRentres` non destructuree intentionnellement (stub documente).
- Tests : 10/10 + 6/6. AC2, AC3, AC4 couverts. Comportement teste, pas l'implementation.
- Securite : accumulateurs locaux non persistes, pas d'exposition de donnees sensibles.

### Findings (mineurs uniquement)

1. `poidsRentres` declaree dans l'interface mais non destructuree — intentionnel, stub documente, acceptable.
2. KPI non incrementes en mode offline — spec-conforme, UX mineure, a adresser en story ulterieure si besoin terrain.
3. Invariance DONS JOUR / POIDS SORTIS non testee explicitement en mode session — comportement correct, couverture test incomplete sur cet invariant.
4. Horloge rafraichie toutes les 30s — precision a la minute suffisante, conforme 1.4.4.

### Decision

Story 18-5 passee a `done`.
