# Instruction Cursor — Intégration décisions P1 et P2 (Peintre_nano)

**Date :** 2026-04-01  
**Destination :** Agent de recherche technique / agent BMAD Cursor  
**Source d'autorité :** `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md`

---

## Contexte

Les décisions ouvertes **P1** (stack CSS / styling) et **P2** (stockage config admin) du concept architectural Peintre_nano sont désormais **fermées** par l'ADR ci-dessus. Ce document donne les instructions pour intégrer ces choix dans les artefacts BMAD et le code.

**Règle :** ne pas modifier les documents de cadrage datés (concept 2026-03-31, pipeline 2026-04-01, extraits 2026-04-01, décision directrice 2026-03-31). L'ADR empile la décision par-dessus. Les artefacts BMAD (architecture, epics, stories) intègrent les choix quand ils sont créés ou mis à jour.

### Arborescence canonique sur le dépôt

Le schéma `src/` → `peintre-nano/` → `shell/`, `registry/`, etc. dans la section **Patterns concrets** ci-dessous est **pédagogique** (dossiers logiques). Sur le monorepo JARVOS_recyclique, le package frontend vit sous **`peintre-nano/`** à la racine du repo (`peintre-nano/src/app/`, `peintre-nano/src/runtime/`, …) comme dans `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`. **Ne pas** créer une arborescence `src/peintre-nano/` à la racine du dépôt en croyant suivre ce document.

---

## Décisions à intégrer

### P1 — Stack CSS / styling

**Choix final :**

- **CSS Modules** (fichiers `.module.css`) pour le scoping de tous les composants (shell + widgets).
- **Design tokens** en **CSS variables** dans un fichier unique `tokens.css` (source de vérité visuelle : couleurs, spacing, radius, typo, breakpoints).
- **Mantine v8** comme bibliothèque de composants riches — consommée comme source de widgets intégrables, pas comme framework CSS de base.

**Interdictions fermes (à traiter comme violations de contrat si rencontrées) :**

- Pas de Tailwind CSS.
- Pas d'Emotion / styled-components / CSS-in-JS runtime.
- Pas de fichier `utilities.css` ou équivalent global.
- Pas de valeurs CSS en dur dans les composants (toujours `var(--token-name)`).
- Pas de classes CSS dans les manifests, props CREOS, ou JSON DSL.
- Pas de `MantineProvider`, `sx`, ou `styles` API Mantine dans les manifests/props CREOS.

**Patterns concrets attendus dans le code :**

```
src/
  styles/
    tokens.css              ← design tokens CSS variables, source unique
  peintre-nano/
    shell/
      Shell.tsx
      Shell.module.css      ← layout global CSS Grid + zones nommées
    slots/
      Slot.tsx
      Slot.module.css
    flows/
      FlowRenderer.tsx
      FlowRenderer.module.css
    registry/
      ModuleRegistry.ts
  modules/
    membership/
      MemberSummaryCard.tsx
      MemberSummaryCard.module.css   ← layout interne uniquement
      manifest.json                  ← manifest CREOS (pas de CSS dedans)
    cashdesk/
      ...
```

**Exemple de widget correctement stylé :**

```css
/* tokens.css */
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --radius-sm: 4px;
  --radius-md: 8px;
  --color-primary: #2563eb;
  --color-surface: #ffffff;
  --color-border: #e5e7eb;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
}
```

```css
/* MemberSummaryCard.module.css */
.root {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
}

.header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.name {
  font-size: var(--font-size-base);
  font-weight: 600;
}

.badge {
  font-size: var(--font-size-sm);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
}
```

```tsx
// MemberSummaryCard.tsx
import styles from './MemberSummaryCard.module.css';

interface MemberSummaryCardProps {
  member_id: string;
  show_photo?: boolean;
  compact?: boolean;
}

export function MemberSummaryCard({ member_id, show_photo = true, compact }: MemberSummaryCardProps) {
  // ... data fetching / logic
  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.name}>{member.name}</span>
        <span className={styles.badge}>{member.status}</span>
      </div>
      {/* ... */}
    </div>
  );
}
```

**Mantine — usage correct :**

```tsx
// Usage Mantine pour composant riche — OK
import { DatePickerInput } from '@mantine/dates';
import styles from './MemberForm.module.css';

export function MemberForm() {
  return (
    <div className={styles.root}>
      {/* Mantine pour le composant riche, CSS Modules pour le layout */}
      <DatePickerInput label="Date d'adhésion" />
    </div>
  );
}
```

**Mantine — usage interdit :**

```tsx
// ❌ INTERDIT — ne pas dépendre de Mantine pour le layout ou la composition
import { Stack, Group } from '@mantine/core';
export function MemberForm() {
  return (
    <Stack gap="md">          {/* ❌ layout via Mantine au lieu de CSS Modules */}
      <Group justify="apart">  {/* ❌ idem */}
        ...
      </Group>
    </Stack>
  );
}
```

### P2 — Stockage config admin

**Choix final :** PostgreSQL (déjà en stack).

**Modèle :**

- Manifests CREOS build = source primaire (fichiers livrés avec le build).
- Table PostgreSQL = surcharges admin uniquement (modules actifs/inactifs, ordre de blocs, variantes simples).
- Fusion déterministe au démarrage : manifests build + surcharges PostgreSQL → config résultante.
- Chaque surcharge porte : auteur, date, motif (traçabilité exigée par la décision directrice).

---

## Quand appliquer ces instructions

- **Création de nouveaux fichiers** : appliquer immédiatement.
- **Modification de fichiers existants** : appliquer si le fichier touché concerne le styling, la config admin, ou les patterns de composants.
- **Artefacts BMAD** (architecture, epics, stories) : intégrer P1/P2 quand ils sont créés ou mis à jour — ne pas faire de mise à jour spéciale juste pour ça.
- **Documents de cadrage amont** (concept, pipeline, extraits, décision directrice) : **ne pas modifier** — l'ADR fait foi.

---

## Vérifications (pour QA ou revue)

- [ ] Aucun import Tailwind, Emotion, styled-components dans `package.json`
- [ ] Aucun fichier `utilities.css` ou équivalent global
- [ ] Tous les composants Peintre_nano utilisent `.module.css`
- [ ] Aucune valeur CSS en dur (couleurs, spacing, radius) — toujours `var(--token-name)`
- [ ] `tokens.css` est le seul endroit où les valeurs concrètes sont définies
- [ ] Mantine utilisé uniquement pour composants riches, jamais pour layout (`Stack`, `Group`, `SimpleGrid` interdits comme substituts au CSS Grid / CSS Modules)
- [ ] Aucune classe CSS dans les manifests JSON ou props CREOS
- [ ] Table config admin en PostgreSQL avec colonnes de traçabilité (auteur, date, motif)

---

*Instruction Cursor — P1 + P2 — 2026-04-01*  
*Emplacement recommandé : `references/peintre/2026-04-01_instruction-cursor-p1-p2.md`*
