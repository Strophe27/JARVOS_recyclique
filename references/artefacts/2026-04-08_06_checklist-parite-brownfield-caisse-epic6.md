# Checklist de parite brownfield caisse (Epic 6)

**Date :** 2026-04-08  
**Usage :** checklist de reference pour la future revalidation terrain apres correct course approuve.  
**Regle :** cocher uniquement quand la preuve existe sur la v2 servie, pas sur la seule base des tests unitaires ou des captures legacy.

---

## 1. Nominal

- [ ] L'entree `/caisse` restitue un **point d'entree brownfield operatoire** et non un raccourci direct vers un wizard isole.
- [ ] L'operatrice voit clairement son **poste**, sa **session** et son **mode** avant de commencer a vendre.
- [ ] Le parcours nominal reste **clavier-first** et exploitable sans souris pour les etapes critiques.
- [ ] Le **ticket courant** et la **finalisation** restent dans le meme univers de travail que la vente.
- [ ] Le parcours n'affiche aucun faux succes comptable : il distingue explicitement **enregistre localement** de **traite comptablement / synchronise**.

**Preuve acceptee :** capture ou demo du point d'entree `/caisse` + scenario manuel nominal ; pour `clavier-first`, montrer au minimum la navigation clavier sur les etapes critiques du poste caisse.

## 2. Ouverture

- [ ] La selection du poste de caisse est visible et compréhensible.
- [ ] L'ouverture de session est une etape explicite avec saisie du fond de caisse.
- [ ] Les variantes **reelle / virtuelle / differee** sont visibles seulement selon les permissions.
- [ ] Un contexte invalide ou ambigu bloque l'ouverture avec un message exploitable.
- [ ] Une ouverture invalide ne laisse pas entrer silencieusement dans la vente.

**Preuve acceptee :** capture du dashboard caisse, capture ou demo d'ouverture, et un cas bloque documente.

## 3. Vente

- [ ] L'ecran de vente restitue les zones brownfield structurantes : **header session**, **KPIs**, **saisie**, **ticket courant**.
- [ ] Les variantes de vente utiles au terrain restent accessibles sans casser le poste caisse principal.
- [ ] Le **ticket en attente** est place, repris et abandonne depuis le meme workspace caisse.
- [ ] Les etats `DATA_STALE`, erreurs API et degradations sont explicites avant paiement.
- [ ] Le backend reste autoritaire pour contexte, permissions et validation finale.

**Preuve acceptee :** demo ou capture du grand ecran de vente + reprise des tests `cashflow-*` relies aux cas held / stale / contexte.

## 4. Finalisation

- [ ] La finalisation est comprise comme la fin naturelle du parcours de vente, pas comme une page a part.
- [ ] Le paiement, le total, les dons et les champs finaux restent lisibles pour l'operatrice.
- [ ] Les encaissements specifiques et sociaux sont presents comme **variantes du poste caisse** et non comme fragmentation illisible du parcours.
- [ ] Le remboursement reste clairement distingue d'une vente nominale.
- [ ] Aucune mutation sensible n'est possible sans revalidation serveur.

**Preuve acceptee :** demonstration d'un flux nominal, d'un remboursement et d'un encaissement special/social dans le meme univers caisse.

## 5. Cloture

- [ ] La cloture locale est atteignable depuis le parcours caisse reel, avec recapitulatif compréhensible.
- [ ] Les totaux affiches avant cloture correspondent aux agregats backend exposes.
- [ ] Les cas bloquants sont explicites : ticket en attente, ecart hors regle, permission, PIN, session invalide.
- [ ] Le message de relais vers la sync / compta reste honnete : il peut dire **enregistre localement** ou **sync differee cote serveur**, mais ne simule ni quarantaine complete ni reconciliation finale Epic 8.
- [ ] Une session vide ou particuliere suit une regle explicite et compréhensible.

**Preuve acceptee :** capture ou demo du recap cloture, d'un cas bloque et du message de relais post-cloture.

## 6. Admin Session Detail

- [ ] Le **gestionnaire des sessions** est servi dans la v2 avec un acces admin clair.
- [ ] Le **detail session** est consultable depuis ce gestionnaire.
- [ ] Le journal des ventes, les totaux, le poids et les ecarts sont lisibles.
- [ ] Les actions sensibles de correction restent rattachees a ce locus admin, tracees et bornees.
- [ ] Le detail session sert de preuve d'exploitabilite locale sans pretendre la reconciliation Paheko.

**Preuve acceptee :** capture ou demo de la liste des sessions puis du detail session admin.

## 7. Variantes reel / virtuel / differe

- [ ] Les trois variantes ont un point d'entree et des garde-fous clairs.
- [ ] La saisie differee reste visible comme un cas distinct avec date reelle d'ouverture / vente.
- [ ] Le mode virtuel est identifiable comme mode simulation.
- [ ] Chaque variante reemploie le meme cadre de contexte, d'erreur et de defensif.
- [ ] Aucune variante ne contourne les permissions ou le contexte brownfield.

**Preuve acceptee :** capture ou demo des trois points d'entree avec leur vocabulaire et leurs garde-fous.

## 8. Frontiere locale vs Epic 8

| Sujet | Attendu pour valider Epic 6 | Reste Epic 8 |
|---|---|---|
| Vente / session | enregistrement local et etats honnetes dans Recyclique | reconciliation finale avec Paheko |
| Cloture | cloture locale exploitable avec message de relais | sync reelle, quarantaine, resolution manuelle |
| UI sync | affichage honnete type `enregistre localement` / `sync differee cote serveur` | pilotage complet des ecarts comptables |
| Admin session detail | supervision locale exploitable | correlation inter-systemes avancee |

## 9. Preuves minimales a fournir

- [ ] Preuve UI manuelle sur la v2 servie.
- [ ] Reprise des tests automatises pertinents `cashflow-*`.
- [ ] Reference au mapping brownfield -> v2 : `references/artefacts/2026-04-08_05_mapping-brownfield-v2-caisse-epic6.md`.
- [ ] Reference aux captures brownfield comme memoire, pas comme spec normative.
- [ ] Tableau explicite `local v2` vs `Epic 8 / Paheko`.

---

## 10. Glossaire minimal

- `DATA_STALE` : la donnee critique n'est plus assez fraiche pour autoriser une action sensible.
- `cashflow-*` : famille de tests UI deja existants sur la caisse v2.
- `Epic 8` : chantier sync / reconciliation reelle avec Paheko, hors validation locale Epic 6.

## 11. Decision d'usage

Cette checklist n'autorise pas a fermer `6.10` seule.  
Elle sert a preparer la **validation finale** d'une baseline **brownfield-first** reappliquee.
