# Charte visuelle operatoire - Epic 11

Date: 2026-02-28
Version: 1.0

## 1) But

Fournir un referentiel visuel executable pour converger vers la parite 1.4.4 sans interpretation libre.

## 2) App shell (global)

- Header/bandeau:
  - hauteur stable sur toutes les pages
  - alignement horizontal strict (logo, titre, actions)
  - pas de variation de padding selon page
- Menu lateral:
  - largeur fixe
  - etat actif/inactif identique 1.4.4
  - ordre des entrees conforme au domaine
- Zone contenu:
  - grille et marges constantes
  - meme densite verticale que 1.4.4

## 3) Tokens visuels obligatoires

- Couleurs:
  - palette primaire/secondaire/alerte issue de 1.4.4
  - pas de nouvelle couleur sans validation
- Typographie:
  - meme famille, meme echelle (h1..h6, body, caption)
  - line-height et weight alignes
- Espacements:
  - echelle unique (ex: 4/8/12/16/24/32)
  - usage coherent sur cards, forms, tableaux
- Radius / bordures / ombres:
  - valeurs fixes, pas d'impro local

## 4) Composants critiques a normaliser

- Boutons (primaire, secondaire, danger, disabled)
- Champs de formulaire (normal, focus, erreur)
- Tables (header, lignes, zebra, hover, pagination)
- Alertes/messages (info, warning, error, success)
- Modales/drawers

## 5) Regles d implementation

- Reutiliser des composants partages, eviter les styles inline.
- Centraliser les tokens dans theme/shared.
- Interdit: patch CSS local "temporaire" sans ticket de nettoyage.
- Interdit: copier-coller de styles non traces.

## 6) Preuves et controle

- Pour chaque ecran modifie:
  - capture AVANT
  - capture APRES
  - check rapide console
- Toute divergence restante doit etre notee explicitement.
