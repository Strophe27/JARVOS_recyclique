# Chantier refactor API Recyclique — audit brownfield 2026-04-19 (F1–F11, P0–P2)

---

## 2026-04-23 — Clôture (Epic 26 + rétro)

**Passage à `archive`.** Exécution BMAD **Epic 26** « dette qualité API » : stories **26.1 → 26.5** **done**, **`epic-26`** **done**, **`epic-26-retrospective`** **done** dans **`_bmad-output/implementation-artifacts/sprint-status.yaml`** ; **rétrospective** [**`epic-26-retro-2026-04-23.md`**](../../../_bmad-output/implementation-artifacts/epic-26-retro-2026-04-23.md). Trace **F7–F11** : **`epic-26-cloture-f7-f11-trace.md`**. Branche de travail typique : **`epic/26`**.

L’intention Kanban initiale (P0–P2 audit **2026-04-19**) est **couverte** par cet epic ; les **reports résiduels** éventuels sont **tracés** dans la clôture F7–F11, pas comme dette ouverte non nommée.

---

## 2026-04-19 — Strophe + agent

**Chantier transverse** : exécuter le **backlog refactor** et ancrer les **garde-fous** issus de l’audit de style / architecture sur `recyclique/api/` — avant que la dette ne se cumule avec les gros chantiers caisse, Paheko, multisite.

**Source unique (vérité)** : `[references/artefacts/2026-04-19_01_audit-brownfield-recyclic-api-architecture-style-handoff.md](../../artefacts/2026-04-19_01_audit-brownfield-recyclic-api-architecture-style-handoff.md)`

**Intention :** *(historique — clos Epic 26, voir §2026-04-23)* a-faire

### Pourquoi c’est visible

- Couvre **toute** la surface backend (`endpoints/`, `services/`, schémas, tests).
- Des **P0** sont déjà nommés (pytest maître unique, sort de `AdminService`).
- La **checklist §8** et les **findings F1–F11 §7** (F9–F11 : contrats d’erreur, Docker/`[dev]`, `collect_ignore` pytest — voir artefact) servent chaque PR qui touche l’API.

### Ce que ce chantier n’est pas

- Ce n’est **pas** l’alignement **PRD produit** multisite / permissions — voir la fiche **[2026-04-19_aligner-brownfield-prd-architecture-permissions-bmad.md](../archive/2026-04-19_aligner-brownfield-prd-architecture-permissions-bmad.md)** (**archivée**, clos Epic 25) ; les deux chantiers sont **complémentaires**.

### Backlog rappel (détail dans l’artefact §9)


| Priorité | Exemples                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------- |
| **P0**   | Une config pytest maîtresse ; décision **AdminService**                                           |
| **P1**   | Routes admin groups → service ; normaliser async vs ORM sync ; `Optional` → `T | None` progressif |
| **P2**   | Stratégie repository ; ruff ; liens doc tests                                                     |


### Pistes d’exécution

- Découper en **stories** ou PR ciblés (P0 d’abord) ; s’appuyer sur **checklist §8** à chaque changement.
- Croiser les chantiers **outbox Paheko**, **opérations spéciales caisse**, **alignement PRD** : en touchant les mêmes fichiers, appliquer le **même** style que l’audit (éviter d’aggraver F1–F2).

### Critère de sortie (suggéré)

- **P0** traités ou remplacés par issues/stories traçables ; **P1** au moins planifiés ou amorcés ; checklist PR référencée dans la **contribution** interne (ou équivalent) pour ne pas retomber dans l’oubli.

