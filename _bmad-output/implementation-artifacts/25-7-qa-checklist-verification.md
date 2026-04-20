# Vérification QA — Story 25.7 (checklist spec 25.4 §2–3)

**Date :** 2026-04-20  
**Livrable vérifié :** `_bmad-output/implementation-artifacts/checklists/25-7-checklist-spec-25-4-sections-2-3.md`  
**Type de contrôle :** revue documentaire (pas de tests Playwright / E2E — hors périmètre pour un livrable `.md`).

## Tableau DoD (PASS / FAIL)

| # | Critère | Résultat | Observations |
|---|---------|----------|--------------|
| 1 | Fichier présent au chemin attendu | **PASS** | Fichier lisible, non vide. |
| 2 | Alignement DoD documentaire : source normative spec **25.4** (§2 modèle, §3 changement) | **PASS** | Lien relatif explicite vers `2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md`. |
| 3 | Légende des tags `normative-spec` / `vision-later` | **PASS** | Tableau légende + règle `verification` pour `normative-spec`. |
| 4 | Couverture exigences **§2.1 à §2.5** et **§3.1 à §3.2** | **PASS** | 17 lignes tableau : 2.1 (3), 2.2 (2), 2.3 (2), 2.4 (3), 2.5 (2), 3.1 (2), 3.2 (3). |
| 5 | Chaque ligne `normative-spec` : tag + champ **verification** nommé | **PASS** | Identifiants `CTX-INV-*` / `CTX-SWITCH-*` sur toutes les lignes `normative-spec`. |
| 6 | Ligne `vision-later` : non bloquant + **verification** explicite *N/A* | **PASS** | §2.1 typologie FIXE/NOMADE/EXTERNE ; mention de ne pas rouvrir ADR 25-2 / 25-3. |
| 7 | Liens avec **ancres** vers la spec | **PASS** | Ancres `#21-site`, `#22-caisse-cash-register`, `#23-session-caisse`, `#24-poste-kiosque`, `#25-role-groupe-permission-effective`, `#31-bascule-site-caisse`, `#32-pin-step-up-et-kiosque` cohérentes avec les titres `###` de la spec (contrôle croisé fichier source). |
| 8 | Mentions **ADR 25-2** et **ADR 25-3** | **PASS** | 25-2 : intro, lignes 2.4/3.2, hors scope ; 25-3 : intro (hors §2–3 spec) + hors scope + lien fichier. |
| 9 | Section **hors scope** explicite (§2–3) | **PASS** | Auto-suspend, canaux d’alerte, vision taxonomie + non-rouverture ADR. |

## Conclusion

**PASS** — La checklist répond au périmètre documentaire attendu pour la story 25.7 ; aucun écart DoD identifié sur les critères ci-dessus.

## Note post-revue code

Alignement narratif `sprint-status.yaml` / story (section « Alignement sprint / YAML ») : ajusté après première passe CR ; contenu checklist inchangé. Seconde passe CR : **PASS** sur ce point.
