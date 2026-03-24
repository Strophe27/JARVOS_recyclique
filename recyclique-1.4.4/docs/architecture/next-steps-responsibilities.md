# Prochaines Étapes - Assignation des Responsabilités

**Date**: 2025-01-27  
**Contexte**: Suite à l'audit brownfield B45-P0 et mise à jour architecture v3.2

---

## Assignation des Tâches par Rôle BMAD

### 1. Mise à Jour PRD - Inclure Epic B45

**Responsable** : 📋 **John (PM - Product Manager)**

**Tâche** :
- Mettre à jour `docs/v1.3.0-active/prd.md` pour inclure l'Epic B45 (Audit Sessions Avancé)
- Ou créer un nouveau PRD dédié à l'audit si l'Epic B45 est considéré comme un module séparé

**Actions requises** :
1. Analyser l'Epic B45 : `docs/epics/epic-b45-audit-sessions-avance.md`
2. Analyser le design UX : `docs/ux/audit-sessions-advanced-design.md`
3. Décider si intégration dans PRD v1.3.0 ou PRD séparé
4. Documenter les requirements fonctionnels et non-fonctionnels
5. Prioriser les phases (Phase 1, 2, 3)

**Références** :
- Epic : `docs/epics/epic-b45-audit-sessions-avance.md`
- Design UX : `docs/ux/audit-sessions-advanced-design.md`
- Audit brownfield : `docs/architecture/audit-brownfield-b45-validation.md`

**Commande BMAD** :
```
/BMad/agents/pm
*create-doc (avec template prd-tmpl.yaml ou brownfield-prd-tmpl.yaml)
```

---

### 2. Documentation API - Mise à Jour OpenAPI

**Statut** : ✅ **NON NÉCESSAIRE**

**Raison** : FastAPI génère automatiquement la documentation OpenAPI complète à :
- `/docs` : Interface Swagger interactive
- `/openapi.json` : Spécification OpenAPI complète

**Tous les endpoints sont déjà documentés automatiquement** via les docstrings et les schémas Pydantic.

**Action requise** : Aucune. La documentation est toujours à jour automatiquement.

---

### 3. Validation - Review de l'Architecture

**Responsable** : 👥 **Équipe (Review collectif)**

**Participants recommandés** :
- 🏗️ **Winston (Architect)** : Valide la cohérence technique
- 📋 **John (PM)** : Valide l'alignement produit
- 💻 **James (Dev)** : Valide la faisabilité technique
- ✅ **QA** : Valide la testabilité

**Tâche** :
- Review de l'architecture v3.2 mise à jour
- Validation de la complétude de la documentation
- Vérification de l'alignement code ↔ documentation

**Checklist de Review** :
- [ ] Tous les champs du modèle `CashSession` sont documentés
- [ ] Les workflows métier (saisie différée, filtrage) sont clairs
- [ ] Le système d'audit est bien documenté
- [ ] Les références aux stories sont correctes
- [ ] Les diagrammes sont à jour
- [ ] Pas d'incohérences entre architecture et code

**Actions requises** :
1. **Architect** : Préparer un document de review avec checklist
2. **Équipe** : Review collectif (asynchrone ou synchrone)
3. **Architect** : Intégrer les feedbacks et mettre à jour si nécessaire

**Références** :
- Architecture v3.2 : `docs/architecture/architecture.md`
- Changelog : `docs/architecture/CHANGELOG-v3.2.md`
- Audit brownfield : `docs/architecture/audit-brownfield-b45-validation.md`

---

## Priorisation Recommandée

### Priorité 1 (Urgent) : Mise à Jour PRD
**Pourquoi** : L'Epic B45 n'est pas dans le PRD, ce qui crée une incohérence produit. Le PM doit décider de la priorisation et de l'intégration.

**Quand** : Avant de commencer l'implémentation Phase 1 B45

### Priorité 2 (Important) : Documentation API
**Pourquoi** : Les endpoints existants non documentés créent de la confusion. Les nouveaux endpoints (Phase 1) doivent être documentés avant implémentation.

**Quand** : En parallèle ou juste avant l'implémentation Phase 1 B45

### Priorité 3 (Recommandé) : Validation Architecture
**Pourquoi** : Assure la qualité et la cohérence de la documentation. Peut être fait de manière asynchrone.

**Quand** : Dans les prochains jours, avant de commencer de nouvelles stories majeures

---

## Workflow Recommandé

```
1. PM (John) → Mise à jour PRD avec Epic B45
   ↓
2. Architect (Winston) OU Dev (James) → Documentation API
   ↓
3. Équipe → Review Architecture (asynchrone)
   ↓
4. Architect (Winston) → Intégration feedbacks
   ↓
5. Dev (James) → Implémentation Phase 1 B45 (quand PRD validé)
```

---

## Notes Importantes

### Pour le PM (John)
- L'Epic B45 est un module d'audit avancé qui peut être considéré comme une extension du module caisse existant
- Le design UX est déjà validé et prêt
- Les phases sont bien définies (1, 2, 3) avec priorités claires

### Pour l'Architect (Winston)
- L'architecture est maintenant à jour avec tous les changements récents
- Les endpoints à créer sont identifiés dans l'audit brownfield
- La documentation API peut être extraite de FastAPI `/docs` automatiquement

### Pour le Dev (James)
- Ne pas commencer l'implémentation Phase 1 avant que le PRD soit mis à jour
- Les endpoints existants peuvent être documentés en utilisant la spec OpenAPI auto-générée
- Référencer l'audit brownfield pour connaître les fonctionnalités manquantes

---

**Fin du Document**

