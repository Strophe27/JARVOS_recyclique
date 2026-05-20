# 09 — Prompt bouclage architecte externe

**Version :** 1.1 · 2026-05-20 · QA2 GO (≥ 95 %)  
**Usage :** **2ᵉ passe** — copier le bloc `markdown` ci-dessous + accès repo.  
**Prérequis :** `references/artefacts/2026-05-20_03_reponse-architecte-branchements-modules-v2.md`  
**Retour :** `references/artefacts/2026-05-20_04_reponse-architecte-bouclage-modules-v2.md`  
**1ʳᵉ passe :** [08-ARCH-prompt-architecte-externe.md](08-ARCH-prompt-architecte-externe.md) · QA2 : [qa2-rapport-prompt-bouclage-09.md](qa2-rapport-prompt-bouclage-09.md)

```markdown
# Mission — Bouclage architecture modules v2 (2ᵉ passe)

Architecte logiciel senior. **Objectif unique : boucler** les zones ouvertes après revue 1 (GO sous réserves). Pas de code, pas de PRD réécrit, pas de marketplace procédurale.

## Contrôle lecture revue 1 (obligatoire)

La réponse `04` commence par **A.0 — Recoupe revue 1** :

- verdict revue 1 recopié (**GO sous réserves** attendu) ;
- **≥ 3 citations** depuis `references/artefacts/2026-05-20_03_reponse-architecte-branchements-modules-v2.md` (ex. top P0 §A, une ligne G.1 Bloquant L-04, une ligne T2 §B) ;
- sans **A.0** → max **GO sous réserves** ; réserve obligatoire : « revue 1 non recoupée ».

## Contexte

- **Revue 1** : `references/artefacts/2026-05-20_03_reponse-architecte-branchements-modules-v2.md`
- **Commanditaire** a tranché (table **DEC-*** ci-dessous) — **ne pas rouvrir** sauf contradiction technique majeure → section **Écart signalé** obligatoire.
- Packs : `references/dossier-architecte-externe-v2/`, `references/protocole-modules-recyclique/`

## Décisions commanditaire — FIGÉES (DEC-*)

| ID | Décision |
|----|----------|
| D-01 | **CREOS** = grammaire officielle affichage. **Non négociable** — tout chantier **renforce** CREOS/Peintre, ne les contourne pas. |
| D-02 | **Peintre_nano** = runtime CREOS ; container isolé ; pas de revue K8s/réseau ici. |
| D-03 | **v0.1 modules abandonné** pour v2. |
| D-04 | **Deux bus** : affichage (CREOS→Peintre) + métier (API→Paheko si compta). |
| D-05 | JARVOS : Peintre partagé ; Recyclique app contributrice ; caisse/réception → modules possibles. |
| DEC-03 | **`module_key` JSON** fait foi pour activer/désactiver chaque option (pas `sites.configuration` en priorité). **Q-HITL-03 = clos** — livrable C révise `03-MOD` §D.3.5 si rang PG contradictoire. |
| DEC-08 | **Pas de marketplace** v2. |
| DEC-PLAT | **Pas de couche plateforme modules** v2 — registre + recette + contrats suffisent. |
| DEC-16 | **T-PEINT-1** hors bouclage immédiat (pas de story avant 2–3 modules). |
| DEC-CREOS | Proposer ordre **P0→P1→P2** ; **CREOS / contrats manifests au centre** ; paragraphe **Epic 10 en clair** (80–120 mots, non dev) = tests auto des écrans déclaratifs, **pas** remplacement de CREOS. |

### Reporté — ne pas bloquer GO final bouclage

- **T-MET-1**, **Q-HITL-09–11** (comptage, wizard, Paheko détail) : **reportés** — **interdit** de les remettre en P0, en réserves ouvrant NO-GO, ou en section **F**.
- **G.5 / T-MET-1** (matrice revue 1) : une ligne en **E** — statut **inchangé reporté** (Bloquant métier accepté pour GO final architecture).

## Mission bouclage (complète revue 1, pas matrice from scratch)

1. **Fermer T3** — texte prêt à coller dans `references/protocole-modules-recyclique/03-MOD-protocole-backend.md` **§6 C.4** (package, router, prefix, `operationId`, feature flag, `module_key`, tests, anti-patterns) — clôt **L-09**.
2. **Fermer T2** — patron workflow/slice (≤ 1 page) :
   - trancher : **registre central points d'entrée** **ou** **patron par fiche + manifest CREOS** ;
   - **slice** : ex. `20-MOD-peintre-code-refs-bandeau-live.md` ;
   - **workflow step** : patron générique (`workflow_id`, panel) ; **comptage = illustration nommée seulement** (`08-MOD` §11, métier **reporté**) — **interdit** trancher skip/blocage/écart Paheko.
3. **Fermer DEC-03** — tableau précédence `module_key` vs `sites.configuration` vs Story 9.6 / ADR-001 ; texte prêt pour `03-MOD` **§D.3.5** + `05-MOD` si besoin.
4. **Fermer DEC-CREOS** — tableau obligatoire :

| Rang | ID | Action (1 ligne) | Dépend de | Bloque 2ᵉ module ? |
|------|-----|------------------|-----------|---------------------|
| P0… | T-MOD-2, T-MOD-3, … | … | … | oui/non |

- Inclure **T-MOD-2** (ADR-007 → **Accepted** — décision **HITL Strophe**, pas architecte).
- **T-MOD-1…5** pour industrialisation ; **T-PEINT-1** = P2 reporté (DEC-16).
- **T-MET-1** : une ligne « reporté — hors replanification bouclage ».

5. **Delta matrice (livré en E)** — tableau strict ; **ne pas** refaire G.1–G.8 :

| ID lacune | § G revue 1 | Statut revue 1 | Statut bouclage | Action doc (fichier + §) |
|-----------|-------------|----------------|-----------------|-------------------------|
| L-04 | G.1 | Bloquant | OK ou Gap résiduel | T-MOD-3 — **pas OK** sans action fusion OpenAPI |
| L-07 | G.1 | Bloquant | … | DEC-03 |
| L-08 | G.3 | Gap | … | Story 9.6 |
| L-09 | G.3 | Bloquant | … | T3 §6 C.4 |
| L-05 | G.3 | Gap | (optionnel) | T-MOD-5 |

- Ligne identique revue 1 → **ne pas** lister.

6. **Verdict bouclage** : **GO final** / **GO sous réserves** (liste **fermée**) / **NO-GO**.

### Si GO final ou GO sous réserves → livrable **I** obligatoire

## Revue 1 — ne pas invalider sans preuve

T1, T4, T5, T6 ; bus affichage GO ; recette industrialisable sous réserves contrats.

## Noms de fichiers canoniques

| Raccourci | Chemin exact |
|-----------|----------------|
| Réponse 1 | `references/artefacts/2026-05-20_03_reponse-architecte-branchements-modules-v2.md` |
| 06 cookbook | `references/protocole-modules-recyclique/06-MOD-cookbook-nouveau-module-optionnel.md` |
| 03 back | `references/protocole-modules-recyclique/03-MOD-protocole-backend.md` |
| 04 front | `references/protocole-modules-recyclique/04-MOD-protocole-front-creos.md` |
| 05 registre | `references/protocole-modules-recyclique/05-MOD-registre-module-key.md` |
| 18 crosswalk | `references/protocole-modules-recyclique/18-MOD-config-modules-crosswalk.md` |
| 22 pont | `references/protocole-modules-recyclique/22-MOD-dossier-architecte-pont-t-mod.md` |
| 20 bandeau | `references/protocole-modules-recyclique/20-MOD-peintre-code-refs-bandeau-live.md` |
| 08 pilote | `references/protocole-modules-recyclique/08-MOD-exemple-pilote-comptage-pieces-billets.md` |

## Lecture ciblée

1. Réponse 1 (chemin complet ci-dessus)
2. `06-MOD` §0.2, §8, §10, §15 · `04-MOD` §8–§9 · `03-MOD` §6 **C.4**, §D.3.5, §8 · `05-MOD` §3–§6
3. `18-MOD` §4–§5 · `05-ARCH` §3–§4 · `22-MOD` · `09-MOD` lacunes
4. `20-MOD` · `08-MOD` §11 (lecture seule)

## Hors scope

Implémentation, PR, stories ; marketplace ; T-PEINT-1 impl. ; Q-HITL-09–11 ; réécriture pack entier.

## Livrables (un fichier md)

| Lettre | Contenu |
|--------|---------|
| **A.0** | Recoupe revue 1 (voir contrôle en tête) |
| **A** | Verdict bouclage + delta vs revue 1 (3–5 puces) |
| **B.1** | T3 — bloc prêt à coller `03-MOD` §6 C.4 (≥ 8 puces numérotées) |
| **B.2** | T2 — patron slice/workflow (≤ 1 page) + renvois 20-MOD / 08-MOD §11 |
| **C** | Règle DEC-03 — précédence `module_key` |
| **D** | Priorisation finale (tableau DEC-CREOS) |
| **E** | Delta matrice (tableau ci-dessus) |
| **F** | Questions **architecture** max 3 — **pas** produit/comptage/Q-HITL-03/09–11 |
| **I** | **Recommandations et conseils** — **obligatoire** si A = GO final ou GO sous réserves |

### I — Recommandations (public non développeur)

- **400–700 mots** total section I.
- Ce qui est solide (2–4 puces).
- 3 risques si ordre D ignoré (1 phrase chacun).
- 5–7 interdits opérationnels (compléter revue 1 §F si utile).
- Trajectoire JARVOS : **120–180 mots** (CREOS inter-apps, modules internes d'abord).
- 3–5 règles d'or pour utiliser `06-MOD-cookbook` avec agents IA.

## Critères qualité

- Réf. fichier par section B/C/E.
- Pas de prose générique.
- **I** absente si NO-GO — sinon **I** obligatoire.
- Ne pas confondre **DEC-*** (décisions figées) et livrable **I** (conseils).
- T2 tranché = choix explicite registre **ou** patron fiche+manifest.

## Objectif final

Boucler la recette : ajouter un module (slice ou workflow step) sans ambiguïté CREOS/Peintre + API — avant 2ᵉ module métier.
```

_Retour : [index.md](index.md)_
