# Checklist développement — Spec 25.4, sections 2 et 3

**Version :** 1.0  
**Date :** 2026-04-20  
**Source normative :** [`2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md`](../../planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md) (spec convergée **25.4** ; périmètre **§2** modèle de contexte, **§3** changement de contexte).

**Légende des tags**

| Tag | Signification |
|-----|----------------|
| `normative-spec` | Exigence issue de la spec ; doit disposer d’une preuve automatisée ou d’un **script de vérification manuel** nommé (`verification`). |
| `vision-later` | Intention cible ou hors train d’exécution actuel ; explicitement **non bloquant** pour le scope checklist tant que la vision n’est pas absorbée. |

**Références ADR (sans rouvrir le fond)** : les points PIN kiosque / secret de poste / lockout / offline renvoient à l’[**ADR 25-2**](../../planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md). L’[**ADR 25-3**](../../planning-artifacts/architecture/2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md) (async Paheko / outbox) **n’est pas citée dans les §2–3** de la spec ; elle reste la norme pour la projection §4 et au-delà.

---

## Table des exigences (§2.1 à §2.5, §3.1 à §3.2)

Les ancres `#…` sont dérivées des titres de la spec (slugification type TOC Markdown : accents supprimés, ponctuation normalisée ; vérifier dans le prévisualiseur si un lien ne cible pas le titre attendu).

| § | Exigence (synthèse) | Tag | Lien vers la spec | verification |
|---|---------------------|-----|-------------------|--------------|
| **2.1** | Opérations sensibles : site **explicite** (pas seulement inféré par l’UI). | `normative-spec` | [§2.1 `site`](../../planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md#21-site) | `CTX-INV-2-1-SITE-EXPLICIT` |
| **2.1** | Aucune permission ni écriture comptable ne « fuit » vers un site non sélectionné ou non autorisé. | `normative-spec` | [§2.1 `site`](../../planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md#21-site) | `CTX-INV-2-1-ZERO-LEAK-CROSS-SITE` |
| **2.1** | Typologie FIXE / NOMADE / EXTERNE, lien analytique immuable après première vente — **cible vision** ; évolution de schéma / contraintes en stories dédiées post-readiness. | `vision-later` | [§2.1 `site`](../../planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md#21-site) | *N/A — hors train normatif ; ne pas rouvrir ADR 25-2 / 25-3.* |
| **2.2** | Rattachement caisse → **site** cohérent avec session et mappings Paheko. | `normative-spec` | [§2.2 `caisse`](../../planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md#22-caisse-cash-register) | `CTX-INV-2-2-CAISSE-SITE-COHERENCE` |
| **2.2** | Référentiel comptable Paheko : **chaîne canonique** (journal, snapshot, builder), pas l’écran de vente seul comme vérité. | `normative-spec` | [§2.2 `caisse`](../../planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md#22-caisse-cash-register) | `CTX-INV-2-2-CANONICAL-CHAIN-NOT-SALE-UI-ONLY` |
| **2.3** | Session ouverte porte **site + caisse + opérateur** et **traces d’audit**. | `normative-spec` | [§2.3 `session`](../../planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md#23-session-caisse) | `CTX-INV-2-3-SESSION-ENVELOPE-AUDIT` |
| **2.3** | **Clôture** : snapshot comptable **figé** ; pas de recalcul silencieux d’une session clôturée. | `normative-spec` | [§2.3 `session`](../../planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md#23-session-caisse) | `CTX-INV-2-3-CLOSE-SNAPSHOT-NO-SILENT-RECOMPUTE` |
| **2.4** | **Poste (canon)** : autorité **serveur** pour PIN opérateur et permissions en ligne. | `normative-spec` | [§2.4 `poste` / `kiosque`](../../planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md#24-poste-kiosque) | `CTX-INV-2-4-SERVER-AUTHORITY-PIN-PERM` |
| **2.4** | **Kiosque** : lockout, step-up, offline — invariants **définis dans ADR 25-2** (pas de redécision ici). | `normative-spec` | [§2.4 `poste` / `kiosque`](../../planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md#24-poste-kiosque) | `CTX-INV-2-4-KIOSQUE-INVARIANTS-ADR-25-2` |
| **2.4** | Ne jamais confondre **identité opérateur** et **identité de poste** dans journaux et payloads sortants. | `normative-spec` | [§2.4 `poste` / `kiosque`](../../planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md#24-poste-kiosque) | `CTX-INV-2-4-OPERATOR-VS-POSTE-IDENTITY-LOGS` |
| **2.5** | Calcul **additif** (union) rôles + groupes ; **libellés UI** ne font pas foi pour la sécurité. | `normative-spec` | [§2.5 Rôle, groupe, permission effective](../../planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md#25-role-groupe-permission-effective) | `CTX-INV-2-5-ADDITIVE-ROLES-GROUPS-NO-UI-LABELS` |
| **2.5** | Toute permission **sensible** évaluable relativement au **site / caisse / contexte** courant (stories admin = surface de preuve des habilitations effectives). | `normative-spec` | [§2.5 Rôle, groupe, permission effective](../../planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md#25-role-groupe-permission-effective) | `CTX-INV-2-5-SENSITIVE-SCOPE-SITE-CAISSE-CONTEXT` |
| **3.1** | Changement site/caisse : **invalider ou recalculer** le contexte **backend** avant action métier ou comptable. | `normative-spec` | [§3.1 Bascule site / caisse](../../planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md#31-bascule-site-caisse) | `CTX-SWITCH-3-1-INVALIDATE-OR-RECALC-BEFORE-BIZ` |
| **3.1** | Client (`Peintre_nano`) : pas d’état métier **stale** vs serveur après bascule ; erreurs **explicites**. | `normative-spec` | [§3.1 Bascule site / caisse](../../planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md#31-bascule-site-caisse) | `CTX-SWITCH-3-1-NO-STALE-CLIENT-EXPLICIT-ERRORS` |
| **3.2** | **PIN opérateur** (vérification serveur) reste **canon** — aligné `prd.md` §11.2. | `normative-spec` | [§3.2 PIN, step-up et kiosque](../../planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md#32-pin-step-up-et-kiosque) | `CTX-SWITCH-3-2-OPERATOR-PIN-CANON-PRD-11-2` |
| **3.2** | PIN kiosque, secret de poste, lockout, step-up, offline : **ADR 25-2** (*accepted*) — pas de « meilleur effort ». | `normative-spec` | [§3.2 PIN, step-up et kiosque](../../planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md#32-pin-step-up-et-kiosque) | `CTX-SWITCH-3-2-KIOSQUE-POSTE-STEPUP-ADR-25-2` |
| **3.2** | Revalidation après bascule sensible : **refus par défaut** jusqu’à preuve d’identité conforme à l’ADR. | `normative-spec` | [§3.2 PIN, step-up et kiosque](../../planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md#32-pin-step-up-et-kiosque) | `CTX-SWITCH-3-2-REVALIDATION-DEFAULT-DENY` |

---

## Sujets explicitement hors scope de cette checklist (§2–3)

Les éléments suivants **ne figurent pas** dans les sections **2** et **3** de la spec **25.4** ; ils ne sont **pas** des critères d’acceptation de cette checklist (traitement **hors scope** tant qu’ils ne sont pas ajoutés à la spec produit) :

- **Auto-suspend** (comportement non défini en §2–3).
- **Canaux d’alerte** (non traités en §2–3).
- **Taxonomie de sites FIXE / NOMADE / EXTERNE** et **immuabilité analytique post–première vente** : couvertes uniquement comme **`vision-later`** (ligne §2.1 du tableau), sans rouvrir les [**ADR 25-2**](../../planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md) ni [**25-3**](../../planning-artifacts/architecture/2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md).

**Aucune nouvelle ADR** n’est introduite par ce document (story **25.7**, trace Epic 25).
