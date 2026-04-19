# Bilan — chantier « finir les écarts QA » paramétrage comptable SuperAdmin

**Date :** 2026-04-20  
**Rôle :** trace unique « ce qui a été mergé » pour relier la fiche Kanban au dépôt ; la **liste exhaustive des corrections** reste la spec canonique.

---

## Ce que ce document n’est pas

- Ce n’est **pas** une « table » SQL à créer : la **table des priorités** dont parle la spec est le **tableau markdown** « Résumé des priorités » dans  
  `references/migration-paheko/2026-04-18_spec-corrections-qa-parametrage-comptable-superadmin.md` (colonnes Priorité / ID / Action).

---

## Livré dans `master` (merge GitHub)

| Élément | Détail |
|--------|--------|
| **Merge PR** | Pull Request **#1** (`feat/qa-compta-superadmin-20260418` → `master`), commit de fusion **`1809c6b`** sur `origin/master`. |
| **Migration données** | `recyclique/api/migrations/versions/s22_8_fix_paheko_close_mapping_credit_7073.py` — alignement crédit clôture **7073 → 707** (thème I1 / réglages de test). |
| **API / client Paheko** | Commentaires / doc dans `paheko_accounting_client.py` (références extension future exercices, etc.). |
| **Peintre** | `AdminPahekoCashSessionCloseMappingsSection.tsx` — champ **Exercice Paheko** + textes d’aide (Option B manuelle, décision produit 2026-04-18). |
| **Documentation** | Mode d’emploi SuperAdmin compta, inventaire QA `references/artefacts/2026-04-18_03_inventaire-qa-parametrage-comptable-superadmin.md`, mises à jour spec / index migration-paheko. |

**Spec canonique inchangée comme référence :**  
`references/migration-paheko/2026-04-18_spec-corrections-qa-parametrage-comptable-superadmin.md`

---

## Hors dépôt / à traiter manuellement

- **Stash Git local (si encore présent) :** une session agent avait préparé un **texte d’aide plus court** sous « Exercice Paheko » + ajustements **pytest** (`conftest`, stories 22.3 / 8.3). Tant que ce n’est pas `stash pop` + commit + push, ce n’est **pas** sur `master`. Vérifier avec `git stash list`.

---

## Ce qui peut encore être « à faire » (reliquat Kanban)

La fermeture du ticket **Idées** `finir-ecarts-qa-parametrage-comptable-superadmin` suppose une **relecture ligne à ligne** du tableau « Résumé des priorités » de la spec et validation terrain (Peintre + API).

Les zones historiquement signalées comme à **recouper** (extrait ancienne fiche Kanban) :

| Zone | Motif |
|------|--------|
| **M1** | Comportement caisse « Don » vs référentiel expert — à valider contre le doc. |
| **M3** | Formulation / périmètre (champs obligatoires si Paheko actif) vs implémentation. |
| **M5** | Livraison **Option B** (saisie manuelle) : fait côté texte ; **liste / validation API** = story ultérieure (spec). |
| **I6** | Désactivation moyen de paiement avec **session ouverte** : modal / message attendu. |

Toute ligne encore ouverte dans la spec doit être soit implémentée, soit explicitement reportée avec lien vers une autre story / fiche Kanban.

---

## Liens utiles

- Fiche Kanban (reliquat) : `references/idees-kanban/a-faire/2026-04-18_finir-ecarts-qa-parametrage-comptable-superadmin.md`
- Journal projet : `references/ou-on-en-est.md`
