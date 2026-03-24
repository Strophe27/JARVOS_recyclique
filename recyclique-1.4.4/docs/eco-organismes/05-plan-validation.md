# Plan de Validation - Phase 1

## Objectif de la Phase

Valider la documentation produite en phase ÉTUDES avec toutes les parties prenantes pour s'assurer de l'alignement technique, fonctionnel et métier avant de passer au développement.

**Durée estimée** : 1-2 semaines
**Statut** : 📋 À PLANIFIER

---

## Parties Prenantes

### 1. Équipe Technique

#### Développeurs Backend
**Rôle** : Valider le modèle de données et l'architecture technique

**Documents à réviser** :
- [02-modele-donnees.md](02-modele-donnees.md) - Priorité HAUTE
- [03-specifications-fonctionnelles.md](03-specifications-fonctionnelles.md) - Section API

**Points de validation** :
- [ ] Structure des entités cohérente avec l'architecture existante ?
- [ ] Relations entre tables optimales ?
- [ ] Index et contraintes pertinents ?
- [ ] Triggers et automatismes performants ?
- [ ] Stratégie de migration compatible avec Alembic actuel ?
- [ ] Nommage des tables/colonnes conforme aux conventions du projet ?
- [ ] Gestion des UUID vs. ID auto-incrémentés ?

**Questions à poser** :
1. Utilise-t-on PostgreSQL ou autre SGBD ?
2. Quelle version de SQLAlchemy ?
3. Y a-t-il des patterns existants pour les triggers (Python ou SQL) ?
4. Comment sont gérées les migrations en production actuellement ?
5. Existe-t-il déjà des vues matérialisées dans le projet ?

#### Développeurs Frontend
**Rôle** : Valider les maquettes et les workflows UI

**Documents à réviser** :
- [03-specifications-fonctionnelles.md](03-specifications-fonctionnelles.md) - Maquettes et workflows

**Points de validation** :
- [ ] Maquettes ASCII suffisamment détaillées pour prototyper ?
- [ ] Workflow de déclaration en 4 étapes ergonomique ?
- [ ] Composants réutilisables identifiés ?
- [ ] Gestion d'état (state management) nécessaire ?
- [ ] Formulaires complexes (mapping, déclarations) faisables ?
- [ ] API endpoints suffisants pour toutes les interactions UI ?

**Questions à poser** :
1. Utilise-t-on React, Vue, Angular ?
2. Framework UI/CSS ? (Material-UI, Ant Design, Tailwind...)
3. Gestion d'état : Redux, Zustand, Context API ?
4. Bibliothèques de graphiques existantes ?
5. Pattern de formulaires complexes existant ?

#### Architecte/Tech Lead
**Rôle** : Validation globale de l'architecture et impacts système

**Documents à réviser** :
- Tous les documents techniques

**Points de validation** :
- [ ] Architecture proposée s'intègre bien avec l'existant ?
- [ ] Pas de risques de couplage fort ?
- [ ] Performance anticipée acceptable (agrégations, calculs) ?
- [ ] Stratégie de cache pertinente ?
- [ ] Sécurité et permissions cohérentes ?
- [ ] Stratégie de tests définie ?
- [ ] Observabilité (logs, monitoring) prévue ?

**Questions à poser** :
1. Y a-t-il une architecture en microservices ou monolithe ?
2. Utilise-t-on des workers asynchrones (Celery, RQ) ?
3. Redis disponible pour cache ?
4. Stratégie de déploiement (CI/CD, Docker, K8s) ?
5. Environnements (dev, staging, prod) ?

---

### 2. Équipe Métier / Opérationnelle

#### Responsable des Déclarations
**Rôle** : Valider la cohérence avec les processus réels eco-maison

**Documents à réviser** :
- [00-besoins-utilisateur.md](00-besoins-utilisateur.md)
- [01-fiche-eco-maison.md](01-fiche-eco-maison.md)
- [04-guide-mapping-categories.md](04-guide-mapping-categories.md)

**Points de validation** :
- [ ] Fiche eco-maison conforme aux documents officiels reçus ?
- [ ] Toutes les catégories présentes ?
- [ ] Soutiens financiers corrects (30€/t, 130€/t) ?
- [ ] Workflow de déclaration correspond au processus actuel ?
- [ ] Rien de manquant dans les besoins exprimés ?
- [ ] Cas particuliers identifiés couverts ?

**Questions à poser** :
1. Combien de déclarations eco-maison réalisées à ce jour ?
2. Quels sont les principaux points de friction actuels ?
3. Temps moyen pour compléter une déclaration manuellement ?
4. Quelles erreurs fréquentes dans les déclarations passées ?
5. Autres éco-organismes prévus à court terme ?

#### Équipe Terrain (Collecte/Vente)
**Rôle** : Valider le mapping des catégories et l'usage quotidien

**Documents à réviser** :
- [04-guide-mapping-categories.md](04-guide-mapping-categories.md)
- [03-specifications-fonctionnelles.md](03-specifications-fonctionnelles.md) - Section UI

**Points de validation** :
- [ ] Catégories RecyClique actuelles bien représentées ?
- [ ] Correspondances proposées font sens sur le terrain ?
- [ ] Cas ambigus (canapé-lit, mobilier jardin) bien traités ?
- [ ] Interface de saisie (étape 2) utilisable rapidement ?
- [ ] Vocabulaire utilisé clair et compréhensible ?

**Questions à poser** :
1. Quelles catégories RecyClique utilisez-vous le plus ?
2. Y a-t-il des objets difficiles à catégoriser actuellement ?
3. Comment sont enregistrées les pesées aujourd'hui ?
4. Fréquence de pesée : à chaque objet, par lot, quotidien ?
5. Accès à des balances certifiées ?

---

### 3. Équipe Finance/Comptabilité

#### Responsable Financier
**Rôle** : Valider le suivi des soutiens et l'intégration comptable

**Documents à réviser** :
- [00-besoins-utilisateur.md](00-besoins-utilisateur.md) - Section Suivi Financier
- [03-specifications-fonctionnelles.md](03-specifications-fonctionnelles.md) - Section Suivi Financier

**Points de validation** :
- [ ] Tracking des proforma suffisant ?
- [ ] Gestion des écarts de paiement claire ?
- [ ] Exports vers logiciel comptable possibles ?
- [ ] Réconciliation bancaire facilitée ?
- [ ] Reporting financier adapté aux besoins ?

**Questions à poser** :
1. Logiciel comptable utilisé (CEGID, SAGE, autre) ?
2. Format d'export attendu (CSV, ODS, API) ?
3. Fréquence de réconciliation des paiements ?
4. Comptes comptables spécifiques pour soutiens REP ?
5. Audit comptable annuel : quels justificatifs requis ?

---

### 4. Product Owner / Chef de Projet

**Rôle** : Validation globale alignement produit et priorisation

**Documents à réviser** :
- Tous les documents

**Points de validation** :
- [ ] Priorités de développement alignées avec roadmap produit ?
- [ ] MVP (Minimum Viable Product) bien défini ?
- [ ] Dépendances avec autres projets identifiées ?
- [ ] Budget et ressources disponibles ?
- [ ] Timeline réaliste ?

**Questions à poser** :
1. Date butoir pour mise en production ?
2. Prochaine déclaration eco-maison prévue quand ?
3. Autres projets en cours pouvant impacter ?
4. Ressources allouées (combien de devs, temps) ?
5. Critères de succès du projet ?

---

## Méthodologie de Validation

### Session 1 : Validation Technique (1 jour)

**Participants** : Équipe technique complète (backend, frontend, architecte)

**Format** : Réunion de travail 2-3h + revue asynchrone

**Agenda** :
1. **Présentation** (30 min)
   - Vue d'ensemble du module éco-organismes
   - Parcours rapide des 6 documents
   - Contexte métier (pourquoi ce projet)

2. **Deep Dive Modèle de Données** (45 min)
   - Présentation ERD
   - Discussion des relations
   - Questions/réponses sur les entités
   - Identification des points bloquants

3. **Deep Dive API & Frontend** (45 min)
   - Présentation des endpoints
   - Discussion des workflows UI
   - Faisabilité technique
   - Complexité des formulaires

4. **Actions** (30 min)
   - Liste des questions à clarifier
   - Identification des ajustements nécessaires
   - Attribution des tâches de revue asynchrone
   - Planning de la session de consolidation

**Livrables** :
- [ ] Document "Feedbacks Techniques" avec tous les commentaires
- [ ] Liste des points bloquants (si existants)
- [ ] Propositions d'ajustements techniques
- [ ] Timeline d'implémentation technique

---

### Session 2 : Validation Métier (1/2 jour)

**Participants** : Responsable déclarations, équipe terrain, finance

**Format** : Atelier collaboratif 2h

**Agenda** :
1. **Contexte** (15 min)
   - Rappel des objectifs du module
   - Gains attendus (temps gagné, précision, soutiens optimisés)

2. **Démonstration Guidée** (45 min)
   - Parcours du workflow de déclaration (slides/maquettes)
   - Explication du mapping de catégories
   - Présentation du suivi financier

3. **Atelier Mapping** (30 min)
   - Revue des correspondances catégories proposées
   - Identification des cas manquants ou incorrects
   - Ajustements en temps réel

4. **Collecte Feedback** (30 min)
   - Tour de table : points positifs / points à améliorer
   - Cas d'usage manquants ?
   - Processus non couverts ?

**Livrables** :
- [ ] Document "Feedbacks Métier"
- [ ] Liste des ajustements de mapping
- [ ] Cas d'usage complémentaires à documenter
- [ ] Validation métier GO/NO-GO

---

### Session 3 : Validation Transverse (1/2 jour)

**Participants** : Product Owner, Tech Lead, Responsable métier

**Format** : Comité de validation 1h30

**Agenda** :
1. **Synthèse des Feedbacks** (30 min)
   - Présentation consolidée feedbacks techniques
   - Présentation consolidée feedbacks métier
   - Identification des conflits éventuels

2. **Priorisation** (30 min)
   - Définition du périmètre MVP
   - Identification des fonctionnalités "nice-to-have"
   - Séquençage des sprints

3. **Décision** (30 min)
   - Validation GO/NO-GO pour phase suivante
   - Attribution des actions de correction de la doc
   - Planning des phases 2-3-4

**Livrables** :
- [ ] Compte-rendu de décision GO/NO-GO
- [ ] Liste des ajustements à apporter à la doc
- [ ] MVP clairement défini
- [ ] Planning détaillé phases 2-3-4

---

## Grille de Validation

### Critères de Validation Technique

| Critère | Poids | Évaluation | Commentaires |
|---------|-------|------------|--------------|
| Modèle de données cohérent | CRITIQUE | ⬜ OK ⬜ KO ⬜ À ajuster | |
| API endpoints complets | HAUTE | ⬜ OK ⬜ KO ⬜ À ajuster | |
| Performance anticipée acceptable | HAUTE | ⬜ OK ⬜ KO ⬜ À ajuster | |
| Intégration modules existants claire | CRITIQUE | ⬜ OK ⬜ KO ⬜ À ajuster | |
| Sécurité et permissions définies | HAUTE | ⬜ OK ⬜ KO ⬜ À ajuster | |
| Stratégie de tests identifiée | MOYENNE | ⬜ OK ⬜ KO ⬜ À ajuster | |
| Observabilité prévue | MOYENNE | ⬜ OK ⬜ KO ⬜ À ajuster | |
| Nommage et conventions respectés | BASSE | ⬜ OK ⬜ KO ⬜ À ajuster | |

**Seuil de validation** : Tous les critères CRITIQUES OK, max 1 critère HAUTE KO

---

### Critères de Validation Métier

| Critère | Poids | Évaluation | Commentaires |
|---------|-------|------------|--------------|
| Fiche eco-maison conforme | CRITIQUE | ⬜ OK ⬜ KO ⬜ À ajuster | |
| Workflow déclaration utilisable | CRITIQUE | ⬜ OK ⬜ KO ⬜ À ajuster | |
| Mapping catégories cohérent | HAUTE | ⬜ OK ⬜ KO ⬜ À ajuster | |
| Calcul automatique fiable | HAUTE | ⬜ OK ⬜ KO ⬜ À ajuster | |
| Suivi financier complet | HAUTE | ⬜ OK ⬜ KO ⬜ À ajuster | |
| Exports adaptés aux besoins | MOYENNE | ⬜ OK ⬜ KO ⬜ À ajuster | |
| Vocabulaire clair et compréhensible | BASSE | ⬜ OK ⬜ KO ⬜ À ajuster | |

**Seuil de validation** : Tous les critères CRITIQUES OK, max 1 critère HAUTE KO

---

## Plan d'Actions Post-Validation

### Si Validation Positive (GO)
1. **Ajustements mineurs** (2-3 jours)
   - Corrections de typos et clarifications
   - Ajouts de détails demandés
   - Mise à jour des documents

2. **Préparation Phase 2** (immédiat)
   - Lancement de l'analyse technique du codebase
   - Constitution de l'équipe d'audit
   - Préparation des environnements

3. **Communication** (1 jour)
   - Annonce GO à toute l'équipe
   - Présentation du planning phases 2-3-4
   - Attribution des responsabilités

### Si Validation Conditionnelle (GO avec réserves)
1. **Analyse des réserves** (1 jour)
   - Classification des réserves (bloquantes, importantes, mineures)
   - Évaluation de l'impact sur le planning
   - Identification des solutions

2. **Ajustements majeurs** (3-5 jours)
   - Refonte des sections concernées
   - Nouvelles analyses si nécessaire
   - Validation ciblée des ajustements

3. **Re-validation** (2 jours)
   - Session ciblée sur les points ajustés
   - Décision finale GO/NO-GO

### Si Validation Négative (NO-GO)
1. **Analyse des causes** (1 jour)
   - Identification des écarts entre attendu et proposé
   - Compréhension des besoins non couverts
   - Évaluation de la faisabilité globale

2. **Décision stratégique** (1 semaine)
   - Réorientation du projet ?
   - Réduction du périmètre ?
   - Report et complément d'études ?

3. **Nouvelle itération ÉTUDES** (2-3 semaines)
   - Reprise avec nouvelles contraintes
   - Approche alternative
   - Nouvelle validation

---

## Checklist de Préparation des Sessions

### Avant Session 1 (Technique)
- [ ] Envoyer documentation 1 semaine avant
- [ ] Créer espace de travail collaboratif (Google Docs, Notion, etc.)
- [ ] Préparer slides de présentation
- [ ] Générer diagrammes ERD visuels (depuis modèle textuel)
- [ ] Préparer environnement de démo (optionnel)
- [ ] Inviter tous les participants avec agenda clair
- [ ] Désigner un facilitateur/animateur
- [ ] Désigner un scribe (prise de notes)

### Avant Session 2 (Métier)
- [ ] Envoyer documentation vulgarisée (pas de code)
- [ ] Préparer slides non-techniques
- [ ] Créer maquettes visuelles (Figma, wireframes) depuis ASCII
- [ ] Préparer des cas concrets (ex: déclaration T1 2025 fictive)
- [ ] Imprimer guide de mapping pour atelier
- [ ] Préparer post-its et matériel collaboratif
- [ ] Inviter participants avec contexte clair
- [ ] Préparer FAQ anticipée

### Avant Session 3 (Validation finale)
- [ ] Consolider tous les feedbacks dans un document unique
- [ ] Classifier les feedbacks (bloquant, important, mineur)
- [ ] Préparer propositions de solutions pour chaque feedback
- [ ] Estimer l'impact de chaque ajustement (temps, complexité)
- [ ] Préparer scénarios de priorisation (MVP vs. version complète)
- [ ] Créer draft du planning phases 2-3-4
- [ ] Inviter décideurs avec pré-lecture des synthèses

---

## Outils Recommandés

### Collaboration Documentation
- **Google Docs** : Commentaires en ligne, suggestions
- **Notion** : Organisation hiérarchique, base de connaissances
- **Confluence** : Si existant dans l'entreprise
- **GitHub Issues** : Tracking des feedbacks techniques

### Présentation
- **Google Slides / PowerPoint** : Slides de présentation
- **Miro / Mural** : Ateliers collaboratifs, mapping
- **Figma** : Maquettes visuelles (phase prototypage)

### Diagrammes
- **dbdiagram.io** : ERD à partir du modèle textuel
- **draw.io** : Diagrammes d'architecture, workflows
- **Excalidraw** : Schémas collaboratifs en temps réel

### Gestion Projet
- **Trello / Asana / Jira** : Tracking des actions post-validation
- **Google Sheets** : Grilles de validation, suivi

---

## Risques et Mitigation

### Risque 1 : Disponibilité des participants
**Impact** : Sessions reportées, allongement de la phase
**Mitigation** :
- Identifier participants critiques en amont
- Prévoir dates alternatives dès la convocation
- Permettre validation asynchrone si absence (avec call de suivi)

### Risque 2 : Feedbacks contradictoires
**Impact** : Blocage, impossibilité de converger
**Mitigation** :
- Désigner un arbitre (Product Owner ou Tech Lead)
- Prioriser retours métier sur fonctionnel, technique sur architecture
- Session de médiation si nécessaire

### Risque 3 : Sous-estimation de la complexité
**Impact** : NO-GO ou nécessité de revoir le périmètre
**Mitigation** :
- Être transparent sur les incertitudes dès la présentation
- Proposer des alternatives (MVP réduit, phases progressives)
- Inclure buffer dans planning

### Risque 4 : Documentation trop technique pour métier
**Impact** : Validation métier superficielle, erreurs non détectées
**Mitigation** :
- Créer versions vulgarisées pour métier
- Utiliser maquettes visuelles plutôt que texte
- Prévoir démo interactive plutôt que lecture

---

## Livrables Finaux de Phase 1

À l'issue de cette phase de validation, les livrables suivants doivent être produits :

1. **📄 Compte-Rendu de Validation** (synthèse)
   - Décision GO/NO-GO/GO avec réserves
   - Synthèse des feedbacks (5-10 pages)
   - Liste des ajustements à apporter

2. **📊 Feedbacks Consolidés** (détail)
   - Feedbacks techniques (tous points relevés)
   - Feedbacks métier (tous points relevés)
   - Classification et priorisation

3. **✅ Grilles de Validation Complétées**
   - Grille technique remplie
   - Grille métier remplie
   - Calcul des scores

4. **📝 Documentation Ajustée** (v1.1)
   - Version mise à jour des 6 documents
   - Changelog des modifications
   - Nouvelles sections si nécessaire

5. **📅 Planning Phases 2-3-4** (détaillé)
   - Dates des jalons
   - Ressources allouées
   - Dépendances identifiées

6. **🎯 Définition du MVP**
   - Fonctionnalités incluses dans MVP
   - Fonctionnalités reportées en v2
   - Critères d'acceptation MVP

---

## Timeline Détaillée

```
Semaine 1
├─ Lundi : Envoi documentation + convocations
├─ Mardi-Jeudi : Revue asynchrone par participants
└─ Vendredi : Session 1 - Validation Technique

Semaine 2
├─ Lundi : Consolidation feedbacks techniques
├─ Mardi : Préparation session métier (maquettes visuelles)
├─ Mercredi : Session 2 - Validation Métier
├─ Jeudi : Consolidation feedbacks métier
└─ Vendredi : Session 3 - Validation Transverse + Décision GO/NO-GO

(Semaine 3 si ajustements : voir plan d'actions)
```

---

## Critères de Succès de la Phase 1

✅ **Validation obtenue** (GO ou GO avec réserves mineures)
✅ **Toutes les parties prenantes ont contribué** (taux de participation > 80%)
✅ **Feedbacks documentés** et classifiés
✅ **Ajustements identifiés** et planifiés
✅ **MVP défini** et accepté
✅ **Planning phases 2-3-4 validé** par PO et Tech Lead
✅ **Équipe alignée** et motivée pour la suite

---

**Prochaine étape** : [06-plan-analyse-technique.md](06-plan-analyse-technique.md) - Phase 2 d'Analyse Technique Approfondie
