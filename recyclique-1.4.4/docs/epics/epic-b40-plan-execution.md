# Epic B40 - Plan d'Exécution Optimisé

**Date:** 2025-11-26  
**Epic:** [EPIC-B40 – Notes Tickets & Bandeau KPI](./epic-b40-caisse-notes-et-kpi.md)

---

## 🎯 Ordre d'Exécution Recommandé

### Option 1 : Parallélisme Optimal (Recommandé)

```
Phase 1 : Fondations
└── B40-P5 (DB) ⚡ DÉMARRER EN PREMIER
    └── Migration DB : colonne `note` sur table `sales`
    └── Backend API : endpoints acceptent `note`
    └── Tests backend complets

Phase 2 : Développement Frontend (PARALLÈLE)
├── B40-P1 (Frontend Notes) ⚡ EN PARALLÈLE
│   └── Champ note côté caisse
│   └── Utilise directement colonne DB (P5 terminé)
│
└── B40-P2 (Frontend KPI) ⚡ EN PARALLÈLE
    └── Bandeau KPI temps réel
    └── Indépendant des notes

Phase 3 : Fonctionnalités Avancées
└── B40-P4 (Admin) ⚡ APRÈS P1
    └── Édition notes admin
    └── Dépend de P1 (édition des notes créées)
```

---

## 📋 Détails par Story

### B40-P5 : Migration DB (PRIORITÉ 1 - Backend)

**Statut :** ⚡ **À démarrer en premier**  
**Durée estimée :** 2-3 jours  
**Dépendances :** Aucune

**Pourquoi en premier ?**
- ✅ Évite le stockage temporaire complexe
- ✅ Pas de migration de données à faire après
- ✅ Frontend peut utiliser directement la DB
- ✅ Simplifie P1 et P4

**Livrables :**
- Migration Alembic : colonne `note TEXT NULL` sur `sales`
- Modèle ORM `Sale` mis à jour
- Schémas Pydantic mis à jour
- Endpoints API acceptent `note`
- Tests backend complets

---

### B40-P1 : Champ Note Caisse (PRIORITÉ 1 - Frontend)

**Statut :** ⚡ **Peut démarrer en parallèle de P2 après P5**  
**Durée estimée :** 3-4 jours  
**Dépendances :** B40-P5 terminé

**Livrables :**
- Champ texte multi-lignes sur écran encaissement
- Sauvegarde directe en DB (pas de temporaire)
- Affichage dans récapitulatif ticket
- Tests UI complets

---

### B40-P2 : Bandeau KPI (PRIORITÉ 1 - Frontend)

**Statut :** ⚡ **Peut démarrer en parallèle de P1 après P5**  
**Durée estimée :** 3-4 jours  
**Dépendances :** Aucune (indépendant des notes)

**Livrables :**
- Bandeau affichant 6 KPIs temps réel
- Consommation API live (Epic B38)
- Rafraîchissement automatique
- Tests UI complets

**Pourquoi en parallèle ?**
- ✅ Aucune dépendance avec les notes
- ✅ Équipe frontend peut travailler sur 2 stories simultanément
- ✅ Réduit le temps total de développement

---

### B40-P4 : Édition Notes Admin (PRIORITÉ 2 - Frontend Admin)

**Statut :** ⚡ **À démarrer après P1 uniquement**  
**Durée estimée :** 2-3 jours  
**Dépendances :** B40-P1 terminé

**Livrables :**
- Interface admin pour éditer notes
- Contrôle RBAC (Admin/SuperAdmin uniquement)
- Historique modifications
- Tests frontend/permissions

**Pourquoi après P1 ?**
- ✅ Dépend de P1 (édition des notes créées en P1)
- ✅ Priorité P2 (moins critique que P1/P2)

---

## ⏱️ Planning Estimé

### Séquentiel (sécurisé)
```
Semaine 1 : B40-P5 (DB)
Semaine 2 : B40-P1 (Frontend Notes)
Semaine 3 : B40-P2 (KPI)
Semaine 4 : B40-P4 (Admin)
Total : ~4 semaines
```

### Parallélisme Optimal (recommandé)
```
Semaine 1 : B40-P5 (DB)
Semaine 2-3 : B40-P1 (Notes) + B40-P2 (KPI) en parallèle
Semaine 4 : B40-P4 (Admin)
Total : ~3-4 semaines (gain de temps grâce au parallélisme)
```

---

## 🔄 Dépendances

```
B40-P5 (DB)
  ├── B40-P1 (Frontend Notes) ──┐
  │                              │
  └── B40-P2 (KPI) ─────────────┼── (indépendant)
                                  │
                                  └── B40-P4 (Admin)
```

**Règles :**
- P5 doit être terminé avant P1 et P2
- P1 et P2 peuvent être développés en parallèle
- P4 doit attendre P1 (mais pas P2)

---

## ✅ Checklist de Démarrage

### Avant de commencer P5
- [ ] Backup base de données
- [ ] Environnement de dev/test prêt
- [ ] Accès migrations Alembic

### Avant de commencer P1/P2 (après P5)
- [ ] P5 terminé et déployé en dev
- [ ] Colonne `note` visible en base
- [ ] Endpoints API testés et fonctionnels
- [ ] Tests backend P5 passants

### Avant de commencer P4 (après P1)
- [ ] P1 terminé et déployé
- [ ] Création de notes fonctionnelle
- [ ] Tests P1 passants

---

## 🚨 Risques et Mitigation

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Migration DB échoue | Bloque tout | Backup avant migration, rollback plan |
| P1/P2 en parallèle crée conflits | Retard | Communication équipe, code review |
| P4 dépend de P1 mais P1 bloque | Retard P4 | Prioriser P1, P4 peut attendre |

---

## 📝 Notes Techniques

### Table concernée
- **Table :** `sales` (pas `cash_ticket`)
- **Colonne :** `note TEXT NULL`
- **Migration :** Additive uniquement (pas de breaking change)

### APIs concernées
- `POST /api/v1/sales` : accepter `note`
- `PUT /api/v1/sales/:id` : accepter `note`
- `GET /api/v1/sales/:id` : retourner `note`

### Frontend
- Composant caisse : `SaleWizard.tsx`
- Composant admin : à identifier
- Store Zustand : `cashSessionStore.ts`



