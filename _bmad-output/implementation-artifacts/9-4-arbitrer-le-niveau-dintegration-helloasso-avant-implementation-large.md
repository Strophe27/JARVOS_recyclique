# Story 9.4 : Arbitrer le niveau d'intégration HelloAsso avant implémentation large

Status: backlog

**Story ID :** 9.4  
**Story key :** `9-4-arbitrer-le-niveau-dintegration-helloasso-avant-implementation-large`  
**Epic :** 9 — Livrer les modules métier complémentaires v2

**Définition canonique (Given / When / Then) :** `_bmad-output/planning-artifacts/epics.md` — section « Story 9.4 » (critères d'acceptation enrichis 2026-04-12 avec ancrage `references/migration-paheko/`).

## Documentation d'arbitrage et de promesse (trace 2026-04-12)

| Document | Rôle |
|----------|------|
| `references/migration-paheko/2026-04-12_specification-integration-helloasso-recyclique-paheko.md` | Spec technique : flux HelloAsso → Recyclique → Paheko, checkout **`metadata`**, TTL redirection ~15 min, **§3.6** quotas OAuth vs doc officielle, **§4.2** dédup Paheko (nom vs email, `/api/sql` SELECT), webhooks |
| `references/migration-paheko/2026-04-12_brouillon-arbitrage-helloasso-et-promesse-recyclique-paheko.md` | Brouillon arbitrage + **promesse produit** (parcours utilisateur / admin, migration initiale, synchro automatique §G) |
| `references/recherche/2026-04-12_helloasso-api-v5-paheko-perimetre-recyclique_perplexity_reponse.md` | Recherche Perplexity + **erratum** en tête (interprétation initiale des rate limits) |

**Décision déjà cadrée dans ces livrables :** intégration **API HelloAsso directe** côté Recyclique ; **pas** de dépendance à l'extension HelloAsso **cloud-only** de Paheko pour les déploiements Paheko self-host ; OAuth **cache + refresh** ; import historique **API sobre** et/ou **export fichier** HelloAsso selon l'asso.

## Prochaine exécution BMAD

- Quand la story sera **prise en charge** : vérifier que les AC `epics.md` (bloc 9.4) sont **explicitement cochés** par rapport aux chemins ci-dessus ; compléter tout écart (ex. validation terrain d'une hypothèse encore ouverte).  
- **Story 9.5** ne démarre pas avant cette preuve d'arbitrage (règle d'épique).
