# Politique de journalisation — identité opérateur vs ancrage poste / kiosque (Story 25.13)

**Date :** 2026-04-20  
**Story :** `25-13-journalisation-identite-operateur-versus-poste-ou-kiosque-tranche-minimale`  
**Références normatives :**

- Spec **25.4 §2.4** — `_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md`
- **ADR 25-2** — `_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md` (`status: accepted`)
- Checklist **25.7** — invariant **`CTX-INV-2-4-OPERATOR-VS-POSTE-IDENTITY-LOGS`** — `_bmad-output/implementation-artifacts/checklists/25-7-checklist-spec-25-4-sections-2-3.md`

## Hors scope (rappel story)

Step-up UI kiosque complet, réglage fin SuperAdmin lockout, tolérance PIN offline : hors périmètre sauf **consommation** de comportements serveur déjà présents.

## Champs stables (JSON backend / audit `details_json`)

| Sémantique | Clé (snake_case) | Notes |
|------------|------------------|--------|
| Identité **opérateur** (utilisateur humain authentifié qui agit) | `operator_user_id` | UUID utilisateur ; obligatoire sur le chemin vente instrumenté. |
| Alias historique « utilisateur de la ligne de log » | `user_id` | **Uniquement** l’opérateur sur ce chemin ; conservé pour compatibilité lecteurs existants ; les **nouveaux** consommateurs doivent préférer `operator_user_id`. |
| Nom d’opérateur pour audit lisible | `username` | Valeur passée par `username_for_audit` (pas de secrets). |
| Ancrage **site** | `site_id` | Contexte géographique / entité site. |
| Ancrage **poste de caisse** (liaison terminal / registre) | `cash_register_id` | Distinct de l’UUID opérateur quand le poste est renseigné ; **`null`** possible en brownfield : **absence** ne signifie pas « même chose que l’opérateur ». |
| Session caisse | `session_id` | Session métier ouverte sur le poste. |

## Interdits

- Un **seul** champ ambigu mélangeant « opérateur » et « jeton poste / kiosque » sans légende explicite (cf. spec §2.4).
- Journaliser PIN, secret de poste ou tokens en clair — respect de `sanitize_audit_details` dans `recyclique/api/src/recyclic_api/core/audit.py`.

## Chemin cashflow instrumenté (tranche minimale)

**Vente caisse nominale** (`SaleService.create_sale`) et **finalisation ticket en attente** (`finalize_held_sale`) :

- Événement structuré `PAYMENT_VALIDATED` (`recyclique/api/src/recyclic_api/core/logging.py` → `logs/transactions.log`).
- Audit `CASH_SALE_RECORDED` via `log_cash_sale` (`merge_critical_audit_fields` enrichit `operator_user_id` à partir de `user_id` si besoin).

## Exemple JSON `PAYMENT_VALIDATED` (après 25.13)

```json
{
  "event": "PAYMENT_VALIDATED",
  "operator_user_id": "550e8400-e29b-41d4-a716-446655440001",
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "session_id": "660e8400-e29b-41d4-a716-446655440002",
  "site_id": "770e8400-e29b-41d4-a716-446655440003",
  "cash_register_id": "880e8400-e29b-41d4-a716-446655440004",
  "transaction_id": "990e8400-e29b-41d4-a716-446655440005",
  "amount": 10.0
}
```

## Coordination **25.11**

Aucun changement d’**OpenAPI**, d’enveloppe de contexte HTTP ni d’en-têtes de liaison sur cette tranche : pas de mise à jour des artefacts spike **25.11** (contrat enveloppe inchangé). Si de futurs champs « binding » kiosque sont ajoutés côté API, aligner `contracts/openapi/fragments/context-envelope-examples-25-11.yaml` et `peintre-nano/src/types/context-envelope.ts`.

## Test gate parent

`recyclique/api/tests/test_story_25_13_journalisation_identite_operateur_poste_kiosque.py`

**Note environnement test :** sous **SQLite**, la suite neutralise `log_audit` (pas de table `audit_logs`) ; la preuve AC « log ou événement structuré » repose alors sur **`PAYMENT_VALIDATED`** dans `transactions.log`. Sous **PostgreSQL**, le test vérifie en plus la dernière ligne `cash_sale_recorded` dans `audit_logs`.
