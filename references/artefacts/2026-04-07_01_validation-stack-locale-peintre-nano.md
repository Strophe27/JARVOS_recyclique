# Validation stack locale — peintre-nano

Date : 2026-04-07

## Objet

Trace courte de validation locale après réalignement du point d'entrée Docker du mono-repo :

- frontend dev officiel `peintre-nano/`
- API vivante `recyclique/api/`
- compose canonique à la racine du dépôt

## Résultat

Validation locale **réussie** avec un **nouveau volume PostgreSQL**.

Stack testée :

- `postgres`
- `redis`
- `api`
- `frontend` (`peintre-nano`)

Contrôles effectués :

- `docker compose -p jarvos_recyclique_pg15fresh up --build -d`
- `docker compose -p jarvos_recyclique_pg15fresh ps`
- `GET http://localhost:8000/health` → `200 OK`
- `GET http://localhost:4444` → `200 OK`
- vérification visuelle utilisateur : frontend OK, Swagger OK

## Point important — PostgreSQL 15 vs 16

Le premier test a échoué non pas à cause de `peintre-nano`, mais à cause d'un **volume Docker Postgres existant initialisé en 16** alors que le dépôt référence **PostgreSQL 15** partout.

Erreur observée :

`The data directory was initialized by PostgreSQL version 16, which is not compatible with this version 15`

Conclusion pratique :

- la référence du repo reste **PostgreSQL 15**
- pour tester localement sans casser l'existant, utiliser un **nouveau projet Compose** / **nouveau volume**
- ne pas réutiliser à l'aveugle un volume local déjà créé en 16 avec cette stack

## Commandes utiles

Lancer la stack de validation avec volume neuf :

```powershell
docker compose -p jarvos_recyclique_pg15fresh up --build -d
```

Vérifier les services :

```powershell
docker compose -p jarvos_recyclique_pg15fresh ps
```

Arrêter et nettoyer la stack de validation :

```powershell
docker compose -p jarvos_recyclique_pg15fresh down
```

## Portée

Cette validation couvre le **dev local**.

Le déploiement / staging reste transitoirement branché sur le frontend legacy tant qu'un chantier dédié ne l'a pas migré.
