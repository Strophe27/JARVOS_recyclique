# EPIC-B47: Import Legacy CSV & Template Offline

**Statut:** Done  
**Module:** Backend API + Frontend Admin + Ops  
**Priorité:** Moyenne (amélioration historique des données)

---

## 1. Contexte

Avant le déploiement de Recyclic, les réceptions étaient enregistrées manuellement dans un fichier CSV/Excel (`IMPORT_202509_ENTREES _ LaClique.csv`). Ce fichier contient environ 630 lignes de données historiques avec plusieurs problèmes :

- **Dates incohérentes** : Beaucoup de lignes sans date (lignes 3-106), dates répétées de manière sporadique, formats variés (`25/09/2025`, `27/sept`, `09/oct`)
- **Catégories non normalisées** : Variations et typos (`Vaisselle`, `VAISELLE`, `vaiselle`, `DEEE`, `D3E`, `deee`, `EEE`, `EEE PAM`)
- **Poids approximatifs** : Arrondis Excel (`0.569999...` au lieu de `0.57`)
- **Structure hétérogène** : Colonnes supplémentaires inutiles, notes à ignorer

**Besoin métier :**
1. Importer ces données historiques dans Recyclic pour avoir un historique complet
2. Créer un template CSV offline pour les cas où internet est en panne et qu'on doit saisir manuellement

---

## 2. Objectif de l'Epic

Mettre en place un **système d'import de données legacy** avec mapping intelligent des catégories et génération d'un **template CSV offline** standardisé pour les réceptions manuelles.

**Valeur ajoutée :**
- Historique complet des réceptions dans Recyclic
- Capacité de saisie offline en cas de panne réseau
- Normalisation et validation des données avant import

---

## 3. Portée

**Inclus dans cet epic :**

### Phase 1 : Nettoyage CSV Legacy
- Script Python de normalisation des dates (fill-down + répartition 17-20/09 pour orphelins)
- Arrondi des poids à 2 décimales
- Suppression des notes
- Production d'un CSV conforme au template offline

### Phase 2 : Import avec Mapping Intelligent
- Service d'import avec fuzzy matching (Levenshtein) pour les catégories
- Interface web de validation/correction manuelle du mapping
- Injection en base : création de `PosteReception`/`TicketDepot`/`LigneDepot` par jour
- Rapport d'import avec statistiques

### Phase 3 : Template Offline
- Génération du template CSV vierge basé sur la structure normalisée
- Documentation d'utilisation
- Endpoint API pour télécharger le template

**Exclus (hors scope immédiat) :**
- Import automatique récurrent (uniquement pour le CSV legacy historique)
- Gestion des conflits de dates (import séquentiel par date)

---

## 4. Critères d'acceptation de l'Epic

1. **Nettoyage réussi** : Le script produit un CSV valide avec toutes les dates normalisées (ISO 8601) et poids arrondis
2. **Mapping fiable** : 100% des catégories mappables avec validation manuelle possible
3. **Import complet** : Toutes les lignes valides importées en base avec création des sessions/tickets par jour
4. **Template utilisable** : CSV template offline téléchargeable et conforme à la structure `LigneDepot`
5. **Aucune régression** : Les fonctionnalités de réception existantes restent intactes
6. **Documentation** : Guide utilisateur pour l'import et l'utilisation du template offline

---

## 5. Structure des Données

### Modèle `LigneDepot` (existant)
- `ticket_id` (UUID) → référence `TicketDepot`
- `category_id` (UUID) → référence `Category`
- `poids_kg` (Numeric 8,3)
- `destination` (Enum: `MAGASIN`, `RECYCLAGE`, `DECHETERIE`)
- `notes` (String, nullable)

### Template CSV Offline
Colonnes requises :
- `date` (ISO 8601: `YYYY-MM-DD`) → pour créer le ticket par jour
- `category` (String) → nom de la catégorie (sera mappé vers `category_id` à l'import)
- `poids_kg` (Decimal, 2 décimales)
- `destination` (`MAGASIN`|`RECYCLAGE`|`DECHETERIE`)
- `notes` (String, optionnel)

---

## 6. Stories (Ordre d'exécution)

### Story B47-P1 : Script de Nettoyage CSV Legacy
**Objectif** : Normaliser le CSV legacy pour produire un fichier conforme au template offline

**Critères d'acceptation** :
- Script Python `scripts/clean_legacy_import.py`
- Normalisation des dates :
  - Lignes 3-106 (orphelines) : répartition uniforme entre 17-20/09/2025
  - Principe "fill-down" : une date s'applique à toutes les lignes suivantes jusqu'à la prochaine date
  - Conversion en ISO 8601 (`YYYY-MM-DD`)
- Arrondi des poids à 2 décimales
- Suppression de la colonne `Notes`
- Production de `IMPORT_202509_ENTREES_CLEANED.csv` conforme au template

**Estimation** : 3 points  
**Prérequis** : Aucun  
**Statut** : Done  
**Voir** : [Story B47-P1](../stories/story-b47-p1-script-nettoyage-csv-legacy.md)

---

### Story B47-P2 : Service d'Import avec Fuzzy Matching
**Objectif** : Créer le service backend d'import avec mapping intelligent des catégories

**Critères d'acceptation** :
- Service `LegacyImportService` avec :
  - Chargement des catégories depuis la base (`CategoryService`)
  - Fuzzy matching (Levenshtein) pour proposer des mappings
  - Génération d'un fichier JSON de mapping (`category_mapping.json`)
  - Validation des mappings (seuil de confiance configurable)
- Endpoint API `POST /api/v1/admin/import/legacy/analyze` :
  - Upload du CSV nettoyé
  - Analyse et proposition de mappings
  - Retourne les catégories non mappables
- Endpoint API `POST /api/v1/admin/import/legacy/execute` :
  - Upload du CSV + fichier de mapping validé
  - Création des `PosteReception` par jour (ou réutilisation)
  - Création des `TicketDepot` par jour
  - Création des `LigneDepot` avec catégories mappées
  - Destination par défaut : `MAGASIN` (ou configurable)
  - Rapport d'import avec statistiques

**Estimation** : 5 points  
**Prérequis** : B47-P1  
**Statut** : Done  
**Voir** : [Story B47-P2](../stories/story-b47-p2-service-import-fuzzy-matching.md)

---

### Story B47-P3 : Interface Web de Validation Mapping
**Objectif** : Créer l'interface admin pour valider/corriger les mappings de catégories

**Critères d'acceptation** :
- Page admin `/admin/import/legacy` :
  - Upload du CSV nettoyé
  - Affichage des propositions de mapping (fuzzy matching)
  - Indicateur de confiance pour chaque mapping
  - Possibilité de corriger manuellement les mappings
  - Liste des catégories non mappables avec possibilité de rejeter ou mapper vers "DIVERS"
  - Export du fichier de mapping validé (JSON)
- Bouton "Importer" qui appelle l'endpoint d'exécution
- Affichage du rapport d'import (succès/échecs, statistiques)

**Estimation** : 5 points  
**Prérequis** : B47-P2  
**Statut** : Done  
**Voir** : [Story B47-P3](../stories/story-b47-p3-interface-web-validation-mapping.md)

---

### Story B47-P4 : Template CSV Offline & Documentation
**Objectif** : Générer le template CSV offline et documenter son utilisation

**Critères d'acceptation** :
- Script de génération du template vierge `scripts/generate-offline-template.py`
- Template CSV avec en-têtes : `date`, `category`, `poids_kg`, `destination`, `notes`
- Endpoint API `GET /api/v1/admin/templates/reception-offline.csv`
- Documentation dans `docs/guides/template-offline-reception.md` :
  - Structure du template
  - Règles de saisie (dates, catégories, destinations)
  - Processus d'import après saisie offline
- Tests d'intégration : import d'un CSV généré depuis le template

**Estimation** : 3 points  
**Prérequis** : B47-P1  
**Statut** : Done  
**Voir** : [Story B47-P4](../stories/story-b47-p4-template-csv-offline-documentation.md)

---

### Story B47-P5 : Fallback LLM pour le mapping de catégories Legacy
**Objectif** : Intégrer un fallback LLM optionnel pour proposer des mappings supplémentaires sur les catégories non résolues par le fuzzy matching

**Critères d'acceptation** :
- Abstraction de client LLM (`LLMCategoryMappingClient`) avec implémentation OpenRouter
- Intégration dans `LegacyImportService.analyze()` avec batching (20-30 catégories par appel)
- Cache persistant des mappings LLM (`legacy_category_mapping_cache` table)
- Gestion d'erreurs best-effort (les erreurs LLM n'interrompent pas l'analyse)
- Configuration via variables d'environnement (`LEGACY_IMPORT_LLM_PROVIDER`, `LEGACY_IMPORT_LLM_MODEL`, etc.)
- Exposition de statistiques LLM dans la réponse `analyze` (`llm_mapped_categories`, `llm_provider_used`)
- Tests unitaires et d'intégration complets

**Estimation** : 8 points  
**Prérequis** : B47-P2, B47-P3  
**Statut** : Done  
**Voir** : [Story B47-P5](../stories/story-b47-p5-llm-fallback-legacy-import.md)

---

### Story B47-P6 : Amélioration UX LLM - Sélecteur de modèles et feedback utilisateur
**Objectif** : Améliorer l'expérience utilisateur autour du fallback LLM avec sélecteur de modèles dynamique, affichage des erreurs, et possibilité de relancer uniquement les catégories non mappées

**Critères d'acceptation** :
- ✅ Endpoint backend pour lister les modèles OpenRouter disponibles (`GET /api/v1/admin/import/legacy/llm-models`) avec cache 1h
- ✅ Sélecteur de modèles LLM en frontend avec filtrage gratuit/payant et badge "Gratuit"
- ✅ Affichage détaillé des erreurs et statistiques LLM (badges colorés vert/orange/rouge, Alert avec messages d'erreur)
- ✅ Endpoint backend pour relancer uniquement les catégories non mappées (`POST /api/v1/admin/import/legacy/analyze/llm-only`)
- ✅ Bouton "Relancer LLM" en frontend avec fusion intelligente des mappings (préservation des corrections manuelles)
- ✅ Workflow itératif permettant plusieurs runs d'analyse avant validation (alert de confirmation avant re-analyze)
- ✅ Enrichissement des statistiques LLM (batches réussis/échoués, confiance moyenne, dernière erreur, modèle utilisé)
- ✅ Barre de progression du mapping avec badges de couleur selon le nombre de catégories restantes
- ✅ Override du modèle LLM dans l'endpoint `analyze` via paramètre `llm_model_id`

**Estimation** : 8 points  
**Prérequis** : B47-P5  
**Statut** : Done  
**Voir** : [Story B47-P6](../stories/story-b47-p6-llm-ux-improvements.md)

**Fonctionnalités ajoutées** :
- Découverte dynamique des modèles OpenRouter (filtrage texte + json_object, identification des modèles gratuits)
- Sélection de modèle au moment de l'analyse (override de la config)
- Statistiques LLM enrichies : `llm_attempted`, `llm_model_used`, `llm_batches_total/succeeded/failed`, `llm_last_error`, `llm_avg_confidence`
- Relance ciblée LLM uniquement sur les catégories restantes (sans refaire le fuzzy matching)
- Workflow itératif avec alert de confirmation avant re-analyze complet
- Barre de progression visuelle du score de mapping (vert/orange/rouge selon nombre de catégories restantes)

---

### Story B47-P7 : Validation de Conformité CSV et Nettoyage Automatique
**Objectif** : Améliorer l'expérience utilisateur en validant automatiquement la conformité du CSV et en proposant un nettoyage automatique si nécessaire

**Critères d'acceptation** :
- Validation automatique de conformité du CSV (colonnes, format dates, poids, structure)
- Endpoint API `POST /api/v1/admin/import/legacy/clean` pour nettoyer le CSV côté serveur
- Interface frontend avec validation automatique et proposition de nettoyage si non conforme
- Réutilisation de la logique du script `clean_legacy_import.py` dans un service backend
- Rapport de validation détaillé avec liste des problèmes détectés
- Statistiques de nettoyage (lignes nettoyées, dates normalisées, etc.)

**Estimation** : 5 points  
**Prérequis** : B47-P1, B47-P2, B47-P3  
**Statut** : Draft  
**Voir** : [Story B47-P7](../stories/story-b47-p7-validation-conformite-nettoyage-automatique.md)

---

### Story B47-P8 : Correction Bug LLM-only et Ajout Sélecteur de Modèles dans Relance
**Objectif** : Corriger le bug Pydantic de l'endpoint LLM-only et permettre de changer de modèle lors de la relance LLM (catégories restantes ou toutes les catégories)

**Critères d'acceptation** :
- Correction du bug Pydantic : création d'un schéma `LLMOnlyStatistics` ou rendu optionnel des champs obligatoires
- Ajout du sélecteur de modèles LLM dans l'étape 2 (Mappings) avec case à cocher pour modèles gratuits
- Le modèle sélectionné dans l'étape 2 est utilisé pour les relances LLM
- Le modèle de l'étape 1 est préservé comme valeur par défaut dans l'étape 2
- Bouton "Relancer LLM pour toutes les catégories" permettant de relancer le LLM sur l'ensemble des catégories avec un autre modèle
- Fusion intelligente des mappings : préservation des corrections manuelles (confidence = 100)
- L'endpoint `/api/v1/admin/import/legacy/analyze/llm-only` fonctionne sans erreur

**Estimation** : 5 points  
**Prérequis** : B47-P6  
**Statut** : Draft  
**Voir** : [Story B47-P8](../stories/story-b47-p8-correction-bug-llm-only-selecteur-modeles.md)

---

### Story B47-P9 : Correction Bugs Mapping Manuel
**Objectif** : Corriger les bugs critiques du mapping manuel : catégories assignées manuellement non enregistrées et bouton "Continuer" toujours grisé

**Critères d'acceptation** :
- Correction du bug : les catégories assignées manuellement sont retirées de `unmapped` lors de l'assignation
- Correction du bug : les catégories rejetées sont retirées de `unmapped` et ajoutées à `rejectedCategories`
- Correction du bouton "Continuer" : s'active quand toutes les catégories sont assignées/rejetées (ou ≤ 5 restantes)
- Validation de l'export JSON : les catégories assignées manuellement ne doivent pas apparaître dans `unmapped`
- Les mappings manuels sont correctement enregistrés et pris en compte lors de l'import

**Estimation** : 3 points  
**Prérequis** : B47-P3  
**Statut** : Draft  
**Voir** : [Story B47-P9](../stories/story-b47-p9-correction-bugs-mapping-manuel.md)

---

### Story B47-P10 : Simplification Workflow et Récapitulatif Pré-Import
**Objectif** : Simplifier le workflow en supprimant l'étape export/import redondante et ajouter un récapitulatif visuel avant l'import

**Critères d'acceptation** :
- Suppression de l'étape export/import séparée (étape 4 supprimée)
- Nouvelle étape "Récapitulatif & Import" avec affichage :
  - Total général (lignes, kilos, dates, catégories)
  - Répartition par catégorie (tableau avec lignes et totaux kilos)
  - Répartition par date (optionnel)
  - Catégories non mappées (si présentes)
- Import direct depuis l'interface sans étape intermédiaire
- Option d'export du mapping (bouton optionnel dans l'étape 2, non obligatoire)
- Calcul du récapitulatif en parsant le CSV et appliquant les mappings validés

**Estimation** : 5 points  
**Prérequis** : B47-P3, B47-P9  
**Statut** : Ready for Review  
**Voir** : [Story B47-P10](../stories/story-b47-p10-simplification-workflow-recapitulatif-pre-import.md)

---

### Story B47-P11 : Sélection Date d'Import Manuelle
**Objectif** : Permettre à l'utilisateur de choisir une date d'import manuelle pour regrouper toutes les données sous une date unique

**Critères d'acceptation** :
- Sélecteur de date optionnel dans l'étape 3 (Récapitulatif & Import)
- Si une date est sélectionnée, toutes les données sont importées avec cette date unique (un seul poste/ticket)
- Si aucune date n'est sélectionnée, comportement actuel (un poste/ticket par date du CSV)
- Avertissement visuel quand une date d'import est sélectionnée
- Validation : la date ne peut pas être dans le futur

**Estimation** : 3 points  
**Prérequis** : B47-P10  
**Statut** : Draft  
**Voir** : [Story B47-P11](../stories/story-b47-p11-selection-date-import-manuelle.md)

---

## 7. Risques

1. **Mapping incorrect des catégories** → données corrompues en base
   - *Mitigation* : Validation manuelle obligatoire via interface web, logs détaillés, test sur échantillon avant import complet

2. **Dates orphelines mal réparties** → historique inexact
   - *Mitigation* : Répartition uniforme documentée, possibilité de corriger manuellement le CSV nettoyé

3. **Performance lors de l'import** → timeout ou lenteur
   - *Mitigation* : Import en batch par jour, transactions par ticket, indicateur de progression

4. **Conflits avec données existantes** → doublons
   - *Mitigation* : Vérification des dates avant import, possibilité de filtrer par période

**Rollback Plan :**
- Import dans une table temporaire d'abord (optionnel)
- Possibilité de supprimer les tickets créés par date via API admin
- Export de sauvegarde avant import (déjà en place via B46)

---

## 8. Compatibilité

- [x] Existing APIs remain unchanged (nouveaux endpoints uniquement)
- [x] Database schema changes are backward compatible (aucun changement de schéma)
- [x] UI changes follow existing patterns (nouvelle page admin)
- [x] Performance impact is minimal (import en batch, pas de charge sur les APIs existantes)

---

## 9. Dépendances

- **B46 (Import BDD)** : Les mécanismes de backup automatique sont déjà en place
- **Système de réception existant** : Utilisation des modèles `PosteReception`, `TicketDepot`, `LigneDepot`
- **Système de catégories** : Utilisation de `CategoryService` pour le mapping

---

## 10. Definition of Done

- [x] Script de nettoyage produit un CSV valide conforme au template (B47-P1)
- [x] Service d'import avec fuzzy matching fonctionnel (B47-P2)
- [x] Interface web de validation/correction opérationnelle (B47-P3)
- [x] Import testé sur échantillon avec validation utilisateur (B47-P2, P3)
- [x] Template CSV offline généré et documenté (B47-P4)
- [x] Tests unitaires et d'intégration passent (Toutes les stories)
- [x] Documentation utilisateur créée (B47-P4)
- [x] Aucune régression sur les fonctionnalités de réception existantes (Validé via tests)
- [x] Code review validé (Toutes les stories reviewées par QA)
- [x] Déploiement en staging validé (Stories P1-P6 toutes en Done)

---

## 11. Notes Techniques

### Mapping des Catégories
- **Fuzzy Matching** : Utilisation de `python-Levenshtein` ou `fuzzywuzzy` avec seuil de confiance (ex: 80%)
- **Fallback manuel** : Interface web pour corriger les mappings non fiables
- **Catégories non mappables** : Option de rejet ou mapping vers catégorie "DIVERS" (si existe)

### Structure d'Import
- **Par jour** : Un `PosteReception` par jour (ou réutilisation si existe)
- **Par jour** : Un `TicketDepot` par jour avec `benevole_user_id` = utilisateur admin qui importe
- **Par ligne** : Une `LigneDepot` par ligne du CSV avec mapping validé

### Destination par Défaut
- Valeur par défaut : `MAGASIN` (configurable dans le service)
- Possibilité d'ajouter une colonne `destination` dans le CSV legacy si disponible

---

## 12. Handoff Story Manager

"Veuillez développer les user stories détaillées pour cet epic brownfield. Considérations clés :

- Système existant : Recyclic (Python/FastAPI + React/TypeScript + PostgreSQL)
- Points d'intégration : `ReceptionService`, `CategoryService`, modèles `PosteReception`/`TicketDepot`/`LigneDepot`
- Patterns existants : Services avec repositories, endpoints REST, pages admin React
- Exigences de compatibilité : Aucun changement de schéma DB, nouveaux endpoints uniquement
- Chaque story doit inclure la vérification que les fonctionnalités de réception existantes restent intactes

L'epic doit maintenir l'intégrité du système tout en permettant l'import des données historiques et la création d'un template offline."

