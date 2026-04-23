# Generate Project Context Workflow

**Goal:** Create a concise, optimized `project-context.md` file containing critical rules, patterns, and guidelines that AI agents must follow when implementing code. This file focuses on unobvious details that LLMs need to be reminded of.

**Your Role:** You are a technical facilitator working with a peer to capture the essential implementation rules that will ensure consistent, high-quality code generation across all AI agents working on the project.

---

## WORKFLOW ARCHITECTURE

This uses **micro-file architecture** for disciplined execution:

- Each step is a self-contained file with embedded rules
- Sequential progression with user control at each step
- Document state tracked in frontmatter
- Focus on lean, LLM-optimized content generation
- You NEVER proceed to a step file if the current step file indicates the user must approve and indicate continuation.

---

## INITIALIZATION

### Configuration Loading

Load config from `{project-root}/_bmad/bmm/config.yaml` and resolve:

- `project_name`, `output_folder`, `user_name`
- `communication_language`, `document_output_language`, `user_skill_level`
- `date` as system-generated current datetime
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`
- ✅ YOU MUST ALWAYS WRITE all artifact and document content in `{document_output_language}`

### Paths

- `output_file` = `{output_folder}/project-context.md`

### Résolution des chemins (config BMM — obligatoire avant step-01)

Sans cette étape, les placeholders `{planning_artifacts}`, `{project_knowledge}`, `{implementation_artifacts}` utilisés dans les steps restent **non résolus**.

1. **`{project-root}`** : racine du dépôt où se trouve `_bmad/bmm/config.yaml` (dossier parent de `_bmad/`).

2. **Substitution** : pour chaque clé ci-dessous lue dans `config.yaml`, remplacer littéralement `{project-root}` dans la valeur par le chemin absolu ou la portion relative cohérente avec ton OS.

| Clé `config.yaml` | Rôle | Exemple résolu (JARVOS_recyclique) |
|-------------------|------|-------------------------------------|
| `output_folder` | Sortie BMAD principale | `{project-root}/_bmad-output` |
| `planning_artifacts` | PRD, épiques, ADR / architecture indexée | `{project-root}/_bmad-output/planning-artifacts` |
| `implementation_artifacts` | Artefacts sprint / stories | `{project-root}/_bmad-output/implementation-artifacts` |
| `project_knowledge` | Références projet courantes | `{project-root}/references` |

3. **Fichiers dérivés** (à utiliser dans les steps, sans ambiguïté) :

   - **`output_file`** (livrable de ce workflow) : `{output_folder}/project-context.md` → typiquement `_bmad-output/project-context.md`.
   - **Contexte projet « knowledge »** : `{project_knowledge}/project-context.md` → `references/project-context.md` **si** tu le maintiens à cet endroit ; sinon la recherche globale `{project-root}/**/project-context.md` du step-01 reste valide.
   - **Architecture** : point d’entrée documentaire → `{planning_artifacts}/architecture/index.md` (table des matières ADR / liens). Ne pas supposer un unique `architecture.md` à la racine de `planning-artifacts` sans vérification.

### Périmètre dépôt (JARVOS / Recyclique)

- **Canon applicatif :** **Recyclique API** = backend de référence → arborescence **`recyclique/api/`** ; **peintre-nano** = front-end de référence → **`peintre-nano/`**. C’est ce duo qu’une exécution de ce workflow doit refléter dans `project-context.md`.
- Le dossier **`recyclique-1.4.4/`** est **legacy** : **ne pas** l’utiliser comme source de vérité pour la stack, les tests, ni les chemins (ni comme substitut du front ou du back canoniques).
- Lors de la découverte (step-01), **exclure** explicitement ce dossier des parcours « package.json / pytest / compose » sauf si l’utilisateur demande un audit legacy ciblé.

---

## EXECUTION

Load and execute `./steps/step-01-discover.md` to begin the workflow.

**Note:** Input document discovery and initialization protocols are handled in step-01-discover.md.
