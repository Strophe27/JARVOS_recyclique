# Story 14.6: Demantelement OIDC et retour auth simple RecyClique-Paheko

Status: in-progress

## Story

En tant que responsable produit/technique,
je veux annuler proprement la derive OIDC/IdP introduite en Epic 12-14,
afin de revenir a une architecture simple, maintenable et alignee avec le besoin v1:
- RecyClique gere l'auth terrain.
- Paheko reste la source de verite adherents/adhesions/activites et un acces admin ponctuel.
- Pas de service IdP externe obligatoire dans la stack standard.

## Contexte de decision

- Le commit `9796c37` ("epic 12 - 14") est massif: `324 files changed, 25002 insertions(+), 1159 deletions(-)`.
- Il melange evolutions utiles et derive IAM/OIDC (service `keycloak`, dossier `paheko-config`, ajustements auth OIDC).
- Le commit `15fd8a4` ajoute principalement des runbooks Epic 14 (911 insertions) sans corriger la derive de fond.

## Acceptance Criteria

1. **Retro-ingenierie fiable**
   - Etant donne les commits `93c928d..15fd8a4`, quand on reconstruit la trace via stories 12-14 + git,
   - alors chaque fichier est classe dans une matrice `KEEP / REVIEW / ROLLBACK`,
   - et la matrice est publiee dans un artefact dedie.

2. **Stack simplifiee**
   - Etant donne la stack locale, quand la story est appliquee,
   - alors `docker-compose.yml` ne lance plus de service IdP (`keycloak` retire ou desactive par defaut),
   - et la stack standard revient a 4 services (RecyClique, Paheko, PostgreSQL, Redis).

3. **Aucun patch runtime Paheko**
   - Etant donne le besoin v1, quand la story est appliquee,
   - alors aucun mecanisme de patch du coeur Paheko n'est utilise en operation courante (pas de copie de `Session.php` dans le conteneur),
   - et la methode officielle est documentee: image Paheko propre + configuration externe uniquement.

4. **RecyClique operationnel en auth simple**
   - Etant donne le rollback IAM/OIDC, quand les tests de base sont executes,
   - alors l'auth terrain RecyClique (JWT/PIN) reste operationnelle,
   - et les flux metier existants non IAM critiques ne regressent pas.

5. **Decision produit verrouillee**
   - Etant donne l'historique de derive, quand la story est cloturee,
   - alors une decision explicite est ecrite: "Pas d'identite unifiee OIDC en v1; federation legere via API/sync metier".

## Tasks / Subtasks

- [x] **A. Etablir la matrice de rollback (git + stories)**
  - [x] Extraire la liste des fichiers modifies entre `93c928d` et `15fd8a4`.
  - [x] Croiser avec les File Lists des stories 12.x/14.x.
  - [x] Produire `14-6-matrice-rollback-epic12-14.md` avec classification `KEEP / REVIEW / ROLLBACK`.

- [ ] **B. Retirer la dependance IdP de la stack standard**
  - [x] Retirer/desactiver `keycloak` de `docker-compose.yml` pour le run par defaut.
  - [ ] Nettoyer les variables d'env et doc qui rendent l'IdP obligatoire.
  - [x] Verifier que `docker compose up` revient sur une stack 4 services.

- [ ] **C. Stopper les patchs Paheko locaux**
  - [ ] Marquer `paheko-config/Session.php` et scripts associes comme outillage d'audit historique (hors prod).
  - [ ] Supprimer tout step operationnel qui recopie un coeur Paheko modifie dans le conteneur.
  - [x] Documenter la strategie cible: reinstall propre Paheko + config externe.

- [ ] **D. Nettoyer RecyClique cote IAM/OIDC (cible minimale)**
  - [ ] Identifier endpoints/services strictement OIDC a neutraliser ou mettre derriere feature flag.
  - [x] Conserver ce qui est metier utile (sans OIDC force).
  - [x] Mettre a jour les tests pour refléter le mode auth simple.

- [ ] **E. Verification finale**
  - [x] Build/lancement local OK.
  - [x] Smoke tests auth terrain + ecrans critiques OK.
  - [ ] Preuve ecrite de recuperation espace/complexite (services, image(s), runbook simplifie).

## Livrables attendus

- `_bmad-output/implementation-artifacts/14-6-demantelement-oidc-et-retour-auth-simple-recyclique-paheko.md` (ce fichier)
- `_bmad-output/implementation-artifacts/14-6-matrice-rollback-epic12-14.md`
- Mise a jour de `docker-compose.yml` (stack par defaut sans keycloak)
- Mise a jour concise de `doc/deployment.md` (procedure standard simplifiee)

## Notes de pilotage

- Priorite securite: ne pas forcer de manip destructrice git tant que la matrice n'est pas validee.
- Priorite cout/token: rollback cible par fichiers classes, pas reset aveugle.
- Priorite produit: transparence fonctionnelle RecyClique <-> Paheko via API/sync metier, pas SSO enterprise.

## Journal d'execution (2026-03-01)

- `docker-compose.yml`: service `keycloak` retire de la stack standard.
- Runtime Docker: conteneur Keycloak supprime, image Keycloak locale supprimee.
- Paheko: conteneur recree proprement depuis image (`docker compose up -d --force-recreate paheko`) pour eliminer tout patch runtime eventuel.
- RecyClique frontend: mode auth par defaut repasse en `legacy` (`frontend/src/auth/AuthContext.tsx`).
- RecyClique runtime: service `recyclic` rebuild/restart avec le nouveau frontend.
- Verifications: stack 4 services OK, `/health` RecyClique = 200, endpoint login classique repond (401 attendu avec identifiants invalides).
