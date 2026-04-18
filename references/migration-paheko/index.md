# Index — references/migration-paheko/

Matiere de travail sur la migration Paheko / RecyClique : guides, presentations, TODO, comptes-rendus, decla eco-organismes, **audits**, specifications d'integration avec services tiers (ex. HelloAsso). Contexte pour le refactor JARVOS Recyclique.

> Charger si : session sur integration Paheko, vision plateforme, decla eco-organismes, historique decisions RecyClique, ou cadrage module **HelloAsso** / paiements en ligne tiers.

**Voir aussi (2026-03-31) :** croiser avec le **backlog technique** et les audits code dans [consolidation-1.4.5/](../consolidation-1.4.5/) ; synthese transversale des dossiers `references/` : [artefacts/2026-03-31_02_audit-references-00-synthese-globale.md](../artefacts/2026-03-31_02_audit-references-00-synthese-globale.md).

---

## Sous-dossier audits/

- **`audits/`** — Audits pour correspondances RecyClique ↔ Paheko : mode d'emploi synthétique, traçabilité workflow/options → UI, tables BDD, références plugin. Contient les audits caisse et saisie au poids (Paheko + RecyClique 1.4.4) et la **matrice de correspondance** caisse/poids. Détail : **audits/index.md**.
  _(Charger si : correspondances caisse / saisie au poids, mapping BDD caisse Paheko, module de correspondance, ou revue des workflows pour le module RecyClique→Paheko.)_

---

## Fichiers

| Fichier | Contenu |
|---------|--------|
| `2025-11_paheko-recyclique-integration-first-search.md` | Guide distribution Paheko preconfigurée pour RecyClique (Docker, extensions, middleware) |
| `2025-11_v1.3.17_recyclique-guide-complet.md` | Guide complet RecyClique + Paheko v1.3.17 (architecture, config, deploiement) |
| `categories-decla-eco-organismes.md` | Filières REP, classification, outils ADEME/eco-organismes — matière module decla eco-organismes |
| `2025-12-05_todo-christophe-recyclique-paheko.md` | TODO post-réunion (bugs, features) — à croiser avec 1.4.4 déjà implémenté |
| `2025-12-05_compte-rendu-reunion-recyclique.md` | Compte-rendu réunion 5 déc. 2025 (décisions, participants, transcription) |
| `2026-04-12_specification-integration-helloasso-recyclique-paheko.md` | Spec d'integration **HelloAsso** ↔ RecyClique ↔ Paheko (roles, flux, webhooks, modeles de donnees, securite) — matiere pour un futur module RecyClique |
| `2026-04-12_brouillon-arbitrage-helloasso-et-promesse-recyclique-paheko.md` | **Brouillon** : arbitrage express (voie API, Paheko local) + **promesse produit** en langage plancher (parcours adherent/donateur, admin asso, effets Paheko, phases 1–3) — pour valider story 9.4 et communication interne |
| `2026-04-15_prd-recyclique-caisse-compta-paheko.md` | **PRD** Recyclique × Paheko (v1.0) : refonte caisse, moyens de paiement, dons, remboursements, snapshot de session, écriture multi-lignes Paheko, paramétrage SuperAdmin ; date document 2026-04-15. _(Charger si : cadrage comptable caisse, stories Epic 8 / compta, arbitrage expert-comptable, alignement implémentation vs spec.)_ |
| `2026-04-18_spec-corrections-qa-parametrage-comptable-superadmin.md` | **Grille QA / correctifs** sur l’écran Paramétrage comptable (SuperAdmin) : priorité B1–B3, manquants M*, améliorations I* ; **encart Décisions produit (2026-04-18)** pour M1/M5. _(Charger si : fin d’écarts après implémentation partielle, reprise audit sur comptes 7541/672, moyens Don/Virement, champs journal/libellés, UX clôture.)_ |

**Ailleurs :** Opérations spéciales caisse (PRD v1.1 + prompt exécution, annulation / remboursement / tags / Paheko) → **[../operations-speciales-recyclique/](../operations-speciales-recyclique/index.md)**. Archive RAG → **references/vision-projet/** ; matière première présentations → **references/vision-projet/** ; version épurée pour envoi → **doc/** (racine, communication publique).
