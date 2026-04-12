# Paquet de preuve admin — surfaces caisse supervisees (Story 18.3) — NEEDS_HITL navigateur

Date : 2026-04-12  
Story : **18.3** (`18-3-stabiliser-la-preuve-de-parite-admin-pour-les-surfaces-caisse-supervisees`)  
Epic : **18** (rail **U**)

## Objet

Consigner le **repli NEEDS_HITL** lorsque la preuve **legacy 4445 vs Peintre 4444** sous **Chrome DevTools MCP** (`user-chrome-devtools`) **n’a pas été exécutée** dans le contexte DS (outil MCP indisponible pour le sous-agent Task). Les preuves **automatisées** et la **documentation** restent la base reviewable ; la matrice et `peintre-nano/docs/03-contrats-creos-et-donnees.md` pointent vers ce fichier au lieu de captures datées.

## Cause NEEDS_HITL

- **MCP `user-chrome-devtools`** : non invocable depuis l’agent DS (environnement sous-agent sans accès MCP navigateur).

## Checklist minimale — rejouer par un humain / orchestrateur parent

Compte : **admin** recette (cf. guide pilotage / historique matrice pilotes), **legacy** `http://localhost:4445`, **Peintre** `http://localhost:4444`.

1. **Hub `/admin`** (Peintre) : heading **Rapports admin et supervision caisse** ; widget hub `admin-reports-supervision-hub` ; cartes gap **K** visibles (pas de donnees inventees) ; liens secondaires vers routes manifestees (ex. session-manager).
2. **Hub → session-manager** : depuis le hub, lien **Sessions caisse (supervision)** → URL **`/admin/session-manager`** ; shell **17.3** ; texte de gap **K** explicite (`GET /v1/cash-sessions/`, `GET /v1/cash-sessions/stats/summary` absents du YAML canon) ; bloc export **B** exclu (`admin-session-manager-export-debt`).
3. **Retour** : clic entree nav **Administration** → **`/admin`** ; memes elements hub qu’à l’etape 1.
4. **Legacy** `http://localhost:4445/admin` puis **`/admin/session-manager`** : comparer libelles majeurs, ordre macro, absence de liste simulee cote Peintre (placeholder honnete).
5. **Detail session** (Peintre) : **`/admin/cash-sessions/{id}`** — widget `admin-cash-session-detail` ; verifier qu’aucune donnee ne pretend a des `operationId` absents du fichier **`contracts/openapi/recyclique-api.yaml`** (chargement via **`recyclique_cashSessions_getSessionDetail`** uniquement pour le detail session).

## Artefacts lies (preuve deja reviewable sans MCP)

- Tests : `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts` (`describe` **Story 18.3** — triple `page_key` hub + session-manager + `admin-cash-session-detail`, pas de nav `/admin/reports`), `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx` (test **Story 18.3** hub → lien **Sessions caisse** → gap **K** + `admin-session-manager-export-debt` → retour **Administration** ; parcours nav directe session-manager **18.2** ; URL profonde detail).
- Gouvernance OpenAPI existante : `peintre-nano/tests/contract/recyclique-openapi-governance.test.ts` (`recyclique_cashSessions_getSessionDetail`).
- Doc runtime : `peintre-nano/docs/03-contrats-creos-et-donnees.md` — **Story 18.3**.
- Matrice : `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` — lignes **`ui-admin-15-4-*`** mises a jour le **2026-04-12**.

## Dettes residuelles (nommees)

- **Donnees agregees hub / liste sessions** : **Epic 16** / rail **K** tant que les lectures ne sont pas dans l’OpenAPI canon — cf. **15.2** `2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md`.
- **Parite observable navigateur** : statut matrice **En cours** avec preuve MCP **a completer** quand l’instance MCP est disponible (captures archivees `YYYY-MM-DD_NN_…` selon regle matrice).
