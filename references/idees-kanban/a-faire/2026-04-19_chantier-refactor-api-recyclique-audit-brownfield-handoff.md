# Chantier refactor API Recyclique — audit brownfield 2026-04-19 (F1–F11, P0–P2)

---

## 2026-04-19 — Strophe + agent

**Chantier transverse** : exécuter le **backlog refactor** et ancrer les **garde-fous** issus de l’audit de style / architecture sur `recyclique/api/` — avant que la dette ne se cumule avec les gros chantiers caisse, Paheko, multisite.

**Source unique (vérité)** : `[references/artefacts/2026-04-19_01_audit-brownfield-recyclic-api-architecture-style-handoff.md](../../artefacts/2026-04-19_01_audit-brownfield-recyclic-api-architecture-style-handoff.md)`

**Intention :** a-faire

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

