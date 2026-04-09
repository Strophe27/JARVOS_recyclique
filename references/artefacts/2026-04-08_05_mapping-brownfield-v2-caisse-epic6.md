# Mapping brownfield -> v2 caisse (Epic 6)

**Date :** 2026-04-08  
**Contexte :** correct course BMAD Epic 6, brownfield-first.  
**But :** expliciter l'ecart entre le workflow caisse legacy operatoire et la composition v2 actuelle afin de rebaseliner les stories `6.1` a `6.10` sans rouvrir les Epics `8` et `9`.

**Reference legacy :** dans ce document, les chemins `recyclique-1.4.4/...` designent le frontend brownfield fige dans le depot courant. Ils servent de preuve de fonctionnement legacy, au meme titre que le corpus de captures `11-0__caisse-*`.

---

## Conclusion courte

Le brownfield legacy organise la caisse comme un **parcours continu** :

1. **selection du poste de caisse** ;
2. **ouverture de session** ;
3. **vente kiosque continue** (header session, KPIs, wizard, ticket courant, finalisation) ;
4. **cloture locale** ;
5. **supervision admin** via gestionnaire puis detail session.

La v2 actuelle a surtout reconstruit des **slices techniques utiles** autour de `FlowRenderer`, de manifests CREOS et de **pages separees par type d'action** (`/caisse`, `/caisse/remboursement`, `/caisse/don`, `/caisse/cloture`, etc.).  
L'ecart principal n'est donc pas l'absence de briques, mais une **mauvaise baseline produit** : la v2 ne restitue pas encore le **workflow brownfield operatoire** comme structure dominante.

## Resume executif

- Le probleme principal n'est pas le backend ni les contrats : c'est la **composition produit** de la caisse v2.
- Le brownfield attend un **grand parcours caisse** ; la v2 actuelle expose surtout une **collection de pages/slices**.
- Les variantes **reelle / virtuelle / differee** restent **dans le scope Epic 6** et doivent redevenir visibles a l'entree.
- Les stories `6.2`, `6.3`, `6.4`, `6.9` gardent leur valeur metier ; plusieurs autres stories doivent etre **reecrites** autour de la baseline brownfield.
- **Aucune** story n'est classee `superseded` a ce stade : on conserve les briques et on corrige la baseline.

---

## Tableau de mapping

| etape_brownfield | route_ecran_legacy | permission | preuve_code_capture | equivalent_v2_actuel | ecart | story_cible |
|---|---|---|---|---|---|---|
| Dashboard caisse reelle / virtuelle / differee | `/caisse`, `/cash-register/virtual`, `/cash-register/deferred` | au moins une de : `caisse.access`, `caisse.virtual.access`, `caisse.deferred.access` | `recyclique-1.4.4/frontend/src/App.jsx` ; `_bmad-output/implementation-artifacts/screenshots/caisse/11-0__caisse-01-dashboard.png` | `contracts/creos/manifests/navigation-transverse-served.json` ne sert que `/caisse` -> `cashflow-nominal` ; pas de dashboard servi equivalent pour reel / virtuel / differe | la v2 saute la selection brownfield du poste et perd l'entree operatoire reel / virtuel / differe comme premiere etape visible | `6.1` rewrite |
| Ouverture explicite de session | `/cash-register/session/open`, `/cash-register/virtual/session/open`, `/cash-register/deferred/session/open` | meme permission que le mode de caisse actif | `recyclique-1.4.4/frontend/src/App.jsx` ; `references/ancien-repo/fonctionnalites-actuelles.md` ; `_bmad-output/implementation-artifacts/screenshots/caisse/11-0__caisse-02-ouverture-session.png` | pas d'entree servie equivalente dans `navigation-transverse-served.json` ; la v2 part du nominal et bloque ensuite selon le contexte | l'ouverture n'est plus un ecran brownfield de premier rang relie au dashboard caisse ; elle devient implicite ou subordonnee au slice nominal | `6.1` rewrite, `6.2` keep |
| Vente kiosque continue | `/cash-register/sale` (et variantes virtuel / differe) | `caisse.access` ou variante de mode | `recyclique-1.4.4/frontend/src/pages/CashRegister/Sale.tsx` ; `recyclique-1.4.4/frontend/src/components/business/SaleWizard.tsx` ; `_bmad-output/implementation-artifacts/screenshots/caisse/11-0__caisse-04-saisie-vente.png` | `contracts/creos/manifests/page-cashflow-nominal.json` + `widgets-catalog-cashflow-nominal.json` + `peintre-nano/src/flows/FlowRenderer.tsx` | la v2 reconstruit un wizard et un ticket courant, mais pas encore la lecture brownfield complete d'un ecran caisse continu centre sur session / KPIs / saisie / ticket / finalisation | `6.1` rewrite |
| Finalisation / paiement dans le meme workspace | integre a `/cash-register/sale` | `caisse.access` | `recyclique-1.4.4/frontend/src/pages/CashRegister/Sale.tsx` (presence `FinalizationScreen`) ; `_bmad-output/implementation-artifacts/screenshots/caisse/11-0__caisse-04-saisie-vente.png` | finalisation pilotee par le wizard nominal et les clients `sales-client.ts` ; garde stale / erreurs transverses en 6.1 et 6.9 | la brique existe, mais elle reste pensee comme une etape interne d'un slice declaratif, pas comme la queue naturelle du grand ecran brownfield | `6.1` rewrite, `6.9` keep |
| Ticket en attente / reprise | variante du meme poste de vente | `caisse.access` | `_bmad-output/implementation-artifacts/screenshots/caisse/11-0__caisse-04-saisie-vente.png` ; `_bmad-output/implementation-artifacts/6-3-ajouter-le-parcours-ticket-en-attente.md` ; note : le corpus charge ne fournit pas ici de preuve brownfield plus directe que le poste de vente continu et le besoin terrain formalise | capacite tenue par les endpoints `held` et le nominal wizard | la capacite est reutilisable, mais doit vivre dans le **poste caisse unique** et non comme extension pensee depuis un flow abstrait | `6.3` keep |
| Encaissements specifiques et sociaux dans le meme univers caisse | variantes de la vente / presets sur le poste caisse | `caisse.access` + droit metier dedie | `references/ancien-repo/fonctionnalites-actuelles.md` (presets) ; `_bmad-output/implementation-artifacts/screenshots/caisse/11-0__caisse-04-saisie-vente.png` ; stories `6.5` et `6.6` | pages dediees `/caisse/don-sans-article`, `/caisse/adhesion-cotisation`, `/caisse/don` avec manifests separes | la v2 fragmente des variantes brownfield du poste caisse en mini-parcours separes, ce qui casse la lisibilite operatoire du poste unique | `6.5` rewrite, `6.6` rewrite |
| Remboursement sous controle | cas sensible rattache au flux caisse et a son historique | `caisse.refund` + contexte valide | `references/ancien-repo/fonctionnalites-actuelles.md` ; `_bmad-output/implementation-artifacts/6-4-ajouter-le-parcours-remboursement-sous-controle.md` ; `_bmad-output/implementation-artifacts/screenshots/caisse/11-0__caisse-06-detail-session-admin.png` | page dediee `/caisse/remboursement` | la capacite est valide comme besoin, mais doit etre reconnectee au parcours brownfield (vente / historique / detail session) plutot que rester une page slice autonome | `6.4` keep |
| Cloture locale exploitable | `/cash-register/session/close` | `caisse.access` | `recyclique-1.4.4/frontend/src/App.jsx` ; `references/ancien-repo/fonctionnalites-actuelles.md` ; `_bmad-output/implementation-artifacts/screenshots/caisse/11-0__caisse-05-fermeture-session-sans-transaction.png` | page dediee `/caisse/cloture` via `page-cashflow-close.json` | la brique existe, mais elle n'est pas encore replacee dans le continuum brownfield dashboard -> ouverture -> vente -> cloture -> detail session admin | `6.7` rewrite |
| Gestionnaire admin des sessions | `/admin/session-manager` | admin / super-admin | `recyclique-1.4.4/frontend/src/App.jsx` ; `references/ancien-repo/fonctionnalites-actuelles.md` ; `_bmad-output/implementation-artifacts/screenshots/admin/governance/11-0__admin1-08-session-manager.png` | la navigation v2 servie ne propose aujourd'hui que des placeholders admin transverses (`transverse-admin*`) | le point de supervision brownfield des sessions de caisse n'est pas encore servi dans la v2 comme prolongement exploitable de la caisse | `6.7` rewrite, `6.10` rewrite |
| Detail session admin + journal des ventes | `/admin/cash-sessions/:id` | admin / super-admin | `recyclique-1.4.4/frontend/src/App.jsx` ; `references/ancien-repo/fonctionnalites-actuelles.md` ; `_bmad-output/implementation-artifacts/screenshots/caisse/11-0__caisse-06-detail-session-admin.png` | pas d'ecran servi equivalent dans la navigation v2 ; la correction 6.8 part aujourd'hui de `/caisse/correction-ticket` | le brownfield place le journal et les corrections au voisinage du detail session admin ; la v2 les a decouples du locus operatoire reel | `6.8` rewrite, `6.10` rewrite |

---

## Implications de rebaseline

### Ce qui est reutilisable sans debat

- Les acquis **backend / OpenAPI / permissions / step-up / held / refund / special encaissement / cloture locale / audit / defensive states** restent valides comme briques.
- Les manifests, clients API, widgets et tests servent de **matiere technique** a reintegrer, pas de baseline UX a conserver telle quelle.

### Ce qui doit changer explicitement

- `FlowRenderer` doit repasser au rang de **mecanisme d'implementation**, pas de **forme produit cible**.
- La route `/caisse` doit redevenir un **point d'entree brownfield operatoire**, pas un alias direct vers le wizard nominal.
- Les variantes reel / virtuel / differe restent **dans le scope Epic 6** et doivent redevenir visibles a l'entree.
- Les encaissements speciaux / sociaux et les tickets en attente doivent etre rebranches comme **variantes du poste de vente**, pas comme collection de pages autonomes.
- Le couple **gestionnaire admin -> detail session** doit revenir dans le radar Epic 6 comme preuve d'exploitabilite locale, au minimum au titre de la validation 6.10 et du lien avec 6.7 / 6.8.

### Classification stories 6.1 -> 6.10

| Story | Classement | Motif court |
|---|---|---|
| `6.1` | `rewrite` | la baseline doit devenir brownfield-first : dashboard + ouverture + vente continue |
| `6.2` | `keep` | garde-fous contexte / permissions toujours valides et reutilisables ; AC a etendre au dashboard et a l'ouverture |
| `6.3` | `keep` | besoin terrain conserve ; a reintegrer dans le workspace brownfield |
| `6.4` | `keep` | besoin metier conserve ; AC a reajuster pour le reconnecter au parcours caisse reel |
| `6.5` | `rewrite` | les cas speciaux doivent etre pensés comme variantes du poste caisse, pas comme pages separees |
| `6.6` | `rewrite` | meme sujet : reintegration dans le poste caisse brownfield |
| `6.7` | `rewrite` | cloture a repositionner dans le continuum brownfield + lien session admin |
| `6.8` | `rewrite` | la correction doit partir du detail session / journal, pas d'une page caisse isolee |
| `6.9` | `keep` | couche defensive transverse toujours valable |
| `6.10` | `rewrite` | la validation doit viser la parite brownfield, pas la coherence de la baseline actuelle |

**Note de taxonomie :** aucune story n'est classee `superseded` dans cette proposition. Le correct course preserve les briques et rebat la baseline.

---

## Decision de cadrage

**Epic 6 n'est pas fermee.**  
**La caisse livree n'est pas validee terrain.**  
**`6.10` ne doit pas etre consideree close / done tant que ce correct course n'est pas approuve puis reapplique.**
