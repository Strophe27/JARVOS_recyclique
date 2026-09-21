# QA boucle — attendre vs tâche de fond

Référence détaillée pour l'orchestrateur chat. Le parent qa3 **interne** : planificateur bloquant → schedule R11 → workers **par batch validé** — voir [`../../qa3-agent/workflow.md`](../../qa3-agent/workflow.md) et [`../../qa3-agent/references/r11-file-shard-schedule.md`](../../qa3-agent/references/r11-file-shard-schedule.md).

---

## Principe

| Niveau | Outil | `run_in_background` |
|--------|-------|------------------------|
| **Chat → parent qa3** | Task `generalPurpose` | **Décision ici** — bloquant ou fond |
| **Parent qa3 → planner** | Task imbriqué | Toujours **false** (bloquant) |
| **Parent qa3 → schedule R11** | Shell `compute_worker_schedule.py` | **Synchrone bloquant** (pas un Task ; pas de `run_in_background`) |
| **Parent qa3 → workers** | Task imbriqués | **Par batch R11** — `run_in_background: true` **autorisé** intra-batch parallèle validé ; le parent attend **tous** les retours du batch avant le suivant |

Une boucle gate 95 peut durer **plusieurs minutes** (jusqu'à 3 itérations × planner + workers + correctifs). **Ne pas bloquer le chat par défaut** — le fond est le mode naturel sauf signaux bloquants explicites.

---

## Arbre de décision (lire en premier)

```
Demande boucle QA identifiée
        │
        ├─ Signal BLOQUANT explicite ? (score dans ce fil, « dis-moi quand c'est bon »,
        │   commit/push/deploy juste après, « attends le résultat »)
        │       └─ OUI → bloquant (false)
        │
        ├─ Même message contient une AUTRE tâche indépendante ?
        │       └─ OUI → fond (true) — exécuter l'autre tâche sans attendre
        │
        ├─ ≥ 3 fichiers, dossier entier, refactor large, ou livrable structurant ?
        │       └─ OUI → fond (true) sauf signal bloquant ci-dessus
        │
        ├─ Fin de session / handoff / « je reviens » / « ne bloque pas » ?
        │       └─ OUI → fond (true)
        │
        ├─ QA = filet post-livraison, implémentation déjà livrée, suite sans lien ?
        │       └─ OUI → fond (true)
        │
        └─ Sinon : 1–2 petits fichiers ET verdict attendu dans ce fil → bloquant ;
                  sinon → fond (true) — la boucle est longue par nature
```

**Erreur fréquente** : choisir bloquant par « prudence » alors qu'aucun signal bloquant n'est présent → **préférer fond** et annoncer le lancement.

---

## Mode bloquant — `run_in_background: false`

**Attendre le retour final du parent qa3 avant de continuer ou de clore.**

| Signal | Exemple |
|--------|---------|
| Utilisateur attend le **score / verdict gate** dans ce fil | « Lance la QA et dis-moi le score » |
| **Clôture** du travail dans le même tour | « Termine et valide à 95+ » |
| **`strophe-review` phase 2** (verdict gate après relecture) | `$strophe-review` — brief parent `run_in_background: false` par défaut |
| **Commit / push / deploy** prévu juste après | Règle projet qa-after-major-ops |
| **Suite logique** dépend du rapport | Correctifs P0 avant autre chantier |
| Livrable **petit** (1–2 fichiers) **et** verdict demandé | Revue rapide avec score immédiat |
| **readonly: true** + restitution immédiate demandée | Revue sans édition, verdict attendu |

**Comportement chat** : lancer 1 Task parent → attendre → restituer score, verdict, correctifs, risques, HITL.

---

## Mode tâche de fond — `run_in_background: true`

**Lancer la boucle QA sans bloquer le chat ; reprendre à la notification de fin.**

| Signal | Exemple |
|--------|---------|
| Utilisateur donne une **autre tâche** en parallèle | « QA ce doc pendant que tu prépares X » |
| Session **longue** / livrable **volumineux** (≥3 fichiers, dossier) | Refactor large, doc structurante |
| **Handoff** — laisser la main | Fin de tour agent, Strophe revient plus tard |
| QA = **filet de sécurité** post-livraison, pas bloquant pour la suite | Implémentation déjà livrée, audit en différé |
| Utilisateur dit **« en arrière-plan »** / **« ne bloque pas »** | Consigne explicite |
| **Aucun** signal bloquant et boucle gate 95 (longue par défaut) | « Passe la boucle QA sur ce chantier » |

**Comportement chat** :

1. Lancer **1** Task parent avec `run_in_background: true`.
2. Annoncer brièvement : QA lancée en fond, périmètre, gate visé — **ne pas** prétendre gate atteint avant notification.
3. **Continuer** le travail indépendant **ou** clore le tour si rien d'autre.
4. À **notification** de fin : lire le retour parent → restituer score, verdict, correctifs, risques, HITL.
5. Si gate non atteint et correctifs restants : proposer cycle suivant (nouveau parent) ou HITL — **ne pas** commit/push « gate OK » sans preuve.

**Interdit en mode fond** : marquer le chantier « terminé gate 95+ », committer, ou push avant le retour QA (sauf utilisateur accepte explicitement le risque).

---

## Exemples

### Exemple A — bloquant

> « Implémente CW-8 et passe la boucle QA avant de me dire que c'est bon. »

→ `run_in_background: false` — score et verdict requis avant clôture.

### Exemple B — fond + travail parallèle

> « Documente DECISIONS.md, lance la QA en fond, et prépare le smoke test. »

→ QA : `run_in_background: true` — continuer smoke ; à notification QA, restituer score sans bloquer le smoke.

### Exemple C — fond + handoff

> « QA gate 95 sur les 8 fichiers modifiés, je reviens dans 1 h. »

→ `run_in_background: true` — message court « QA lancée (gate 95, N fichiers) », fin de tour ; restitution complète à notification.

### Exemple D — fond par défaut (sans consigne explicite)

> « Passe la boucle QA gate 95 sur le refactor skills. »

→ `run_in_background: true` — chantier volumineux, boucle longue ; continuer si autre sujet, sinon clore le tour en annonçant le lancement.

### Exemple E — règle projet qa-after-major-ops

Opération majeure terminée, pas de consigne utilisateur.

→ **Fond** si l'utilisateur enchaîne sur un autre sujet ; **bloquant** seulement si le tour vise à **clore** avec gate et score dans ce fil.

---

## Paramètres Task (rappel)

Mode fond :

```text
run_in_background: true
subagent_type: generalPurpose
model: [slug parent — voir qa3-agent/references/model-routing.md]
readonly: false  # sauf revue sans édition
```

Brief parent : inclure la ligne **« Mode exécution : tâche de fond — le chat peut continuer ; restituer scores/verdict/correctifs à la notification. »**

Mode bloquant : omit `run_in_background` ou `false` ; brief sans la ligne fond.
