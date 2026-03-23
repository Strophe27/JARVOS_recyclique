# 19-2 — Spec delta : capture 1.4.4 vs code actuel (AdminCategoriesPage)

Date : 2026-03-16
Fichier source : `frontend/src/admin/AdminCategoriesPage.tsx`
Composants auxiliaires : `frontend/src/shared/layout/PageLayout.tsx`, `frontend/src/shared/theme/tokens.ts`

---

## Vue d'ensemble des ecarts majeurs

Le code actuel utilise un layout **Table multi-colonnes avec headers** (Nom, Nom officiel, Prix, Visible, Ordre, Statut, Actions). La capture 1.4.4 montre un **arbre hierarchique simple sans table**, avec des lignes de type card et seulement : grip handle, chevron, checkbox, nom (avec prefixe), champ ordre, icone edit, icone delete.

L'ecart structurel est significatif : il ne s'agit pas d'ajustements CSS mais d'une **refonte du rendu de l'arbre** (passer de Table a liste plate/Stack).

---

## Zone 1 : Header (titre + sous-titre + boutons d'action)

### Ce que montre la capture 1.4.4 :

- **Titre** : "Gestion des Categories" en gras, grande taille (~24-28px), noir, aligne a gauche.
- **Sous-titre** : "Gerer les categories de produits utilisees dans l'application" en petit (~13-14px), gris clair, directement sous le titre.
- **Boutons** : 4 boutons alignes horizontalement a **droite du titre, sur la meme ligne** :
  1. **"Importer"** — variant outlined/light, bordure bleue (#228be6 ~), texte bleu, coins arrondis (~8px), icone upload (fleche vers le haut dans un cadre) a gauche du texte.
  2. **"Exporter"** — meme style outlined, icone download (fleche vers le bas) a gauche.
  3. **"Actualiser"** — meme style outlined, icone refresh (fleches circulaires) a gauche.
  4. **"+ Nouvelle categorie"** — variant **filled bleu** (#228be6), texte blanc, icone + a gauche.
- **Pas de breadcrumbs** visibles.
- Layout : le titre+sous-titre et les boutons sont sur un seul bandeau horizontal (titre a gauche, boutons a droite, alignes verticalement au centre).

### Ce que fait le code actuel :

- Titre via `PageContainer` → `<Title order={1}>` dans un `<Stack>` vertical.
- Sous-titre : `<Text size="sm" c="dimmed">` sous le titre.
- **Breadcrumbs** (`Admin > Categories`) entre sous-titre et boutons — **absent dans la capture**.
- Boutons dans un `<Group>` separe en dessous, empiles verticalement par rapport au titre :
  - "Telecharger modele CSV" (variant="light") — **absent dans la capture**.
  - "Importer CSV" (variant="light") — **nom different**, pas d'icone.
  - "Exporter CSV" (variant="filled") — **nom different**, pas d'icone.
  - "Nouvelle categorie" (variant="filled", IconPlus) — icone OK mais nom sans "+".
  - **Pas de bouton "Actualiser"**.
- Aucun bouton n'a d'icone sauf "Nouvelle categorie" (IconPlus).

### Delta / Corrections requises :

1. **Supprimer** le composant `<Breadcrumbs>` (lignes 689-692).
2. **Restructurer le header** : titre+sous-titre a gauche, boutons a droite, sur une meme ligne horizontale. Utiliser `<Group justify="space-between" align="flex-start">` englobant titre+sous-titre (Stack) et boutons (Group).
3. **Renommer les boutons** :
   - "Telecharger modele CSV" → supprimer (deplacer dans la modale import si necessaire).
   - "Importer CSV" → **"Importer"**.
   - "Exporter CSV" → **"Exporter"**.
   - Ajouter un bouton **"Actualiser"** avec `onClick={loadHierarchy}`.
4. **Ajouter les icones** aux boutons :
   - Importer : `IconUpload` (ou `IconFileImport`).
   - Exporter : `IconDownload` (ou `IconFileExport`).
   - Actualiser : `IconRefresh`.
   - Nouvelle categorie : `IconPlus` (deja present).
5. **Style des boutons** :
   - Importer, Exporter, Actualiser : `variant="outline"` (bordure bleue, fond transparent, texte bleu).
   - Nouvelle categorie : `variant="filled"` couleur bleue (OK).
6. **Imports a ajouter** : `IconUpload`, `IconDownload`, `IconRefresh` depuis `@tabler/icons-react`.

---

## Zone 2 : Barre de controles (checkbox, recherche, tri, type de ticket)

### Ce que montre la capture 1.4.4 :

Une barre horizontale unique, **en dehors du card principal**, contenant de gauche a droite :

- **Checkbox** : case non cochee + label "Afficher les elements archives" — aligne a gauche.
- **Recherche** : champ texte avec icone loupe (🔍), placeholder "Rechercher une categorie...", bordure grise arrondie, ~250-300px de large — au centre.
- **"Trier par"** : un petit label gris ("Trier par") au-dessus d'un `<Select>` avec icone sort (fleches haut/bas ↕) suivi de "Ordre d'affichage" — a droite.
- **"Type de ticket"** : un petit label gris ("Type de ticket") au-dessus de deux boutons toggle cote a cote :
  - "Caisse" — apparence non selectionnee (texte simple, pas de bordure forte).
  - "Reception" — apparence selectionnee (bordure noire/forte, fond blanc).
  - Ce n'est PAS un SegmentedControl Mantine (pas de fond gris continu) mais des boutons toggle individuels.

### Ce que fait le code actuel :

- **Checkbox** : dans le `<Group>` des boutons d'action en haut (mauvaise position), melangee avec les boutons import/export.
- **SegmentedControl** ("Vue Caisse" / "Vue Reception") : **a l'interieur** du Card/PageSection, premiere ligne du card — mauvaise position et mauvais labels.
- **Search** et **Sort** : **a l'interieur** du Card, dans un Group separe — mauvaise position.
- **Pas de label** "Trier par" au-dessus du Select.
- **Pas de label** "Type de ticket" au-dessus du toggle.
- **Pas d'icone sort** (↕) dans le Select.
- Les labels du toggle sont "Vue Caisse" / "Vue Reception" au lieu de "Caisse" / "Reception".

### Delta / Corrections requises :

1. **Extraire tous les controles** du Card et les placer dans une barre horizontale dediee, **entre le header et le card principal**.
2. **Layout** : `<Group justify="space-between">` avec :
   - Gauche : Checkbox "Afficher les elements archives".
   - Centre : TextInput recherche (~250-300px).
   - Droite : Group contenant le Select tri + toggle type ticket.
3. **Label "Trier par"** : ajouter un `<Text size="xs" c="dimmed">` au-dessus du Select.
4. **Icone sort** : ajouter `leftSection={<IconArrowsSort size={16} />}` au Select (import `IconArrowsSort`).
5. **Label "Type de ticket"** : ajouter un `<Text size="xs" c="dimmed">` au-dessus du toggle.
6. **Remplacer SegmentedControl** par deux `<Button>` toggle (ou un `<Button.Group>`) :
   - Labels : "Caisse" / "Reception" (sans "Vue").
   - Etat actif : `variant="outline"` avec bordure forte (`color="dark"`), fond blanc.
   - Etat inactif : `variant="subtle"` ou texte simple.
7. **Deplacer la checkbox** hors du group des boutons, dans la barre de controles.

---

## Zone 3 : Alerte "Mode Reception"

### Ce que montre la capture 1.4.4 :

- **Titre** : "Mode Reception" en texte **orange/corail** (~#e57c23 ou similaire), taille ~16px, gras, affiche en tant que heading autonome au-dessus du corps de l'alerte.
- **Corps** : bloc texte dans un container a fond **gris tres clair/bleu pale** (#f0f4f8 ~), coins arrondis, avec le texte explicatif : "Dans ce mode, vous pouvez gerer la visibilite et l'ordre d'affichage des categories pour les tickets de reception. Utilisez les cases a cocher pour afficher/masquer les categories dans les tickets de reception."
- L'ensemble est a l'interieur de la zone de contenu, sous la barre de controles.
- Le titre orange est visuellement separe du corps (pas dans le meme Alert box).

### Ce que fait le code actuel :

- Un seul `<Alert color="blue">` avec le texte du corps — **pas de titre "Mode Reception" separe**.
- Tout est dans une seule Alert Mantine bleue, a l'interieur du Card.
- Pas de heading orange.

### Delta / Corrections requises :

1. **Ajouter un heading** `<Text fw={700} c="orange" size="md">Mode Reception</Text>` au-dessus de l'alerte.
2. **Ajuster l'Alert** : utiliser `color="gray"` ou un fond custom light gray/bleu pale pour le corps du message (pas blue).
3. **Structure** : Stack vertical avec le titre orange puis l'Alert corps, le tout visible quand `viewMode === 'reception'`.
4. **Position** : a l'interieur du card/zone de contenu, sous les controles (qui seront au-dessus du card), au-dessus des boutons deplier/replier.

---

## Zone 4 : Boutons "Tout deplier" / "Tout replier"

### Ce que montre la capture 1.4.4 :

- Deux **liens texte bleus** cote a cote, alignes a gauche :
  - "⟱ Tout deplier" — icone double chevron vers le bas, puis texte bleu.
  - "⟰ Tout replier" — icone double chevron vers le haut, puis texte bleu.
- Style : texte bleu (~14px), pas de fond, pas de bordure, aspect "lien cliquable".
- Position : ligne dediee entre l'alerte et le premier element de l'arbre.
- Espacement : ~12-16px entre l'alerte et ces liens, ~12-16px entre ces liens et la premiere ligne de l'arbre.

### Ce que fait le code actuel :

- Deux `<ActionIcon variant="subtle">` enveloppees dans `<Tooltip>` (icone seule, pas de texte visible).
- Position : dans le header du Card, a cote du SegmentedControl — **pas au bon endroit**.
- Pas de texte visible "Tout deplier" / "Tout replier", seulement des icones avec tooltips.

### Delta / Corrections requises :

1. **Remplacer** les ActionIcon par des `<Button variant="subtle" size="sm">` avec texte :
   - `leftSection={<IconChevronsDown size={16} />}` + texte "Tout deplier".
   - `leftSection={<IconChevronsUp size={16} />}` + texte "Tout replier".
2. **Deplacer** ces boutons dans une ligne dediee entre l'alerte Mode Reception et l'arbre des categories.
3. **Style** : couleur texte bleue, pas de background, aspect lien.

---

## Zone 5 : Arbre des categories — Structure generale

### Ce que montre la capture 1.4.4 :

L'arbre est rendu comme une **liste plate de lignes card-like**, PAS comme un `<Table>` :
- **Pas de header de colonnes** (pas de "Nom", "Nom officiel", "Prix", etc.).
- Chaque ligne est un **bandeau horizontal** avec fond blanc, separation par espacement vertical (~4-8px entre les lignes) ou bordure tres subtile.
- Le contenu de chaque ligne est reparti horizontalement :
  - **Gauche** : grip handle + chevron (si parent) + checkbox + nom avec prefixe.
  - **Droite** : champ ordre (NumberInput) + icone edit + icone delete.
- Pas de colonnes pour : "Nom officiel", "Prix", "Visible caisse/reception" (label), "Statut", "Actions" (label).

### Ce que fait le code actuel :

- Utilise `<Table striped highlightOnHover>` avec `<Table.Thead>` contenant 8 colonnes :
  - Col 1 : grip (w=40).
  - Col 2 : Nom (avec indentation).
  - Col 3 : Nom officiel.
  - Col 4 : Prix (badge, en mode sale).
  - Col 5 : Visible caisse / Visible reception.
  - Col 6 : Ordre caisse / Ordre reception.
  - Col 7 : Statut ("Active" / "Archivee").
  - Col 8 : Actions (boutons texte "Modifier", "Archiver", "Suppression definitive").

### Delta / Corrections requises :

1. **Remplacer** `<Table>` par un `<Stack gap={4}>` (ou `gap="xs"`) contenant des lignes individuelles.
2. **Supprimer** `<Table.Thead>` entierement (pas de headers de colonnes).
3. Chaque ligne doit etre un `<Group justify="space-between">` (ou flex) dans un container (Box/Paper) avec :
   - Fond blanc, border-radius ~6-8px, eventuellement bordure subtile.
4. Le `SortableRow` doit etre refactore pour wrapper un `<Box>` / `<Paper>` au lieu d'un `<Table.Tr>`.
5. Adapter `SortableContext` pour fonctionner avec des div au lieu de tr.

---

## Zone 6 : Contenu de chaque ligne — partie gauche

### Ce que montre la capture 1.4.4 :

De gauche a droite pour chaque ligne :

1. **Grip handle** (`::`) : 6 points verticaux (2 colonnes x 3 rangees), couleur gris moyen (#adb5bd ~), taille ~16px. Le grip est **indente avec le contenu** selon la profondeur.
2. **Chevron** (uniquement pour les categories parentes) : `▾` (ouvert/expanded) ou `▸` (ferme). Couleur grise/noire. ~16px. Les feuilles n'ont PAS d'espace reserve pour le chevron (pas de spacer vide de 20px).
3. **Checkbox** : case a cocher bleue (#228be6), cochee (✓) pour les categories visibles. Taille standard Mantine (~18x18px).
4. **Nom avec prefixe** :
   - **Categories racine** (depth 0) : format `(CODE) Nom complet` — ex: "(ABJ) Articles de bricolage et de jardin". Le code entre parentheses est l'abreviation courte (`name` dans le modele actuel). Le nom complet est `official_name`. Texte **gras** (fw=700). Couleur noire.
   - **Sous-categories** (depth > 0) : format `* Nom` — ex: "* Baches", "* Gros equipement de jardin sup80cm". Le `*` est un marqueur visuel pour les enfants. Texte **normal** (fw=400). Couleur noire.

### Ce que fait le code actuel :

1. **Grip** : dans une `<Table.Td>` dediee, toujours en colonne 1 (pas indente avec la profondeur).
2. **Chevron** : dans la colonne Nom, avec un spacer `<Box style={{width:20}}>` pour les feuilles (reserve un espace meme sans chevron).
3. **Checkbox** : dans une colonne separee "Visible caisse/reception" — **pas inline avec le nom**.
4. **Nom** : affiche `node.name` sans aucun prefixe (pas de "(CODE)" ni de "* "). Un tooltip montre `official_name` si present. Le nom officiel est aussi dans une colonne separee.

### Delta / Corrections requises :

1. **Indentation du grip** : le grip handle doit etre **decale a droite** selon la profondeur, pas fixe en colonne 1. Appliquer `marginLeft` ou `paddingLeft` au conteneur de la ligne entiere selon `getHierarchyIndentPx(depth)`.
2. **Chevron sans spacer** : pour les feuilles, ne PAS reserver d'espace pour le chevron. Le checkbox suit directement le grip.

   Note : en regardant plus attentivement la capture, il semble qu'il y ait un leger espace entre le grip et le checkbox pour les feuilles, mais pas de 20px comme dans le code actuel. Verifier si un petit gap (~4-8px) suffit.

3. **Checkbox inline** : deplacer la checkbox de visibilite (actuellement colonne separee) pour qu'elle soit **inline dans la ligne, entre le chevron et le nom**.
4. **Prefixes de nom** :
   - Depth 0 : afficher `({node.name}) {node.official_name ?? node.name}`. Si `official_name` existe, format = "(name) official_name". Sinon, afficher juste le name en gras.
   - Depth > 0 : afficher `* {node.name}`.
   - Implementation : une petite fonction helper `formatCategoryLabel(node, depth)`.
5. **Supprimer** la colonne "Nom officiel" separee (Table.Td avec `node.official_name`).
6. **Bold** : root categories (depth===0) en gras (deja fait dans le code avec `fw={depth === 0 ? 700 : undefined}`).

---

## Zone 7 : Contenu de chaque ligne — partie droite

### Ce que montre la capture 1.4.4 :

De gauche a droite sur la partie droite de chaque ligne :

1. **Champ ordre** : `<NumberInput>` compact, affichant "0", avec boutons spinner haut/bas integres. Largeur ~50-60px. Bordure grise subtile, coins arrondis.
2. **Icone edit** : icone crayon (✏️) dans un carre/cercle a fond bleu clair, couleur bleu. Taille ~28-32px. C'est un `<ActionIcon>` Mantine, `variant="light"`, couleur bleue.
3. **Icone delete** : icone poubelle (🗑) dans un carre/cercle a fond rouge clair/corail, couleur rouge/corail. Taille ~28-32px. C'est un `<ActionIcon>` Mantine, `variant="light"`, couleur rouge.

Espacement entre les trois : ~8-12px.

### Ce que fait le code actuel :

1. **Champ ordre** : `<InlineOrderInput>` via `<NumberInput size="xs" w={70}>` — taille et style proches mais en colonne separee. `w={70}` → reduire a ~60px.
2. **Actions** : trois `<Button>` texte en colonnes Actions :
   - "Modifier" (variant="light", IconEdit) — **devrait etre un ActionIcon** sans texte.
   - "Archiver" (variant="light", color="orange", IconArchive) — **absent dans la capture** (remplace par l'icone delete).
   - "Suppression definitive" (variant="light", color="red") — **absent dans la capture**.
3. Pas de colonne "Statut" dans la capture.

### Delta / Corrections requises :

1. **Supprimer** les colonnes "Statut" et la colonne "Actions" avec les boutons texte.
2. **Remplacer** les boutons texte par deux `<ActionIcon>` :
   - **Edit** : `<ActionIcon variant="light" color="blue" onClick={() => handleEditClick(node)}>` avec `<IconEdit size={16} />`.
   - **Delete/Archive** : `<ActionIcon variant="light" color="red" onClick={() => handleArchive(node.id)}>` avec `<IconTrash size={16} />`.
3. **Largeur du NumberInput** : reduire de `w={70}` a `w={60}`.
4. **Logique archive vs delete** : l'icone trash dans la capture semble correspondre a l'archivage (soft delete). Le hard delete et la restauration ne sont accessibles que depuis la modale d'edition ou quand "Afficher les elements archives" est coche. Garder la logique mais changer l'UI :
   - Elements actifs : trash icon → `handleArchive(node.id)`.
   - Elements archives (affiches si checkbox cochee) : ajouter une icone restore et une icone hard-delete a la place.
5. **Supprimer** la colonne "Prix" (non visible dans la capture 1.4.4 en mode reception ; en mode caisse, le prix n'est pas montre en colonne mais eventuellement via un badge sur le nom ou dans la modale).

---

## Zone 8 : Indentation des sous-categories

### Ce que montre la capture 1.4.4 :

- **Depth 0** (racine) : grip handle aligne a gauche (~8px du bord).
- **Depth 1** (enfant direct) : toute la ligne (grip + contenu) decalee de ~30-40px vers la droite.
- **Depth 2** (petit-enfant) : toute la ligne decalee de ~60-80px vers la droite.
- L'indentation affecte l'**ensemble de la ligne**, pas seulement le texte du nom.
- Visuellement, on voit clairement la hierarchie par le decalage progressif.

### Ce que fait le code actuel :

- L'indentation est appliquee **uniquement** au contenu de la cellule Nom via `pl={getHierarchyIndentPx(depth)}`.
- Le grip handle est toujours en colonne 1, flush a gauche.
- `getHierarchyIndentPx(depth)` = `depth * 16 + 8` px.
- Resultat : seul le nom est indente, le grip et les autres colonnes restent alignes.

### Delta / Corrections requises :

1. **Appliquer l'indentation a la ligne entiere** : `paddingLeft` ou `marginLeft` sur le conteneur de la ligne (le Box/Group qui remplacera Table.Tr).
2. **Valeur d'indentation** : augmenter le facteur. Actuellement `depth * 16`, la capture suggere plutot `depth * 32` ou `depth * 28` pour un decalage plus visible.
3. **Garder `getHierarchyIndentPx`** mais ajuster la formule, ou bien calculer directement dans le composant.

---

## Zone 9 : Card / conteneur principal

### Ce que montre la capture 1.4.4 :

- Les controles (checkbox, recherche, tri, toggle) sont **en dehors** du card principal.
- Le card principal contient :
  - L'alerte Mode Reception (si applicable).
  - Les liens Tout deplier / Tout replier.
  - L'arbre des categories.
- Le card a un fond blanc, des coins arrondis (~8-12px), une bordure subtile ou ombre legere.
- Pas de `striped` ni de `highlightOnHover` type table.

### Ce que fait le code actuel :

- `<PageSection>` → `<Paper p="lg" shadow="sm" radius="md" withBorder>` contient un `<Card withBorder padding="md" radius="md">` → **double nesting** Paper > Card.
- A l'interieur du Card : SegmentedControl, ActionIcons expand/collapse, Sort, Search, Alert, Table — **tout est dedans**.

### Delta / Corrections requises :

1. **Sortir** les controles (checkbox, recherche, tri, toggle) du Card pour les placer au-dessus (Zone 2).
2. **Simplifier** le nesting : un seul conteneur (Paper ou Card, pas les deux). Utiliser `<Paper withBorder shadow="sm" radius="md" p="md">`.
3. **Contenu du card** : alerte Mode Reception (si reception) + boutons deplier/replier + arbre.
4. **Supprimer** `<Table striped highlightOnHover>` et remplacer par un `<Stack>`.

---

## Zone 10 : Style des lignes de l'arbre

### Ce que montre la capture 1.4.4 :

- Chaque ligne a un fond blanc pur.
- **Separation** : petit espace vertical (~4px) entre les lignes OU une bordure bottom subtile (1px #eee).
- Les lignes racine semblent avoir un fond tres legerement gris clair (#f8f9fa ~) pour se distinguer.
- **Hover** : non visible dans la capture statique, mais probablement un fond gris tres clair.
- Hauteur de ligne : ~48-52px pour les lignes racine, ~44-48px pour les enfants.
- Le grip handle (::) est gris moyen, les icones edit/delete sont dans des ActionIcon avec fond colore.

### Ce que fait le code actuel :

- `<Table striped highlightOnHover>` — alternance zebra + surlignage hover.
- Table.Tr standard avec padding de cellule Mantine par defaut.
- Pas de distinction visuelle entre racine et enfants (sauf le gras sur le nom).

### Delta / Corrections requises :

1. **Supprimer** le striped/highlightOnHover (plus de Table).
2. Chaque ligne : `<Box>` ou `<Group>` avec :
   - `bg="white"` (ou eventuellement `bg="#f8f9fa"` pour les racines).
   - `py="sm"` (padding vertical ~12px).
   - `px="md"` (padding horizontal ~16px).
   - `style={{ borderBottom: '1px solid #f1f3f5' }}` pour la separation.
3. **Hover** optionnel : ajouter un `_hover` style si Mantine le permet, ou un CSS module.

---

## Zone 11 : Colonnes absentes de la capture

### Colonnes presentes dans le code mais ABSENTES de la capture 1.4.4 :

| Colonne code         | Present dans capture ? | Action                |
|----------------------|------------------------|-----------------------|
| Nom officiel         | Non                    | Supprimer la colonne  |
| Prix (badge)         | Non                    | Supprimer la colonne  |
| Visible (checkbox)   | Oui, mais inline       | Deplacer inline       |
| Ordre (NumberInput)  | Oui, a droite          | Garder, deplacer      |
| Statut (Active/Archivee) | Non                | Supprimer la colonne  |
| Actions (3 boutons texte) | Oui, mais icones  | Remplacer par icones  |

---

## Zone 12 : Recapitulatif des imports a ajouter/modifier

### Imports a ajouter :

```typescript
import {
  IconUpload,     // ou IconFileImport
  IconDownload,   // ou IconFileExport
  IconRefresh,
} from '@tabler/icons-react';
```

### Imports a potentiellement retirer (si Table supprimee) :

```typescript
// Retirer de Mantine :
Table,
// Retirer de @tabler/icons-react (si non utilises ailleurs) :
IconArchive,
IconArchiveOff,
// Badge peut etre retire si prix non affiche
Badge,
```

---

## Zone 13 : Prefixes de noms — specification detaillee

### Logique de prefixe dans la capture 1.4.4 :

La capture montre :
- **(ABJ) Articles de bricolage et de jardin** — pour une racine.
- **\* Baches** — pour un enfant.
- **\* Gros equipement de jardin sup80cm** — pour un enfant.
- **\* Gros Equipements de Bricolage (sup 80 cm)** — pour un enfant plus profond.

#### Interpretation probable :

- **Racine** : le champ `name` du modele contient le code court (ex: "ABJ"). Le champ `official_name` contient le nom complet. L'affichage est : `(name) official_name`.
  - Si `official_name` est null/vide : afficher juste `name` en gras.
- **Enfant** : afficher `* name`.

#### Implementation suggeree :

```typescript
function formatCategoryDisplayName(
  node: CategoryHierarchyNode,
  depth: number,
): string {
  if (depth === 0 && node.official_name) {
    return `(${node.name}) ${node.official_name}`;
  }
  if (depth > 0) {
    return `* ${node.name}`;
  }
  return node.name;
}
```

#### Note sur les donnees :

Le modele `CategoryResponse` n'a pas de champ `abbreviation` ou `code`. Le format `(ABJ)` dans la 1.4.4 utilisait probablement `name` comme code court et `official_name` comme nom complet. Verifier que les donnees en base respectent cette convention. Si `name` contient le nom complet et non le code, il faudra :
- Soit ajouter un champ `code` au modele backend.
- Soit generer l'abreviation cote frontend a partir des initiales.
- Soit adapter l'affichage si les donnees ne correspondent pas.

---

## Zone 14 : Toggle "Type de ticket" — specification detaillee

### Ce que montre la capture 1.4.4 :

- Deux boutons rectangulaires cote a cote :
  - **"Caisse"** : fond blanc, texte gris/noir, bordure subtile. Non selectionne.
  - **"Reception"** : fond blanc, texte noir, **bordure noire forte** (~2px). Selectionne.
- Pas de fond gris continu derriere (ce n'est PAS un SegmentedControl Mantine).
- Les boutons sont compacts, meme hauteur que le Select voisin.

### Implementation suggeree :

```tsx
<Button.Group>
  <Button
    variant={viewMode === 'sale' ? 'filled' : 'default'}
    color={viewMode === 'sale' ? 'dark' : 'gray'}
    size="sm"
    onClick={() => setViewMode('sale')}
  >
    Caisse
  </Button>
  <Button
    variant={viewMode === 'reception' ? 'filled' : 'default'}
    color={viewMode === 'reception' ? 'dark' : 'gray'}
    size="sm"
    onClick={() => setViewMode('reception')}
  >
    Reception
  </Button>
</Button.Group>
```

Ou alternative plus fidele avec outline + bordure forte :

```tsx
<Button
  variant={viewMode === 'reception' ? 'outline' : 'subtle'}
  color="dark"
  size="sm"
  styles={viewMode === 'reception' ? { root: { borderWidth: 2 } } : undefined}
>
  Reception
</Button>
```

---

## Zone 15 : DnD (Drag and Drop) — adaptation

### Impact du changement Table → Stack :

Le code actuel utilise `<SortableContext>` avec `<Table.Tr>` via `useSortable`. En passant a des `<Box>` / `<Group>` :

1. `SortableRow` doit wrapper un `<Box>` au lieu d'un `<Table.Tr>`.
2. Le `ref={setNodeRef}` s'applique au `<Box>`.
3. Le `CSS.Transform.toString(transform)` reste valide.
4. `verticalListSortingStrategy` reste valide.

### Modification du SortableRow :

```tsx
function SortableRow({
  id,
  disabled,
  dimmed,
  testId,
  children,
  depth,
}: {
  id: string;
  disabled?: boolean;
  dimmed?: boolean;
  testId?: string;
  children: (listeners: Record<string, unknown> | undefined) => React.ReactNode;
  depth: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(
      transform ? { ...transform, scaleX: 1, scaleY: 1 } : null,
    ),
    transition: transition ?? undefined,
    opacity: isDragging || dimmed ? 0.5 : 1,
    paddingLeft: getHierarchyIndentPx(depth),
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      data-testid={testId}
      py="sm"
      px="md"
      bg="white"
    >
      {children(disabled ? undefined : listeners)}
    </Box>
  );
}
```

---

## Zone 16 : Resume des suppressions

Elements du code actuel a **supprimer** car absents de la capture 1.4.4 :

1. `<Breadcrumbs>` (lignes 689-692).
2. Bouton "Telecharger modele CSV" (lignes 702-709).
3. `<Table>`, `<Table.Thead>`, `<Table.Tbody>`, toutes les `<Table.Th>` et `<Table.Td>`.
4. Colonne "Nom officiel" (`<Table.Td>{node.official_name ?? '—'}</Table.Td>`).
5. Colonne "Prix" avec Badge.
6. Colonne "Statut" ("Active" / "Archivee").
7. Boutons texte "Modifier", "Archiver", "Suppression definitive" → remplaces par ActionIcons.
8. `<SegmentedControl>` → remplace par Button toggle.
9. ActionIcons pour deplier/replier (remplaces par boutons texte).

---

## Zone 17 : Resume des ajouts

Elements a **ajouter** car presents dans la capture mais absents du code :

1. Bouton "Actualiser" avec icone refresh.
2. Icones sur les boutons Importer et Exporter.
3. Labels "Trier par" et "Type de ticket" au-dessus de leurs controles.
4. Icone sort (↕) dans le Select de tri.
5. Heading "Mode Reception" en orange au-dessus de l'alerte.
6. Texte "Tout deplier" / "Tout replier" visible (pas seulement icones).
7. Prefixe "(CODE)" pour les racines et "* " pour les enfants.
8. ActionIcon edit (crayon bleu) et delete (poubelle rouge) a la place des boutons texte.

---

## Checklist d'implementation (ordre suggere)

1. [ ] Restructurer le header (titre + boutons meme ligne).
2. [ ] Ajouter/renommer les boutons d'action avec icones.
3. [ ] Supprimer les Breadcrumbs.
4. [ ] Creer la barre de controles (checkbox, search, sort, toggle) hors du card.
5. [ ] Remplacer SegmentedControl par toggle buttons "Caisse" / "Reception".
6. [ ] Ajouter labels "Trier par" et "Type de ticket".
7. [ ] Refactorer l'alerte Mode Reception (heading orange + corps).
8. [ ] Transformer les ActionIcons deplier/replier en boutons texte.
9. [ ] Remplacer `<Table>` par `<Stack>` avec lignes Box/Group.
10. [ ] Refactorer SortableRow pour Box au lieu de Table.Tr.
11. [ ] Reorganiser chaque ligne : grip | chevron | checkbox | nom prefixe | ... | ordre | edit icon | delete icon.
12. [ ] Appliquer l'indentation a la ligne entiere.
13. [ ] Supprimer les colonnes inutiles (nom officiel, prix, statut, actions texte).
14. [ ] Ajouter la logique de prefixe de nom.
15. [ ] Ajuster les styles (fond, espacement, bordures).
16. [ ] Verifier le DnD avec le nouveau layout.
17. [ ] Tests : adapter les tests existants si les testIds changent.
18. [ ] Build + lint clean.
