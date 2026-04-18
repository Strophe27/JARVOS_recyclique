# Audit — Décisions v0.1 : complétude et risque de dérive

**Date :** 2026-02-26  
**Objectif :** S'assurer que les décisions architecturales sont complètes et qu'aucun « trou » ne permet aux agents ou au code de dériver.  
**Pour :** Strophe (validation), PM / Architect (mise à jour des références).

---

## 1. Ce qui est déjà « décisions de référence » (epics.md + checklist)

Les **4 décisions** propagées partout sont claires et couvertes :

| # | Décision | Statut | Où c'est écrit |
|---|-----------|--------|----------------|
| 1 | Convention tests frontend : co-locés `*.test.tsx`, pas de `__tests__` | Tranché | epics.md, checklist v0.1, frontend/README.md, architecture § Important Gaps |
| 2 | Versions stack : Python 3.12, Node 20 LTS, PostgreSQL 16, Redis 7, Paheko (image officielle) | Figé | epics.md, checklist v0.1, Dockerfile, README, docker-compose.yml, doc/deployment.md |
| 3 | Loader modules et slots : structure en place (modules.toml, ModuleBase, workers, slots) | Fait (Story 1.4) | epics.md, checklist v0.1, architecture § Project Structure |
| 4 | Module correspondance (FR13b) : reporté à l'Epic 3, ne pas trancher avant BDD + instance dev + analyste | Reporté | epics.md, checklist v0.1, PRD |

---

## 2. Trous identifiés (architecture vs décisions de référence)

Points présents dans **architecture.md** mais **pas** dans la liste « Décisions architecturales de référence » des epics. Ce sont des candidats à la dérive si un agent prend une option différente.

| Point | Dans l'architecture | Risque de dérive | Recommandation |
|-------|---------------------|------------------|----------------|
| **Outil de test frontend** | « Vitest, React Testing Library selon les stories » | Premier test frontend pourrait utiliser Jest ou autre → divergence | **Trancher maintenant** : Vitest + React Testing Library (aligné Vite). Ajouter une ligne dans la section « Décisions de référence » ou dans la checklist : « Outil tests frontend : Vitest + React Testing Library (référence frontend/README ou architecture). » |
| **Styling frontend** | « Non imposé ; à trancher en implémentation (CSS modules, Tailwind, ou alignement 1.4.4) » | Première story avec du style pourrait choisir Tailwind alors qu'un autre agent pose du CSS module → incohérence | **Soit** trancher dès maintenant (ex. « alignement 1.4.4 lors de l'import, à documenter dans ux-design-spec »), **soit** documenter explicitement : « À trancher dans la première story frontend qui touche au style (Epic 2 ou 4) ; jusqu'à là, pas de lib globale. » et rappeler dans l'Epic 2. |
| **Déploiement effectif** | Règle artefact 2026-02-26_05 : exécuter `docker compose up` + vérifier /health pendant la story déploiement | Déjà couvert par la **Story 1.5** ; pas une décision « produit », plutôt processus. | Pas besoin de l'ajouter aux 4 décisions ; s'assurer que les stories de déploiement (1.3, 1.5) et la règle 05 sont chargées par l'agent quand il travaille sur ces stories. Optionnel : 1 ligne dans la checklist « Déploiement effectif : voir Story 1.5 et artefact 2026-02-26_05 ». |

**Résumé trous :**

- **À trancher maintenant pour éviter la dérive :** outil de test frontend (Vitest + RTL).
- **À trancher ou à cadrer :** styling (trancher maintenant ou « à trancher en story X » avec responsable clair).
- **Déjà couvert par processus :** déploiement effectif (Story 1.5 + règle 05).

---

## 3. Autres points (options, pas décisions « ne pas dévier »)

Ils sont documentés dans l'architecture ; pas besoin de les mettre dans les 4 décisions, mais ils ne doivent pas être « réinventés » :

- **State management** : Context + state local en v1 ; option store global (ex. Zustand) prête à activer selon critères (architecture + commentaires dans le code).
- **Cache applicatif** : option réservée ; stratégie d'invalidation et seuils à définir si activation ; métriques et messages dev/super-admin.
- **Option Bypass** (lecture/écriture directe BDD Paheko) : documentée pour réévaluation si base partagée un jour.

Si un agent ajoute Zustand ou un cache sans suivre l'architecture, c'est une dérive — mais elle est limitée tant que les **patterns et l'architecture** sont chargés. La section « Décisions de référence » vise surtout les choix qui reviennent dans **chaque** epic (tests, versions, structure). Les options « prêtes à activer » restent dans architecture.md ; pas de trou majeur ici.

---

## 4. Comment s'assurer que c'est complet et qu'on ne dérive pas

### Avec qui

| Rôle | Rôle dans la complétude / anti-dérive |
|------|---------------------------------------|
| **Toi (Strophe)** | Valider quels points trancher maintenant (ex. Vitest, styling) et dire « on ajoute ça aux décisions de référence » ou « on laisse à trancher en Epic 2 avec la story X ». |
| **PM (John)** | Maintenir la liste des décisions (epics.md, checklist), proposer des formulations et mettre à jour après ton choix. |
| **Architect (Winston)** | Si tu veux une **revue formelle** « y a-t-il d'autres trous ? », ouvrir une session avec l'agent Architect en donnant en entrée : architecture.md, checklist v0.1, epics.md (section Décisions de référence), et ce document. |
| **Workflow Implementation Readiness** | Vérifier l'alignement PRD ↔ UX ↔ Architecture ↔ Epics ; utile après avoir complété les décisions pour détecter incohérences. |
| **Workflow Correct Course** (SM Bob) | Si en cours d'Epic 2 (ou autre) tu constates une **dérive** (ex. quelqu'un a mis un dossier `__tests__`, ou un autre outil de test), lancer Correct Course : il aide à remettre à plat et à propager la décision dans les bons documents. |

### Quoi faire (plan d'action proposé)

1. **Trancher l'outil de test frontend**  
   Décision proposée : **Vitest + React Testing Library**.  
   - Ajouter une 5e ligne dans la section « Décisions architecturales de référence » de `epics.md` (ou une entrée dans la checklist v0.1).  
   - Mettre à jour `frontend/README.md` si besoin (ou pointer vers l'architecture).

2. **Cadrer le styling**  
   - **Option A — Trancher maintenant :** ex. « Alignement avec l'existant 1.4.4 lors de l'import ; pas de lib globale imposée en v1. À documenter dans ux-design-spec ou première story front. » → ajouter une ligne dans les décisions de référence.  
   - **Option B — Reporter avec responsable :** « Styling : à trancher dans la première story frontend qui touche au style (Epic 2 ou 4) ; responsable = Dev + SM ; jusqu'à là, pas de lib globale. » → ajouter dans la checklist et une phrase dans l'Epic 2.

3. **Mettre à jour la checklist v0.1**  
   Après tes choix :  
   - Cocher ou ajouter les lignes « Outil tests frontend : Vitest + RTL » et « Styling : [tranché / à trancher en story X] ».  
   - Optionnel : une ligne « Déploiement effectif : Story 1.5 + artefact 2026-02-26_05 ».

4. **Quand une dérive apparaît**  
   Utiliser **Correct Course** (`/bmad-bmm-correct-course` ou équivalent) : décrire la dérive, puis le workflow recommande les mises à jour (PRD, architecture, epics, sprint-status) et la propagation.

---

## 5. Résumé

- **Complétude :** Les 4 décisions actuelles couvrent le socle (tests co-locés, versions, loader/slots, FR13b). Il reste **2 trous** à couvrir pour éviter la dérive : **outil de test frontend** (recommandation : trancher Vitest + RTL) et **styling** (trancher maintenant ou « à trancher en story X »).
- **Avec qui :** Toi pour valider ; PM pour mettre à jour les docs ; Architect pour revue formelle optionnelle ; Implementation Readiness pour alignement ; Correct Course en cas de dérive constatée.
- **Quoi faire :** Trancher outil test (et éventuellement styling), ajouter les lignes dans epics.md et checklist v0.1, puis avancer sur l'Epic 2 en sachant que les agents ont sous les yeux des décisions complètes.

---

## 6. Suite — tranché le 2026-02-26 (PM)

- **Outil tests frontend** : **Tranché** — on se cale sur l'Epic 1 : **Vitest + React Testing Library + jsdom** (déjà en place dans `frontend/package.json` et `frontend/README.md`). **Verrouillé** : pas de Jest ni autre runner. E2E hors périmètre v0.1 ; si E2E plus tard = Playwright (référence 1.4.4). Ajouté aux décisions de référence dans `epics.md` et à la checklist v0.1.
- **Styling / UI frontend** : **Tranché** — **Mantine** (alignement RecyClique 1.4.4 pour réimport du visuel). Référence : `references/ancien-repo/technology-stack.md`. Version à figer à l'introduction. Ajouté aux décisions de référence, checklist, architecture, frontend/README, règle Cursor.
- **Déploiement effectif** : déjà couvert (Story 1.5 + artefact 05) ; rappel ajouté dans la checklist.
- **Vérification** : epics.md (section Décisions de référence), checklist v0.1, architecture.md (§ Important Gaps), frontend/README.md et règle `.cursor/rules/architecture-et-checklist-v01.mdc` mis à jour. **Aucun trou restant** pour le démarrage en mode automatique : tout est verrouillé sauf FR13b (détail en Epic 3).
