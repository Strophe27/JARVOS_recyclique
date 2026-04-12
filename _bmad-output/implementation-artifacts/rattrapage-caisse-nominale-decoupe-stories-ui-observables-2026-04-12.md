# Découpe « rattrapage caisse nominale » — stories courtes par tronçons UI observables

**Date :** 2026-04-12  
**Contexte :** suite au plan `rattrapage-caisse_4f638184` (Phases 1–4) et au constat story **11.3** (socle technique vs parité ressentie terrain).  
**Ce document livre uniquement** le **redécoupage en stories courtes** ; **aucune** modification de code n’est requise ici.

---

## Règles de découpe (alignement plan Phase 3)

1. **Une story = un tronçon UI observable** sur le legacy `http://localhost:4445` puis vérifiable sur Peintre `http://localhost:4444` (même intention utilisateur), pas une couche technique isolée (API seule, refactor store seul, etc.).
2. **Preuve legacy obligatoire** par story : au minimum routes + titres / landmarks / boutons critiques observables (snapshot accessibilité MCP `take_snapshot`, captures, ou checklist manuelle équivalente) et, quand c’est pertinent, **corrélation réseau** (`list_network_requests` / onglet Network) **sans inventer** d’URLs non vues.
3. **Décision d’alignement écrite** si route legacy et ancrage CREOS / alias runtime diffèrent (renvoi `peintre-nano/docs/03-contrats-creos-et-donnees.md`, matrice `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`).
4. **Pas de nouvelle autorité métier front** : rappel hiérarchie OpenAPI → `ContextEnvelope` → manifests → widgets (Epic 6 inchangé comme source métier).
5. **Rattachement épique** : regrouper ces stories sous un **mini-bloc « rattrapage caisse nominale UI »** rattaché à **Epic 11** (parité UI legacy) **ou** à un epic de rattrapage explicite si le pilotage BMAD préfère une étiquette dédiée — **sans diluer** le périmètre déjà cadré d’**Epic 13** (adjacents / variantes / clôture) sauf décision produit contraire documentée.

---

## Inventaire des stories courtes proposées

Les clés ci-dessous sont des **identifiants de travail** ; les numéros BMAD définitifs (`11.x`, hors-série, etc.) sont à poser lors du `sprint-planning` / `create-story`.

### RCN-01 — Hub caisse : entrée et intention « aller en vente »

| Champ | Contenu |
|--------|--------|
| **Tronçon UI observable** | Écran hub **`/caisse`** : titre zone poste, cartes postes (nom, lieu, FERMÉE/Ouverte), boutons **Ouvrir** / **Reprendre**, cartes virtuel / différé si visibles, menu / header transverse. |
| **Intention utilisateur** | « Je vois où j’en suis et comment entrer dans une session de vente depuis le hub. » |
| **Preuve legacy** | Checklist DevTools sur `http://localhost:4445/caisse` (états avec et sans session côté serveur si disponible). |
| **Comparaison Peintre** | Même checklist sur `http://localhost:4444/caisse` (nav shell, textes d’aide, badges). |
| **Hors scope** | Logique POST ouverture session (déjà couverte fonctionnellement ailleurs) sauf si **l’observable** (libellés, désactivation, messages) diverge du legacy. |
| **Critères d’acceptation (ébauche)** | AC1 : liste des éléments UI checklistés legacy ; AC2 : tableau équivalent / écart / gap pour Peintre ; AC3 : écarts documentés dans la matrice ou note liée. |

---

### RCN-02 — Transition hub → écran vente plein cadre (routing + shell)

| Champ | Contenu |
|--------|--------|
| **Tronçon UI observable** | Passage de l’hub vers **`/cash-register/sale`** (ou équivalent après redirection legacy) : **disparition** de la nav principale legacy, cadre plein viewport, chargement intermédiaire éventuel. |
| **Intention utilisateur** | « Je bascule dans le mode caisse vente sans me retrouver sur un écran incohérent (double hub + vente, nav fantôme, etc.). » |
| **Preuve legacy** | Séquence observée 4445 : `/caisse` → … → URL finale vente + snapshot shell. |
| **Comparaison Peintre** | Même séquence 4444 + marqueur `data-testid="cash-register-sale-kiosk"` si pertinent. |
| **Hors scope** | Variantes `virtual` / `deferred` (story **RCN-V** optionnelle séparée si besoin). |
| **Critères d’acceptation (ébauche)** | AC1 : URLs et transitions notées ; AC2 : description shell legacy vs Peintre ; AC3 : si écart structurel (composition CREOS), décision écrite « accepter / corriger / reporter ». |

---

### RCN-03 — Surface vente : zone wizard / saisie (parcours nominal visible)

| Champ | Contenu |
|--------|--------|
| **Tronçon UI observable** | Sur l’écran vente : zones **wizard** (étapes, catégories, champs quantité / poids / prix, numpad si présent legacy), états **chargement** et **vide** explicites. |
| **Intention utilisateur** | « Je peux enchaîner la saisie d’une ligne comme sur le terrain. » |
| **Preuve legacy** | Snapshot + liste des contrôles interactifs majeurs sur 4445 `/cash-register/sale` avec session ouverte. |
| **Comparaison Peintre** | Même inventaire sur 4444 (onglets FlowRenderer, champs, etc.). |
| **Hors scope** | Règles de prix métier, catalogue catégories (tant que l’observable reste aligné API existante). |
| **Critères d’acceptation (ébauche)** | AC1 : inventaire legacy ; AC2 : inventaire Peintre ; AC3 : gaps UI listés pour stories suivantes ou correctifs bornés. |

---

### RCN-04 — Ticket et totaux (panneau latéral ou zone ticket)

| Champ | Contenu |
|--------|--------|
| **Tronçon UI observable** | Bloc **ticket** : liste articles, sous-totaux, total, message « aucun article », états **erreur** / **données périmées** visibles. |
| **Intention utilisateur** | « Je vois ce que je vais encaisser comme sur la caisse habituelle. » |
| **Preuve legacy** | 4445 : zone ticket + comportement après ajout ligne (si recette possible). |
| **Comparaison Peintre** | 4444 : widget ticket + alignement `getSale` / états documentés Epic 6. |
| **Hors scope** | Nouveau modèle de ticket côté front. |
| **Critères d’acceptation (ébauche)** | AC1–AC2 : comparaison état par état (vide, rempli, erreur) ; AC3 : corrélation réseau sur au moins un cas « ticket rafraîchi » si observé. |

---

### RCN-05 — Finalisation, paiement, confirmations et retours visuels

| Champ | Contenu |
|--------|--------|
| **Tronçon UI observable** | Boutons **finaliser** vente, choix paiement, écrans / modales de confirmation, messages succès ou erreur, retour visuel sur le ticket vidé ou conservé. |
| **Intention utilisateur** | « Je clôture une vente avec le même niveau de feedback qu’au legacy. » |
| **Preuve legacy** | Scénario minimal observé (sans inventer de moyen de paiement non disponible en recette). |
| **Comparaison Peintre** | Même scénario ou équivalent borné si API recette limitée. |
| **Hors scope** | Conformité fiscale / TPE réel ; focus **observable** UI. |
| **Critères d’acceptation (ébauche)** | AC1 : checklist des retours visuels legacy ; AC2 : tableau Peintre ; AC3 : gaps documentés. |

---

### RCN-06 — Garde-fous : sans session, sans permission, erreurs réseau (messages visibles)

| Champ | Contenu |
|--------|--------|
| **Tronçon UI observable** | Comportement **visible** quand session absente, permission manquante, ou erreur API : redirections, bannières, désactivation de boutons — **tels qu’affichés** à l’écran. |
| **Intention utilisateur** | « Je ne suis pas bloqué sans explication quand quelque chose ne va pas. » |
| **Preuve legacy** | 4445 : au moins un cas « sans session » sur chemin vente (redirection ou message). |
| **Comparaison Peintre** | 4444 : mêmes intentions. |
| **Hors scope** | Nouvelle matrice de codes erreur métier. |
| **Critères d’acceptation (ébauche)** | AC1 : scénarios listés ; AC2 : résultat observable legacy vs Peintre ; AC3 : écarts acceptés signés ou backlog. |

---

## Ordre d’exécution recommandé (pour `bmad-story-runner`)

`RCN-01` → `RCN-02` → `RCN-03` → `RCN-04` → `RCN-05` → `RCN-06`  
Chaque story doit se terminer par **gates** (lint / tests ciblés) et **relecture** selon votre chaîne BMAD ; le **critère de fin** du plan reste : parcours **crédible** vs legacy, écarts **bornés et documentés**.

---

## Prochaine étape BMAD (sans implémentation ici)

Pour chaque ligne **RCN-*** : exécuter **`create-story`** (skill BMAD) afin de produire un fichier story autonome (`_bmad-output/implementation-artifacts/…md`) reprenant les sections Story / Scope / AC / Preuves / Dev Notes, puis enchaîner l’implémentation **une story à la fois** via **Story Runner**.

---

## Excuse de traçabilité (dérive session précédente)

Une modification **non demandée** avait été commencée sur `peintre-nano/src/app/demo/RuntimeDemoApp.tsx` (imports superflus). Elle a été **annulée** ; le dépôt sur ce fichier doit être revenu à l’état **sans** ces imports ajoutés par erreur.
