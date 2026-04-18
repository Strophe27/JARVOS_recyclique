# ADR — Opérations spéciales de caisse, tags métier et chaîne Paheko (v1)

**Statut :** Accepté (BMAD — lancement chantier 2026-04-18)  
**Périmètre :** Complète `cash-accounting-paheko-canonical-chain.md` et le PRD `references/operations-speciales-recyclique/2026-04-18_prd-recyclique-operations-speciales-sorties-matiere-paheko_v1-1.md`.  
**Dépend :** Epics 6, 8, 22, 23 (caisse, sync Paheko, rail comptable canonique, ventilation par moyen).

## Contexte

Le PRD opérations spéciales demande des parcours explicites (annulation, remboursement, décaissement, mouvement interne, échange), des tags métier sur ticket ou ligne, et une traçabilité financière exportable vers Paheko. Une partie du socle existe déjà (`sale_reversal`, permission N-1, outbox, builders de clôture). Il faut éviter une deuxième chaîne comptable parallèle.

## Décisions

### D1 — Une seule autorité financière et un seul rail Paheko

Toute nouvelle opération qui produit un flux financier réutilise les **types et mécanismes existants**, dans l’ordre de la chaîne canonique : **référentiel des moyens de paiement** → **journal détaillé des transactions** (`PaymentTransaction` et équivalents remboursements) → **snapshot comptable figé de session** → **builder d’écritures** → **outbox idempotente** vers Paheko, avec ventilations issues du référentiel expert (Epic 22–23). Aucun export Paheko ad hoc hors snapshot + builder idempotent ; pas de court-circuit du journal pour « recalculer » depuis la vente seule.

### D2 — Distinction stricte matière / finance / mixte

- **Matière seule** : mouvements d’objets sans contrepartie monétaire (ticket à 0 €, tags métier).  
- **Finance seule** : mouvements de caisse sans changement de stock (ex. mouvement interne typé).  
- **Mixte** : échange avec différence ; la différence emprunte les **sous-flux vente et remboursement** déjà canoniques, pas un troisième moteur.

### D3 — « Free » n’est pas un canal de remboursement

Conformément au modèle déjà codé en schémas API : le remboursement réel est ventilé par **moyen effectif** ; la gratuité reste une sortie à **0 €**, pas un paiement ni un canal de remboursement.

### D4 — Remboursement exceptionnel sans ticket

Parcours **expert distinct** : permission dédiée, step-up PIN responsable, motifs codifiés, justification texte obligatoire, corrélation audit ; pas de réutilisation du contrat « remboursement standard » qui exige une vente source.

### D5 — Tags métier

Les gratuités et variantes sociales sont des **tags** sur le parcours ticket standard (niveau ticket et/ou ligne avec règle de surcharge documentée), pas des parcours lourds parallèles au flux nominal.

### D6 — Initiateur / validateur (niveaux N2/N3)

Les opérations sensibles réutilisent le modèle **step-up** et l’audit existants ; toute action N3 distingue **initiateur** et **validateur** dans les journaux et charges utiles métier.

### D7 — Visibilité synchronisation Paheko

Toute opération financière exposée au terrain ou à la supervision doit permettre de lire un **état de synchronisation** cohérent avec l’outbox (y compris partiel / quarantaine), en réutilisant les patterns Epic 8.

### D8 — Pièces jointes et preuves (P3)

Si les PJ natives ne sont pas disponibles, toute exigence de preuve repose au minimum sur une **référence structurée** (référence externe, identifiant, texte) jusqu’à livraison PJ.

## Conséquences

- Les stories Epic 24 doivent **cartographier les écarts** avant de coder large : endpoints, modèles, UI Peintre, permissions.  
- Les migrations SQL et les nouveaux droits passent par la gouvernance habituelle (pas de permission fantôme côté UI).  
- Les tests doivent couvrir **nominal + expert + rejet Paheko** sur au moins un cas par famille P0.

## Alternatives non retenues

- **Second rail comptable ou export Paheko parallèle** (fichiers, scripts, API ad hoc hors outbox) — écarte l’idempotence et la corrélation Epic 8 ; rejeté.
- **Remboursement « free » comme moyen effectif** — déjà exclu par les schémas API ; maintien du principe D3.
- **Tags métier comme modules CREOS lourds séparés** — doublonnerait le flux ticket ; rejeté au profit de D5.

## Révision et invalidation

Rouvrir cet ADR si : changement du **contrat** snapshot → builder → outbox ; introduction d’un **nouveau canal** Paheko non couvert par le builder unique ; ou **décision produit** de réintroduire un mode agrégé / une écriture hors journal (nécessite alors **correct course** et mise à jour de `cash-accounting-paheko-canonical-chain.md`). Les ajustements **strictement UI** ou **permissions** sans changement de chaîne financière peuvent rester documentés au niveau stories Epic 24 sans révision ADR.

## Références croisées

- `references/operations-speciales-recyclique/index.md`  
- `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md`  
- Epic 24 — `_bmad-output/planning-artifacts/epics.md`
