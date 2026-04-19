# Schémas JSON — configuration par module

Chaque fichier décrit le **`payload`** attendu à l’intérieur d’un `ModuleConfigDocument` (voir `../openapi-module-config.yaml`) pour un couple **`module_key` + `schema_version`**.

**Convention** : propriétés en **snake_case** pour rester aligné avec une sérialisation backend typique ; le client Peintre ou tout front **camelCase** doit appliquer un **mapping explicite** (pas de double source de vérité implicite).

| Fichier | `module_key` (exemple) | `schema_version` | Rôle |
|---------|------------------------|------------------|------|
| [kpi-live-banner.v1.json](kpi-live-banner.v1.json) | `kpi-live-banner` | `1.0.0` | Bandeau KPI live (affichage caisse / réception, période de rafraîchissement) — **pilote** documentaire. |

**Règles** : schémas **locaux** uniquement (pas de `$ref` http/https vers des ressources distantes) ; patterns et `maxLength` **bornés** pour limiter ReDoS ; alignement sur le [livrable normatif](../livrable-normatif-architecture.md) (validation par module, pas de secrets non masqués en sortie).

**À propos de `$id`** dans les fichiers JSON Schema : il sert d’identifiant stable du schéma (URI opaque). Les outils du dépôt ne doivent **pas** résoudre cet URI par un téléchargement réseau ; toute résolution de `$ref` doit rester **fichiers locaux** sous `schemas/`.
