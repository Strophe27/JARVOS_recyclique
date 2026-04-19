# Synthèse QA documentaire — Story 25.2 (ADR PIN kiosque)

**story_key :** `25-2-fermer-adr-pin-kiosque-versus-pin-operateur-et-secret-de-poste`  
**Date (run QA) :** 2026-04-19  
**Verdict :** **PASS**

---

## Contexte

- **Story (fichier) :** [`_bmad-output/implementation-artifacts/25-2-fermer-adr-pin-kiosque-versus-pin-operateur-et-secret-de-poste.md`](../25-2-fermer-adr-pin-kiosque-versus-pin-operateur-et-secret-de-poste.md)
- **Livrable vérifié :** [`_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md`](../../planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md)
- **Périmètre :** décision d’architecture documentaire ; **aucun** test **API** ni **E2E** requis (**NA**) — contrôle par **revue statique** `epics.md` §25.2 ↔ ADR.

---

## Tests API / E2E

| Type | Statut | Motif |
|------|--------|--------|
| API (pytest / contrat) | **NA** | Pas d’endpoint ni de code service livré par 25.2. |
| E2E (Vitest / UI) | **NA** | Pas de parcours produit implémenté dans cette story. |

---

## Critères d’acceptation (`epics.md` §25.2) ↔ sections ADR

| AC Epic 25.2 (rappel) | Sections ADR | Résultat |
|------------------------|--------------|----------|
| **Given** — distinction `PIN opérateur` / `PIN kiosque` dans `prd.md` ; chemin PIN brownfield côté serveur (recherche) | **Contexte** | **OK** |
| **Then** — modèle de confiance kiosque ; vérification locale / hybride ; seuils de lockout ; tolérance offline ; frontières de revalidation ; **sans** affaiblir le PIN opérateur canonique serveur | **Décision** §1 (séparation), §2 (hybride borné), §3 (vérification), §4 (lockout), §5 (offline), §6 (step-up / revalidation) | **OK** |
| **And** — citations minimales : `prd.md`, PRD vision 2026-04-19, rapport de recherche alignement brownfield | **Conformité**, **Références** (trois chemins explicites) | **OK** |
| **And** — stories aval bloquées (auth kiosque, « passer la main », etc.) | **Stories aval encore bloquées ou directement concernées** | **OK** |

---

## Fichiers de traçabilité

- Story : `_bmad-output/implementation-artifacts/25-2-fermer-adr-pin-kiosque-versus-pin-operateur-et-secret-de-poste.md`
- ADR : `_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md`
- Epic / AC source : `_bmad-output/planning-artifacts/epics.md` (Story 25.2)
- Synthèse : `_bmad-output/implementation-artifacts/tests/test-summary-story-25-2-doc-qa.md` (ce fichier)
