# 08 — Prompt architecte externe

**Version :** 0.3 · 2026-05-20 · QA2 GO (≥ 95 %)  
**Usage :** copier le bloc `markdown` ci-dessous + accès repo (lecture) aux deux packs.  
**Retour :** `references/artefacts/YYYY-MM-DD_NN_reponse-architecte-branchements.md`

```markdown
# Mission — Revue architecture Recyclique v2 / modules / branchements JARVOS

Architecte logiciel senior. **Architecture uniquement** : pas de code, pas de PRD/epics réécrits, pas de procédure marketplace post-v2 (citation impact interfaces seulement).

## Décisions commanditaire (ne pas rouvrir)

| ID | Décision |
|----|----------|
| D-01 | **CREOS** = grammaire officielle affichage (manifests, widgets, workflows, slots). |
| D-02 | **Peintre_nano** = runtime CREOS ; **container déjà isolé** → extractibilité documentaire acquise. La revue **ne valide pas** K8s/réseau/secrets ; gaps inter-container → **G.4** (Gap), sans rouvrir D-02. |
| D-03 | **v0.1 modules abandonné** (pas `module.toml`, `ModuleBase`, EventBus Redis « module »). Norme v2 = CREOS + OpenAPI + JSON `site_id`/`module_key`. **Ne pas re-débattre** l'abandon v0.1 (cf. T6). |
| D-04 | Pas de pipeline Recyclique linéaire : **deux bus** — affichage (CREOS→Peintre) et métier (API Recyclique→Paheko si financier). Module = branchement **sur les deux**. |
| D-05 | JARVOS : Peintre = moteur affichage partagé ; Recyclique = **app contributrice** (writer canonique de ses contrats). Caisse/réception pourront devenir modules — recette v2 ne doit pas l'interdire. |

## Mission

1. Valider **industrialisabilité** de `references/protocole-modules-recyclique/06-MOD-cookbook-nouveau-module-optionnel.md` sous D-01–D-05.
2. Remplir la **matrice de branchements** (sections G.1–G.7 ci-dessous) → livrable final **C** uniquement.
3. Trancher ambiguïtés **T1–T7** (règles opérationnelles ; pas re-litige D-01–D-05).
4. Prioriser `22-MOD-dossier-architecte-pont-t-mod.md` + `09-MOD-lacunes-et-questions-ouvertes.md`.

### Garde-fous verdict

- **NO-GO** recette : lecture minimale `05-ARCH`, `04-MOD-protocole-front-creos.md`, `03-MOD-protocole-backend.md` ; ≥ 3 lignes **Bloquant** en G.2+G.3 avec chemins fichier.
- **GO** bus affichage : citation explicite `05-ARCH` (≥ 2 §) + `04-MOD` (≥ 1 §).
- Contredire D-01–D-05 : section **Écart signalé** obligatoire.

## Noms de fichiers canoniques

| Raccourci | Chemin exact |
|-----------|----------------|
| 01–07 ARCH | `references/dossier-architecte-externe-v2/NN-ARCH-*.md` (voir `index.md`) |
| 06 cookbook | `references/protocole-modules-recyclique/06-MOD-cookbook-nouveau-module-optionnel.md` |
| 07 ADR | `references/protocole-modules-recyclique/07-MOD-adr-reconciliation-v01-v02.md` |
| 19 checklist | `references/protocole-modules-recyclique/19-MOD-checklist-v0-1-vs-pack.md` |
| 22 pont | `references/protocole-modules-recyclique/22-MOD-dossier-architecte-pont-t-mod.md` |
| 08 pilote | `references/protocole-modules-recyclique/08-MOD-exemple-pilote-comptage-pieces-billets.md` |
| 20 bandeau | `references/protocole-modules-recyclique/20-MOD-peintre-code-refs-bandeau-live.md` |
| post-v2 Peintre | `_bmad-output/planning-artifacts/architecture/post-v2-hypothesis-peintre-autonome-applications-contributrices.md` |
| sprint | `_bmad-output/implementation-artifacts/sprint-status.yaml` |

## Ordre de lecture (obligatoire avant verdict A)

**ARCH (minimum)**  
1. `01-ARCH-contexte-metier-et-vision-v2.md` (§6 CREOS)  
2. `02-ARCH-architecture-globale-et-frontieres.md`  
3. `05-ARCH-frontend-peintre-creos-contrats.md` — **bloquant bus affichage**  
4. `04-ARCH-integration-paheko-compta-sync.md` — **bloquant** si G.5 ou T5  
5. `06-ARCH-etat-implementation-et-backlog.md` — **bloquant** livrable E et priorisation  

**MOD**  
6. `06-MOD-cookbook-nouveau-module-optionnel.md`  
7. `07-MOD-adr-reconciliation-v01-v02.md` + `19-MOD-checklist-v0-1-vs-pack.md`  
8. `03-MOD-protocole-backend.md`, `04-MOD-protocole-front-creos.md`, `05-MOD-registre-module-key.md`, `21-MOD-gouvernance-contrats-modules.md`  
9. `08-MOD-exemple-pilote-comptage-pieces-billets.md`  
10. `09-MOD-lacunes-et-questions-ouvertes.md`, `22-MOD-dossier-architecte-pont-t-mod.md`  

**Preuve** : Epic 4 done — `sprint-status.yaml` + `20-MOD-peintre-code-refs-bandeau-live.md`.

## Hors scope

Implémentation, PR, stories, dates sprint ; marketplace procédurale ; réécriture intégrale du pack.

## Deux bus

```
[ Module ] → CREOS manifests → Peintre (runtime)
[ Module ] → OpenAPI Recyclique → BDD / permissions → Paheko (outbox) si compta
ContextEnvelope + navigation : autorité Recyclique seulement
```

## Matrice à remplir (sections G.1–G.7 → livrable **C**)

**Règles :** min. **3 lignes** par G.1–G.6 ; chaque ligne = mécanisme **nommé** (fichier ou endpoint) ; statut OK/Gap/Bloquant ; pas de ligne sans chemin relatif. Bullets = amorces, liste non close.

Colonnes : De | Vers | Mécanisme | Statut | Gap | Correction | Dépendance

### G.1 `contracts/`

OpenAPI↔CREOS ; AR39 ; `peintre-nano/generated/` ; `module-config/{module_key}` (gap attendu si absent canonique) ; précédence config site vs JSON `module_key`

### G.2 Module → affichage

Manifests CREOS ; registre widgets/workflows ; `module_key` off → skip UI ; slice vs workflow step ; Peintre autonome / autre app JARVOS

### G.3 Module → métier

Routes/package/prefix/feature flag ; registre `module_key` ; config JSON vs tables ; ContextEnvelope ; toggle bandeau vs 9.6

### G.4 Recyclique ↔ Peintre

Session ; commanditaire navigation ; chargement manifests + contexte

### G.5 Recyclique ↔ Paheko

Outbox obligatoire ; pilote `08-MOD` (flow clôture, idempotence, skip si off)

### G.6 Anti-régression v0.1

TOML/ModuleBase/EventBus Redis module → **Bloquant**

### G.7 Post-v2 (avis court)

App contributrice + CREOS JARVOS-wide ; caisse/réception modules futurs — blocage oui/non

### G.8 Agents / affichage (2 lignes min.)

App ou agent consommant CREOS : contrat, ContextEnvelope, writer canonique  
**T-PEINT-1** gardien du seuil (`04-MOD` §17, `05-ARCH` §7.4) : cadrage v2 / bypass / **Q-HITL-16**

## Tensions T1–T7 (tableau B)

| ID | Sujet |
|----|--------|
| T1 | Config JSON vs tables métier |
| T2 | Slice vs workflow step (`06-MOD`) |
| T3 | Convention backend module optionnel |
| T4 | Registre `module_key` vs manifests CREOS |
| T5 | Paheko outbox : exceptions ? |
| T6 | ADR-007 post-Accept : règles opérationnelles (`19-MOD`) — **pas** re-débat v0.1 |
| T7 | T-PEINT-1 : hooks v2 + outils agent |

## Questions (courtes + réf. fichier)

- `06-MOD` : industrialisable ? oui / sous réserves / non  
- Epic 4 + `20-MOD` : suffisant pour `08-MOD` ? briques manquantes  
- `08-MOD` : validé / modifs / repenser + schéma clôture caisse  
- Ordre **P0/P1/P2** : T-MOD-1…5, T-MET-1, T-PEINT-1 — **3 ordres possibles** (dont une variante Epic 10 ou `08-MOD` en tête) ; séquence ADR→9.6→OpenAPI→Epic 10 = **hypothèse à challenger**  
- Couche « plateforme modules » : maintenant ou post-v2 ?

## Livrables retour (un fichier md)

| Lettre | Contenu |
|--------|---------|
| **A** | Synthèse : verdict recette GO/GO réserves/NO-GO ; % lignes G OK ; top 3 P0 ; 3 actions avant nouveau module |
| **B** | Tensions T1–T7 |
| **C** | **Matrice complète G.1–G.8** (c'est la matrice sections G.x, pas une autre lettre) |
| **D** | Revue `08-MOD` |
| **E** | Priorisation `22-MOD` : T-MOD-1…5, T-MET-1, **T-PEINT-1** |
| **F** | Interdits maintenant |
| **G** | Questions HITL Strophe (produit/calendrier) |

## Critères qualité

Réf. fichier par ligne G/B ; pas de prose générique ; architecture vs produit ; NO-GO → Écart signalé ou ≥3 Bloquant G.

## Objectif

Recette unique : module optionnel branché sur CREOS/Peintre et Recyclique/Paheko via contrats reviewables — prérequis interop JARVOS (apps, agents affichage), sans marketplace.
```

_Retour : [index.md](index.md) · QA2 : [qa2-rapport-prompt-architecte-08.md](qa2-rapport-prompt-architecte-08.md)_
