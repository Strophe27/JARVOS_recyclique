# Intégration Scripts dans Workflow BMAD

**Date :** 2025-12-06  
**Statut :** ✅ Intégration complète

---

## ✅ Intégration Complète

Tous les scripts Python sont maintenant **intégrés dans le workflow BMAD** et **découvrables par les agents**.

### 1. Workflow YAML

Le workflow `.bmad-core/workflows/meeting-transcription.yaml` référence les étapes qui utilisent les scripts :

- **transcription** : Utilise `aai_transcribe.py`
- **prepare_segments** : Utilise `prepare_segments.py`
- **analysis** : Utilise `summarize_segments.py` et `build_threads.py`
- **validation** : Utilise `inverse_validation.py`
- **synthesis** : Utilise `generate_meeting_report.py`
- **closure** : Utilise `verify_and_close.py`

### 2. Tasks BMAD

Toutes les tasks qui utilisent des scripts référencent maintenant explicitement les chemins :

| Task | Script | Chemin |
|------|--------|--------|
| `transcribe_aai.md` | `aai_transcribe.py` | `scripts/meeting-transcription/aai_transcribe.py` |
| `prepare_segments.md` | `prepare_segments.py` | `scripts/meeting-transcription/prepare_segments.py` |
| `summarize_segments.md` | `summarize_segments.py` | `scripts/meeting-transcription/summarize_segments.py` |
| `build_threads.md` | `build_threads.py` | `scripts/meeting-transcription/build_threads.py` |
| `inverse_validation.md` | `inverse_validation.py` | `scripts/meeting-transcription/inverse_validation.py` |
| `generate_meeting_report.md` | `generate_meeting_report.py` | `scripts/meeting-transcription/generate_meeting_report.py` |
| `verify_artifacts_consistency.md` | `verify_and_close.py` | `scripts/meeting-transcription/verify_and_close.py` |

### 3. Découvrabilité par les Agents

Les agents BMAD peuvent découvrir les scripts de plusieurs façons :

#### A. Via les Tasks

Chaque task contient maintenant :
- Une section **"Script disponible"** avec le chemin exact
- Une section **"Alternative : Exécuter le script"** avec la commande complète

Exemple dans `prepare_segments.md` :
```markdown
**Script disponible :** `scripts/meeting-transcription/prepare_segments.py`

**Alternative : Exécuter le script**
```bash
python scripts/meeting-transcription/prepare_segments.py <meeting-id>
```
```

#### B. Via le Workflow YAML

Le workflow YAML mentionne les scripts dans les notes de chaque étape :
```yaml
notes: |
  Dev lance le script aai_transcribe.py pour uploader les fichiers vers AssemblyAI
```

#### C. Via la Documentation

- `scripts/meeting-transcription/README.md` : Documentation complète des scripts
- `docs/meeting-transcription/scripts-reutilisabilite.md` : Analyse de réutilisabilité
- `docs/meeting-transcription/scripts-validation.md` : Validation et corrections

---

## 🔍 Comment un Agent Orchestrator Vierge Trouve les Scripts

### Scénario : Agent Orchestrator activé pour la première fois

1. **Activation de l'agent**
   - L'agent lit sa définition dans `.bmad-core/agents/bmad-orchestrator.md`
   - L'agent comprend qu'il doit suivre les workflows BMAD

2. **Découverte du workflow**
   - L'utilisateur demande : "Lance le workflow meeting-transcription"
   - L'agent charge `.bmad-core/workflows/meeting-transcription.yaml`

3. **Découverte des tasks**
   - Pour chaque étape, l'agent charge la task correspondante
   - Exemple : étape `transcription` → charge `.bmad-core/tasks/transcribe_aai.md`

4. **Découverte du script**
   - Dans la task `transcribe_aai.md`, l'agent lit :
     ```
     Script `scripts/meeting-transcription/aai_transcribe.py` existe
     ```
   - L'agent vérifie que le fichier existe
   - L'agent exécute la commande :
     ```bash
     python scripts/meeting-transcription/aai_transcribe.py --meeting-id <meeting-id>
     ```

### Exemple Concret

**Agent Dev** lors de l'étape `transcription` :

1. Charge `.bmad-core/tasks/transcribe_aai.md`
2. Lit la section "Script disponible"
3. Vérifie que `scripts/meeting-transcription/aai_transcribe.py` existe
4. Exécute le script avec les paramètres appropriés
5. Vérifie les résultats selon les critères de la task

---

## 📋 Checklist d'Intégration

- ✅ **Workflow YAML** : Référence les étapes qui utilisent les scripts
- ✅ **Tasks BMAD** : Toutes les tasks référencent les scripts avec chemins complets
- ✅ **Chemins scripts** : Tous les chemins pointent vers `scripts/meeting-transcription/`
- ✅ **Documentation** : README.md dans le dossier scripts
- ✅ **Validation** : Scripts testés et validés
- ✅ **Config.json** : Tous les scripts utilisent config.json pour la généricité

---

## 🎯 Résultat

**Un agent orchestrator vierge saura automatiquement :**

1. ✅ Trouver le workflow `meeting-transcription`
2. ✅ Charger les tasks correspondantes
3. ✅ Découvrir les scripts via les références dans les tasks
4. ✅ Exécuter les scripts avec les bons paramètres
5. ✅ Vérifier les résultats selon les critères définis

**Aucune configuration manuelle nécessaire !**

---

**Document créé le :** 2025-12-06  
**Auteur :** BMad Analyst

