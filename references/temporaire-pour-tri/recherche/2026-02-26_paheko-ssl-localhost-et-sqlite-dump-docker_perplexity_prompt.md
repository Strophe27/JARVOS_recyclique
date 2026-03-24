# Prompt recherche Perplexity — Paheko : erreur SSL localhost + démarrer avec un SQLite existant

**Date :** 2026-02-26  
**Usage :** Copier-coller dans Perplexity (ou coller le bloc « Question » après avoir chargé le contexte projet si besoin).

---

## Contexte court (optionnel à coller en tête)

Projet JARVOS RecyClique : stack Docker avec RecyClique (FastAPI, port 8000), Paheko (image officielle `paheko/paheko`, port 8080), PostgreSQL, Redis. RecyClique en http://localhost:8000 fonctionne. Paheko est servi en http://localhost:8080 mais le navigateur affiche une erreur SSL. On souhaite aussi faire démarrer le conteneur Paheko avec un fichier SQLite existant (dump / sauvegarde) pour éviter de refaire l’onboarding.

---

## Question à envoyer à Perplexity

**1) Erreur SSL sur localhost avec Paheko (Docker) uniquement**

En local, avec Docker Compose :
- **RecyClique** (FastAPI) sur **http://localhost:8000** : la page s’affiche correctement (pas d’HTTPS).
- **Paheko** (image Docker officielle `paheko/paheko`, port **8080** mappé vers 80 dans le conteneur) sur **http://localhost:8080** : le navigateur affiche systématiquement « Ce site ne peut pas fournir de connexion sécurisée », « Localhost a envoyé une réponse incorrecte », **Erreur SSL / ERR_SSL_PROTOCOL_ERROR**.

Pourquoi cette erreur SSL apparaît-elle uniquement pour Paheko (localhost:8080) et pas pour RecyClique (localhost:8000) ? Causes possibles : redirection HTTP → HTTPS côté Paheko/PHP, en-têtes ou configuration du serveur web dans l’image `paheko/paheko`, navigateur qui force HTTPS sur certains ports, ou différence de configuration entre les deux services. Comment diagnostiquer et corriger pour accéder à Paheko en **http** sur localhost:8080 sans erreur SSL ?

**2) Démarrer Paheko (Docker) avec un fichier SQLite existant**

Paheko utilise SQLite ; le chemin des données dans l’image officielle est en général **/var/www/paheko/data/** et le fichier de base s’appelle **association.sqlite**. J’ai déjà un fichier SQLite (dump ou sauvegarde) avec toutes mes données et identifiants, et je ne veux pas refaire la procédure d’onboarding.

Comment faire pour que le conteneur Paheko démarre avec ce fichier SQLite existant ? Options à couvrir : monter le fichier (ou un volume) au bon chemin dans le conteneur, renommer le fichier en `association.sqlite` si besoin, permissions et propriétaire (www-data), et éventuellement initialisation au premier démarrage (entrypoint / script) qui copie le fichier dans `/var/www/paheko/data/` si le volume est vide. Donner les étapes concrètes pour Docker / Docker Compose (volumes, commande ou entrypoint) afin que Paheko utilise dès le premier démarrage ma base SQLite existante.

---

## Résumé des réponses à conserver

Après la recherche, créer un fichier **reponse** dans `references/recherche/` :  
`2026-02-26_paheko-ssl-localhost-et-sqlite-dump-docker_perplexity_reponse.md`  
et mettre à jour `references/recherche/index.md`.
