---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - references/idees-kanban/archive/2026-04-19_aligner-brownfield-prd-architecture-permissions-bmad.md
  - references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md
  - references/artefacts/2026-04-19_03_qa2-findings-revisions-cloture-bmad-passe.md
  - references/idees-kanban/a-faire/2026-04-19_chantier-refactor-api-recyclique-audit-brownfield-handoff.md
  - references/artefacts/2026-04-19_01_audit-brownfield-recyclic-api-architecture-style-handoff.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad/bmm/config.yaml
qa_traceability_post_revision:
  date: 2026-04-19
  note: >-
    Réponses aux findings QA2 (gel PRD, chaîne readiness, inputDocuments, méta score).
    L'ancienne méta qa2_review (score 76/100) n'est plus une vérité de pilotage — voir
    references/artefacts/2026-04-19_03_qa2-findings-revisions-cloture-bmad-passe.md pour la synthèse.
workflowType: research
lastStep: 6
research_type: technical
research_topic: Alignement brownfield (API Recyclic, Peintre_nano, Paheko) vs PRD multisite, permissions, kiosques PWA
research_goals: Cartographier écarts techniques, options d’implémentation, priorités et besoins de correct course avant découpage epic/story.
user_name: Strophe
date: 2026-04-19
web_research_enabled: true
source_verification: true
scope_confirmed_by_user_request: true
---

# Recherche technique : alignement brownfield ↔ PRD Recyclique (multisite, permissions, kiosques PWA)

**Date :** 2026-04-19  
**Auteur :** Strophe (assisté agent)  
**Type :** Recherche technique (BMAD `bmad-technical-research`)  
**Document d’amorce :** `references/idees-kanban/archive/2026-04-19_aligner-brownfield-prd-architecture-permissions-bmad.md`

---

## Résumé exécutif

Le PRD « vision » du 2026-04-19 fixe une cible forte : **PWA offline-first**, **PIN / identité kiosque** avec règles fines (soft-lock, escalade), **file Redis** pour toute écriture Paheko, **analytique multi-sites** immuable après première vente. L’API Recyclique couvre déjà des briques proches : **auth opérateur par PIN côté serveur** (hash en base) suivie d’un **JWT de session** (changement d’opérateur caisse) — à ne pas confondre avec le **token matériel kiosque** et le **PIN « local au secret kiosque »** décrits au PRD pour le poste PWA. **Outbox Paheko transactionnelle en base** et **site_id** sur caisse complètent le rapprochement brownfield, avec écarts sur **outbox SQL vs « job Redis »** et **modèle de confiance PIN** (serveur vs local PRD).

**Recommandation courte :** matière première pour **`bmad-edit-prd`** (skill Cursor) et ADR ; gate **`bmad-check-implementation-readiness`** avant d’alourdir les epics. En parallèle, le **chantier refactor API** (P0 audit : pytest unique, `AdminService`) reste **orthogonal** au multisite mais constitue un **prérequis de qualité** pour toucher Paheko/caisse sans dette explosive — aligner conventions (voir §4 et §7).

**Convention d’invocation BMAD dans ce dépôt :** les skills installés sous `.cursor/skills/` portent des noms **courts** (`bmad-edit-prd`, `bmad-correct-course`, `bmad-check-implementation-readiness`, `bmad-document-project`). Le fichier `_bmad/_config/bmad-help.csv` peut les préfixer `**bmad-bmm-*`** : **même intention**, commande affichée différente selon l’entrée (chat skill vs catalogue CSV).

---

## Table des matières

1. [Confirmation de périmètre](#1-confirmation-de-périmètre)
2. [Méthodologie et sources](#2-méthodologie-et-sources)
3. [Synthèse web (patterns transverses)](#3-synthèse-web-patterns-transverses)
4. [Tableau PRD → état repo → gap → priorité](#4-tableau-prd--état-repo--gap--priorité)
5. [Analyse par thème PRD](#5-analyse-par-thème-prd)
6. [Croisement epics BMAD existants](#6-croisement-epics-bmad-existants)
7. [Risques et décisions à trancher](#7-risques-et-décisions-à-trancher)
8. [Prochaines étapes BMAD](#8-prochaines-étapes-bmad)
9. [Références](#9-références)

---

## 1. Confirmation de périmètre

**Sujet :** alignement de l’existant (`**recyclique/api`**, intégrations Paheko, socle UI **Peintre_nano**) avec le PRD `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md`.

**Objectifs :**

- Identifier où le brownfield **satisfait déjà** l’intention produit.
- Lister les **écarts techniques** (impl manquante vs impl différente).
- Proposer **priorités** et signaler si un `**bmad-correct-course`** est nécessaire sur la trajectoire epic/sprint.

**Périmètre confirmé** par la demande explicite de lancement de la recherche sur la fiche Kanban (équivalent « [C] Continue » du workflow pas à pas).

---

## 2. Méthodologie et sources


| Source                                                           | Usage                                                      |
| ---------------------------------------------------------------- | ---------------------------------------------------------- |
| PRD vision 2026-04-19                                            | Exigences cibles (epics 1–4, NFR)                          |
| Audit API 2026-04-19                                             | Homogénéité backend, dette, Redis déjà au socle            |
| `auth.py`, `paheko_outbox_service.py`, `cash_session_service.py` | Vérifications ponctuelles code                             |
| `epics.md` BMAD                                                  | Cohérence avec FR v2 déjà décomposés                       |
| Recherche web                                                    | Patterns **outbox**, **offline PWA**, **stockage secrets** |
| `_bmad/bmm/config.yaml`                                          | `planning_artifacts`, langue, périmètre sortie BMAD        |


---

## 3. Synthèse web (patterns transverses)

### 3.1 Fiabilité Paheko / intégrations asynchrones

Le **transactional outbox** consiste à persister les « messages » ou tâches sortantes **dans la même transaction** que les données métier, puis à les traiter via un **processus relais** (polling ou CDC). Cela évite le problème de **double écriture** (base + broker) sans 2PC. Voir par exemple les synthèses récentes sur le pattern ([npiontko.pro, 2025](https://www.npiontko.pro/2025/05/19/outbox-pattern), [webcoderspeed.com](https://webcoderspeed.com/blog/scaling/outbox-pattern-reliability)).

**Lecture projet :** l’API utilise une table `**PahekoOutboxItem`** et un enqueue **avant commit** métier — alignement conceptuel fort avec ce pattern, même si le PRD mentionne explicitement une « file Redis ».

### 3.2 Offline-first / PWA

Les guides modernes insistent sur : **IndexedDB** comme couche durable, prudence sur quotas et modes privés, et stratégies de sync avec **idempotence** et ordre ([web.dev — IndexedDB best practices](https://web.dev/articles/indexeddb-best-practices)). Les articles « offline-first » évoquent souvent une **file locale** (outbox côté client), **clés d’idempotence**, et coordination multi-onglets (Web Locks / BroadcastChannel) pour éviter les courses.

**Lecture projet :** pas de trace évidente de `serviceWorker` / `workbox` dans une recherche textuelle rapide sur le dépôt ; le chantier PWA reste **à confirmer** sur le bon paquet frontend (kiosque dédié vs shell Peintre).

### 3.3 PIN et stockage de secrets

L’[OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) rappelle l’usage de **fonctions à sens unique** adaptées (Argon2id, scrypt, bcrypt selon contexte), facteur de coût, et défense en profondeur. Un **PIN numérique court** reste **faible en entropie** : la mitigation repose sur **taux d’essai**, **verrouillage**, **pepper** / secret serveur, et **surface d’attaque** (pas de hash « offline » distribuable sans garde-fous).

---

## 4. Tableau PRD → état repo → gap → priorité

Légende **priorité** : **P0** bloque la vision sécurité/compta ; **P1** fonctionnel majeur ; **P2** qualité / dette ; **ADR** décision de conception à documenter.

**Non-exhaustivité :** le tableau couvre les **NFR majeurs** et les **epics 1–4** du PRD vision de façon **synthétique**. Les stories suivantes restent **à détailler** en lignes ou en spikes dédiés si elles deviennent prioritaires : **1.1 AC3** (révocation double IP token kiosque), **1.3** (hardware scanner / impression), **2.2** (découplage présence / caisse, comptes bénévolat Paheko), **2.3** (mode superviseur, QR TTL, bandeau).

**Périmètre de preuve (contrat lecture QA) :** une cellule **« non prouvé »** ou **« non vérifié dans cette passe »** signifie **absence de preuve exhaustive dans ce document** (pas d’audit fichier par fichier), **pas** l’affirmation « faux en repo ». Les affirmations **positives** (ex. présence d’outbox, route PIN) reposent sur des **extraits de code** ou artefacts cités dans les sections §5–§6. Toute ligne **P0/P1** sans preuve attachée ici doit être **re-validée** par story ou spike avant implémentation.

| Thème PRD (réf.)                                   | État repo (indicatif)                                                                                                                            | Gap                                                                                                                                                                                                                                           | Priorité                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| NFR **UTC strict**                                 | **Non prouvé** dans cette recherche (pas d’échantillon fichiers) ; hypothèse « à auditer » côté API + indispensable côté UI/offline              | Audit transversal date/heure (BDD, API, IndexedDB, rendu) avec exemples traçables                                                                                                                                                             | P1                              |
| NFR **immuabilité comptable**                      | Clôture caisse + snapshot figé + outbox (stories 22.x, 8.1)                                                                                      | Vérifier même invariant sur **ventes offline** replay                                                                                                                                                                                         | P0                              |
| NFR **no auto-close / auto-suspend**               | Logique métier caisse à rapprocher du PRD (hors périmètre détaillé ici)                                                                          | Spec + tests alignés PRD §4                                                                                                                                                                                                                   | P1                              |
| NFR **RGPD offline** (pas d’adhérents en clair)    | Non vérifié dans cette passe                                                                                                                     | Design données minimales kiosque + revue privacy                                                                                                                                                                                              | P0                              |
| NFR **async Paheko via Redis**                     | **Outbox SQL** + processeur, Redis au socle pour autre usage                                                                                     | Soit **relabel PRD** (« outbox durable »), soit **router** vers Redis après commit (2e phase)                                                                                                                                                 | ADR                             |
| Epic 1 **PWA device + token**                      | Non démontré dans le dépôt scanné                                                                                                                | Module kiosque, SW, cycle de vie token                                                                                                                                                                                                        | P1                              |
| Epic 1 **sync delta + offline queue**              | Non démontré                                                                                                                                     | IndexedDB outbox + API idempotentes + conflits stock                                                                                                                                                                                          | P0                              |
| Epic 2 **PIN local + kiosk_secret**                | **PIN vérifié serveur** (`hashed_pin`, bcrypt)                                                                                                   | Écart modèle menace : PRD dit vérification locale ; arbitrer                                                                                                                                                                                  | ADR                             |
| Epic 2 **soft-lock 3 / hard 5**                    | `@conditional_rate_limit("5/minute")` sur `/pin` = **plafond HTTP temporel** (souvent par IP), **≠** compteurs métier PRD par identité / kiosque | Politique lockout **métier** (compteurs, fenêtres) en plus ou à la place du rate limit infra                                                                                                                                                  | P1                              |
| Epic 2 **session swap + panier**                   | **POST `/pin`** + JWT session opérateur (changement d’opérateur) ; règles panier PRD à mapper                                                    | UX + API + états caisse                                                                                                                                                                                                                       | P1                              |
| Epic 3 **création site → job Redis Paheko**        | Sites/caisse ; outbox sur **clôture** (et évolutions)                                                                                            | Étendre outbox / jobs à **création projet** si requis                                                                                                                                                                                         | P1                              |
| Epic 3 **parent_id nomade immuable**               | Non vérifié ici                                                                                                                                  | Modèle données + contraintes DB                                                                                                                                                                                                               | P1                              |
| Epic 3 **catégories multi-niveaux masquage**       | Non vérifié ici                                                                                                                                  | Alignement avec modèle catégories actuel                                                                                                                                                                                                      | P2                              |
| Epic 4 **plages horaires + auto-suspend**          | À rapprocher des services caisse existants                                                                                                       | Parité PRD + notifications                                                                                                                                                                                                                    | P1                              |
| Epic 4 **canaux alertes**                          | Non couvert ici                                                                                                                                  | Intégration config + fallback                                                                                                                                                                                                                 | P2                              |
| Chantier parallèle **refactor API (audit F1–F11)** | Audit 2026-04-19 : **F1–F8** style/couches + **F9–F11** (contrats d’erreur `ConflictError`, écart Docker/`[dev]`, `collect_ignore` pytest)       | Le Kanban chantier cite **F1–F8** comme fil conducteur ; ne **pas omettre F9–F11** pour les PR qui touchent erreurs, CI ou collecte de tests. P0 audit (pytest maîtresse, `AdminService`) = **gate qualité** avant branches longues multisite | P0 (gate) + P1 (alignement PRD) |


---

## 5. Analyse par thème PRD

### 5.1 Identité PIN et kiosque

Le PRD décrit une vérification **locale** du PIN avec matériel dérivé du `**kiosk_secret_key`**. L’implémentation actuelle valide le PIN **côté API** contre un hash stocké (`verify_password`), avec **limite de débit** sur la route :

```476:487:d:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\recyclique\api\src\recyclic_api\api\api_v1\endpoints\auth.py
@router.post("/pin", response_model=PinAuthResponse)
@conditional_rate_limit("5/minute")
async def authenticate_with_pin(
    request: Request,
    payload: PinAuthRequest,
    db: Session = Depends(get_db)
) -> PinAuthResponse:
    """Authentifie un utilisateur via son ID et PIN, et retourne un JWT.

    Cette route est utilisée pour le changement d'opérateur en caisse.
    Rate limited à 5 tentatives par minute pour éviter le bruteforce.
    """
```

**Écart :** modèle de confiance et surface offline (PRD) vs **auth réseau** (repo). **Options :** (a) ajuster le PRD vers « PIN serveur + politique lockout » compatible kiosque online ; (b) introduire un **secret kiosque** et un schéma de preuve sans exposer l’annuaire adhérents ; (c) hybride : cache minimal autorisé + revalidation online périodique.

### 5.2 Paheko asynchrone

Le PRD exige une **file Redis**. Le repo implémente une **outbox relationnelle** avec idempotence métier :

```39:59:d:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\recyclique\api\src\recyclic_api\services\paheko_outbox_service.py
def enqueue_cash_session_close_outbox(
    db: Session,
    *,
    closed_session: CashSession,
    correlation_id: str,
    accounting_close_snapshot: Optional[dict[str, Any]] = None,
) -> PahekoOutboxItem:
    """
    Insère une ligne outbox pour une session déjà passée à **closed** en mémoire ;
    appeler **avant** le ``commit`` métier pour atomicité avec la clôture.
    """
    sid = closed_session.id
    ikey = idempotency_key_cash_session_close(sid)
    existing = db.query(PahekoOutboxItem).filter(PahekoOutboxItem.idempotency_key == ikey).one_or_none()
    if existing is not None:
        logger.info(
            "paheko_outbox_enqueue skip duplicate idempotency_key=%s correlation_id=%s",
            ikey,
            correlation_id,
        )
        return existing
```

**Écart :** technologie de file (Redis vs PostgreSQL). **Lecture ingénierie :** les deux peuvent satisfaire le NFR « asynchrone résilient » ; la décision est **produit + ops** (latence, observabilité, équipe). À trancher par **ADR** plutôt que par story isolée.

### 5.3 Multi-site analytique

Le brownfield connaît déjà `**site_id`** sur les sessions de caisse et les registres (voir `cash_session_service.py`). Le PRD ajoute des règles **projet Paheko** et **immuabilité** post-première vente : c’est surtout du **modèle de données + jobs Paheko**, à valider contre `references/migration-paheko/` et les mappings comptables existants.

### 5.4 PWA / offline

**Méthode (pour éviter faux négatifs) :** recherche textuelle sur la racine du dépôt **JARVOS_recyclique** (`rg` / grep) sur des motifs `serviceWorker`, `workbox`, `indexeddb` dans des globs `*.{ts,tsx,js,vue}` — **aucune occurrence** trouvée dans cette passe (shell **Peintre_nano** sous `peintre-nano/` inclus). Cela **ne prouve pas** l’absence d’un futur paquet kiosque hors ce périmètre ni d’un code généré ; il faudra répéter l’inventaire si un nouveau répertoire entre dans le workspace.

Tant que le socle **Service Worker + IndexedDB** (ou équivalent) n’est pas posé, l’**Epic 1–2 du PRD vision** relève de **spike / architecture front** + contrats API (idempotence, horodatage UTC, résolution conflits stock).

---

## 6. Croisement epics BMAD existants

Le fichier `_bmad-output/planning-artifacts/epics.md` décrit déjà une trajectoire v2 (Piste A Peintre / Piste B Recyclique, contextes `site`, `caisse`, `PIN`, etc.). Le **PRD vision 2026-04-19** est **plus prescriptif** sur le kiosque (hardware, offline, règles PIN).

**Risque de double vérité :** `prd.md` (BMAD) vs `references/vision-projet/...` (vision détaillée). La recherche recommande une **fusion documentaire** avant d’ajouter des stories, pour éviter que le sprint-status ne **contredise** le PRD kiosque.

---

## 7. Risques et décisions à trancher

1. **Redis vs outbox SQL** pour Paheko — impact ops, idempotence déjà en place sur clôture.
2. **PIN local vs serveur** — impact sécurité offline et conformité RGPD PRD.
3. **Ordre des chantiers** — les **P0 de l’audit API** (pytest, `AdminService`) sont des **prérequis de maintenabilité** pour les zones Paheko/caisse ; ils peuvent **ralentir** le parallèle « features multisite » si la même équipe les porte — trancher dans un `**bmad-correct-course`** si les deadlines divergent.
4. **Token kiosque « deux IP révoquent »** — besoin de composant **session/device** dédié (non détaillé dans cette passe code).
5. **Double vérité artefacts** — fiche Kanban vs `_bmad-output` (voir §8).

---

## 8. Prochaines étapes BMAD

**Skills Cursor (noms à invoquer dans le chat)** — équivalents possibles dans `bmad-help.csv` entre parenthèses :


| Étape                                            | Skill Cursor (prioritaire)            | Alias catalogue BMM (référence)           | Commentaire                       |
| ------------------------------------------------ | ------------------------------------- | ----------------------------------------- | --------------------------------- |
| Consolider les décisions                         | `bmad-edit-prd`                       | `bmad-bmm-edit-prd`                       | Harmoniser PRD vision et `prd.md` |
| Si epics actuels ne reflètent pas le kiosque PRD | `bmad-correct-course`                 | `bmad-bmm-correct-course`                 | Rebasing sprint / epics           |
| Avant dev massif                                 | `bmad-check-implementation-readiness` | `bmad-bmm-check-implementation-readiness` | Gate PRD / archi / epics          |
| Documentation brownfield                         | `bmad-document-project` (optionnel)   | `bmad-bmm-document-project`               | Si nouveaux contributeurs         |


### Critère de sortie Kanban vs emplacement BMAD

La fiche Kanban suggère un artefact daté sous `**references/artefacts/`** (preuve « projet »). Ce rapport est enregistré sous `**_bmad-output/planning-artifacts/research/**`, ce qui est **cohérent** avec `planning_artifacts` dans `_bmad/bmm/config.yaml` pour un livrable **BMAD Technical Research**.

**Pour lever toute ambiguïté « done » :** (a) ajouter une **note datée** sur la fiche Kanban acceptant `planning_artifacts/research/` comme sortie équivalente, **ou** (b) publier un **duplicata court** (tableau §4 + recommandations §8) dans `references/artefacts/` avec lien vers ce fichier — sans les deux, un audit process peut encore contester la preuve de sortie stricte.

---

## 9. Références

### Web

- [Transactional Outbox Pattern — synthèse](https://www.npiontko.pro/2025/05/19/outbox-pattern) ; [fiabilité / double write](https://webcoderspeed.com/blog/scaling/outbox-pattern-reliability)
- [web.dev — IndexedDB best practices](https://web.dev/articles/indexeddb-best-practices)
- [OWASP — Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

### Dépôt

- `references/idees-kanban/archive/2026-04-19_aligner-brownfield-prd-architecture-permissions-bmad.md`
- `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md`
- `references/artefacts/2026-04-19_01_audit-brownfield-recyclic-api-architecture-style-handoff.md`
- `_bmad-output/planning-artifacts/epics.md`

---

## Technical Research Scope Confirmation (workflow step 1 — intégré)

**Research Topic :** Alignement brownfield vs PRD multisite, permissions, kiosques PWA.  
**Research Goals :** Cartographie des écarts, options d’implémentation, priorités, signaux correct course.  
**Méthodologie :** analyse repo + patterns publics vérifiés (web).  
**Scope confirmé :** 2026-04-19 (lancement explicite par l’utilisateur).