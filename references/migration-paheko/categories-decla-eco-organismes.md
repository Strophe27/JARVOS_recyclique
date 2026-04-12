**\[insatuction agent\] : matière pour le développement du module décla eco-organismes (nécessite un sous-dossier ??)**

**Guide des Filières REP pour les Déclarations d'Éco-Contribution : Classification des Produits et Outils Disponibles** 

**Machine à écrire : Quelle filière ?** 

Les machines à écrire électriques ou électroniques relèvent de la **filière DEEE (Déchets d'Équipements Électriques et Électroniques)**. Cette classification est explicitement mentionnée dans les textes réglementaires comme faisant partie du champ d'application DEEE.\[^1\]\[^2\] 

Pour l'éco-contribution, une machine à écrire électrique doit être déclarée auprès d'un éco organisme spécialisé dans les DEEE. Les principaux éco-organismes compétents pour cette catégorie sont **Ecologic** et **Ecosystem**, qui gèrent respectivement les équipements informatiques et de télécommunications (catégories 5 et 6 des DEEE). Si la machine à écrire est mécanique (entièrement non électrique), elle n'entre pas dans le champ de responsabilité élargie du producteur DEEE.\[^3\] 

**Luminaire dans les PAM (Produits d'Ameublement Meubles) : Précisions essentielles** 

La situation des luminaires est plus nuancée et dépend fortement de sa nature et de son intégration : 

**Lampes et ampoules isolées** : Une simple ampoule (fluocompacte, LED, halogène, etc.) relève de la **filière DEEE spécifique des lampes**, gérée par **Ecosystem**. Cette filière est distincte et dispose de ses propres points de collecte spécialisés.^4 

**Luminaires complets** (appareil d'éclairage autonome) : Un luminaire fonctionnant à l'électricité est classé en **filière DEEE, catégorie 5** (équipements informatiques et de télécommunications). Il doit être déclaré auprès d'Ecologic ou Ecosystem.^5 

**Luminaires intégrés à un meuble de décoration** : C'est ici que la confusion se manifeste. Si le luminaire est un **élément intégré à un meuble de décoration textile** (par exemple, une applique murale ou un élément de décoration lumineux intégré à un textile), il peut relever de la **filière EA (Éléments d'Ameublement)** gérée par **Ecomaison**. Cependant, cette classification reste spécifique : elle concerne principalement les éléments de décoration textile amovibles apportant une décoration des murs, sols et fenêtres, composés essentiellement de textiles.^6  
En pratique, pour éviter l'erreur : **un luminaire avec fonction électrique principale reste généralement DEEE**, même s'il est destiné à décorer un espace. Le classement en éléments d'ameublement ne s'applique que si le luminaire est un composant secondaire d'un élément textile de décoration. 

**Documentation officielle et outils d'aide pour les bénévoles** 

**Ressources documentaires disponibles** 

**La plateforme officielle de référence : filieres-rep.ademe.fr**^8 

C'est la source documentaire officielle la plus complète. Elle contient : 

Les cahiers des charges de chaque filière (arrêtés officiels) 

Les listes de produits par filière 

Les barèmes d'éco-contribution 

Les objectifs réglementaires 

Les données de performances des filières 

Cette ressource est directement accessible et mise à jour régulièrement, notamment pour suivre les évolutions de la loi AGEC. 

**Guides spécifiques des éco-organismes**^9 

Chaque éco-organisme met à disposition des guides détaillés : 

**Ecomaison** publie un guide annuel des adhérents avec liste complète des produits et codes de tarification 

**Ecologic** et **Ecosystem** proposent des documents PDF de classification spécifiques à leurs filières 

Ces guides sont accessibles directement sur les sites des éco-organismes **L'outil "Que faire de mes objets & déchets" (ADEME)**^10 

Cet assistant au tri est un outil public gratuit disponible à quefairedemesdechets.ademe.fr. Il fonctionne selon le principe suivant : 

L'utilisateur saisit le nom d'un objet ou d'un déchet dans une barre de recherche L'outil retourne les consignes de tri, les alternatives (réparation, don, réemploi) Il localise les points de collecte, réparation et réemploi les plus proches géographiquement  
Cet outil s'appuie sur les données nationales de l'ADEME complétées par celles des éco organismes. Il peut être **intégré via iFrame sur d'autres sites web**, ce qui le rend potentiellement adaptable pour une utilisation spécifique. 

**L'absence de chatbot officiel intelligent** 

**Question importante soulevée : existe-t-il un chatbot officiel pour identifier automatiquement les filières ?** 

**Réponse : Non, pas actuellement**. Il n'existe pas de chatbot IA avancé officiel permettant de poser directement des questions en langage naturel du type "je suis avec une machine à écrire, quel éco-organisme dois-je contacter ?" et obtenir une réponse instantanée et fiable.^12 

Les outils actuels sont : 

**"Que faire de mes objets & déchets"** : simple moteur de recherche par nom d'objet, sans logique conversationnelle 

**SYDEREP** : système déclaratif réservé aux producteurs/éco-organismes enregistrés, pas un outil de consultation publique 

**Filieres-rep.ademe.fr** : documentation textuelle complète mais sans interface de recherche intelligente 

**Est-ce qu'on peut imaginer un chatbot d'aide ?** 

**Oui, absolument**, et c'est une idée pertinente pour les ressourceries et structures de l'économie sociale. Voici les éléments qui permettraient de développer cela : 

**Données disponibles et accessibles** : Les données nécessaires existent et sont partiellement en open data : 

Cahiers des charges complets des filières (documents publics) 

Listes de produits par filière (publiées par ADEME et éco-organismes) 

Arrêtés officiels listant les classifications 

Données des éco-organismes (adhérents, tarifs, périmètres) 

**Architecture technique envisageable** : Un système de type **RAG (Retrieval-Augmented Generation)** pourrait être développé : 

Une base de données structurée des filières REP et de leurs produits 

Un moteur de recherche intelligente utilisant l'IA conversationnelle 

Une interface accessible aux bénévoles, producteurs et citoyens 

Des mises à jour régulières alignées avec les changements réglementaires  
**Défis à résoudre** : 

Maintenir à jour une base de données qui évolue avec la loi AGEC (nouvelles filières, changements de périmètre) 

Gérer les cas limites et ambiguïtés (comme le luminaire intégré à un meuble) Assurer la responsabilité légale des réponses fournies 

Garantir que le système ne remplace pas le conseil direct des éco-organismes pour les cas complexes 

**Exemple d'utilisation pour les bénévoles** : Un tel outil permettrait rapidement de répondre aux questions type "c'est quelle filière ?" lors de la préparation de déclarations, accélérant considérablement le processus de tri documentaire. 

**Ressources pratiques à utiliser immédiatement** 

| Besoin  | Ressource  | Accès |
| :---- | ----- | ----- |
| **Classification rapide d'un produit** | "Que faire de mes objets & déchets" (ADEME)  | quefairedemesdechets.ademe.fr^13 |
| **Documentation  officielle complète** | Filieres-rep.ademe.fr  | filieres-rep.ademe.fr^8 |
| **Guides spécifiques Ameublement** | Guide adhérent Ecomaison 2025 | ecomaison.com^9 |
| **Classification DEEE détaillée** | Cahiers des charges ou  guides Ecologic/Ecosystem  | Leurs sites officiels |
| **Cas complexes ou questions précises** | Contact direct éco  organismes | Ecomaison / Ecologic / Ecosystem |

**Conclusion** 

Pour les déclarations aux éco-organismes, il existe une documentation officielle complète et structurée, mais elle demande une certaine familiarité avec le cadre réglementaire AGEC. L'outil "Que faire de mes objets & déchets" constitue un bon point d'entrée pour les cas simples. Pour un usage systématique par les bénévoles et les ressourceries, le développement d'un chatbot basé sur les données ADEME existantes serait une amélioration significative, permettant d'automatiser les réponses de routine et de réduire les erreurs de classification lors des déclarations.  
⁂ 

\[^1\]: �� \_\_RecyClique \- Système RAG Intelligent \_ Dossier.pdf \[^2\]: Comment les ressourceries doivent peuvent faire po.pdf \[^3\]: Paheko RecyClique.md 

\[^21\]: https://www.ess-france.org/system/files/inline-files/Livret REP et ESS\_Ecomaison\_Ameublement\_VF.pdf