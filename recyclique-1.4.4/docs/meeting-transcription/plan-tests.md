# Plan de Tests - Meeting Transcription

**Version :** 1.0  
**Workflow :** meeting-transcription  
**Date :** 2025-01-27

---

## Checklist par Étape

### Étape 1 : Setup (Orchestrator)

- [ ] **T1.1** - Création structure dossiers
  - [ ] Dossier `meetings/<meeting-id>/` créé
  - [ ] Tous les sous-dossiers créés (audio, transcriptions, working, final)
  - [ ] Fichiers `.gitkeep` créés dans dossiers vides
  - [ ] Format meeting-id valide (YYYY-MM-DD-nom)

- [ ] **T1.2** - Invite copie fichiers audio
  - [ ] Chemin affiché correctement
  - [ ] Invite utilisateur claire
  - [ ] Attente confirmation fonctionne

- [ ] **T1.3** - Validation présence fichiers
  - [ ] Détection fichiers audio fonctionne
  - [ ] Vérification taille fichiers (non vides)
  - [ ] Message d'erreur si aucun fichier
  - [ ] Liste fichiers affichée correctement

---

### Étape 2 : Transcription (Dev)

- [ ] **T2.1** - Script AssemblyAI
  - [ ] Script `aai_transcribe.py` existe
  - [ ] Upload fichiers vers AssemblyAI fonctionne
  - [ ] Paramètres transcription corrects (fr, diarisation, IAB)
  - [ ] Poll status avec retries fonctionne
  - [ ] Récupération JSON fonctionne

- [ ] **T2.2** - Gestion erreurs
  - [ ] Retry automatique sur erreurs temporaires (429, 503)
  - [ ] Notification utilisateur sur erreurs définitives (400, 401)
  - [ ] Logs générés correctement

- [ ] **T2.3** - Validation résultats
  - [ ] Tous les fichiers audio transcrits
  - [ ] Fichiers JSON valides
  - [ ] Structure JSON correcte (utterances, speakers, text)

---

### Étape 3 : Préparation Lots (SM)

- [ ] **T3.1** - Découpage segments
  - [ ] Lecture fichiers JSON fonctionne
  - [ ] Consolidation transcriptions fonctionne
  - [ ] Découpage 5 min avec overlap 30s fonctionne
  - [ ] Fichiers segments créés correctement
  - [ ] Format Markdown segments correct

- [ ] **T3.2** - Calcul métriques
  - [ ] Calcul tokens fonctionne
  - [ ] Calcul taille/durée fonctionne
  - [ ] Détection overlap fonctionne
  - [ ] Index JSON créé correctement
  - [ ] Structure index.json valide

---

### Étape 4 : Analyse (Analyst)

- [ ] **T4.1** - Résumé segments
  - [ ] Lecture index et segments fonctionne
  - [ ] Appel LLM avec prompt Analyst fonctionne
  - [ ] Résumés structurés générés correctement
  - [ ] Toutes les sections présentes (points, décisions, actions, etc.)
  - [ ] Tags générés (3-5 par segment)
  - [ ] Tableau chronologique présent

- [ ] **T4.2** - Agrégation threads
  - [ ] Détection sujets récurrents fonctionne
  - [ ] Groupement par tags fonctionne
  - [ ] Fichier threads.md créé correctement
  - [ ] Évolution des sujets décrite correctement

---

### Étape 5 : Validation (QA)

- [ ] **T5.1** - Validation inverse
  - [ ] Lecture résumés et threads fonctionne
  - [ ] Comparaison avec transcriptions fonctionne
  - [ ] Détection incohérences fonctionne
  - [ ] Détection oublis fonctionne
  - [ ] Détection divergences fonctionne
  - [ ] Rapport validation généré correctement
  - [ ] Score de validation calculé

---

### Étape 6 : Synthèse (PM)

- [ ] **T6.1** - Génération CR final
  - [ ] Lecture résumés, threads, index fonctionne
  - [ ] Extraction métadonnées fonctionne (date, participants, durée)
  - [ ] Détection ordre du jour fonctionne
  - [ ] Consolidation décisions/actions fonctionne
  - [ ] Élimination redites fonctionne
  - [ ] Compte-rendu structuré généré correctement
  - [ ] Toutes les sections présentes (ordre du jour, sujets, etc.)

---

### Étape 7 : Clôture (PO)

- [ ] **T7.1** - Vérification cohérence
  - [ ] Vérification structure dossiers fonctionne
  - [ ] Vérification métadonnées fonctionne
  - [ ] Vérification chemins fonctionne
  - [ ] Vérification complétude fonctionne
  - [ ] Rapport de vérification généré

- [ ] **T7.2** - Clôture et archivage
  - [ ] Affichage résumé final fonctionne
  - [ ] Demande validation utilisateur fonctionne
  - [ ] Archivage optionnel fonctionne (si demandé)
  - [ ] Confirmation clôture affichée

---

## Tests d'Intégration

- [ ] **TI.1** - Workflow complet
  - [ ] Exécution complète du workflow sans erreur
  - [ ] Tous les handoffs fonctionnent
  - [ ] Tous les fichiers produits correctement
  - [ ] Compte-rendu final exploitable

- [ ] **TI.2** - Gestion erreurs
  - [ ] Erreur API AssemblyAI gérée correctement
  - [ ] Retry automatique fonctionne
  - [ ] Notification utilisateur fonctionne
  - [ ] Reprise workflow possible

- [ ] **TI.3** - Données réelles
  - [ ] Test avec vraie réunion (4 fichiers audio)
  - [ ] Transcription correcte
  - [ ] Résumés de qualité
  - [ ] Compte-rendu final complet

---

## Tests de Performance

- [ ] **TP.1** - Temps traitement
  - [ ] Transcription < 10 min par fichier 1h
  - [ ] Traitement total < 30 min pour réunion 1h (4 fichiers)

- [ ] **TP.2** - Taille segments
  - [ ] Segments 5-10 min de transcription
  - [ ] Overlap 30s préservé

---

## Tests de Qualité

- [ ] **TQ.1** - Qualité transcription
  - [ ] > 95% des fichiers transcrits avec succès
  - [ ] > 90% des speakers correctement identifiés

- [ ] **TQ.2** - Qualité résumés
  - [ ] Résumés structurés et complets
  - [ ] Tags cohérents et réutilisables
  - [ ] Décisions/actions extraites correctement

- [ ] **TQ.3** - Qualité validation
  - [ ] > 80% des incohérences majeures détectées
  - [ ] Rapport validation clair et actionnable

- [ ] **TQ.4** - Qualité CR final
  - [ ] Compte-rendu complet et exploitable
  - [ ] Structure dynamique correcte
  - [ ] Pas de redites

---

## Critères de Succès

- ✅ Tous les tests unitaires passent
- ✅ Workflow complet exécutable sans erreur
- ✅ Compte-rendu final de qualité exploitable
- ✅ Temps traitement < 30 min pour réunion 1h
- ✅ Taux transcription > 95%
- ✅ Taux détection incohérences > 80%

---

**Fin du Plan de Tests**





