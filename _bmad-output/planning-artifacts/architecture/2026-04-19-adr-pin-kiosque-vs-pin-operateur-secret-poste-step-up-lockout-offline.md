---
adr_id: ADR-SEC-PIN-KIOSQUE-2026-04-19
status: proposed
date: 2026-04-19
deciders: Strophe (produit / pilotage), alignement architecture BMAD Epic 25
consulted: >-
  prd.md canonique, PRD vision kiosques 2026-04-19, recherche technique
  alignement brownfield 2026-04-19
---

# ADR — PIN kiosque vs PIN opérateur, secret de poste, step-up, lockout et offline (Recyclique)

## Contexte

- Le **`prd.md`** canonique distingue deux familles de PIN et interdit de les fusionner sans décision d’architecture : le **PIN opérateur (caisse)** est **vérifié serveur**, hash stocké, session **JWT**, aligné **§4.1** et **§11.2** ; le **PIN kiosque (PRD vision)** vise la **PWA offline-first**, le **« passer la main »** et un **lockout** par identité ou poste, avec un mode de vérification **à trancher** avant code (`prd.md`, tableau « gouvernance des exigences importées », §4.1).
- Le **PRD vision** (`references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md`) prescrit pour l’**EPIC 2 — Identity** une **vérification locale** du PIN via un hash salé avec le **`kiosk_secret_key`**, des seuils **3 essais → soft-lock 30 s**, **5 essais → escalade admin**, le **Session Swap** (« passer la main ») avec règles panier, et un **mode superviseur** (escalade).
- Le **brownfield** expose aujourd’hui une authentification **opérateur** par **`POST /pin`** : vérification **côté API** contre un hash stocké, avec **rate limiting HTTP** (`@conditional_rate_limit("5/minute")`) — ce mécanisme protège la **route** mais **ne constitue pas** à lui seul la politique métier de lockout « par identité / kiosque » décrite au PRD vision (`_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md`, §5.1, §4 tableau, lignes PIN / soft-lock).
- Le **champ d’application de §11.2** dans `prd.md` est explicitement le **PIN opérateur** ; un **PIN kiosque** distinct, s’il est retenu, doit faire l’objet d’une **extension** (seuils, lockout, offline) qui **ne contredit pas** et **ne court-circuite pas** cette politique par inadvertance (**§11.2**, paragraphe « Champ d’application »).

## Décision

### 1. Séparation normative (non négociable)

1. **PIN opérateur (canonique brownfield)** : demeure la référence **serveur** — preuve par l’API, **hash** utilisateur côté base, émission de **JWT** de session opérateur, traçabilité et politique minimale **PIN v2** (**§11.2** : secret distinct, pas en clair dans les logs, usages tracés, blocage temporaire après erreurs, réinitialisation réservée aux rôles habilités). **Aucune** story kiosque ne doit **affaiblir** ce chemin (pas de contournement client, pas de « validation locale seule » substituée aux validations sensibles **serveur** lorsque le contexte est **en ligne** et que l’action relève du périmètre §11.2).
2. **PIN kiosque (cible PWA)** : famille **distincte** pour l’**identité de session au poste kiosque** (rotation rapide bénévoles, **passer la main**), couplée au **secret de poste** (matériel d’enrôlement **device / token kiosque**, PRD vision **EPIC 1**). Il n’est **pas** le même objet sécurité que le PIN opérateur : il est **lié au couple (poste enrôlé, opérateur)** dans la vision produit, pas substituable au modèle canonique **utilisateur + hash serveur + JWT** pour les **mêmes** garanties hors périmètre défini ci‑dessous.

### 2. Modèle de confiance retenu pour l’identité kiosque : **hybride borné**

**Décision** : adopter une trajectoire **hybride** (recherche §5.1, option (c) raffinée), avec bornes explicites :

| Régime | Comportement |
|--------|----------------|
| **En ligne** | **Préférence serveur** : synchronisation des **compteurs de lockout**, révocations, politiques et **step-up** avec la **vérité serveur** ; le client kiosque peut détenir des **vérifieurs locaux** (voir ci‑dessous) pour **UX** et **latence**, mais **ne fait pas foi** pour les actions **sensibles** au sens §11.2 si le backend exige encore une preuve **opérateur** (JWT / step-up serveur). |
| **Hors ligne (fenêtre tolérée)** | **Vérification locale** autorisée **uniquement** dans une **enveloppe** contractuelle : données **minimales** téléchargées sous **politique serveur** (pas d’annuaire adhérents en clair — alignement **RGPD offline** PRD vision / `prd.md` §2.4), matériel cryptographique dérivé du **secret de poste** (`kiosk_secret_key` / équivalent), et **jeton de session kiosque** borné. La **tolérance offline** est **bornée** : durées maximales, périmètre fonctionnel dégradé, et **reconciliation obligatoire** au retour réseau (lockout, révocations, conflits). |

Les **artefacts locaux** (ex. hash salé opérateur pour le poste) sont des **délégués** confiés par le serveur pour le mode dégradé ; ils **ne remplacent pas** l’autorité serveur pour les **mutations sensibles** une fois le poste **reconnecté** si la politique produit exige une **revalidation** serveur.

### 3. Vérification : locale / hybride / serveur

- **PIN opérateur** : **serveur uniquement** (chemin `POST /pin` et dérivés) — inchangé canoniquement.
- **PIN kiosque** : **hybride** — **local** pour déverrouiller la **session d’usage kiosque** offline ou pour fluidifier l’en ligne ; **serveur** pour **autoriser** les **synchronisations**, **réinitialisations**, **escalades** et pour **réaligner** les compteurs après reconnexion.

### 4. Lockout : deux couches explicites

1. **Couche transport / API (brownfield)** : le **rate limit** sur **`/pin`** reste un **garde-fou** **pour la route opérateur** ; il peut coexister avec une politique métier plus fine.
2. **Couche métier cible kiosque** : les seuils **vision** (**3** échecs → **soft-lock** **30 s**, **5** → **escalade admin / superviseur**) sont **retenus comme objectif produit** pour le **PIN kiosque** ; leur implémentation devra prévoir **compteurs par identité / poste** (et non seulement par IP), **persistance locale** pendant offline et **synchronisation** ou **fusion de règles** au retour en ligne — détail d’implémentation réservé aux stories aval (**sans** supprimer le rate limit opérateur ni réduire §11.2).

### 5. Tolérance offline

- **Autorisé** : session kiosque **dégradée** avec file locale (PRD vision **EPIC 1.2**), **PIN kiosque** local, et **pas** d’exposition de données personnelles hors politique RGPD.
- **Non autorisé** : utiliser le **PIN kiosque offline** pour **contourner** après coup les **step-up serveur** requis pour des actions déjà classées sensibles dans le canon **§11.2** lorsque le système est **en ligne** ; toute **fenêtre offline** doit définir un **périmètre** d’actions et des **garanties de rattrapage** (rejeu, conflits, verrouillage).

### 6. Bornes de revalidation (step-up)

- **Step-up / PIN opérateur** : demeure **cadre serveur** et **§11.2** pour les actions critiques **caisse / admin** dans le périmètre canonique.
- **Step-up kiosque** : les flux **« passer la main »**, **escalade superviseur** (PRD vision **2.1**, **2.3**) sont des **extensions** ; ils doivent être **specifiés** pour que l’**UI** ne crée **pas** l’illusion d’une validation serveur lorsque seul le **local** a répondu, et pour que le **retour en ligne** **revalide** les sessions **si** la politique de sécurité l’exige.

## Alternatives considérées

| Option | Pour | Contre |
|--------|------|--------|
| **PIN kiosque 100 % serveur** (comme opérateur) | Réutilise `POST /pin`, une seule vérité | **Incompatible** avec l’**offline-first** vision sans file d’attente très large et risques UX |
| **PIN kiosque 100 % local** (PRD vision strict) | UX terrain, offline | **Écart menaces** (OWASP / faible entropie PIN) sans **bornes** serveur ; risque de **double vérité** avec §11.2 |
| **Hybride borné (retenu)** | Offline utilisable, **serveur souverain** quand connecté | Complexité **sync** lockout / politiques ; nécessite **stories** et **spec** (25.4, readiness) |

## Conséquences

### Positives

- **Une seule lecture** pour les équipes : **deux PIN**, **deux modèles de confiance**, **pas de fusion** accidentelle dans une même story.
- Le **brownfield** **`POST /pin`** et **§11.2** restent **stables** ; le kiosque peut évoluer sans **régression** normative sur l’opérateur.

### Négatives / suites obligatoires

- **Specs détaillées** : format des **bundles** offline, **fusion** des compteurs lockout, **TTL** session kiosque, **matrice** action sensible × online/offline — à détailler dans **Story 25.4** et stories d’implémentation.
- **Tests / readiness** : le gate **PWA / kiosque** (`implementation-readiness-report-2026-04-19.md`, `prd.md` §2.4) reste à lever **après** fermeture des autres ADR Epic 25 et **Story 25.5**.

## Conformité

- **`prd.md`** : tableau gouvernance PIN ; §4.1 deux familles ; §11.2 champ d’application **PIN opérateur** et extension kiosque **après ADR**.
- **PRD vision** : **EPIC 2** (PIN local `kiosk_secret_key`, soft-lock, Session Swap, superviseur).
- **Recherche brownfield** : §4 (écarts PIN / lockout), §5.1 (route `/pin`, options a/b/c).

## Références

- `_bmad-output/planning-artifacts/prd.md` (tableau exigences importées, §4.1, §11.2, §2.4)
- `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md` (EPIC 1–2, NFR)
- `_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md` (§4, §5.1, §6–§7)

## Stories aval encore bloquées ou directement concernées (tant que l’ADR n’est pas **accepted** et/ou sans spec complémentaire)

Les identifiants ci‑dessous sont ceux de **`_bmad-output/planning-artifacts/epics.md`** :

- **Story 11.3** — Retrouver la vente caisse kiosque observable dans `Peintre_nano`
- **Story 13.1** — Retrouver les écrans caisse adjacents au kiosque observable dans `Peintre_nano`
- **Story 13.7** — Auditer et traduire le kiosque legacy vers un plan de portage `Peintre_nano`
- **Story 13.8** — Implémenter la traduction kiosque legacy retenue dans `Peintre_nano`
- **Toute future story BMAD** d’**auth PIN kiosque**, de **« passer la main »** / **Session Swap** (hors seul changement d’opérateur **serveur** `POST /pin`), d’**implémentation step-up** spécifique kiosque offline, ou de **device / token kiosque** **AC** dépendant du modèle PIN poste — y compris les stories **EPIC 1–2** du PRD vision une fois découpées et numérotées dans `epics.md`
- **Story 25.4** — Les invariants **poste / kiosque** et **bascule de contexte** touchant le PIN doivent **s’aligner** sur cette ADR (les autres paragraphes de 25.4 peuvent avancer en parallèle)

## Suivi BMAD

- Passage du statut YAML de cet ADR de **`proposed`** à **`accepted`** après **revue humaine** explicite (produit + architecte ou équivalent) tracée dans la **Story 25.2** ou minute d’équipe.
- **Story 25.3** (async Paheko), **25.4** (socle multisite / poste), **25.5** (readiness) : **orthogonal** sur le fond mais **séquentiels** pour le **gel** global Epic 25.
