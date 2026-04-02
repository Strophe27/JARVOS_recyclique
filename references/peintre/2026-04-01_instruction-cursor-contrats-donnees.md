# Instruction Cursor — Contrats de données widgets, OpenAPI et états de données

**Date :** 2026-04-01  
**Destination :** Agents BMAD Cursor (architecture, epics, implémentation)  
**Complément de :** `references/peintre/2026-04-01_instruction-cursor-p1-p2.md` (stack CSS) et `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md`  
**Source d'autorité :** Session co-architecte Claude Opus 2026-04-01, alignée sur le pipeline `references/peintre/2026-04-01_pipeline-presentation-workflow-invariants.md` §2 (hiérarchie de vérité) et le concept `references/vision-projet/2026-03-31_peintre-nano-concept-architectural.md`

---

## Contexte et problème résolu

Les documents de cadrage Peintre couvrent parfaitement la **structure UI** (manifests, slots, widgets, flows), la **gouvernance** (permissions, contexte, sécurité, fallbacks) et le **styling** (ADR P1/P2). Mais ils ne spécifient pas encore comment les widgets **reçoivent leurs données métier** depuis le backend RecyClique.

Ce document pose les **trois conventions manquantes** pour que les deux pistes de développement (Peintre_nano côté frontend / RecyClique backend) convergent proprement au moment de l'intégration (jalon bandeau live).

**Règle :** ces conventions s'appliquent dès Phase 0. Elles sont conçues pour rester valides en Phase 1–3 (SDUI, agent). Elles ne contredisent aucun document de cadrage existant — elles **complètent** les manifests CREOS et la hiérarchie de vérité du pipeline §2.

**Note d'extension :** le champ `data_contract` introduit ci-dessous est une **extension** du schéma `WidgetDeclaration` CREOS, introduite par cette instruction. Il n'existe pas dans le PRD initial ni dans le concept architectural du 2026-03-31. L'agent BMAD doit le propager dans `contracts/creos/schemas/widget-declaration.schema.json` lors de la prochaine mise à jour de ce schéma.

**Chemins dans les exemples de code :** les commentaires du type `// src/peintre-nano/...` ou imports `../../peintre-nano/...` sont **indicatifs**. Le répertoire réel du package est **`peintre-nano/`** à la racine du dépôt ; mapper vers `peintre-nano/src/...` selon `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`.

---

## 1. Convention 1 — `data_contract` dans les manifests widgets

### Principe

Chaque widget qui consomme des données métier déclare un **`data_contract`** dans son manifest. Ce contrat dit : quel domaine métier nourrit ce widget, via quel endpoint, avec quel mapping de paramètres, et quelle stratégie de rafraîchissement.

En Phase 0, le `data_contract` est **documentaire et structurant** : le développeur le lit pour savoir quel hook écrire. En Phase 2+ (Peintre_mini), l'agent IA le lit pour savoir quelles données un widget a besoin avant de le placer dans un slot.

### Champ `data_contract` — structure

```typescript
interface WidgetDataContract {
  /** Domaine métier source — correspond à un groupe d'endpoints dans l'OpenAPI */
  source: string;
  
  /** Identifiant d'opération dans l'OpenAPI (ex: getMemberById). Consommé par le code. */
  operation_id: string;
  
  /** Chemin REST indicatif pour la lisibilité humaine — NON consommé par le code */
  endpoint_hint: string;
  
  /** Mapping : quelle prop du widget fournit quel paramètre à l'endpoint */
  params_from_props?: Record<string, string>;
  
  /** Mapping : quels champs du ContextEnvelope fournissent des paramètres implicites */
  params_from_context?: Record<string, string>;
  
  /** Stratégie de rafraîchissement */
  refresh: 'on_mount' | 'polling' | 'realtime' | 'manual';
  
  /** Intervalle de polling en secondes (uniquement si refresh = 'polling') */
  polling_interval_s?: number;
  
  /** Si true, l'état 'stale' bloque les actions sensibles (caisse, clôture, paiement) */
  critical?: boolean;
  
  /** Endpoint secondaire optionnel (ex: lookup de référence) */
  secondary_sources?: Array<{
    source: string;
    operation_id: string;
    endpoint_hint: string;
    params_from_props?: Record<string, string>;
    params_from_context?: Record<string, string>;
  }>;
}
```

### Exemples concrets RecyClique

#### Exemple 1 — Carte résumé adhérent (donnée unitaire)

```json
{
  "type": "member.summary.card",
  "component": "MemberSummaryCard",
  "meta_props": {
    "default_span": { "col": 4, "row": 1 },
    "prominence": "normal",
    "variants": ["compact", "regular", "expanded"],
    "default_variant": "regular"
  },
  "props_schema": {
    "type": "object",
    "properties": {
      "member_id": { "type": "string" },
      "show_photo": { "type": "boolean", "default": true }
    },
    "required": ["member_id"]
  },
  "data_contract": {
    "source": "recyclique.members",
    "operation_id": "getMemberById",
    "endpoint_hint": "/api/members/:member_id",
    "params_from_props": {
      "member_id": "member_id"
    },
    "refresh": "on_mount"
  }
}
```

**Lecture :** ce widget a besoin d'un adhérent identifié par `member_id`. Le développeur écrira un hook `useMember(member_id)` qui appelle l'opération `getMemberById` via le client API. Les données sont chargées au montage du composant, pas en polling.

#### Exemple 2 — Bandeau live (données en temps réel, pas de prop d'entrée)

```json
{
  "type": "live.banner.stats",
  "component": "LiveBannerStats",
  "meta_props": {
    "default_span": { "col": "full", "row": 1 },
    "prominence": "high",
    "density": "low"
  },
  "props_schema": {
    "type": "object",
    "properties": {
      "display_mode": {
        "type": "string",
        "enum": ["compact", "full", "ticker"],
        "default": "full"
      }
    }
  },
  "data_contract": {
    "source": "recyclique.stats.live",
    "operation_id": "getLiveStats",
    "endpoint_hint": "/api/stats/live",
    "params_from_context": {
      "site_id": "site"
    },
    "refresh": "polling",
    "polling_interval_s": 30
  }
}
```

**Lecture :** ce widget n'a pas besoin de prop d'entrée pour ses données — il se nourrit du contexte ambiant (`site` depuis le `ContextEnvelope`). Il poll toutes les 30 secondes. Le développeur écrira un hook `useLiveStats(site_id, { pollingInterval: 30_000 })`.

#### Exemple 3 — Ticket de caisse (données en session + sources multiples)

```json
{
  "type": "cashdesk.ticket.current",
  "component": "CurrentTicket",
  "meta_props": {
    "default_span": { "col": 6, "row": "full" },
    "prominence": "high",
    "density": "high"
  },
  "props_schema": {
    "type": "object",
    "properties": {
      "session_id": { "type": "string" }
    },
    "required": ["session_id"]
  },
  "data_contract": {
    "source": "recyclique.cashdesk",
    "operation_id": "getCurrentTicket",
    "endpoint_hint": "/api/cashdesk/sessions/:session_id/current-ticket",
    "params_from_props": {
      "session_id": "session_id"
    },
    "refresh": "realtime",
    "critical": true,
    "secondary_sources": [
      {
        "source": "recyclique.inventory",
        "operation_id": "lookupInventoryItems",
        "endpoint_hint": "/api/inventory/items/lookup",
        "params_from_props": {}
      },
      {
        "source": "recyclique.pricing",
        "operation_id": "getActivePricingGrid",
        "endpoint_hint": "/api/pricing/grids/active",
        "params_from_context": {
          "site_id": "site"
        }
      }
    ]
  }
}
```

**Lecture :** le ticket de caisse est le widget le plus exigeant — il a besoin de la session de caisse en temps réel (chaque scan/ajout met à jour le ticket), plus un lookup inventaire pour identifier les articles et la grille tarifaire active du site. Trois sources de données, une en realtime, deux en on_mount (ou cache). Le développeur écrira un hook `useCashSession(session_id)` qui gère le realtime, un `useInventoryLookup()` et un `usePricingGrid(site_id)`.

#### Exemple 4 — Compteur du dashboard (donnée agrégée depuis le contexte)

```json
{
  "type": "stats.counter.card",
  "component": "StatsCounterCard",
  "meta_props": {
    "default_span": { "col": 3, "row": 1 },
    "prominence": "secondary",
    "density": "low",
    "variants": ["compact", "regular"]
  },
  "props_schema": {
    "type": "object",
    "properties": {
      "metric": {
        "type": "string",
        "enum": ["members_active", "items_in_stock", "sales_today", "collections_month"]
      },
      "period": { "type": "string", "default": "today" }
    },
    "required": ["metric"]
  },
  "data_contract": {
    "source": "recyclique.stats",
    "operation_id": "getStatsCounter",
    "endpoint_hint": "/api/stats/counters/:metric",
    "params_from_props": {
      "metric": "metric"
    },
    "params_from_context": {
      "site_id": "site",
      "period": "period"
    },
    "refresh": "polling",
    "polling_interval_s": 60
  }
}
```

**Lecture :** les cartes de compteur du dashboard se nourrissent d'un endpoint générique de stats par métrique. Le `period` peut venir des props OU du contexte (le slot du dashboard transmet `period`). Polling doux toutes les 60 secondes.

#### Exemple 5 — Widget sans données métier (pur UI)

```json
{
  "type": "shell.nav.item",
  "component": "NavItem",
  "props_schema": {
    "type": "object",
    "properties": {
      "label": { "type": "string" },
      "icon": { "type": "string" },
      "route": { "type": "string" },
      "badge_count": { "type": "integer" }
    },
    "required": ["label", "route"]
  }
}
```

**Lecture :** pas de `data_contract` — ce widget est purement UI, il reçoit tout par ses props (injectées par le manifest ou par le slot context). C'est parfaitement valide. Un widget qui n'a pas de `data_contract` ne fait aucun appel API.

#### Exemple 6 — État de sync comptable (double flux)

```json
{
  "type": "sync.accounting.status",
  "component": "AccountingSyncStatus",
  "meta_props": {
    "default_span": { "col": 2, "row": 1 },
    "prominence": "secondary",
    "density": "low"
  },
  "props_schema": {
    "type": "object",
    "properties": {
      "show_details": { "type": "boolean", "default": false }
    }
  },
  "data_contract": {
    "source": "recyclique.sync",
    "operation_id": "getAccountingSyncStatus",
    "endpoint_hint": "/api/sync/accounting/status",
    "params_from_context": {
      "site_id": "site"
    },
    "refresh": "polling",
    "polling_interval_s": 120
  }
}
```

**Lecture :** ce widget expose l'état de synchronisation entre RecyClique (vérité matière) et le système comptable (vérité financière). Il ne touche **jamais** directement l'API comptable — il interroge le backend RecyClique qui gère la zone tampon et le statut de sync. Que le système comptable soit Paheko, Odoo ou autre est un **détail d'implémentation backend** invisible pour Peintre. C'est conforme à la Décision Directrice : RecyClique porte la zone tampon, le système comptable porte la vérité financière, le frontend ne connaît que RecyClique.

### Règles du `data_contract`

1. **Le `data_contract` est optionnel.** Un widget purement UI (nav item, séparateur, badge statique) n'en a pas.
2. **Le `source` correspond à un namespace dans l'OpenAPI.** C'est un groupement logique, pas un endpoint unique. Convention : `recyclique.{domaine}` (ex: `recyclique.members`, `recyclique.cashdesk`, `recyclique.stats`, `recyclique.sync`).
3. **L'`operation_id` correspond à un operationId dans le fichier OpenAPI.** C'est l'identifiant stable consommé par le code. Le `endpoint_hint` est documentaire (lisibilité humaine) — il n'est pas consommé par le client API. Si le path change côté backend, seul le fichier OpenAPI change, pas les manifests.
4. **`params_from_props`** mappe les props du widget vers les paramètres de l'endpoint. La clé est le nom du paramètre endpoint, la valeur est le nom de la prop widget.
5. **`params_from_context`** mappe les champs du `ContextEnvelope` vers les paramètres de l'endpoint. Ça permet aux widgets de se nourrir du contexte ambiant (site, caisse, session) sans prop explicite.
6. **Le `refresh` détermine la stratégie de rafraîchissement :**
   - `on_mount` : chargé une fois au montage, pas de refresh automatique (fiches, détails).
   - `polling` : rechargé à intervalle régulier (stats, compteurs, statuts).
   - `realtime` : mis à jour en temps réel (caisse, parcours actif). Phase 0 : polling rapide acceptable comme approximation ; Phase 2+ : WebSocket ou SSE.
   - `manual` : rechargé uniquement sur action utilisateur (recherche, filtres).
7. **`critical: true`** marque un widget dont les données doivent être fraîches pour autoriser des actions sensibles (paiement, clôture, validation comptable). Si un widget `critical` est en état `stale`, les **actions sensibles** (boutons de validation, paiement) sont **bloquées** jusqu'au retour en état `loaded`. Conforme à la ligne "la sécurité gagne" de la matrice PRD §10.1.
8. **Le frontend ne connaît que RecyClique.** Aucun `data_contract` ne pointe vers un système comptable, vers une API tierce, ou vers un bus CREOS directement. Le backend RecyClique est le seul interlocuteur. C'est le backend qui orchestre la sync comptable, les API externes, etc.
9. **Le `data_contract` ne contient jamais de token, de header d'auth, ni de configuration réseau.** L'authentification est gérée par le client API centralisé (voir section 2).

---

## 2. Convention 2 — Structure OpenAPI et client typé

### Arborescence repo

```
contracts/
  openapi/
    recyclique-api.yaml           ← Source de vérité de l'API backend
                                     (produit par Piste B / audit backend)
                                     Contient tous les endpoints, schémas de réponse,
                                     codes d'erreur, pagination, auth
  creos/
    manifests/                    ← Manifests CREOS Peintre (produit par Piste A)
      recyclique.membership.json
      recyclique.cashdesk.json
      recyclique.inventory.json
      recyclique.bandeau.json
      ...
    schemas/                      ← JSON Schemas des types CREOS
      module-manifest.schema.json
      widget-declaration.schema.json
      flow-definition.schema.json
      ...
    vocabulary/                   ← Registre vocabulaire CREOS
      commands.yaml
      events.yaml
      states.yaml
      objects.yaml

src/
  api/
    client.ts                     ← Client API centralisé (généré ou écrit)
    types.ts                      ← Types TypeScript des réponses (générés depuis OpenAPI)
  hooks/
    data/
      useMember.ts                ← Hook domaine : adhérents
      useMemberList.ts
      useCashSession.ts           ← Hook domaine : caisse
      useInventoryLookup.ts       ← Hook domaine : inventaire
      useLiveStats.ts             ← Hook domaine : stats live
      useAccountingSyncStatus.ts  ← Hook domaine : sync comptable
      useStatsCounter.ts          ← Hook domaine : compteurs dashboard
      ...
    ui/
      useWidgetData.ts            ← Hook générique WidgetDataState (voir section 3)
```

### Client API centralisé

**Règle absolue :** aucun composant, hook ou service ne fait de `fetch()` ou `axios.get()` directement vers une URL en dur. Tout passe par le client API centralisé.

```typescript
// src/api/client.ts

import type { paths } from './types'; // Généré depuis OpenAPI

/**
 * Client API centralisé RecyClique.
 * 
 * - Gère l'authentification (token, refresh)
 * - Gère les headers communs (Content-Type, Accept, X-Site-Id, X-Correlation-Id)
 * - Gère les erreurs réseau (retry, timeout)
 * - Gère le base URL selon l'environnement
 * - Fournit des méthodes typées par endpoint
 * 
 * En Phase 0 : peut être un wrapper simple autour de fetch.
 * En Phase 1+ : peut être remplacé par un client généré (openapi-typescript-fetch, orval, etc.)
 */

interface ApiClientConfig {
  baseUrl: string;
  getAuthToken: () => string | null;
  getSiteId: () => string | null;
  onAuthError: () => void;             // Redirige vers login
  onNetworkError: (error: Error) => void;
  correlationId?: () => string;         // Pour traçabilité (PRD §4.2)
}

class RecycliqueApiClient {
  constructor(private config: ApiClientConfig) {}

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(path, params);
    const response = await fetch(url, {
      headers: this.buildHeaders(),
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const url = this.buildUrl(path);
    const response = await fetch(url, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }

  // ... put, delete, patch

  private buildHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    const token = this.config.getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const siteId = this.config.getSiteId();
    if (siteId) headers['X-Site-Id'] = siteId;
    const correlationId = this.config.correlationId?.();
    if (correlationId) headers['X-Correlation-Id'] = correlationId;
    return headers;
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    let url = `${this.config.baseUrl}${path}`;
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url = url.replace(`:${key}`, encodeURIComponent(value));
      }
    }
    return url;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      this.config.onAuthError();
      throw new ApiError('AUTH_ERROR', 'Session expirée', 401);
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new ApiError(
        body.code || 'UNKNOWN_ERROR',
        body.message || response.statusText,
        response.status,
        body.details
      );
    }
    return response.json();
  }
}

/** Erreur API structurée — exploitable par les widgets pour afficher le bon fallback */
class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Singleton — initialisé au démarrage de l'app
export const apiClient = new RecycliqueApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  getAuthToken: () => sessionStorage.getItem('auth_token'),
  getSiteId: () => /* depuis ContextEnvelope */ null,
  onAuthError: () => { window.location.href = '/login'; },
  onNetworkError: (error) => { console.error('[API]', error); },
});
```

**Note mono-site :** le client API est scopé à **un site à la fois**. Le passage d'un site à un autre (sélecteur de site) reconstruit le `ContextEnvelope` entièrement et réinitialise l'état des widgets. Pas de requêtes multi-sites implicites. Le cas super-admin multi-sites est hors scope V2.

### Hook de domaine — exemple complet `useMember`

```typescript
// src/hooks/data/useMember.ts

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/client';
import type { WidgetDataState } from '../ui/useWidgetData';
import type { Member } from '../../api/types';

/**
 * Hook de domaine : récupère un adhérent par ID.
 * 
 * Correspond au data_contract :
 *   source: "recyclique.members"
 *   endpoint: "/api/members/:member_id"
 *   refresh: "on_mount"
 */
export function useMember(memberId: string | null): WidgetDataState<Member> {
  const [state, setState] = useState<WidgetDataState<Member>>({
    status: memberId ? 'loading' : 'empty',
    data: null,
    error: null,
    lastUpdated: null,
    retry: () => {},
  });

  const fetchMember = useCallback(async () => {
    if (!memberId) {
      setState(prev => ({ ...prev, status: 'empty', data: null, error: null }));
      return;
    }
    setState(prev => ({ ...prev, status: prev.data ? 'stale' : 'loading', error: null }));
    try {
      const member = await apiClient.get<Member>('/api/members/:member_id', {
        member_id: memberId,
      });
      setState({
        status: 'loaded',
        data: member,
        error: null,
        lastUpdated: Date.now(),
        retry: fetchMember,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error : new Error(String(error)),
        retry: fetchMember,
      }));
    }
  }, [memberId]);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  return state;
}
```

### Hook de domaine — exemple avec polling `useLiveStats`

```typescript
// src/hooks/data/useLiveStats.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../../api/client';
import type { WidgetDataState } from '../ui/useWidgetData';
import type { LiveStats } from '../../api/types';

/**
 * Hook de domaine : stats live du site.
 * 
 * Correspond au data_contract :
 *   source: "recyclique.stats.live"
 *   endpoint: "/api/stats/live"
 *   params_from_context: { site_id: "site" }
 *   refresh: "polling"
 *   polling_interval_s: 30
 */
export function useLiveStats(
  siteId: string | null,
  options: { pollingIntervalMs?: number } = {}
): WidgetDataState<LiveStats> {
  const { pollingIntervalMs = 30_000 } = options;
  const [state, setState] = useState<WidgetDataState<LiveStats>>({
    status: siteId ? 'loading' : 'empty',
    data: null,
    error: null,
    lastUpdated: null,
    retry: () => {},
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStats = useCallback(async () => {
    if (!siteId) {
      setState(prev => ({ ...prev, status: 'empty', data: null }));
      return;
    }
    // Ne pas remettre en "loading" si on a déjà des données (polling = stale puis loaded)
    setState(prev => ({
      ...prev,
      status: prev.data ? 'stale' : 'loading',
      error: null,
    }));
    try {
      const stats = await apiClient.get<LiveStats>('/api/stats/live', {
        site_id: siteId,
      });
      setState({
        status: 'loaded',
        data: stats,
        error: null,
        lastUpdated: Date.now(),
        retry: fetchStats,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: prev.data ? 'stale' : 'error', // Si on avait des données, on reste stale
        error: error instanceof Error ? error : new Error(String(error)),
        retry: fetchStats,
      }));
    }
  }, [siteId]);

  useEffect(() => {
    fetchStats();
    if (pollingIntervalMs > 0) {
      intervalRef.current = setInterval(fetchStats, pollingIntervalMs);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchStats, pollingIntervalMs]);

  return state;
}
```

### Règles OpenAPI / client API

1. **Un seul fichier OpenAPI** pour tout le backend RecyClique. Pas un fichier par module.
2. **Les endpoints sont groupés par domaine** via des tags OpenAPI (`members`, `cashdesk`, `inventory`, `stats`, `sync`, `admin`). Les `source` des `data_contract` correspondent à ces tags.
3. **Le codegen TypeScript est optionnel en Phase 0** — on peut écrire les types à la main si l'audit backend n'a pas encore produit le fichier OpenAPI. Mais les types doivent **toujours** vivre dans `src/api/types.ts` et être importés, jamais inline dans les hooks.
4. **Le client API est un singleton** initialisé au démarrage de l'application. Tous les hooks le consomment. Pas de `fetch()` sauvage.
5. **Le `X-Correlation-Id`** est transmis dans chaque requête pour la traçabilité (PRD §4.2, chaîne d'audit). En Phase 0 : un UUID par requête suffit. En Phase 2+ : corrélation avec les Sagas CREOS.
6. **Le `X-Site-Id`** est transmis depuis le `ContextEnvelope`. Le backend l'utilise pour filtrer les données. Le frontend ne construit jamais de requête multi-sites.

---

## 3. Convention 3 — `WidgetDataState` et gestion des états de données

### L'interface

```typescript
// src/hooks/ui/useWidgetData.ts

/**
 * État de données universel pour tous les widgets Peintre_nano.
 * 
 * Tout widget qui consomme des données métier (qui a un data_contract)
 * reçoit ses données via un hook de domaine qui retourne cette interface.
 * 
 * Le composant widget rend selon le `status` :
 *   - 'loading'  → skeleton ou spinner
 *   - 'loaded'   → rendu normal
 *   - 'error'    → fallback erreur + bouton retry
 *   - 'empty'    → état vide explicite
 *   - 'stale'    → données affichées + indicateur "rafraîchissement en cours"
 */
export interface WidgetDataState<T> {
  status: 'loading' | 'loaded' | 'error' | 'empty' | 'stale';
  data: T | null;
  error: Error | null;
  lastUpdated: number | null;
  retry: () => void;
}
```

### Vocabulaire CREOS — extension States

Ces états s'ajoutent au vocabulaire CREOS existant (qui contient déjà `ACTIVE`, `INACTIVE`, `ERROR`, `STEP:{step_id}` pour les modules et flows) :

| State | Domaine | Description |
|-------|---------|-------------|
| `DATA_LOADING` | Widget | Données en cours de chargement, pas encore disponibles |
| `DATA_LOADED` | Widget | Données reçues et valides |
| `DATA_ERROR` | Widget | Erreur de chargement (réseau, auth, serveur) |
| `DATA_EMPTY` | Widget | Requête réussie mais aucune donnée (résultat vide) |
| `DATA_STALE` | Widget | Données affichées mais un rafraîchissement est en cours ou a échoué |

### Rendu par état — convention de composant

Chaque widget qui a un `data_contract` **doit** gérer les cinq états. Voici le pattern standard :

```tsx
// Exemple : MemberSummaryCard.tsx

import styles from './MemberSummaryCard.module.css';
import { useMember } from '../../hooks/data/useMember';
import { WidgetSkeleton } from '../../peintre-nano/fallbacks/WidgetSkeleton';
import { WidgetError } from '../../peintre-nano/fallbacks/WidgetError';
import { WidgetEmpty } from '../../peintre-nano/fallbacks/WidgetEmpty';

interface MemberSummaryCardProps {
  member_id: string;
  show_photo?: boolean;
}

export function MemberSummaryCard({ member_id, show_photo = true }: MemberSummaryCardProps) {
  const { status, data: member, error, retry, lastUpdated } = useMember(member_id);

  // --- État loading → skeleton ---
  if (status === 'loading') {
    return <WidgetSkeleton variant="card" />;
  }

  // --- État error → fallback avec retry ---
  if (status === 'error') {
    return (
      <WidgetError
        message="Impossible de charger l'adhérent"
        error={error}
        onRetry={retry}
      />
    );
  }

  // --- État empty → message explicite ---
  if (status === 'empty' || !member) {
    return <WidgetEmpty message="Adhérent non trouvé" />;
  }

  // --- État loaded ou stale → rendu normal ---
  return (
    <div className={styles.root} data-stale={status === 'stale' || undefined}>
      <div className={styles.header}>
        {show_photo && member.photo_url && (
          <img className={styles.photo} src={member.photo_url} alt="" />
        )}
        <span className={styles.name}>{member.display_name}</span>
        <span className={styles.badge}>{member.membership_status}</span>
      </div>
      <div className={styles.details}>
        <span>Adhésion : {member.membership_type}</span>
        <span>Depuis : {formatDate(member.joined_at)}</span>
      </div>
      {status === 'stale' && (
        <div className={styles.staleIndicator}>Mise à jour en cours…</div>
      )}
    </div>
  );
}
```

### Composants fallback fournis par Peintre_nano

Le framework Peintre_nano fournit **trois composants fallback réutilisables** que tous les widgets consomment :

```typescript
// src/peintre-nano/fallbacks/WidgetSkeleton.tsx
interface WidgetSkeletonProps {
  variant: 'card' | 'row' | 'chart' | 'banner' | 'form';
}

// src/peintre-nano/fallbacks/WidgetError.tsx
interface WidgetErrorProps {
  message: string;           // Message humain
  error: Error | null;       // Détail technique (loggé, pas affiché par défaut)
  onRetry: () => void;       // Callback retry
  severity?: 'warning' | 'error' | 'critical';
}

// src/peintre-nano/fallbacks/WidgetEmpty.tsx
interface WidgetEmptyProps {
  message: string;           // "Aucun adhérent trouvé"
  action?: {                 // CTA optionnel
    label: string;           // "Créer un adhérent"
    commandId: string;       // "members.create" → même catalogue de commandes
  };
}
```

Ces composants utilisent CSS Modules + design tokens (conformément à l'ADR P1). Ils sont stylés de manière cohérente avec le reste du shell. Ils sont les **seuls** composants fallback autorisés — pas de `<div>Erreur</div>` improvisé dans un widget.

### Gestion du `stale` — indicateur visuel

L'état `stale` mérite une attention particulière. Un widget est stale quand il affiche des données **périmées** — soit parce qu'un polling est en cours, soit parce qu'un polling a échoué mais qu'on avait des données précédentes.

Convention CSS :

```css
/* Dans tokens.css */
:root {
  --stale-opacity: 0.7;
  --stale-indicator-color: var(--color-warning);
}
```

```css
/* Dans le .module.css du widget */
.root[data-stale] {
  opacity: var(--stale-opacity);
}

.staleIndicator {
  font-size: var(--font-size-sm);
  color: var(--stale-indicator-color);
}
```

Le `data-stale` est un attribut HTML (pas une classe) pour permettre au Slot de détecter l'état sans connaître le CSS interne du widget. En Phase 2+ (Peintre_mini), l'agent pourra raisonner sur l'attribut `data-stale` pour décider de retirer un widget stale ou de le remplacer.

### Le `<Slot>` et les skeletons automatiques

Le composant `<Slot>` de Peintre_nano peut fournir un **skeleton automatique** pendant le chargement initial de ses contributions, **avant même que les widgets soient montés** :

```tsx
<Slot 
  name="shell.dashboard.cards" 
  context={{ period: "month", site_id: currentSiteId }}
  loadingSkeleton={<DashboardCardsSkeleton count={3} />}
  errorFallback={<SlotErrorBoundary />}
/>
```

C'est un niveau de fallback **supplémentaire** au-dessus du fallback par widget. L'ordre de résolution est :

1. **Slot en chargement** (les manifests ne sont pas encore résolus) → `loadingSkeleton` du Slot
2. **Widget en chargement** (le manifeste est résolu, le composant est monté, les données arrivent) → `<WidgetSkeleton>` dans le widget
3. **Widget en erreur data** → `<WidgetError>` dans le widget
4. **Widget non rendable** (composant inconnu, import échoué) → fallback du `<Slot>` (matrice PRD §10.1)
5. **Module entier en erreur** → isolation, reste de l'écran intact (matrice PRD §10.1)

---

## 4. ContextEnvelope — rappel et convention de transmission

Le `ContextEnvelope` (pipeline §2, position 2 dans la hiérarchie) est la source de vérité pour le contexte ambiant. Les widgets y accèdent via les props de contexte transmises par les Slots, **jamais** en lisant directement un store global.

```typescript
// src/peintre-nano/context/ContextEnvelope.ts

/**
 * Contexte applicatif actif.
 * 
 * Injecté au niveau du shell, transmis aux Slots via les props de contexte.
 * Les widgets ne lisent jamais le ContextEnvelope directement — ils reçoivent
 * les champs pertinents via le Slot context (ex: site_id, period).
 * 
 * Le ContextEnvelope est la source de vérité pour :
 *   - Quel site est actif
 *   - Quelle caisse est active (si applicable)
 *   - Quelle session est en cours
 *   - Quel poste de réception (si applicable)
 *   - Quel rôle / permissions de l'utilisateur courant
 *   - Si un PIN ou step-up est requis pour certaines actions
 * 
 * Si le contexte est ambigu ou incomplet : mode restreint/dégradé explicite,
 * pas de supposition silencieuse (Décision Directrice, pipeline §2, PRD §10.1).
 */
export interface ContextEnvelope {
  /** Site actif (ressourcerie) */
  site: {
    id: string;
    name: string;
    timezone: string;
  } | null;

  /** Caisse active (si en contexte caisse) */
  cashdesk: {
    id: string;
    name: string;
    session_id: string | null;
  } | null;

  /** Session utilisateur */
  session: {
    user_id: string;
    display_name: string;
    role: string;
    permissions: string[];
    requires_pin_for: string[];   // Actions nécessitant un PIN (PRD §10.1)
  };

  /** Poste de réception (si en contexte réception) */
  reception_station: {
    id: string;
    name: string;
  } | null;

  /** État de la synchronisation comptable (Paheko ou autre — détail backend) */
  accounting_sync: {
    status: 'ok' | 'pending' | 'error' | 'unknown';
    last_sync_at: string | null;
  };

  /** Timestamp de construction du contexte (pour détection de péremption) */
  built_at: number;
}

/**
 * Durée maximale de validité du ContextEnvelope (en ms).
 * Au-delà, le shell force un rechargement avant d'autoriser des actions métier.
 * Valeur Phase 0 : 5 minutes. Ajustable par configuration.
 */
export const MAX_CONTEXT_AGE_MS = 5 * 60 * 1000;
```

**Alignement champ temporel (`built_at` / `issuedAt`) :** dans ce document et les checklists, `built_at` désigne l’horodatage d’émission de l’enveloppe de contexte. Dans le code **`peintre-nano`** (stub Piste A), le champ correspondant est **`issuedAt`** sur `ContextEnvelopeStub` (`src/types/context-envelope.ts`) et dans `context-envelope-freshness.ts`. À l’unification OpenAPI, viser **un seul nom** canonique côté contrat généré ; jusqu’alors traiter les deux noms comme **équivalents sémantiques**.

**Règle d'or :** si `site` est `null`, l'application est en mode restreint — le shell s'affiche mais aucun widget métier ne rend de données. Le slot affiche un état explicite ("Sélectionnez un site"). Pas de supposition silencieuse. De même, si `Date.now() - built_at > MAX_CONTEXT_AGE_MS` (ou l’équivalent avec `issuedAt` côté UI), le shell force un rechargement du contexte avant d'autoriser des actions métier — la sécurité gagne (PRD §10.1).

---

## 5. Résumé des arborescences et conventions

### Structure complète des contrats

```
contracts/
  openapi/
    recyclique-api.yaml             ← API backend (produit par audit / Piste B)
  creos/
    manifests/                      ← Manifests modules Peintre (Piste A)
      recyclique.membership.json
      recyclique.cashdesk.json
      recyclique.inventory.json
      recyclique.bandeau.json
      recyclique.eco-organismes.json
      recyclique.sync.json
    schemas/                        ← JSON Schemas validation
      module-manifest.schema.json   ← Inclut data_contract optionnel
      widget-declaration.schema.json
      flow-definition.schema.json
      context-envelope.schema.json
    vocabulary/
      commands.yaml
      events.yaml
      states.yaml                   ← Inclut DATA_LOADING, DATA_LOADED, etc.
      objects.yaml
```

### Structure frontend

```
src/
  styles/
    tokens.css                      ← Design tokens (ADR P1)
  api/
    client.ts                       ← Client API centralisé
    types.ts                        ← Types TS des réponses (codegen ou manuel)
  hooks/
    data/                           ← Un hook par domaine métier
      useMember.ts
      useMemberList.ts
      useCashSession.ts
      useCurrentTicket.ts
      useInventoryLookup.ts
      useLiveStats.ts
      useStatsCounter.ts
      useAccountingSyncStatus.ts
      useEcoOrganismesDeclaration.ts
    ui/
      useWidgetData.ts              ← Interface WidgetDataState<T>
  peintre-nano/
    context/
      ContextEnvelope.ts            ← Type + provider
    shell/
      Shell.tsx + Shell.module.css
    slots/
      Slot.tsx + Slot.module.css
    flows/
      FlowRenderer.tsx + FlowRenderer.module.css
    registry/
      ModuleRegistry.ts
    fallbacks/
      WidgetSkeleton.tsx + .module.css
      WidgetError.tsx + .module.css
      WidgetEmpty.tsx + .module.css
    types/
      manifest.ts                   ← Types TS des manifests (dont DataContract)
      widget.ts
      flow.ts
      slot.ts
  modules/                          ← Modules métier RecyClique
    membership/
      MemberSummaryCard.tsx + .module.css
      MemberForm.tsx + .module.css
      manifest.json
    cashdesk/
      CurrentTicket.tsx + .module.css
      manifest.json
    bandeau/
      LiveBannerStats.tsx + .module.css
      manifest.json
    ...
```

---

## 6. Phase 0 — ce qui est mocké vs ce qui est réel

En Phase 0 (avant convergence avec Piste B), les hooks de domaine retournent des **données mockées** mais respectent la même interface `WidgetDataState<T>` :

```typescript
// src/hooks/data/useMember.ts — version Phase 0 mockée

import type { WidgetDataState } from '../ui/useWidgetData';
import type { Member } from '../../api/types';
import { MOCK_MEMBERS } from '../../__mocks__/members';

export function useMember(memberId: string | null): WidgetDataState<Member> {
  // Phase 0 : données mockées, même interface
  const member = memberId ? MOCK_MEMBERS[memberId] ?? null : null;
  
  return {
    status: !memberId ? 'empty' : member ? 'loaded' : 'error',
    data: member,
    error: member ? null : new Error(`Mock: member ${memberId} not found`),
    lastUpdated: Date.now(),
    retry: () => {},
  };
}
```

Le jour où le backend réel est disponible, on remplace le contenu du hook par un vrai `fetch` — **sans toucher au composant widget** qui consomme le hook. C'est l'intérêt de l'interface `WidgetDataState<T>` : elle isole le widget de la source de données.

Les mocks vivent dans `src/__mocks__/` et ne sont **jamais** importés par les composants widgets directement — uniquement par les hooks de domaine.

---

## 7. Vérifications (pour QA ou revue)

### Manifests et data_contract
- [ ] Tout widget avec des données métier a un `data_contract` dans son manifest
- [ ] Tout `data_contract` a un `operation_id` (pas un endpoint en dur)
- [ ] Le `endpoint_hint` est présent pour la lisibilité mais n'est jamais consommé par le code
- [ ] Tout `source` correspond à un tag dans `recyclique-api.yaml`
- [ ] Les widgets en zone critique (caisse, réception, clôture) ont `critical: true`
- [ ] Aucun `data_contract` ne pointe vers un système externe (Paheko, HelloAsso, etc.) — uniquement vers l'API RecyClique

### Data-fetching et hooks
- [ ] Aucun composant widget ne fait de `fetch()` ou `apiClient.get()` directement — toujours via un hook de domaine
- [ ] Tout hook de domaine retourne `WidgetDataState<T>`
- [ ] Les mocks vivent dans `src/__mocks__/`, pas dans les composants ni les hooks
- [ ] Les hooks mock retournent la même interface `WidgetDataState<T>` que les hooks réels

### Gestion des états dans les widgets
- [ ] Tout widget gère les 5 états (loading, loaded, error, empty, stale)
- [ ] Les fallbacks utilisent exclusivement `WidgetSkeleton`, `WidgetError`, `WidgetEmpty` — pas de `<div>Erreur</div>` improvisé
- [ ] Les widgets `critical: true` bloquent les actions sensibles quand le statut est `stale`
- [ ] L'attribut `data-stale` est utilisé (pas une classe CSS) pour signaler l'état stale

### Contexte et sécurité
- [ ] Aucun widget ne lit le `ContextEnvelope` directement — les champs pertinents arrivent via le Slot context
- [ ] Si `ContextEnvelope.site` est null, aucun widget métier ne rend de données
- [ ] Si `Date.now() - ContextEnvelope.built_at > MAX_CONTEXT_AGE_MS`, le shell force un rechargement du contexte
- [ ] Le `X-Correlation-Id` est présent dans toutes les requêtes API
- [ ] Le `X-Site-Id` est transmis depuis le `ContextEnvelope` — pas de requête multi-sites implicite
- [ ] Le changement de site reconstruit le `ContextEnvelope` entièrement (pas de mix silencieux)

---

*Instruction Cursor — Contrats de données — 2026-04-01*  
*Emplacement recommandé : `references/peintre/2026-04-01_instruction-cursor-contrats-donnees.md`*
