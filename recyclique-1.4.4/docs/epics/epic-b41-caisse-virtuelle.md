# Epic: Caisse Virtuelle & Mode Formation

**ID:** EPIC-B41-CAISSE-VIRTUELLE  
**Titre:** Mode caisse déconnecté pour onboarding & formation  
**Thème:** Caisse / Formation & Qualité  
**Statut:** Proposition  
**Priorité:** P2 (Important mais non bloquant)

---

## 1. Objectif de l'Epic

Mettre à disposition un espace de caisse virtuel totalement déconnecté de la base de données de production permettant de simuler des tickets et encaissements en toute sécurité, avec la possibilité future d’ajouter des bulles interactives de tutoriel.

## 2. Description

Les nouveaux caissiers et bénévoles n'ont aucun environnement d'entraînement. L'objectif est d'offrir une copie fonctionnelle de la caisse (mêmes écrans, mêmes contrôles) mais opérant sur un magasin de données local (IndexedDB/localStorage) sans impact sur les chiffres officiels. Cet epic est livré en fin de roadmap (facultatif) mais documente tous les besoins pour un déploiement ultérieur. Les bulles interactives sont planifiées mais non activées tant que la base virtuelle n'est pas éprouvée.

## 2.1. Architecture Technique (Refactorisation)

**IMPORTANT :** L'implémentation utilise un système d'**injection de stores** (Dependency Injection) pour éviter la duplication de code et garantir un "clone dynamique" de la caisse réelle.

### Principe

Au lieu de dupliquer les composants (`VirtualSale.tsx`, `VirtualOpenCashSession.tsx`, etc.), l'architecture utilise :
- **Un seul set de composants** : `Sale`, `OpenCashSession`, `CloseSession`, `CashRegisterDashboard`, etc.
- **Un système d'injection de stores** via `CashStoreProvider` qui injecte les stores appropriés selon le mode (réel ou virtuel)
- **Les stores virtuels** implémentent la même interface que les stores réels (Zustand stores)

### Avantages

- ✅ **Clone dynamique** : Les évolutions de la caisse réelle s'appliquent automatiquement à la virtuelle
- ✅ **Maintenance simplifiée** : Plus de duplication de code, un seul endroit à maintenir
- ✅ **Mêmes écrans, mêmes contrôles** : Respecte parfaitement l'objectif de l'epic
- ✅ **Tests simplifiés** : Les tests de la caisse réelle couvrent aussi la virtuelle

### Implémentation

```tsx
// CashStoreProvider détecte automatiquement le mode depuis l'URL
<CashStoreProvider>
  <Sale /> {/* Fonctionne en mode réel ET virtuel */}
</CashStoreProvider>
```

Le provider :
- Détecte le mode depuis l'URL (`/cash-register/virtual` = mode virtuel, `/caisse` = mode réel)
- Injecte les stores appropriés via React Context
- Les composants utilisent `useCashSessionStoreInjected()`, `useCategoryStoreInjected()`, etc.

### Routes

- **Mode réel** : `/caisse`, `/cash-register/session/open`, `/cash-register/sale`, `/cash-register/session/close`
- **Mode virtuel** : `/cash-register/virtual`, `/cash-register/virtual/session/open`, `/cash-register/virtual/sale`, `/cash-register/virtual/session/close`

Les deux modes utilisent les **mêmes composants**, seuls les stores injectés diffèrent.

### Fichiers clés

- `frontend/src/providers/CashStoreProvider.tsx` : Provider d'injection de stores
- `frontend/src/stores/virtualCashSessionStore.ts` : Store virtuel pour les sessions
- `frontend/src/stores/virtualCategoryStore.ts` : Store virtuel pour les catégories
- `frontend/src/stores/virtualPresetStore.ts` : Store virtuel pour les presets
- Routes unifiées dans `frontend/src/App.jsx` : Utilisent les mêmes composants avec le provider

## 3. Stories de l'Epic (ordre imposé)

1. **STORY-B41-P1 – Mode déconnecté & stockage local**  
   - Ajouter un “toggle” Caisse virtuelle (feature flag).  
   - Lorsque activé, toutes les écritures se font dans IndexedDB/localStorage isolé.  
   - Les données simulées sont purgeables depuis l’UI.

2. **STORY-B41-P2 – Simulation complète des tickets**  
   - Permettre création, modification, encaissement de tickets fictifs (y compris dons).  
   - Gérer le bandeau KPI en version simulée, sans toucher aux stats réelles.  
   - Ajouter un récapitulatif de session (tickets simulés).

3. **STORY-B41-P3 – Infrastructure bulles interactives (préparation)**  
   - Mettre en place un système générique de “guided tours” (ex : react-joyride) désactivé par défaut.  
   - Définir le format des scripts de tutoriel (JSON ou Markdown).  
   - Préparer 2-3 bulles placeholders pour futurs parcours (“Créer un ticket”, “Encaisser”).

## 4. Compatibilité & Contraintes

- Mode virtuel totalement isolé des APIs (aucun appel réseau).  
- Doit fonctionner offline sur tablettes en local-first.  
- Aucun impact sur la base de données ni sur les statistiques officielles.  
- Les bulles interactives ne s'affichent pas en mode production tant qu'elles ne sont pas validées.
- **Architecture unifiée** : Les composants sont partagés entre mode réel et virtuel via injection de stores.
- **Clone dynamique** : Les évolutions de la caisse réelle s'appliquent automatiquement à la virtuelle.

## 5. Definition of Done

- [x] Toggle "Caisse virtuelle" disponible et documenté.  
- [x] La simulation reproduit fidèlement les écrans caisse (ajout, encaissement, KPI).  
- [x] Les données simulées sont stockées localement et réinitialisables.  
- [x] Architecture d'injection de stores implémentée (clone dynamique).  
- [x] Routes unifiées pour mode réel et virtuel.  
- [ ] Infrastructure de bulles/tutoriels prête, désactivée par défaut.  
- [x] Guide d'onboarding mis à jour (docs/architecture + runbook formation).

