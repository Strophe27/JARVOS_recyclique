# Index opérationnel du corpus de captures

Ce dossier contient maintenant le corpus final de captures utiles, organisé directement par domaine fonctionnel.

## Structure

| Dossier | Rôle |
|---------|------|
| `admin/` | Captures d'administration, ventilées en `governance/`, `platform/`, `catalog/` |
| `auth/` | Captures liées à l'authentification et au profil |
| `caisse/` | Captures du parcours caisse |
| `reception/` | Captures du parcours réception |

## Chiffres utiles

- `43` fichiers `.png` au total dans le corpus.
- `22` captures d'administration.
- `9` captures d'authentification.
- `6` captures de caisse.
- `5` captures de réception.

## Convention de nommage

Les fichiers conservent le préfixe de provenance `11-0__` pour signaler leur origine historique tout en restant rangés par domaine.

Exemples :

- `admin/platform/11-0__admin2-02-health.png`
- `auth/11-0__auth-01-login-page.png`
- `caisse/11-0__caisse-06-detail-session-admin.png`
- `reception/11-0__reception-03-liste-tickets-export-stats.png`

## Captures les plus utiles

### Administration

- `admin/governance/11-0__admin1-01-dashboard-admin.png`
- `admin/governance/11-0__admin1-02-users-liste.png`
- `admin/platform/11-0__admin2-02-health.png`
- `admin/platform/11-0__admin2-06-email-logs.png`
- `admin/catalog/11-0__admin3-05-import-legacy.png`
- `admin/catalog/11-0__admin3-06-categories.png`

### Auth

- `auth/11-0__auth-01-login-page.png`
- `auth/11-0__auth-02-profil-page.png`
- `auth/11-0__auth-05-signup-page.png`
- `auth/11-0__auth-06-pin-login-blank-logged.png`

### Caisse

- `caisse/11-0__caisse-01-dashboard.png`
- `caisse/11-0__caisse-02-ouverture-session.png`
- `caisse/11-0__caisse-04-saisie-vente.png`
- `caisse/11-0__caisse-06-detail-session-admin.png`

### Réception

- `reception/11-0__reception-01-accueil-module.png`
- `reception/11-0__reception-02-ouverture-poste-saisie-differee.png`
- `reception/11-0__reception-03-liste-tickets-export-stats.png`
- `reception/11-0__reception-04-detail-ticket-lignes.png`

## Usage recommandé

1. Utiliser directement `admin/`, `auth/`, `caisse/` et `reception/` comme sources de vérité.
2. Pour l'admin, considérer `admin/governance/`, `admin/platform/` et `admin/catalog/` comme le rangement final.
3. Conserver le préfixe `11-0__` dans les noms pour garder la traçabilité historique sans réintroduire d'arborescence de campagnes.

## Liens documentaires utiles

- Rapport legacy ciblé B52-P3 : `recyclique-1.4.4/docs/rapport-validation-b52-p3-captures.md`
- Pack de lecture epics 6-10 : `references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md`
