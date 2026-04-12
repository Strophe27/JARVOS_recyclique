# To-do reflexion / recherche — JARVOS Recyclique

> Taches hors flux BMAD (hors epics/stories).
> Une seule liste : `[ ]` a faire, `[~]` en cours, `[x]` fait. Changer uniquement le marqueur.
> **Strategie spirale** : 1re passe = decouverte sur tous les sujets ; 2e passe = recherches detaillees (API Paheko, analyse dumps, etc.).

---

- [x] Renseigner l'URL du repo GitHub public Recyclique 1.4.4 dans `references/ancien-repo/README.md`
- [x] Lancer git clone du repo Recyclique 1.4.4 (`references/ancien-repo/repo/`)
- [x] Lancer le workflow Document Project sur `references/ancien-repo/repo/` pour l'analyse brownfield
- [x] Rédiger le PRD (s'appuyer sur grille 05, artefact 08, matrice et audits migration-paheko/audits/)
- [x] Decider de l'architecture technique du nouveau backend — fait : architecture.md complété (2026-02-26), READY FOR IMPLEMENTATION
- [ ] Front caisse/réception (futur) — quand on s’en empare : brainstorm + cadrage BMAD (workflow explicite, config d’écran légère, layout dockable desktop si besoin) ; **pas d’exécution automatique avant décision** — entrée : [artefact 2026-03-26_01](artefacts/2026-03-26_01_blueprint-layout-workflow-ecrans.md) ; à reverser ensuite dans `_bmad-output/planning-artifacts/architecture.md` + `epics.md` (Epic 8) avant Create Story / Dev Story.
- [ ] v0.1 — Checklist architecture : intégrer loader modules (TOML, ModuleBase) + slots dans les premières stories modulaires ; trancher convention tests frontend ; figer versions Python/Node dans Dockerfile et README (détail : [artefact 2026-02-26_03](artefacts/2026-02-26_03_checklist-v0.1-architecture.md))
- [x] Clarifier le perimetre v0.1.0 vs fonctionnalites a reporter — source de verite : references/versioning.md (v0.1.0 → v1.0.0) ; detail eventuel dans le Brief quand produit.
- [ ] Explorer et formaliser politique fichiers (matrice, backends, scan factures, upload RecyClique→Paheko) — chantier versions futures
- [ ] Étudier presets / boutons rapides (Don, Recyclage, Déchèterie, etc.) : correspondances éco vs non-éco ou reste RecyClique — à documenter (matrice ou spec dédiée)
- [ ] Affiner détail module correspondance (champs, règles) après confrontation BDD + instance dev + analyste
- [x] Cataloguer modules Paheko — fait : reponse Perplexity + croisement artefact 09 (2026-02-25)
- [x] Rechercher frameworks plugin Python (Pluggy, stevedore, manifeste declaratif) — fait : 3 reponses Perplexity + analyse + design arbitre (artefact 07)
- [x] Verifier capacites natives Paheko : calendrier, fichiers, communication
- [x] Rechercher version Paheko recommandee (stable, LTS, 1.3.x) pour integration — fait : reponse Perplexity ; decision 1.3.19.x (2026-02-25)
- [x] Rechercher auth/SSO Paheko avec app externe FastAPI (tokens, OpenID, bonnes pratiques) — fait : reponse dans references/recherche/ (2026-02-25)
- [x] Cartographier sync financiere : sessions de caisse Recyclic → ecritures Paheko — fait : decision push RecyClique → plugin PHP + syncAccounting ; artefact 2026-02-25_04
- [x] Rechercher API Paheko caisse : endpoints, modeles, sessions, ventes, paiements — fait : reponse dans references/recherche/ (2026-02-25)
- [x] Rechercher extension saisie au poids Paheko : modeles, import depuis caisse, API — fait : reponse dans references/recherche/ (2026-02-25)
- [x] Decider source de verite caisse (Paheko seul vs miroir Recyclic) — fait : Paheko seul ; RecyClique pousse a la fermeture via plugin PHP (public/api.php), syncAccounting par le plugin
- [x] Decider granularite push (par ticket vs session) et resilience (file d'attente) — fait : par ticket, Redis Streams (2026-02-25, artefact 07)
- [x] Monter en local BDD Recyclic + Paheko (dumps prod dans `references/dumps/`), puis analyser et cartographier correspondances reelles (2e passe) — fait 2026-02-25 (accès BDD dev, schémas documentés).
- [x] Instance Paheko dev (Docker local) : installer Paheko, activer plugins caisse + saisie au poids, tester API / schema ; pour dissection et validation avant PRD — fait 2026-02-25 (dev-tampon/paheko/, BDD prod migrée, plugins installés).
- [x] Confronter RecyClique (categories, offline, decla eco-organismes) vs Paheko + plugins pour decision perimetre et mapping — fait 2026-02-25 (artefact 2026-02-25_08, grille 05 mise à jour).
- [x] Formaliser checklist "copy+consolidate+security" pour import code depuis 1.4.4 — fait : references/ancien-repo/checklist-import-1.4.4.md (appliquer à chaque pioche dans 1.4.4)
- [x] Inventorier usages LLM actuels dans Recyclic 1.4.4 — fait : import Excel, categories non normees → rapprochement LLM (2026-02-25)
- [ ] Definir strategie LLM/IA : hardcodé + placeholder Ganglion vs. JARVOS Nano/Mini — reportee apres brief (v0.1.0 = placeholder)
- [x] Mise en place de la structure de travail (2026-02-24)
- [x] Plan Git : tests, procedure, subagent @git-specialist, regle git-workflow (2026-02-24)
