# Story 19.3: Reception — redirection vers page de saisie apres creation de ticket

Status: done

## Story

As a operateur reception,
I want etre redirige vers la page de saisie du ticket des sa creation,
so that je puisse saisir les lignes immediatement sans navigation manuelle supplementaire.

## Contexte

Actuellement, apres la creation d'un ticket de depot, l'utilisateur reste sur la liste des tickets (`ReceptionAccueilPage`). Il doit manuellement retrouver le ticket et cliquer "Modifier" pour acceder a la saisie des lignes — friction inutile et source d'erreur.

## Acceptance Criteria

1. **Given** un operateur sur la page Reception qui clique "Creer ticket"
   **When** le ticket est cree avec succes (reponse API OK)
   **Then** l'utilisateur est redirige vers `/reception/tickets/{id}` (page detail/saisie du ticket)
   **And** il peut saisir les lignes immediatement sans etape de navigation supplementaire

## Critere de validation terrain

"Strophe cree un ticket de depot et arrive directement sur la page de saisie des lignes."

## Tasks / Subtasks

- [x] Task 1 (AC: #1) — Ajouter `useNavigate` et rediriger dans `handleCreateTicket`
  - [x] Importer `useNavigate` depuis `react-router-dom` dans `ReceptionAccueilPage.tsx`
  - [x] Dans `handleCreateTicket`, appeler `navigate(\`/reception/tickets/${t.id}\`)` apres creation
  - [x] Conserver la gestion d'erreur existante (catch + setError)
- [x] Task 2 (AC: #1) — Test co-loque
  - [x] Test unitaire dans `ReceptionAccueilPage.test.tsx` : verifie que `navigate` est appele avec `/reception/tickets/{id}`
  - [ ] Test manuel terrain : creer un ticket et valider la redirection

## Dependencies

- **19.1** (import categories — correction parent_id sous-categories) : done. Les categories sont disponibles pour saisir des lignes apres redirection.

## Dev Notes

- **Fichier a modifier** : `frontend/src/reception/ReceptionAccueilPage.tsx`
- **Fonction cible** : `handleCreateTicket` (ligne ~162). Actuellement, elle fait `const t = await createTicket(accessToken)` puis met a jour l'etat local (`setTickets`, `setTotalTickets`). Il faut remplacer cette logique par `navigate(\`/reception/tickets/${t.id}\`)`.
- **Route existante et confirmee** : `/reception/tickets/:ticketId` (App.tsx, ligne 154), rendue par `ReceptionTicketDetailPage`. Le parametre URL est `ticketId` (pas `id`).
- **Page cible fonctionnelle** : `ReceptionTicketDetailPage.tsx` charge le ticket via `getTicket(accessToken, ticketId)` et affiche le formulaire d'ajout de lignes — rien a changer cote cible.
- **Import actuel** : `import { Link } from 'react-router-dom'` → ajouter `useNavigate` a cet import.
- **Pattern** : `const navigate = useNavigate();` en haut du composant, puis `navigate(\`/reception/tickets/${t.id}\`)` dans le try du handler.
- Le lien "Modifier" dans la liste des tickets utilise deja `/reception/tickets/${t.id}` (ligne ~392), coherent avec la redirection.
- **Ne pas** supprimer la mise a jour d'etat dans le cas ou poste n'existe pas (`else` branch) — la redirection doit se faire dans tous les cas de succes.

### Project Structure Notes

- Frontend : `frontend/src/reception/` — composants reception
- Tests : co-loces `*.test.tsx` (Vitest + RTL)
- Routeur : `frontend/src/App.tsx`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 19.3, lignes 2643-2662]
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml]

## Dev Agent Record

### Agent Model Used

claude-4.6-opus (bmad-dev)

### Debug Log References

N/A

### Completion Notes List

- Ajout de `useNavigate` depuis `react-router-dom` dans `ReceptionAccueilPage.tsx`
- `handleCreateTicket` redirige maintenant vers `/reception/tickets/${t.id}` apres creation reussie au lieu de mettre a jour l'etat local (setTickets, setTotalTickets, setPoste)
- La gestion d'erreur existante (catch + setError) est conservee intacte
- Test unitaire ajoute : mock `useNavigate`, verifie que `navigate` est appele avec le bon chemin apres clic "Creer ticket"
- 11/11 tests passent

### File List

- `frontend/src/reception/ReceptionAccueilPage.tsx` (modifie)
- `frontend/src/reception/ReceptionAccueilPage.test.tsx` (modifie)

## Senior Developer Review (AI)

**Reviewer:** QA BMAD (claude-4.6-opus) — 2026-03-16
**Result:** APPROVED

### AC Cross-check
- AC #1: IMPLEMENTED — useNavigate + navigate() dans handleCreateTicket, route coherente avec App.tsx et liens existants.

### Findings (3 LOW, 0 HIGH, 0 MEDIUM)
1. [LOW] `setLoading(false)` apres `navigate()` — inoffensif React 18+, pas de changement requis.
2. [LOW] Pas de test erreur `createTicket` — pattern preexistant, hors scope AC.
3. [LOW] Test manuel terrain non coche — attendu, non bloquant.
