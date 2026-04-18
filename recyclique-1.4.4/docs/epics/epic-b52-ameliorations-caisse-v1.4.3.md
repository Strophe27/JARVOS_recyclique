# Epic B52: Améliorations Caisse v1.4.3

**Statut:** Draft  
**Version:** v1.4.3  
**Date de début:** 2025-01-XX  
**Module:** Caisse (Frontend + Backend API)  
**Priorité:** Haute (améliorations fonctionnelles demandées)  
**Auteur:** BMad Orchestrator  

---

## 1. Contexte

Cet epic regroupe plusieurs **améliorations fonctionnelles** demandées pour la version 1.4.3 de la caisse :

- **Paiements multiples** : Permettre plusieurs moyens de paiement (ex. espèces + chèques) lors d'un même encaissement
- **Édition du poids** : Modifier le poids a posteriori dans les sessions de vente et réception, avec mise à jour des statistiques
- **Bug date des tickets** : Corriger le problème où tous les tickets ont la date d'ouverture de session au lieu de la date d'enregistrement
- **Éditeur d'item** : Améliorer l'éditeur d'item pour s'assurer que l'édition de la destination (preset) fonctionne correctement
- **Édition du prix** : Permettre l'édition du prix dans l'éditeur d'item (administrateur uniquement)

Ces améliorations répondent à des besoins réels exprimés par les équipes en boutique lors de l'utilisation quotidienne de la caisse.

---

## 2. Objectif

Améliorer l'expérience utilisateur et la flexibilité de la caisse en version 1.4.3 en :

- Permettant les **paiements multiples** pour gérer les cas où un client paie avec plusieurs moyens (ex. espèces + chèques)
- Permettant la **correction du poids** après validation pour corriger les erreurs de saisie (ex. 960 kg au lieu de 960 g)
- Corrigeant le **bug de date des tickets** pour afficher correctement la date réelle du ticket vs la date d'enregistrement
- Améliorant l'**éditeur d'item** pour garantir que toutes les fonctionnalités d'édition (destination/preset, prix) sont accessibles
- Ajoutant la **traçabilité complète** des modifications (poids, prix) via logs d'audit

L'objectif est que les équipes terrain puissent utiliser la caisse avec plus de flexibilité et corriger les erreurs sans impact sur les statistiques.

---

## 3. Portée

**Inclus dans cet Epic :**

- Caisse réelle et virtuelle (UI + API)
- Sessions de vente (cash sessions)
- Sessions de réception (reception sessions)
- Écran de paiement et finalisation
- Éditeur d'item dans les tickets
- Statistiques et calculs de poids (live et historiques)
- Système d'audit et traçabilité

**Exclus (hors scope immédiat) :**

- Module paiement complet (virement, etc.) - à faire plus tard
- Points cosmétiques/terminologie - à traiter après les fonctionnalités principales
- Refactorings lourds du framework de caisse

---

## 4. Critères d'acceptation de l'Epic

1. **Paiements multiples** :  
   - Un encaissement peut être divisé entre plusieurs moyens de paiement (ex. espèces + chèques)
   - L'interface permet d'ajouter des paiements séquentiellement jusqu'à couvrir le total
   - Le reste dû est affiché en temps réel
   - Tous les paiements sont tracés dans le système

2. **Édition du poids** :  
   - Un administrateur peut modifier le poids d'un item après validation (sessions de vente et réception)
   - Les statistiques sont automatiquement recalculées après modification
   - Pas de limite de temps pour la modification
   - Les modifications sont tracées dans les logs d'audit

3. **Bug date des tickets** :  
   - Les tickets affichent la date réelle du ticket (date du cahier/journal) et la date d'enregistrement séparément
   - Pour les sessions normales : date réelle = date d'enregistrement
   - Pour les sessions différées : date réelle = date du cahier, date d'enregistrement = date de saisie
   - L'affichage dans l'interface est clair et non ambigu

4. **Éditeur d'item** :  
   - L'édition de la destination (preset) fonctionne correctement dans l'éditeur d'item
   - L'utilisateur peut **changer la destination** et **la retirer** (bouton « Aucun ») avec persistance correcte
   - L'édition du prix est disponible pour les administrateurs uniquement
   - Toutes les modifications critiques (prix) sont tracées dans les logs d'audit

5. **Traçabilité** :  
   - Toutes les modifications (poids, prix) sont loguées avec : ancienne valeur, nouvelle valeur, utilisateur, timestamp
   - Les logs d'audit sont consultables via l'interface d'administration

---

## 5. Stories

### Story B52-P1: Paiements multiples à l'encaissement

**Statut:** Ready for Dev  
**Priorité:** P1  
**Objectif** : Permettre plusieurs moyens de paiement (ex. espèces + chèques) lors d'un même encaissement avec approche séquentielle.

**Référence** : `docs/stories/story-b52-p1-paiements-multiples.md`

---

### Story B52-P2: Édition du poids après validation

**Statut:** Ready for Dev  
**Priorité:** P1  
**Objectif** : Permettre à un administrateur de modifier le poids d'un item après validation, avec recalcul automatique des statistiques.

**Référence** : `docs/stories/story-b52-p2-edition-poids.md`

---

### Story B52-P3: Correction bug date des tickets (sale_date)

**Statut:** Ready for Dev  
**Priorité:** P0 (Bug critique)  
**Objectif** : Corriger le bug où tous les tickets ont la date d'ouverture de session au lieu de la date d'enregistrement, en ajoutant un champ `sale_date` pour distinguer date réelle et date d'enregistrement.

**Référence** : `docs/stories/story-b52-p3-bug-date-tickets.md`

---

### Story B52-P4: Amélioration éditeur d'item (destination et prix)

**Statut:** Ready for Dev  
**Priorité:** P1  
**Objectif** : S'assurer que l'édition de la destination (preset) fonctionne correctement et ajouter l'édition du prix pour les administrateurs.

**Référence** : `docs/stories/story-b52-p4-editeur-item-destination-prix.md`

---

### Story B52-P5: Améliorations cosmétiques et terminologie

**Statut:** Ready for Dev  
**Priorité:** P2  
**Objectif** : Clarifier la terminologie dans l'interface (dashboard, détail session, analyse rapide) et ajouter des métriques manquantes.

**Référence** : `docs/stories/story-b52-p5-ameliorations-cosmetiques-terminologie.md`

---

### Story B52-P6: Poids par session de caisse et par panier

**Statut:** Draft  
**Priorité:** P2  
**Objectif** : Afficher le poids réellement sorti sur une session de caisse et le poids total par panier dans le journal des ventes.

**Référence** : `docs/stories/story-b52-p6-poids-par-session-et-par-panier.md`

## 6. Dépendances & Notes d'implémentation

- Cet epic s'inscrit dans le **projet brownfield Recyclic** et doit rester aligné avec :
  - le PRD et la documentation produit principale (voir `docs/prd.md`),
  - l'architecture cible décrite dans `docs/architecture/architecture.md`,
  - les guides d'exécution / runbooks.

- **Ordre de priorité des stories** :
  - B52-P3 (Bug date) : P0 - à traiter en premier
  - B52-P1 (Paiements multiples) : P1
  - B52-P2 (Édition poids) : P1
  - B52-P4 (Éditeur item) : P1
  - B52-P5 (Cosmétiques/terminologie) : P2 - à traiter après les fonctionnalités principales

- **Migration de base de données** :
  - Story B52-P3 nécessite une migration pour ajouter le champ `sale_date` à la table `sales`
  - Les données existantes doivent être migrées (sale_date = created_at pour les ventes existantes)

- **Impact sur les statistiques** :
  - Story B52-P2 nécessite un service de recalcul des statistiques après modification de poids
  - Les statistiques live (24h) et mensuelles doivent être recalculées

---

## 7. Estimation Globale

- B52-P1: 8–13 points (UI paiements multiples + backend + tests)
- B52-P2: 8–13 points (édition poids + recalcul stats + tests)
- B52-P3: 5–8 points (migration DB + correction logique + tests)
- B52-P4: 3–5 points (audit éditeur + améliorations UX + tests)
- B52-P5: 3–5 points (modifications terminologie + nouvelles métriques + tests)

**Total Epic (ordre de grandeur)** : 27–44 points

---

## 8. Risques & Mitigation

**Risque Principal** : Impact sur les statistiques existantes lors de la modification de poids

**Mitigation** : 
- Service de recalcul optimisé (uniquement les statistiques affectées)
- Tests de régression complets sur les statistiques
- Validation manuelle avec données réelles

**Plan de Rollback** : 
- Les modifications de poids peuvent être désactivées via feature flag si nécessaire
- Les migrations de base de données sont réversibles

---

## 9. Definition of Done

- [ ] Toutes les stories sont terminées avec critères d'acceptation validés
- [ ] Tests unitaires, intégration et E2E couvrent les nouvelles fonctionnalités
- [ ] Tests de régression validés (pas de régression sur fonctionnalités existantes)
- [ ] Documentation mise à jour (guides utilisateur si nécessaire)
- [ ] Logs d'audit fonctionnels et consultables
- [ ] Validation manuelle effectuée en caisse réelle
- [ ] Migration de base de données testée et validée (B52-P3)

