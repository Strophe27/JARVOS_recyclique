# Index — dossier architecte externe v2

**Date :** 2026-05-20  
**Audience :** architecte senior **sans connaissance préalable** de Recyclique.  
**Objectif :** onboarding technique condensé pour études d'architecture (dont modularité — chantier séparé ensuite).

**Convention de nommage :** après le numéro d'ordre, le code **`ARCH`** = chapitre de ce dossier (architecture / plateforme v2). Le pack modules utilise **`MOD`** — voir [`../protocole-modules-recyclique/`](../protocole-modules-recyclique/index.md). Ex. `03-ARCH-backend-recyclique-api-donnees.md`.

---

## Ordre de lecture recommandé

1. [01-ARCH-contexte-metier-et-vision-v2.md](01-ARCH-contexte-metier-et-vision-v2.md) — métier ressourcerie, pivot brownfield, acteurs, vision v2  
2. [02-ARCH-architecture-globale-et-frontieres.md](02-ARCH-architecture-globale-et-frontieres.md) — quatre systèmes, Pistes A/B, hiérarchie de vérité  
3. [03-ARCH-backend-recyclique-api-donnees.md](03-ARCH-backend-recyclique-api-donnees.md) — API, BDD, multisite, legacy  
4. [04-ARCH-integration-paheko-compta-sync.md](04-ARCH-integration-paheko-compta-sync.md) — compta officielle, sync, outbox  
5. [05-ARCH-frontend-peintre-creos-contrats.md](05-ARCH-frontend-peintre-creos-contrats.md) — UI composée, CREOS, contrats  
6. [06-ARCH-etat-implementation-et-backlog.md](06-ARCH-etat-implementation-et-backlog.md) — epics livrés / backlog, hypothèses post-v2  
7. [07-ARCH-todos-et-questions-architecte.md](07-ARCH-todos-et-questions-architecte.md) — tensions, questions ouvertes pour l'architecte  
8. [08-ARCH-prompt-architecte-externe.md](08-ARCH-prompt-architecte-externe.md) — prompt **1ʳᵉ passe** v0.3 (QA2 GO)  
9. [09-ARCH-prompt-bouclage-architecte-externe.md](09-ARCH-prompt-bouclage-architecte-externe.md) — **2ᵉ passe** v1.1 (QA2 GO) · [qa2-rapport-prompt-bouclage-09.md](qa2-rapport-prompt-bouclage-09.md)

**Livrables architecte (artefacts) :** [03](../artefacts/2026-05-20_03_reponse-architecte-branchements-modules-v2.md) · [04](../artefacts/2026-05-20_04_reponse-architecte-bouclage-modules-v2.md) (**GO final**) · **[05 loup de mer](../artefacts/2026-05-20_05_notes-architecte-loup-de-mer-modules-v2.md) (primordial exécution)**

**Durée indicative :** 2–4 h de lecture (+ rédaction mémo architecte selon §08).

---

## Modules / modularité

**Date :** 2026-05-20

Pack normatif opérationnel (créer / brancher / activer un module optionnel v2) : [protocole-modules-recyclique](../protocole-modules-recyclique/index.md).

**Ordre de lecture recommandé :** lire d'abord les chapitres 01 à 07 de ce dossier pour le cadrage architecture v2 ; enchaîner ensuite le pack protocole (index → au minimum ch. 05–07 du dossier architecte recoupés dans le pack → [cookbook §06](../protocole-modules-recyclique/06-MOD-cookbook-nouveau-module-optionnel.md)) pour la mise en œuvre modulaire. Suivi des tensions et questions : [07-ARCH-todos-et-questions-architecte.md](07-ARCH-todos-et-questions-architecte.md) (T-MOD-*).

---

## Glossaire minimal

| Terme | Rôle |
|-------|------|
| **Recyclique** | Application métier (API + données terrain) |
| **Paheko** | Source comptable officielle (API-first) |
| **Peintre_nano** | Moteur de composition UI (agnostique métier) |
| **CREOS** | Grammaire des manifests UI (slots, widgets, flows) — **définition complète (CREOS = Command, Rule, Event, Object, State) :** ch. [01](01-ARCH-contexte-metier-et-vision-v2.md) §6 |
| **AR39** | Hiérarchie de vérité contractuelle (OpenAPI > ContextEnvelope > manifests > prefs) — détail ch. [02](02-ARCH-architecture-globale-et-frontieres.md) §4 |

---

## Hors scope de ce dossier

- **Protocole opérationnel modules** → section [Modules / modularité](#modules--modularité) et pack [protocole-modules-recyclique](../protocole-modules-recyclique/index.md) (brouillon normatif livré 2026-05-20).  
- Norme sprint détaillée → [`_bmad-output/planning-artifacts/`](../../_bmad-output/planning-artifacts/) (sources, pas destination).

---

## Sources canoniques (si approfondissement)

- PRD : `_bmad-output/planning-artifacts/prd.md`  
- Epics : `_bmad-output/planning-artifacts/epics.md`  
- Statut sprint : `_bmad-output/implementation-artifacts/sprint-status.yaml`  
- État projet : [`references/ou-on-en-est.md`](../ou-on-en-est.md)
