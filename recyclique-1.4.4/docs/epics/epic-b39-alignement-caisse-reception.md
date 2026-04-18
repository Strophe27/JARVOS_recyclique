# Epic: Caisse - Alignement UX sur Réception

**ID:** EPIC-B39-CAISSE-ALIGN-RECEPTION  
**Titre:** Harmonisation du workflow Caisse avec les patterns Réception  
**Thème:** Caisse / Expérience utilisateur  
**Statut:** Proposition  
**Priorité:** P1 (Critique)

---

## 1. Objectif de l'Epic

Mettre le workflow de caisse au même niveau d'ergonomie que la Réception : même logique de navigation, mêmes raccourcis clavier AZERTY, focus intelligents et possibilités d’édition immédiate des prix, tout en corrigeant le mode paiement « Chèque » qui engendre des erreurs de caisse liées aux dons.

## 2. Description

La Réception bénéficie déjà d’un parcours guidé (fil d’Ariane, tab order maîtrisé, raccourcis) qui manque cruellement à la caisse. Les opérateurs souhaitaient un comportement identique pour réduire la friction et éviter les erreurs de saisie (prix non éditables, focus sur le mauvais champ). Cet epic impose une phase d’étude du module Réception pour en dériver les patterns, puis décline ces patterns sur la caisse. Enfin, il sécurise le mode chèque en le calquant sur le workflow espèces – sans champ monnaie à rendre – afin d’éliminer les écarts comptables.

## 3. Stories de l'Epic (ordre imposé)

1. **STORY-B39-P1 – Audit UX de la Réception (Analyse transverse)**  
   - Cartographier navigation, raccourcis, focus et validations existants en Réception.  
   - Dégager les principes (ordre des champs, mapping clavier, feedback visuel).  
   - Produire une note d’alignement partagée avec PO/Design.

2. **STORY-B39-P2 – Alignement du fil d’Ariane & Tab Order**  
   - Réorganiser l’ordre des champs de la caisse pour suivre la séquence Réception.  
   - Implémenter la navigation Tab/Shift+Tab en conséquence.  
   - Vérifier accessibilité (focus visible, annonces ARIA si présentes en Réception).

3. **STORY-B39-P3 – Raccourcis clavier AZERTY style Réception**  
   - Reprendre exactement les mêmes combinaisons `&é"'(-è...` pour les actions caisse.  
   - Documenter la liste et l’afficher via tooltip comme en Réception.  
   - Couverture de tests navigateur (Playwright) pour prévenir régressions.

4. **STORY-B39-P4 – Focus intelligent et édition directe des prix**  
   - Focus initial automatique sur le champ Prix (même logique Réception).  
   - Autoriser l’édition immédiate des prix même lorsqu’un prix catalogue est défini.  
   - Gérer la restauration du focus après ajout de ligne/article.

5. **STORY-B39-P5 – Quantité minimum = 1 (validation légère)**  
   - Pré-remplir le champ quantité à 1 et empêcher 0 ou vide.  
   - Messages d’erreur cohérents avec Réception.  
   - Tests unitaires de validation.

6. **STORY-B39-P6 – Correction du mode paiement « Chèque »**  
   - Phase d’étude obligatoire du fonctionnement actuel (don, total caisse).  
   - Remplacer le flux par celui des espèces (prix + don éditables) tout en masquant « Monnaie à rendre ».  
   - Ajouter scenarios de test QA reproduisant l’ancienne erreur.  
   - Aucun changement de schéma base de données.

## 4. Compatibilité & Contraintes

- Aucun changement de base de données.  
- Les raccourcis ne doivent pas impacter les combinaisons globales du navigateur.  
- Le mode offline doit conserver le focus/tab order même hors ligne.  
- Les scripts d’onboarding existants référencent l’ancien workflow : prévoir un changelog PO.

## 5. Definition of Done

- [ ] Rapport d’analyse Réception validé par PO.  
- [ ] Le parcours caisse reproduit fidèlement l’expérience Réception.  
- [ ] Les opérateurs peuvent éditer un prix fixe sans étape supplémentaire.  
- [ ] Le mode paiement chèque n’induit plus d’erreur liée aux dons.  
- [ ] Les raccourcis clavier sont documentés dans l’app et sur Confluence/docs.  
- [ ] Tests Playwright/Unitaires couvrent navigation, focus et mode chèque.



