# Story 17.6 — Journal verification persistance parametres admin

Date : 2026-03-01

## Trace ecriture + relecture + affichage front

1. **PUT** `/v1/admin/settings` avec `{"activity_threshold": 42.5}` → reponse 200, body contient `activity_threshold: 42.5`
2. **GET** `/v1/admin/settings` → memes valeurs retournees (persistance BDD)
3. **AdminSettingsPage** : appelle `getAdminSettings` au chargement → affiche `activity_threshold` dans le champ NumberInput ; `putAdminSettings` apres clic Enregistrer → state local mis a jour et valeur persistee

**Preuve** : tests API pytest 5/5 verts (test_admin_settings.py), phase1 RBAC 9/9 verts sur /v1/admin/settings, preuve archivee dans `17-6-preuve-pytest-admin-settings.txt`.
