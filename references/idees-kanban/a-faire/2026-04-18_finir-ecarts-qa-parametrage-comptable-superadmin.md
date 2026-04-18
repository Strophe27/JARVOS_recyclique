# Finir les écarts QA — paramétrage comptable SuperAdmin

---

## 2026-04-18 — Strophe + agent

Fermer le reliquat du cahier de corrections sur l’écran **Paramétrage comptable** (peintre + API + données), une partie déjà traitée en session incrémentale.

**Intention :** a-faire

**Spec canonique (grille B/M/I complète)** : `references/migration-paheko/2026-04-18_spec-corrections-qa-parametrage-comptable-superadmin.md`  
(anciennement `references/_depot/prompt-agent-dev-qa-compta.md`, déplacé le 2026-04-18 hors dépôt staging.)

**Décisions produit et inventaire (2026-04-18)** : encart **Décisions produit** en tête de la spec (M1 statu quo caisse ; M5 Option B). Inventaire Phase 0 : `references/artefacts/2026-04-18_03_inventaire-qa-parametrage-comptable-superadmin.md`. Migration données I1 : révision **`s22_8_fix_paheko_close_mapping_credit_7073`**.

**Conversation Cursor pour reprise de contexte** : [Session QA compta et correctifs dépôt](a1a7bab4-25b5-4e02-9c71-122a87997da4) — même transcript que l’Epic 23 orchestré dans la foulée ; la partie pertinente est la demande « `@references/_depot/prompt-agent-dev-qa-compta.md` go fix » suivie des rapports **qa-agent** (« Partiel », puis « passage avec réserves »).

### Synthèse « ce qui reste » (extraite des bilans QA de ce fil)

À recouper ligne par ligne avec la table « Résumé des priorités » du fichier spec.

| Zone | Signal dans le transcript |
|------|---------------------------|
| Ensemble | Rapport 1 : retard surtout sur **API + UI + révisions + comportements** vs doc, alors que **données / modèle / seed** déjà très avancés. |
| **M1** | Comportement **caisse** du moyen « Don » : non listé comme paiement standard mais déclenché quand encaissement > montant vente — à valider contre le doc. |
| **M3** | Formulation / périmètre (**ex.** champs obligatoires si Paheko actif) vs implémentation. |
| **M5** | Validation **exercice Paheko** (API ou sélecteur dynamique) selon spec. |
| **I6** | Flux **désactivation** d’un moyen quand une **session de caisse est ouverte** : modal / message attendu dans le doc. |

### Méthode de fermeture suggérée

1. Relire les sections correspondantes dans la spec (IDs ci-dessus + tout point encore ouvert dans les priorités P2).  
2. Vérifier migrations / seeds déjà joués sur les environnements qui ont migré avant les correctifs (éviter de modifier d’anciennes migrations — nouvelle migration données si besoin).  
3. Une passe **qa-agent** ou checklist manuelle contre la spec une fois les correctifs mergés.
