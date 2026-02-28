# 12.1 - IAM Decision Log (cross-plateforme)

Date: 2026-02-28  
Story source: `12-1-cadrage-iam-cible-et-matrice-d-acces-cross-plateforme`

## Regles de statut

- `open`: decision a arbitrer.
- `decided`: decision prise et applicable.
- `deferred`: decision reportee, avec prochaine action.

## Journal des decisions

| ID | Statut | Decision / Incertitude | Proprietaire | Date | Impact | Prochaine action |
|---|---|---|---|---|---|---|
| IAM-001 | decided | RecyClique reste la surface principale; Paheko est reserve a l'expert/secours selon role. | Product Owner | 2026-02-28 | Cadre UX et garde-fous d'acces unifies | Appliquer dans stories 12.2/12.4 |
| IAM-001b | decided | Paheko est la source de verite pour les adherents/benevoles et le cycle d'adhesion (activites, relances, comptabilisation des adhesions); RecyClique consomme cette verite sans la redefinir. | Product Owner | 2026-02-28 | Evite les divergences metier et les doubles saisies dans Epic 12 | Ancrer explicitement en 12.3/12.6 et verifier les contrats de synchro |
| IAM-002 | decided | Regle non negociable: benevole sans acces Paheko par defaut. | Product Owner | 2026-02-28 | Reduit le risque d'acces excessif | Implementer deny-by-default en 12.4 |
| IAM-003 | decided | Mecanisme d'exception obligatoire et auditable (demande, validation, expiration, revocation). | Security Lead (delegue PO) | 2026-02-28 | Permet les cas legitimes sans casser la gouvernance | Implementer flux et audit en 12.4/12.5 |
| IAM-004 | decided | Claims OIDC minimaux valides par le BFF: `iss`, `aud`, `exp`, `sub`, `role`, `tenant`. | Tech Lead BFF | 2026-02-28 | Conditionne l'acceptation de session | Ajouter checks automatiques en 12.2 |
| IAM-005 | decided | Approche en deux temps: API Paheko d'abord, plugin Paheko ensuite pour RBAC avance. | Architecte Produit | 2026-02-28 | Decoupe le risque et accelere la livraison | 12.3 puis 12.6 |
| IAM-006 | decided | Routes sensibles en mode fail-closed si IAM/claims/tenant incoherents ou indisponibles. | Security Lead (delegue PO) | 2026-02-28 | Evite les contournements dangereux en incident | Formaliser runbooks en 12.5 |
| IAM-007 | decided | `limited-write` admin Paheko verrouille en whitelist non-financiere (consultation membres/cycle adhesion, notes/tags, traces relance) avec deny explicite sur comptabilisation et admin globale, et fail-closed hors whitelist. | Product Owner | 2026-02-28 | Supprime l'ambiguite d'implementation 12.3/12.4/12.6 sur le perimetre admin Paheko | Relecture metier de confirmation le 2026-03-03 puis diffusion du contrat aux stories 12.3/12.4/12.6 |
| IAM-008 | open | Duree standard des exceptions benevole->Paheko (24h, 72h, 7j). | Product Owner | 2026-02-28 | Impact securite et operations | Decision PO planifiee le 2026-03-04; mise a jour immediate des policies 12.4/12.5 apres arbitrage |
| IAM-009 | deferred | Synchronisation temps reel des groupes avances cross-plateforme sans plugin dedie. | Architecte Technique | 2026-02-28 | Hors capacites API standard actuelles | Reporter sur 12.6 plugin RBAC avance |
| IAM-010 | deferred | Federation SLO complete (front-channel + back-channel) entre tous clients. | Tech Lead IAM | 2026-02-28 | Important mais non bloquant pour premier lot SSO | Reevaluer apres 12.2 stabilise |

## Risques de divergence a surveiller

- Interpretation differente du claim `tenant` entre BFF et Paheko.
- Extension informelle de permissions admin sans trace d'exception.
- Contournement du fail-closed en mode degrade.

## Regles d'exploitation du log

1. Toute ambiguity IAM detectee en 12.2-12.6 ouvre une nouvelle entree.
2. Toute entree `open` doit avoir un proprietaire unique et une prochaine action datee.
3. Toute entree `deferred` doit pointer une story cible de reprise.
