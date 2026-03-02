# Story 18-4 : Audit caisse 1.4.4 — inventaire fonctionnel exhaustif

## Metadata

| Champ         | Valeur                                                                        |
| ------------- | ----------------------------------------------------------------------------- |
| **Story key** | `18-4-audit-caisse-1-4-4-inventaire-fonctionnel-exhaustif`                   |
| **Epic**      | Epic 18 — Alignement 1.4.4 et complétion fonctionnelle                       |
| **Statut**    | ready-for-dev                                                                 |
| **Type**      | Audit documentaire                                                            |
| **Dépendances** | Aucune (peut démarrer en parallèle de 18.1)                               |
| **Livrable**  | `_bmad-output/implementation-artifacts/18-4-audit-caisse-inventaire.md`      |

---

## User Story

**As a** équipe dev,  
**I want** un inventaire complet et précis de toutes les fonctionnalités de la caisse 1.4.4,  
**So that** les stories de refactor 18.5–18.9 aient une cible exhaustive et sans angle mort.

---

## Contexte

La caisse 1.4.4 est un module très riche (keyboard shortcuts AZERTY, grille catégories, presets, ticket temps réel, multi-paiements, caisse virtuelle, saisie différée). L'implémentation actuelle est visuellement incomplète et fonctionnellement insuffisante pour le terrain.

Cet audit est un **artefact documentaire** : l'agent doit lire tous les fichiers 1.4.4 listés ci-dessous et produire un inventaire structuré en 10 sections. Aucune modification de code n'est effectuée dans cette story.

---

## Fichiers source 1.4.4 à auditer

### Pages

- `references/ancien-repo/repo/frontend/src/pages/CashRegister/CashRegisterDashboard.tsx`
- `references/ancien-repo/repo/frontend/src/pages/CashRegister/Sale.tsx`
- `references/ancien-repo/repo/frontend/src/pages/CashRegister/OpenCashSession.tsx`
- `references/ancien-repo/repo/frontend/src/pages/CashRegister/CloseSession.tsx`
- `references/ancien-repo/repo/frontend/src/pages/CashRegister/VirtualCashRegister.tsx`
- `references/ancien-repo/repo/frontend/src/pages/Admin/CashSessionDetail.tsx`
- `references/ancien-repo/repo/frontend/src/pages/Admin/SessionManager.tsx`

### Composants

- `references/ancien-repo/repo/frontend/src/components/SaleWizard.tsx`
- `references/ancien-repo/repo/frontend/src/components/FinalizationScreen.tsx`
- `references/ancien-repo/repo/frontend/src/components/CategorySelector.tsx`
- `references/ancien-repo/repo/frontend/src/components/EnhancedCategorySelector.tsx`
- `references/ancien-repo/repo/frontend/src/components/CashKPIBanner.tsx`
- `references/ancien-repo/repo/frontend/src/components/Ticket.tsx`
- `references/ancien-repo/repo/frontend/src/components/CashRegisterForm.tsx`
- `references/ancien-repo/repo/frontend/src/components/CashSessionHeader.tsx`

### Stores, services et utils

- `references/ancien-repo/repo/frontend/src/stores/cashSessionStore.ts`
- `references/ancien-repo/repo/frontend/src/stores/categoryStore.ts`
- `references/ancien-repo/repo/frontend/src/stores/virtualCashSessionStore.ts`
- `references/ancien-repo/repo/frontend/src/stores/deferredCashSessionStore.ts`
- `references/ancien-repo/repo/frontend/src/utils/cashKeyboardShortcuts.ts`
- `references/ancien-repo/repo/frontend/src/utils/azertyKeyboard.ts`
- `references/ancien-repo/repo/frontend/src/utils/keyboardShortcuts.ts`
- `references/ancien-repo/repo/frontend/src/services/cashSessionService.ts`
- `references/ancien-repo/repo/frontend/src/services/cashSessionsService.ts`

---

## Critères d'acceptation

**Given** la lecture complète de tous les fichiers listés ci-dessus  
**When** l'agent produit l'artefact d'audit  
**Then** l'artefact `18-4-audit-caisse-inventaire.md` couvre les 10 sections suivantes :

1. **Layout et navigation** : structure des pages, routing, états visuels (fond caisse, header dédié, KPI banner)
2. **Grille catégories et presets** : chargement, affichage, sous-catégories, filtres par onglet
3. **Raccourcis clavier AZERTY** : mapping complet touche → action, comportements spéciaux (quantité, poids, prix libre)
4. **Ticket en temps réel** : structure (lignes, total, remises, dons), états (vide, en cours, finalisé)
5. **Finalisation et paiements** : modes de paiement, saisie montant, rendu monnaie, validation
6. **Ouverture de session** : flux, fond de caisse, sélection poste/site
7. **Fermeture de session** : comptage physique, contrôle totaux, écart, sync Paheko
8. **Caisse virtuelle** : fonctionnement distinct, états spécifiques
9. **Saisie différée** : flux, différences avec session normale
10. **State management** : quels stores, quelles actions, quelles dépendances API

**And** pour chaque section, le format est :
- **Fichiers 1.4.4 sources** : liste des fichiers lus
- **Composants équivalents** : chemins dans `frontend/src/caisse/` (ou "À créer" si absent)
- **Écarts identifiés** : liste des fonctionnalités présentes en 1.4.4 mais absentes ou incomplètes dans la nouvelle app

---

## Tâches techniques

- [ ] **T1** — Lire et analyser tous les fichiers pages listés (7 fichiers)
- [ ] **T2** — Lire et analyser tous les composants listés (8 fichiers)
- [ ] **T3** — Lire et analyser tous les stores, services et utils listés (9 fichiers)
- [ ] **T4** — Identifier les composants équivalents dans la nouvelle app. Fichiers à cartographier dans `frontend/src/caisse/` : `CaisseDashboardPage.tsx`, `CashRegisterSalePage.tsx`, `CashRegisterSessionOpenPage.tsx`, `CashRegisterSessionClosePage.tsx`, `CaisseContext.tsx`, `CaisseHeader.tsx`, `CaisseStatsBar.tsx`. Si aucun équivalent n'existe pour une section, noter explicitement "À créer".
- [ ] **T5** — Rédiger la section §1 Layout et navigation
- [ ] **T6** — Rédiger la section §2 Grille catégories et presets
- [ ] **T7** — Rédiger la section §3 Raccourcis clavier AZERTY
- [ ] **T8** — Rédiger la section §4 Ticket en temps réel
- [ ] **T9** — Rédiger la section §5 Finalisation et paiements
- [ ] **T10** — Rédiger la section §6 Ouverture de session
- [ ] **T11** — Rédiger la section §7 Fermeture de session
- [ ] **T12** — Rédiger la section §8 Caisse virtuelle
- [ ] **T13** — Rédiger la section §9 Saisie différée
- [ ] **T14** — Rédiger la section §10 State management
- [ ] **T15** — Écrire le fichier livrable `18-4-audit-caisse-inventaire.md`

---

## Fichiers attendus en sortie

| Fichier | Type | Description |
| ------- | ---- | ----------- |
| `_bmad-output/implementation-artifacts/18-4-audit-caisse-inventaire.md` | Artefact d'audit | Inventaire fonctionnel exhaustif — 10 sections |

> Aucune modification de code frontend ou backend dans cette story.

---

## Notes de l'équipe

- Cet audit est le **point de vérité** pour les stories 18.5 à 18.10 (caisse). Chaque story de refactor caisse référence une section de cet artefact.
- En cas de fichier 1.4.4 absent ou illisible, noter l'anomalie dans l'artefact et documenter les gaps sur la base des fichiers disponibles.
- Priorité P0 — domaine Caisse.

### Template de section (à reproduire pour les 10 sections)

```markdown
## §N — [Titre de la section]

### Fichiers 1.4.4 sources
- `chemin/fichier1.tsx` — [rôle dans cette section]
- …

### Composants équivalents (nouvelle app)
- `frontend/src/caisse/FichierEquivalent.tsx` — [statut : présent / partiel / À créer]
- …

### Fonctionnalités inventoriées
- [Fonctionnalité 1] — présente en 1.4.4 ✓ / absente en nouvelle app ✗ / partielle ⚠️
- …

### Écarts identifiés
- [Description de l'écart 1]
- …
```

---

## Code Review

| Champ | Valeur |
|-------|--------|
| **Date** | 2026-03-02 |
| **Resultat** | approved |
| **Reviewer** | bmad-qa |

### Decision

L'artefact 8-4-audit-caisse-inventaire.md\ est **approuve**. Les 10 sections sont presentes avec les 4 sous-parties requises. Tous les fichiers \rontend/src/caisse/\ listes existent. La limitation sur l'absence des sources 1.4.4 physiques est documentee explicitement. La synthese, la table de couverture, les ecarts P0/P1 et les recommandations 18.5-18.10 sont actionnables.

**Points de friction mineurs (non bloquants) :**
- Quelques composants 1.4.4 cites (TicketDisplay.tsx, CategoryDisplayManager.tsx, PresetButtonGrid.tsx) ne figurent pas dans la liste originale de la story.
- Le mapping des recommandations vers les numeros de stories 18.5-18.10 est legerement decale par rapport aux titres planifies dans sprint-status.yaml.
