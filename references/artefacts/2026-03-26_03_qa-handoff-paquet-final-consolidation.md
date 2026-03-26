# QA / handoff — paquet final consolidation 1.4.5

Date : 2026-03-26  
Repo : `JARVOS_recyclique`  
Branche de travail : `chore/v1.4.5-consolidation`

## Contexte

Les micro-lots a faible risque autour de Telegram, des alignements `telegram_id` / affichage admin, des formulaires auth publics Zod et de la page `/telegram-auth` sont **journalises comme fermes** dans `references/consolidation-1.4.5/2026-03-23_journal-assainissement-1.4.5.md` (lots `2BD`–`2BN`, `FE-TG-03`, `09`, `10`, `12`, etc.).

Ce document fige le **bilan de fin de paquet** : ce qui est clos, ce qui reste executable mais volontairement non pousse ici, et ce qui attend une decision ou un environnement.

## Worktree (2026-03-26)

- `git status` : **clean**
- `git worktree list` : un seul worktree (racine)
- Sync : branche **a jour** avec `origin/chore/v1.4.5-consolidation`

> L'artefact `2026-03-26_02` mentionnait un fichier modifie hors lot (`recyclique-1.4.4/tests/test_admin_pending_endpoints.py`) : l'etat actuel du depot parent est **propre** ; si ce fichier existe encore hors Git ailleurs, ne pas le melanger a un futur commit sans lot dedie.

## Ferme (extrait)

- Neutralisation / elagage Telegram backend et dependances admin associees (`2BD`–`2BH`).
- **Gel contractuel** du dernier endpoint depots avec header `X-Bot-Token` : documente + test OpenAPI cible (`2BI`).
- Alignements `telegram_id` et helpers d'affichage admin front (`2BJ`–`2BN`).
- Cohérence frontend auth / utilisateurs / formulaires publics Zod ; `/telegram-auth` informative sans `link-telegram` (`FE-TG-01` … `FE-TG-12` selon journal).

## Executable mais a risque moyen ou plus (non execute dans ce paquet)

- Greeting / session / header (`Header.jsx`, `AdminLayout.jsx`, `Reception.tsx`) avec le meme pattern que `fullNameOrUsernameOrTelegramFallback`.
- Formulaires `@mantine/form` / `react-hook-form` hors flux Login / Forgot / Reset.
- Migration de tests historiques (ex. Jest → Vitest sur certaines suites).

**Regle :** decouper par fichier / par ecran apres courte carte d'impact.

## Bloque par decision (contrat HTTP / produit)

- **Remplacement de l'auth bot** sur `PUT /deposits/{id}` : le journal enterine de **ne pas retirer** `get_bot_token_dependency` sans contrat d'auth de remplacement. Tant que cette decision n'est pas prise, le chantier **n'est pas au point mort technique** mais **en attente de cadrage produit**.

> Strophe a evoque un libelle « TL-02 » : **aucune occurrence** dans le depot ; on l'assimile ici a ce **bloc decisionnel** (finalisation depot / bot token).

## Bloque par environnement (OpenAPI statique)

- `api/openapi.json` statique : **non regenere** en local faute de variables (`DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`) — reserve deja note dans le journal (lot `2BJ`). Lever des qu'un `.env` ou CI permet d'exporter le schema de facon reproductible.

## Chantier au point mort ?

- **Non** pour la consolidation generale : des lots a risque moyen restent **cartographies** dans le journal.
- **Oui** pour deux sujets **sans action code raisonnable** sans input externe :
  1. Decision auth **post-bot** sur `PUT /deposits/{id}`.
  2. Regeneration **openapi.json** avec env complet.

## Prochaine session recommandee

1. Trancher (ou reporter explicitement) le sort de `X-Bot-Token` / finalisation depot.
2. Regenerer `openapi.json` dans un contexte ou les secrets et URLs sont disponibles ; valider le diff.
3. Ensuite seulement : micro-lot UI session/header ou carte P2B formulaires.
