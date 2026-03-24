# EPIC-B48: Améliorations Opérationnelles v1.3.2

**Statut:** Draft  
**Module:** Backend API + Frontend Admin + Frontend Opérationnel  
**Priorité:** Haute (urgences opérationnelles)
**Version:** 1.3.2

---

## 1. Contexte

Cette version 1.3.2 regroupe 3 améliorations critiques identifiées lors de la réunion RecycClique du 5 décembre 2025 :

1. **Soft Delete des Catégories** : Permettre l'archivage des catégories sans perte de données historiques (débloque Olive)
2. **Logs Transactionnels** : Mise en place d'une sonde de monitoring pour détecter le bug "tickets fantômes"
3. **Sorties de Stock depuis Réception** : Permettre de déclarer des sorties (Recyclage/Déchetterie) directement depuis l'écran réception

Ces 3 stories sont indépendantes et peuvent être développées en parallèle.

---

## 2. Objectif de l'Epic

Finaliser la version 1.3.2 avec les améliorations opérationnelles urgentes pour débloquer l'équipe terrain et améliorer la traçabilité du système.

**Valeur ajoutée :**
- Intégrité des données historiques préservée (catégories archivées)
- Capacité de débogage améliorée (logs transactionnels)
- Comptabilité matière complète (sorties depuis réception)

---

## 3. Portée

**Inclus dans cet epic :**

### Story B48-P1 : Soft Delete des Catégories
- Migration DB : Ajout colonne `deleted_at` sur table `categories`
- Backend : Logique Soft Delete (UPDATE au lieu de DELETE)
- Frontend Admin : Toggle "Afficher archivés" + bouton Restaurer
- Frontend Opérationnel : Filtrer catégories inactives dans sélecteurs
- Stats/Dashboard : Afficher toutes les catégories (actives + désactivées)

### Story B48-P2 : Logs Transactionnels
- Backend : Logger dédié `transaction_audit` (fichier rotatif)
- Points de capture : Ouverture session, création ticket, reset, validation paiement, anomalies
- Format JSON structuré pour analyse post-mortem

### Story B48-P3 : Sorties de Stock depuis Réception
- Migration DB : Ajout colonne `is_exit` (Boolean) sur table `ligne_depot`
- Backend : Modifier `_calculate_weight_in()` et `_calculate_weight_out()` pour filtrer selon `is_exit`
- Frontend Réception : Checkbox "Sortie de stock" + filtrage destinations dynamique
- Destination par défaut : RECYCLAGE si `is_exit=true`

### Story B48-P4 : Refonte UX Page Gestion Catégories Admin
- Frontend Admin : Unification des deux volets (Gestion + Visibilité)
- Amélioration ergonomie : Réorganisation manuelle, boutons accessibles
- Intégration Soft Delete : Toggle "Afficher archivés", restauration
- **Dépendance** : B48-P1 (Soft Delete) doit être terminée
- **Pré-requis** : Recommandations UI/UX de l'agent BMAD

### Story B48-P5 : Double Dénomination des Catégories
- Migration DB : Ajout colonne `display_name` (nullable) sur table `categories`
- Backend : Helper function `get_display_name()` avec fallback sur `name`
- Frontend Admin : Champ "Nom d'affichage" dans formulaire catégories
- Frontend Opérationnel : Boutons affichent `display_name` (ou `name` si NULL)
- Tooltips pédagogiques : Afficher `name` (dénomination complète) au survol
- Comptabilité : Stats/exports utilisent `name` (dénomination complète officielle)

### Story B48-P6 : Correction Affichage Poids Pages Admin
- Frontend Admin : Ajouter 4 KPIs distincts dans détail ticket (total, entré boutique, recyclé direct, sortie boutique)
- Frontend Admin : Ajouter colonne "Type" avec badges visuels dans tableau lignes
- Frontend Admin : Remplacer KPIs liste sessions par 4 cartes distinctes
- Frontend Admin : Ajouter colonne "Répartition" dans tableau sessions
- Frontend Admin : Vérifier dashboard affiche poids reçu/sorti corrects
- **Dépendance** : B48-P3 (Sorties Stock) doit être terminée

### Story B48-P7 : Unification Endpoints Stats Live
- Backend : Créer endpoint unifié `/v1/stats/live` (remplace 2 endpoints)
- Backend : Unifier période sur journée complète (minuit-minuit) pour tous
- Backend : Service unifié `ReceptionLiveStatsService` pour toutes les stats
- Frontend : Modifier hooks `useCashLiveStats` et `useReceptionKPILiveStats` pour utiliser endpoint unifié
- **Dépendance** : B48-P3 (Sorties Stock) doit être terminée

**Exclus (hors scope v1.3.2) :**
- Script de détection d'anomalies avec email (peut être fait séparément)
- Module éco-organismes (attente décision métier)

---

## 4. Critères d'acceptation de l'Epic

1. **Soft Delete fonctionnel** : Les catégories peuvent être archivées sans perte de données historiques
2. **Logs opérationnels** : Tous les événements transactionnels sont loggés dans un fichier dédié
3. **Sorties réception** : Les sorties de stock peuvent être déclarées depuis l'écran réception
4. **Double dénomination** : Nom d'affichage court sur boutons, nom complet officiel pour comptabilité
5. **Affichage poids admin** : Pages admin affichent répartition détaillée (entrée/sortie/recyclage)
6. **Stats unifiées** : Un seul endpoint stats avec période cohérente (journée complète)
7. **Interface catégories améliorée** : Page admin unifiée et ergonomique (si P4 incluse dans v1.3.2)
8. **Aucune régression** : Les fonctionnalités existantes restent intactes
9. **Tests complets** : Toutes les stories ont des tests unitaires et d'intégration
10. **Documentation** : Guide utilisateur pour les nouvelles fonctionnalités

---

## 5. Structure des Données

### Modifications Schema DB

**Table `categories` :**
- Ajout colonne `deleted_at` (Timestamp, Nullable)
- Si `deleted_at IS NULL` → Catégorie active
- Si `deleted_at IS NOT NULL` → Catégorie archivée
- Ajout colonne `display_name` (String, Nullable)
- `name` : Dénomination complète officielle (obligatoire)
- `display_name` : Dénomination rapide pour affichage (optionnel, fallback sur `name` si NULL)

**Table `ligne_depot` :**
- Ajout colonne `is_exit` (Boolean, default=False)
- Si `is_exit=true` → Poids compte dans `weight_out`
- Si `is_exit=false` → Poids compte dans `weight_in`

---

## 6. Stories (Ordre d'exécution)

### Story B48-P1 : Soft Delete des Catégories
**Objectif** : Permettre l'archivage des catégories sans perte de données historiques

**Estimation** : 4-6h  
**Prérequis** : Aucun

---

### Story B48-P2 : Logs Transactionnels
**Objectif** : Mise en place d'une sonde de monitoring pour détecter le bug "tickets fantômes"

**Estimation** : 3-4h  
**Prérequis** : Aucun

---

### Story B48-P3 : Sorties de Stock depuis Réception
**Objectif** : Permettre de déclarer des sorties (Recyclage/Déchetterie) directement depuis l'écran réception

**Estimation** : 3-5h  
**Prérequis** : Aucun

---

### Story B48-P4 : Refonte UX Page Gestion Catégories Admin
**Objectif** : Unifier et améliorer l'interface de gestion des catégories (deux volets → interface cohérente)

**Estimation** : 5-8h (à confirmer après recommandations UI/UX)  
**Prérequis** : B48-P1 (Soft Delete) terminée + Recommandations UI/UX de l'agent BMAD

---

### Story B48-P5 : Double Dénomination des Catégories
**Objectif** : Permettre un nom d'affichage court (ex: "Bricot") distinct du nom complet officiel (ex: "Articles de bricolage")

**Estimation** : 3-4h  
**Prérequis** : Aucun (peut être développée en parallèle)

---

### Story B48-P6 : Correction Affichage Poids Pages Admin
**Objectif** : Afficher la répartition détaillée des poids (entrée boutique, recyclage direct, sortie boutique) dans les pages admin

**Estimation** : 2-3h  
**Prérequis** : B48-P3 (Sorties Stock) terminée

---

### Story B48-P7 : Unification Endpoints Stats Live
**Objectif** : Unifier les deux endpoints stats en un seul endpoint avec période cohérente (journée complète)

**Estimation** : 4-5h  
**Prérequis** : B48-P3 (Sorties Stock) terminée

**Note** : Les stories P1, P2, P3, P5 peuvent être développées en parallèle. P4 doit attendre P1 et les recommandations UI/UX. P6 et P7 doivent attendre P3.

---

## 7. Risques

1. **Migration DB** : Risque de perte de données si migration mal exécutée
   - *Mitigation* : Sauvegarde obligatoire avant migration, tests sur environnement de dev

2. **Performance logs** : Risque de ralentissement si logs synchrones
   - *Mitigation* : Logger de façon asynchrone, rotation automatique des fichiers

3. **Comptabilité matière** : Risque d'incohérence si calculs mal modifiés
   - *Mitigation* : Tests unitaires complets sur les méthodes de calcul, validation manuelle

**Rollback Plan :**
- Migrations réversibles (Alembic down)
- Possibilité de désactiver les logs si problème
- Flag `is_exit` peut être ignoré si besoin (comportement par défaut)

---

## 8. Compatibilité

- [x] Existing APIs remain unchanged (nouveaux endpoints/champs uniquement)
- [x] Database schema changes are backward compatible (colonnes nullable)
- [x] UI changes follow existing patterns (nouveaux contrôles dans interfaces existantes)
- [x] Performance impact is minimal (logs asynchrones, index sur deleted_at)

---

## 9. Dépendances

- **Système de catégories existant** : Utilisation des modèles `Category` avec hiérarchie
- **Système de réception existant** : Utilisation des modèles `LigneDepot`, `TicketDepot`
- **Système de stats existant** : Utilisation de `ReceptionLiveStatsService`

---

## 10. Definition of Done

- [ ] Toutes les migrations DB appliquées et testées
- [ ] Soft Delete fonctionnel (archivage + restauration)
- [ ] Logs transactionnels opérationnels (fichier rotatif)
- [ ] Sorties stock depuis réception fonctionnelles
- [ ] Double dénomination catégories fonctionnelle (display_name + name)
- [ ] Pages admin affichent répartition poids détaillée (P6)
- [ ] Endpoint stats unifié fonctionnel avec période cohérente (P7)
- [ ] Interface catégories refondue (si P4 incluse dans v1.3.2)
- [ ] Tests unitaires et d'intégration passent
- [ ] Aucune régression sur les fonctionnalités existantes
- [ ] Documentation utilisateur créée
- [ ] Code review validé
- [ ] Déploiement en staging validé

---

## 11. Notes Techniques

### Soft Delete Catégories
- **Hiérarchie** : Si catégorie parente a des enfants actifs, empêcher la désactivation avec message d'erreur
- **Champs** : Garder `is_active` ET ajouter `deleted_at` (flexibilité)
- **Restauration** : Bouton accessible via édition de l'item (pas dans liste)

### Logs Transactionnels
- **Format JSON** : Structure standardisée pour faciliter l'analyse
- **Rotation** : Taille max 10MB, 5 fichiers max (configurable)
- **Performance** : Logger de façon asynchrone pour ne pas ralentir les opérations
- **Moments de capture** : `openSession()` ET premier `addSaleItem()` si panier non vide

### Sorties Stock Réception
- **Compteurs décorrélés** : `weight_in` et `weight_out` sont calculés à la volée depuis les tables
- **Modification calculs** : Filtrer selon `is_exit` dans `_calculate_weight_in()` et `_calculate_weight_out()`
- **Destination par défaut** : RECYCLAGE si `is_exit=true`

### Double Dénomination Catégories
- **Champ `name`** : Dénomination complète officielle (obligatoire, utilisé pour comptabilité/exports)
- **Champ `display_name`** : Dénomination rapide pour affichage (optionnel, fallback sur `name` si NULL)
- **Affichage opérationnel** : Boutons caisse/réception utilisent `display_name` (ou `name` si NULL)
- **Tooltips pédagogiques** : Afficher `name` (dénomination complète) au survol
- **Comptabilité** : Tous les exports/stats utilisent `name` pour conformité éco-organismes

### Correction Affichage Poids Pages Admin (P6)
- **Calculs frontend** : Agréger depuis données `ticket.lignes` (pas besoin d'API supplémentaire)
- **4 métriques** : Total traité, entré boutique, recyclé direct, sortie boutique
- **Badges visuels** : Distinction claire entre types de lignes (couleurs différentes)

### Unification Endpoints Stats Live (P7)
- **Endpoint unifié** : `/v1/stats/live` remplace `/v1/reception/stats/live` et `/v1/cash-sessions/stats/summary`
- **Période standardisée** : Journée complète (minuit-minuit) pour tous
- **Service unifié** : `ReceptionLiveStatsService` pour toutes les stats (caisse + réception)
- **Rétrocompatibilité** : Anciens endpoints marqués comme dépréciés (période transition)

---

## 12. Handoff Story Manager

"Veuillez développer les user stories détaillées pour cet epic brownfield. Considérations clés :

- Système existant : Recyclic (Python/FastAPI + React/TypeScript + PostgreSQL)
- Points d'intégration : `CategoryService`, `ReceptionService`, `ReceptionLiveStatsService`
- Patterns existants : Services avec repositories, endpoints REST, pages admin React
- Exigences de compatibilité : Migrations additives uniquement, pas de breaking changes
- Chaque story doit inclure la vérification que les fonctionnalités existantes restent intactes

L'epic doit maintenir l'intégrité du système tout en ajoutant les fonctionnalités opérationnelles urgentes pour la v1.3.2."

