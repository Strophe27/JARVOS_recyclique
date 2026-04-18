# Epic B51: Stabilisation caisse réelle v1.4.2 (tickets, horodatage, catégories)

**Statut:** Done ✅  
**Version:** v1.4.2  
**Date de fin:** 2025-12-17  
**Date de début:** 2025-12-16  
**Module:** Caisse réelle (Frontend + Backend API)  
**Priorité:** Haute (bugs en production)  
**Auteur:** BMad Orchestrator  

---

## 1. Contexte

Cet epic regroupe plusieurs **bugs de production** observés sur la **caisse réelle** (magasin physique) en version 1.4.2 :

- Impossibilité de finaliser certains tickets ne contenant **qu’un don**  
- Horodatage qui semble identique pour plusieurs encaissements dans la journée  
- Erreurs récurrentes de **chargement des catégories** (souvent perçues comme “problème réseau”)  

Les symptômes ont été constatés **en conditions réelles** par les équipes en boutique, et ne sont pas directement reproductibles à partir de l’environnement Docker local sans investigation ciblée côté production (logs VPS, données réelles).

---

## 2. Objectif

Stabiliser la caisse réelle en production sur la version 1.4.2 en :

- Rendant fiable la finalisation des tickets, y compris lorsqu’ils ne contiennent qu’un don  
- Garantissant un **horodatage cohérent** et exploitable des encaissements  
- Fiabilisant le **chargement des catégories** côté front, avec une UX claire en cas de vrai problème réseau  

L’objectif est que les équipes terrain puissent utiliser la caisse sans blocage, et que les données collectées (horodatage, catégories) restent fiables pour l’analyse ultérieure.

---

## 3. Portée

**Inclus dans cet Epic :**

- Caisse réelle (UI + API) en environnement de production  
- Tickets et encaissements réels (pas de données de démo)  
- Séquence complète : création ticket → ajout lignes (dont dons) → finalisation → persistance  
- Affichage et stockage de l’horodatage des encaissements  
- Chargement et affichage des catégories dans l’interface de caisse (réelle uniquement)  

**Exclus (hors scope immédiat) :**

- Caisses virtuelles et différées (ciblées par d’autres stories existantes, ex. B49/B50)  
- Refactorings lourds du framework de caisse (Epic B49)  
- Evolution fonctionnelle majeure (ici, focus sur **stabilisation / bugfix**)

---

## 4. Critères d’acceptation de l’Epic

1. **Finalisation tickets** :  
   - Un ticket contenant **un seul don** peut être finalisé sans erreur  
   - Les tickets contenant plusieurs dons ou un mix dons/ventes continuent de fonctionner correctement  

2. **Horodatage encaissements** :  
   - Les encaissements de la journée présentent des **dates/heures distinctes et cohérentes** avec l’ordre réel des opérations  
   - L’horodatage utilisé pour les exports / rapports est aligné avec ce qui est affiché en UI  

3. **Chargement des catégories** :  
   - Le chargement des catégories en caisse réelle est **fiable** en conditions normales  
   - En cas de véritable problème réseau ou serveur, l’UI affiche un message explicite et une action possible (ex. “Réessayer”)  

4. **Investigation + traçabilité** :  
   - Pour chaque bug, une **story d’investigation** documente clairement les causes identifiées (côté front, API, DB, infra réseau…)  
   - Les commandes utilisées côté VPS (logs, requêtes en lecture seule) sont documentées pour être réutilisables  

5. **Tests & validation** :  
   - Des tests (unitaires, intégration, voire E2E ciblés) couvrent les régressions associées  
   - Une validation manuelle est effectuée **en caisse réelle** avec les identifiants de test fournis  

---

## 5. Stories

### Story B51-P1: Bug ticket avec un seul don – finalisation impossible

**Statut:** Done ✅  
**Priorité:** P0 (Bug critique caisse réelle)  
**QA Score:** 95/100  
**Objectif** : Investiguer et corriger le blocage de finalisation lorsqu'un ticket ne contient qu'un don.  

**Référence** : `docs/stories/story-b51-p1-bug-ticket-un-don.md`

---

### Story B51-P2: Bug horodatage encaissements – même date/heure

**Statut:** Done ✅  
**Priorité:** P1  
**QA Score:** 95/100  
**Objectif** : Comprendre et corriger les problèmes d'horodatage (encaissements affichés avec la même heure/date).  

**Référence** : `docs/stories/story-b51-p2-bug-horodatage-encaissements.md`

---

### Story B51-P3: Bug chargement catégories – erreurs récurrentes en caisse réelle

**Statut:** Done ✅  
**Priorité:** P1  
**Objectif** : Investiguer et fiabiliser le chargement des catégories en caisse réelle, en distinguant les vrais problèmes réseau des bugs applicatifs.  

**Référence** : `docs/stories/story-b51-p3-bug-chargement-categories-caisse-reelle.md`

---

### Story B51-P4: Bug articles ajoutés en dehors d'un ticket (tickets fantômes) – investigation

**Statut:** Done ✅  
**Priorité:** P1  
**Objectif** : Investiguer pourquoi et comment des articles peuvent être ajoutés au panier en dehors d'un ticket (sans qu'un ticket soit explicitement ouvert). Comprendre le mécanisme d'ouverture de ticket, analyser les données de production, et proposer une solution.  

**Référence** : `docs/stories/story-b51-p4-bug-articles-ajoutes-caisse-fermee.md`

**Note** : Cette story est une **story d'investigation** (complétée). Le fix est dans B51-P5.

---

### Story B51-P5: Fix bloquer ajout d'articles en dehors d'un ticket (tickets fantômes)

**Statut:** Done ✅  
**Priorité:** P0 (Bug critique en production - 5 cas réels détectés)  
**QA Score:** 95/100  
**Objectif** : Bloquer l'ajout d'articles au panier si aucun ticket n'est explicitement ouvert (`ticketOpenedLogged = false`), pour corriger le bug "tickets fantômes" identifié en production.  

**Référence** : `docs/stories/story-b51-p5-fix-bloquer-articles-hors-ticket.md`

**Dépendance** : B51-P4 (investigation complétée)

---

## 6. Dépendances & Notes d’implémentation

- Cet epic s’inscrit dans le **projet brownfield Recyclic** et doit rester aligné avec :
  - le PRD et la documentation produit principale (voir `docs/prd.md` et les annexes brownfield associées),
  - l’architecture cible décrite dans `docs/architecture/architecture.md`,
  - les guides d’exécution / runbooks, en particulier :
    - `docs/runbooks/dev-workflow-guide.md`,
    - `docs/testing-strategy.md`,
    - `api/testing-guide.md`,
    - `frontend/testing-guide.md`.

- **Toutes les stories sont terminées :**
  - ✅ B51-P1 : Blocage finalisation ticket 1 don - **CORRIGÉ**
  - ✅ B51-P2 : Horodatage encaissements - **CORRIGÉ**
  - ✅ B51-P3 : Chargement catégories - **CORRIGÉ**
  - ✅ B51-P4 : Investigation tickets fantômes - **COMPLÉTÉE**
  - ✅ B51-P5 : Fix tickets fantômes - **CORRIGÉ**  

- Les agents DEV devront pouvoir se connecter à l’interface avec :  
  - **Login** : `admintest`  
  - **Password** : `AdminTest1!`  

- Toute investigation en production doit se faire **en lecture seule** côté base de données, et en s’appuyant sur :
  - Logs applicatifs (service API / frontend)  
  - Éventuels logs reverse-proxy (Nginx/Traefik)  

---

## 7. Estimation Globale

- B51-P1: 5–8 points (investigation + fix + validation en caisse réelle)  
- B51-P2: 5–8 points (investigation backend/front + correction + tests)  
- B51-P3: 5–8 points (investigation infra/API/UI + correction + UX erreur)  
- B51-P4: 3–5 points (investigation uniquement, complétée)  
- B51-P5: 3–5 points (fix bug critique "tickets fantômes" - 5 cas réels en production)  

**Total Epic (ordre de grandeur)** : 21–34 points  


