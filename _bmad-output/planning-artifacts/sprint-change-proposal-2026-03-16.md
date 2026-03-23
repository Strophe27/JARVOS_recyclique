# Sprint Change Proposal — Post-audit terrain 2026-03-16

**Date :** 2026-03-16  
**Workflow :** Correct Course (BMM)  
**Source :** `references/artefacts/2026-03-16_audit-fonctionnel-terrain.md`  
**Mode :** Incrémental (validation manuelle après chaque story)

---

## 1. Résumé du problème

### Déclencheur

Un **audit fonctionnel terrain** a été réalisé le 2026-03-16 sur la stack locale (frontend servi par l'API sur le port 9010, Paheko 8080). Contexte : 18 epics livrés (1→18) avec plusieurs correctifs de cap (11, 13, 15, 17, 18). L'audit révèle des **écarts bloquants et critiques** qui empêchent l'utilisation du cœur métier (caisse, réception) en conditions réelles.

### Problème central

- **P0** : L'import des catégories CSV (format 1.4.4) ne fonctionne que pour les 20 catégories racines ; les 57 sous-catégories échouent (parent_id invalide). Conséquence : caisse affiche « aucune catégorie », liste vide en réception, flux vente/réception bloqués.
- **P1** : Réception — bugs (ticket créé sans ouverture de la page de saisie, user affiché en code hex, page blanche après import catégories, catégories vides dans la saisie des lignes). Admin catégories — pas de bouton « Créer une catégorie », action « Modifier » absente (seulement « Supprimer »). Caisse — interface non conforme 1.4.4 (pas de presets Don/Recyclage/Déchèterie, pas de raccourcis AZERTY, disposition différente) — **à évaluer après correction des catégories**.
- **P2** : Paheko inaccessible (port 8080), dashboard admin (notifications redirigent vers /users, compteur utilisateurs connectés = 0, tickets réception ouverts non signalés), sessions caisse (listes Site/Poste/Opérateur grisées, pas d'export Excel global).
- **P3 (backlog)** : Admin paramètres tout en stub, permissions/ACL sans vraie gestion, audit log illisible pour un opérateur, logs email absents, quick analysis sans statistiques, vie associative absente, mot de passe oublié absent, logo poubelle au lieu des trois flèches de recyclage.

### Point de vigilance : discordance Epic 18 vs terrain

Les stories 18.5 (layout/KPI caisse), 18.6 (grille catégories/presets), 18.7 (raccourcis AZERTY) ont été marquées **done/approved** lors de la rétro du 2026-03-02. L'audit terrain du 2026-03-16 constate pourtant que ces fonctionnalités restent absentes ou non conformes. Les stories 19.5–19.7 ne sont donc **pas des régressions** mais des **corrections sur des livraisons qui n'ont pas passé la validation terrain**.

### Corrections déjà faites (hors scope)

- Rôle SuperAdmin persiste après F5 (corrigé avant l'audit).
- Lien Réception visible dans le menu (conséquence du fix auth).

### Consignes utilisateur pour le nouvel Epic

- **Pas d'enchaînement automatique** des stories : après chaque story livrée, Strophe valide manuellement avant de lancer la suivante.
- Prioriser **P0 → P1 → P2**. Les P3 restent en backlog.
- Chaque story doit avoir un **critère de validation terrain** (ex. : « Strophe importe le CSV et voit les catégories en caisse »).
- **Ne pas créer** de stories pour ce qui est déjà corrigé (auth, menu réception).

---

## 2. Analyse d'impact

### Impact sur les Epics

| Epic | Impact | Détail |
|------|--------|--------|
| **Epic 2** (Référentiels métier) | Modéré | Story 2.3 (Catégories) — l'import CSV et la gestion parent_id sont concernés. L'absence de bouton « Créer » et d'action « Modifier » dans la vue admin catégories est aussi à corriger. |
| **Epic 18** (Opérationnalisation terrain) | Majeur (partiel) | Livré (rétro 2026-03-02) mais l'audit terrain montre que les stories 18.5–18.7 n'ont pas atteint la conformité 1.4.4 en conditions réelles. Pas de rollback ; un epic correctif cible ces écarts. |
| **Epic 6** (Réception) | Modéré | Bugs réception (redirection après création ticket, affichage user, page blanche, catégories vides) — à traiter dans le nouvel epic. |
| **Epic 5** (Caisse) | Modéré | Conformité 1.4.4 (presets, AZERTY, disposition) — non atteinte malgré 18.5–18.7 ; à compléter après validation catégories (19.1). |
| **Epic 8** (Administration) | Faible à modéré | Dashboard admin (notifications, compteur, tickets réception), sessions caisse (filtres, export Excel) — P2. |

### Impact sur les artefacts

- **PRD** : Aucune modification des objectifs MVP ; le changement vise à **atteindre** la parité 1.4.4 et l'utilisabilité terrain déjà prévues.
- **Architecture** : Aucun changement de décision ; corrections dans le cadre des choix existants.
- **UX / 1.4.4** : Renforcement de l'alignement sur les écrans et comportements 1.4.4 (référence `ux-design-specification.md` et checklist import).
- **epics.md** : Ajout d'un **Epic 19** « Correction de cap post-audit terrain 2026-03-16 » avec stories P0 → P1 → P2 et règles d'exécution (HITL après chaque story, critères de validation terrain).

### Impact technique

- **Backend** : Logique d'import catégories (mapping parent_id, ordre d'insertion ou contraintes FK) ; CRUD catégories (endpoints créer/modifier manquants ou inaccessibles).
- **Frontend** : Admin catégories (bouton Créer, action Modifier) ; réception (redirection après création ticket, affichage nom utilisateur, résistance à la page blanche) ; caisse (presets, raccourcis AZERTY, disposition) ; admin dashboard (notifications, compteur connectés, tickets réception ouverts).
- **Docker / Paheko** : P2 — exposition du port 8080 sous Docker Windows (config `docker-compose.yml` ou documentation).

---

## 3. Approche recommandée

### Option retenue : Ajustement direct (nouvel Epic 19)

- **Ajouter un Epic 19** dédié aux corrections identifiées par l'audit, sans défaire les livraisons des epics 1–18.
- **Pas de rollback** : les livraisons 18 restent la base ; les correctifs s'appliquent en couche.
- **MVP inchangé** : objectif v1 (parité 1.4.4 + sync Paheko) confirmé ; ce changement permet d'y tendre en conditions terrain réelles.

### Justification

- Effort ciblé (P0 puis P1 puis P2), risque maîtrisé.
- Règle d'exécution claire : une story à la fois, validation manuelle par Strophe avant la suivante.
- Pas de remise en cause de l'architecture ni du PRD ; les écarts sont des **lacunes de conformité**, pas des pivots stratégiques.
- La discordance Epic 18 / terrain met en évidence le besoin d'un critère de validation terrain systématique — intégré dans chaque story de l'Epic 19.

### Effort / risque / délai

- **Effort** : Moyen (un epic avec ~9–12 stories selon granularité P0/P1/P2).
- **Risque** : Faible si l'ordre P0 → P1 → P2 est respecté et que chaque story a un critère de validation terrain.
- **Délai** : Dépend du rythme de validation manuelle ; l'Epic 19 peut démarrer immédiatement après approbation.

---

## 4. Propositions de changement détaillées

### 4.1 Section Epic 19 à insérer dans `epics.md`

**Emplacement :** Après la section **Epic 18**.

```markdown
## Epic 19: Correction de cap post-audit terrain 2026-03-16

Corriger les écarts bloquants et critiques identifiés lors de l'audit fonctionnel terrain du 2026-03-16, sans remettre en cause les epics 1–18. Objectif : rendre le cœur métier (caisse, réception) utilisable en conditions réelles.

**Source :** `references/artefacts/2026-03-16_audit-fonctionnel-terrain.md`  
**Sprint Change Proposal :** `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-16.md`

**Note sur la discordance Epic 18 / terrain :** Les stories 18.5–18.7 ont été marquées done/approved mais la validation terrain révèle des lacunes. Les stories 19.5–19.7 sont des corrections ciblées, pas des régressions sur du nouveau code.

**Règles d'exécution :**
- Pas d'enchaînement automatique des stories : Strophe valide manuellement après chaque story livrée avant de lancer la suivante.
- Priorité stricte : P0 → P1 → P2. Les items P3 restent en backlog.
- Chaque story inclut au moins un critère de validation terrain.
- Ne pas créer de stories pour les corrections déjà faites (auth SuperAdmin après F5, lien Réception dans le menu).

**Références :** PRD (parité 1.4.4), `ux-design-specification.md`, `references/ancien-repo/checklist-import-1.4.4.md`, artefact 2026-02-26_10 (traçabilité écran → API).
```

---

### 4.2 Stories proposées pour l'Epic 19

Chaque story inclut un critère de validation terrain. Les stories caisse (19.5–19.7) dépendent explicitement de la validation de 19.1.

---

#### Story 19.1 (P0) — Import catégories : correction parent_id / sous-catégories

**Objectif :** Corriger l'import CSV des catégories 1.4.4 pour que les 77 lignes (20 racines + 57 sous-catégories) soient importées sans erreur. Actuellement, les sous-catégories échouent avec « parent_id invalide ».

**Acceptance Criteria :**
- Given un CSV 1.4.4 contenant des catégories racines et des sous-catégories référençant un parent_id,
- When l'admin lance l'import depuis Admin > Catégories > Importer CSV,
- Then toutes les lignes valides (racines + sous-catégories) sont importées sans erreur « parent_id invalide »,
- And l'ordre d'insertion ou la gestion des contraintes FK garantit que les parents existent avant les enfants,
- And les catégories apparaissent dans la caisse et dans la liste déroulante de saisie des lignes de réception.

**Critère de validation terrain :**
« Strophe importe le CSV 1.4.4 complet (77 lignes) ; aucune erreur ; les catégories et sous-catégories apparaissent en caisse et dans la réception. »

**Dépendances :** Aucune.  
**Livrable :** Import fonctionnel ; trace Copy/Consolidate/Security si code 1.4.4 adapté.

---

#### Story 19.2 (P1) — Admin catégories : bouton Créer et action Modifier

**Objectif :** Ajouter le bouton « Créer une catégorie » et l'action « Modifier » dans l'admin catégories. Actuellement seule l'action « Supprimer » est disponible.

**Acceptance Criteria :**
- Given l'admin est sur la page Admin > Catégories,
- Then un bouton « Créer une catégorie » est visible et ouvre un formulaire de création (nom, parent optionnel),
- And chaque catégorie listée propose une action « Modifier » permettant d'éditer son nom et son parent,
- And l'arborescence est correctement mise à jour après création ou modification.

**Critère de validation terrain :**
« Strophe crée une catégorie, la modifie, puis la retrouve dans la caisse. »

**Dépendances :** 19.1 (pour que la liste soit peuplée et testable).

---

#### Story 19.3 (P1) — Réception : redirection vers page de saisie après création de ticket

**Objectif :** Après création d'un ticket de dépôt, ouvrir directement la page de saisie du ticket au lieu de rester sur la liste.

**Acceptance Criteria :**
- Given un opérateur sur la page Réception qui clique « Créer un ticket »,
- When le ticket est créé avec succès,
- Then l'utilisateur est redirigé vers la page de saisie du ticket (ex. `/reception/ticket/{id}`), lui permettant de saisir les lignes immédiatement.

**Critère de validation terrain :**
« Strophe crée un ticket de dépôt et arrive directement sur la page de saisie des lignes sans étape manuelle supplémentaire. »

**Dépendances :** 19.1 (catégories disponibles pour saisir des lignes).

---

#### Story 19.4 (P1) — Réception : affichage du nom utilisateur au lieu du code hex

**Objectif :** Afficher le nom lisible de l'utilisateur (prénom/nom ou identifiant) sur les tickets de réception, au lieu d'un code hexadécimal (ex. 58841A7F).

**Acceptance Criteria :**
- Given un ticket de réception affiché dans la liste ou dans le détail,
- When la colonne ou le champ « utilisateur » est rendu,
- Then le nom lisible de l'utilisateur (prénom + nom ou login) est affiché, pas un code hex ou un UUID brut.

**Critère de validation terrain :**
« Strophe voit le nom de l'utilisateur (ou un libellé lisible) sur le ticket de réception, pas un code hex. »

**Dépendances :** Aucune (bug indépendant des catégories).

---

#### Story 19.5 (P1) — Réception : page non blanche après import catégories

**Objectif :** Après un import de catégories depuis Admin, la page `/reception` doit rester fonctionnelle et les catégories disponibles dans la saisie des lignes.

**Note :** La page blanche peut être causée par le crash d'import 19.1 (parent_id invalide provoquant un état incohérent). Vérifier d'abord si la correction de 19.1 résout ce problème avant d'implémenter un correctif dédié.

**Acceptance Criteria :**
- Given l'admin a effectué un import de catégories réussi,
- When l'utilisateur navigue vers la page Réception,
- Then la page s'affiche correctement (pas de page blanche, pas de crash JS),
- And les catégories sont disponibles dans la liste déroulante de saisie des lignes de ticket.

**Critère de validation terrain :**
« Strophe importe les catégories, ouvre la Réception : page OK, catégories disponibles dans la saisie. »

**Dépendances :** 19.1 (import catégories fonctionnel). Peut être auto-résolu par 19.1 — vérifier avant d'implémenter.

---

#### Story 19.6 (P1) — Caisse : audit de conformité 1.4.4 post-catégories

**Objectif :** Maintenant que les catégories sont fonctionnelles (19.1 validé), évaluer précisément l'écart caisse vs 1.4.4 (presets, raccourcis AZERTY, disposition) avant d'implémenter des corrections.

**Note :** Cette story est un **audit terrain ciblé**, pas une implémentation. Son livrable conditionne le périmètre de 19.7–19.9.

**Acceptance Criteria :**
- Given la caisse ouverte avec des catégories disponibles (19.1 validé),
- When Strophe parcourt la caisse (sélection catégorie, ajout article, raccourcis clavier, layout),
- Then un artefact d'audit liste pour chaque point : statut (OK / KO / Partiel), comportement attendu (1.4.4), comportement observé, écart résiduel à corriger.

**Critère de validation terrain :**
« Strophe a complété le parcours caisse avec catégories et rempli l'artefact d'audit. »

**Livrable :** `_bmad-output/implementation-artifacts/19-6-audit-caisse-post-categories.md`  
**Dépendances :** 19.1 (catégories disponibles) validé par Strophe.

---

#### Story 19.7 (P1) — Caisse : presets (Don, Recyclage, Déchèterie) conformes 1.4.4

**Objectif :** Afficher et rendre fonctionnels les boutons presets 1.4.4 (Don, Recyclage, Déchèterie, etc.) dans la caisse.

**Acceptance Criteria :**
- Given la caisse ouverte avec catégories disponibles,
- Then les boutons presets 1.4.4 (Don, Recyclage, Déchèterie, etc.) sont visibles,
- And le clic sur un preset configure et ajoute la ligne de vente conformément au comportement 1.4.4.

**Critère de validation terrain :**
« Strophe ouvre la caisse, clique sur Don/Recyclage/Déchèterie et une ligne est ajoutée correctement. »

**Dépendances :** 19.6 (audit caisse effectué) ; basé sur les écarts identifiés dans l'artefact 19-6.

---

#### Story 19.8 (P1) — Caisse : raccourcis clavier AZERTY conformes 1.4.4

**Objectif :** Implémenter ou corriger les raccourcis clavier AZERTY de la caisse (navigation, actions courantes) conformément à la 1.4.4.

**Acceptance Criteria :**
- Les raccourcis clavier AZERTY identifiés dans l'artefact `18-4-audit-caisse-inventaire.md` (et confirmés dans 19.6) sont opérationnels.
- Au minimum : navigation clavier entre champs, raccourcis métier (quantité, poids, confirmation) tels que définis en 1.4.4.

**Critère de validation terrain :**
« Strophe utilise la caisse entièrement au clavier (navigation + au moins un raccourci métier AZERTY) sans souris. »

**Dépendances :** 19.6 (audit caisse post-catégories).

---

#### Story 19.9 (P1) — Caisse : disposition et conformité visuelle 1.4.4

**Objectif :** Aligner la disposition de l'écran caisse (grille catégories, zones de saisie, placement des contrôles) sur la 1.4.4, selon les écarts identifiés en 19.6.

**Acceptance Criteria :**
- Le layout de la caisse correspond à la référence 1.4.4 (zones, boutons, grille) tels que décrits dans l'artefact 19-6 et dans `_bmad-output/planning-artifacts/ux-design-specification.md`.

**Critère de validation terrain :**
« Strophe compare l'écran caisse à la 1.4.4 ; la disposition est conforme aux écarts identifiés en 19.6. »

**Dépendances :** 19.6 (audit caisse post-catégories).

---

#### Story 19.10 (P2) — Paheko : exposition du port 8080 sous Docker Windows

**Objectif :** Configurer ou documenter l'exposition du port 8080 pour Paheko sous Docker Desktop Windows afin de débloquer les tests d'intégration RecyClique → Paheko.

**Acceptance Criteria :**
- En environnement Docker Desktop Windows, Paheko est accessible sur `http://localhost:8080` depuis la machine hôte,
- Ou une procédure alternative documentée dans `docker-compose.yml` ou le README permet d'y accéder.

**Critère de validation terrain :**
« Strophe ouvre `http://localhost:8080` et accède à l'interface Paheko. »

**Dépendances :** Aucune.

---

#### Story 19.11 (P2) — Dashboard admin : notifications et tickets réception ouverts

**Objectif :** Corriger le comportement des notifications (ne plus rediriger vers /users) et signaler les tickets de réception ouverts sur le dashboard admin.

**Acceptance Criteria :**
- Given l'admin est sur le dashboard,
- When il clique sur « Notifications »,
- Then un panel ou liste de notifications s'affiche (ou un comportement cohérent 1.4.4), sans redirection systématique vers /users,
- And les tickets de réception ouverts sont visibles dans les notifications ou dans un bloc dédié du dashboard.

**Critère de validation terrain :**
« Strophe voit les tickets réception ouverts signalés depuis le dashboard admin ; le clic Notifications affiche les notifs. »

**Dépendances :** Aucune.

---

#### Story 19.12 (P2) — Dashboard admin : compteur « Utilisateurs connectés »

**Objectif :** Afficher un compteur d'utilisateurs connectés cohérent, ou le remplacer par un libellé clair si non implémentable en v1 (éviter le faux « 0 »).

**Acceptance Criteria :**
- Le compteur « Utilisateurs connectés » affiche une valeur réelle, ou est remplacé par un texte explicite (ex. « Fonctionnalité à venir »),
- Plus de « 0 » affiché alors qu'au moins un utilisateur est connecté.

**Critère de validation terrain :**
« Strophe voit un compteur cohérent ou un libellé non trompeur pour les utilisateurs connectés. »

**Dépendances :** Aucune.

---

#### Story 19.13 (P2) — Sessions caisse : filtres Site / Poste / Opérateur et export global

**Objectif :** Débloquer les listes déroulantes Site / Poste / Opérateur dans le gestionnaire de sessions caisse et, si dans scope, proposer un export global conforme à la 1.4.4.

**Acceptance Criteria :**
- Les listes Site, Poste, Opérateur sont utilisables (non grisées) dans le gestionnaire de sessions caisse,
- Un export global (CSV a minima, Excel multi-onglets si scope 1.4.4 confirmé) est disponible ou documenté comme évolution backlog.

**Critère de validation terrain :**
« Strophe peut filtrer les sessions par Site / Poste / Opérateur et télécharger un export des données. »

**Dépendances :** Aucune.

---

### 4.3 Items P3 — Backlog (hors Epic 19)

Les éléments suivants sont documentés pour ne pas être perdus, mais **aucune story n'est créée** pour l'Epic 19 :

| Item | Détail audit |
|------|-------------|
| Admin paramètres | Tout en stub (session, email, alertes). |
| Permissions / ACL | Pas de vraie gestion (modifier = nom + description). |
| Audit log | Format technique IAM illisible pour un opérateur. |
| Logs email | Pas d'écran dédié, config email incomplète. |
| Quick analysis | Aucune statistique disponible. |
| Mot de passe oublié | Absent de la page login. |
| Logo | Poubelle au lieu des trois flèches de recyclage (parité visuelle 1.4.4). |
| Caisse — ID poste | Affichage d'un ID très complexe (UUID) sous le nom du poste — à simplifier (nom lisible). |
| BDD — import dump 1.4.4 | L'import d'un dump PostgreSQL 1.4.4 dans la nouvelle base échoue (schéma divergent). Nécessite un **adaptateur/traducteur de tables** pour la migration de données prod. Critique avant déploiement v1.0.0 mais hors scope terrain immédiat. |
| Vie associative | Placeholder prévu par le Brief (« v0.1 = placeholders, à dérouler dans les versions suivantes »). Pas un bug — confirmer le scope dans les prochains epics. |

---

### 4.4 Synthèse des modifications d'artefacts

| Artefact | Modification |
|----------|--------------|
| `_bmad-output/planning-artifacts/epics.md` | Ajout de la section **Epic 19** et des stories 19.1 à 19.13. |
| `references/artefacts/2026-03-16_audit-fonctionnel-terrain.md` | Aucune modification ; source de vérité de l'audit. |
| PRD / Architecture / UX | Aucune modification de fond. |

---

## 5. Handoff pour l'implémentation

### Périmètre du changement

**Modéré** : ajout d'un epic correctif (Epic 19, ~13 stories) et mise à jour de `epics.md`. Implémentation story par story avec validation terrain systématique.

### Responsables

- **Strophe (PO)** : Valider la priorisation, les critères terrain, et approuver chaque story avant de lancer la suivante.
- **Équipe dev (agent)** : Implémenter dans l'ordre strict, respecter les dépendances inter-stories, produire un critère de validation terrain vérifiable.
- **Référent qualité** : S'assurer que chaque story contient un critère de validation terrain et une trace Copy/Consolidate/Security si code 1.4.4 adapté.

### Ordre de livraison recommandé

```
19.1 (P0) → validation Strophe
  → 19.2, 19.3, 19.4 (P1 indépendants, dans l'ordre)
  → 19.5 (P1, dépend 19.1)
  → 19.6 (audit caisse, dépend 19.1)
  → 19.7, 19.8, 19.9 (P1 caisse, dépendent 19.6)
  → 19.10, 19.11, 19.12, 19.13 (P2, indépendants, dans l'ordre)
```

### Critères de succès de l'Epic 19

- Import catégories complet (racines + sous-catégories) — P0 fermé.
- Admin catégories : Créer + Modifier opérationnels.
- Réception fonctionnelle (redirection, affichage nom, page stable, catégories disponibles).
- Caisse conforme 1.4.4 (presets, AZERTY, disposition) — validé terrain après audit 19.6.
- P2 traités ou documentés avec raison du report.
- P3 listés en backlog, aucune story perdue.

---

## 6. Validation et suite

- **Document généré par :** Workflow Correct Course (BMM), 2026-03-16.
- **Fichier :** `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-16.md`

**Prochaine étape :**  
Approbation par Strophe → mise à jour de `epics.md` (ajout Epic 19 + stories) → exécution story par story avec validation manuelle après chaque livraison, en commençant par **19.1 (P0)**.

---

*Fin du Sprint Change Proposal — v2 révisé le 2026-03-16.*
