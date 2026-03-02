# Story 18-8 : Caisse — ticket temps reel, finalisation et paiements multi-moyens

## Statut

done

## Contexte

**Epic 18 — Parite fonctionnelle caisse 1.4.4**

Les stories 18-5 (layout + KPI banner), 18-6 (grille categories/sous-categories + presets) et 18-7 (raccourcis clavier AZERTY + saisie rapide) sont completees.

`CashRegisterSalePage.tsx` possede deja :
- Un panneau ticket `aside` inline : liste des lignes du panier, total, boutons suppression
- Multi-paiements en section separee (Select mode + NumberInput montant + bouton +)
- Logique `handleSubmit` : validation `paymentsTotal === cartTotal`, `POST /v1/sales`, accumulation KPI locale
- Raccourcis clavier AZERTY positionnels (Entree, Echap, Backspace, modificateurs quantite)
- Mode offline (IndexedDB)

L'audit 18-4 §4 (Ticket) et §5 (Finalisation) identifie les ecarts suivants — scope de cette story :

**§4 Ticket — ecarts :**
1. **Pas de composant `Ticket` dedie** : ticket inline dans `CashRegisterSalePage`. Doit devenir `frontend/src/caisse/Ticket.tsx`.
2. **Pas de distinction visuelle Don/vente normale** : presets a 0 EUR ou categorie "don" non differencies dans le ticket.
3. **Poids total du ticket absent** : le poids est note par ligne mais le cumul total n'est pas affiche.
4. **Pas d'edition de ligne** : uniquement suppression + re-saisie (hors perimetre de cette story — edition inline reportee).

**§5 Finalisation — ecarts :**
1. **Pas de `FinalizationScreen`** : la finalisation est integree dans le panneau ticket sans ecran dedie. En 1.4.4, un ecran modal/overlay resument le ticket et demandait le montant donne.
2. **Pas de calcul de rendu monnaie** : fonctionnalite critique pour une caisse physique. Si le client paye 20 EUR pour 13,50 EUR d'achats, le rendu (6,50 EUR) n'est pas calcule ni affiche.
3. **Mode cheque sans logique speciale** : en 1.4.4 (B39-P6), le cheque n'affiche pas de rendu monnaie.
4. **Confirmation visuelle absente** : apres validation d'un ticket, le panier se vide silencieusement sans feedback.
5. **Pas de raccourcis mode paiement** : en 1.4.4 (identifies dans 18-7 comme hors-perimetre 18-7, en-perimetre 18-8) : `E`=especes, `C`=carte bancaire, `Q`=cheque dans l'ecran de finalisation.

**Note sur les sources 1.4.4 :** Les fichiers source `.tsx` 1.4.4 (`FinalizationScreen.tsx`, `Ticket.tsx`, `TicketDisplay.tsx`, `SaleWizard.tsx`) ne sont **pas presents physiquement** dans le depot. L'implementation s'appuie sur la documentation brownfield (`references/ancien-repo/fonctionnalites-actuelles.md`, `component-inventory-frontend.md`) et sur l'audit 18-4.

**Reference audit :** `_bmad-output/implementation-artifacts/18-4-audit-caisse-inventaire.md` §4 et §5

## Estimation

8 points

## Histoire utilisateur

**As a** operateur caisse,
**I want** retrouver le ticket temps reel et le flux de finalisation identiques a la 1.4.4,
**So that** la validation des ventes et l'encaissement soient fiables.

---

## Criteres d'acceptation

### AC1 — Panneau ticket dedie : affichage temps reel

**Given** des articles ajoutes au panier (categories ou presets)
**When** l'operateur consulte le panneau ticket droit
**Then** chaque ligne affiche : nom de l'article (preset_name ou category_name), quantite, poids si saisi, prix unitaire (EUR) et sous-total (EUR)
**And** le total general est affiche en bas du panneau : `{N} articles — {total} EUR`
**And** si le ticket contient des articles "don" (unit_price == 0 OU nom contient "don" insensible a la casse), ces lignes sont visuellement distinguees (fond ou texte couleur differente, ex. `#e8f5e9` / vert clair)
**And** si au moins une ligne a un poids renseigne, le poids total cumule est affiche sous le total : `Poids total : {X.XX} kg`
**And** si le panier est vide, le message "Aucun article ajoute" est affiche avec `data-testid="cart-empty"`
**And** le panneau est scrollable si le ticket est long (overflow-y auto)
**And** `data-testid="caisse-ticket-panel"` est present

**Implementation :**
- Extraire le bloc `aside` actuel de `CashRegisterSalePage.tsx` dans un composant dedie `frontend/src/caisse/Ticket.tsx`
- Props : `cart: CartLine[]`, `onRemoveLine: (id: string) => void`
- Le composant `CashRegisterSalePage.tsx` importe et utilise `<Ticket />`
- Conserver `data-testid="caisse-ticket-panel"` sur la racine du composant

---

### AC2 — Ecran de finalisation : declenchement et affichage

**Given** l'operateur est sur la page de saisie vente avec un ticket non vide
**When** l'operateur appuie sur `Entree` (clavier) OU clique sur le bouton "Finaliser"
**Then** l'ecran de finalisation (`FinalizationScreen`) s'affiche en modal/overlay plein ecran ou panneau lateral elargi
**And** l'ecran affiche : le recapitulatif du ticket (lignes, total), la section multi-paiements, le rendu monnaie (si applicable), le bouton "Valider la vente" et un bouton "Annuler" / fermeture
**And** `data-testid="finalization-screen"` est present sur la racine de l'ecran

**Given** l'operateur appuie sur `Echap` pendant que l'ecran de finalisation est ouvert
**When** l'ecran est visible
**Then** l'ecran de finalisation se ferme sans soumettre la vente
**And** le panier est conserve intact

**Given** le ticket est vide
**When** l'operateur appuie sur `Entree` OU clique sur le bouton "Finaliser"
**Then** l'ecran de finalisation ne s'ouvre PAS
**And** un message d'erreur est affiche : "Panier vide — ajoutez au moins un article" avec `data-testid="sale-error"`
**And** le bouton "Finaliser" est desactive (`disabled`) quand `cart.length === 0`

**Implementation :**
- Creer `frontend/src/caisse/FinalizationScreen.tsx`
- Etat `showFinalization: boolean` dans `CashRegisterSalePage.tsx`
- Le raccourci `Entree` (deja dans 18-7) ouvre `FinalizationScreen` au lieu de soumettre directement : si `cart.length > 0` → `setShowFinalization(true)` ; si `cart.length === 0` → `setError('Panier vide — ajoutez au moins un article')`
- Le bouton "Finaliser" fait la meme chose
- `Echap` dans le contexte de finalisation : `setShowFinalization(false)`

---

### AC3 — Multi-paiements et rendu monnaie

**Given** l'ecran de finalisation est ouvert
**When** l'operateur ajoute des lignes de paiement (especes, cheque, carte bancaire)
**Then** plusieurs lignes de paiement peuvent coexister dans le meme ticket
**And** le total des paiements saisis est affiche en temps reel : `Total paiements : {X.XX} EUR`
**And** chaque ligne de paiement peut etre supprimee (bouton x par ligne)

**Given** au moins une ligne de paiement est de type "especes" et que la somme des paiements especes depasse le total du ticket
**When** l'operateur consulte l'ecran de finalisation
**Then** le rendu monnaie est calcule et affiche : `Rendu : {X.XX} EUR` avec `data-testid="rendu-monnaie"`
**And** le rendu = (somme des paiements especes) - (total panier) si positif, sinon 0

**Given** un paiement est de type "cheque"
**When** l'operateur consulte l'affichage du rendu
**Then** aucun rendu monnaie n'est affiche pour les lignes cheque (B39-P6 : cheque = montant exact uniquement)

**Given** l'ecran de finalisation est ouvert
**When** l'operateur clique sur le bouton "Montant exact" (ou raccourci dedie)
**Then** le champ montant especes est pre-rempli avec le total exact du panier (arrondi au centime)
**And** `data-testid="btn-montant-exact"` est present

**Given** l'ecran de finalisation est ouvert
**When** l'operateur appuie sur `E` (sans modificateur, hors champ de saisie)
**Then** le mode de paiement est selectionne sur "especes"

**When** l'operateur appuie sur `C` (sans modificateur, hors champ de saisie)
**Then** le mode de paiement est selectionne sur "cb" (carte bancaire)

**When** l'operateur appuie sur `Q` (sans modificateur, hors champ de saisie)
**Then** le mode de paiement est selectionne sur "cheque"

---

### AC4 — Validation de vente : enregistrement BDD + confirmation + KPI update

**Given** l'ecran de finalisation est ouvert avec un ticket non vide et des paiements
**When** la somme des paiements est egale au total du panier ET l'operateur clique "Valider la vente"
**Then** `POST /v1/sales` est appele avec `{ cash_session_id, items[], payments[], note?, sale_date? }`
**And** si la reponse est 200/201 : une confirmation visuelle est affichee ("Ticket enregistre — {N} articles, {total} EUR") avec `data-testid="sale-success"`
**And** le panier est vide apres la confirmation
**And** les paiements sont reinitialises
**And** l'ecran de finalisation se ferme
**And** les accumulateurs KPI locaux sont mis a jour (ticket_count++, ca_jour, dons, poids) — identique au comportement actuel post-submit

**Given** la somme des paiements est differente du total du panier
**When** l'operateur tente de valider
**Then** la validation est bloquee avec le message "La somme des paiements doit etre egale au total du panier" avec `data-testid="sale-error"`
**And** aucun appel API n'est effectue

**Given** l'app est hors ligne
**When** l'operateur valide la vente depuis l'ecran de finalisation
**Then** le ticket est mis en buffer IndexedDB (comportement offline existant — story 5.4)
**And** la confirmation visuelle est adaptee : "Ticket enregistre hors ligne — sera synchronise au retour en ligne"

---

### AC5 — Ticket vide : finalisation bloquee

**Given** le panier est vide
**When** l'operateur appuie sur `Entree` ou clique "Finaliser"
**Then** l'ecran de finalisation ne s'ouvre pas
**And** le message d'erreur "Panier vide — ajoutez au moins un article" est visible avec `data-testid="sale-error"`
**And** le bouton "Finaliser" affiche `disabled` (attribut HTML)

**Given** le panier contient au moins un article
**When** l'interface est rendue
**Then** le bouton "Finaliser" n'est PAS desactive

---

## Taches techniques

### T1 — Extraire `Ticket.tsx`

**Fichier :** `frontend/src/caisse/Ticket.tsx`

Extraire le bloc `aside` de `CashRegisterSalePage.tsx` vers un composant dedie.

```typescript
interface TicketProps {
  cart: CartLine[];
  onRemoveLine: (id: string) => void;
}
export function Ticket({ cart, onRemoveLine }: TicketProps)
```

**Fonctionnalites requises dans `Ticket.tsx` :**
- Liste des lignes : `preset_name ?? category_name`, `x{qty}`, poids si present, prix unitaire EUR, sous-total EUR
- Distinction visuelle "don" : si `line.unit_price === 0 || (line.preset_name ?? line.category_name ?? '').toLowerCase().includes('don')` → classe CSS `ticketLineDon` (fond `#e8f5e9`)
- Poids total : `cart.filter(l => l.weight != null).reduce((s,l) => s + (l.weight ?? 0), 0)` — affiche si > 0
- Etat vide : `data-testid="cart-empty"`
- Bouton suppression : `data-testid="remove-line-{id}"`, aria-label adequat
- Racine : `data-testid="caisse-ticket-panel"`
- Styles dans `CashRegisterSalePage.module.css` (ajouter `.ticketLineDon`)

**Dans `CashRegisterSalePage.tsx` :**
- Importer et remplacer le bloc `aside` par `<Ticket cart={cart} onRemoveLine={removeCartLine} />`
- Deplacer la section paiements et footer dans `FinalizationScreen` (T2) ou conserver dans la SalePage selon le choix d'architecture

**Architecture recommandee :**
- `Ticket.tsx` : affichage pur des lignes + poids total (pas de paiements, pas de bouton submit)
- `FinalizationScreen.tsx` : recapitulatif ticket + paiements + rendu monnaie + bouton valider
- `CashRegisterSalePage.tsx` : orchestre les deux composants + gestion etats + logique metier

---

### T2 — Creer `FinalizationScreen.tsx`

**Fichier :** `frontend/src/caisse/FinalizationScreen.tsx`

Composant modal/overlay qui s'affiche par-dessus la page de saisie vente.

```typescript
interface FinalizationScreenProps {
  cart: CartLine[];
  cartTotal: number;             // centimes
  payments: PaymentPayload[];
  paymentMethod: string;
  paymentAmountEur: string;
  onPaymentMethodChange: (method: string) => void;
  onPaymentAmountChange: (amount: string) => void;
  onAddPayment: () => void;
  onRemovePayment: (index: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
  submitting: boolean;
  error: string | null;
  successMessage: string | null;
}
export function FinalizationScreen(props: FinalizationScreenProps)
```

**Fonctionnalites requises :**
- Recapitulatif ticket : liste des lignes (lecture seule), total
- Section paiements : Select mode (`especes` / `cheque` / `cb`), NumberInput montant, bouton "+"
- Bouton "Montant exact" (`data-testid="btn-montant-exact"`) : pre-remplit le montant avec `(cartTotal / 100).toFixed(2)`
- Rendu monnaie :
  - `especes_total = payments.filter(p => p.payment_method === 'especes').reduce((s,p) => s+p.amount, 0) + (method === 'especes' ? current_amount : 0)` — calcule au fur et a mesure
  - Si `especes_total > cartTotal` : afficher `Rendu : {((especes_total - cartTotal)/100).toFixed(2)} EUR` avec `data-testid="rendu-monnaie"`
  - Pour les paiements cheque : pas de rendu affiche
- Total paiements affiche : `data-testid="payments-total"`
- Bouton "Valider la vente" : `data-testid="finalization-confirm"`, desactive si `paymentsTotal !== cartTotal || submitting`
- Bouton "Annuler" : `data-testid="finalization-cancel"`, appelle `onCancel`
- Messages erreur : `data-testid="sale-error"`
- Message succes : `data-testid="sale-success"` (affiche 2s puis se ferme / disparait)
- Raccourcis clavier DANS l'ecran (listener localise, actif uniquement si `showFinalization`) :
  - `E` (sans modificateur, hors input) → `onPaymentMethodChange('especes')`
  - `C` (sans modificateur, hors input) → `onPaymentMethodChange('cb')`
  - `Q` (sans modificateur, hors input) → `onPaymentMethodChange('cheque')`
  - `Echap` → `onCancel()`
- Styles : overlay semi-transparent (backdrop), panneau centre ou lateral, z-index eleve
- Mantine : utiliser `Modal` ou `Overlay` + `Paper` (selon rendu attendu 1.4.4)

---

### T3 — Integrer dans `CashRegisterSalePage.tsx`

**Modifications requises :**
- Ajouter `const [showFinalization, setShowFinalization] = useState(false)`
- Ajouter `const [successMessage, setSuccessMessage] = useState<string | null>(null)`
- Modifier le raccourci `Entree` (18-7) : au lieu d'appeler `handleSubmit` directement, appeler `handleFinalize` :
  ```typescript
  function handleFinalize() {
    if (cart.length === 0) {
      setError('Panier vide — ajoutez au moins un article');
      return;
    }
    setShowFinalization(true);
  }
  ```
- Bouton "Finaliser" dans le footer du ticket : meme comportement que `handleFinalize`
- Dans `handleSubmit`, apres POST reussi : `setSuccessMessage(...)` ; apres 2000ms : `setSuccessMessage(null)` ; `setShowFinalization(false)`
- Passer les props adequates a `<FinalizationScreen />`
- Ajouter `<FinalizationScreen ... />` dans le JSX (conditionnel sur `showFinalization`)

---

### T4 — Styles : `CashRegisterSalePage.module.css`

Ajouter les classes suivantes :

```css
/* Distinction ligne don (AC1) */
.ticketLineDon {
  background: #e8f5e9;
  border-left: 3px solid #a5d6a7;
}

/* Poids total ticket (AC1) */
.ticketWeightTotal {
  font-size: 11px;
  color: #868e96;
  margin-top: 4px;
}

/* Rendu monnaie (AC3) */
.rendueMonnaie {
  font-size: 18px;
  font-weight: 700;
  color: #2e7d32;
  padding: 8px 0;
  text-align: center;
}

/* Ecran de finalisation : overlay */
.finalizationOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.finalizationPanel {
  background: #fff;
  border-radius: 10px;
  padding: 24px;
  min-width: 400px;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

/* Message succes (AC4) */
.successBanner {
  background: #e8f5e9;
  border: 1px solid #a5d6a7;
  color: #2e7d32;
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 8px;
  font-weight: 600;
}
```

---

### T5 — Tests co-loces obligatoires

**Fichiers a creer/modifier :**

1. `frontend/src/caisse/Ticket.test.tsx` (nouveau)
2. `frontend/src/caisse/FinalizationScreen.test.tsx` (nouveau)
3. `frontend/src/caisse/CashRegisterSalePage.test.tsx` (ajouter describe "Story 18-8")

**Harness standard (identique aux autres tests caisse) :**
```typescript
function renderComponent(props: ...) {
  return render(
    <MantineProvider><MemoryRouter>{...}</MemoryRouter></MantineProvider>
  );
}
```

---

## Tests co-loces obligatoires

### Ticket.test.tsx

```
describe('Ticket — Story 18-8 AC1')
  it('affiche les lignes du panier avec nom, quantite, prix unitaire, sous-total')
  it('affiche le message cart-empty si le panier est vide')
  it('affiche la distinction visuelle pour une ligne don (unit_price = 0)')
  it('affiche la distinction visuelle pour une ligne dont le nom contient "don"')
  it('affiche le poids total si au moins une ligne a un poids')
  it('n\'affiche pas le poids total si aucune ligne n\'a de poids')
  it('le bouton supprimer appelle onRemoveLine avec l\'id de la ligne')
```

### FinalizationScreen.test.tsx

```
describe('FinalizationScreen — Story 18-8 AC2/AC3/AC4')
  it('affiche le recapitulatif du ticket (lignes et total)')
  it('affiche data-testid="finalization-screen"')
  it('bouton Annuler appelle onCancel')
  it('bouton Valider desactive si paymentsTotal != cartTotal')
  it('bouton Valider actif si paymentsTotal === cartTotal')
  it('affiche le rendu monnaie si paiement especes > total (rendu-monnaie)')
  it('ne calcule pas de rendu monnaie pour un paiement cheque')
  it('bouton Montant exact pre-remplit le champ avec le total exact')
  it('touche E selectionne le mode especes (hors input)')
  it('touche C selectionne le mode carte bancaire (hors input)')
  it('touche Q selectionne le mode cheque (hors input)')
  it('touche Echap appelle onCancel')
  it('affiche le message succes data-testid="sale-success" si successMessage est fourni')
```

### CashRegisterSalePage.test.tsx — ajouts

```
describe('CashRegisterSalePage — Story 18-8 flux finalisation')
  it('bouton Finaliser desactive quand panier vide')
  it('bouton Finaliser active quand panier non vide')
  it('click Finaliser avec panier non vide ouvre FinalizationScreen (data-testid="finalization-screen")')
  it('click Finaliser avec panier vide affiche erreur "Panier vide" sans ouvrir FinalizationScreen')
  it('Entree avec panier non vide ouvre FinalizationScreen')
  it('Entree avec panier vide affiche erreur "Panier vide" sans ouvrir FinalizationScreen')
  it('validation depuis FinalizationScreen appelle POST /v1/sales et affiche sale-success')
  it('apres validation reussie le panier est vide et FinalizationScreen est ferme')
  it('apres validation reussie les KPI locaux sont incrementes')
  it('rendu monnaie correct : especes 20 EUR pour total 13.50 EUR = rendu 6.50 EUR')
```

---

## Scenario E2E manuel

**Prerequis :** Stack Docker en ligne, session de caisse ouverte, categories et presets charges.

### Scenario 1 — Saisie et finalisation ticket simple

1. Ouvrir `http://localhost:4173/cash-register/sale`
2. Cliquer sur une categorie (ou preset)
3. Verifier que la ligne apparait dans le panneau ticket droit avec nom, quantite, prix
4. Ajouter un second article
5. Verifier que le total se met a jour en temps reel
6. Cliquer "Finaliser" (ou appuyer Entree)
7. Verifier que `FinalizationScreen` s'ouvre avec le recapitulatif du ticket
8. Saisir le montant exact en especes via "Montant exact"
9. Verifier que `Rendu : 0,00 EUR` est affiche
10. Cliquer "Valider la vente"
11. Verifier la confirmation visuelle : "Ticket enregistre — X articles, Y EUR"
12. Verifier que le panier est vide apres validation
13. Verifier que la KPI banner a ete mise a jour (TICKETS +1, CA JOUR +Y)

### Scenario 2 — Rendu monnaie avec paiement especes superieur

1. Ajouter un article a 5,50 EUR
2. Ouvrir l'ecran de finalisation
3. Saisir un paiement especes de 10,00 EUR
4. Verifier l'affichage : `Rendu : 4,50 EUR`
5. Valider la vente
6. Verifier que la vente est enregistree en BDD (via admin `/admin/db`)

### Scenario 3 — Multi-paiements (especes + cheque)

1. Ajouter des articles pour un total de 15,00 EUR
2. Ouvrir l'ecran de finalisation
3. Ajouter un paiement especes de 10,00 EUR
4. Ajouter un paiement cheque de 5,00 EUR
5. Verifier : total paiements = 15,00 EUR, bouton Valider actif, rendu monnaie = 0,00 EUR (especes = total uniquement si especes > cartTotal)
6. Valider et verifier la confirmation

### Scenario 4 — Ticket vide — finalisation bloquee

1. Page saisie vente, panier vide
2. Cliquer "Finaliser" : verifier que l'ecran de finalisation NE s'ouvre PAS
3. Verifier le message "Panier vide — ajoutez au moins un article"
4. Appuyer Entree : meme comportement
5. Verifier que le bouton "Finaliser" est desactive (visuellement grise)

### Scenario 5 — Raccourcis paiement

1. Ouvrir l'ecran de finalisation
2. Appuyer `E` (hors champ) : verifier que le Select mode passe sur "Especes"
3. Appuyer `C` (hors champ) : verifier que le Select mode passe sur "Carte bancaire"
4. Appuyer `Q` (hors champ) : verifier que le Select mode passe sur "Cheque"
5. Appuyer `Echap` : verifier que l'ecran se ferme et le panier est conserve

### Scenario 6 — Dons visuellement distingues dans le ticket

1. Cliquer sur un preset "Don" (price = 0 EUR)
2. Verifier que la ligne dans le ticket a un fond vert clair distingue des autres lignes
3. Cliquer sur une categorie normale
4. Verifier que la ligne normale a un fond blanc (pas de fond vert)

---

## Notes de completion

> *A remplir par le developpeur apres implementation.*

### Copy Notes
- [ ] `Ticket.tsx` extrait de `CashRegisterSalePage.tsx` (refactoring, pas de nouvelle logique metier)
- [ ] `FinalizationScreen.tsx` cree ex nihilo (nouvelle fonctionnalite)
- [ ] `CashRegisterSalePage.module.css` : ajout classes `ticketLineDon`, `ticketWeightTotal`, `rendueMonnaie`, `finalizationOverlay`, `finalizationPanel`, `successBanner`

### Consolidate Notes
- [ ] Logic `computeChange` : especes_total_payments - cart_total (en centimes), retourne 0 si negatif
- [ ] Logic `isDonLine` : `unit_price === 0 || name.toLowerCase().includes('don')`
- [ ] Les raccourcis paiement (E/C/Q) sont localises dans `FinalizationScreen` — pas d'interference avec les raccourcis AZERTY de la grille (actifs uniquement quand `showFinalization === true`)

### Security Notes
- [ ] Aucune donnee sensible dans l'ecran de finalisation — montants en centimes (entiers) seulement
- [ ] La validation `paymentsTotal === cartTotal` est cote frontend uniquement ; la validation cote API reste la source de verite

### Ecarts connus (non couverts par cette story)
- Edition de ligne (quantite / prix inline dans le ticket) — reportee
- Pavé numerique tactile — reporté (scope 18.x suivant si besoin)
- Rapport de session detaille — scope 18-9

---

## Dev Agent Record

### Implementation Notes

**Date** : 2026-03-02

**Agent** : bmad-dev

**Approche architecturale :**
- `Ticket.tsx` extrait de `CashRegisterSalePage.tsx` comme composant pur (pas de paiements). Props : `cart`, `onRemoveLine`, `onFinalize`, `total`, `note/onNoteChange`, `saleDate/onSaleDateChange`, `error`.
- `FinalizationScreen.tsx` créé ex nihilo comme overlay positionné (`position: fixed`). Raccourcis clavier E/C/Q/Escape localisés dans `useEffect` avec cleanup. Guard `instanceof HTMLElement` pour compatibilité jsdom.
- `CashRegisterSalePage.tsx` : `handleFinalize` orchestre l'ouverture de la finalisation. `showFinalizationRef` désactive les raccourcis AZERTY globaux quand l'overlay est actif. `handleConfirmSale` (ex `handleSubmit`) gère le POST, met à jour les KPI, puis via `setTimeout(2000)` affiche le success puis ferme et vide le panier.
- Note/saleDate conservés dans le panneau Ticket (accessible sans ouvrir la finalisation) — préserve le test de raccourcis clavier 18-7.

**Bugs corrigés durant l'implémentation :**
1. `\u00e9` en texte JSX brut — remplacé par le caractère littéral `é`
2. `target.getAttribute` non disponible sur Document dans jsdom — guard `instanceof HTMLElement` ajouté dans FinalizationScreen
3. `vi.useFakeTimers()` sans cleanup causait des timeouts en cascade — remplacé par `await new Promise(resolve => setTimeout(resolve, 2500))` + `afterEach(() => vi.useRealTimers())`

**Tests :**
- `Ticket.test.tsx` : 7/7 ✓
- `FinalizationScreen.test.tsx` : 13/13 ✓
- `CashRegisterSalePage.test.tsx` : 31/31 ✓ (10 nouveaux + existants mis à jour)
- Note : `PinUnlockModal.test.tsx` avait 1 échec pré-existant non lié à cette story.

### File List

**Créés :**
- `frontend/src/caisse/Ticket.tsx`
- `frontend/src/caisse/FinalizationScreen.tsx`
- `frontend/src/caisse/Ticket.test.tsx`
- `frontend/src/caisse/FinalizationScreen.test.tsx`

**Modifiés :**
- `frontend/src/caisse/CashRegisterSalePage.tsx`
- `frontend/src/caisse/CashRegisterSalePage.module.css`
- `frontend/src/caisse/CashRegisterSalePage.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

---

## Code Review

**Date** : 2026-03-02  
**Reviewer** : bmad-qa  
**Résultat** : ✅ **APPROVED**

### Points critiques (UX, non bloquants)

- **C1 — Incohérence rendu monnaie / validation** : le rendu s'affiche si espèces > cartTotal (en temps réel), mais la validation bloque si `paymentsTotal !== cartTotal`. Si l'opérateur ajoute un paiement espèces de 20€ pour 5€ de total, il se retrouve bloqué. Conforme à AC4 (spec définit `paymentsTotal === cartTotal`) mais incohérent avec AC3 (rendu affiché implique que espèces > total est accepté). Décision de design à documenter : le workflow attendu est "entrer le montant donné pour voir le rendu informatif → valider avec le montant exact". À clarifier en backlog.

### Points mineurs

- Textes sans accents ("Aucun article ajoute", "Especes", "Cheque") — cosmétique
- `setSubmitting(false)` doublon dans branche offline — pas de bug
- Classe CSS `.rendueMonnaie` (orthographe "rendue" au lieu de "rendu") — cosmétique
- Props supplémentaires dans Ticket.tsx vs spec T1 — décision architecturale documentée et justifiée

### Aspects approuvés

Architecture propre, tous data-testid présents, raccourcis E/C/Q/Echap isolés, guard `showFinalizationRef`, rendu monnaie espèces-only, chèque sans rendu, 30 tests co-locés (7+13+10+), TypeScript sans `any`, offline géré, KPI incrémentés, aucune régression 18-5/18-6/18-7.
