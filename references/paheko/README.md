# Paheko — Référence pour JARVOS Recyclique



Ce dossier sert de **guide et référence** pour Paheko (gestion d'association : compta, membres, site web, bénévolat), futur backend / intégration envisagée pour RecyClique (voir migration-paheko).



---



## Source du code dans `repo/`



Le dossier `repo/` contient l'**archive de distribution officielle** Paheko (Fossil), et non un clone Git.



- **Source des archives** : [fossil.kd2.org/paheko/uv/](https://fossil.kd2.org/paheko/uv/) (liste des versions) — téléchargement direct des `.tar.gz` (ex. `paheko-1.3.19.tar.gz`).

- **Version actuellement utilisée** : **1.3.19** (archive `paheko-1.3.19.tar.gz`).

- **Plugins / modules officiels** : inclus dans cette archive. Les extensions (dont **Saisie au poids**, `saisie_poids`) se trouvent dans `repo/modules/`. La source de vérité pour les plugins est [fossil.kd2.org/paheko-plugins](https://fossil.kd2.org/paheko-plugins) ; l'archive bundle officielle les inclut déjà.



**Miroir GitHub** : [github.com/paheko/paheko](https://github.com/paheko/paheko) — peut être en retard par rapport à Fossil ; pour le core et les plugins, privilégier l'archive Fossil (uv) ou le dépôt Fossil.



---



## Récupérer / mettre à jour le code dans `repo/`



Le dossier `repo/` est **gitignore** (référence locale uniquement).



1. Supprimer le contenu de `references/paheko/repo/` (ou le dossier `repo/`).

2. Télécharger la dernière archive stable depuis [fossil.kd2.org/paheko/uv/](https://fossil.kd2.org/paheko/uv/) (ex. `paheko-1.3.19.tar.gz`).

3. Extraire l'archive : le contenu du dossier unique (ex. `paheko-1.3.19/`) doit être placé **dans** `repo/` pour que `repo/modules/`, `repo/www/`, etc. existent directement (ne pas laisser le dossier versionné à la racine de `repo/`).



---



## Documentation Paheko



- **Site / doc** : [fossil.kd2.org/paheko](https://fossil.kd2.org/paheko) → Wiki → Documentation (installation, configuration, extensions, doc développeur).

- **Aide utilisateur** : [paheko.cloud/aide](https://paheko.cloud/aide).

- **Essai gratuit** : [Paheko.cloud](https://paheko.cloud/).



---



## Utilisation pour JARVOS Recyclique



- Analyser l'API, les extensions et le modèle de données pour l'intégration RecyClique / Paheko.

- Croiser avec les documents dans **references/migration-paheko/** (guides, TODO, CR réunions).

