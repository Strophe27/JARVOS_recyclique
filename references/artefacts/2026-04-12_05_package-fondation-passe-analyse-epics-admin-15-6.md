# Package de fondation — passe d'analyse approfondie et futurs epics admin (Story 15.6)

**Date :** 2026-04-12  
**Story :** `15-6-preparer-la-passe-danalyse-approfondie-et-le-decoupage-des-futurs-epics-de-portage-admin`  
**Epic :** 15  
**Base normative :** recommandation **15.5** (`2026-04-12_03_recommandation-architecture-admin-peintre-nano-15-5.md`), classification **A / B / C** (15.5 §7), chaine cible **OpenAPI → ContextEnvelope → manifests CREOS → runtime → UserRuntimePrefs**.

**Regle de decoupage (ferme) :** aucun futur epic ne doit combiner dans une meme livraison planifiee : (1) **portage UI** Peintre_nano, (2) **remediation** backend / OpenAPI / ContextEnvelope / securite, (3) **arbitrages produit** ou sorties de scope. Les dependances se resolvent par **ordonnancement** et epics separes, pas par melange de backlog.

---

## 1. Brief pour une passe « modele fort »

### 1.1 Objectif de l'analyse

A partir du **corpus consolide** (liste §2), produire une **taxonomie d'implementation** ordonnee pour le portage admin : quelles **familles de pages** partagent la meme **ossature** (generateur = convention + template + widgets du registre, pas moteur opaque — 15.5 §3.1), quels **widgets CREOS** manquent encore au registre, et quel **ordre de deblocage** respecte strictement **A puis B puis C** sans melanger les trois axes (UI / contrat / produit).

### 1.2 Contraintes a respecter dans la reponse du modele fort

1. **Classification A / B / C** (15.5 §7) : chaque route ou famille issue de **15.1** doit etre reclassee si besoin, avec justification une ligne ; ne pas promouvoir une famille **B** en portage UI sans story **contrat** prealable ; ne pas traiter **C** sans **HITL produit** explicite.
2. **Architecture cible** : toute proposition d'ecran doit expliciter le chemin **OpenAPI** (authority) → **ContextEnvelope** → **NavigationManifest / PageManifest** → **runtime** → **UserRuntimePrefs** (non-metier uniquement).
3. **Mutualisations deja identifiees** (15.3 + 15.5) : tenir compte des briques **shell liste admin**, **bloc filtres analytics**, **cartes KPI**, **hub de navigation secondaire**, **vue detail ressource**, **console export**, **wizard sensible**, **guards d'acces** — dire quelles pages les consomment et lesquelles etendent le catalogue.
4. **Gaps sensibles** : reprendre de **15.2** les themes exports / bulk / super-admin / step-up / ecarts `operation_id` ; ne pas les « resoudre » dans la couche UI.
5. **Parite** : chaque proposition de slice doit indiquer la **ligne matrice** (15.4, `2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`, bloc Epic 15) et le **type de preuve** attendu (DevTools, code, test, documentaire).
6. **Reserve 15.5** : la famille `users` reste **partiellement B** tant que le gap **G-OA-03** (15.2) n'est pas clos cote backend / contrat.

### 1.3 Questions explicites a poser au modele fort

| # | Question |
|---|----------|
| Q1 | Pour chaque famille **A**, quel **template de page** (generateur) minimal couvre 80 % des ecrans sans dupliquer la logique metier dans le front ? |
| Q2 | Quels **operation_id** manquants ou ambigus bloquent encore une ligne **A** (liste par ecran) ? |
| Q3 | Quel ordre **intra-A** minimise les dependances entre manifests (ex. hub rapports avant detail session) ? |
| Q4 | Pour **B**, quelles **stories backend** minimales (titre + critere d'acceptation) deverrouillent chaque famille, sans toucher au JSX Peintre ? |
| Q5 | Pour **C**, quelles **decisions produit** sont necessaires avant toute story `create-story` ? |
| Q6 | Ou placer les **exports sensibles** reception / caisse dans la sequence (toujours apres stabilisation contrat + audit — 15.2) ? |

### 1.4 Livrables attendus de la passe forte

1. **Arbre d'epics propose** avec trois **rails paralleles** (UI A, contrats B, produit C) et dependances en arcs uniquement **B → A** ou **C → A**, jamais un epic « fourre-tout ».
2. **Liste ordonnee de slices CREOS** (proposition de `page_key` + widgets + `operation_id` par slice).
3. **Backlog de gaps OpenAPI / envelope** priorise (references croisees 15.2).
4. **Risques HITL** : navigateur reel, super-admin, exports — dates ou criteres de sortie HITL.

---

## 2. Corpus exact a fournir a l'analyse (ordre de lecture)

| Ordre | Document | Role |
|-------|----------|------|
| 1 | `references/artefacts/2026-04-12_03_recommandation-architecture-admin-peintre-nano-15-5.md` | Taxonomie briques, generateur, rejets, **A/B/C** |
| 2 | `references/artefacts/2026-04-12_01_inventaire-surfaces-admin-legacy-15-1.md` | Routes, familles, fiches parite |
| 3 | `references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md` | Endpoints, permissions, gaps, surfaces sensibles |
| 4 | `references/artefacts/2026-04-12_02_patterns-mutualisables-anti-patterns-admin-legacy-15-3.md` | Patterns / anti-patterns |
| 5 | `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md` | Bloc Epic 15, preuves, derogations |
| 6 | `peintre-nano/docs/03-contrats-creos-et-donnees.md` | Norme CREOS / data_contract |
| 7 | `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md` | P1 UI / P2 runtime admin |
| 8 | `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` | Garde-fous PR |
| 9 | `_bmad-output/planning-artifacts/guide-pilotage-v2.md` | Pilotage, gates MCP si applicables |
| 10 | `_bmad-output/planning-artifacts/epics.md` — section Epic 15 | Perimetre stories 15.x |

**Hors corpus pour la premiere passe** (bruit ou non consolide) : notes brutes non datees ; diffs massifs post-normalisation typographique sous `_bmad-output/implementation-artifacts` sans revue humaine (risque documentaire signale en 15.6).

---

## 3. Cartographie A / B / C → futurs epics (proposition)

Les **numeros** d'epic ci-dessous sont **indicatifs** ; insertion dans `epics.md` et `sprint-status.yaml` releve du pilotage BMAD. La contrainte structurelle est : **un epic = un seul rail**.

### Rail **P** — Produit / HITL (arbitrages, hors implementation technique directe)

| ID propose | Titre | Contenu | Declenche avant |
|------------|-------|---------|-----------------|
| **Epic P-admin-01** (ex. « 15-C ») | Arbitrages admin classe **C** | `import/legacy`, `quick-analysis`, vues combinees super-admin (15.5 §7) ; sorties de scope ou perimetres v2 | Tout portage UI des routes classe **C** |

### Rail **K** — Contrats / backend / securite (classe **B**)

| ID propose | Titre | Contenu | Declenche avant |
|------------|-------|---------|-----------------|
| **Epic K-admin-01** | Gouvernance contrats admin **B** | Fermeture gaps 15.2 : `groups`, `audit-log`, `email-logs`, `settings`, exports bulk, stats reception permissives ; **G-OA-03** pour `users` ; alignement OpenAPI + ContextEnvelope + step-up / audit documentes | Stories Peintre sur ecrans **B** correspondants |

### Rail **U** — Portage UI Peintre_nano (classe **A** uniquement)

| ID propose | Titre | Contenu | Depend de |
|------------|-------|---------|-----------|
| **Epic U-admin-01** | Ossature admin **A** — identite et configuration stable | `pending`, `cash-registers`, `sites` (manifests + widgets + guards ; pas de remediation contrat dans le meme epic) | K minimal si un gap bloquant subsiste sur ces routes (sinon contrats deja suffisants) |
| **Epic U-admin-02** | Ossature admin **A** — supervision caisse et rapports (hors export sensible non stabilise) | `session-manager`, `reports-hub`, journal `/admin/reports/cash-sessions`, `/rapports/caisse`, detail `cash-sessions/:id` — sous reserve contrats list/detail | K pour exports / bulk si inclus dans le perimetre |
| **Epic U-admin-03** | Ossature admin **A** — reception admin pilotage | `reception-stats`, `reception-sessions`, `reception-tickets/:id` ; **exclure** de ce epic les exports reception tant qu'ils restent en **B** | K pour parties **B** |
| **Epic U-admin-04** | Utilisateurs **A** residual | `users` **uniquement** apres cloture **G-OA-03** et validation matrice | **K-admin-01** (users) |

**Rappel :** `users` n'est pas « full A » tant que G-OA-03 est ouvert (15.5 §11 reserve 2).

---

## 4. Prochaines stories BMAD (seeds pour `create-story`)

Stories **redigees** uniquement au niveau **titre + intention** ; le SM / Epic Runner lance `bmad-create-story` avec ces seeds. Chaque story doit porter **un** rail (U, K ou P).

### Rail K (contrats)

1. **Fermer G-OA-03** (libelle exact a reprendre de 15.2) — backend + OpenAPI + preuve matrice pour `users`.
2. **Stabiliser permissions / audit** pour `groups`, `audit-log`, `email-logs` — pas de page Peintre dans l'AC.
3. **Parametres super-admin `settings`** — contrat step-up + surface sensible documentee avant toute UI.

### Rail U (UI classe A)

4. **Slice CREOS `admin-pending-users`** — parite observable vs `PendingUsers` ; manifest + widgets ; preuve matrice.
5. **Slice CREOS `admin-cash-registers` + `admin-sites`** — mutualisation shell liste + formulaires ; guards.
6. **Hub rapports + session manager** — hub secondaire + liste sessions ; correlation `operation_id` sessions / rapports.
7. **Reception admin pilotage** — stats + sessions + detail ticket (sans export B dans le meme fichier story).

### Rail P (produit / HITL)

8. **Decision de scope `quick-analysis` et `import/legacy`** — document de decision + impact matrice ; pas de code.

---

## 5. Incertitudes et besoins HITL / navigateur

| Sujet | Type | Action |
|-------|------|--------|
| Exports CSV / bulk reception et caisse | HITL + contrat | Traiter en **K** avant **U** ; preuve navigateur + fichier genere |
| Super-admin (`settings`, `sites-and-registers`) | HITL + securite | Step-up et audit validés humainement |
| Parite visuelle fine dashboard admin | Browser | Comparer legacy 4445 vs Peintre 4444 selon `guide-pilotage-v2.md` |
| Bruit diff post-normalisation typographique `_bmad-output/implementation-artifacts` | Documentaire | Ne pas utiliser comme source de verite sans diff review |

---

## 6. QA documentaire (substitut e2e)

| Controle | Preuve |
|----------|--------|
| Separation des rails U / K / P | §3 |
| Respect A/B/C et 15.5 | §1.2, renvois 15.5 |
| Corpus complet et ordonne | §2 |
| Seeds stories exploitables | §4 |
| HITL nommes | §5 |

**Verdict :** **PASS** (package pret pour main vers Epic Runner / modele fort).

---

## 7. Revue (CR) — synthese

**Verdict :** **Approuve** pour enchainement pilotage.

- **Force :** decoupage aligne sur la decision ferme 15.5 §7.1 (pas de melange UI / backend / produit dans un meme epic).
- **Suivi :** lors de l'insertion dans `epics.md`, verifier la **non-collision** avec numerotation existante (Epic 9–14).
