# Story 14.2 : Retrouver les écrans de paramètres admin simples observables dans Peintre_nano

Status: done

**Story key :** `14-2-retrouver-les-ecrans-de-parametres-admin-simples-observables-dans-peintre-nano`  
**Epic :** 14

## Périmètre retenu (borné)

- **Inclus** : les hubs CREOS déjà manifestés **`/admin/access`** et **`/admin/site`** (`page-transverse-admin-access-overview.json`, `page-transverse-admin-site-overview.json`) + libellés de navigation servis par le backend (`creos_nav_presentation_labels.py`) alignés sur l'observable legacy (« Accès et visibilité », « Site et périmètre »). Aucune persistance métier inventée côté front.
- **Exclus** : écran super-admin lourd **`/admin/settings`** (`Settings.tsx` legacy), import legacy, ACL détaillée — hors epic (cf. matrice `ui-pilote-14-02-admin-parametres-simples`).

## Livré avec 14.1 / complément 14.2

- Alignement **libellés nav** serveur + cohérence avec les titres de page manifestes existants (Story 5.4).
- Matrice : ligne **`ui-pilote-14-02-admin-parametres-simples`**.

## Gaps

- Widgets **`data_contract`** sur accès / site : toujours documentés comme gaps dans les `PageManifest` (slots `demo.text.block`).

## Preuves MCP

À compléter en session navigateur (conflit MCP noté en 14.1).
