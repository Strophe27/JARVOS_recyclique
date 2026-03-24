# Audit frontend — coherence technique (base active 1.4.4)

**Date:** 2026-03-23  
**Perimetre:** React Query, clients HTTP, formulaires, polling, dependances, legacy.  
**Base de reference:** application frontend sous `recyclique-1.4.4/`.

---

## Contexte

Ce rapport regroupe les duplications de patterns (donnees serveur, appels reseau, formulaires, notifications) et les ecarts de configuration (`package.json`, outillage).

---

## Findings par severite

### Eleve

- **`QueryClientProvider` monte sans usage apparent de `useQuery` / `useMutation`:** complexite sans benefice ou migration inachevee.
- **Couche API en triple piste:** `axiosClient`, `services/api.ts`, services dedies, `generated/api.ts` — regles d'import imprevisibles.
- **Duplication categories** (aligne audit architecture services).
- **Mix UI fort Mantine / styled + deux systemes de notifications** (aligne audit architecture).
- **Trois styles de formulaires:** Mantine Form, `react-hook-form`, et state React brut — validation et UX incoherentes.
- **Hooks de polling / live stats proches et dupliques** — risque de requetes multiples et logique divergente.
- **`useAuth` legacy encore present.**

### Moyen

- **`package.json` herite `react-app` alors que Vite** — scripts ou outils potentiellement obsoletes / confus.
- **Playwright en `dependencies` plutot que `devDependencies`** (si constat confirme sur le fichier).
- **`typescript` non explicite** dans les dependances (resolution transitive fragile).
- **Dependances possiblement sous-utilisees:** `zod`, `react-resizable-panels` — bruit et surface de mise a jour.

### Bas

- Aucun constat supplementaire au-dela de la liste fournie pour ce theme.

---

## Fichiers et zones concernes (indicatif)

- Point d'entree app / providers (ou `main.tsx` / `index.tsx`) ou `App.jsx`
- `axiosClient` (module dedie)
- `services/api.ts`
- `generated/api.ts` (client OpenAPI ou similaire)
- Services categories et hooks de stats / polling
- Composants formulaires utilisant Mantine, RHF ou state local
- `package.json`, `vite.config.*`

---

## Recommandations (ordonnees)

1. **Decider du role de React Query:** l'utiliser de facon coherente ou retirer `QueryClientProvider` et dependances associees.
2. **Definir une regle unique pour les appels HTTP:** client genere OU axios wrapper + services, avec chemin d'import documente.
3. **Unifier les retours utilisateur:** un systeme de notifications (Mantine ou toast, pas les deux sans strategie).
4. **Factoriser le polling / live stats:** hook unique parametre ou source de verite partagee.
5. **Documenter le perimetre UI / design** (Mantine vs styled-components: quand utiliser l'un ou l'autre).
6. **Nettoyer dependances et config:** aligner `package.json` sur Vite; deplacer Playwright en dev; ajouter `typescript` explicitement si le projet est en TS.
7. **Traiter le legacy `useAuth`:** suppression ou facade unique (coordonne avec l'audit auth / permissions).

---

## Limites de ce document

L'absence d'usage de React Query est un constat fonctionnel a reverifier par recherche dans le codebase au moment de la consolidation.
