# doc/ — Communication publique

Tout ce qui sert a la **communication publique** : presentations (partenaires, financeurs), modes d'emploi, documentation utilisateur, supports de communication.

> **A ne pas confondre avec** `references/` : references = construction du projet (contexte interne, specs, matière pour Brief/PRD). doc = ce qui est destine a etre partage ou publie.

---

## Contenu

(Liste a mettre a jour a chaque ajout. Voir les sous-dossiers ci-dessous si la doc grossit.)

| Fichier | Usage |
|---------|--------|
| [deployment.md](deployment.md) | Déploiement Docker Compose, prérequis, vérification de la stack (health, URLs), dépannage. |
| [dev-mode.md](dev-mode.md) | Mode développement stable et rapide : backend Docker en hot reload (`--reload`) + frontend Vite local avec proxy API, sans rebuild à chaque changement. |
| [canal-push.md](canal-push.md) | Canal push RecyClique → Paheko : configuration (endpoint, secret), résilience (tentatives, backoff), comportement en cas d’échec. |
| [admin-compta-paheko-v1.md](admin-compta-paheko-v1.md) | Accès admin compta via Paheko (v1) : URL (règle de construction), rôle requis, contexte v1. Story 8.6 — FR12. |
| [declarative-aggregates-v1.md](declarative-aggregates-v1.md) | Agrégats déclaratifs v1 : périmètre (champs, périodes T1–T4, flux caisse/réception), traçabilité (sources, règles de calcul), API read-only. Story 9.1 — FR22. |
| [fonds-documentaire-recyclique.md](fonds-documentaire-recyclique.md) | Fonds documentaire RecyClique (post-MVP) : périmètre vs Paheko, stockage (volume dédié / K-Drive), API cible dépôt/consultation, matrice qui dépose quoi où. Story 10.2 — FR27. |
| [operations/bootstrap-super-admin.md](operations/bootstrap-super-admin.md) | Bootstrap super_admin : commande Docker, cas d'usage (création, promotion, idempotence), changement de mot de passe. Story 17-HF-4 — AT-005. |
| *(a deposer si besoin)* | Versions **epurees** pretes a envoyer (presentations, modes d'emploi). Matiere premiere → **references/vision-projet/** (ex. `matiere_presentation-plateforme-recyclic.md`). |

---

## Sous-dossiers possibles

- **modes-emploi/** — Guides utilisateur, tutoriels
- **communication/** — Autres supports de communication publique
