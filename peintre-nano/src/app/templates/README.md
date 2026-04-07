# Templates — mise en page Peintre_nano

Les gabarits applicatifs vivent ici. Ils ne portent **pas** de logique métier, permissions ni appels API : uniquement structure CSS, tokens (`src/styles/tokens.css`) et zones sémantiques pour le contenu injecté par **PageManifest** → registre de widgets.

## Patrons transverses (`transverse/`)

| Patron | Cas d’usage | Fichiers |
|--------|-------------|----------|
| **Hub** (`TransverseHubLayout`) | Dashboard, hubs listings, pages admin transverses : en-tête pleine largeur puis grille 2 colonnes (dernière carte seule étendue si nombre impair de blocs après l’en-tête). | `TransverseHubLayout.tsx`, `TransverseHubLayout.module.css` |
| **Consultation** (`TransverseConsultationLayout`) | Fiches-type consultation (4 blocs manifeste : en-tête, deux colonnes, pied). | `TransverseConsultationLayout.tsx`, `TransverseConsultationLayout.module.css` |
| **Point d’entrée runtime** (`TransverseMainLayout`) | Sélection hub vs consultation selon `page_key` connu des contrats CREOS. | `TransverseMainLayout.tsx` |
| **Résolution** | `page_key` → mode de gabarit (présentation uniquement). | `resolve-transverse-main-layout.ts` |

### Câblage actuel

En démo servie (`RuntimeDemoApp`), le wrapper optionnel `wrapUnmappedSlotContent` de `buildPageManifestRegions` applique `TransverseMainLayout` aux pages dont les slots sont dans la zone `main` non mappée vers `header` / `nav` / etc. (cas des manifests transverses 5.2–5.4). La composition des widgets reste **100 %** déclarative côté contrat.

### Zones sémantiques et tests

- `data-testid="transverse-page-shell"` — enveloppe de page transverse.
- `data-testid="transverse-page-header"` — premier slot / en-tête.
- `data-testid="transverse-body-grid"` — grille hub (slots suivants).
- `data-testid="transverse-two-column-body"` — corps deux colonnes (consultation).
- `data-testid="transverse-state-slot-placeholder"` — réserve visuelle minimale pour futurs états vides / chargement / erreur (story 5.7).

### Séparation template / widget métier

Les widgets data-driven restent sous `registry`, `domains/*`, avec `data_contract.operation_id` résolu dans OpenAPI. Les templates ne référencent pas `Recyclique` ni des modules métier.
