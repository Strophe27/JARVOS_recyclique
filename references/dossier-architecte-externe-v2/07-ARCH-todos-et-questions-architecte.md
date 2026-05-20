# 07 — TODO et questions pour l'architecte externe

Document de **cadrage de revue** pour l'architecte externe — structure prête ; à **compléter par l'architecte** après lecture des chapitres 01–06 (réponses, arbitrages, priorisation).

---

## Tensions architecturales connues (à trancher)

1. **Double récit modularité** — design v0.1 (`module.toml`, `ModuleBase`, EventBus Redis) vs v2 (CREOS build-time + JSON `site_id`/`module_key`) : quoi conserver, abandonner, migrer ?  
2. **Config UI vs données métier module** — `config-modules-site-id` (JSON générique) vs tables dédiées par module (ex. comptage pièces/billets à la clôture) : règle de décision ?  
3. **Insertion dans un workflow** — module affiché dans le header d'un autre module (cas bandeau) vs **étape** dans un flow (ex. fermeture caisse) : même protocole ou deux patterns ?  
4. **Backend « module optionnel »** — enregistrement routes/services : convention unique (package, prefix OpenAPI, feature flag) non documentée.  
5. **Paheko** — tout module avec impact compta doit emprunter la **chaîne outbox** (cf. ch. 04) ; valider pour chaque extension.

---

## Questions proposées à l'architecte

### Plateforme

- La séparation Recyclique / Peintre / CREOS / Paheko est-elle suffisante pour 5 ans de extensions, ou faut-il une couche « plateforme modules » explicite ?  
- Faut-il un **registre central** des `module_key` (catalogue, dépendances, version) distinct des manifests CREOS ?

### Modularité (pack livré — validation revue)

- Le **protocole unique** est documenté dans le pack (`06-cookbook`, `03`–`05`) : confirmer ou corriger après lecture — pont [`22`](../protocole-modules-recyclique/22-MOD-dossier-architecte-pont-t-mod.md).  
- Le pilote Epic 4 (bandeau) est-il un **template suffisant** ou manque-t-il des briques (ex. workflow step, tables métier) ? — réponse pack dans `02` / `09` (**Q-HITL-05**).

### Cas d'usage fil rouge (comptage pièces/billets)

- Où placer l'étape dans le flow **clôture caisse** (Epic 6) sans casser la parité legacy ?  
- Quelles écritures Paheko (batch session, sous-écritures) et quelle idempotence ?  
- Module **optionnel** : feature flag `module_key` + skip gracieux si désactivé — valider le modèle.

### Industrialisation

- Prioriser **Story 9.6** (config admin) vs **Epic 10** (CI CREOS) vs **ADR réconciliation v0.1/v2** ?  
- Marketplace post-v2 : à isoler dès maintenant dans les interfaces ?

---

## Pack protocole modules — statut (2026-05-20)

Le chantier documentaire **`references/protocole-modules-recyclique/`** est **livré** en brouillon normatif (`01`–`09`, cookbook `06`, pilote `08`, **ADR-007** : **Accepted** (HITL 2026-05-20, voir [`06_reco`](../artefacts/2026-05-20_06_reco-hitl-post-bouclage-modules-v2.md)). Les TODO **T-MOD-*** ci-dessous ne demandent plus de « créer le pack » : ils pointent vers l’**exécution** (BMAD, impl.).

**Pont exécutable** (fichier pack → statut doc → prochaine action → owner) : [`references/protocole-modules-recyclique/22-MOD-dossier-architecte-pont-t-mod.md`](../protocole-modules-recyclique/22-MOD-dossier-architecte-pont-t-mod.md). Procédure pas à pas module : [`06-MOD-cookbook-nouveau-module-optionnel.md`](../protocole-modules-recyclique/06-MOD-cookbook-nouveau-module-optionnel.md) — pas de duplication ici.

---

## TODO projet (extrait — non exhaustif)

| ID | Sujet | Statut (2026-05-20) | Où suivre |
|----|--------|---------------------|-----------|
| T-MOD-1 | Protocole modules unifié | **Clos documentaire** — validation HITL cookbook | Pack `03`–`06` · pont [`22`](../protocole-modules-recyclique/22-MOD-dossier-architecte-pont-t-mod.md) |
| T-MOD-2 | ADR réconciliation v0.1 ↔ v2 | **Accepted** (HITL 2026-05-20) — promotion BMAD en cours | [`07-MOD-adr-reconciliation-v01-v02.md`](../protocole-modules-recyclique/07-MOD-adr-reconciliation-v01-v02.md) · reco [`06_reco`](../artefacts/2026-05-20_06_reco-hitl-post-bouclage-modules-v2.md) |
| T-MOD-3 | Fusion OpenAPI `module-config/{module_key}` | **Brouillon** — fusion `contracts/` post-HITL | [`18-MOD-config-modules-crosswalk.md`](../protocole-modules-recyclique/18-MOD-config-modules-crosswalk.md) · `_bmad-output/` story **9.6** |
| T-MOD-4 | Story 9.6 config admin généralisée | **Backlog** BMAD | [`_bmad-output/implementation-artifacts/sprint-status.yaml`](../../_bmad-output/implementation-artifacts/sprint-status.yaml) · [`15-MOD-matrice-gaps-bmad-story-9-6.md`](../protocole-modules-recyclique/15-MOD-matrice-gaps-bmad-story-9-6.md) |
| T-MOD-5 | Registre `module_key` commun | **Livré** pack — impl. whitelist / schémas en attente | [`05-MOD-registre-module-key.md`](../protocole-modules-recyclique/05-MOD-registre-module-key.md) |
| T-MET-1 | Module comptage pièces/billets (fermeture caisse) | **Fiche livrée** — HITL + stories Epic 6 après validation | [`08-MOD-exemple-pilote-comptage-pieces-billets.md`](../protocole-modules-recyclique/08-MOD-exemple-pilote-comptage-pieces-billets.md) |
| T-PEINT-1 | Gardien du seuil — conscience d'affichage Peintre | **À cadrer** — hooks v2 + bypass ; outils agent TBD | Idée Kanban [`2026-05-20_peintre-gardeien-seuil-conscience-affichage.md`](../idees-kanban/a-creuser/2026-05-20_peintre-gardeien-seuil-conscience-affichage.md) · **L-16** · [`04-MOD-protocole-front-creos.md`](../protocole-modules-recyclique/04-MOD-protocole-front-creos.md) §17 |

---

## Décisions HITL Strophe (2026-05-20 — figées dans le prompt §08)

- **CREOS** = grammaire officielle affichage (widgets, workflows, manifests).
- **Peintre** = runtime CREOS ; container déjà isolé → revue = **branchements / contrats**, pas extractibilité.
- **v0.1** (`module.toml`, ModuleBase, EventBus Redis module) = **hors norme v2**.
- **Deux bus** : affichage (CREOS/Peintre) + métier (Recyclique/Paheko) ; pas de pipeline linéaire unique.
- **Écosystème JARVOS** : Recyclique app contributrice ; trajectoire caisse/réception en modules possibles.

## Prompt d'invitation (envoi architecte)

**1ʳᵉ passe :** [08-ARCH](08-ARCH-prompt-architecte-externe.md) → [03 revue 1](../artefacts/2026-05-20_03_reponse-architecte-branchements-modules-v2.md) (**GO sous réserves**).

**2ᵉ passe :** [09-ARCH](09-ARCH-prompt-bouclage-architecte-externe.md) → [04 bouclage](../artefacts/2026-05-20_04_reponse-architecte-bouclage-modules-v2.md) (**GO final**).

**Exécution (primordial) :** [05 notes loup de mer](../artefacts/2026-05-20_05_notes-architecte-loup-de-mer-modules-v2.md) — charger **avec** `04` avant tout module / session agent.

### HITL Strophe (2026-05-20 — ne pas rouvrir en bouclage)

**Reco complete post-bouclage :** [`2026-05-20_06_reco-hitl-post-bouclage-modules-v2.md`](../artefacts/2026-05-20_06_reco-hitl-post-bouclage-modules-v2.md) — QCM 8 reponses, §F tranche, ordre P0→P1, **ADR-007 Accepted**.

| Sujet | Tranché |
|--------|--------|
| Activation option par site | **`module_key` JSON** fait foi (H-03) |
| Marketplace post-v2 | **Non** maintenant (H-08) |
| Couche plateforme modules | **Non** v2 — registre + recette (H-PLAT) |
| Gardien du seuil T-PEINT-1 | **Hors** bouclage immédiat (H-16) |
| Ordre chantiers techniques | **P0 fait** (ADR + OpenAPI + handler pilote) — **P1** story [9.6 seed](../../_bmad-output/implementation-artifacts/9-6-config-admin-simple-modules.md) |
| Comptage / Paheko détail | **Reporté** — même base commune slice vs workflow step |
| ADR-007 v0.1 ↔ v2 | **Accepted** — voir `06_reco` et [`07-MOD-adr`](../protocole-modules-recyclique/07-MOD-adr-reconciliation-v01-v02.md) |

---

## Livrables attendus de la revue architecte

**Format unique (prompt v0.3) :** livrables **A–G** dans [08-ARCH-prompt-architecte-externe.md](08-ARCH-prompt-architecte-externe.md) — matrice branchements = livrable **C** (sections G.1–G.8 du prompt).

---

_Retour index : [index.md](index.md)_
