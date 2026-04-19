# Finir les écarts QA — paramétrage comptable SuperAdmin

**Stade :** `a-faire` — **reliquat de vérification** après merge dans `master` (pas une nouvelle vague de dev tant que la grille spec n’est pas repassée).

---

## Lien avec le bilan « déjà fait »

Tout ce qui a été **mergé** (PR GitHub #1, migration `s22_8`, écran Paheko, docs, inventaire) est décrit ici :

→ **[Bilan daté 2026-04-20](../../artefacts/2026-04-20_bilan-fin-ecarts-qa-parametrage-comptable-superadmin.md)**

*(Ce fichier Kanban ne duplique pas ce bilan : il ne garde que **ce qui reste** à traiter ou à valider.)*

---

## À clarifier pour les sessions futures

La spec ne parle **pas** d’une « table » SQL à créer pour fermer ce chantier : elle utilise un **tableau markdown** « Résumé des priorités » (IDs **B1, B2, B3, M1…**) dans :

`references/migration-paheko/2026-04-18_spec-corrections-qa-parametrage-comptable-superadmin.md`

---

## Ce qui reste à faire (checklist opérationnelle)

1. **Repasser la grille B / M / I** de ce document spec et **cocher** ce qui est encore ouvert dans le produit déployé (Peintre + API).
2. Traiter ou **router** chaque ligne ouverte :
  - soit correctif / story dédiée ;
  - soit validation « déjà OK » + mise à jour de ce fichier (ou archivage).
3. Points souvent encore cités comme **à recouper** (voir aussi bilan lié) :
  - **M1** — cohérence « Don » référentiel vs comportement caisse documenté ;
  - **M3** — alignement formulations / champs obligatoires si Paheko actif ;
  - **I6** — parcours désactivation moyen avec session ouverte (modal attendu).

**M5 (Exercice Paheko)** : décision produit **Option B** (saisie manuelle) pour le chantier ; liste / validation via API Paheko = **hors périmètre** sauf nouvelle story.

---

## Références prolongées

- Spec canonique (grille complète) : `references/migration-paheko/2026-04-18_spec-corrections-qa-parametrage-comptable-superadmin.md`
- Inventaire Phase 0 : `references/artefacts/2026-04-18_03_inventaire-qa-parametrage-comptable-superadmin.md`
- Conversation Cursor (autre session, reprise contexte) : transcript `a1a7bab4-25b5-4e02-9c71-122a87997da4` (mention historique dans l’ancienne version de cette fiche).

