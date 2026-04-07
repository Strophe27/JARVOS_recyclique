# Hypothèse post-V2 — marketplace de modules complémentaires

**Statut :** hypothèse produit / architecture — **hors périmètre v2** et **hors backlog** tant qu’elle n’est pas promue (PRD / epic dédié).  
**Date :** 2026-04-07  
**Rôle :** garder une **traçabilité unique** entre la ligne v2 actuelle (contrats, Peintre nano, Recyclique) et une **évolution envisagée** sans la confondre avec le livrable sprint.  
**Position de prudence :** évolution **probable après v2**, mais **non engagée** tant qu’un **cas business réel** n’existe pas et tant que l’**écosystème cible** (marketplace, exploitation, support, modèle cloud/self-host) n’a pas été étudié explicitement.

---

## 1. Problème à résoudre plus tard

Permettre, **après** une v2 stabilisée, la **distribution commerciale** (vente, location) de **modules complémentaires** : découverte, téléchargement, installation, activation / désactivation, mises à jour, cycle de vie et révocation éventuelle.

Cette évolution doit fonctionner dans **deux modes de déploiement** :

- **installation indépendante** chez la structure, sur son propre serveur ;
- **cloud managé** par l’équipe Recyclique, sous forme d’**espace dédié** par ressourcerie (stack propre, données propres, fichiers propres, administration propre).

Le point clé est de **ne pas mélanger** cette couche de plateforme d’extensions avec le **cœur métier** Recyclique (données, règles, permissions terrain, sync, audit métier, intégrations Paheko, etc.).

---

## 2. Séparation explicite : quatre domaines

| Domaine | Rôle | Notes |
|--------|------|--------|
| **Cœur Recyclique** | API métier, données, authz terrain, audit métier, intégrations Paheko, etc. | Reste l’**autorité** sur « ce qui est vrai » pour l’exploitation. |
| **Installation cliente Recyclique** | Instance concrète déployée pour une ressourcerie (self-host ou cloud managé) | Porte la configuration locale, les modules installés, l’état opérationnel et l’administration locale. |
| **Plateforme d’extensions (hypothèse)** | Catalogue, licences, billing, publication d’artefacts, politique de confiance | **Orthogonale** au métier dépôt / caisse ; pensée comme **plateforme séparée** avec un client dans les installations Recyclique. |
| **Moteur UI (Peintre nano)** | Composition, manifests CREOS, widgets enregistrés, rendu | Aujourd’hui **build-time** pour les domaines ; l’hypothèse post-v2 est d’ajouter un **mode de chargement contrôlé** des extensions, pas de remplacer les contrats. |

**Principe :** l’**authentification des utilisateurs** et l’**autorisation métier** restent portées par **Recyclique** (modèle actuel). Les mécanismes de **licence / abonnement module** (qui a payé quoi, jusqu’à quand, sur quelle instance) sont un **autre problème** — à brancher sur des endpoints ou un service dédié, pas en pollutant les tables métier sans design.

---

## 3. Nature d’un futur module complémentaire

L’hypothèse post-v2 n’est **pas** celle d’un simple widget front. Un **module complémentaire** complet pourra inclure :

- un **package UI** ;
- des **contrats** (`OpenAPI`, `CREOS`, schémas, capabilities) ;
- une **extension backend** ;
- éventuellement une logique d’installation / migration et des surfaces d’administration.

Conséquence : le sujet ne se limite ni au frontend ni au catalogue. Il touche à la fois :

- le **runtime UI** ;
- la **compatibilité contractuelle** ;
- le **modèle de déploiement** ;
- la **gouvernance backend** ;
- la **chaîne de publication** et de support.

---

## 4. Alignement avec ce que v2 prépare déjà

Sans implémenter le marketplace, la v2 peut rester **compatible** avec cette hypothèse si on maintient :

- **Contrats stables** : `OpenAPI` (`operationId`), `CREOS`, `data_contract` — voir [gouvernance contractuelle](../../../references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md).
- **Vérité backend** pour « capacité activée ou non » (pistes Epic 4.5 -> Epic 9) : même **famille de levier** qu’une future **entitlement** commerciale.
- **Packaging initial interne** de `Peintre_nano`, avec extractibilité future préparée par conception — voir [PRD](../prd.md) et [epics.md](../epics.md).
- **Refus explicite v2** du chargement dynamique de manifests **tiers hors build** comme prérequis — [PRD](../prd.md) ; **AR38** dans [epics.md](../epics.md) — repris ici comme **ouverture future sous gouvernance**, pas comme dette implicite du sprint courant.

**Conséquence importante :**

- il ne devrait **pas** être nécessaire de **refondre le cœur métier Recyclique** pour ouvrir ce chantier ;
- en revanche, il faudra probablement une **évolution significative** du **runtime frontend**, de la **distribution d’artefacts**, de la **gestion de compatibilité** et des **surfaces d’administration**.

Autrement dit : **pas un simple “petit add-on”**, mais **pas non plus une réécriture totale** si les frontières v2 restent propres.

---

## 5. Hiérarchie minimale des états à garder en tête

Pour éviter les dérives futures, l’état d’un module ne doit pas être réduit à un seul booléen.

| État | Question | Autorité principale |
|------|----------|---------------------|
| `listed` | Le module existe-t-il dans le catalogue ? | Plateforme d’extensions |
| `downloaded` | L’artefact a-t-il été récupéré sur cette instance ? | Installation cliente |
| `installed` | Le module est-il installé côté UI/backend sur cette instance ? | Installation cliente |
| `compatible` | Cette version est-elle compatible avec cette stack ? | Vérification locale + contrats/versioning |
| `licensed` | Cette instance a-t-elle le droit d’utiliser ce module ? | Plateforme d’extensions |
| `enabled_by_admin` | L’admin local a-t-il activé ce module ? | Recyclique / configuration locale |
| `visible_in_ui` | Le module doit-il être exposé dans l’interface ? | Runtime Recyclique + Peintre nano à partir des états précédents |

**Règle de lecture prudente :** un module peut être **licencié mais non installé**, **installé mais incompatible**, **compatible mais désactivé par admin**, ou **activé mais masqué** selon le contexte. La future implémentation devra donc expliciter la **hiérarchie de vérité** entre ces états au lieu d’écraser le tout dans un flag unique.

---

## 6. Invariants minimaux de confiance et de sécurité

Si des modules tiers ou distribués sont introduits plus tard, ces invariants devront être posés avant ouverture large :

- **signature / provenance vérifiable** des artefacts ;
- **compatibilité versionnée** entre module, shell UI et backend ;
- **surface d’API exposée** au module explicitement bornée et documentée ;
- **kill-switch** local pour désactivation rapide d’un module ;
- **traçabilité** : qui a installé, mis à jour, activé ou désactivé quoi, et quand ;
- **révocation** ou blocage possible en cas de faille, d’incompatibilité ou de fin de licence.

Ce document **n’arbitre pas** encore les choix techniques concrets (`micro-frontend`, packages signés, `iframe`, sidecar, migration backend, etc.), mais il pose que la **confiance** et la **compatibilité** sont des sujets de premier rang, pas des détails d’implémentation.

---

## 7. Hypothèse UX / produit à garder ouverte

Il est plausible qu’une future installation Recyclique expose une **page locale** de type :

- catalogue / marketplace ;
- téléchargement / installation ;
- activation / désactivation ;
- gestion des licences ;
- état de compatibilité ;
- historique local des modules.

Cette page resterait un **client** de la plateforme d’extensions, pas la plateforme elle-même.

---

## 8. Ce que ce document ne fait pas

- Ne crée **pas** d’epic ni de story dans `implementation-artifacts/`.
- Ne modifie **pas** le PRD ni les critères d’acceptation v2 sans passage par **correct course** ou **mise à jour PRD** explicite.
- Ne préempte **pas** les choix techniques de packaging / exécution / isolation.
- Ne décide **pas** encore si la première itération post-v2 cible un **catalogue privé simple** ou un **marketplace complet**.

---

## 9. Déclencheurs de promotion vers un vrai chantier

Cette hypothèse devra être promue en **PRD addendum**, **ADR dédiée** ou **epic** dès qu’au moins un des cas suivants devient réel :

1. besoin d’un **premier module payant** ou loué ;
2. besoin de charger un artefact **hors dépôt principal** ;
3. besoin de gérer la **compatibilité multi-versions** shell/module/backend ;
4. besoin de **révocation** ou de contrôle de licence à l’échelle d’une instance ;
5. besoin d’une **extension backend distribuée** indépendante du cœur livré par défaut.

Tant que ces déclencheurs ne sont pas présents, ce document reste une **hypothèse cadrée**, utile pour éviter les décisions v2 qui fermaient l’avenir, mais **insuffisante** pour lancer un chantier.

---

## 10. Où enregistrer les mises à jour futures

1. **Document maître (BMAD) :** ce fichier sous `planning-artifacts/architecture/`.
2. **Visibilité agents :** lien dans [references/index.md](../../../references/index.md) (section *Hors references* / `_bmad-output`) et pointeur court dans [project-structure-boundaries.md](./project-structure-boundaries.md).
3. Si l’hypothèse devient un chantier : promouvoir en **PRD addendum** ou **epic dédié**, puis retirer ou réduire ce fichier à un simple renvoi.

---

## 11. Références internes

- [project-structure-boundaries.md](./project-structure-boundaries.md) — extractibilité Peintre nano, chargement des modules (sens actuel).
- [guide-pilotage-v2.md](../guide-pilotage-v2.md) — jalons v2 ; rien n’y oblige le marketplace.
- [post-v2-hypothesis-peintre-autonome-applications-contributrices.md](./post-v2-hypothesis-peintre-autonome-applications-contributrices.md) — trajectoire distincte : `Peintre` autonome et applications contributrices.
- [PRD](../prd.md) — packaging initial interne / extractibilité future.
- [epics.md](../epics.md) — AR4 et AR38 ; Epic 4 Story 4.5 / Epic 9 pour activation locale et généralisation future.
