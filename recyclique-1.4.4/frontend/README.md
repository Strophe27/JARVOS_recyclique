# Frontend RecyClique

Interface web React/Vite pour la plateforme RecyClique.

## Stack actuelle

- `React 18` + `react-router-dom`
- `Vite` pour le dev/build
- `Zustand` pour l'etat applicatif
- `axiosClient` comme client HTTP manuel unique
- `src/generated/` pour le client/type OpenAPI genere
- `@mantine/notifications` comme pile de notifications unique
- hooks live avec helper partage `src/hooks/liveNetworkPolling.ts`

## Demarrage rapide

### Prerequis
- Node.js 18+
- npm ou yarn

### Installation
```bash
npm install
```

### Developpement
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`.

### Build de production
```bash
npm run build
```

## Conventions frontend

- Ne pas modifier manuellement `src/generated/`.
- Pour les services frontend manuels, importer `axiosClient` depuis `src/api/axiosClient`.
- Garder `services/api.ts` comme facade legacy tant qu'un ecran existant en depend.
- Utiliser Mantine Notifications pour les feedbacks utilisateur; `react-hot-toast` n'est plus dans la stack.
- Pour le polling reseau live, reutiliser les helpers de `src/hooks/liveNetworkPolling.ts` avant d'ajouter une nouvelle variante.

## Generation de code API

### Workflow de generation automatique

Ce projet utilise un système de génération automatique de code TypeScript à partir de la spécification OpenAPI du backend. Cela garantit la cohérence des types entre le frontend et le backend.

#### Commandes disponibles

```bash
# Générer les types et l'API TypeScript
npm run codegen
```

#### Workflow de developpement

1. **Modification de l'API backend** : quand l'API backend est modifiee
2. **Generation de la spec OpenAPI** : `npm run codegen` lit actuellement `../openapi.json` (soit `recyclique-1.4.4/openapi.json`)
3. **Generation du code frontend** : executer `npm run codegen`
4. **Utilisation des nouveaux types** : les types et l'API sont automatiquement mis a jour

#### Structure des fichiers generes

```
src/generated/
├── types.ts      # Types TypeScript (interfaces, enums)
├── api.ts        # Client API avec méthodes typées
└── index.ts      # Point d'entrée pour les exports
```

#### Utilisation des types generes

```typescript
// Import des types
import { UserResponse } from '../generated';

// Import d'une classe API générée
import { UsersApi } from '../generated';

// Les noms de méthodes dépendent des operationId OpenAPI.
const api = new UsersApi();
```

#### Avantages

- ✅ **Coherence des types** : les types frontend restent synchronises avec l'API
- ✅ **Reduction des erreurs** : moins de duplication manuelle de contrats
- ✅ **Maintenance simplifiee** : un seul endroit pour definir les contrats d'API
- ✅ **IntelliSense complet** : Autocomplétion et validation TypeScript

## Tests

```bash
# Lancer tous les tests
npm test

# Tests en mode watch
npm run test:ui

# Tests avec couverture
npm run test:coverage

# Tests E2E avec Playwright
npx playwright test
```

## Structure du projet

```
src/
├── components/          # Composants React réutilisables
│   ├── business/        # Composants métier
│   └── ui/             # Composants UI de base
├── pages/              # Pages de l'application
├── services/           # Services API et logique metier
├── stores/             # Stores Zustand pour la gestion d'état
├── hooks/              # Hooks React personnalisés
├── generated/          # Code généré automatiquement (ne pas modifier)
└── utils/              # Utilitaires et helpers
```

## Configuration

### Variables d'environnement

#### `VITE_API_URL` - configuration de l'API backend

La variable `VITE_API_URL` definit l'URL de base pour les appels API. Utiliser un chemin relatif `/api` garantit la compatibilite entre les environnements.

**Configuration recommandée :**

```bash
# .env.development (développement local avec Docker Compose)
VITE_API_URL=/api

# .env.production (production avec Traefik)
VITE_API_URL=/api
```

Important :
- Ne jamais utiliser d'URL absolue comme `http://api:8000` dans le frontend
- Le proxy Vite (developpement) et Traefik (production) redirigent automatiquement `/api` vers le backend
- Les changements de variables d'environnement necessitent un rebuild :

```bash
# Avec Docker Compose
docker compose down
docker compose up -d --build

# En local
npm run dev
```

#### Configuration du proxy Vite

Le fichier `vite.config.js` configure automatiquement le proxy pour rediriger `/api` vers le backend :

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://api:8000',
      changeOrigin: true,
    }
  }
}
```

Cette configuration permet au frontend d'appeler `/api/v1/sites` qui sera automatiquement redirigé vers `http://api:8000/v1/sites` en développement.

### Scripts disponibles

- `npm run dev` - Serveur de développement
- `npm run build` - Build de production
- `npm run test` - Tests unitaires
- `npm run lint` - Linting ESLint
- `npm run codegen` - Generation du client API
- `npm run test:coverage` - Tests avec couverture

## Deploiement

### Docker

```bash
# Build de l'image
docker build -t recyclique-frontend .

# Exécution
docker run -p 3000:3000 recyclique-frontend
```

### Docker Compose

Le frontend est inclus dans le `docker-compose.yml` principal du projet.

## Documentation technique

- [Architecture du Projet](../../docs/architecture.md)
- [Standards de Code](../../docs/coding-standards.md)
- [Guide de Tests](../../docs/testing-strategy.md)

## Contribution

1. Modifier l'API backend si nécessaire
2. Exécuter `npm run codegen` pour synchroniser les types
3. Développer les fonctionnalités frontend
4. Tester avec `npm test`
5. Créer une pull request

## Notes importantes

- Ne jamais modifier manuellement les fichiers dans `src/generated/`
- Toujours executer `npm run codegen` apres les modifications de l'API
- Verifier la compilation avec `npm run build` avant de commiter
- Maintenir la coherence entre les types generes et leur utilisation dans le code
