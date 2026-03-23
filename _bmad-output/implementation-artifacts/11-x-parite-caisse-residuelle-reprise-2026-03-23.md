# Parité caisse 1.4.4 — reprise Epic 11 (résiduel)

**Date :** 2026-03-23  
**Statut :** ACTIF — cadrage BMAD, pas encore « story done »  
**Règle :** `.cursor/rules/epic11-parite-et-refactor-propre.mdc`  
**Gate :** `_bmad-output/implementation-artifacts/11-x-gate-qualite-epic11.md`  
**Checklist import :** `references/ancien-repo/checklist-import-1.4.4.md`

---

## 1) Contexte (vérité fichier vs terrain)

- **Sprint :** `11-2-conformite-visuelle-caisse-5-ecrans` en *done* ; **Epic 19** stories **19.7–19.9** (presets, AZERTY, disposition) en *done* côté fichier.
- **Terrain :** la parité **réelle** caisse peut rester en dessous de l’exigence Epic 11 ; **19.11–19.13** = hors parité caisse → **ne pas** les traiter tant que la caisse n’est pas validée sous gate Epic 11.

---

## 2) Périmètre écrans « domaine caisse » (routes actuelles)

| Route | Écran | Dans le scope parité 1.4.4 ? |
| ----- | ----- | ------------------------------ |
| `/caisse` | Tableau de bord caisse | Oui |
| `/cash-register/session/open` | Ouverture session | Oui |
| `/cash-register/session/close` | Fermeture session | Oui |
| `/cash-register/sale` | Saisie vente | Oui |
| `/cash-register/virtual` | Caisse virtuelle | À confirmer (usage terrain) |
| `/cash-register/deferred` | Caisse différée | À confirmer (usage terrain) |
| `/caisse/pin` (constante `CAISSE_PIN_PATH`) | PIN opérateur | **Hors scope** correctif visuel prioritaire (exclusion Epic 11 validée) |

**Action Strophe :** cocher quelles lignes « virtuelle / différée » doivent entrer dans la même vague que la saisie vente.

---

## 3) Référence écarts (point de départ — à **revalider** après 19.7–19.9)

L’audit terrain documenté dans :

`_bmad-output/implementation-artifacts/19-6-audit-caisse-post-categories.md`

a été rédigé **avant / pendant** le cadrage des corrections 19.7–19.9. Il reste la **meilleure liste historique** des écarts (flux poids → prix, raccourcis par niveau d’écran, finalisation, KPI, onglets, presets).

**Obligation avant nouvelle story « done » :** repasser un **mini-audit terrain** sur `/cash-register/sale` + finalisation + ouverture/fermeture + dashboard, et mettre à jour une colonne « Statut après 19.9 » (OK / KO / Partiel) dans ce fichier ou dans une annexe datée.

---

## 4) Découpage BMAD proposé (stories « parité résiduelle »)

Une story **par lot cohérent**, avec AC testables + captures avant/après + gate Epic 11 :

1. **Lot A — Saisie vente : flux métier & sous-écrans**  
   Grille catégories, navigation parent/enfant, **ordre poids → prix → ligne ticket**, champs numériques, alignement 1.4.4 (comportement + disposition).

2. **Lot B — Clavier & focus**  
   Raccourcis **par écran affiché**, quantité préfixe, TAB / accès aux 4 onglets si exigés par la référence, Escape / Backspace (comportement exact 1.4.4).

3. **Lot C — Finalisation & paiements**  
   Écran finalisation conforme et fonctionnel ; cohérence avec tickets / réception si la référence l’impose.

4. **Lot D — Dashboard + ouverture / fermeture session**  
   Parité visuelle et parcours vs 1.4.4 ; KPI et libellés.

**Clés suggérées (à créer dans `epics.md` + `sprint-status.yaml` si absentes) :**  
`11-2a-parite-caisse-residuelle-saisie-flux` · `11-2b-parite-caisse-residuelle-clavier-onglets` · `11-2c-parite-caisse-residuelle-finalisation` · `11-2d-parite-caisse-residuelle-dashboard-session`

*(Numérotation indicative : rester sous le même Epic 11 / prolongement 11-2, sans rouvrir l’Epic 19 pour de la parité pixel.)*

---

## 5) Enchaînement recommandé

1. Strophe : valide le tableau §2 (surtout virtuelle / différée).  
2. Agent : mini-audit terrain post-19.9 → met à jour §3 (tableau court).  
3. SM / orchestration : une story **Lot A** avec AC + références écran 1.4.4 (`references/ancien-repo/`, captures).  
4. Dev : `/run-story` sur **une** clé à la fois ; tests UI co-locés ; gate §11-x-gate.

---

## 6) URLs dev (rappel)

- Frontend : `http://localhost:4173`  
- API : `http://localhost:9010`  
- Paheko : `http://localhost:8080`
