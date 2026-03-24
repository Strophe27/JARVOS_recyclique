# Epic: Caisse - Notes Tickets & Bandeau KPI Temps Réel

**ID:** EPIC-B40-CAISSE-NOTES-KPI  
**Titre:** Notes enrichies sur tickets avec bandeau KPI temps réel  
**Thème:** Caisse / Pilotage & Qualité des données  
**Statut:** Proposition  
**Priorité:** P1 (Critique)

---

## 1. Objectif de l'Epic

Permettre aux caissiers d'ajouter des notes contextualisées sur chaque ticket et d'afficher en permanence les KPIs de caisse (nb de tickets, CA, dons, poids sortis/rentrés, montant dernier ticket) afin de sécuriser la tenue de caisse quotidienne et améliorer la traçabilité opérationnelle.

---

## 2. Description

Aujourd'hui, aucune note opérationnelle n'est stockée avec les tickets, obligeant les équipes à maintenir des traces hors système (post-it, tickets papier). Le bandeau caisse reste limité et ne reflète pas les chiffres clés du jour en temps réel.

Cet epic introduit :
- Un champ note côté caisse pour contextualiser chaque ticket
- La possibilité pour l'admin d'amender ces notes
- Un bandeau KPI temps réel affichant les indicateurs clés (tickets, CA, dons, poids)

**Ordre optimisé :** La migration DB (B40-P5) est faite en premier pour éviter le stockage temporaire et simplifier le développement frontend.

---

## 3. Stories de l'Epic (ordre d'exécution optimisé)

### Phase 1 : Fondations (DB en premier)

**STORY-B40-P5 – Migration DB pour les notes de tickets** (Priorité P1 - Backend)  
**Statut :** À démarrer en premier  
- Ajouter une colonne `note TEXT NULL` sur la table `sales` + champs ORM/API.  
- Endpoints `POST/PUT /api/v1/sales` acceptent le champ `note`.  
- Migration Alembic additive uniquement (pas de breaking change).  
- Tests backend (unitaires + API) couvrant création/lecture/édition.  
- **Avantage :** Évite le stockage temporaire et les migrations de données complexes.

---

### Phase 2 : Développement Frontend (parallélisme possible)

**STORY-B40-P1 – Champ Note côté caisse (Frontend)** (Priorité P1 - Frontend)  
**Statut :** Peut démarrer en parallèle de P2 après P5  
- Ajouter un champ texte libre « Note » sur l'écran d'encaissement.  
- Sauvegarder directement en base via API (colonne `note` déjà disponible).  
- Afficher la note dans l'aperçu du ticket avant validation.  
- Tests UI couvrant saisie, suppression, persistance durant le wizard.

**STORY-B40-P2 – Bandeau caisse KPI temps réel** (Priorité P1 - Frontend)  
**Statut :** Peut démarrer en parallèle de P1 après P5  
- Afficher : nb tickets du jour, montant dernier ticket, CA, dons, poids sortis, poids rentrés.  
- Reposer sur les APIs live (Epic B38) ou fallback existant.  
- Rafraîchissement discret (polling) et indicateurs visuels.  
- **Indépendant :** Aucune dépendance avec les notes.

---

### Phase 3 : Fonctionnalités avancées

**STORY-B40-P4 – Edition des notes côté Admin** (Priorité P2 - Frontend Admin)
**Statut :** À démarrer après P1 (dépend de la création de notes)
- Dans `admin/…/visualiser les tickets`, permettre aux admins d'éditer la note d'un ticket.
- Utiliser directement la colonne `note` en base (pas de stockage temporaire).
- Historiser les modifications (audit log en mémoire ou table existante).
- Restreindre l'action aux rôles Admin/SuperAdmin.

### Phase 4 : Corrections & Améliorations UX

**STORY-B40-P1-CORRECTION – Corrections UX Popup Encaissement** (Priorité P1 - Frontend Caisse)
**Statut :** Correction urgente
- Déplacer le champ note du caisse vers le popup d'encaissement (entre moyens paiement/dons)
- Corriger le bug des espaces dans la boîte de texte (mots collés)
- Audit visuel et améliorations ergonomiques du popup
- Aperçu de la note dans le résumé du ticket

**STORY-B40-P4-CORRECTION – Corrections Interface Admin Notes** (Priorité P1 - Frontend Admin)
**Statut :** Correction urgente
- Ajouter colonne "Notes" dans la liste des sessions de caisse (`/admin/cash-sessions/{id}`)
- Dans popup visualisation ticket : affichage conditionnel + bouton "Éditer"
- Contrôles de permissions et audit trail des modifications

---

## 4. Ordre d'exécution recommandé

### Phase principale (Stories initiales)
1. **B40-P5** (DB) - **Démarrer en premier**
2. **B40-P1** (Frontend Notes) + **B40-P2** (KPI) - **En parallèle après P5**
3. **B40-P4** (Admin) - **Après P1 uniquement**

### Phase corrections (Priorité haute)
4. **B40-P1-CORRECTION** + **B40-P4-CORRECTION** - **En parallèle dès que possible**

**Justification :**
- **P5 en premier** : Évite stockage temporaire et migrations complexes
- **P1 + P2 en parallèle** : Indépendants, peuvent être développés simultanément
- **P4 après P1** : Dépend de P1 (édition des notes créées en P1)
- **Corrections prioritaires** : Fixes UX bloquants identifiés post-développement

---

## 5. Compatibilité & Contraintes

- **Migration additive uniquement** : Pas de breaking change (colonne `note` nullable).  
- Les notes doivent être filtrées côté API pour éviter injection HTML.  
- Le bandeau KPI (P2) repose sur les APIs existantes (Epic B38) sans modification backend supplémentaire.  
- **Pas de stockage temporaire** : Grâce à P5 en premier, toutes les stories utilisent directement la DB.

---

## 5. Definition of Done

### Stories principales
- [ ] Champ note disponible côté caisse + édition admin.
- [ ] Bandeau KPI affiche 6 indicateurs en temps réel.
- [ ] Notes persistées en base de données (colonne `note` sur table tickets).
- [ ] Documentation caisse & procédures admin mises à jour.
- [ ] Tests backend (API + migrations) et frontend (Playwright/Vitest) verts.
- [ ] Aucune régression sur la clôture de caisse quotidienne.

### Corrections UX (B40-P1-CORRECTION & B40-P4-CORRECTION)
- [ ] Champ note déplacé dans popup d'encaissement avec saisie d'espaces fonctionnelle.
- [ ] Popup d'encaissement ergonomique et intuitif visuellement.
- [ ] Colonne "Notes" visible dans liste sessions admin.
- [ ] Popup visualisation ticket avec affichage conditionnel et bouton d'édition.
- [ ] Permissions admin respectées et audit trail des modifications.

---

## 6. Historique des Changements

| Date | Version | Description | Auteur |
|------|---------|-------------|--------|
| 2025-11-26 | v2.2 | Ajout corrections UX : B40-P1-CORRECTION et B40-P4-CORRECTION | BMad Master |
| 2025-11-26 | v2.0 | Refonte complète : suppression encaissements libres et correction CB, recentrage sur notes + KPI | BMad Master |
| 2025-11-26 | v1.0 | Création epic initial | BMad Master |

