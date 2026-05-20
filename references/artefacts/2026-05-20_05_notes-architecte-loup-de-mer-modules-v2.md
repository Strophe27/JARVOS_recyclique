# Notes du vieux loup de mer — modules v2 (primordial — agents dev / archi)

**Date :** 2026-05-20 · **Statut :** conseils opérationnels **non normatifs** — à charger **avant** toute session implémentation ou agent sur un module.

**Quoi :** ce que la doc ne dit pas mais qui fait gagner ou perdre des jours. Le normatif vient du pack + réponses architecte.

**Cross-références**

| Fichier | Lien |
|---------|------|
| **Bouclage GO final** | [2026-05-20_04_reponse-architecte-bouclage-modules-v2.md](2026-05-20_04_reponse-architecte-bouclage-modules-v2.md) — B.1, B.2, C, D, E ; §I = synthèse « propre » |
| **Revue 1** | [2026-05-20_03_reponse-architecte-branchements-modules-v2.md](2026-05-20_03_reponse-architecte-branchements-modules-v2.md) |
| **Recette** | [../protocole-modules-recyclique/06-MOD-cookbook-nouveau-module-optionnel.md](../protocole-modules-recyclique/06-MOD-cookbook-nouveau-module-optionnel.md) |
| **Convention back (à coller)** | `04` §B.1 → [../protocole-modules-recyclique/03-MOD-protocole-backend.md](../protocole-modules-recyclique/03-MOD-protocole-backend.md) §6 C.4 |
| **Patron UI** | `04` §B.2 → [../protocole-modules-recyclique/04-MOD-protocole-front-creos.md](../protocole-modules-recyclique/04-MOD-protocole-front-creos.md) |

**Règle de conflit :** pack `protocole-modules-recyclique/` + réponses `03`/`04` **gagnent** ; ces notes **orientent** l'exécution.

---

## Pièges connus (par cicatrice)

1. **Le brouillon OpenAPI isole (L-04 clos 2026-05-20).** `references/config-modules-site-id/openapi-module-config.yaml` est **DEPRECATED** — fusion dans `contracts/openapi/recyclique-api.yaml`. Ne **pas** coder ni generer de client sur le YAML standalone. Source canonique : `recyclique_moduleConfig_getSiteModuleConfig` / `patchSiteModuleConfig`.
2. **Le toggle `bandeau_live_slice_enabled` qu'on prend pour le modèle.** C'est de la dette Epic 4.5, pas le patron. Le patron d'activation = JSON `module_key` (DEC-03). Ne jamais copier le toggle pour un nouveau module.
3. **La page orpheline.** Un workflow step modélisé comme une page indépendante au lieu d'un panel dans le flow hôte → casse la parité legacy et l'UX. Step = panel dans `flow_id` existant. Toujours.
4. **Le deuxième registre de widgets.** `allowed-widget-types.ts` importe `getRegisteredWidgetTypeSet()`. Toute liste parallèle = bug silencieux + widget `degraded`. Un seul registre.
5. **Le `operationId` renommé en douce.** Renommer = 1 PR qui touche YAML + tous les `operation_id` CREOS + tests, ou rien. Un rename partiel passe les tests locaux et explose en intégration.
6. **L'EventBus « au cas où ».** Redis est auxiliaire (AR12). Dès qu'un agent écrit un subscribe générique « pour plus tard », c'est v0.1 qui revient. Workers nommés ou rien.
7. **La compta dans le JSON.** `module_key` JSON = flags d'activation. Toute donnée à auditer = tables + Alembic. Un montant dans un JSON config est un drapeau rouge.

---

## Heuristiques de décision rapides

- **Tables ou JSON ?** Si ça doit être joint, audité, ou contraint en SQL → tables. Sinon → JSON `module_key`. En cas de doute : tables (réversible plus proprement).
- **Slice ou step ?** Affiché en transverse, indépendant du parcours → slice. Une étape dans un parcours qui a un avant/après → step. Si tu hésites, c'est probablement un step mal vu comme un slice.
- **Impact Paheko ?** Un seul euro qui bouge → rail outbox complet (référentiel → journal → snapshot → builder → outbox). Pas d'exception, pas d'export ad hoc. Sinon → hors outbox, phases 1–8 seulement.
- **Nouvelle route ?** Doit exister dans `recyclique-api.yaml` AVANT que CREOS la référence en reviewable. L'ordre inverse crée un manifest qui pointe dans le vide.

---

## Organisation du chantier (séquence qui marche)

1. **Geler l'ADR-007 d'abord.** Tant qu'elle est Proposed, chaque agent a une excuse pour faire du v0.1. C'est le déblocage à coût zéro le plus rentable.
2. **Un module = une session = un `module_key` = un exemple de référence (le bandeau).** Mélanger deux modules dans une session d'agent produit des patterns parallèles.
3. **Fusion OpenAPI (T-MOD-3) avant tout code admin (9.6).** Coder l'admin contre un brouillon = double travail garanti.
4. **Convention backend (`03-MOD §6 C.4`) validée HITL avant le 2ᵉ module.** Le 1er module (bandeau) a déjà tranché par l'exemple ; le 2ᵉ révèle si la convention tient.
5. **Gate d'état entre chaque phase.** Pas de B→C→D sans tableau modifié/validé/ouvert/tests/fichiers. C'est la seule défense contre un agent qui « avance » en cassant l'amont.

---

## Pour piloter un agent sur `06-MOD-cookbook`

- Charge en tête de session : les 11 anti-patterns (`§15`) + les 7 pièges ci-dessus. Un agent réintroduit l'ancien design par défaut de prudence — il faut l'interdire explicitement.
- Exige un **fichier livré par phase**, jamais un résumé de chat. Phase D ops = fichiers sur disque.
- Donne les sources `refs_first` en **lecture seule** (PRD, epics, `contracts/`). Un agent qui réécrit le PRD a dérivé.
- Fais-lui produire le **tableau d'état** avant chaque gate. S'il ne peut pas le remplir, il ne sait pas où il en est.
- Vérifie systématiquement : `data_contract.operation_id` ↔ `operationId` YAML (caractère pour caractère). C'est l'erreur n°1 et elle est invisible jusqu'au runtime.

---

## Ce que je surveillerais comme dette future (pas urgent, mais à dater)

- **Tests inter-modules (L-13).** Aujourd'hui personne ne teste l'ordre d'activation ni les dépendances entre `module_key`. Au 3ᵉ–4ᵉ module ça mordra. Prévoir une suite avant l'industrialisation large, pas après.
- **CI CREOS (Epic 10).** La cohérence manifests↔API est tenue à la main. Ça tient à 1–2 modules, pas à 10. Automatiser quand le rythme d'ajout s'accélère, pas avant.
- **Précédence config en prod.** DEC-03 fige `module_key` JSON > `sites.configuration`. Vérifier qu'aucun chemin legacy ne réactive un module à `false` — c'est le genre de divergence qui se découvre en incident.

---

*Conseils, pas normes. En cas de conflit avec le pack, le pack gagne — et tu remontes le conflit en HITL.*

---

_Retour : [2026-05-20_04_reponse-architecte-bouclage-modules-v2.md](2026-05-20_04_reponse-architecte-bouclage-modules-v2.md) · [index artefacts](index.md)_
