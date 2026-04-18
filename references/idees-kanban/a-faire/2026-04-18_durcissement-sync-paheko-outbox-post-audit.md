# Durcissement sync Paheko outbox (suite audit Red Team + QA2)

---

## 2026-04-18 — Agent puis clarification terrain

**Document principal (tout le détail technique) :**  
[`references/artefacts/2026-04-18_01_audit-red-team-paheko-outbox-synthese-agents.md`](../../artefacts/2026-04-18_01_audit-red-team-paheko-outbox-synthese-agents.md)

Stade Kanban : **a-faire** — découpage en stories quand tu voudras ; pas obligé de tout traiter d’un coup.

---

## Ce que « pas de TODO dans le code » voulait dire (sans jargon)

Parfois les développeurs laissent dans les fichiers source des lignes du genre `# TODO à corriger`.  
On a **cherché** s’il y en avait sur les fichiers Paheko / outbox : **il n’y en avait pas**.

Donc : **rien à « mettre à jour » dans ce sens-là** — ce n’était pas une liste de tâches oubliée dans le code, juste **constat qu’elle n’existait pas**.  
Les sujets à traiter sont ceux de l’**artefact** et du tableau ci-dessous, pas des commentaires `# TODO` manquants.

---

## Ce qui compte vraiment pour éviter des galères (par ordre de « si tu ne fais rien du tout »)

| Priorité pour toi | En une phrase |
|-------------------|----------------|
| **Règle terrain immédiate** | Avant de cliquer **Supprimer** une ligne outbox en erreur dans le support super-admin : si tu n’es pas sûr que **rien** n’a été écrit dans Paheko, **regarde Paheko** (ou le détail de la ligne / corrélation) — supprimer enlève surtout la **trace Recyclique**, pas l’écriture distante. |
| **Quand tu seras en prod sérieuse** | Si le **bandeau caisse** est bleu (« à réessayer ») alors qu’il reste aussi un **rejet** ou une **livraison partielle** Paheko, ne te fie pas au bandeau seul : l’audit l’a dit, le message peut être **trompeur** — le détail admin Paheko support reste la source pour investiguer. |
| **À planifier avec le produit / dev** | Améliorer l’agrégat, le bandeau, ou un garde-fou sur **Supprimer** — ce sont les lignes **PAHEKO-SYNC-*** dans l’artefact ; ce n’est **pas** bloquant pour ouvrir une caisse un jour, c’est du **confort et de la sécurité d’exploitation** sur le long terme. |

En résumé : **aucune urgence technique cachée** du type « le code va exploser demain » ; il y a des **angles morts d’affichage et d’ops** qu’on a documentés pour les traiter quand tu priorises.

---

## Seeds BMAD (référence courte — détail dans l’artefact)

| Seed | Idée |
|------|------|
| PAHEKO-SYNC-AGR-01 | Mieux gérer l’affichage quand plusieurs états de sync coexistent sur le même site. |
| PAHEKO-SYNC-SNAP-01 | Rendre visible ou documenter une livraison **partielle** vers Paheko (batch). |
| PAHEKO-SYNC-DEL-01 | Avertir ou bloquer la suppression si des sous-envois ont déjà réussi. |
| PAHEKO-SYNC-REL-01 | Clarifier quand le résumé sync est « vide » ou « pas calculé ». |
| PAHEKO-SYNC-QA-01 | Renforcer les tests automatiques sur les cas tordus (HTTP, batch). |

---

## Gaps tests (pour plus tard, si tu industrialises)

P0 / P1 / P2 : voir section 5 de l’artefact — surtout utile pour **ne pas réintroduire un bug** en modifiant le code plus tard.

---

## 2026-04-18 — Note de clarification (lecture humaine)

Remplacement de la section technique « inventaire TODO dans le code » par ce texte : même contenu de fond, formulation **lisible sans vocabulaire dev**.
