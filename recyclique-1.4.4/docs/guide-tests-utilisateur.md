# 🧪 Guide de Tests Utilisateur - Interface Admin (Mis à jour le 15/09/2025)

Ce guide simple vous permet de tester les fonctionnalités d'administration du projet.

## 📋 **Prérequis**

- **Docker Desktop** installé et démarré.
- Avoir rempli le fichier `.env` à la racine du projet (copié depuis `env.example`).

---

## 🚀 **Étape 1 : Démarrer l'Application (Une Seule Commande)**

Ouvrez un terminal à la racine du projet et lancez :

```bash
docker-compose up -d --build
```

Cette commande va construire et démarrer tous les services en arrière-plan. Attendez quelques instants que les services se stabilisent.

**✅ Vérifications :**
- L'API doit être accessible sur http://localhost:8000/docs
- Le Frontend doit être accessible sur http://localhost:5173

**🔴 En cas de problème avec le Frontend :**
Si le frontend n'est pas accessible, lancez la commande suivante pour voir les logs et identifier l'erreur :

```bash
docker-compose logs -f frontend
```
Copiez le message d'erreur et transmettez-le pour analyse.

---

## 👨‍💼 **Étape 2 : Créer Votre Compte Super-Admin**

Ouvrez un **nouveau terminal** et lancez la commande suivante pour créer votre compte administrateur :

```bash
docker compose exec api sh /app/create_admin.sh admin_test mot_de_passe_securise
```

(Remplacez `admin_test` / `mot_de_passe_securise` par les valeurs souhaitées — aligné sur le `README.md` racine du dossier livrable.)

**✅ Résultat attendu :** Un message confirmant la création du super-admin.

---

## 🔐 **Étape 3 : Tester l'Interface d'Administration**

1.  **Connectez-vous :** Allez sur http://localhost:5173, ouvrez la page de connexion et connectez-vous avec le **nom d’utilisateur** et le **mot de passe** définis à l’étape 2.

2.  **Gérez les Utilisateurs :** Allez dans la section de gestion des utilisateurs. Vous devriez voir votre propre compte. Si d'autres utilisateurs sont en attente, vous pouvez tester les fonctionnalités d'approbation et de rejet.

3.  **Vérifiez la Cohérence des Données :** La fonctionnalité de génération de code (`codegen`) est maintenant active. Cela signifie que les données affichées dans l'interface devraient être parfaitement cohérentes avec ce que l'API fournit. Vous pouvez le vérifier en ouvrant les outils de développement de votre navigateur (F12) dans l'onglet "Réseau" pour inspecter les réponses de l'API.

--- 

## ✅ **Étape 4 : Lancer les Tests Automatisés (Optionnel)**

Si vous souhaitez vérifier la santé du projet via les tests automatisés, ouvrez un nouveau terminal :

```bash
# Lancer les tests du Backend
docker-compose exec api pytest

# Lancer les tests du Frontend
docker-compose exec frontend npm test
```

**✅ Résultat attendu :** Toutes les suites de tests s'exécutent avec succès.

--- 

**Félicitations ! Si ces étapes fonctionnent, l'interface d'administration est pleinement opérationnelle.**
