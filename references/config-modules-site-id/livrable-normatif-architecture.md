# Livrable — Architecture configuration modules (JSON serveur, `site_id`, CREOS)

**Emplacement canonique** : `references/config-modules-site-id/livrable-normatif-architecture.md`  
**Dernière mise à jour** : 2026-04-19  
**Conformité QA** : aligné sur le rapport QA2 fusionné (planificateur + trois passes : sécurité adversarial, CREOS / namespace JSON, prod et exploitabilité). Ce document est la **référence normative** pour specs et implémentations tant qu’aucune décision contraire n’est ADR-isée.

**Liens dans ce dossier** : [ADR-001-configuration-modules-json-par-site.md](ADR-001-configuration-modules-json-par-site.md) · [openapi-module-config.yaml](openapi-module-config.yaml) · schémas sous [`schemas/`](schemas/README.md) · [index.md](index.md)

**Usage** : périmètre pour QA architecturale ; une passe **code** ultérieure doit cibler des fichiers réels du dépôt.

---

## 1. Intention produit et problème à résoudre

- **Peintre (JARVOS / `peintre-nano`)** : bandeau KPI live (caisse kiosque, réception, widget bandeau-live) ; panneau **SuperAdmin → Gestion des modules** pour activer ou désactiver l’affichage et la période de rafraîchissement.
- **Exigence** : paramètres **persistants côté serveur**, **identiques pour une même origine / `site_id` / compte**, **transversal** entre sessions, navigateurs et profils — pas uniquement `localStorage` (vérité locale au navigateur).
- **Impératif** : tout ce qui touche sources, destinations ou périmètre multi-site inclut explicitement **`site_id`** ; objectif **sécurité et efficacité** du périmètre.

---

## 2. Architecture cible — première couche configuration

### 2.1 Persistance

- **Source de vérité** : JSON (souvent **JSONB**) **côté base**, pas seulement code ou navigateur.
- **Transversalité** : même valeur pour un même tenant ou site pour tous les postes autorisés.

### 2.2 CREOS (adressage) et transport HTTP

- **CREOS** : contrat **d’adressage** stable (`module_key`, `widget_type`, composition UI). Il décrit **où** brancher l’UI, pas une API métier complète.
- **Transport** : REST + JSON ; **un ou peu d’endpoints génériques** (ex. GET/PATCH par `module_key`) pour limiter la prolifération de routes.
- **Registre serveur** : la **liste blanche des `module_key`** est la source de vérité ; états recommandés **actif**, **déprécié**, **alias_de** ; normalisation canonique (casse fixe, Unicode NFKC si besoin) pour éviter homoglyphes et collisions.
- **Publication CREOS ↔ activation** : pas de déploiement UI « packaging » sans politique serveur équivalente (activation alignée au registre).

### 2.3 Stockage : couche config vs données métier

- **Couche 1** : mécanisme générique (ex. ligne **`site_id` + `module_key`**, payload JSON **versionné**).
- **Données métier** : tables dédiées lorsque jointures, contraintes fortes, audit légal ligne à ligne ou volumétrie les exigent — **sans** diluer le métier dans un blob générique.
- **Anti-pattern nommé** : éviter que **`module_key`** devienne un **god-namespace** pour tout ce qui « ressemble » à de la config ; classifier **UI / préférences** vs **données métier**.

### 2.4 Frontière avec les magasins existants du projet

- Concepts voisins : **`sites.configuration`**, **`settings`**, **`admin_settings`** (chiffrement au repos possible), endpoints type bandeau slice v2.
- **À formaliser par décision écrite** : précédence et propriété entre ces espaces et les documents **`site_id` + `module_key`** (qui surcharge qui : global, organisation, site, défaut).
- Le **chiffrement au repos** ne remplace pas les **ACL** ; une compromission applicative peut exposer les secrets si la gestion des clés est défaillante.

---

## 3. Exigences normatives après QA (non optionnelles pour une implémentation conforme)

### 3.1 Ordre des garde-fous (« reject-early »)

1. Limite **taille corps** et **profondeur** avant désérialisation coûteuse.
2. **Authentification** puis **autorisation** (dont **adhésion au site**) avant travail lourd.
3. Parsing JSON **borné** ; pas de validation schématique exhaustive **après** avoir déjà explosé CPU ou mémoire sur un corps invalide.

### 3.2 Tenant et identité

- **`site_id`** : résolu **côté serveur** (claims, session, membership), **jamais** seul argument client de confiance pour le périmètre tenant.
- **Preuve d’adhésion** : pour tout identité multi-site, refuser si l’utilisateur **n’est pas membre** du site demandé (**tests négatifs IDOR** obligatoires).
- **SuperAdmin vs opérateur site** : séparer **routes et politiques** pour éviter les primitives IDOR par substitution de `site_id**.

### 3.3 Autorisation

- Matrice **refus par défaut** : **rôle** × **`module_key`** × **site** (et niveau global si applicable).
- Liste blanche **`module_key`** ; erreurs **homogènes** (404 ou 403 selon politique produit contre l’énumération).

### 3.4 Validation JSON

- **JSON Schema** (ou équivalent) **par module**, **versionné** ; pas de **`$ref`** résolvable vers le réseau (**SSRF**) ; pas de motifs réguliers **ReDoS** non bornés ; **budget CPU / timeout** documenté pour la validation.

### 3.5 Secrets et confidentialité

- Pas de secrets en clair dans réponses **GET** pour des rôles non prévus ; même principe pour **PATCH**, **logs**, **exports d’audit**, **backups** et **diffs** si les secrets transitent.
- Préférer **champs dédiés**, ACL réduite, masquage, cycle de vie hors flux JSON générique lorsque pertinent.

### 3.6 Cache et réponses personnalisées

- Réponses tenant ou utilisateur : **`Cache-Control` adapté** (`private` / `no-store` si nécessaire), **`Vary`** correct ; pas de cache edge partagé qui mélangeraît les tenants.

### 3.7 Déni de service et abus

- **Rate limiting** sur GET ou PATCH selon criticité ; **limites taille** serveur et client documentées ; **retry** avec backoff côté client pour éviter l’amplification sur **409**.

### 3.8 Concurrence et versionnement

- **Optimistic locking** : **ETag** ou champ **version** aligné avec la persistance décrite en 2.3 ; **PATCH concurrent** → **409** attendu et comportement UI documenté.
- **If-Match** sur PATCH : si l’en-tête est **absent**, la politique (dernière écriture gagnante tolérée vs refus explicite / **428**) doit être **fixée à l’implémentation** et reflétée dans le contrat OpenAPI fusionné — voir `openapi-module-config.yaml` (brouillon).

### 3.9 Audit et RGPD

- Journalisation **append-only** : qui, quand, **`site_id`**, **`module_key`**, succès ou échec ; minimisation ; séparer si besoin **audit sécurité** et **journal métier** ; ACL sur la lecture des journaux.

### 3.10 Migration depuis `localStorage`

- Machine d’états **avant / pendant / après** sync ; **source de vérité** après import (serveur prioritaire sauf décision contraire explicite) ; **idempotence** des PATCH ; scénarios **double onglet**, **hors ligne**, **nettoyage** des clés locales.

### 3.11 Observabilité et exploitation

- Corrélation (**request_id**, **`site_id`**, sujet) ; métriques sur **refus authz**, **validation**, **409**, **rejets taille** ; alertes ; **runbook** minimal : désactivation d’un **`module_key`**, rollback, restore partielle, **kill-switch**.

---

## 4. Synthèse des risques résiduels (à traiter en spec avant « prêt prod »)

| Domaine | Risque si sous-spécifié |
|---------|-------------------------|
| Parse / validation | DoS ou fenêtre d’abus si garde-fous dans le **mauvais ordre** |
| Multi-tenant | IDOR, **confused deputy**, mauvais site pour identités multi-appartenance |
| Confidentialité | Fuite via **cache**, **logs**, backups |
| Prod | **Merge** global / site / défaut **non défini** → comportements divergents entre équipes ou navigateurs |
| Gouvernance | Dérive **CREOS ↔ registre `module_key`** |

---

## 5. Critères d’acceptation testables (extrait pour recette)

1. Rejet avant parse coûteux pour corps **au-dessus des plafonds** (tests au seuil).
2. Matrice **tenant** : utilisateur sans membership sur un **`site_id`** → échec systématique.
3. Tests négatifs **SuperAdmin** vs opérateur **site** sur substitution de **`site_id`**.
4. Pas de partage de réponses **personnalisées** entre sujets ou tenants (**en-têtes** et scénario CDN si applicable).
5. Aucun secret en clair là où la politique impose masquage (**réponses**, logs, audit, backups).
6. Schémas sans résolution réseau arbitraire ; validation **bornée** dans le temps ou en CPU.
7. Document de **merge** avec précédence **explicite** et erreurs si écriture au mauvais niveau.
8. Scénarios migration **localStorage** : vérité après sync, hors ligne, double onglet.
9. **ETag** / version alignés persistance ; concurrence → **409**.
10. Logs et métriques : corrélation, **liste blanche** des champs, **rétention** RGPD cohérente.
11. Registre **`module_key`** : états et alias ; tests lors de renommage ou dépréciation.
12. Procédure incident documentée (**désactivation**, rollback).

---

## 6. Score de maturité documentaire (indicatif)

- **Composite orienté « prêt prod »** : environ **76 / 100** après QA fusionné : fort sur intention et catalogue de risques ; la maturité **réelle** augmente avec **preuves** (tests d’intégration, revue déploiement, pentest ciblé).

---

## 7. Limites de ce livrable

- Pas d’audit **code** des dossiers **`peintre-nano`** ou **`recyclique`** tant que des chemins de fichiers ne sont pas fournis.
- Les noms **`sites.configuration`**, **`admin_settings`**, etc. sont **indicatifs** jusqu’à vérification dans le dépôt et les migrations réelles.

---

## 8. Historique des revues intégrées dans cette version

- Revues internes **pré-QA** : sécurité adversarial et cohérence architecture (sessions précédentes).
- **QA2 fusionné** (2026-04-19) : trois passes orchestrées ; synthèse fusionnée avec sévérité maximale et critères testables ci-dessus.

---

*Entrée pour `scope_paths` (QA2), recette, et alignement avec [ADR-001](ADR-001-configuration-modules-json-par-site.md) et [openapi-module-config.yaml](openapi-module-config.yaml).*
