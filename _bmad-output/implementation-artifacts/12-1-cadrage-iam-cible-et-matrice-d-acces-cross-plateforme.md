# Story 12.1: Cadrage IAM cible et matrice d'acces cross-plateforme

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

En tant que product owner,
je veux une matrice IAM unique (roles, groupes, exceptions, acces Paheko),
afin d'eviter les ambiguities d'autorisation entre RecyClique et Paheko.

## Acceptance Criteria

1. **Etant donne** les roles metier valides (Super Admin, Admin, Benevole + exceptions), **quand** la matrice IAM est formalisee dans les artefacts projet, **alors** chaque role dispose de permissions explicites cote RecyClique et cote Paheko.
2. **Et** la regle "benevole sans acces Paheko par defaut" est documentee avec un mecanisme d'exception explicite, tracable et auditable.
3. **Et** la matrice IAM definit clairement les dimensions minimales suivantes: role, groupe, ressource, action, contexte structure/tenant, niveau d'acces Paheko, mode d'octroi (standard/exception), preuve d'audit.
4. **Et** les dependances vers les stories 12.2 a 12.6 sont explicites (claims OIDC attendus, controles BFF, sync membres API Paheko, plugin groupes/permissions, mode degrade fail-closed).
5. **Et** les decisions et zones d'incertitude sont capturees dans un decision log avec proprietaire, date, impact et prochaine action, pour eviter les interpretations contradictoires pendant l'implementation.
6. **Et** les livrables de cadrage sont identifies sans ambiguite dans les artefacts projet avec un format stable (matrice IAM + decision log), afin que 12.2 a 12.6 reutilisent la meme source de verite.

## Tasks / Subtasks

- [x] Task 1 - Formaliser le vocabulaire IAM cible (AC: 1, 3)
  - [x] Definir les entites de gouvernance (role, groupe, permission, exception, structure/tenant, utilisateur).
  - [x] Verrouiller les definitions de "surface RecyClique" et "acces expert/secours Paheko".
- [x] Task 2 - Produire la matrice d'acces cross-plateforme (AC: 1, 2, 3)
  - [x] Construire un tableau role x ressources x actions (RecyClique et Paheko).
  - [x] Ajouter la regle de base "Benevole sans acces Paheko" et les cas d'exception autorises.
  - [x] Definir le format de preuve d'audit pour toute exception accordee/refusee.
  - [x] Stocker la matrice dans `_bmad-output/implementation-artifacts/12-1-iam-matrice-acces-cross-plateforme.md`.
- [x] Task 3 - Aligner la matrice avec la trajectoire technique Epic 12 (AC: 4)
  - [x] Associer chaque bloc de matrice aux futures stories: 12.2 (IdP/BFF), 12.3 (sync API Paheko), 12.4 (garde-fous role), 12.5 (mode degrade), 12.6 (plugin RBAC avance).
  - [x] Lister les claims minimaux a valider cote BFF (`iss`, `aud`, `exp`, `sub`, role, structure/tenant).
- [x] Task 4 - Definir les garde-fous operationnels et d'audit (AC: 2, 5)
  - [x] Ecrire la politique d'exception (qui peut demander, qui valide, duree, revocation).
  - [x] Definir les evenements d'audit obligatoires (octroi/retrait exception, refus, incoherence de role, tentative Paheko non autorisee).
  - [x] Definir les cas de blocage fail-closed a reprendre dans la story 12.5.
- [x] Task 5 - Formaliser les decisions et incertitudes (AC: 5, 6)
  - [x] Creer un decision log dedie avec statut (`open`, `decided`, `deferred`) et proprietaire de decision.
  - [x] Stocker ce log dans `_bmad-output/implementation-artifacts/12-1-iam-decision-log.md`.
- [x] Task 6 - Produire les artefacts de cadrage prets pour dev-story (AC: 1, 2, 3, 4, 5, 6)
  - [x] Completer la story avec les references et criteres exploitables.
  - [x] Verifier la coherence entre la matrice/decision log et les stories 12.2 a 12.6 (pas de contradiction sur claims, roles, exceptions, fail-closed).
  - [x] Ajouter un resume de validation dans les Completion Notes.

## Dev Notes

- Cette story est une story de **cadrage IAM**: pas d'implementation SSO complete attendue ici. Le but est de livrer un contrat d'acces univoque exploitable par les stories 12.2 a 12.6.
- Cible Epic 12: **un seul mecanisme d'identite cross-plateforme**, RecyClique comme surface principale, Paheko comme source de verite membres, trajectoire "API Paheko d'abord puis plugin Paheko pour le RBAC avance".
- Contrainte metier historique a appliquer explicitement: **Paheko est la source de verite pour les adherents/benevoles et le cycle d'adhesion** (activites, relances, comptabilisation des adhesions). RecyClique ne doit pas redefinir cette gouvernance, uniquement l'orchestrer/synchroniser.
- Regle produit a traiter comme non negociable: **Benevole sans acces Paheko par defaut**, acces uniquement via exception explicite et tracee.
- Contraintes securite a deja refleter dans le cadrage: validation stricte des claims (`iss`, `aud`, `exp`, `sub`), session securisee cote BFF, principe fail-closed sur routes sensibles.
- Le cadrage doit separer: (a) identite/authentification centralisee (OIDC/IdP), (b) autorisation metier locale RecyClique, (c) droits Paheko reserves aux roles autorises.
- Les ambiguities doivent etre resolues ici (ou explicitees comme decisions en attente), pour eviter les divergences de gouvernance dans 12.3 et 12.6.
- Les livrables de cette story sont documentaires: aucun endpoint ni migration BDD ne doit etre ajoute dans cette story.
- Definition of Done story 12.1: matrice IAM versionnee, decision log versionne, references 12.2-12.6 alignees, et points ouverts explicitement traces.

### Project Structure Notes

- Story de specification/cadrage: artefact principal dans `_bmad-output/implementation-artifacts/`.
- Cette story sert de reference contractuelle pour les futures implementations backend/frontend IAM (BFF, policy checks, sync membres, plugin Paheko).
- Aucune creation de structure technique supplementaire requise a ce stade.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#epic-12-identite-cross-plateforme-sso-gouvernance-paheko]
- [Source: _bmad-output/planning-artifacts/epics.md#story-12-1-cadrage-iam-cible-et-matrice-d-acces-cross-plateforme]
- [Source: _bmad-output/planning-artifacts/research/technical-sso-transversal-recyclique-paheko-multi-structures-research-2026-02-28.md]
- [Source: _bmad-output/planning-artifacts/architecture.md#authentication--security]
- [Source: _bmad-output/planning-artifacts/architecture.md#api--communication-patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#implementation-readiness-validation]
- [Source: _bmad-output/planning-artifacts/architecture.md#gap-analysis-results]
- [Source: _bmad-output/planning-artifacts/architecture.md#implementation-handoff]
- [Source: references/artefacts/2026-02-26_03_checklist-v0.1-architecture.md]

## Dev Agent Record

### Agent Model Used

- GPT-5.3 Codex (bmad-dev)

### Debug Log References

- Workflow applique: `_bmad/bmm/workflows/4-implementation/dev-story/`
- Story traitee: `_bmad-output/implementation-artifacts/12-1-cadrage-iam-cible-et-matrice-d-acces-cross-plateforme.md`

### Completion Notes List

- Matrice IAM cross-plateforme livree et clarifiee: `_bmad-output/implementation-artifacts/12-1-iam-matrice-acces-cross-plateforme.md` avec verrouillage explicite du perimetre `limited-write` admin Paheko (whitelist/deny), suppression des formulations ambiguës `super_admin`, regle benevole deny Paheko par defaut, exceptions auditees, claims BFF minimaux et cas fail-closed.
- Decision log IAM livre et corrige: `_bmad-output/implementation-artifacts/12-1-iam-decision-log.md` avec statuts `open`, `decided`, `deferred`, proprietaires, impacts et prochaines actions, incluant la decision explicite "Paheko source de verite adherents/benevoles + cycle adhesion" et une prochaine action datee pour toute entree `open`.
- Alignement explicite 12.2 -> 12.6 verifie dans la matrice (dependances claims OIDC, BFF, sync membres, garde-fous role, mode degrade, plugin RBAC avance).
- Validation story: AC 1 a 6 couvertes par les deux artefacts documentaires; aucun endpoint ni migration BDD ajoute, conforme au cadrage attendu.

### File List

- _bmad-output/implementation-artifacts/12-1-cadrage-iam-cible-et-matrice-d-acces-cross-plateforme.md
- _bmad-output/implementation-artifacts/12-1-iam-matrice-acces-cross-plateforme.md
- _bmad-output/implementation-artifacts/12-1-iam-decision-log.md
- _bmad-output/implementation-artifacts/12-1-cadrage-iam-cible-et-matrice-d-acces-cross-plateforme.agent-state.json

## Change Log

- 2026-02-28: Story 12.1 implementee (cadrage IAM documentaire), creation de la matrice IAM et du decision log, story basculee en `review`.
- 2026-02-28: Revue adversariale BMAD (QA) executee; statut remis a `in-progress` avec demandes de correction sur ambiguities IAM et tracabilite.
- 2026-02-28: Correctifs post-review appliques (points HIGH/MEDIUM): perimetre `limited-write` admin Paheko verrouille, regles `super_admin` explicites sans "selon besoin", decision log `open` date, tracabilite File List completee.
- 2026-02-28: Revue adversariale BMAD (QA) 2e passe validee; tous les findings precedents verifies comme resolus, story passee a `done`.

## Senior Developer Review (AI)

### Reviewer

- QA Adversarial (bmad-qa)
- Date: 2026-02-28

### Outcome (1ere passe)

- Decision: **Changes Requested**
- Synthese: la base documentaire est solide, mais des zones d'ambiguite restent incompatibles avec une "matrice IAM unique" pleinement exploitable comme contrat d'implementation pour 12.2-12.6.

### Findings

1. **[HIGH] AC1 partiellement satisfait: permissions Paheko encore non explicites pour `admin`**
   - Preuve: la matrice indique `limited-write`, mais le perimetre fonctionnel exact est explicitement ouvert dans le decision log (`IAM-007`: "compta seule vs admin partielle").
   - Impact: risque d'implementations divergentes entre 12.3/12.4/12.6, donc ambiguite d'autorisation non totalement levee.
   - Correction attendue: verrouiller un perimetre operationnel minimal de `limited-write` (liste actions autorisees/interdites) ou fixer une regle transitoire fail-closed.

2. **[HIGH] AC1/AC6 fragilises: niveau d'acces Paheko encore ambigu pour `super_admin`**
   - Preuve: cellule matrice "Admin RecyClique" pour `super_admin` note `read/expert selon besoin`, formulation non deterministe.
   - Impact: la "source de verite IAM" n'est pas totalement normative et peut produire des interpretations contradictoires.
   - Correction attendue: remplacer les formulations "selon besoin" par des niveaux et conditions strictes (STD vs EXC) aligns sur policy d'exception.

3. **[MEDIUM] Regle interne du decision log non respectee pour les entrees `open`**
   - Preuve: la section "Regles d'exploitation du log" exige une prochaine action **datee** pour tout `open`, mais `IAM-007` et `IAM-008` n'incluent pas d'echeance calendaire.
   - Impact: pilotage faible des incertitudes critiques et risque de glissement vers les stories dependantes.
   - Correction attendue: ajouter une date cible explicite (ISO) et un responsable unique pour chaque entree `open`.

4. **[MEDIUM] Ecart de tracabilite entre livrables reels et File List story**
   - Preuve: le lot contient aussi `_bmad-output/implementation-artifacts/12-1-cadrage-iam-cible-et-matrice-d-acces-cross-plateforme.agent-state.json` non reference dans `File List`.
   - Impact: audit de livraison incomplet et verification plus difficile entre orchestration et artefacts declares.
   - Correction attendue: documenter explicitement cet artefact d'etat dans la story ou le supprimer s'il n'est plus utile.

### AC Coverage Re-check

- AC1: **PARTIAL** (ambiguites sur perimetres d'acces Paheko `admin`/`super_admin`)
- AC2: **OK** (deny by default benevole + exception auditable explicites)
- AC3: **OK** (dimensions minimales presentes dans la matrice)
- AC4: **OK** (dependances 12.2-12.6 explicitees)
- AC5: **PARTIAL** (incertitudes capturees, mais discipline "action datee" non tenue pour `open`)
- AC6: **PARTIAL** (format stable livre, mais niveau de precision insuffisant sur points critiques IAM)

### Re-review (2e passe) - 2026-02-28

#### Outcome

- Decision: **Approved**
- Synthese: les findings HIGH/MEDIUM de la passe precedente sont resolus; la matrice IAM est maintenant normative sur les zones critiques et exploitable comme contrat unique pour 12.2 a 12.6.

#### Verification ciblee des anciens findings

1. **[RESOLU] Admin Paheko `limited-write` explicite et normatif**
   - Preuve: section 3.1 de la matrice avec whitelist actionnable, deny explicite et regle fail-closed hors whitelist.
2. **[RESOLU] `super_admin` sans ambiguite**
   - Preuve: separation explicite `read` en STD et `expert-write` uniquement en EXC avec conditions de secours et tracabilite.
3. **[RESOLU] Entrees `open` avec prochaine action datee**
   - Preuve: decision log `IAM-008` contient une action planifiee datee (`2026-03-04`) et un proprietaire unique.
4. **[RESOLU] Tracabilite File List**
   - Preuve: `File List` inclut l'artefact `_bmad-output/implementation-artifacts/12-1-cadrage-iam-cible-et-matrice-d-acces-cross-plateforme.agent-state.json`.
5. **[RESOLU] Contrainte metier Paheko source de verite + cycle adhesion explicite**
   - Preuve: formulation explicite dans les Dev Notes story, dans la matrice (regles transversales), et dans le decision log (`IAM-001b`).

#### AC Coverage Re-check (2e passe)

- AC1: **OK**
- AC2: **OK**
- AC3: **OK**
- AC4: **OK**
- AC5: **OK**
- AC6: **OK**

