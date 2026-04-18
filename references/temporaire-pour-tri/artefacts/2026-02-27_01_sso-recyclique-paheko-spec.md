# Spec SSO RecyClique–Paheko (phase ulterieure)

**Date :** 2026-02-27  
**Contexte :** Story 3.6 — documentation et objectif SSO pour une phase ulterieure. Aucune implémentation en v1.  
**Références :** [Catalogue qui stocke quoi §2.1](2026-02-26_08_catalogue-qui-stocke-quoi-recyclic-paheko.md), [Périmètre API §3.2/3.3](2026-02-26_09_perimetre-api-recyclique-v1.md), [Session confrontation auth](2026-02-25_08_session-confrontation-recyclic-paheko.md), [Recherche auth/SSO Paheko](../recherche/2026-02-24_auth-sso-paheko-app-externe_perplexity_reponse.md), FR17 (epics.md).

---

## 1. Objectif SSO RecyClique–Paheko

### Cas d'usage cibles

- **Utilisateur admin/compta** : se connecter une seule fois et accéder à la fois à l'interface RecyClique (admin app, rapports) et à l'interface Paheko (compta, bilan, factures) sans ressaisir d'identifiants.
- **Utilisateur terrain** (optionnel selon périmètre phase ultérieure) : garder un seul point d'entrée (app RecyClique) ; l'accès Paheko reste réservé aux rôles admin/compta.
- **Gestion des comptes** : centraliser la création et la révocation des comptes (idéalement un annuaire ou IdP commun) pour limiter la double gestion RecyClique + Paheko.

### Bénéfices attendus

- **UX** : une seule authentification pour les profils qui utilisent RecyClique et Paheko.
- **Sécurité** : moins de mots de passe à gérer, politique de mot de passe et 2FA éventuels centralisés.
- **Exploitation** : simplification de la gestion des comptes (onboarding, départ de bénévoles, droits).

### Périmètre cible

- **Phase ultérieure** (post-v1) : le SSO n'est pas implémenté en v1. En v1, l'auth reste séparée : JWT FastAPI pour l'app terrain (utilisateurs RecyClique), comptes Paheko distincts pour l'admin/compta.
- **Périmètre fonctionnel** : priorité au SSO pour les **comptes admin/compta** (RecyClique + Paheko). L'extension aux comptes terrain (accès Paheko) est optionnelle et à trancher en phase ultérieure.

---

## 2. Options techniques

### Contexte technique

- **RecyClique** : auth terrain via JWT (FastAPI) ; utilisateurs et rôles dans la BDD RecyClique (source de vérité app).
- **Paheko** : comptes propres (admin, compta, API) ; pas de fourniture d'identité vers l'extérieur.
- **Appels backend** : FastAPI → Paheko via API REST (compte de service, pas de SSO utilisateur).

### Option A — IdP commun (OIDC)

- **Principe** : déployer un fournisseur d'identité (Keycloak, Authentik, Zitadel) ; RecyClique et Paheko consomment tous deux cet IdP via OpenID Connect.
- **Compatibilité Paheko** : depuis **1.3.16**, Paheko peut **consommer** un IdP OIDC externe (connexion SSO côté Paheko). Réservé à l'**auto-hébergement** (non disponible sur Paheko.cloud).
- **Avantages** : SSO réel, un seul login, centralisation des comptes et de la politique de sécurité.
- **Inconvénients** : déploiement et maintenance d'un IdP ; adaptation de RecyClique (remplacement ou couplage JWT ↔ OIDC).

### Option B — Auth séparée (v1, référence)

- **Principe** : comptes Paheko pour l'admin/compta ; comptes RecyClique (JWT) pour l'app terrain. Aucun SSO.
- **Avantages** : simple, déjà prévu en v1, pas de dépendance IdP.
- **Inconvénients** : double authentification pour les utilisateurs qui utilisent RecyClique et Paheko.

### Option C — LDAP partagé

- **Principe** : annuaire LDAP existant ; Paheko et RecyClique s'y connectent (Paheko : config SSO/LDAP documentée dans le wiki).
- **Avantages** : pas d'IdP supplémentaire si LDAP déjà en place.
- **Inconvénients** : dépendance à une infra LDAP ; RecyClique doit gérer l'auth LDAP (ex. ldap3) en plus ou à la place du JWT.

### Option D — JWT partagé / session proxy

- **Principe** : RecyClique émet un JWT ou un ticket ; un reverse-proxy ou un service intermédiaire valide ce JWT et crée une session Paheko (ou envoie des identifiants de service).
- **Compatibilité Paheko** : Paheko **n'expose pas** d'API « login par token » ou OAuth2. L'API Paheko n'accepte que **HTTP Basic**. Donc cette option impliquerait un composant custom (proxy, script, plugin) pour traduire un token en session Paheko, non documenté et hors standard.
- **Conclusion** : possible uniquement avec développement spécifique (proxy d'auth, plugin maison) ; à évaluer avec précaution (sécurité, maintenance).

### Synthèse options

| Option | SSO utilisateur | Compatibilité Paheko | Complexité | Recommandation |
|--------|-----------------|----------------------|------------|----------------|
| A — IdP OIDC commun | Oui | Oui (consommateur OIDC 1.3.16+) | Moyenne | Phase ultérieure privilégiée |
| B — Auth séparée | Non | N/A | Faible | v1 (déjà retenu) |
| C — LDAP partagé | Oui | Oui (doc wiki) | Variable | Si LDAP déjà présent |
| D — JWT / proxy | Partiel | Non natif (custom) | Élevée | À éviter sans étude dédiée |

---

## 3. Contraintes Paheko

### API REST

- **Authentification** : **HTTP Basic uniquement** (identifiant + mot de passe). Aucun Bearer token, JWT, OAuth2 ni API key côté API Paheko.
- **Comptes API** : créés dans *Configuration → Fonctions avancées → API* ; distincts des comptes utilisateurs ; droits configurables (lecture seule, administration, etc.).
- **Durée de vie** : pas de notion de token temporaire ; les identifiants API sont permanents jusqu'à suppression.

### SSO / fournisseur d'identité

- **Paheko comme IdP** : **non supporté**. Paheko n'expose pas d'endpoint OpenID Connect pour que d'autres applications l'utilisent comme fournisseur d'identité.
- **Paheko comme consommateur OIDC** : **oui** depuis 1.3.16 (auto-hébergement) ; configuration SSO et LDAP documentée (wiki « Configuration SSO et LDAP »).
- **Paheko.cloud** : les instances hébergées ne proposent pas la configuration SSO OIDC (réservée à l'auto-hébergement).

### Intégration et déploiement

- **Plugins** : l'auth de l'API est indépendante des plugins (Caisse, Saisie au poids). Les appels depuis RecyClique vers l'API Paheko utilisent le même mécanisme HTTP Basic.
- **Prérequis phase ultérieure** : version Paheko 1.3.16 ou supérieure si SSO OIDC ; auto-hébergement si SSO OIDC souhaité.

---

## 4. Recommandations

### Pour la v1 (actuelle)

- **Conserver l'auth séparée** : JWT FastAPI pour l'app terrain (utilisateurs RecyClique) ; comptes Paheko dédiés pour l'admin/compta et pour le **compte de service** des appels API (FastAPI → Paheko).
- **Compte de service** : créer un utilisateur API dédié (ex. `api-recyclique`) dans *Configuration → API* avec uniquement les droits nécessaires ; credentials en variables d'environnement (jamais en dur) ; HTTPS obligatoire.

### Pour la phase ultérieure (SSO)

- **Privilégier un IdP commun (OIDC)** : déployer un IdP léger (Authentik ou Keycloak) ; configurer Paheko en consommateur OIDC et RecyClique pour utiliser le même IdP. Un seul login pour les utilisateurs accédant à RecyClique et Paheko.
- **Vérifier l'hébergement** : si l'instance est sur Paheko.cloud, le SSO OIDC ne sera pas disponible ; prévoir un déploiement auto-hébergé ou une autre option (LDAP si disponible).
- **Ne pas compter sur Paheko comme IdP** : toute solution « RecyClique consomme Paheko en SSO » serait du développement custom (proxy, plugin) et sort du cadre documenté.

### Prérequis à une future implémentation

- Décider du périmètre exact (admin/compta uniquement ou aussi terrain).
- Choisir l'IdP (Authentik, Keycloak, etc.) et son déploiement.
- S'assurer de la version Paheko ≥ 1.3.16 et du mode d'hébergement (auto-hébergement pour OIDC).
- Documenter la chaîne de confiance (IdP → RecyClique, IdP → Paheko) et la gestion des rôles entre les deux applications.

---

## Références

- [Catalogue qui stocke quoi — §2.1 Utilisateurs et rôles](2026-02-26_08_catalogue-qui-stocke-quoi-recyclic-paheko.md)
- [Périmètre API RecyClique v1 — §3.2 Authentification, §3.3 Utilisateurs](2026-02-26_09_perimetre-api-recyclique-v1.md)
- [Session confrontation RecyClique vs Paheko — auth v0.1 / SSO v0.2](2026-02-25_08_session-confrontation-recyclic-paheko.md)
- [Recherche Auth/SSO Paheko avec app externe](../recherche/2026-02-24_auth-sso-paheko-app-externe_perplexity_reponse.md)
- [Doc officielle Paheko — intégration core](2026-02-24_10_doc-officielle-paheko-integration-core.md)
- FR17, Story 3.6 — _bmad-output/planning-artifacts/epics.md
