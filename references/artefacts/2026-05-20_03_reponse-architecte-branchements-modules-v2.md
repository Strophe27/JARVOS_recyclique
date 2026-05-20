# Revue architecture — modules optionnels Recyclique v2 / branchements JARVOS (réponse 1)

**Date :** 2026-05-20 · **Verdict :** **GO sous réserves**  
**Suite :** [2026-05-20_04_reponse-architecte-bouclage-modules-v2.md](2026-05-20_04_reponse-architecte-bouclage-modules-v2.md) (**GO final**) · [2026-05-20_05_notes-architecte-loup-de-mer-modules-v2.md](2026-05-20_05_notes-architecte-loup-de-mer-modules-v2.md) (**primordial** exécution)

---

## A — Synthèse

**Recette `06-MOD-cookbook` : industrialisable OUI, sous réserves.** La chaîne PRD §4.2 (7 briques) est prouvée bout-en-bout par Epic 4 / `kpi-live-banner` ; le cookbook donne phases 0→8, gates G0→G8, arbre de décision tables vs JSON, et anti-patterns exécutables. Les réserves sont des **lacunes de contrat partagé**, pas des trous de protocole.

**Bus affichage (CREOS→Peintre) : GO.** Hiérarchie AR39 stable (`02-ARCH §4`, `05-ARCH §2`), writer canonique = Recyclique sous `contracts/creos/manifests/` (`05-ARCH §4`), runtime mono-pipeline + fallback `degraded` (`05-ARCH §3`, `04-MOD §6.2`). Le pilote bandeau démontre une op OpenAPI réelle → widget déclaré → rendu → fallback (`05-ARCH §6.3`).

**% lignes G OK (estimation) :** ~58 % OK, ~33 % Gap, ~9 % Bloquant local. Aucun Bloquant structurel ; les Bloquants sont confinés à G.6 (anti-régression v0.1) en tant que garde-fou, pas en tant que dette présente.

**Top 3 P0**
1. **L-03 / T-MOD-2** — ADR-007 **Proposed → Accepted** (`07-MOD-adr`). Tant que non gelé, le double récit v0.1/v2 reste juridiquement ouvert dans BMAD.
2. **T-MET-1 / Q-HITL-09–11** — trancher placement étape comptage dans wizard clôture + skip vs blocage + écritures Paheko écart (`08-MOD §10`, `04-ARCH §5`).
3. **Q-HITL-13** — séquencer Story 9.6 vs Epic 10 vs acceptation ADR (priorisation industrialisation).

**3 actions avant nouveau module**
- Accepter ADR-007 (clôt L-03, débloque promotion BMAD).
- Fusionner `openapi-module-config.yaml` dans `contracts/openapi/recyclique-api.yaml` + codegen (T-MOD-3, clôt L-04).
- Trancher précédence `sites.configuration` vs JSON `module_key` (Q-HITL-03, clôt L-07).

---

## B — Tensions T1–T7

| ID | Tranche opérationnelle | Réf. |
|----|------------------------|------|
| **T1** Config JSON vs tables | **Règle :** JSON `module_key` = flags/préférences d'activation **uniquement** ; toute donnée à contrainte SQL / audit légal / jointures → tables métier + Alembic (arbre décision `06-MOD §0.2`). Anti-pattern : compta dans JSON (`06-MOD §15`). | `06-MOD`, ADR-001, `03-MOD §8` |
| **T2** Slice vs workflow step | **Deux patterns, un protocole.** Slice = page/slot transverse (bandeau). Workflow step = panel **dans** un flow existant (`cashflow-close-wizard`), pas page orpheline. Le cookbook couvre les deux ; pilote #1 ≠ template suffisant pour step → `08-MOD`. | `02-MOD §4.5`, `04-MOD §9`, `08-MOD §11` |
| **T3** Convention backend | **Gap ouvert (L-09).** Pattern package/prefix OpenAPI/feature flag par `module_key` non figé → chaque epic réinvente. Trancher dans `03-MOD §6` avant 2ᵉ module métier. | `03-MOD §6`, `22 T-MOD-1` |
| **T4** Registre vs manifests | **Registre `module_key` = source whitelist back + gouvernance clés** (`05-MOD §3,§9`) ; **distinct** des manifests CREOS qui restent la grammaire UI. Pas de fusion : le registre alimente l'activation, les manifests le rendu. | `05-MOD`, Q-HITL-02 |
| **T5** Paheko exceptions | **Aucune exception.** Tout module à impact compta → référentiel → journal → snapshot → builder → outbox PG (`04-ARCH §5`). JSON config sans compta = hors outbox (`06-MOD §0.2 C` « Non »). Pas d'export ad hoc, pas de Paheko navigateur. | `04-ARCH §5`, `08-MOD §9.1 B4.4` |
| **T6** ADR-007 post-Accept | **Pas de re-débat v0.1.** Règles opérationnelles : `19-MOD` (crosswalk DS/PT), annexe E TOML backend-only **autorisé sous HITL** (métadonnées package, **jamais** `[ui]`/routes/loader). | `07-MOD annexe E`, `19-MOD` |
| **T7** T-PEINT-1 hooks v2 | Gardien du seuil = frontière agent/app consommant CREOS sans bypass writer canonique. Hooks v2 = lecture manifests + ContextEnvelope projeté (TTL, jamais réécriture sécurité). Outils agent doivent passer par OpenAPI/manifests reviewables. **Cadrage v2 + Q-HITL-16 à ouvrir.** | `04-MOD §17`, `05-ARCH §7.4` |

---

## C — Matrice de branchements G.1–G.8

### G.1 `contracts/`
| De | Vers | Mécanisme | Statut | Gap | Correction | Dépendance |
|----|------|-----------|--------|-----|------------|------------|
| CREOS | OpenAPI | `data_contract.operation_id` ↔ `operationId` (`contracts/openapi/recyclique-api.yaml`) | OK | — | — | — |
| OpenAPI | tout aval | AR39 strict (`02-ARCH §4`) | OK | — | — | — |
| YAML canonique | consommateurs | codegen `contracts/openapi/generated/recyclique-api.ts` ; `peintre-nano/src/generated/` = placeholder | OK | — | ne pas confondre placeholder | — |
| module-config | API canonique | `references/config-modules-site-id/openapi-module-config.yaml` non fusionné dans `recyclique-api.yaml` | **Bloquant** (L-04) | route absente du canonique → drift | T-MOD-3 : merge + `npm run generate` | ADR-007 |
| config site | JSON `module_key` | précédence `sites.configuration` vs JSON vs ADR-001 PG indécise | **Bloquant** (L-07) | comportements activation divergents | trancher Q-HITL-03 → ADR/section registre | `18-MOD §5` |

### G.2 Module → affichage
| De | Vers | Mécanisme | Statut | Gap | Correction | Dépendance |
|----|------|-----------|--------|-----|------------|------------|
| Module | page/slot | manifests CREOS sous `contracts/creos/manifests/` (`05-ARCH §4`) | OK | — | — | — |
| Module | registre | `registerWidget('<type>')` + allowlist `allowed-widget-types.ts` (`04-MOD §6.2`) | OK | — | pas de 2ᵉ liste | — |
| `module_key` off | UI | skip rendu (toggle bandeau aujourd'hui) | Gap | toggle ≠ activation généralisée | Story 9.6 (`22 T-MOD-4`) | L-08 |
| slice vs step | rendu | slice = slot transverse ; step = panel flow (`04-MOD §9`) | OK | — | — | — |
| Peintre autonome / autre app | CREOS | writer canonique = app commanditaire ; Peintre rend, n'invente pas (`05-ARCH §1`) | Gap | packaging/publication contrats à traiter | hors v2 (G.7) | — |

### G.3 Module → métier
| De | Vers | Mécanisme | Statut | Gap | Correction | Dépendance |
|----|------|-----------|--------|-----|------------|------------|
| Module | routes back | convention package/prefix/feature flag non figée | **Bloquant** (L-09) | chaque epic réinvente | figer `03-MOD §6` | `22 T-MOD-1` |
| Module | whitelist | registre `module_key` (`05-MOD §3`) ; 1 seule clé **actif** (`kpi-live-banner`) | Gap (L-05) | autres clés réservées inutilisables | promouvoir clés + schémas | Story 9.6 |
| Module | config vs tables | arbre `06-MOD §0.2` ; JSON = flags, tables = métier | OK | — | — | — |
| Module | contexte | ContextEnvelope `GET /v1/users/me/context` ; UI projette (`05-ARCH §2`) | OK | — | — | — |
| activation | toggle | `bandeau_live_slice_enabled` transitoire vs Story 9.6 | Gap (L-08) | deux chemins activation | migration toggle→`module-config` | `22 T-MOD-4` |

### G.4 Recyclique ↔ Peintre
| De | Vers | Mécanisme | Statut | Gap | Correction | Dépendance |
|----|------|-----------|--------|-----|------------|------------|
| Recyclique | Peintre | HTTP + cookies session ; credentials serveur (`02-ARCH §1`) | OK | — | — | — |
| Recyclique | navigation | commanditaire = Recyclique ; NavigationManifest reviewable (`02-ARCH §4`) | OK | — | — | — |
| Peintre | manifests+contexte | `loadManifestBundle` → `validateManifestBundle` → `filterNavigation` → rendu (`05-ARCH §3`) | OK | — | — | — |
| inter-container | — | container Peintre isolé (D-02) ; gaps K8s/réseau/secrets | Gap (G.4) | hors validation revue | doc séparée | — |

### G.5 Recyclique ↔ Paheko
| De | Vers | Mécanisme | Statut | Gap | Correction | Dépendance |
|----|------|-----------|--------|-----|------------|------------|
| clôture | outbox | outbox transactionnelle PG, at-least-once, handlers idempotents (`04-ARCH §5.1`) | OK | — | — | — |
| module compta | outbox | 1 batch idempotent/session, sous-clés stables (`08-MOD §8.2`) | OK | — | — | — |
| écart espèces | ventilation | A (compte écart mapping) / B (ligne 1) / **C 4ᵉ POST à rejeter** sauf expert-compta (`08-MOD §8.2`) | **Bloquant** (T-MET-1) | politique non tranchée | Q-HITL-10 HITL | Epic 8 |
| `module_key` off | clôture | skip gracieux étape vs blocage close | Gap | indécis | Q-HITL-11 | `05-MOD §5.4` |
| mapping absent | close | 409 `PAHEKO_SYNC_FINAL_ACTION_REFUSED` avant clôture (`04-ARCH §1`, story 8.6) | OK | — | — | — |

### G.6 Anti-régression v0.1
| De | Vers | Mécanisme | Statut | Gap | Correction | Dépendance |
|----|------|-----------|--------|-----|------------|------------|
| `module.toml [ui]`/routes | rejet | **Bloquant** à phase 0 (`06-MOD §15`, `07-MOD annexe E`) | Bloquant (garde-fou) | — | refuser en revue | ADR-007 |
| `ModuleBase`/loader central | rejet | **Bloquant** ; pas de `ModuleRegistry.load_from_config` (`19-MOD PT-02`) | Bloquant (garde-fou) | — | refuser | — |
| EventBus Redis « module » | rejet | Redis = auxiliaire only (`04-ARCH §5.1`, AR12) ; `06-MOD §15` | Bloquant (garde-fou) | — | refuser | — |
| `config.toml [modules]` | rejet | activation UI interdite → ADR-001 + 9.6 (`07-MOD annexe E`) | Bloquant (garde-fou) | — | refuser | — |

### G.7 Post-v2 (avis court)
| De | Vers | Mécanisme | Statut | Gap | Correction | Dépendance |
|----|------|-----------|--------|-----|------------|------------|
| app contributrice JARVOS | CREOS partagé | Peintre = moteur partagé, Recyclique writer de SES contrats (D-05) | OK (non bloquant) | packaging contrats inter-app | hypothèse post-v2 ; ne pas figer interfaces (`14-MOD`, L-14) | — |
| caisse/réception | modules futurs | recette v2 ne doit pas l'interdire | OK | — | garder JSON config extensible | — |

### G.8 Agents / affichage
| De | Vers | Mécanisme | Statut | Gap | Correction | Dépendance |
|----|------|-----------|--------|-----|------------|------------|
| agent/app | CREOS | consomme manifests reviewables + ContextEnvelope projeté ; **pas** writer (`05-ARCH §1,§2`) | Gap | contrat agent non cadré v2 | T-PEINT-1 cadrage | Q-HITL-16 |
| agent | seuil | T-PEINT-1 gardien : bypass writer canonique interdit (`04-MOD §17`, `05-ARCH §7.4`) | Gap | hooks v2 + outils agent à spécifier | ouvrir Q-HITL-16 | — |

---

## D — Revue `08-MOD` (pilote comptage)

**Verdict : validé avec modifs HITL (P0).** La fiche est correcte comme template **workflow-step + tables + Paheko** ; elle prouve à raison que le pilote #1 ne suffit pas (`08-MOD §11`).

**Briques OK :** panel dans `cashflow-close-wizard` avant `closeSession` (B4.2 pas de rename), `data_contract.critical:true` + blocage `DATA_STALE`, JSON config étroit `{enabled, skip_allowed, require_denomination_grid}`, batch session idempotent sans message outbox séparé avant close.

**Modifs requises avant stories Epic 6 :**
- Trancher **écart espèces** A/B/C (`§8.2`) — rejeter C par défaut ; **Q-HITL-10**.
- Trancher **skip vs blocage** clôture si module off — **Q-HITL-11**.
- Référentiel dénominations : table nationale fixe vs config site (`§8.3`, Q4) — DDL vs JSON.

**Schéma clôture caisse (module on) :**
```
ouverture session → ventes/dons → [étape comptage: grille dénominations → total compté]
  → calcul écart (théorique vs compté) → garde held → closeSession
  → snapshot enrichi (denominations) → builder → outbox PG (batch idempotent, correlation_id)
  → 200 local + paheko_outbox_item_id  (PAS "compta OK" UI)  → sync Paheko découplée
module off → wizard parité legacy 1.4.4, pas d'étape fantôme
```
**Gate :** ne pas `create-story` comptage avant Q-HITL-09–11 (`08-MOD §10`).

---

## E — Priorisation `22-MOD` (T-MOD-1…5, T-MET-1, T-PEINT-1)

| Ordre | TODO | Priorité | Action |
|-------|------|----------|--------|
| 1 | **T-MOD-2** ADR-007 → Accepted | **P0** | HITL ; promotion `_bmad-output/.../architecture/` |
| 2 | **T-MET-1** comptage (Q-HITL-09–11) | **P0** | HITL placement + skip + écart Paheko |
| 3 | **T-MOD-3** fusion OpenAPI module-config | **P1** | merge `recyclique-api.yaml` + codegen |
| 4 | **T-MOD-1** convention backend | **P1** | figer `03-MOD §6` |
| 5 | **T-MOD-4** Story 9.6 config admin | **P1** | remplace toggle 4.5 |
| 6 | **T-MOD-5** registre `module_key` | **P1** | whitelist + schémas par clé activée |
| 7 | **T-PEINT-1** gardien du seuil | **P2** | cadrage v2 + Q-HITL-16 (pré-interop JARVOS) |

**Sur la séquence hypothèse ADR→9.6→OpenAPI→Epic 10 :** à challenger. **Recommandé : ADR-007 (T-MOD-2) → T-MOD-3 (OpenAPI) → T-MOD-1 (convention back) → Story 9.6.** Raison : 9.6 consomme la route module-config ; la fusion OpenAPI doit précéder, sinon 9.6 code contre un brouillon. Epic 10 (CI CREOS) reste parallélisable et **non bloquant** pour un 1ᵉʳ nouveau module (discipline PR + Vitest local couvre AR39 entre-temps, `21-MOD §7`).

---

## F — Interdits maintenant

- `module.toml`/`ModuleBase`/EventBus Redis « module »/`config.toml [modules]` (`06-MOD §15`, `07-MOD annexe E`).
- Route module-config consommée comme canonique avant fusion YAML (L-04).
- `create-story` comptage avant Q-HITL-09–11.
- Promotion ADR-007 en **Accepted** dans BMAD sans HITL.
- Activation module via `localStorage`/`UserRuntimePrefs` (`04-MOD §9`, AR39).
- 4ᵉ POST écart Paheko sans validation expert-comptable.
- Tout appel Paheko depuis navigateur (`08-MOD B4.4`).
- Figer interfaces marketplace (états `listed`/`licensed`) (L-14).

---

## G — Questions HITL Strophe (produit/calendrier)

1. **Q-HITL-03** précédence `sites.configuration` vs JSON `module_key` vs ADR-001 PG — bloque T-MOD-4/9.6.
2. **Q-HITL-09** placement étape comptage dans wizard clôture sans casser parité legacy.
3. **Q-HITL-10** écritures Paheko écart espèces : A/B/C + idempotence.
4. **Q-HITL-11** module off = skip gracieux ou blocage clôture ? `skip_allowed` par défaut ?
5. **Q-HITL-13** séquencer Story 9.6 vs Epic 10 vs acceptation ADR-007.
6. **Q-HITL-08** marketplace : isoler interfaces dès v2 ? (recommandé : non).
7. **Q-HITL-16 (T-PEINT-1)** cadrage hooks agent + bypass writer canonique : maintenant ou post-v2 ?
8. **Couche « plateforme modules » :** registre + convention + module-config suffisent pour v2 ; couche explicite **post-v2** (après 2–3 modules réels). Recommandé : ne pas créer maintenant.

---

*Écart signalé : aucun. D-01–D-05 respectées.*
