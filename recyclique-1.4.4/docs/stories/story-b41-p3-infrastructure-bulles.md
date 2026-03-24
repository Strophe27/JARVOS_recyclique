# Story B41-P3: Infrastructure bulles interactives (préparation)

**Status:** Draft  
**Epic:** [EPIC-B41 – Caisse Virtuelle & Formation](../epics/epic-b41-caisse-virtuelle.md)  
**Module:** Frontend – Caisse  
**Priority:** P3  
**Owner:** PO/UX squad  
**Last Updated:** 2025-11-26

---

## Story Statement

**As a** UX designer / onboarding lead,  
**I want** the frontend to expose an infrastructure of guided tours (bulles interactives) partageable entre mode réel et caisse virtuelle,  
**so that** nous puissions activer rapidement un tutoriel embarqué sans retoucher en profondeur les écrans caisse.

---

## Acceptance Criteria

1. **Guided Tour Provider** – Une librairie de guided tours (ex: `react-joyride`) est intégrée et encapsulée dans un composant `GuidedTourProvider` monté au niveau racine de la caisse (`CashRegisterDashboard` et `Sale`).  
2. **Configuration structurée** – Un format de configuration (TS/JSON) documente étapes, cibles CSS/test-id, messages, et conditions d’affichage. Les fichiers de config sont versionnés sous `frontend/src/guided-tours/`.  
3. **Placeholders désactivés** – Au moins 2 parcours placeholders (“Créer un ticket”, “Encaisser un paiement”) existent mais restent désactivés par défaut (flag).  
4. **Feature Flag** – Un toggle `enableGuidedTours` (basé sur un fichier de config ou env front) contrôle toute l’infrastructure ; flag OFF = aucun script chargé, aucun bundle additionnel.  
5. **Accessibilité & UX** – Les bulles respectent l’accessibilité (navigation clavier, aria-hidden sur le fond, focus piégé) et ne cassent pas le workflow caisse réel ou virtuel.  
6. **Tests & Documentation** – Tests unitaires couvrant l’état flag OFF/ON + documentation UX expliquant comment écrire/déployer un script de tutoriel.

---

## Dev Notes

### Références Architecturales Clés
1. `docs/architecture/architecture.md` – sections *10. Patterns UI* et *11. Frontend Offline/PWA* décrivent les contraintes PWA/offline à respecter pour la caisse.  
   `[Source: docs/architecture/architecture.md §10-11]`
2. `frontend/src/pages/CashRegister/CashRegisterDashboard.tsx` et `frontend/src/pages/CashRegister/Sale.tsx` contiennent l’arbre principal monté lors d’une session de vente.  
   `[Source: frontend/src/pages/CashRegister/CashRegisterDashboard.tsx]`
3. `frontend/src/App.jsx` charge paresseusement les écrans caisse – le provider devra être injecté sans casser le code split.  
   `[Source: frontend/src/App.jsx]`

### Insights pertinents (Stories B41-P1 & B41-P2)
- B41-P1 introduit un `VirtualCashStore` (mode déconnecté). Le provider de guided tours doit être agnostique des stores pour fonctionner en mode réel et virtuel.  
- B41-P2 simule des tickets ; les placeholders devront viser les mêmes data-test-id que les composants réels pour éviter la duplication.

### Détails Techniques (Data / API / Components / Tests)
- **Data & API**: aucune API backend. Stocker la configuration des parcours dans `frontend/src/guided-tours/*.ts` avec export typed `{ id, steps[] }`.  
- **Feature flag**: suivre la convention actuelle des flags front dans `frontend/src/utils/features.ts` (à créer si absent) et exposer `useFeatureFlag('enableGuidedTours')`.  
- **Composants**: créer `frontend/src/providers/GuidedTourProvider.tsx` qui wrap `JoyrideProvider` + branchements sur `CashRegisterDashboard`, `Sale`, `VirtualCashShell` (B41-P1).  
- **Tests**: utiliser React Testing Library pour vérifier que, flag OFF, aucun composant Joyride n’est rendu (`queryByTestId('guided-tour-root')`). Ajouter un test Playwright léger dans `frontend/src/test/integration/cash-register-workflow.test.tsx` pour vérifier l’apparition d’une bulle en mode dev.

### Testing Standards
- Respecter `frontend/testing-guide.md` pour les niveaux de test UI (unit + integration).  
- Les nouveaux tests doivent vivre sous `frontend/src/test/providers/GuidedTourProvider.test.tsx` (unit) et `frontend/src/test/integration/cash-register-guided-tour.test.tsx` (e2e léger).  
- Ajouter snapshots accessibles si nécessaires (axe + jest-axe) comme recommandé dans `docs/testing-strategy.md`.

---

## Tasks / Subtasks
1. **Créer l’infrastructure provider** (AC1, AC4)  
   - [ ] Ajouter `react-joyride` (ou librairie équivalente) + wrapper `GuidedTourProvider`.  
   - [ ] Injecter le provider au niveau `CashRegisterDashboard` et `Sale`.  
   - [ ] Exposer un hook `useGuidedTours()` retournant état du flag et registres de parcours.
2. **Définir le format de configuration** (AC2, AC3)  
   - [ ] Créer dossier `frontend/src/guided-tours/`.  
   - [ ] Écrire `guidedToursConfig.ts` (type `GuidedTourScript`).  
   - [ ] Ajouter deux scripts placeholders (“create-ticket-tour”, “checkout-tour”) désactivés.  
   - [ ] Documenter les attributs requis (selector, contenu, condition).
3. **Brancher le feature flag** (AC4)  
   - [ ] Introduire `frontend/src/utils/features.ts` si absent, ou ajouter `enableGuidedTours`.  
   - [ ] Lire le flag via env (`VITE_FEATURE_GUIDED_TOURS`) avec valeur par défaut `false`.  
   - [ ] Empêcher le chargement/l’import de la librairie si flag = false (code-splitting dynamique).
4. **Accessibilité & UX** (AC5)  
   - [ ] Vérifier focus trap, aria-hidden, interactions clavier (Esc pour fermer).  
   - [ ] Ajouter tests axe (jest-axe) sur le provider.  
   - [ ] Vérifier compatibilité avec mode virtuel (B41-P1) : tours ne doivent pas manipuler le store.
5. **Tests & Documentation** (AC6)  
   - [ ] Écrire tests unitaires provider + tests d’intégration (flag off/on).  
   - [ ] Ajouter section “Guided Tours” dans `docs/ux/onboarding.md` (ou créer le fichier).  
   - [ ] Capturer un gif/vidéo démontrant un placeholder en mode dev.

---

## Project Structure Notes
- Place provider dans `frontend/src/providers/GuidedTourProvider.tsx` pour rester cohérent avec les autres providers (`ThemeProvider`, `OfflineProvider`).  
- Les scripts de tours doivent vivre hors `pages/` afin d’être partagés entre mode réel (`Sale.tsx`) et virtuel (`VirtualCashShell.tsx` à venir).  
- Aucun changement côté backend ; seules modifications front.

---

## Validation Checklist
- [ ] AC1–AC6 validés en démo PO (flag ON/OFF).  
- [ ] Tests unitaires & intégration verts (`pnpm test --filter guided-tour`).  
- [ ] Vérification accessibilité (axe) documentée.  
- [ ] Documentation UX mergeée (PR liée).  
- [ ] Feature flag default = OFF sur prod/staging.

---

## Change Log
| Date       | Version | Description                     | Author        |
|------------|---------|---------------------------------|---------------|
| 2025-11-26 | v0.1    | Création du draft structuré B41-P3 | BMad Master |


