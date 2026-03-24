# Audit backend — architecture applicative (base active 1.4.4)

**Date:** 2026-03-23  
**Perimetre:** structure des couches, routeurs FastAPI, services, transactions, sante, organisation des domaines.  
**Base de reference:** `recyclique-1.4.4/api/`

---

## Contexte

L'audit porte sur l'organisation du backend FastAPI tel qu'observe dans la base active: repartition des responsabilites entre routes, services, persistance et gestion des erreurs HTTP. Les constats ci-dessous visent a guider des lots de consolidation sans prescrire une refonte complete non etayee par le code.

---

## Findings par severite

### Critique

- **Couche repository quasi absente hors reception:** les services accedent directement a l'ORM, ce qui concentre la persistance et complique les tests ainsi que les evolutions par domaine.
- **Endpoints monolithiques:** fichiers d'endpoints tres volumineux (`admin.py` ~2300 lignes, `cash_sessions.py` ~1200+, `auth.py` important, `main.py` central), ce qui augmente le risque de regressions et la difficulte de revue.

### Eleve

- **Frontieres transactionnelles floues:** `commit` present a la fois dans des depots/repositories et dans des services, rendant imprevisible le perimetre atomique des operations.
- **Sante / observabilite dupliquee:** route `/health` dans `main.py` et endpoint health v1 avec semantiques differentes, risque de confusion pour l'orchestration et le monitoring.
- **Fuite de persistance et de logique dans les routes:** exemple cite — export CSV reception avec requete `Category` directement dans la route.
- **Plusieurs routeurs sous le prefixe `/admin` dans `api_v1/api.py`:** risque de collisions de chemins et de maintenance difficile.
- **Services couples a `HTTPException`:** melange couche applicative / presentation, tests et reutilisation plus lourds.

### Moyen

- **Domaines categories eclates, exports `__init__` incoherents:** decouverte des modules et coherence des imports degradees.

### Bas

- Aucun constat supplementaire au-dela de la liste fournie pour ce theme.

---

## Fichiers et zones concernes (indicatif)

- `recyclique-1.4.4/api/src/recyclic_api/main.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/api.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/auth.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/health.py` (ou equivalent v1)
- Routes / services lies a la reception et export CSV (fichiers endpoints / services reception)
- Modules `models` / packages categories et leurs `__init__.py`
- Couche services et eventuelle couche repository (reception vs reste du code)

---

## Recommandations (ordonnees)

1. **Normaliser la sante:** une seule semantique documentee pour la disponibilite applicative vs readiness; fusionner ou distinguer explicitement `/health` racine et health v1.
2. **Decouper les gros fichiers d'endpoints:** extraire par sous-domaine (admin, caisse, auth) avec routeurs dedies et responsabilites limitees.
3. **Retirer `HTTPException` des services:** faire remonter des erreurs de domaine ou des codes/structures neutres, levee HTTP au niveau route ou middleware dedie.
4. **Clarifier la politique de persistance et de transactions:** regle unique (qui commit, quand, par use case); aligner repositories et services.
5. **Extraire la logique hors des routes:** requetes ORM et regles metier dans services ou query helpers testables.
6. **Cartographier et consolider `/admin`:** inventaire des routeurs prefixes, resolution des collisions, convention de nommage des chemins.
7. **Aligner les manifests de domaine categories:** structure de packages et exports `__init__.py` coherents avec l'usage reel.

---

## Limites de ce document

Constats fournis pour l'audit brownfield; toute mesure quantitative (lignes exactes) doit etre reverifiee sur l'arbre source au moment de l'implementation.
