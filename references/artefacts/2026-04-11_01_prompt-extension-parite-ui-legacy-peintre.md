# Prompt BMAD — extension de la parite UI legacy `Peintre_nano`

Date : 2026-04-11

Usage : prompt de lancement pour etendre, en session propre, la methode legacy-first validee sur l'Epic 11 vers les prochains ecrans prioritaires (`reception`, `caisse` au-dela du kiosque nominal, `administration`).

## Intention

Conserver la meme discipline que sur l'Epic 11 :

- reference terrain d'abord via `frontend-legacy` sur `http://localhost:4445`
- comparaison visuelle et comportementale reelle avant toute interpretation
- analyse du code `recyclique-1.4.4` quand DevTools ne suffit pas a trancher
- adaptation dans `Peintre_nano` sans reconstituer le metier dans le frontend
- hierarchie stricte :
  `OpenAPI > ContextEnvelope > NavigationManifest > PageManifest > UserRuntimePrefs`

## Prompt pret a l'emploi

```text
Tu es l'orchestrateur principal BMAD pour `JARVOS_recyclique`.

Mission:
Executer en serie le prochain chantier de parite UI legacy dans `Peintre_nano`, en utilisant au maximum les sous-agents adaptes, jamais en background agent, et en gardant le contexte principal leger.

Epic cible:
- `Epic 12` si la session porte sur la reception
- `Epic 13` si la session porte sur la caisse au-dela du kiosque nominal
- `Epic 14` si la session porte sur l'administration

Rappels imperatifs:
- suivre strictement `OpenAPI > ContextEnvelope > NavigationManifest > PageManifest > UserRuntimePrefs`
- `Peintre_nano` compose ; il ne devient jamais auteur metier
- ne jamais recreer de logique metier frontend
- ne jamais transformer l'epic en fourre-tout
- si un doute apparait, trancher d'abord par DevTools legacy puis par lecture du code `recyclique-1.4.4`
- si un vrai blocage apparait, le documenter proprement comme gap borne, proposer la sortie minimale reviewable, puis reprendre

Usage DevTools obligatoire:
- utiliser Chrome DevTools MCP sur `http://localhost:4445`
- ouvrir les ecrans legacy reels du perimetre
- prendre des snapshots textuels
- observer les routes, shells, boutons, champs, blocs visibles
- inspecter les requetes reseau reellement declenchees
- confirmer les redirections et etats visibles
- nourrir implementation, QA et validation finale avec ces preuves

Cadre d'execution par story:
1. lire la story et ses dependances
2. verifier rapidement les gaps contrat / manifeste
3. observer le legacy reel avec DevTools
4. analyser le code legacy si le comportement doit etre confirme
5. implementer dans `Peintre_nano`
6. tester / gates
7. QA ciblee, incluant comparaison legacy vs Peintre
8. review critique
9. corriger si necessaire
10. mettre a jour artefacts / statuts
11. passer immediatement a la story suivante

Documents a charger en premier:
- `references/index.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`
- `peintre-nano/docs/03-contrats-creos-et-donnees.md`
- les artefacts de parite UI deja existants de l'Epic 11
- puis les futurs artefacts dedies au domaine cible (cadrage, matrice, story seeds, preuves)

Regle de methode:
- copier / adapter depuis le legacy est autorise quand cela permet de retrouver le rendu observable plus fidelement
- toute divergence volontaire entre route legacy et ancrage CREOS doit etre ecrite noir sur blanc
- tout bloc UI affiche doit etre mappe a un contrat reviewable ou marque explicitement comme gap / differe

Sortie attendue a chaque story:
- fait
- gaps restants
- statut
- preuves legacy utilisees
```

## Ordre recommande entre epics

1. `Epic 13` : caisse extension, pour capitaliser juste apres `11.3`
2. `Epic 12` : reception, autre parcours terrain critique
3. `Epic 14` : administration, apres stabilisation des patterns de contexte et navigation

## Notes BMAD

- `epics.md` contient maintenant les Epics `12`, `13` et `14`.
- `sprint-status.yaml` est synchronise avec leurs stories en `backlog`.
- Le prochain pas BMAD naturel est `create-story` sur la premiere story de l'epic choisi, pas une implementation large sans cadrage story par story.
