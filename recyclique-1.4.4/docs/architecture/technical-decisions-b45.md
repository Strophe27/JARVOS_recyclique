# Décisions Techniques - Epic B45

**Date**: 2025-01-27  
**Auteur**: Winston (Architect)

---

## 1. Bibliothèque Graphiques (Phase 2)

**Décision** : ✅ **`recharts`**

**Justification** :
- Meilleure intégration React/TypeScript
- Plus léger que chart.js
- Support TypeScript natif
- Écosystème React standard

**Action** : Installer `recharts` lors de l'implémentation Phase 2

---

## 2. Solution Jobs Programmés (Phase 3)

**Décision** : ✅ **`APScheduler`**

**Justification** :
- Simple à intégrer dans FastAPI
- Pas de broker externe nécessaire
- Suffisant pour rapports programmés
- Redis déjà disponible si besoin de queue

**Action** : Installer `APScheduler` lors de l'implémentation Phase 3

---

## 3. Stockage Vues Sauvegardées (Phase 3)

**Décision** : ✅ **Base de données**

**Justification** :
- Partage possible entre utilisateurs (futur)
- Persistance garantie
- Cohérence avec le reste de l'application
- Possibilité de permissions par vue

**Modèle à créer** : `SavedView`
```python
class SavedView(Base):
    id: UUID
    user_id: UUID (ForeignKey users)
    name: str
    type: str (enum: "cash_session" | "reception_ticket")
    filters_json: JSONB
    columns_json: JSONB
    created_at: DateTime
    updated_at: DateTime
```

**Action** : Créer migration lors de l'implémentation Phase 3

---

**Fin du Document**














