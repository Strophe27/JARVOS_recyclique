# Guide Stratégique : Optimisation de Cursor AI via le Framework BMAD et le Plan Ultra

## 1. Introduction à la Stratégie d'Efficience BMAD

En tant qu'Architecte en Solutions IA, mon approche repose sur un principe de rigueur technique : "Le bon modèle pour la bonne tâche". L'implémentation du framework BMAD (BMM) au sein de Cursor AI n'est pas une simple préférence ergonomique, mais une nécessité économique et opérationnelle.

Cette stratégie poursuit deux objectifs quantifiables :

1. **Vitesse d'exécution** : Un gain de productivité de 2 à 4x en exploitant la faible latence des modèles de rang inférieur pour les tâches procédurales.
2. **Optimisation des ressources** : Une réduction drastique de 60 à 70 % des coûts de tokens en limitant l'usage des modèles "Frontier" aux seuls arbitrages critiques.

La synergie entre la structure modulaire du BMAD et la puissance de calcul du Plan Ultra permet de transformer Cursor en une véritable usine logicielle autonome, capable de traiter des codebases complexes sans saturation cognitive ou financière.

---

## 2. La Hiérarchie des 4 Tiers LLM (Édition Mars 2026)

L'écosystème des modèles de langage s'est stabilisé autour de quatre niveaux de puissance. Pour un expert, la sélection du modèle ne dépend pas de sa renommée, mais de son score SWE-bench et de sa latence TTFT (Time To First Token).

| Tier | Modèles types | Latence / Débit | Score SWE-bench / AIME | Usage recommandé |
|------|---------------|-----------------|------------------------|------------------|
| Tier 1 — Blazing Fast | Gemini Flash Lite, GPT-4o Mini, Claude Haiku 4.5 | < 700 ms, > 200 tok/s | ~72–73 % (SWE) | Routage, classification, opérations fichiers |
| Tier 2 — Smart Fast | Gemini 3 Flash, Claude Sonnet 4.6 (Standard) | ~1–2 s, ~100–200 tok/s | 78–80 % (SWE) | Code, tests, stories, spécifications UX |
| Tier 3 — Deep Reasoning | Sonnet 4.6 (Extended Thinking), GPT-5.2 (Reasoning) | Variable (Thinking time) | 80 %+ (SWE) | Architecture, revues adversariales, PRD |
| Tier 4 — Frontier Hardcore | Claude Opus 4.6, GPT-5.2 (Full Reasoning) | Basse (Premium) | 80.9% (Opus) / 100% (AIME GPT-5.2) | Validation critique, audits, logique avancée |

**Positionnement stratégique :**

- **Tier 1** : Le "système nerveux". Il gère l'infrastructure et le routage sans raisonnement profond.
- **Tier 2** : Le "cœur de production". Il équilibre vitesse et intelligence pour 56 % de la charge de travail.
- **Tier 3** : La "tour de contrôle". Utilisé pour l'orchestration multi-étapes et les décisions architecturales.
- **Tier 4** : Le "juge suprême". Conformément au framework BMAD, il doit être un LLM externe (différent du producteur) pour assurer une validation croisée objective et sans biais.

---

## 3. Cartographie des Agents : BMAD et Subagents Cursor

Le framework BMAD distribue les rôles entre les personas métiers (BMM) et les agents spécialisés de l'IDE.

### Agents BMAD (Module BMM)

- **bmad-master** (Tier 1) : Routage pur et chargement de ressources.
- **analyst** (Mary - Tier 2) : Recherche de marché, domaine et analyses SWOT.
- **architect** (Winston - Tier 3) : Décisions d'architecture (ADR) et arbitrages techniques.
- **dev** (Amelia - Tier 2) : Implémentation TDD et développement de fonctionnalités.
- **pm** (John - Tier 2–3) : Tier 3 pour la création de PRD, Tier 2 pour les Epics et validations.
- **qa** (Quinn - Tier 2) : Génération de tests API et E2E.
- **sm** (Bob - Tier 2) : Sprint planning et structuration des stories.
- **ux-designer** (Sally - Tier 2) : User flows et spécifications d'interface.
- **tech-writer** (Paige - Tier 1–2) : Tier 1 pour la doc, Tier 2 pour les diagrammes complexes.
- **quick-flow-solo-dev** (Barry - Tier 2) : Prototypage rapide et implémentations légères.

### Agents Cursor (Subagents .cursor/agents/)

- **bmad-orchestrator** (Tier 3) : Gestion de l'état partagé et décisions de routage complexes.
- **bmad-sm** (Tier 2) : Création et validation structurée de stories.
- **bmad-dev** (Tier 2) : Implémentation directe dans le codebase.
- **bmad-revisor** (Tier 2) : Relecture et vérification de complétude des livrables.
- **bmad-qa** (Tier 3) : Review adversarial pour identification de failles critiques.
- **depot-specialist** (Tier 1) : Classification et réorganisation physique des fichiers.
- **git-specialist** (Tier 1) : Workflows Git procéduraux.
- **browser-views-audit-temp** (Tier 2) : Rapports d'audit visuel et captures.

---

## 4. Répertoire des 39 Workflows par Phase de Développement

### Phase 1 — Analysis (5 workflows)

| Workflow | Code | Agent | Tier |
|----------|------|-------|------|
| Brainstorm Project | BP | analyst (Mary) | Tier 2 |
| Market Research | MR | analyst (Mary) | Tier 2 |
| Domain Research | DR | analyst (Mary) | Tier 2 |
| Technical Research | TR | analyst (Mary) | Tier 2 |
| Create Brief | CB | analyst (Mary) | Tier 2 |

### Phase 2 — Planning (4 workflows)

| Workflow | Code | Agent | Tier |
|----------|------|-------|------|
| Create PRD | CP | pm (John) | Tier 3 |
| Validate PRD | VP | pm (John) | Tier 4 (Ext. LLM) |
| Edit PRD | EP | pm (John) | Tier 2 |
| Create UX | CU | ux-designer (Sally) | Tier 2 |

### Phase 3 — Solutioning (3 workflows)

| Workflow | Code | Agent | Tier |
|----------|------|-------|------|
| Create Architecture | CA | architect (Winston) | Tier 3 |
| Create Epics and Stories | CE | pm (John) | Tier 2 |
| Check Implementation Readiness | IR | architect (Winston) | Tier 4 (Ext. LLM) |

### Phase 4 — Implementation (8 workflows)

| Workflow | Code | Agent | Tier |
|----------|------|-------|------|
| Sprint Planning | SP | sm (Bob) | Tier 2 |
| Sprint Status | SS | sm (Bob) | Tier 1 |
| Create Story | CS | sm (Bob) | Tier 2 |
| Validate Story | VS | sm (Bob) | Tier 2 |
| Dev Story | DS | dev (Amelia) | Tier 2 |
| QA Automation | QA | qa (Quinn) | Tier 2 |
| Code Review | CR | dev (Amelia) | Tier 3 |
| Retrospective | ER | sm (Bob) | Tier 2 |

### Workflows « Anytime » (9 workflows)

| Workflow | Code | Agent | Tier |
|----------|------|-------|------|
| Document Project | DP | analyst (Mary) | Tier 2 |
| Generate Project Context | GPC | analyst (Mary) | Tier 2 |
| Quick Spec | QS | solo-dev (Barry) | Tier 2 |
| Quick Dev | QD | solo-dev (Barry) | Tier 2 |
| Correct Course | CC | sm (Bob) | Tier 3 |
| Write Document | WD | tech-writer (Paige) | Tier 1 |
| Mermaid Generate | MG | tech-writer (Paige) | Tier 2 |
| Validate Document | VD | tech-writer (Paige) | Tier 2 |
| Explain Concept | EC | tech-writer (Paige) | Tier 1 |

### Core Tasks (10 tâches)

| Task | Code | Tier | Note |
|------|------|------|------|
| Help | BH | Tier 1 | Assistance IDE |
| Index Docs | ID | Tier 1 | Indexation vectorielle |
| Shard Document | SD | Tier 1 | Découpage de fichiers |
| Editorial Review — Prose | EP | Tier 2 | Qualité rédactionnelle |
| Editorial Review — Structure | ES | Tier 2 | Cohérence structurelle |
| Adversarial Review | AR | Tier 3 | Recherche de failles |
| Brainstorming | BSP | Tier 2 | Idéation technique |
| Party Mode | PM | Tier 2–3 | Créativité étendue |
| Git Workflow | GW | Tier 1 | Commandes standards |
| Depot Organization | DO | Tier 1 | Ventilation fichiers |

---

## 5. Configuration Technique et Optimisation du Frontmatter

La puissance du système réside dans l'automatisation du choix du modèle via le champ `model` du YAML frontmatter.

| Valeur YAML | Effet technique |
|-------------|-----------------|
| `model: fast` | Force l'usage d'un modèle Tier 1 (Haiku/Flash), ignorant la sélection globale. |
| `model: inherit` | Utilise le modèle actif dans l'interface Cursor (Mode standard ou Max). |
| `model: <model-id>` | Force un modèle précis (ex: opus-4.6). Nécessite l'activation du Max Mode. |

**Optimisation critique :** Les agents depot-specialist et git-specialist doivent être configurés en `model: fast` pour garantir une fluidité totale de l'interface.

---

## 6. Analyse Économique : Plan Ultra et Max Mode

Le Plan Ultra (200 $/mois) est l'investissement de référence pour l'ingénierie intensive. Il offre une capacité de traitement 20 fois supérieure au plan Pro pour les agents, incluant environ 400 $ de crédits API réels.

### Le Levier du Max Mode

L'activation du Max Mode (Settings → Model Picker) transforme les capacités d'analyse :

- **Contexte étendu** : Passage à une fenêtre de 1M+ tokens (Sonnet/Opus 4.6).
- **Profondeur de lecture** : L'agent analyse 750 lignes par fichier (contre 250 en mode normal), essentiel pour les refactorings de codebases denses.
- **Cloud Agent** : Permet l'exécution de tâches lourdes en arrière-plan (CI/CD, automatisations) sans immobiliser la machine locale.

### Coûts estimatifs en Max Mode (Requête type de 500k tokens)

*Attention : Les agents en boucle (read/edit/test) peuvent consommer les crédits 3 à 10x plus rapidement en Max Mode.*

| Modèle (Max Mode) | Contexte | Coût Cursor (500k tokens) |
|-------------------|----------|---------------------------|
| Claude Sonnet 4.6 | 1M | 4 $ - 10 $ |
| Claude Opus 4.6 | 1M+ (Thinking) | 8 $ - 20 $ |
| GPT-5.2 | 200k - 1M | 5 $ - 15 $ |
| Gemini 3 Flash | 1M | 1 $ - 4 $ |

---

## 7. Synthèse de Distribution et Recommandations Opérationnelles

### Distribution statistique des 39 workflows

- **Tier 1 (18 %)** : Tâches procédurales (Git, Index, Shard).
- **Tier 2 (56 %)** : Cœur productif (Code, Stories, Specs).
- **Tier 3 (21 %)** : Workflows critiques (Arch, PRD, Adversarial).
- **Tier 4 (5 %)** : Validations de haute précision (VP, IR).

### Recommandations Finales de l'Expert

1. **Usage Sélectif du Max Mode** : Ne l'activez que pour les Tiers 3 et 4. Son usage permanent sur des tâches de Tier 2 est une aberration économique.
2. **Impératif de Validation Croisée** : Pour Validate PRD (VP) et Implementation Readiness (IR), utilisez systématiquement un fournisseur différent de votre modèle de production (ex: validez un code Sonnet via GPT-5.2) pour briser la chambre d'écho de l'IA.
3. **Exploitation du Cloud Agent** : Déportez les implémentations asynchrones sur les serveurs Cursor pour maintenir votre flux de travail local intact.
4. **Gate Pré-Run Obligatoire** : Avant tout lancement de run, un **conseiller global** doit recommander le tier ou modèle adapté au run et, si besoin, au lot de sous-agents, puis attendre validation explicite. Éviter de dupliquer cette pause dans chaque sous-agent.

**Conclusion :** L'application rigoureuse de cette hiérarchie garantit une scalabilité totale. En respectant cette structure, vous transformez l'IA d'un simple outil de complétion en un partenaire d'ingénierie stratégique, rapide et économiquement viable.
