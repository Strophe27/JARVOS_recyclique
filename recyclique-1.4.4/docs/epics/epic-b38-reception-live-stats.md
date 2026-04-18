# Epic: Réception - Horodatage & Statistiques Temps Réel

**ID:** EPIC-B38-RECEPTION-LIVE-STATS  
**Titre:** Réception – Horodatage lisible et KPI temps réel  
**Thème:** Réception / Pilotage opérationnel  
**Statut:** Completed  
**Priorité:** P1 (Critique)

---

## 1. Objectif de l'Epic

Offrir aux responsables de la réception une visualisation instantanée de l'activité en ajoutant des horodatages lisibles sur chaque ticket ouvert/fermé et en basculant les KPI (CA, poids, dons, nombre de tickets) sur un mode temps réel reposant sur les tickets ouverts et tout juste clôturés.

## 2. Description

Le module Réception affiche aujourd'hui des données rafraîchies uniquement lors de la fermeture des tickets ou de la caisse, ce qui fausse le pilotage. Cet epic introduit un pipeline de lecture temps réel branché sur les tickets en cours et récemment fermés, ainsi qu'un formatage homogène des dates et heures dans les listes. L'interface Admin devra consommer ces nouvelles données en continu tout en respectant les performances existantes.

## 3. Stories de l'Epic (ordre imposé)

1. **STORY-B38-P1 – Horodatage lisible dans les listes de tickets (Frontend)**  
   - Ajouter les colonnes Date Ouverture / Date Fermeture avec un format 24h clair (`JJ/MM/AAAA HH:mm`).  
   - Aucun changement base de données : utiliser les champs existants.  
   - Harmoniser l'affichage avec le module Réception V2.

2. **STORY-B38-P2 – Calcul des KPI temps réel (Backend/API)**  
   - Refonte du calcul afin de s'appuyer sur les tickets ouverts + fermés < 24h.  
   - Fournir une API `GET /reception/stats/live` exposant CA, dons, poids, nombre de tickets.  
   - Garantir la compatibilité des anciens endpoints (feature flag).

3. **STORY-B38-P3 – Rafraîchissement continu des KPI (Frontend Admin)**  
   - Consommer l'API live via polling léger (ex: 10s) ou WebSocket si disponible.  
   - Mettre à jour l'afficheur Admin (CA / Poids) en temps réel avec indicateurs visuels.  
   - Prévoir un fallback manuel si le flux temps réel échoue.

## 4. Compatibilité & Contraintes

- Aucun schéma de base de données modifié (lecture seule).  
- Doit respecter les performances des vues Admin (pas de surcharge CPU).  
- Mode offline inchangé : si la connexion tombe, les données récentes déjà affichées restent visibles.

## 5. Definition of Done

- [ ] Les 3 stories sont livrées et testées (frontend + backend).  
- [ ] Les tickets affichent clairement leur date d'ouverture/fermeture.  
- [ ] Les KPI Admin reflètent les tickets ouverts/fermés en temps réel (<10s).  
- [ ] Aucun recalcul n'est nécessaire lors de la fermeture de caisse.  
- [ ] La documentation Admin/PO est mise à jour (guide Réception).  
- [ ] Les pipelines de données historiques restent compatibles (exports Ecologic).

