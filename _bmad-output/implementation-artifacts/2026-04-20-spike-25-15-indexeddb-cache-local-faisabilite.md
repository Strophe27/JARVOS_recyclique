# Spike 25.15 — Faisabilité IndexedDB / cache local minimal (sans livraison PWA)

**Date :** 2026-04-20  
**Story :** `25-15-spike-faisabilite-indexeddb-cache-local-sans-livraison-pwa`  
**Epic :** 25 — phase 2 (impl)  
**Nature :** documentaire uniquement — **aucun** Service Worker produit, **aucun** magasin persistant client « prêt prod » dans ce spike.

---

## Note — `epic-25` **in-progress** dans `sprint-status.yaml`

Après **`25-15`** en **`done`** dans `development_status`, la cle **`epic-25`** peut **rester** **`in-progress`** : la **phase 2** (**25.6**–**25.15**) est alors **bouclee au niveau stories**, mais **clôturer l’epic** (**`epic-25`** → **`done`**) est une **décision séparée** — typiquement **`bmad-retrospective`**, arbitrage **`epics.md`** / **`bmad-correct-course`**, validation humaine — et **non** automatique comme pour une story. **Ne pas confondre** avec le verdict programme **NOT READY** PWA : celui-ci reste régi par §1 ci-dessous et les documents readiness cités.

---

## Résumé exécutif

Ce spike borne une **étude** sur la persistance navigateur (IndexedDB, alternatives légères) pour de futurs scénarios (file d’attente locale, cache catalogue, préférences non métier déjà cadrées ailleurs). La stack **Peintre_nano** / React reste compatible avec **Dexie.js** (~4.x) ou **idb** (Jake Archibald) comme enveloppes au-dessus de l’API **IndexedDB** native ; **`localStorage` / `sessionStorage`** restent limités en taille et synchrones ; la **Cache API** sert surtout aux assets / SW — **hors scope livraison SW** ici.

**Conclusion pilotage :** **later** pour un programme PWA / offline-first **massif** (readiness inchangée, voir §2) ; **go (conditionnel)** pour des **prototypes jetables** ou un **spike UX+archi** supplémentaire **daté**, sous les **critères d’arrêt** ci-dessous ; **no-go** pour tout magasin persistant **en production** ou présenté comme « feature prod » sans epic PWA explicite et sans levée documentaire du **NOT READY** programme.

---

## 1. Citations obligatoires — baseline readiness (ne pas « lever » NOT READY seul)

### 1.1 `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md`

- **Encadré « Lecture après 2026-04-20 »** (vers le début du fichier) : ce rapport **2026-04-19** reste une **baseline** utile pour **NOT READY** programme PWA, **GO conditionnel** cœur v2 et gate API P0.
- **Synthèse exécutive — tableau** : ligne **Extension PWA offline-first (PRD vision)** → **NON PRÊTE** ; pas d’epic dédié aligné sur le PRD vision ; pas de SW/IndexedDB identifiés dans le périmètre scanné.
- **Verdict global** : **GO conditionnel** pour la poursuite v2 ; **NO-GO** pour un **programme d’implémentation massif** centré sur le **PRD vision kiosque PWA** tant que les FR/epics ne reflètent pas explicitement l’extension PWA et que les autres conditions du rapport ne sont pas réunies.
- **§4 Alignement UX** : **Offline-first PWA** du PRD vision **non** encore reflétée dans l’architecture indexée (**pas d’ADR « Service Worker / sync client »** dans l’index actuel à la date du rapport).
- **§6 Synthèse finale — tableau** : **Extension PRD vision kiosque PWA / offline-first** → **NOT READY** — attend ADR + découpage FR/epic + preuve archi front.
- **Actions critiques / Prochaines étapes** : trancher ADR, intégrer la cible PRD vision dans `epics.md` si priorité kiosque ; gate qualité API P0 ; prochaines étapes BMAD incluant **`bmad-correct-course`** / **`bmad-create-epics-and-stories`** pour le kiosque.

### 1.2 `_bmad-output/planning-artifacts/2026-04-20-note-readiness-cible-post-epic25-decisions.md`

- **§1 Synthèse** : l’**extension PWA / kiosque / offline-first** (PRD vision) reste **toujours NOT READY** pour un **programme massif** PWA tant que l’absorption des exigences vision en FR/epics et les preuves techniques front (SW / IndexedDB, etc.) ne sont pas réalisées par des livrables dédiés.
- **§2 Gates** : **Readiness globale extension PWA / kiosque** → **Ouvert** ; distinction entre levée **process** (`GEL_DOC` / 25.6) et **NOT READY** PWA **distinct**.

### 1.3 Formulation contractuelle (obligatoire)

**Seuls** une **correct course**, un **readiness programme** révisé ou une **décision produit/architecture explicite** peuvent retirer le **NOT READY** au niveau **programme** pour l’extension PWA massive — **pas** ce spike documentaire **isolé**. Ce livrable **ne lève pas** le verdict **NOT READY** du rapport **2026-04-19** ni le gate **extension PWA** décrit dans la note **2026-04-20**.

---

## 2. Critères d’arrêt (hard stops)

| # | Arrêt |
|---|--------|
| 1 | **Aucun** magasin persistant client (IndexedDB, Cache Storage durable pour métier, etc.) **en production** ou derrière un **feature flag** présenté comme « prêt prod » sans epic PWA et sans levée documentaire du **NOT READY** programme. |
| 2 | **Aucun** contournement silencieux du **gel** / des **gates** readiness (note **2026-04-20** §2) ni des règles **25-8** (`CONTEXT_STALE`, alignement enveloppe) via un cache local qui **masquerait** un état serveur refusé. |
| 3 | **Aucune** livraison **Service Worker** « full PWA » ni engagement **offline-first** produit dans ce spike — **borne** à **prototypage local** ou **branche expérimentale** si exploration technique, avec périmètre daté et jetable. |
| 4 | Cohérence avec **25-11** : toute donnée mise en cache localement qui reflète le **contexte d’exploitation** doit rester **alignée** sur le contrat `ContextEnvelope` / fraîcheur documentée ; **pas** de seconde source de vérité contradictoire avec le serveur. |

---

## 3. Options techniques (niveau recommandation — aucune dépendance npm figée en prod par ce spike)

| Option | Usage typique | Limites / notes |
|--------|----------------|-----------------|
| **IndexedDB** (+ **Dexie.js** ou **idb**) | File d’attente, cache structuré, gros volumes | Transactions, index, migrations de schéma à versionner ; API verbeuse si sans wrapper |
| **`sessionStorage`** | Jeton UI éphémère, état d’onglet | Faible taille ; effacé à la fermeture d’onglet |
| **`localStorage`** | Préférences légères, clés non sensibles | ~5 Mo souvent ; synchrone ; pas pour secrets |
| **Cache API** | Assets / réponses HTTP (souvent avec SW) | Hors périmètre **livraison SW** ici ; à ne pas confondre avec persistance métier IndexedDB |

**Invalidation / version de schéma :** prévoir un **numéro de version** de store (ou `onupgradeneeded`) et une **politique de purge** (TTL logique, invalidation à la montée de version API, ou rechargement forcé après `409` / `CONTEXT_STALE` — **25-8**).

**Chiffrement au repos :** IndexedDB n’offre pas de chiffrement natif ; pour données sensibles au poste, il faudrait **Web Crypto** + modèle de clés — **hors impl** ici, **risque** à cadrer avant toute persistance réelle.

---

## 4. Risques

| Risque | Commentaire |
|--------|-------------|
| **Données sensibles au poste** | Poste partagé / kiosque : fuite via IndexedDB non chiffrée ; alignement **ADR 25-2** (PIN offline — hors impl ici sauf rappel de limites). |
| **Divergence multi-onglets** | Deux onglets, deux caches ; conflits d’écriture — **25-14** ; nécessité de **leader tab**, **BroadcastChannel** ou relecture serveur. |
| **Quota navigateur** | Éviction possible sous pression disque ; gérer erreurs `QuotaExceededError`. |
| **Compatibilité kiosque** | Navigateur cible parfois **inconnu** — risque à qualifier en terrain (version, mode kiosque, politiques IT). |
| **Substitution au serveur** | Cache ne doit pas masquer **409** `CONTEXT_STALE` ni invalider les preuves d’alignement **ContextEnvelope** (**25-11**). |

---

## 5. Cohérence 25-11 / 25-8 / spec 25.4

- **25-11** : types et exemples `ContextEnvelope` — toute projection locale du contexte doit **rester traçable** et **invalidable** quand l’API indique un refus ou une obsolescence.
- **25-8** : le client ne doit **pas** « réussir » silencieusement une action métier si le serveur exige un contexte à jour.
- **Spec 25.4** (`2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md`) : invariants multisite / projection — le cache local ne remplace pas la **vérité** serveur pour les décisions d’autorisation.

---

## 6. Décision — go / no-go / later + bandes de coût (T-shirt / jours·dev, incertitude élevée)

| Horizon | Décision | Bande de coût (indicatif) | Rappel readiness |
|---------|----------|---------------------------|------------------|
| **Spike UX + archi supplémentaire** (wireframes flux offline, stratégie invalidation) | **go** si prototype **jetable** et **hors prod** | **S : 2–5 j·dev** (±50 %) | Programme PWA **NOT READY** tant que FR/epics vision non absorbés |
| **MVP cache lecture seule** (ex. catalogue figé + refresh explicite) | **later** — après arbitrage epic + UX | **M : 1–3 semaines** équipe réduite | Même **NOT READY** programme jusqu’à acte de pilotage distinct |
| **Socle offline-first partiel** (queue + sync partielle) | **no-go** en l’état **readiness** ; **later** si roadmap epic + ADR SW | **L : 1–3 mois+** selon périmètre | Verdict **2026-04-19** + gate **§2** note **2026-04-20** |

---

## 7. Références croisées (hors nouvelle ADR)

- **ADR 25-2** / **25-3** : limites offline / async — citations possibles pour cadrage ; **pas** de réouverture ADR dans ce spike.
- **Spike 25-11** : `_bmad-output/implementation-artifacts/2026-04-20-spike-25-11-contrats-enveloppe-contexte.md` — ne pas dupliquer la traçabilité contrat ; ce rapport porte sur **persistance client** et **honnêteté go/no-go**.

---

## 8. Fichier stable versionné (story)

**Rapport spike (ce fichier) :** `_bmad-output/implementation-artifacts/2026-04-20-spike-25-15-indexeddb-cache-local-faisabilite.md`

**Gate pytest (existence + ancres) :** `recyclique/api/tests/test_story_25_15_spike_faisabilite_indexeddb_cache_local_sans_pwa.py`

---

*Fin du rapport spike 25.15 — livrable documentaire uniquement.*
