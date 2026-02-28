# Sprint Change Proposal - Correct Course

Date: 2026-02-28
Auteur: Bob (Scrum Master)
Mode: Batch
Demandeur: Strophe
Statut: Approved
Approbation utilisateur: yes (2026-02-28)

## 1) Issue Summary

### Problematique identifiee

Le projet vise une continuite forte entre Paheko et RecyClique, avec Paheko comme source de verite membres/benevoles/adhesions, et un besoin explicite de connexion unifiee pour eviter la double gestion des identites.

En execution, un ecart operationnel est apparu:

- Epic 12 a livre la brique OIDC cote RecyClique (BFF/session/claims).
- La stack locale/projet ne livre pas de parcours "pret a l'emploi" bout en bout (IdP commun + configuration Paheko + runbook de mise en service).
- Cette absence de concretisation infra/config a cree une confusion "spec done" vs "parcours utilisateur effectivement operationnel".

### Evidence constatee

- Incident constate en execution: `OIDC is disabled` sur `/v1/auth/sso/start` tant que config runtime absente/inactive.
- Verification technique locale: l'image Paheko executee expose des constantes/flux OIDC dans le code charge, et un test temporaire a confirme l'apparition du bouton SSO quand la config OIDC est activee.
- Les artefacts PRD/Epics conservent des formulations "phase ulterieure" sur certains points SSO, en tension avec le besoin operationnel immediat.

## 2) Impact Analysis

### Impact Epic

- Epic 12: base technique utile mais insuffisamment "operationalisee" pour usage reel.
- Epic 3.6 (doc SSO phase ulterieure): devenu partiellement obsolescent vis-a-vis de la priorite actuelle.
- Nouveau besoin: expliciter un epic de concretisation operationnelle de l'identite unifiee (infra + config + runbook + cutover).

### Impact Stories

- Stories deja done (12.1 a 12.6): gardees comme fondation technique.
- Nouvelles stories necessaires pour rendre la solution exploitable:
  - provisionnement IdP commun
  - configuration OIDC Paheko
  - alignement mapping identite (email/sub) et gouvernance compte
  - runbooks dev/prod et test de non-regression E2E d'auth
  - bascule progressive (cutover) et rollback

### Conflits d'artefacts

- PRD: FR16/FR17 et "phase ulterieure" doivent etre clarifies.
- Epics: manque de lot "operationalisation" apres l'implementation technique.
- Architecture: composant IdP et procedure de configuration Paheko doivent etre explicitement modeles.
- UX: impact leger (parcours login et message d'erreur/etat) mais pas de refonte ecran massive.

### Impact technique

- Ajout d'un composant IdP commun dans l'environnement (dev puis prod).
- Parametrage OIDC coherent entre RecyClique et Paheko.
- Verification de robustesse: cookies/session/logout/claims, fail-closed, monitoring auth.

## 3) Recommended Approach

### Evaluation des options checklist

- Option 1 - Direct Adjustment: **Viable**
  - Effort: Medium
  - Risque: Medium
  - Commentaire: exploite les livrables Epic 12, minimise la rework.

- Option 2 - Potential Rollback: **Not viable**
  - Effort: High
  - Risque: High
  - Commentaire: rollback Epic 12 ferait perdre la fondation deja utile.

- Option 3 - PRD MVP Review: **Viable (partielle)**
  - Effort: Low
  - Risque: Medium
  - Commentaire: utile pour clarifier le statut "phase ulterieure" vs "priorite operationnelle".

### Recommandation retenue

**Approche hybride: Option 1 + Option 3 (clarification PRD minimale).**

1. Conserver Epic 12 comme fondation technique "done".
2. Ajouter un nouvel epic de **mise en service identite unifiee** pour combler le gap operationalisation.
3. Clarifier PRD/Epics sur le fait que la priorite est maintenant une connexion unifiee exploitable.

### Estimation d'impact

- Scope: **Moderate**
- Effort: 1 a 2 sprints selon niveau d'automatisation infra/runbooks
- Risques principaux:
  - confusion de mapping identite (`email`/`sub`)
  - divergences config dev/prod
  - parcours logout inter-app incomplet

## 4) Detailed Change Proposals

### A) Epics - Ajout d'un epic d'operationalisation

Artifact: `_bmad-output/planning-artifacts/epics.md`

**OLD (etat actuel):**
- Epic 12 est clos sur implementation IAM/SSO technique.
- Aucun epic dedie a la mise en service IdP+Paheko+runbooks de bout en bout.

**NEW (propose):**
- Ajouter un **Epic 14: Operationalisation identite unifiee RecyClique-Paheko**.
- Stories candidates:
  1. 14.0 Gate de faisabilite: valider officiellement la compatibilite OIDC de l'image Paheko cible (dev/prod), prerequis et limites.
  2. 14.1 Provisionner IdP commun (dev/prod) + clients OIDC.
  3. 14.2 Configurer Paheko OIDC et strategy de mapping utilisateur.
  4. 14.3 Finaliser integration RecyClique OIDC runtime (env, secrets, checks).
  5. 14.4 E2E auth cross-plateforme + non-regression fail-closed.
  6. 14.5 Runbooks d'exploitation (onboarding user, incident auth, rollback).

Rationale:
- Separer "implementation technique" et "mise en service operationnelle".
- Eviter de marquer "done" un parcours qui n'est pas encore industrialise.

---

### B) PRD - Clarification FR16/FR17 (sans rupture du cadre initial)

Artifact: `_bmad-output/planning-artifacts/prd.md`

**OLD:**
- FR16: auth separee en phase initiale.
- FR17: SSO phase ulterieure.

**NEW (propose):**
- Conserver FR16 comme mode de fallback/transition.
- Conserver FR17, mais ajouter une note de decision produit explicite:
  - "Prioriser une mise en service identite unifiee en v1.x si le gate de faisabilite (Epic 14.0) est valide."
- Ajouter note de gouvernance:
  - "Paheko reste source de verite membres et cycle d'adhesion."

Rationale:
- Aligner le texte produit avec la priorite decidee maintenant, sans contredire brutalement le cadre v0.1.
- Supprimer l'ambiguite "souhaite mais pas planifie" via un gate explicite de decision.

---

### C) Architecture - Composant IdP et parcours operationnel

Artifact: `_bmad-output/planning-artifacts/architecture.md`

**OLD:**
- OIDC mentionne principalement cote RecyClique.
- Procedure de configuration Paheko OIDC et runbook d'exploitation non formalises en detail.

**NEW (propose):**
- Ajouter composant architecture explicite:
  - IdP commun (OIDC provider)
  - RecyClique BFF client OIDC
  - Paheko client OIDC
- Ajouter section "Identity Operational Readiness":
  - prerequis config
  - mapping identite (`email`/`sub`)
  - plan de cutover et rollback
  - tests smoke obligatoires

Rationale:
- Transformer une capacite technique en systeme operable.

---

### D) Sprint/backlog routing

Artifact: `_bmad-output/implementation-artifacts/sprint-status.yaml`

**OLD:**
- Aucun epic dedie a la mise en service identite unifiee.

**NEW (propose apres approbation):**
- Ajouter Epic 14 en status `backlog`.
- Positionner l'epic apres Epic 13 (ou en priorite immediate selon arbitrage).

Rationale:
- Rendre le changement visible et executable dans le flux BMAD.

## 5) Implementation Handoff

### Scope classification

**Moderate** - reorganisation backlog + clarification PRD/Architecture + execution technique incrementale.

### Handoff recipients

- Product Owner / Scrum Master
  - Valider wording PRD/epics et priorisation Epic 14.
- Dev team
  - Implementer stories 14.x (infra/config/tests/runbooks).
- QA
  - Definir et executer plan E2E auth cross-plateforme.
- Architect/Tech lead
  - Valider mapping identite et strategie rollback.

### Success criteria

1. Un utilisateur reference dans Paheko peut se connecter a RecyClique via flux unifie.
2. Le parcours de connexion est operationnel en dev et documente pour prod.
3. Les runbooks incident/cutover/rollback existent et sont testes.
4. Le statut sprint/backlog reflète explicitement l'epic d'operationalisation.
5. Le gate 14.0 trace formellement la compatibilite OIDC de la cible Paheko (image/version/environnement) avant generalisation.

## Checklist Status (synthese)

### Section 1 - Trigger and Context
- [x] 1.1 Trigger identifie
- [x] 1.2 Probleme precise
- [x] 1.3 Evidence collecte

### Section 2 - Epic Impact
- [x] 2.1 Epic courant evalue
- [x] 2.2 Changements epic identifies
- [x] 2.3 Impacts futurs revus
- [x] 2.4 Nouvel epic necessaire
- [x] 2.5 Priorites/ordre a ajuster

### Section 3 - Artifact Impact
- [x] 3.1 PRD impacte
- [x] 3.2 Architecture impactee
- [x] 3.3 UX impactee (leger)
- [x] 3.4 Artefacts secondaires impactes

### Section 4 - Path Forward
- [x] 4.1 Direct adjustment viable
- [x] 4.2 Rollback non viable
- [x] 4.3 PRD MVP review partielle viable
- [x] 4.4 Approche recommandee selectionnee

### Section 5 - Proposal Components
- [x] 5.1 Issue summary
- [x] 5.2 Impacts et ajustements
- [x] 5.3 Approche recommandee + rationale
- [x] 5.4 Impact MVP + action plan
- [x] 5.5 Plan de handoff

### Section 6 - Final Review/Handoff
- [x] 6.1 Checklist completee
- [x] 6.2 Proposal coherente et actionnable
- [x] 6.3 Approbation explicite utilisateur (obtenue)
- [!] 6.4 Mise a jour sprint-status.yaml (action planifiee via workflow de replanification backlog)
- [x] 6.5 Confirmation finale next steps (handoff valide)

## 6) Final Routing Decision

### Route retenue

- Changement classe **Moderate**.
- Routage principal: **Product Owner / Scrum Master** pour replanification backlog (ajout Epic 14 et stories associees), puis execution par Dev/QA.

### Next-step execution plan

1. Mettre a jour `epics.md` avec Epic 14 (operationalisation identite unifiee) et stories 14.0 a 14.5.
2. Synchroniser `_bmad-output/implementation-artifacts/sprint-status.yaml` (Epic 14 en backlog).
3. Lancer le cycle normal de delivery sur Epic 14 (create-story -> dev -> review -> done).
4. Garder Epic 12 comme fondation technique stable, sans rollback.

