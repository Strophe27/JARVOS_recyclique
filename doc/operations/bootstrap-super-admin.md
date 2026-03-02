# Bootstrap super_admin — Documentation opérationnelle

**Story 17-HF-4 (AT-005)** — Création du premier super_admin sans accès BDD direct.

## Commande

```bash
docker compose exec recyclic python api/scripts/bootstrap_superadmin.py USERNAME
```

- **USERNAME** : nom d'utilisateur à créer ou à promouvoir en `super_admin`.

## Cas d'usage

### 1. Premier super_admin (utilisateur inexistant)

L'utilisateur est créé avec :

- `username` = argument fourni
- `email` = `{username}@bootstrap.local`
- `role` = `super_admin`
- `status` = `active`
- `password` = **généré aléatoirement** et affiché une seule fois sur stdout

**Exemple :**

```
$ docker compose exec recyclic python api/scripts/bootstrap_superadmin.py admin_principal
super_admin créé : admin_principal (email=admin_principal@bootstrap.local)

Mot de passe généré (à changer dès le premier login) :
xK9mN2pQ7vR4sT8wY1zA3bC5dE6fG8hJ0
```

**Important :** Recopier immédiatement le mot de passe affiché. Il n'est pas stocké en clair et ne peut pas être récupéré.

### 2. Promotion d'un utilisateur existant

Si l'utilisateur existe déjà (ex. `admin`), le script le promeut en `super_admin` sans toucher à son mot de passe.

```
$ docker compose exec recyclic python api/scripts/bootstrap_superadmin.py admin
utilisateur promu super_admin : admin
```

### 3. Idempotence (super_admin déjà existant)

Si l'utilisateur est déjà `super_admin`, le script affiche un message informatif et ne modifie rien.

```
$ docker compose exec recyclic python api/scripts/bootstrap_superadmin.py admin_principal
super_admin déjà existant : admin_principal
```

## Changer le mot de passe après premier login

1. Se connecter au front (`/login`) avec le username et le mot de passe affiché.
2. Aller dans le profil ou les paramètres du compte pour modifier le mot de passe.
3. (Optionnel) Remplacer l'email `{username}@bootstrap.local` par un email réel dans l'administration utilisateurs.

## Vérification

Après bootstrap, se connecter au front et accéder à `/admin`. Les cartes/zones réservées aux super_admin (ex. `/admin/health`, `/admin/settings`, `/admin/sites`) doivent être visibles et accessibles.
