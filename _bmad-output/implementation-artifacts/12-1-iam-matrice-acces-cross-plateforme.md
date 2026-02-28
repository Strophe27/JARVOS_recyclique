# 12.1 - Matrice IAM cible cross-plateforme (RecyClique x Paheko)

Date: 2026-02-28  
Story source: `12-1-cadrage-iam-cible-et-matrice-d-acces-cross-plateforme`

## 1) Vocabulaire IAM cible

## Entites de gouvernance

- **Utilisateur**: identite individuelle (source verite membres: Paheko en cible Epic 12).
- **Role**: niveau de responsabilite metier (`super_admin`, `admin`, `benevole`).
- **Groupe**: regroupement operationnel pouvant porter des permissions metier (gouvernance fine, cible story 12.6).
- **Permission**: capacite atomique sur une ressource (`read`, `create`, `update`, `delete`, `grant_exception`, etc.).
- **Exception**: octroi temporaire ou contextualise qui deroge au profil standard d'un role.
- **Structure/Tenant**: contexte organisationnel d'application des droits (ressourcerie/site/structure active).

## Surfaces d'acces

- **Surface RecyClique**: interface principale et parcours nominals quotidiens (auth, caisse, reception, admin RecyClique).
- **Acces expert/secours Paheko**: acces reserve pour usages experts (compta, administration Paheko, diagnostic) et situations de secours encadrees.

## 2) Regles transversales non negociables

1. **Benevole sans acces Paheko par defaut** (deny by default).
2. Toute exception Paheko doit etre **explicite**, **datee**, **approuvee**, **auditable**, **revocable**.
3. Les controles IAM critiques appliquent un comportement **fail-closed**.
4. Les claims OIDC minimaux controles cote BFF sont: `iss`, `aud`, `exp`, `sub`, `role`, `tenant`.
5. **Paheko est la source de verite pour les adherents/benevoles et le cycle d'adhesion** (activites, relances, comptabilisation des adhesions); RecyClique ne duplique pas cette gouvernance metier et ne fait que consommer/synchroniser les attributs necessaires a l'execution operationnelle.

## 3) Matrice role x ressources x actions cross-plateforme

> Legendes:
> - Octroi: `STD` (standard), `EXC` (exception), `DENY`.
> - Paheko: `none`, `read`, `limited-write`, `expert-write`.

| Role | Groupe de base | Ressource | Actions autorisees | Contexte structure/tenant | Acces Paheko | Octroi | Preuve d'audit attendue |
|---|---|---|---|---|---|---|---|
| `super_admin` | `iam-super-admin` | IAM global | manage roles, manage groups, grant/revoke exceptions | Multi-tenant (toutes structures) | expert-write | STD | `IAM_EXCEPTION_GRANTED` / `IAM_EXCEPTION_REVOKED` + motif |
| `super_admin` | `iam-super-admin` | Admin RecyClique | full CRUD + supervision securite | Multi-tenant | read | STD | `AUTHZ_DECISION` + trace request_id |
| `super_admin` | `iam-super-admin` | Paheko expert/secours | operations d'administration Paheko en condition de secours (incident, reprise, remediation) | Multi-tenant + justification obligatoire | expert-write | EXC | `IAM_EXCEPTION_GRANTED` + `PAHEKO_ACCESS_GRANTED` + ticket incident |
| `admin` | `iam-admin` | Admin RecyClique | CRUD metier, gestion utilisateurs locale, lecture audit | Tenant scope + delegations explicites | limited-write | STD | `AUTHZ_DECISION` + attribut tenant |
| `admin` | `iam-admin` | Paheko expert/secours | perimetre `limited-write` strictement borne (liste normative section 3.1) | Tenant scope strict | limited-write | STD | `PAHEKO_ACCESS_GRANTED` + `AUTHZ_DECISION` |
| `benevole` | `iam-benevole` | RecyClique operationnel | usages terrain autorises par role local | Tenant scope strict | none | STD | `AUTHZ_DECISION` (allow RecyClique) |
| `benevole` | `iam-benevole` | Paheko expert/secours | aucun acces par defaut | N/A | none | DENY | `PAHEKO_ACCESS_DENIED` |
| `benevole` | `iam-benevole-exception-paheko` | Paheko expert/secours | acces temporaire strictement borne | Tenant + duree limitee | read ou limited-write | EXC | `IAM_EXCEPTION_GRANTED` + `PAHEKO_ACCESS_GRANTED` + expiration |

## 3.1) Perimetres normatifs Paheko (verrouillage anti-ambiguite)

### `admin` - niveau `limited-write` (STD)

Actions **autorisees** (whitelist):

1. Consulter les fiches adherents/benevoles et l'historique de cycle d'adhesion.
2. Mettre a jour des metadonnees operationnelles non-financieres (notes internes, tags operationnels, statut de suivi).
3. Enregistrer des traces de relance/suivi sans impact comptable.

Actions **interdites** (deny explicite):

1. Creer/modifier/supprimer des ecritures comptables.
2. Comptabiliser/annuler une adhesion ou modifier les regles de comptabilisation.
3. Modifier des parametres d'administration globale Paheko (plugins, configuration systeme, gouvernance IAM).
4. Effectuer des exports massifs hors procedure d'audit approuvee.

Regle de surete: toute action Paheko non whitelist admin est **fail-closed** (`PAHEKO_ACCESS_DENIED` + audit).

### `super_admin` - niveaux Paheko explicites

- `read` en **STD** pour supervision transverse et verification de coherence.
- `expert-write` uniquement en **EXC** (condition de secours ou remediation) avec justification, borne temporelle et tracabilite complete.

## 4) Politique d'exception (resume operationnel)

## Flux d'exception

1. Demande: `admin` (ou sponsor metier) ouvre une demande motivee.
2. Validation: `super_admin` valide/refuse.
3. Octroi: exception appliquee avec date de debut/fin et tenant cible.
4. Controle continu: reevaluation periodique, retrait automatique a expiration.
5. Revocation manuelle immediate possible par `super_admin`.

## Exigences de traçabilite

- Identifiants minimaux: `request_id`, `subject`, `actor`, `tenant`, `role_before`, `role_after`, `exception_id`.
- Horodatage ISO 8601, decision (`approved`/`rejected`), justification texte.
- Conservation des evenements d'octroi/refus/retrait dans `audit_events`.

## 5) Evenements d'audit obligatoires

- `IAM_EXCEPTION_REQUESTED`
- `IAM_EXCEPTION_GRANTED`
- `IAM_EXCEPTION_REVOKED`
- `IAM_EXCEPTION_DENIED`
- `ROLE_INCONSISTENCY_DETECTED`
- `PAHEKO_ACCESS_DENIED`
- `PAHEKO_ACCESS_GRANTED`
- `OIDC_CLAIMS_VALIDATION_FAILED`
- `FAIL_CLOSED_TRIGGERED`

## 6) Cas fail-closed a reprendre en story 12.5

1. Claims OIDC invalides/incomplets (`iss`, `aud`, `exp`, `sub`, `role`, `tenant`): blocage routes sensibles.
2. Incoherence role/groupe/tenant entre contexte session et regles IAM: refus d'acces.
3. Evaluation d'exception impossible (service indisponible ou donnees absentes): refus Paheko par defaut.
4. Erreur de synchronisation roles RecyClique <-> Paheko sur operation sensible: refus et alerte.

## 7) Alignement explicite stories 12.2 a 12.6

| Story cible | Dependance issue de cette matrice |
|---|---|
| 12.2 IdP/BFF | Validation claims OIDC minimaux (`iss`, `aud`, `exp`, `sub`, `role`, `tenant`) + session BFF securisee |
| 12.3 Sync membres API Paheko | Source de verite Paheko sur adherents/benevoles + cycle d'adhesion (activites, relances, comptabilisation des adhesions) + synchro identites/roles de base |
| 12.4 Garde-fous role | Regle benevole deny Paheko par defaut + exceptions seulement explicites |
| 12.5 Mode degrade | Cas fail-closed, refus par defaut, audit `FAIL_CLOSED_TRIGGERED` |
| 12.6 Plugin RBAC avance | Gestion fine groupes/permissions cross-plateforme (`iam-*`, exceptions evoluees) |

## 8) Contrat d'usage pour stories 12.2-12.6

- Cette matrice est la **source de verite IAM** pour Epic 12.
- Toute divergence implementation vs matrice doit ouvrir une entree dans le decision log 12.1.
- Les stories 12.2 a 12.6 doivent referencer ce document dans leurs Dev Notes/Completion Notes.
