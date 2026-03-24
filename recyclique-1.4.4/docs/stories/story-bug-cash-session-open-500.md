# Story BUG: Erreur 500 lors de l'ouverture de session de caisse

**Status:** Draft
**Epic:** [EPIC-B40 – Caisse notes et KPIs](../epics/epic-b40-caisse-notes-et-kpi.md)
**Module:** API / Sessions de Caisse
**Priority:** P0
**Owner:** Backend Lead
**Last Updated:** 2025-11-26

---

## Bug Description

**Symptôme :** Quand un utilisateur se rend sur `http://localhost:4444/cash-register/session/open` et clique sur "Ouvrir la Session", la page se recharge avec l'erreur suivante affichée en rouge :

```
Request failed with status code 500
```

**Comportement attendu :** L'ouverture de session devrait réussir et rediriger vers l'interface de vente (`/cash-register/sale`).

**Comportement actuel :** Erreur HTTP 500 côté serveur, session non créée, utilisateur bloqué.

---

## Acceptance Criteria

1. **Diagnostic complet** – Identifier la cause racine de l'erreur 500 dans les logs API et la stack trace
2. **Reproduction fiable** – Créer un scénario de test automatisé qui reproduit le bug à 100%
3. **Correction implémentée** – Résoudre le problème causant l'erreur 500
4. **Tests de régression** – S'assurer que l'ouverture de session fonctionne pour tous les cas (avec/sans register_id, différents sites)
5. **Logging amélioré** – Ajouter des logs détaillés pour faciliter le debug futur des erreurs de session

---

## Dev Notes

### Contexte Technique

**Flow d'ouverture de session :**
1. Frontend : `OpenCashSession.tsx` → `handleSubmit()`
2. Service : `cashSessionService.createSession()` → `POST /v1/cash-sessions/`
3. API : `create_cash_session()` → `CashSessionService.create_session()`
4. DB : Création de `CashSession` + commit

**Payload envoyé par le frontend :**
```json
{
  "operator_id": "uuid-utilisateur-actuel",
  "site_id": "uuid-site-selectionne",
  "register_id": "uuid-caisse-selectionnee",
  "initial_amount": 50.00
}
```

### Points de défaillance potentiels

1. **Conversion UUID** – Échec dans `UUID(str(operator_id))` si format invalide
2. **Opérateur inexistant** – Vérification `User.id == operator_uuid` échoue
3. **Register non trouvé** – Problème dans la logique de fallback register
4. **Contrainte DB** – Violation de contrainte (unicité, FK, etc.)
5. **Erreur de commit** – Problème lors de `db.commit()`

### Code critique à examiner

**API Endpoint** (`cash_sessions.py:102-170`) :
```python
@router.post("/", ...)
async def create_cash_session(
    session_data: CashSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_strict([...]))
):
    service = CashSessionService(db)
    try:
        # Vérifier qu'il n'y a pas déjà une session ouverte pour cet opérateur
        existing_session = service.get_open_session_by_operator(session_data.operator_id)
        if existing_session:
            # ... log et raise HTTPException(400)

        # Créer la nouvelle session
        cash_session = service.create_session(...)
```

**Service create_session** (`cash_session_service.py:21-77`) :
```python
def create_session(self, operator_id: str, site_id: str, initial_amount: float, register_id: Optional[str] = None):
    # Conversion UUID
    operator_uuid = UUID(str(operator_id)) if not isinstance(operator_id, UUID) else operator_id
    site_uuid = UUID(str(site_id)) if not isinstance(site_id, UUID) else site_id

    # Vérifier opérateur
    operator = self.db.query(User).filter(User.id == operator_uuid).first()
    if not operator:
        raise ValueError("Opérateur non trouvé")

    # Logique register + création session...
```

### Debugging requis

1. **Logs API** – Examiner les logs au moment de l'erreur 500
2. **DB State** – Vérifier l'état des tables `users`, `sites`, `cash_registers`
3. **Request Payload** – Logger le payload exact reçu par l'API
4. **Exception Details** – Capture complète de l'exception Python

### Tests à créer

- **Test d'intégration** : Endpoint `/v1/cash-sessions/` avec payload valide
- **Test de validation** : Payloads invalides (UUIDs malformés, utilisateurs inexistants)
- **Test E2E** : Parcours complet ouverture session depuis le frontend

---

## Tasks / Subtasks

1. **Investigation et diagnostic**
   - [ ] Reproduire le bug en local
   - [ ] Examiner les logs API détaillés
   - [ ] Identifier la ligne exacte qui cause l'erreur 500
   - [ ] Logger le payload et l'état DB au moment de l'erreur

2. **Analyse de code**
   - [ ] Revue du flow `create_session` (API → Service → DB)
   - [ ] Vérifier les conversions UUID et validations
   - [ ] Tester les requêtes DB individuellement

3. **Correction**
   - [ ] Implémenter le fix identifié
   - [ ] Ajouter logging détaillé pour debug futur
   - [ ] Tester la correction en local

4. **Tests et validation**
   - [ ] Créer test unitaire pour le scenario buggé
   - [ ] Test d'intégration API
   - [ ] Test E2E frontend
   - [ ] Validation QA sur différents environnements

---

## Project Structure Notes

**Fichiers à modifier :**
- `api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py` – Améliorer error handling
- `api/src/recyclic_api/services/cash_session_service.py` – Fix dans create_session
- `api/tests/test_cash_sessions.py` – Ajouter tests de régression

**Logs à examiner :**
- Logs Docker API : `docker-compose logs api`
- Logs applicatifs : Dans les fichiers de log configurés

---

## Validation Checklist

- [ ] Bug reproduit et diagnostiqué
- [ ] Cause racine identifiée et corrigée
- [ ] Ouverture de session fonctionne pour tous les cas
- [ ] Tests de régression ajoutés et passent
- [ ] Logging amélioré pour faciliter debug futur
- [ ] QA validation sur l'environnement de test

---

## Change Log
| Date       | Version | Description                          | Author |
|------------|---------|--------------------------------------|--------|
| 2025-11-26 | v0.1    | Création de la story pour bug 500    | BMad Master |

---

## Investigation Findings

**✅ Diagnostic complété - Cause racine identifiée**

**Symptômes reproduits :**
- Erreur HTTP 500 lors du clic sur "Ouvrir la Session"
- Message d'erreur frontend : "Request failed with status code 500"
- La page se recharge sans redirection vers `/cash-register/sale`

**Cause identifiée :**
- **Incompatibilité entre l'enum Python et PostgreSQL** : L'enum `CashSessionStep` dans le modèle Python utilisait des valeurs en minuscules ("entry", "sale", "exit") alors que l'enum PostgreSQL créé par la migration utilisait des majuscules ("ENTRY", "SALE", "EXIT")
- Erreur PostgreSQL : `invalid input value for enum cashsessionstep: "entry"`
- L'erreur se produisait lors de l'appel à `cash_session.set_current_step(CashSessionStep.ENTRY)` qui tentait d'insérer "entry" dans une colonne PostgreSQL attendait "ENTRY"

**Stack trace complet :**
```
ERROR:recyclic_api.api.api_v1.endpoints.cash_sessions:Unexpected error in create_cash_session: (psycopg2.errors.InvalidTextRepresentation) invalid input value for enum cashsessionstep: "entry"
Traceback (most recent call last):
  ...
  File "api/src/recyclic_api/models/cash_session.py", line 214, in set_current_step
    self.current_step = step
  ...
psycopg2.errors.InvalidTextRepresentation: invalid input value for enum cashsessionstep: "entry"
```

**Analyse technique :**
- L'erreur PostgreSQL `InvalidTextRepresentation` indique une incompatibilité de type entre Python et PostgreSQL
- L'enum `CashSessionStep` dans le modèle Python définissait des valeurs en minuscules
- La migration Alembic créait l'enum PostgreSQL avec des valeurs en majuscules
- Lors de l'insertion en base, SQLAlchemy tentait d'insérer "entry" alors que PostgreSQL attendait "ENTRY"
- L'exception était levée dans `set_current_step()` lors du commit de la session

**Solution appliquée :**
1. **Correction des valeurs d'enum** : Modification des valeurs dans `CashSessionStep` pour utiliser des majuscules ("ENTRY", "SALE", "EXIT")
2. **Cohérence modèle/schéma** : Correction dans le modèle SQLAlchemy ET le schéma Pydantic
3. **Amélioration logging** : Ajout de logging détaillé pour faciliter le debug futur

**Fix implémenté :**
- ✅ **Correction de l'enum `CashSessionStep`** : Les valeurs dans le modèle Python utilisaient des minuscules ("entry", "sale", "exit") alors que l'enum PostgreSQL attendait des majuscules ("ENTRY", "SALE", "EXIT")
- ✅ **Fichiers modifiés** :
  - `api/src/recyclic_api/models/cash_session.py` : Changé `ENTRY = "entry"` → `ENTRY = "ENTRY"` (idem pour SALE et EXIT)
  - `api/src/recyclic_api/schemas/cash_session.py` : Même correction dans le schéma Pydantic
- ✅ **Amélioration de la gestion d'erreurs** : Ajout de logging détaillé et fallback de sérialisation dans l'endpoint

**Tests ajoutés :**
- [ ] Test de régression pour ouverture de session (à ajouter)
- [ ] Test d'intégration API pour endpoint `/v1/cash-sessions/` (à ajouter)
- [ ] Test E2E pour le flow complet d'ouverture de session (à ajouter)

**Validation :**
- ✅ Bug reproduit et corrigé
- ✅ Ouverture de session fonctionne correctement (redirection vers `/cash-register/sale`)
- ✅ Plus d'erreur 500 lors de l'ouverture de session
