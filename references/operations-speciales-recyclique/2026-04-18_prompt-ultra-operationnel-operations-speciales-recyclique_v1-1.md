> **Emplacement :** `references/operations-speciales-recyclique/2026-04-18_prompt-ultra-operationnel-operations-speciales-recyclique_v1-1.md` — ventilé le 2026-04-18 depuis `references/_depot/prompt_agent_ultra_operationnel_recyclique_v1_1.md`. À utiliser avec le PRD du même dossier (`2026-04-18_prd-recyclique-operations-speciales-sorties-matiere-paheko_v1-1.md`).

Tu travailles sur le dépôt Recyclique. Utilise le document PRD joint/intitulé "PRD — Recyclique Caisse : opérations spéciales, sorties matière et intégration Paheko" comme source de vérité produit initiale, puis complète-la en lisant le dépôt réel avant toute implémentation.

Mission :
Créer les documents, stories, plan d'exécution et implémentations nécessaires pour livrer le périmètre des opérations spéciales de caisse et des tags métier, en respectant l'architecture existante du dépôt.

Règles impératives :
1. Ne réinvente pas une architecture parallèle si le dépôt contient déjà un socle réutilisable.
2. Vérifie systématiquement ce qui existe déjà côté API, UI, permissions, modèles, tests et intégration Paheko.
3. Quand le PRD donne une règle produit ferme et que le dépôt est en contradiction, signale l'écart et aligne la cible sur le PRD, sauf impossibilité technique majeure explicitement démontrée.
4. Les comptes comptables exacts restent paramétrables ; ne les fige pas en dur si le dépôt prévoit du paramétrage expert.
5. Les remboursements doivent être ventilés par moyen effectif de remboursement côté chaîne comptable Paheko.
6. Le remboursement exceptionnel sans ticket doit être un parcours expert distinct avec PIN responsable et justification forte.
7. Les gratuités, dons solidaires, gratiférias et tags similaires doivent être traités dans le ticket standard via tags métier, pas comme de gros parcours spéciaux.
8. Toute opération N3 doit distinguer initiateur et validateur.
9. Si les pièces jointes natives ne sont pas encore supportées, une référence de preuve textuelle structurée est obligatoire pour les opérations qui l'exigent.
10. Les échanges avec différence doivent réutiliser les sous-flux vente/remboursement existants.
11. Toute opération financière doit exposer un état de synchronisation Paheko visible.

Ce que tu dois faire, dans cet ordre :

A. Audit repo-aware
- Lire le dépôt et dresser l'état réel de ce qui existe déjà pour :
  - annulation
  - remboursement
  - remboursement N-1
  - remboursement exceptionnel sans ticket
  - décaissement
  - mouvement interne
  - échange
  - tags métier / tickets 0 €
  - permissions
  - step-up PIN
  - outbox / Paheko
- Produire une table "prévu dans le PRD / existe déjà / manque / à adapter".
- Produire aussi une table "permission / acteur / niveau de preuve / initiateur / validateur".

B. Découpage BMAD / stories
- Découper le périmètre en stories exécutable dans cet ordre prioritaire :
  - P0 : hub opérations spéciales + remboursement standard visible + ventilation Paheko remboursement + N-1 + remboursement exceptionnel PIN
  - P1 : échange + décaissement + mouvement interne
  - P2 : tags métier sur tickets/lignes + reporting matière associé
  - P3 : pièces jointes, seuils riches, audit avancé
- Si tu utilises BMAD, crée les stories formellement.
- Si tu ne passes pas par BMAD complet, utilise quand même la discipline Story Runner : objectif, dépendances, fichiers, risques, tests, definition of done.

C. Production documentaire
- Produire ou compléter selon besoin :
  - PRD détaillé par sous-domaine si nécessaire
  - design technique par story
  - matrice permissions / validations / niveaux de preuve
  - machine d'états opérationnelle
  - plan de tests
  - stratégie Paheko / outbox / idempotence
  - matrice d'écart PRD ↔ dépôt

D. Livrables formels obligatoires
- Crée de vrais fichiers livrables et pas seulement une réponse textuelle.
- Produis au minimum :
  - un audit repo-aware,
  - un PRD détaillé si tu le raffines,
  - une matrice d'écart PRD ↔ dépôt,
  - une matrice permissions / niveaux de preuve,
  - une machine d'états opérationnelle,
  - un plan de tests,
  - et les stories ordonnées P0 → P3.

E. Implémentation
- Commencer par P0.
- Ne pas passer à la story suivante sans retour d'état clair sur la précédente.
- Après chaque story, donner :
  - ce qui a été modifié
  - ce qui est validé
  - ce qui reste ouvert
  - les tests exécutés
  - les fichiers modifiés

Contraintes fonctionnelles à respecter :
- Annulation : distincte du remboursement.
- Remboursement standard : ticket source obligatoire.
- Remboursement exceptionnel sans ticket : permission dédiée + step-up PIN responsable + motif codifié + justification texte obligatoire + idéalement pièce jointe/référence de preuve.
- Remboursements N-1 clos : parcours expert distinct.
- Décaissement : sous-types obligatoires, jamais catégorie poubelle.
- Mouvement interne : distinct d'une charge et d'un remboursement.
- Échange : toujours mouvement matière ; mouvement financier seulement si différence non nulle.
- Sorties gratuites : ticket standard à 0 € + tags métier.
- Tags : support niveau ticket et niveau ligne avec règle de surcharge claire.

Attendus techniques :
- Réutiliser les permissions, modèles et endpoints existants si possible.
- Créer les permissions manquantes proprement si nécessaire.
- Vérifier l'impact sur modèles, migrations, tests et UI.
- Vérifier la chaîne comptable jusqu'à Paheko, y compris snapshots, builders, outbox et idempotence.
- Prévoir des tests unitaires, intégration et e2e couvrant les cas nominaux et les cas experts.
- Prévoir les champs conceptuels nécessaires pour distinguer initiateur, validateur, preuve et statut de synchronisation.

Livrable initial que je veux dans ta première réponse :
1. audit repo-aware synthétique
2. proposition de stories ordonnées P0 → P3
3. risques principaux
4. recommandation d'ordre d'implémentation
5. liste des fichiers probables à inspecter en premier
6. démarrage immédiat par P0

Important :
- Pas de réponse vague.
- Pas de redites théoriques.
- Travaille à partir du dépôt réel.
- Si un point du PRD est déjà implémenté, dis-le avec précision.
- Si un point manque, dis exactement ce qu'il faut créer.
- Si tu identifies un arbitrage bloquant non résolu, formule-le explicitement au lieu de supposer.
