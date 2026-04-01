# Peintre — pipeline présentation, workflow et invariants (nano → macro)

**Date :** 2026-04-01  
**Mis à jour :** 2026-04-01 — intégration **forte** du concept vision Peintre_nano (`references/peintre/2026-04-01_fondations-concept-peintre-nano-extraits.md`) ; passes QA documentaire + sous-agents ; **passe finale** (QA adversariale, alignement `sprint-status.yaml`, miroir PRD §10.1) ; **correctifs QA** (pont `cashflow` / Phase 0, document fusionné Phase 0 vs Phase 1+).  
**Statut :** artefact de travail — à faire évoluer avec les sessions ; ne supplante pas le PRD ni l’architecture BMAD. **Grammaire détaillée** (CREOS Influx, slots, flows, phases SDUI) : fichier d’**extraits** ci-dessus + document vision complet.  
**Règle de divergence :** en cas d’écart entre ce fichier et le **PRD** ou l’**architecture BMAD** actifs, **PRD / architecture font foi** ; mettre à jour cet artefact.

**Objectif :** figer les **choix transverses** pour que la v2 (`Peintre_nano`) et la cible **macro** (layouts à la volée, panneaux admin, chatbot boutons dynamiques, multi-surfaces) partagent **le même pipeline**, sans deuxième moteur parallèle.

---

## 1. Définition courte : macro ≠ autre produit

**Peintre macro** (vision) : moteur d’**intention d’affichage** — produire ou adapter layouts, panneaux, pages admin, vues conversationnelles, avec **mise en page intelligente** (hiérarchie, densité, responsive), sous **clôture contractuelle** (pas de métier arbitraire dans le JSON, pas de contournement des permissions).

**Implémentation** : même chaîne que le nano, avec plus de types de widgets, plus de templates, documents générés par humain / admin / LLM, et éventuellement une couche d’optimisation sur le **DSL** (pas sur le CSS brut).

**Couverture UI v2** : **toute l’UI applicative produit** v2 passe par `Peintre_nano`, **du login au dernier écran** (brainstorm, PRD) — hors **capacités explicitement reportées** (§13). Ce qui est phasé, ce sont les **capacités** du moteur, pas l’enveloppe d’écrans.

**Rappels PRD** :

- **L’affichage ne vaut pas autorisation** : toute action sensible est revalidée côté `Recyclique` ; un chatbot ou un layout dynamique ne doit jamais être traité comme source de vérité pour les droits.
- **Chronologie** : la feuille de route brainstorming / PRD **reporte** explicitement (post–v2 vendable) : éditeur riche de flows, personnalisation avancée, **pilotage agentique riche**, analytics UI poussés. Ce document **prépare** le macro dans le pipeline ; il ne promet pas leur livraison dans la v2 minimale.

---

## 2. Hiérarchie de vérité (rappel — avant le pipeline graphique)

Alignement `navigation-structure-contract.md` / architecture :

1. **OpenAPI** — données, actions, permissions, états métier, schéma canonique de **`ContextEnvelope`**.
2. **`ContextEnvelope`** — contexte actif (site, caisse, session, poste, permissions calculées, etc.) : **injecté** pour la résolution d’affichage ; il ne remplace pas les manifests de structure.
3. **`NavigationManifest`** — arborescence, routes, visibilité déclarative (filtrage UI ; calcul autoritatif des droits = backend).
4. **`PageManifest`** — composition déclarative d’une page (template, zones, widgets, actions / flows simples).
5. **`UserRuntimePrefs`** — personnalisation locale non métier (densité, presets de layout par surface, raccourcis personnels, etc.).

**Contexte et premier rendu** : pour les écrans **sensibles** ou le parcours métier nominal, on applique **PRD §10.1** (ligne *Contexte ambigu ou incomplet*) : **mode restreint ou dégradé explicite**, pas de supposition silencieuse. Un **shell** ou **squelette** non métier peut s’afficher pendant le chargement du contexte, **à condition** qu’aucune action ni donnée **hors périmètre validé** ne soit exposée. La formulation « contexte avant écran » (tableau §9) signifie : **pas de vérité métier affichée comme certaine** sans contexte cohérent — pas forcément blocage total de tout paint (voir matrice PRD).

---

## 2 bis. Profil CREOS PRD §8 ↔ manifests structurels navigation

Le PRD §8 nomme notamment **`ModuleManifest`**, **`SlotDefinition`**, **`WidgetDeclaration`**, **`ModuleAction`**. Le contrat navigation en architecture nomme **`NavigationManifest`** et **`PageManifest`**.

**Lecture unique** : ce ne sont pas deux mondes contradictoires — les manifests **navigation / page** sont la **projection** du profil minimal dans le dépôt (`contracts/creos/manifests/`, etc.) ; les objets §8 décrivent la **grammaire** des modules et contributions (slots, widgets, actions). L’implémentation doit **mapper** explicitement (schémas, générateurs, doc développeur) pour éviter deux interprétations du « minimal CREOS ».

---

## 2 ter. Concept JARVOS Peintre_nano (vision 2026-03-31) — pont avec ce pipeline

Le document **`references/vision-projet/2026-03-31_peintre-nano-concept-architectural.md`** **complète** le présent fichier : il **approfondit** la forme des manifests (**Influx CREOS** à cinq dimensions, enveloppe `ModuleManifest`, exemple JSON complet), les **types de flows** (`wizard`, `tabbed`, `cashflow`, `decision`), **meta-props**, **zone roles**, **`PageTemplate`**, conventions de nommage, slots structurants RecyClique, trajectoire **nano / mini / macro**, poignées **Peintre_mini**, compatibilité **Piral**, roadmap **Phase 0–3** et décisions **P1–P13**.

**Lecture recommandée :** `references/peintre/2026-04-01_fondations-concept-peintre-nano-extraits.md` — tables et mapping **vision ↔ BMAD** (Navigation / Page / document validé) sans dupliquer le roman du concept.

**Alignement sans contradiction :** la vision fixe la **Phase 0** comme manifests **statiques** et remplissage des slots par **code / imports TypeScript**, **sans JSON dynamique** de composition pour l’ossature. Le **§3** ci-dessous (document validé, draft sandbox, fusion build/runtime) s’applique **pleinement** dès l’introduction de composition **admin / LLM / runtime** (Phase 1+ du concept) ; en Phase 0, les **mêmes** schémas et vocabulaire fermé peuvent valider le **build** sans activer de pipeline « chaud » de recomposition. **Flows caisse** : pont `cashflow` / `wizard`–`tabbed` — **extraits §7** et vision §3.1 (flows).

---

## 3. Pipeline unique (du bandeau live au chatbot)

### 3.0 Production et forme du « document de présentation » (étape 2)

- **Phase 0 (concept vision, ossature)** : pas de **pilotage à chaud** du graphe UI par JSON externe — manifests **fichiers**, contributions via **registre + imports** ; le cycle brouillon → validé ci-dessous concerne surtout les parcours **dynamiques** à partir de **Phase 1+** (mini-DSL admin, puis agent). Voir **§2 ter** et `2026-04-01_fondations-concept-peintre-nano-extraits.md` §6.
- **Source** : le **`PageManifest`** (et contributions modules résolues via registre) fournit la base ; un **document dynamique** (admin, LLM) est une **surcouche** ou un **remplacement** de fragment **uniquement** après validation.
- **Artefact** : **obligatoire** : un document (ou fusion déterministe) **validé** qui porte **à la fois** le **DSL de layout** et l’**arbre de widgets** (et références aux flows) — pas deux pipelines parallèles non reliés. Les exceptions doivent être **listées** dans une ADR.
- **Cycle brouillon → rendu** (LLM, admin) : états **draft / preview** **isolés** : pas d’exécution de **`commandId`** ni d’effet métier tant que le document n’est pas **validé** ; la preview est **sandbox** ou lecture seule selon le risque.
- **Enchaînement rendu** : **widgets** et **zones** sont positionnés par le `LayoutRenderer` / arbre ; les **flows** déclaratifs s’exécutent dans ce cadre via `FlowRenderer` (pas une iframe logique séparée sans contrat).
- **Échec de validation** (schéma ou vocabulaire) : **rejet** du document ou fragment ; **pas** de rendu partiel non contrôlé — avec **feedback** structuré (voir §6 et signalement CREOS).
- **Précédence build vs chaud** : manifests **embarqués dans le build** = source **primaire** ; toute variante runtime **validée** est **fusionnée** ou **appliquée** selon des règles **déterministes** à documenter (ADR) — pas d’ambiguïté « le dernier gagne » implicite.

**Menaces documents dynamiques** (complément validation schéma) : **allowlist** des `commandId` et des `widget.type` ; **bornes** sur les props (taille, profondeur d’arbre) ; pas de chaînes exécutées comme code ; URLs / liens selon politique projet ; alignement avec les exigences sécurité du PRD (auth, step-up, idempotence).

### 3.1 Étapes

1. **Commanditaire** (`recyclique`) : `NavigationManifest`, `PageManifest` — **cadre autorisé** (routes, pages, structure informationnelle). Le moteur **ne crée pas** de routes ni d’entrées de navigation métier **absentes** de ces contrats.
2. **Document de présentation** : arbre **widgets** + **DSL de layout** — sérialisable, **validé** contre schémas (CREOS / JSON Schema) et **vocabulaire fermé** de `widget.type`.
3. **`LayoutRenderer`** : traduit le DSL → **CSS Grid** (web) : `grid-template-areas`, colonnes, `gap`, breakpoints. L’IA ou un builder ne manipule **pas** le CSS directement.
4. **`WidgetTreeRenderer`** (côté **adaptateur React** concret) : `type` + `props` → composant React **enregistré** dans le **`ModuleRegistry`** / catalogue — seuls les types connus sont rendus.
5. **`FlowRenderer`** (nom PRD) : interprète les **flows déclaratifs** CREOS (étapes, transitions simples) en s’appuyant sur les **mêmes** commandes et événements que le reste du shell ; pas une deuxième voie « magique ».
6. **Orchestration de flux** : **commandes** (`commandId`), **événements UI nommés**, transitions déclaratives. En v2 : privilégier un **reducer / table de transitions** simple ; une **machine d’état** plus riche peut s’appuyer sur une **implémentation de référence de type XState** « derrière le capot » — **ADR requise** avant d’engager deux stacks parallèles (« reducer only v2 » vs lib lourde) ; ce n’est **pas** une décision d’architecture figée tant que les patterns ne sont pas formalisés en Step 5 architecture.

**Frontière Peintre_nano / adaptateur React** (PRD §3.5, §8.8) :

- **`Peintre_nano`** : composition, **politique** de rendu et de fallback, validation, résolution des contrats, **`ModuleRegistry`**, slots, **`FlowRenderer`**, orchestration commandes / événements.
- **Adaptateur React** : **rendu concret** des composants, **fallbacks visuels** dans le canal, styles, responsive — **sans** y remonter la logique métier ni la définition des contrats. Les deux couches partagent la matrice PRD §10 selon le **type d’erreur** (décision produit détaillée dans le PRD).

**Schéma condensé** :

```
OpenAPI + ContextEnvelope (contexte actif)
        +
NavigationManifest / PageManifest (cadre autorisé)
        +
UserRuntimePrefs (personnalisation locale : presets surface, densité, etc.)
        →
fusion / résolution → document layout + widget tree (validé)
        →
LayoutRenderer → CSS Grid
        →
WidgetTreeRenderer → composants enregistrés (adaptateur React)
        →
FlowRenderer (flows déclaratifs CREOS)
        →
commandes + événements (+ machine d’état légère ou librairie type XState si besoin)
```

---

## 4. Trois piliers (recherche + architecture)

### 4.1 Workflows, navigation, raccourcis

- **Catalogue de commandes** stable + **keybindings** façon VS Code (`command` + `when`) : humain, raccourci, **agent** ou chatbot invoquent la **même** commande.
- **Discipline commande** (recherche workflows) : les commandes restent **pures** côté contrat — **entrées / sorties / effets** documentés ; pas de logique opaque dans le JSON.
- **Taxonomie d’événements** UI : **vivre** dans les artefacts contractuels (`contracts/creos/`, convention de nommage, doc développeur) ; référencer le **PRD / epics** pour le livrable « catalogue + schéma » si besoin.
- **Navigation structurelle** : autorité commanditaire + contrats versionnés ; le routeur / merge runtime applique, **n’invente pas** la structure métier (décision architecture).
- **Capacité minimale v2** : mécanisme **déclaratif** pour **onglets / sous-écrans** (brainstorm B) — peut être léger (ids + commande `tabs.goTo`) mais **nommé** dans les livrables pour ne pas être absorbé implicitement par le seul routeur.

### 4.2 Grille, templates, mise en page « intelligente »

- **DSL layout** (JSON) : niveau **sémantique** (template de page, pattern de lecture F/Z, rôles de zones, priorité, densité) et niveau **géométrie dérivée** (colonnes, areas, spans) calculé par le moteur.
- **CSS Grid** comme substrat web obligatoire pour la structure 2D (décision architecture).
- **Autres canaux** (horizon) : le même **DSL conceptuel** peut cibler d’autres moteurs (**Yoga** / Flex, **DivKit**, etc.) ; le web reste **CSS Grid** en implémentation de référence.
- **Optimisation future** (A/B, bandits, RL) : opère sur les **paramètres du DSL**, pas sur le CSS — hors scope v2, mais le DSL doit **exposer** des paramètres exploitables (y compris à terme **typo, contraste, couleurs** si pertinent pour l’auto-optimisation — recherche Perplexity grille).

### 4.3 Modularité, widgets, installation

- Chaque widget exposé : **`type` stable** + **`props_schema`** — prérequis pour LLM, formulaires dynamiques, chatbot à boutons.
- **`ModuleRegistry`** + **shell + slots** (inspiration Piral / Open edX FPF) : contenu dynamique dans des **zones contractuelles**.
- **Évolutivité packaging** : garder une **interface claire** derrière le registre (chargement de manifests, résolution des contributions) pour une **migration éventuelle** vers un socle type Piral sans réécrire le vocabulaire CREOS.
- **Modularité d’abord, SDUI ensuite** : DivKit / arbre JSON générique consomment le **même** vocabulaire de types que les manifests statiques.

---

## 5. Gouvernance des contributions UI (brainstorm B1)

- **Toute contribution UI** passe par des **contrats déclarés et valides** ; pas de dérivation « code seul » qui court-circuite CREOS pour du nominal.
- Les contrats doivent rester **simples** mais **extensibles** : baliser dans le code les **points d’extension nommés**, mocks, TODO structurés, interfaces ou schémas prévus — pour que l’évolution macro soit visible, pas cachée.
- **Signalement d’erreur de contrat** : prévoir un **canal de feedback** (structure de message, codes, corrélation) **aligné sur l’extensibilité CREOS** — pas seulement des logs ad hoc — pour que runtime, support et futures corrections (y compris LLM) partagent le même **protocole** (brainstorm B1 / B2).

---

## 6. Robustesse du rendu et erreurs (PRD §4.3, §10 — brainstorm B2)

- **Widget ou contribution non rendable** : **fallback visible**, **journalisation**, pas d’échec silencieux.
- **Flow invalide ou incomplet** (alignement **PRD §10.1**) : **blocage du flow concerné** ; retour à un **mode simple** lorsque c’est possible ; **feedback** explicite ; possibilité de **recharger** une définition corrigée — **sans** élargir la dégradation à tout l’écran si le flow est isolable.
- **Module non critique en échec** : **isoler** l’erreur — ne pas casser tout l’écran (brainstorm B2).
- **Zones critiques** (caisse, réception, clôture) : en l’absence de critère plus fin dans cet artefact, **s’en tenir à la ligne du tableau PRD §10.1** applicable + **§10.2–10.3** (actions finales bloquées, cas de clôture) ; **la sécurité métier / comptable prime** sur le confort (ligne *Conflit sécurité vs fluidité*).
- **`PageManifest` — fallback au niveau page** : le contrat navigation peut déclarer un mode de secours pour une route (ex. `fallback` dans les exemples YAML) ; l’enchaîner avec les fallbacks widget / flow / module.
- **Réaction à l’instant** : le runtime doit pouvoir réagir **immédiatement** à une définition dynamique invalide ou partielle (brainstorm) — journalisation + feedback utilisateur + corrélation pour support (**observabilité** : lier surface, `commandId`, `correlation_id` quand disponible).

**Matrice PRD** : le détail exhaustif est en **PRD §10.1 à §10.3**. **Miroir de travail** (annexe §6.1) — en cas de divergence, **le PRD fait foi**.

### 6.1 Annexe — Miroir PRD §10.1 (principes généraux)

> Copie au **2026-04-01** depuis `_bmad-output/planning-artifacts/prd.md`. Toute modification future du PRD doit être **reflétée** ici ou cette annexe doit être **supprimée** au profit d’un simple renvoi.

| Situation | Comportement |
|-----------|--------------|
| Widget non rendable | Fallback visible + journalisation |
| Module non critique en échec | Isolation de l'erreur, reste de l'écran intact |
| Flow invalide ou incomplet | Blocage du flow concerné, retour à un mode simple si possible, feedback explicite |
| Contexte ambigu ou incomplet | Mode restreint/dégradé explicite, pas de supposition silencieuse |
| Action sensible | Contrôle supplémentaire (confirmation, PIN, revalidation rôle) |
| Sync Paheko indisponible | Enregistrement dans Recyclique, retry ultérieur, pas de blocage terrain par défaut |
| Écart de sync persistant | Signalement, passage en quarantaine, résolution tracée par un rôle habilité |
| Conflit sécurité vs fluidité | **La sécurité gagne** |

### 6.2 Renvois PRD §10.2 et §10.3

- **§10.2** : liste des **actions critiques finales** pouvant être bloquées (clôture comptable, validation financière irréversible, etc.).
- **§10.3** : **cas nominaux de clôture** et définition d’**écart critique** — le rendu Peintre et les flows UI doivent **refléter** ces états (signaux, blocages sélectifs) sans les redéfinir.

---

## 7. Multi-surfaces (écrans, fenêtres, vitrine)

**Modèle** : **layouts enregistrés** (presets) + liaison **surface runtime** → `layout_preset_id` (+ contexte d’affichage), en général portée par **`UserRuntimePrefs`** ou équivalent local (règles `navigation-structure-contract.md` pour toute persistance backend dédiée).

**Source de vérité** : si plusieurs magasins (local + backend) coexistent, une **ADR « surfaces + presets »** doit trancher la **source canonique** et la synchro pour éviter double vérité.

**Garde-fou** : un preset **ne crée pas** de `route_key` / `page_key` **nouveaux** par rapport au commanditaire ; il **réarrange** l’affichage **dans** le cadre autorisé. Sinon double vérité navigation / pages.

**Runtime** : API navigateur, fenêtres multiples, éventuellement Electron plus tard — **invariant zéro fuite de contexte** entre sites / caisses / opérateurs (PRD).

**Contexte incomplet** : en cas d’ambiguïté site / caisse / session, appliquer les règles PRD (rechargement, mode restreint, **sécurité gagne**) — pas de supposition silencieuse (brainstorm B4).

---

## 8. Admin, configuration et frontière code (brainstorm B3)

- **Config admin minimale v2** : activation / désactivation de modules ou blocs ; **ordre** de certains blocs ; **variantes** simples — distincte du **macro** (éditeur riche, personnalisation avancée).
- **Règle métier profonde** : reste dans **code / contrats métier** ; ouverture **super-admin** (fichiers, base) pour cas exceptionnels, avec **traçabilité** (auteur, date, motif, corrélation) et principe **break-glass** — sans banaliser l’édition des règles critiques.
- **Points d’extension anticipés** : prévoir dès la conception l’**emplacement UI** futur pour **aide / overlay** des raccourcis et la **compatibilité** avec un futur **éditeur** de layouts ou flows (même si l’outil convivial est reporté).

---

## 9. Invariants à ne pas casser (dès le nano)

| Invariant | Motif |
|-----------|--------|
| Vocabulaire `widget.type` + `props_schema` | Génération sûre, chatbot, admin dynamique |
| DSL layout distinct du CSS | Macro, tests, pas de CSS brut généré par LLM |
| Commandes + événements stables | Même chemin humain / agent / automation |
| Validation stricte des documents dynamiques | CI sur `contracts/creos/` (schémas + manifests) ; rejet runtime explicite hors palette |
| Pas de routes / navigation / pages métier inventées par le seul moteur | Cohérence OpenAPI / CREOS / commanditaire |
| Contexte cohérent ou mode explicite avant exposition métier | Aligné PRD §10.1 ; pas de supposition silencieuse |
| Fallback + journalisation + feedback + **audit / traçabilité** | PRD §4.2 chaîne modulaire complète (inclut audit) |
| Affichage ≠ autorisation | Sécurité ; macro / LLM inclus |

---

## 10. Manifests « build » vs documents dynamiques (LLM, runtime)

- **PRD** : manifests CREOS **livrés avec le build** comme source **primaire** au démarrage (sécurité > flexibilité).
- **Macro** : JSON de présentation peut être **proposé** ou **chargé** à chaud (admin, agent) — il doit passer par la **même validation** (schéma + vocabulaire + garde-fous permissions) que les artefacts embarqués.
- **Règle d’or** : pas de **deuxième** pipeline « LLM → React ad hoc » ; tout passe par **validation** puis **`LayoutRenderer` / `WidgetTreeRenderer` / `FlowRenderer`**.

---

## 11. Accessibilité (a11y)

- Le brainstorming (Q92–93) pose le **tab order**, lecteurs d’écran, et l’impact des compositions par slots vs UI 1.4.4.
- **Invariants de conception** : l’**ordre DOM** et l’ordre de tabulation doivent être **dérivables** du **document validé** (arbre widgets + rôles de zones), pas d’un reorder implicite qui casse l’a11y.
- **Phases** : **beta / interne** — objectifs a11y **documentés** (dettes assumées) ; **v2 vendable** — critères **mesurables** à fixer en produit (ordre de tabulation cohérent, focus visible, rôles/labels sur patterns critiques, pas de piège clavier sur parcours caisse/réception nominaux). Les détails techniques suivent WCAG / guidelines cibles du projet.

---

## 12. Preuves de modularité et séquence (PRD + brainstorming + sprint)

La **chaîne complète** (backend, contrats, runtime, permissions, **fallback, audit**, feedback) doit être démontrée (PRD §4.2).

**Séquence de preuve** (brainstorm clôture `195824` — **jalons conceptuels** ; **le plan d’exécution** est dans `_bmad-output/implementation-artifacts/sprint-status.yaml` et les epics) :

1. **`bandeau live`** — premier jalon **technique** de chaîne bout-en-bout UI : contrat backend **données live** + manifest CREOS + registre + slot + rendu + fallback (PRD §9.4, `navigation-structure-contract` slice bandeau). Si échec : **corriger la chaîne avant d’aller plus loin**. Dans le sprint : **epic-3** (socle Peintre) puis **epic-4** (module bandeau).
2. **Recomposition transverse** — entre bandeau et parcours métier lourds, le sprint prévoit **epic-5** (navigation / dashboard transverse, templates transverses, etc.) : ce n’est pas un « oubli » du §12 ; c’est du **prérequis UI** entre preuve modulaire et caisse/réception.
3. **Flows terrain critiques** : **`cashflow`**, **`reception flow`** — **epics-6 et 7** ; preuve que le socle tient les parcours sensibles. **Type `cashflow` vs Phase 0** : le jalon sprint exige un **parcours** caisse / réception **fluide** (raccourcis, étapes, `FlowRenderer`), pas nécessairement la valeur de schéma `type: "cashflow"` dès le premier incrément — voir **`references/peintre/2026-04-01_fondations-concept-peintre-nano-extraits.md` §7** (options a/b + ADR / story) et le paragraphe ajouté dans le document vision §3.1 (flows).
4. **Sync Paheko** — **epic-8** : articulation terrain / compta, idempotence, quarantaine ; le rendu Peintre doit **exposer** les états utiles (PRD, matrice §10.1) **sans** dupliquer la vérité comptable.
5. **Premier grand module métier** : **`déclaration éco-organismes`** — **epic-9** ; puis **adhérents**, **HelloAsso** (arbitrage), **config admin simple**, etc.

**Note Phase 1 brainstorming** : le trio **éco-organismes + bandeau live + adhérents** reste un **jeu minimal de preuves** anti-biais de conception ; l’**ordre temporel** des sprints suit le fichier **sprint-status** et les dépendances (socle → bandeau → transverse → caisse/réception → sync → modules). En cas d’arbitrage PO, **mettre à jour** soit ce paragraphe soit le sprint pour éviter double récit.

**Table PRD « Module | Statut v2 »** (~§7.1) : liste des capacités **obligatoires** au périmètre v2 — **pas** l’ordre d’implémentation.

Ce document ne remplace pas le **sprint plan**.

---

## 13. Hors scope v2 explicite (éviter confusion avec le macro)

- **Bus CREOS** obligatoire, **Peintre_mini** composition IA riche, éditeur graphique de layout — **reportés** (plans CREOS minimal, PRD, architecture).
- **Redis Streams / outbox** : résilience sync **Recyclique** possible ; **ce n’est pas** un bus CREOS v2 pour les manifests UI.

---

## 14. Références croisées

- **PRD** : `_bmad-output/planning-artifacts/prd.md` (rôles Peintre, §8 CREOS minimal, **§10 matrice fallback / blocage / retry**, UI intégrale Peintre, bandeau live).
- **Architecture** : `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`, `navigation-structure-contract.md`, `project-structure-boundaries.md` (`contracts/creos/`, `peintre-nano/`).
- **Sprint / epics** : `_bmad-output/implementation-artifacts/sprint-status.yaml`, `_bmad-output/planning-artifacts/epics.md`.
- **Brainstorming** : `_bmad-output/brainstorming/brainstorming-session-2026-03-31-195824.md` (synthèse de clôture, branches B, B1, B2, B3, séquence recommandée).
- **Recherche Perplexity (2026-03-31)** : `references/recherche/2026-03-31_brique-nano-peintre-modularite-json-ui_perplexity_reponse.md`, `2026-03-31_peintre-jarvos-grille-templates-ui-auto-optimisable_perplexity_reponse.md`, `2026-03-31_peintre-nano-workflows-navigation-raccourcis-declaratifs_perplexity_reponse.md`.
- **Plans Cursor** : `.cursor/plans/separation-peintre-recyclique_4777808d.plan.md`, `profil-creos-minimal_6cf1006d.plan.md`, `cadrage-v2-global_c2cc7c6d.plan.md`.
- **Readiness** (si besoin de gaps documentés) : `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-01.md`.
- **Concept Peintre_nano (vision JARVOS)** : `references/vision-projet/2026-03-31_peintre-nano-concept-architectural.md` ; **extraits opérationnels** (tables, phases, CREOS, mapping) : `references/peintre/2026-04-01_fondations-concept-peintre-nano-extraits.md`.

---

## 15. Suite possible (hors périmètre de ce fichier)

- ADR courte (ou story d’épique) : **discriminant `type: "cashflow"`** dans le schéma vs **approximation `wizard` / `tabbed`** pour les jalons caisse / réception — voir **§12** point 3 et **extraits §7**.
- ADR : **fusion build / runtime** pour documents de présentation (précédence, merge).
- ADR : **orchestration v2** — « reducer only » vs librairie statechart ; alignement taxonomie d’événements.
- ADR courte « surfaces + presets » (noms de champs, liaison `UserRuntimePrefs`, source canonique).
- Stories : `LayoutRenderer` minimal, `WidgetTreeRenderer`, **`FlowRenderer`** minimal, premier **`ModuleRegistry`** + catalogue + `props_schema`, **command map** + keybindings, validation CI `contracts/creos/`, **protocole de signalement** erreurs contrat.
- Jeux de tests : manifest invalide, widget inconnu, flow incomplet — vérifier fallback, isolation, traces, **corrélation** observabilité.
- **Tests automatisés** dans la chaîne build (CI) : bloquer régression de schémas et de rendu contractuel en complément du runtime.
- **Maintenance annexe §6.1** : si le PRD §10.1 change, mettre à jour le miroir ou retirer l’annexe pour éviter dérive.
