# Journal de maintenance — documentation produit (`recyclique-1.4.4/docs`)

## 2026-03-27 — Mission 12A (nettoyage mentions messager legacy)

- **Périmètre** : docs produit actives listées en mission 12A (README racine livrable, `docs/index.md`, brief, story 1.2 détaillée, `architecture-current/`, `architecture/` hors `architecture.old/`, `prd/`, `guides/`, `runbooks/`, `training/`, `epics/`), plus neutralisation de `docs/architecture_old.md` et `docs/guide-tests-utilisateur.md` comme docs racine proches.
- **Hors périmètre volontaire** : `docs/archive/**`, `docs/v1.3.0-active/**`, `docs/architecture.old/**`, `references/**`, `docs/qa/**`, `docs/migrations/**`, `docs/pending-tech-debt/**`, etc.
- **Actions** : reformulation ou retrait des mentions du messager legacy et des identifiants techniques associés dans le texte ; renommage du fichier PRD epic 4 (bot → dépôts / historique) ; alignement schémas annexe (`messenger_user_ref`) ; correction d’un bloc SQL dupliqué en fin de `appendix-database-schema.md`.
- **Suite (2026-03-27, correctif 12A résidus)** : dans `docs/index.md`, liens concernés reformulés vers dossiers d’archive (évite les noms de fichiers legacy dans le markdown) ; variables d’exemple de notifications messager historiques retirées des guides/runbooks/architecture 12A au profit de `NOTIFICATION_EMAIL` / `NOTIFICATION_WEBHOOK_URL` et commentaires génériques. Fichiers d’archive et `docs/v1.3.0-active/**` non renommés.
