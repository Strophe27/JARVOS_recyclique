# Inventaire QA — paramétrage comptable SuperAdmin (Phase 0)

**Date :** 2026-04-18  
**Branche :** `feat/qa-compta-superadmin-20260418`  
**Spec :** `references/migration-paheko/2026-04-18_spec-corrections-qa-parametrage-comptable-superadmin.md`  
**Décisions produit :** encart dans la spec (M1 statu quo caisse ; M5 Option B puis extension API ultérieure).

| ID | Statut | Preuve / action |
|----|--------|-----------------|
| B1 | OK | `AdminAccountingGlobalAccountsWidget.tsx` placeholder 7541 ; migration `s22_7` UPDATE 708→7541 ; `s22_3` defaults |
| B2 | OK | Placeholder 672 ; Alert remboursement exercice clos ; `s22_7` 467→672 |
| B3 | OK | `AdminPahekoCashSessionCloseMappingsSection.tsx` encart cyan débit/crédit + lien Moyens de paiement ; champ débit conservé (requis Paheko API) |
| M1 | N/A (comportement caisse) / OK (référentiel) | Pas de changement caisse (décision produit). Moyens `donation` seedés dans `s22_7` ; note métier affinée migration `s22_8` |
| M2 | OK | `transfer` dans `s22_7` |
| M3 | OK | `cash_journal_code`, `default_entry_label_prefix` dans widget globaux |
| M4 | OK | Encart gris « Si aucun réglage… » + erreurs serveur mapping / builder |
| M5 | OK (Option B) | Saisie manuelle ID exercice + descriptions ; commentaires extension GET futurs (`paheko_accounting_client`, formulaire clôture) |
| I1 | OK (post-migration) | Fichier `recyclique/api/migrations/versions/s22_8_fix_paheko_close_mapping_credit_7073.py` : `credit` 7073→707 (JSON) + note `payment_methods.donation` |
| I2 | OK | Toast « Ordre mis à jour » + texte explicatif dans widget moyens |
| I3 | OK | Texte sous titre liste moyens |
| I4 | OK | Warning débit/crédit non bloquant |
| I5 | OK | Tooltips champs Paheko |
| I6 | OK | Modal session ouverte via API usage |
