# Certification caisse — equivalence utilisateur legacy vs Peintre (Story **13.6**)

Date : **2026-04-12**  
Epic **13** — ombrelle certification (`sprint-change-proposal-2026-04-12-parite-caisse-legacy-stricte.md`).  
Matrice : `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` (lignes **`ui-pilote-03*`**).

## Resume executif

| Zone | Statut run |
|------|------------|
| MCP **`user-chrome-devtools`** | **Disponible** — sequences `list_pages` → `navigate_page` → `take_snapshot` (descripteurs lus sous `mcps/user-chrome-devtools/tools/`). |
| Preuves fichiers (snapshots a11y) | Dossier `references/artefacts/2026-04-12_04_certification-13-6-preuves/` : hub **4445** / **4444** ; **session open** apparié (`legacy-4445-session-open.txt` / `peintre-4444-session-open.txt`) ; kiosque **4444** `peintre-4444-cash-register-sale.txt`. **Ajout DS 2026-04-12 (tronçon fond → vente + reload)** : `mcp-2026-04-12-legacy-4445-hub-reprendre-sale.txt` (legacy **`/cash-register/sale`** après **Reprendre** depuis hub — session déjà ouverte sur l’instance recette) ; `mcp-2026-04-12-peintre-4444-sale-post-fix-reload.txt` (Peintre **`/cash-register/sale`** après reload — sans titre hub « Sélection du Poste »). |
| Code — bruit technique demo | **Livre** : `RuntimeDemoApp` masque bac a sable, bandeau manifests et toolbar prefs sur **tout** chemin `cashflow-nominal` demo ; `RootShell` `minimalChrome` ; widget sans mention « contrat / serveur » (`CaisseBrownfieldDashboardWidget`). **Correctif hybride kiosque** : `withCashflowNominalKioskSaleDashboard` + `sale_kiosk_minimal_dashboard` (doc **03** § RCN-02). |
| Matrice col. **Equiv.** | **Mise a jour** pour **03** a **03f** (refs explicites **Derogation PO** ou **OK**). |
| Parite exhaustive « toutes intentions » | **Non** — premier slice credibles + suite decoupee (fin de section). |

## Sequences MCP (preuve comparative)

**Secrets** : compte recette **non** reproduit dans ce depot ; saisie **uniquement en session** navigateur MCP.

1. **`list_pages`** — page selectionnee : `http://localhost:4444/cash-register/sale` puis navigations suivantes.
2. **Legacy `http://localhost:4445/login`** : `navigate_page` → `take_snapshot` → `fill_form` (identifiants session) → `click` « Se connecter » → attente texte `Tableau de bord` / `Caisse`.
3. **Legacy hub** : `click` lien **Caisse** → attente « Sélection du Poste de Caisse » → `take_snapshot` → fichier `legacy-4445-caisse-hub.txt`.
4. **Peintre hub** : `navigate_page` `http://localhost:4444/caisse` (session deja presente cote navigateur de test) → `take_snapshot` → `peintre-4444-caisse-hub-post-13-6.txt`.
5. **Peintre kiosque** (session anterieure) : snapshot `peintre-4444-cash-register-sale.txt`.

## Etat ligne par ligne — perimetre matrice Story **13.6**

| Cle matrice | Statut (matrice) | Equiv. (apres run) | Commentaire synthese |
|-------------|------------------|--------------------|------------------------|
| `ui-pilote-03-caisse-vente-kiosk` | `Ecart accepte` | **Derogation PO** (ref. artefact + stories **11.3**–**13.6**) | Alias runtime `/cash-register/sale` ; preuve kiosque **4444** ; gap **POST /v1/sales/** HITL. |
| `ui-pilote-03a-caisse-adjacents-kiosque` | `Ecart accepte` | **Derogation PO** | Parite titres / CTA ; gap libelle poste si OpenAPI. |
| `ui-pilote-03b-caisse-virtuelle-legacy-urls` | `Ecart accepte` | **Derogation PO** | Hub virtuel vs composition `/caisse` documentee. |
| `ui-pilote-03c-caisse-saisie-differee-legacy-urls` | `Ecart accepte` | **Derogation PO** | Widget date cahier vs legacy borne. |
| `ui-pilote-03d-caisse-session-close-legacy-urls` | `Ecart accepte` | **Derogation PO** | PIN step-up vs legacy. |
| `ui-pilote-03e-rcn-01-hub-caisse` | `Ecart accepte` | **Derogation PO** | Snapshots hub **4445** / **4444** ; intro CREOS vs legacy. |
| `ui-pilote-03f-rcn-02-hub-vers-vente-kiosk` | `Ecart accepte` | **OK** (certification **13.6** ; preuves dossier) | RCN-02 deja valide stories **13.5** + tests ; extension chrome demo **13.6**. |

## Suite decoupee (hors fausse completude)

1. Rejouer MCP sur **chaque** URL restante (virtuel, differe, close avec session ouverte, transition RCN-02) avec snapshots **apparies** 4445 / 4444 apres **build** local consomme par Chrome (**session open** : deja apparie ce run).
2. Extraire `list_network_requests` + `get_network_request` pour correlats OpenAPI (selon story / guide).
3. Alignements PO restants : badge **SIMULATION** casse / libelles 100 % legacy si exiges.
4. Gate **POST vente** authentifiee : HITL ou automation dediee hors ce run.

## References code / doc

- `peintre-nano/src/app/demo/RuntimeDemoApp.tsx` — `isCashflowNominalCertificationPathRoute`, `minimalAppChrome`, `showSandboxBanner`, `withCashflowNominalKioskSaleDashboard` (Story **13.6**).
- `peintre-nano/src/domains/cashflow/CaisseBrownfieldDashboardWidget.tsx` — libelles cartes.
- `peintre-nano/docs/03-contrats-creos-et-donnees.md` — § extension **11.3** + § **Certification 13.6**.
- Tests : `peintre-nano/tests/unit/runtime-demo-cashflow-certification-chrome-13-6.test.tsx`.
