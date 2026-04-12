# Spécification d’intégration HelloAsso ↔ RecyClique ↔ Paheko

## 1. Objectif et rôle de chaque brique

L’objectif est de faire de RecyClique l’interface principale pour les utilisateurs (adhérents, bénévoles, administrateurs), tout en déléguant :
- la **prise de paiement en ligne** (adhésions, dons, crowdfunding, billetterie) à HelloAsso ;
- la **gestion métier associative et la comptabilité** à Paheko ;
- la **coordination, la logique métier spécifique ressourcerie et l’orchestration des flux** à RecyClique.[^1][^2]

L’interface web/app utilisée par les humains est RecyClique. Paheko est exploité uniquement via son API REST, et l’extension HelloAsso de Paheko (réservée au cloud) n’est pas utilisée.[^3][^4]

## 2. Vue d’ensemble de l’architecture

### 2.1. Schéma logique des flux

- **HelloAsso** :
  - Fournit une API REST v5 (et un Swagger complet) accessible sur `https://api.helloasso.com/v5` en production et `https://api.helloasso-sandbox.com/v5` en sandbox.[^5][^1]
  - Utilise OAuth2 client credentials pour l’authentification.[^6][^1]
  - Propose des webhooks (URL de notification) pour notifier en temps quasi réel les nouveaux paiements/commandes.[^7][^8]

- **RecyClique (middleware)** :
  - Expose sa propre API (FastAPI ou autre) et une interface web/app.[^9]
  - Gère l’authentification utilisateur finale, les écrans d’adhésion, de dons et de suivi des campagnes.
  - Appelle l’API HelloAsso pour :
    - créer/afficher des formulaires de paiement (via Checkout) ;
    - récupérer les organisations, formulaires, commandes, membres ;
    - consommer les webhooks HelloAsso.
  - Appelle l’API Paheko pour :
    - créer/mettre à jour les fiches membres ;
    - importer des listes de membres ;
    - créer des écritures comptables si nécessaire.[^10][^3]

- **Paheko** :
  - Fournit une API REST HTTP(s) authentifiée en Basic Auth, avec des chemins comme `/api/user/new`, `/api/user/import`, `/api/accounting/transaction`.[^3]
  - Gère la base de données "membres" et la comptabilité (plans comptables, journaux, écritures, exports, etc.).[^3]

### 2.2. Orientation des flux

Flux principal recommandé : **HelloAsso → RecyClique → Paheko**.
- L’utilisateur final ne manipule que les écrans RecyClique.
- HelloAsso ne sert que de passerelle de paiement / collecte.
- Paheko est la "source de vérité" côté gestion associative et comptable.

## 3. Capacités de l’API HelloAsso utiles pour RecyClique

### 3.1. Authentification et périmètres

- Base URL :
  - Production :
    - Auth : `https://api.helloasso.com/oauth2`
    - API : `https://api.helloasso.com/v5`
  - Sandbox :
    - Auth : `https://api.helloasso-sandbox.com/oauth2`
    - API : `https://api.helloasso-sandbox.com/v5`.[^2][^6]

- Authentification : **OAuth 2.0 – client credentials**.
  - Requête type pour obtenir un token :
    ```bash
    curl -X POST https://api.helloasso.com/oauth2/token \
      -H "Content-Type: application/x-www-form-urlencoded" \
      -d "grant_type=client_credentials" \
      -d "client_id=YOUR_CLIENT_ID" \
      -d "client_secret=YOUR_CLIENT_SECRET"
    ```
    La réponse contient `access_token`, `token_type`, `expires_in`.[^11][^6]

- Droits typiques pour une association :
  - `AccessPublicData` – lire les infos publiques (organisations, formulaires publics) ;
  - `AccessTransactions` – lire les commandes/paiements ;
  - `Checkout` – utiliser le flux de paiement intégré Checkout.[^6]

### 3.2. Principaux blocs fonctionnels de l’API v5

Le panorama officiel présente :
- un **noyau API v5** pour : organisations, formulaires, commandes, items (produits, options), membres, etc. ;
- un **Checkout API** pour l’intégration du paiement dans des interfaces personnalisées ;
- des **webhooks** pour recevoir les événements d’ordres/paiements.[^12][^1][^5]

L’API de référence détaillée est accessible via Swagger : `https://api.helloasso.com/v5/swagger/ui/index`.[^11][^12]

### 3.3. Endpoints clés pour la gestion des adhésions et paiements

Les endpoints exacts peuvent varier, mais la documentation décrit les grands ensembles suivants :[^1][^5][^12]

- **Organisations**
  - `GET /organizations/{organizationSlug}` : informations générales de l’association.

- **Formulaires (forms)**
  - `GET /organizations/{organizationSlug}/forms` : liste des formulaires (adhésion, don, billetterie, crowdfunding…).
  - `GET /organizations/{organizationSlug}/forms/{formSlug}` : détails d’un formulaire.

- **Commandes et transactions (orders)**
  - `GET /organizations/{organizationSlug}/orders` : liste des commandes (adhésions, dons, billets, etc.).
  - `GET /organizations/{organizationSlug}/orders/{orderId}` : détails d’une commande, incluant :
    - `payer` (nom, prénom, email, téléphone, adresse) ;
    - `items` (type : MEMBERSHIP, DONATION, EVENT, etc., montants, quantités) ;
    - `payments` (état, date, montant, moyen de paiement) ;
    - `customFields` (champs complémentaires paramétrés dans le formulaire).[^13][^14][^12]

- **Items**
  - `GET /organizations/{organizationSlug}/items` : liste des "objets" vendus (ex. options de billets, tailles de tee-shirt, niveaux de cotisation), utile pour des rapports ou des synchronisations fines.[^12]

- **Membres/adhésions**
  - Les adhésions sont généralement représentées par des `items` ou des sous-entités de type MEMBERSHIP dans les commandes.
  - Ces structures contiennent les données nécessaires pour créer/mettre à jour les fiches membres dans RecyClique puis Paheko (identité, email, éventuels champs spécifiques type date de naissance…).[^14][^12]

### 3.4. Webhooks HelloAsso

HelloAsso permet de définir une **URL de notification** dans le backoffice association (menu "Mon compte" → "Intégrations et API").[^8][^15][^7]

- À chaque nouvelle action (validation d’un formulaire d’adhésion, nouvelle commande, nouveau paiement), HelloAsso envoie une notification HTTP POST vers cette URL.[^16][^7]
- Ce mécanisme est utilisé pour se connecter à Make, Pipedream, etc., et est donc adapté à un middleware comme RecyClique.[^15][^7][^16]
- La documentation officielle des notifications décrit les types d’événements (ex. `Order.Created`, `Order.Updated`, `Order.Refunded`) et le contenu du payload.[^17][^7]

### 3.5. Capacité de Checkout (paiement intégré)

Le **Checkout API** permet :[^5][^12]
- De générer un **checkout intent** côté serveur (RecyClique API), lié à un formulaire HelloAsso existant.
- De rediriger l’utilisateur vers une page de paiement HelloAsso hébergée, ou d’intégrer un widget / iframe selon les possibilités actuelles.
- De recevoir un retour (`returnUrl`) avec un statut de réussite/échec.
- De valider côté serveur le résultat en interrogeant `GET /organizations/{organizationSlug}/checkout-intents/{checkoutIntentId}` pour rattacher l’ordre créé.

Cela permet d’avoir RecyClique comme interface d’initiation (bouton "Payer ma cotisation"), tout en s’appuyant sur HelloAsso pour le parcours carte bancaire.

**Implémentation — points à figer côté dev (complément 2026-04-12, revue Perplexity + projet) :**

1. **`metadata` sur le checkout intent** — champ JSON optionnel (libellé documentaire HelloAsso : métadonnées associées à l’intent, typiquement **jusqu’à ~20 000 caractères** selon la doc d’overview). Y placer au minimum l’**identifiant interne Recyclique** (utilisateur, panier, ou contexte métier) pour **réconcilier** sans ambiguïté au retour sur `returnUrl` et lors du traitement **webhook**, sans devoir deviner le payeur uniquement à partir des champs HelloAsso.

2. **`redirectUrl` (ou équivalent retourné par l’API)** — la redirection vers HelloAsso n’est **valable qu’un court laps de temps** (ordre de grandeur **15 minutes** selon la doc d’overview). **Ne pas** générer l’intent trop longtemps avant le clic utilisateur ; **ne pas** mettre cette URL en **cache** comme lien permanent côté client ou dans un e-mail différé sans régénération.

### 3.6. Limites d’appels documentées (authentification)

- La page officielle [Limite d’appels API](https://dev.helloasso.com/docs/limitation-api), **lue intégralement dans le navigateur en avril 2026**, ne chiffre explicitement les paliers (10 / 10 s, 20 / 10 min, 50 / h) que pour l’**endpoint d’authentification** (`/oauth2/token` — obtention ou renouvellement de jeton), et non pour chaque route REST métier (`/orders`, `/forms`, etc.) sur cette même page.
- **En pratique Recyclique :** mettre en **cache** l’`access_token` (durée de vie courte, typiquement ~30 min) et utiliser le **`refresh_token`** pour renouveler sans rappeler en boucle `client_credentials` ; ainsi les plafonds auth ne deviennent pas un risque opérationnel.
- **Prudence :** la doc rappelle aussi la possibilité de **429** en cas de trafic excessif ; conserver **webhooks + sobriété d’appels + backoff** comme architecture saine, et rester prêt à ajuster si HelloAsso publie des plafonds chiffrés supplémentaires ailleurs.

## 4. Capacités de l’API Paheko utiles pour RecyClique

La documentation d’API de Paheko décrit une API REST authentifiée, dont les chemins peuvent varier suivant la version mais offrent notamment :[^18][^3]

### 4.1. Authentification

- Authentification **HTTP Basic** :
  - Identifiant / mot de passe configurés dans Paheko : menu *Configuration → Fonctions avancées → API*.[^3]
- URL générique : `https://mon-association.tld/api/{chemin}/`.[^3]

### 4.2. Gestion des membres

- **Créer un membre** :
  - `POST /api/user/new` (form-data ou JSON) ; les champs acceptés incluent : nom, prénom, email, adresse, catégorie, mot de passe, etc.[^3]
  - Si un membre du même nom existe déjà et que `force_duplicate` n’est pas utilisé, Paheko renvoie une erreur HTTP 409.[^3]
  - **Déduplication (complément 2026-04-12) :** le conflit **409** documenté côté Paheko porte sur une correspondance de **nom** (homonymie), **pas** sur l’email comme clé unique. Pour un flux HelloAsso où l’**email** est la clé métier naturelle, le middleware doit **rechercher un membre existant par email avant création** (par ex. via `POST /api/sql` en **SELECT** uniquement, selon les règles et versions Paheko), ou réutiliser un **`paheko_user_id`** déjà stocké dans RecyClique après première création — afin d’éviter les surprises en production.

- **Importer des membres en masse** :
  - `PUT /api/user/import` ou `POST /api/user/import` avec un fichier CSV et des paramètres `mode` (`auto`, `create`, `update`…), `column[x]=nom_champ`, `skip_lines=0`.[^3]
  - Permet de mapper les colonnes du CSV aux champs de la fiche membre (nom, adresse, etc.).[^3]

Ces capacités sont utiles pour synchroniser les adhérents HelloAsso comme membres Paheko, soit un par un, soit par lots.

### 4.3. Comptabilité

- **Créer une écriture comptable** :
  - `POST /api/accounting/transaction` avec les paramètres correspondant à un journal, un exercice (`id_year`), une date, un libellé, et les lignes (comptes débit/crédit, montants).[^3]
- **Journal, comptes, exports** :
  - Plusieurs endpoints permettent de consulter le journal, les plans de comptes et d’exporter des données, ce qui peut servir pour des rapports consolidés côté RecyClique.[^3]

### 4.4. Extensions et modules

- Paheko permet d’ajouter des fonctionnalités via des **modules** (extensions), écrits en Brindille et PHP ; ces modules peuvent aussi exposer leurs propres routes et vues.[^18]
- Pour RecyClique, le plus simple reste de considérer Paheko comme un service back-end neutre, et de concentrer la logique métier dans RecyClique, tout en laissant à Paheko la gestion interne de ses modules (caisse, stock, etc.).[^18]

## 5. Cas d’usage cibles pour RecyClique

### 5.1. Cas 1 – Un adhérent paye sa cotisation via RecyClique/HelloAsso

1. L’utilisateur se connecte/s’identifie sur RecyClique (ou saisit ses infos sur un formulaire RecyClique).
2. Il clique sur "Payer ma cotisation".
3. RecyClique (backend) :
   - crée ou récupère un **checkout intent** chez HelloAsso pour le formulaire d’adhésion concerné ;
   - redirige l’utilisateur vers l’URL de checkout HelloAsso, ou affiche un composant de paiement selon l’intégration utilisée.[^5][^12]
4. L’utilisateur final saisit ses infos de paiement sur HelloAsso et valide.
5. HelloAsso redirige vers la `returnUrl` fournie à la création du checkout intent, avec un statut.
6. En parallèle, HelloAsso envoie un **webhook** `Order.Created` et/ou `Order.Updated` vers l’URL de notification de RecyClique.[^7][^15]
7. RecyClique :
   - vérifie via l’API HelloAsso le détail de la commande associée (payer, items, paiements, champs complémentaires) ;[^14][^12]
   - crée ou met à jour l’adhérent dans sa base interne ;
   - pousse la fiche membre correspondante dans Paheko via `user/new` ou `user/import` (mode automatique) ;[^3]
   - en option, crée une écriture comptable dans Paheko (ex. débit 512 banque / crédit 756 dons ou 7xx cotisations) via `accounting/transaction`.[^3]

### 5.2. Cas 2 – Synchronisation périodique des adhérents HelloAsso

Même sans utiliser les webhooks, RecyClique peut implémenter une synchronisation planifiée :

1. Cron ou tâche périodique dans RecyClique :
   - appelle `GET /organizations/{organizationSlug}/orders` ou les endpoints d’adhésions correspondants ;[^1][^12]
2. Parcourt les commandes depuis la dernière date connue ;
3. Pour chaque commande de type adhésion :
   - extrait les infos du payeur et des champs complémentaires ;[^12][^14]
   - met à jour les fiches membres dans RecyClique et Paheko (création/MAJ) ;[^3]
   - enregistre, si nécessaire, des écritures comptables.

### 5.3. Cas 3 – Crowdfunding et dons

1. L’association crée des **campagnes de dons/crowdfunding** dans HelloAsso.
2. RecyClique interroge `GET /organizations/{organizationSlug}/forms` pour lister ces campagnes et leurs montants collectés, objectifs, etc.[^12]
3. RecyClique affiche dans son interface :
   - les campagnes actives ;
   - le total collecté, le nombre de contributeurs et le pourcentage de l’objectif atteint.
4. Pour chaque nouveau don :
   - réception d’un webhook HelloAsso ;[^17][^7]
   - récupération du détail de la commande/don ;
   - enregistrement des informations de donateur dans RecyClique ;
   - création d’une écriture comptable dans Paheko si souhaité.[^3]

### 5.4. Cas 4 – Billetterie et événements

- Même logique que pour les adhésions et dons, en utilisant les formulaires de type événement (billetterie) dans HelloAsso.[^5][^12]
- RecyClique peut :
  - afficher les événements ;
  - suivre les inscrits ;
  - synchroniser certaines informations comme des listes d’émargement ou des statistiques.

## 6. Design de l’intégration côté RecyClique (middleware)

### 6.1. Stockage et modèles internes

Il est utile de prévoir des modèles internes dans RecyClique pour :

- **Organisation HelloAsso** :
  - `ha_organization_slug`
  - identifiant interne RecyClique ↔ Paheko.

- **Utilisateur/adhérent** :
  - identifiant interne RecyClique ;
  - `ha_payer_id` / `ha_member_id` ;
  - `paheko_user_id` ou `paheko_user_num` ;
  - données de contact (email, téléphone, adresse) ;
  - statut d’adhésion.

- **Commande/paiement** :
  - `ha_order_id` ;
  - type (adhésion, don, événement…) ;
  - montant, devise ;
  - état (PROCESSED, REFUNDED…) ;
  - référence comptable Paheko (id transaction, id écriture) si créée.

### 6.2. Service HelloAsso dans RecyClique

Un service/"client" HelloAsso peut abstraire :

- la gestion du token OAuth2 (récupération, cache en mémoire, rafraîchissement) ;[^6][^11]
- la récupération de :
  - `organizations/{slug}` ;
  - `forms` ;
  - `orders` et détails associés ;
  - `items` ;[^1][^12]
- la création et la gestion des **checkout intents** (si usage du Checkout API).[^5]

### 6.3. Service Paheko dans RecyClique

Un service "PahekoClient" encapsule :

- l’auth Basic (user/pass) ;
- les appels :
  - `user/new` pour créer un membre ;
  - `user/import` pour les imports de masse ;
  - `accounting/transaction` pour les écritures.[^3]

Il peut inclure :
- des stratégies de déduplication des membres alignées sur **§4.2** (email comme clé métier côté HelloAsso vs **409 nom** côté Paheko — recherche préalable par **email**, ex. `/api/sql` SELECT, ou réutilisation de `paheko_user_id`) ;
- des mappings de catégories (ex. catégorie "Adhérent RecyClique" ↔ id_category Paheko).

### 6.4. Endpoint webhooks HelloAsso côté RecyClique

Un endpoint du type `/webhooks/helloasso` :

- reçoit les notifications POST de HelloAsso ;[^15][^7]
- vérifie éventuellement une signature ou un secret (si proposé par HelloAsso) ;[^7][^17]
- identifie le type d’événement (`Order.Created`, etc.) ;
- va chercher le détail de la commande via l’API HelloAsso ;[^13][^12]
- exploite le **lien métier** conservé à la création du checkout (**`metadata`** côté intent, cf. §3.5) pour rattacher vite le bon contexte Recyclique ;
- appelle les services internes pour :
  - mettre à jour (ou créer) l’adhérent dans RecyClique ;
  - synchroniser dans Paheko ;
  - loguer l’événement.

### 6.5. Flux d’erreurs et résilience

- Gestion des erreurs réseau/HTTP sur HelloAsso (timeouts, 5xx) et Paheko ;
- Gestion des cas où Paheko renvoie 409 (doublon de membre) :
  - stratégie de recherche d’un membre existant par email ou par numéro ;
  - mise à jour plutôt que création si possible.[^3]
- File de messages / jobs asynchrones (ex. file Redis, worker) pour rejouer les synchronisations en cas d’incident.

## 7. Limites, précautions et bonnes pratiques

- **Sécurité** :
  - Ne jamais exposer les `client_id` / `client_secret` HelloAsso côté front ;[^6]
  - Protéger l’endpoint webhook (secret, IPs, etc.).[^17][^7]

- **Cohérence des données** :
  - Définir des règles claires : la "vérité" sur l’adhésion (statut, date de fin) est-elle dans RecyClique, dans HelloAsso, ou dans Paheko ?
  - En général, on considère : paiement validé dans HelloAsso → adhésion active dans RecyClique → synchronisée dans Paheko.

- **Performance** :
  - Utiliser la pagination des endpoints HelloAsso (`pageSize`, `pageIndex`) lors des synchronisations de masse ;[^12]
  - Éviter de re-télécharger plusieurs fois les mêmes ordres en conservant la dernière date ou le dernier ID traité.

- **Environnements** :
  - S’appuyer sur la sandbox HelloAsso pour les tests (URLs `helloasso-sandbox.com`) ;[^2]
  - Avoir un Paheko de test séparé (instance de développement) pour valider les synchronisations.

## 8. Résumé des possibilités "depuis RecyClique"

Depuis RecyClique, en s’appuyant sur les APIs HelloAsso et Paheko, il est possible de :

- **Côté HelloAsso** :
  - administrer la connexion API (client ID/secret, organisation cible) ;[^2][^6]
  - initier des paiements de cotisation/dons/billets via le Checkout HelloAsso ;[^5]
  - récupérer toutes les données de commandes (adhésions, dons, événements, crowdfunding) ;[^1][^12]
  - recevoir les événements en temps réel via webhooks pour déclencher les mises à jour automatiques.[^15][^7]

- **Côté Paheko** :
  - créer et mettre à jour les fiches membres à partir des données HelloAsso ;[^3]
  - importer des lots de membres (en cas de migration ou de rattrapage) ;[^3]
  - créer automatiquement des écritures comptables associées aux paiements HelloAsso, dans les bons journaux et comptes.[^3]

- **Côté RecyClique lui-même** :
  - fournir une interface unique pour les adhérents (inscription, paiement, suivi de l’adhésion) ;
  - afficher les campagnes de dons/crowdfunding HelloAsso et leurs statistiques ;[^12]
  - offrir aux administrateurs une vue consolidée "adhérents + finances" sans se connecter à Paheko ni à HelloAsso.

En résumé, la stack visée est : HelloAsso pour l’encaissement, RecyClique comme cerveau et interface, Paheko comme registre associatif et comptable, reliés via des APIs et des webhooks bien définis.[^1][^5][^3]

---

## References

1. [contexte-pour-recherche-externe.md](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_9927adb1-ab68-46ea-a8de-5c2a07c19d49/34bfe6b6-bff1-4958-b1ed-36fa25c14303/contexte-pour-recherche-externe.md?AWSAccessKeyId=ASIA2F3EMEYEYLCJROF3&Signature=BZbTD8Uc3ifKOkEtRZCccG5uZ8k%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEJP%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCs6a2iSBpRGWYjqUvEwsXKdhBzw72UkNzugYyrqC52VgIhAJZathgW6gRntRCBjoUZA0kryqMscUN4CQfC3cEOlwkBKvMECFwQARoMNjk5NzUzMzA5NzA1IgwTNExdjAme8PFeo%2FQq0AR539kU3hgPenMYCPqAfxrz5gW3di8IgRyESs%2BKS5R3dJ9ECGr8SpRooH70z78IZfY9OCaGABXvFDFeSGmjnDE4N0yc19E28jSaOxsb0gltqnpSyvsmrj6K3GHirVDJjup6behxdOJjPWkk3uyE8167OzvqcKxsd%2FQAPP8lcelswjWuemOWMHufEkl%2BJZDp0Kf1HhpQRDE1kgjP1aLkuJ8Jrnx%2BF%2Fv431qvKkcTpmYIFIQgK7NvZ6lR5t1OptvGMeY9qK5WqaGYN5aJPqv1RDozcATi6Q6Z3pggmXbM59H6MS9RKWdzznKkvj4K25kY%2F33cy0eXys0Kz9oc2B0GcE33GD2pFuuw4BjQIvwxGj2qPI7qjUui3KnDaa4G%2FjLYMqDeHHcrFZp8yn7JTQ%2BxfpHejetdfGkCyYxLbPnI%2B42%2FDuMHqF2EKmbxz2bzSA90IM9uqlKzdI3aXutv2R7WEf9q35jaatr7vQk2xNPFL3Frd00mxziVk%2FE6vGJeqrKHLDD7zVtHCZ3xeUlg38d5QaRFFD6q0EFQU3ZVk5Qci%2BxmMKykzevy72R9hsxbcwZEN46dis8hlHQVXbLlUVr45A2Kwann0x2typxHDu27Bjd1%2BYavussFjQ7Z7Hc5VnWc14QBFseK0xvROSpdDmiDuuKL0kd%2F7lWQFU69pZCXp62mdsaNR6m1pvWjCcE83t36hW1bAk1UUIagKoTDSMRDf4tFByVb8Zn2IDjbk1y3lJmqQhxOgbqQdLcC3uFsV4M%2Bi06l%2BDuOpI4SwiOx2IQj8a3QMIbv7c4GOpcBfCXillhD7oQXkOUSHNeuHd4cPpLK1lO9i2r5dzBPMK92y0fjAb2ExJXTMSoppjw3R1uwLyvyIwWMkGFtCCs50HXtBXqhOeZqqwN7rOYvovlF6ehP4D5IAeCBW1aSgAcSyc3N%2FeP2YGktkw0xQtDGW1itV1%2F%2FAsDUKqrNziGA2besvL27GMcTGHhq1uoKB%2BL2Yo5L88LGAA%3D%3D&Expires=1775994201)

2. [presentation-plateforme-recyclic.md](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_9927adb1-ab68-46ea-a8de-5c2a07c19d49/55fd77fa-fa68-42ff-97f4-4d2832b733cb/presentation-plateforme-recyclic.md?AWSAccessKeyId=ASIA2F3EMEYEYLCJROF3&Signature=zp4afLXL1fB3CIgxA56%2B%2F5enAPw%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEJP%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCs6a2iSBpRGWYjqUvEwsXKdhBzw72UkNzugYyrqC52VgIhAJZathgW6gRntRCBjoUZA0kryqMscUN4CQfC3cEOlwkBKvMECFwQARoMNjk5NzUzMzA5NzA1IgwTNExdjAme8PFeo%2FQq0AR539kU3hgPenMYCPqAfxrz5gW3di8IgRyESs%2BKS5R3dJ9ECGr8SpRooH70z78IZfY9OCaGABXvFDFeSGmjnDE4N0yc19E28jSaOxsb0gltqnpSyvsmrj6K3GHirVDJjup6behxdOJjPWkk3uyE8167OzvqcKxsd%2FQAPP8lcelswjWuemOWMHufEkl%2BJZDp0Kf1HhpQRDE1kgjP1aLkuJ8Jrnx%2BF%2Fv431qvKkcTpmYIFIQgK7NvZ6lR5t1OptvGMeY9qK5WqaGYN5aJPqv1RDozcATi6Q6Z3pggmXbM59H6MS9RKWdzznKkvj4K25kY%2F33cy0eXys0Kz9oc2B0GcE33GD2pFuuw4BjQIvwxGj2qPI7qjUui3KnDaa4G%2FjLYMqDeHHcrFZp8yn7JTQ%2BxfpHejetdfGkCyYxLbPnI%2B42%2FDuMHqF2EKmbxz2bzSA90IM9uqlKzdI3aXutv2R7WEf9q35jaatr7vQk2xNPFL3Frd00mxziVk%2FE6vGJeqrKHLDD7zVtHCZ3xeUlg38d5QaRFFD6q0EFQU3ZVk5Qci%2BxmMKykzevy72R9hsxbcwZEN46dis8hlHQVXbLlUVr45A2Kwann0x2typxHDu27Bjd1%2BYavussFjQ7Z7Hc5VnWc14QBFseK0xvROSpdDmiDuuKL0kd%2F7lWQFU69pZCXp62mdsaNR6m1pvWjCcE83t36hW1bAk1UUIagKoTDSMRDf4tFByVb8Zn2IDjbk1y3lJmqQhxOgbqQdLcC3uFsV4M%2Bi06l%2BDuOpI4SwiOx2IQj8a3QMIbv7c4GOpcBfCXillhD7oQXkOUSHNeuHd4cPpLK1lO9i2r5dzBPMK92y0fjAb2ExJXTMSoppjw3R1uwLyvyIwWMkGFtCCs50HXtBXqhOeZqqwN7rOYvovlF6ehP4D5IAeCBW1aSgAcSyc3N%2FeP2YGktkw0xQtDGW1itV1%2F%2FAsDUKqrNziGA2besvL27GMcTGHhq1uoKB%2BL2Yo5L88LGAA%3D%3D&Expires=1775994201)

3. [paheko_guide_a4.pdf](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_9927adb1-ab68-46ea-a8de-5c2a07c19d49/16e51b2c-67a6-4d0c-811c-f76cead3cc76/paheko_guide_a4.pdf?AWSAccessKeyId=ASIA2F3EMEYEYLCJROF3&Signature=p%2BXZmWG3lne%2BqaRXiGk3Ezfom7U%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEJP%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCs6a2iSBpRGWYjqUvEwsXKdhBzw72UkNzugYyrqC52VgIhAJZathgW6gRntRCBjoUZA0kryqMscUN4CQfC3cEOlwkBKvMECFwQARoMNjk5NzUzMzA5NzA1IgwTNExdjAme8PFeo%2FQq0AR539kU3hgPenMYCPqAfxrz5gW3di8IgRyESs%2BKS5R3dJ9ECGr8SpRooH70z78IZfY9OCaGABXvFDFeSGmjnDE4N0yc19E28jSaOxsb0gltqnpSyvsmrj6K3GHirVDJjup6behxdOJjPWkk3uyE8167OzvqcKxsd%2FQAPP8lcelswjWuemOWMHufEkl%2BJZDp0Kf1HhpQRDE1kgjP1aLkuJ8Jrnx%2BF%2Fv431qvKkcTpmYIFIQgK7NvZ6lR5t1OptvGMeY9qK5WqaGYN5aJPqv1RDozcATi6Q6Z3pggmXbM59H6MS9RKWdzznKkvj4K25kY%2F33cy0eXys0Kz9oc2B0GcE33GD2pFuuw4BjQIvwxGj2qPI7qjUui3KnDaa4G%2FjLYMqDeHHcrFZp8yn7JTQ%2BxfpHejetdfGkCyYxLbPnI%2B42%2FDuMHqF2EKmbxz2bzSA90IM9uqlKzdI3aXutv2R7WEf9q35jaatr7vQk2xNPFL3Frd00mxziVk%2FE6vGJeqrKHLDD7zVtHCZ3xeUlg38d5QaRFFD6q0EFQU3ZVk5Qci%2BxmMKykzevy72R9hsxbcwZEN46dis8hlHQVXbLlUVr45A2Kwann0x2typxHDu27Bjd1%2BYavussFjQ7Z7Hc5VnWc14QBFseK0xvROSpdDmiDuuKL0kd%2F7lWQFU69pZCXp62mdsaNR6m1pvWjCcE83t36hW1bAk1UUIagKoTDSMRDf4tFByVb8Zn2IDjbk1y3lJmqQhxOgbqQdLcC3uFsV4M%2Bi06l%2BDuOpI4SwiOx2IQj8a3QMIbv7c4GOpcBfCXillhD7oQXkOUSHNeuHd4cPpLK1lO9i2r5dzBPMK92y0fjAb2ExJXTMSoppjw3R1uwLyvyIwWMkGFtCCs50HXtBXqhOeZqqwN7rOYvovlF6ehP4D5IAeCBW1aSgAcSyc3N%2FeP2YGktkw0xQtDGW1itV1%2F%2FAsDUKqrNziGA2besvL27GMcTGHhq1uoKB%2BL2Yo5L88LGAA%3D%3D&Expires=1775994201)

4. [TODO Christophe - RecycClique & Paheko.pdf](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_9927adb1-ab68-46ea-a8de-5c2a07c19d49/20d55f6d-b8d7-4e64-91b8-53722fde7b3b/TODO-Christophe-RecycClique-Paheko.pdf?AWSAccessKeyId=ASIA2F3EMEYEYLCJROF3&Signature=K5%2BZxV1Lq3%2B1n4xLrlt%2BH%2BQyKw0%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEJP%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCs6a2iSBpRGWYjqUvEwsXKdhBzw72UkNzugYyrqC52VgIhAJZathgW6gRntRCBjoUZA0kryqMscUN4CQfC3cEOlwkBKvMECFwQARoMNjk5NzUzMzA5NzA1IgwTNExdjAme8PFeo%2FQq0AR539kU3hgPenMYCPqAfxrz5gW3di8IgRyESs%2BKS5R3dJ9ECGr8SpRooH70z78IZfY9OCaGABXvFDFeSGmjnDE4N0yc19E28jSaOxsb0gltqnpSyvsmrj6K3GHirVDJjup6behxdOJjPWkk3uyE8167OzvqcKxsd%2FQAPP8lcelswjWuemOWMHufEkl%2BJZDp0Kf1HhpQRDE1kgjP1aLkuJ8Jrnx%2BF%2Fv431qvKkcTpmYIFIQgK7NvZ6lR5t1OptvGMeY9qK5WqaGYN5aJPqv1RDozcATi6Q6Z3pggmXbM59H6MS9RKWdzznKkvj4K25kY%2F33cy0eXys0Kz9oc2B0GcE33GD2pFuuw4BjQIvwxGj2qPI7qjUui3KnDaa4G%2FjLYMqDeHHcrFZp8yn7JTQ%2BxfpHejetdfGkCyYxLbPnI%2B42%2FDuMHqF2EKmbxz2bzSA90IM9uqlKzdI3aXutv2R7WEf9q35jaatr7vQk2xNPFL3Frd00mxziVk%2FE6vGJeqrKHLDD7zVtHCZ3xeUlg38d5QaRFFD6q0EFQU3ZVk5Qci%2BxmMKykzevy72R9hsxbcwZEN46dis8hlHQVXbLlUVr45A2Kwann0x2typxHDu27Bjd1%2BYavussFjQ7Z7Hc5VnWc14QBFseK0xvROSpdDmiDuuKL0kd%2F7lWQFU69pZCXp62mdsaNR6m1pvWjCcE83t36hW1bAk1UUIagKoTDSMRDf4tFByVb8Zn2IDjbk1y3lJmqQhxOgbqQdLcC3uFsV4M%2Bi06l%2BDuOpI4SwiOx2IQj8a3QMIbv7c4GOpcBfCXillhD7oQXkOUSHNeuHd4cPpLK1lO9i2r5dzBPMK92y0fjAb2ExJXTMSoppjw3R1uwLyvyIwWMkGFtCCs50HXtBXqhOeZqqwN7rOYvovlF6ehP4D5IAeCBW1aSgAcSyc3N%2FeP2YGktkw0xQtDGW1itV1%2F%2FAsDUKqrNziGA2besvL27GMcTGHhq1uoKB%2BL2Yo5L88LGAA%3D%3D&Expires=1775994201)

5. [2025-01-30_RETRAITEMENT_recyclique-guide-complet-Paheko.md](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_9927adb1-ab68-46ea-a8de-5c2a07c19d49/df636289-145f-4402-a336-fde1ef569d0b/2025-01-30_RETRAITEMENT_recyclique-guide-complet-Paheko.md?AWSAccessKeyId=ASIA2F3EMEYEYLCJROF3&Signature=wFUGr%2FhV%2FN9QUKbUi1gXtdrI604%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEJP%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCs6a2iSBpRGWYjqUvEwsXKdhBzw72UkNzugYyrqC52VgIhAJZathgW6gRntRCBjoUZA0kryqMscUN4CQfC3cEOlwkBKvMECFwQARoMNjk5NzUzMzA5NzA1IgwTNExdjAme8PFeo%2FQq0AR539kU3hgPenMYCPqAfxrz5gW3di8IgRyESs%2BKS5R3dJ9ECGr8SpRooH70z78IZfY9OCaGABXvFDFeSGmjnDE4N0yc19E28jSaOxsb0gltqnpSyvsmrj6K3GHirVDJjup6behxdOJjPWkk3uyE8167OzvqcKxsd%2FQAPP8lcelswjWuemOWMHufEkl%2BJZDp0Kf1HhpQRDE1kgjP1aLkuJ8Jrnx%2BF%2Fv431qvKkcTpmYIFIQgK7NvZ6lR5t1OptvGMeY9qK5WqaGYN5aJPqv1RDozcATi6Q6Z3pggmXbM59H6MS9RKWdzznKkvj4K25kY%2F33cy0eXys0Kz9oc2B0GcE33GD2pFuuw4BjQIvwxGj2qPI7qjUui3KnDaa4G%2FjLYMqDeHHcrFZp8yn7JTQ%2BxfpHejetdfGkCyYxLbPnI%2B42%2FDuMHqF2EKmbxz2bzSA90IM9uqlKzdI3aXutv2R7WEf9q35jaatr7vQk2xNPFL3Frd00mxziVk%2FE6vGJeqrKHLDD7zVtHCZ3xeUlg38d5QaRFFD6q0EFQU3ZVk5Qci%2BxmMKykzevy72R9hsxbcwZEN46dis8hlHQVXbLlUVr45A2Kwann0x2typxHDu27Bjd1%2BYavussFjQ7Z7Hc5VnWc14QBFseK0xvROSpdDmiDuuKL0kd%2F7lWQFU69pZCXp62mdsaNR6m1pvWjCcE83t36hW1bAk1UUIagKoTDSMRDf4tFByVb8Zn2IDjbk1y3lJmqQhxOgbqQdLcC3uFsV4M%2Bi06l%2BDuOpI4SwiOx2IQj8a3QMIbv7c4GOpcBfCXillhD7oQXkOUSHNeuHd4cPpLK1lO9i2r5dzBPMK92y0fjAb2ExJXTMSoppjw3R1uwLyvyIwWMkGFtCCs50HXtBXqhOeZqqwN7rOYvovlF6ehP4D5IAeCBW1aSgAcSyc3N%2FeP2YGktkw0xQtDGW1itV1%2F%2FAsDUKqrNziGA2besvL27GMcTGHhq1uoKB%2BL2Yo5L88LGAA%3D%3D&Expires=1775994201)

6. [00_JARVOS_mini.md](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_9927adb1-ab68-46ea-a8de-5c2a07c19d49/a05900a1-ad29-4698-bde2-9e910ba8a594/00_JARVOS_mini.md?AWSAccessKeyId=ASIA2F3EMEYEYLCJROF3&Signature=Lc0UELBU2ISojgFxHalMbJ2WTWo%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEJP%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCs6a2iSBpRGWYjqUvEwsXKdhBzw72UkNzugYyrqC52VgIhAJZathgW6gRntRCBjoUZA0kryqMscUN4CQfC3cEOlwkBKvMECFwQARoMNjk5NzUzMzA5NzA1IgwTNExdjAme8PFeo%2FQq0AR539kU3hgPenMYCPqAfxrz5gW3di8IgRyESs%2BKS5R3dJ9ECGr8SpRooH70z78IZfY9OCaGABXvFDFeSGmjnDE4N0yc19E28jSaOxsb0gltqnpSyvsmrj6K3GHirVDJjup6behxdOJjPWkk3uyE8167OzvqcKxsd%2FQAPP8lcelswjWuemOWMHufEkl%2BJZDp0Kf1HhpQRDE1kgjP1aLkuJ8Jrnx%2BF%2Fv431qvKkcTpmYIFIQgK7NvZ6lR5t1OptvGMeY9qK5WqaGYN5aJPqv1RDozcATi6Q6Z3pggmXbM59H6MS9RKWdzznKkvj4K25kY%2F33cy0eXys0Kz9oc2B0GcE33GD2pFuuw4BjQIvwxGj2qPI7qjUui3KnDaa4G%2FjLYMqDeHHcrFZp8yn7JTQ%2BxfpHejetdfGkCyYxLbPnI%2B42%2FDuMHqF2EKmbxz2bzSA90IM9uqlKzdI3aXutv2R7WEf9q35jaatr7vQk2xNPFL3Frd00mxziVk%2FE6vGJeqrKHLDD7zVtHCZ3xeUlg38d5QaRFFD6q0EFQU3ZVk5Qci%2BxmMKykzevy72R9hsxbcwZEN46dis8hlHQVXbLlUVr45A2Kwann0x2typxHDu27Bjd1%2BYavussFjQ7Z7Hc5VnWc14QBFseK0xvROSpdDmiDuuKL0kd%2F7lWQFU69pZCXp62mdsaNR6m1pvWjCcE83t36hW1bAk1UUIagKoTDSMRDf4tFByVb8Zn2IDjbk1y3lJmqQhxOgbqQdLcC3uFsV4M%2Bi06l%2BDuOpI4SwiOx2IQj8a3QMIbv7c4GOpcBfCXillhD7oQXkOUSHNeuHd4cPpLK1lO9i2r5dzBPMK92y0fjAb2ExJXTMSoppjw3R1uwLyvyIwWMkGFtCCs50HXtBXqhOeZqqwN7rOYvovlF6ehP4D5IAeCBW1aSgAcSyc3N%2FeP2YGktkw0xQtDGW1itV1%2F%2FAsDUKqrNziGA2besvL27GMcTGHhq1uoKB%2BL2Yo5L88LGAA%3D%3D&Expires=1775994201)

7. [JARVOS_nano analyse-opus_4.6](https://ppl-ai-file-upload.s3.amazonaws.com/connectors/google_drive/19GmGu7jyBK-yN45_WL1YMRgUE7acR0wKdTBV1YdOZbM/53003103-15a0-497a-b3a6-3a9127608e2a/JARVOS_nano-analyse-opus_4.6.md?AWSAccessKeyId=ASIA2F3EMEYEYLCJROF3&Signature=kTTNCJlNWnmbZFnYX7xFw6chLIg%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEJP%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCs6a2iSBpRGWYjqUvEwsXKdhBzw72UkNzugYyrqC52VgIhAJZathgW6gRntRCBjoUZA0kryqMscUN4CQfC3cEOlwkBKvMECFwQARoMNjk5NzUzMzA5NzA1IgwTNExdjAme8PFeo%2FQq0AR539kU3hgPenMYCPqAfxrz5gW3di8IgRyESs%2BKS5R3dJ9ECGr8SpRooH70z78IZfY9OCaGABXvFDFeSGmjnDE4N0yc19E28jSaOxsb0gltqnpSyvsmrj6K3GHirVDJjup6behxdOJjPWkk3uyE8167OzvqcKxsd%2FQAPP8lcelswjWuemOWMHufEkl%2BJZDp0Kf1HhpQRDE1kgjP1aLkuJ8Jrnx%2BF%2Fv431qvKkcTpmYIFIQgK7NvZ6lR5t1OptvGMeY9qK5WqaGYN5aJPqv1RDozcATi6Q6Z3pggmXbM59H6MS9RKWdzznKkvj4K25kY%2F33cy0eXys0Kz9oc2B0GcE33GD2pFuuw4BjQIvwxGj2qPI7qjUui3KnDaa4G%2FjLYMqDeHHcrFZp8yn7JTQ%2BxfpHejetdfGkCyYxLbPnI%2B42%2FDuMHqF2EKmbxz2bzSA90IM9uqlKzdI3aXutv2R7WEf9q35jaatr7vQk2xNPFL3Frd00mxziVk%2FE6vGJeqrKHLDD7zVtHCZ3xeUlg38d5QaRFFD6q0EFQU3ZVk5Qci%2BxmMKykzevy72R9hsxbcwZEN46dis8hlHQVXbLlUVr45A2Kwann0x2typxHDu27Bjd1%2BYavussFjQ7Z7Hc5VnWc14QBFseK0xvROSpdDmiDuuKL0kd%2F7lWQFU69pZCXp62mdsaNR6m1pvWjCcE83t36hW1bAk1UUIagKoTDSMRDf4tFByVb8Zn2IDjbk1y3lJmqQhxOgbqQdLcC3uFsV4M%2Bi06l%2BDuOpI4SwiOx2IQj8a3QMIbv7c4GOpcBfCXillhD7oQXkOUSHNeuHd4cPpLK1lO9i2r5dzBPMK92y0fjAb2ExJXTMSoppjw3R1uwLyvyIwWMkGFtCCs50HXtBXqhOeZqqwN7rOYvovlF6ehP4D5IAeCBW1aSgAcSyc3N%2FeP2YGktkw0xQtDGW1itV1%2F%2FAsDUKqrNziGA2besvL27GMcTGHhq1uoKB%2BL2Yo5L88LGAA%3D%3D&Expires=1775994201)

8. [appercu_ecosysteme.md](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_9927adb1-ab68-46ea-a8de-5c2a07c19d49/8917321c-be91-4624-b579-d53ba0074ed0/appercu_ecosysteme.md?AWSAccessKeyId=ASIA2F3EMEYEYLCJROF3&Signature=zxA0FVK0V4v4c6oDc2ORaxd4s50%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEJP%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCs6a2iSBpRGWYjqUvEwsXKdhBzw72UkNzugYyrqC52VgIhAJZathgW6gRntRCBjoUZA0kryqMscUN4CQfC3cEOlwkBKvMECFwQARoMNjk5NzUzMzA5NzA1IgwTNExdjAme8PFeo%2FQq0AR539kU3hgPenMYCPqAfxrz5gW3di8IgRyESs%2BKS5R3dJ9ECGr8SpRooH70z78IZfY9OCaGABXvFDFeSGmjnDE4N0yc19E28jSaOxsb0gltqnpSyvsmrj6K3GHirVDJjup6behxdOJjPWkk3uyE8167OzvqcKxsd%2FQAPP8lcelswjWuemOWMHufEkl%2BJZDp0Kf1HhpQRDE1kgjP1aLkuJ8Jrnx%2BF%2Fv431qvKkcTpmYIFIQgK7NvZ6lR5t1OptvGMeY9qK5WqaGYN5aJPqv1RDozcATi6Q6Z3pggmXbM59H6MS9RKWdzznKkvj4K25kY%2F33cy0eXys0Kz9oc2B0GcE33GD2pFuuw4BjQIvwxGj2qPI7qjUui3KnDaa4G%2FjLYMqDeHHcrFZp8yn7JTQ%2BxfpHejetdfGkCyYxLbPnI%2B42%2FDuMHqF2EKmbxz2bzSA90IM9uqlKzdI3aXutv2R7WEf9q35jaatr7vQk2xNPFL3Frd00mxziVk%2FE6vGJeqrKHLDD7zVtHCZ3xeUlg38d5QaRFFD6q0EFQU3ZVk5Qci%2BxmMKykzevy72R9hsxbcwZEN46dis8hlHQVXbLlUVr45A2Kwann0x2typxHDu27Bjd1%2BYavussFjQ7Z7Hc5VnWc14QBFseK0xvROSpdDmiDuuKL0kd%2F7lWQFU69pZCXp62mdsaNR6m1pvWjCcE83t36hW1bAk1UUIagKoTDSMRDf4tFByVb8Zn2IDjbk1y3lJmqQhxOgbqQdLcC3uFsV4M%2Bi06l%2BDuOpI4SwiOx2IQj8a3QMIbv7c4GOpcBfCXillhD7oQXkOUSHNeuHd4cPpLK1lO9i2r5dzBPMK92y0fjAb2ExJXTMSoppjw3R1uwLyvyIwWMkGFtCCs50HXtBXqhOeZqqwN7rOYvovlF6ehP4D5IAeCBW1aSgAcSyc3N%2FeP2YGktkw0xQtDGW1itV1%2F%2FAsDUKqrNziGA2besvL27GMcTGHhq1uoKB%2BL2Yo5L88LGAA%3D%3D&Expires=1775994201)

9. [📋 __RecyClique - Système RAG Intelligent _ Dossier.pdf](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_9927adb1-ab68-46ea-a8de-5c2a07c19d49/96bc0423-fdef-4a67-ae74-54847ae993e1/RecyClique-Systeme-RAG-Intelligent-_-Dossier.pdf?AWSAccessKeyId=ASIA2F3EMEYEYLCJROF3&Signature=8eenxIDtxy5bDk9z7BMK%2F2AavHg%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEJP%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCs6a2iSBpRGWYjqUvEwsXKdhBzw72UkNzugYyrqC52VgIhAJZathgW6gRntRCBjoUZA0kryqMscUN4CQfC3cEOlwkBKvMECFwQARoMNjk5NzUzMzA5NzA1IgwTNExdjAme8PFeo%2FQq0AR539kU3hgPenMYCPqAfxrz5gW3di8IgRyESs%2BKS5R3dJ9ECGr8SpRooH70z78IZfY9OCaGABXvFDFeSGmjnDE4N0yc19E28jSaOxsb0gltqnpSyvsmrj6K3GHirVDJjup6behxdOJjPWkk3uyE8167OzvqcKxsd%2FQAPP8lcelswjWuemOWMHufEkl%2BJZDp0Kf1HhpQRDE1kgjP1aLkuJ8Jrnx%2BF%2Fv431qvKkcTpmYIFIQgK7NvZ6lR5t1OptvGMeY9qK5WqaGYN5aJPqv1RDozcATi6Q6Z3pggmXbM59H6MS9RKWdzznKkvj4K25kY%2F33cy0eXys0Kz9oc2B0GcE33GD2pFuuw4BjQIvwxGj2qPI7qjUui3KnDaa4G%2FjLYMqDeHHcrFZp8yn7JTQ%2BxfpHejetdfGkCyYxLbPnI%2B42%2FDuMHqF2EKmbxz2bzSA90IM9uqlKzdI3aXutv2R7WEf9q35jaatr7vQk2xNPFL3Frd00mxziVk%2FE6vGJeqrKHLDD7zVtHCZ3xeUlg38d5QaRFFD6q0EFQU3ZVk5Qci%2BxmMKykzevy72R9hsxbcwZEN46dis8hlHQVXbLlUVr45A2Kwann0x2typxHDu27Bjd1%2BYavussFjQ7Z7Hc5VnWc14QBFseK0xvROSpdDmiDuuKL0kd%2F7lWQFU69pZCXp62mdsaNR6m1pvWjCcE83t36hW1bAk1UUIagKoTDSMRDf4tFByVb8Zn2IDjbk1y3lJmqQhxOgbqQdLcC3uFsV4M%2Bi06l%2BDuOpI4SwiOx2IQj8a3QMIbv7c4GOpcBfCXillhD7oQXkOUSHNeuHd4cPpLK1lO9i2r5dzBPMK92y0fjAb2ExJXTMSoppjw3R1uwLyvyIwWMkGFtCCs50HXtBXqhOeZqqwN7rOYvovlF6ehP4D5IAeCBW1aSgAcSyc3N%2FeP2YGktkw0xQtDGW1itV1%2F%2FAsDUKqrNziGA2besvL27GMcTGHhq1uoKB%2BL2Yo5L88LGAA%3D%3D&Expires=1775994201)

10. [Comment les ressourceries doivent peuvent faire po.pdf](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_9927adb1-ab68-46ea-a8de-5c2a07c19d49/27581758-51ae-47b1-81e2-fb8c4a2095d7/Comment-les-ressourceries-doivent-peuvent-faire-po.pdf?AWSAccessKeyId=ASIA2F3EMEYEYLCJROF3&Signature=I0Cn%2Ff5Cory8ppQqKcqqQwqzZlM%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEJP%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCs6a2iSBpRGWYjqUvEwsXKdhBzw72UkNzugYyrqC52VgIhAJZathgW6gRntRCBjoUZA0kryqMscUN4CQfC3cEOlwkBKvMECFwQARoMNjk5NzUzMzA5NzA1IgwTNExdjAme8PFeo%2FQq0AR539kU3hgPenMYCPqAfxrz5gW3di8IgRyESs%2BKS5R3dJ9ECGr8SpRooH70z78IZfY9OCaGABXvFDFeSGmjnDE4N0yc19E28jSaOxsb0gltqnpSyvsmrj6K3GHirVDJjup6behxdOJjPWkk3uyE8167OzvqcKxsd%2FQAPP8lcelswjWuemOWMHufEkl%2BJZDp0Kf1HhpQRDE1kgjP1aLkuJ8Jrnx%2BF%2Fv431qvKkcTpmYIFIQgK7NvZ6lR5t1OptvGMeY9qK5WqaGYN5aJPqv1RDozcATi6Q6Z3pggmXbM59H6MS9RKWdzznKkvj4K25kY%2F33cy0eXys0Kz9oc2B0GcE33GD2pFuuw4BjQIvwxGj2qPI7qjUui3KnDaa4G%2FjLYMqDeHHcrFZp8yn7JTQ%2BxfpHejetdfGkCyYxLbPnI%2B42%2FDuMHqF2EKmbxz2bzSA90IM9uqlKzdI3aXutv2R7WEf9q35jaatr7vQk2xNPFL3Frd00mxziVk%2FE6vGJeqrKHLDD7zVtHCZ3xeUlg38d5QaRFFD6q0EFQU3ZVk5Qci%2BxmMKykzevy72R9hsxbcwZEN46dis8hlHQVXbLlUVr45A2Kwann0x2typxHDu27Bjd1%2BYavussFjQ7Z7Hc5VnWc14QBFseK0xvROSpdDmiDuuKL0kd%2F7lWQFU69pZCXp62mdsaNR6m1pvWjCcE83t36hW1bAk1UUIagKoTDSMRDf4tFByVb8Zn2IDjbk1y3lJmqQhxOgbqQdLcC3uFsV4M%2Bi06l%2BDuOpI4SwiOx2IQj8a3QMIbv7c4GOpcBfCXillhD7oQXkOUSHNeuHd4cPpLK1lO9i2r5dzBPMK92y0fjAb2ExJXTMSoppjw3R1uwLyvyIwWMkGFtCCs50HXtBXqhOeZqqwN7rOYvovlF6ehP4D5IAeCBW1aSgAcSyc3N%2FeP2YGktkw0xQtDGW1itV1%2F%2FAsDUKqrNziGA2besvL27GMcTGHhq1uoKB%2BL2Yo5L88LGAA%3D%3D&Expires=1775994201)

11. [Paheko RecyClique.md](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_9927adb1-ab68-46ea-a8de-5c2a07c19d49/05e4330a-5ef8-41b9-8f90-6ff4a8f45286/Paheko-RecyClique.md?AWSAccessKeyId=ASIA2F3EMEYEYLCJROF3&Signature=CklKfH7TO9cxEfPhoStFSfd2USU%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEJP%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCs6a2iSBpRGWYjqUvEwsXKdhBzw72UkNzugYyrqC52VgIhAJZathgW6gRntRCBjoUZA0kryqMscUN4CQfC3cEOlwkBKvMECFwQARoMNjk5NzUzMzA5NzA1IgwTNExdjAme8PFeo%2FQq0AR539kU3hgPenMYCPqAfxrz5gW3di8IgRyESs%2BKS5R3dJ9ECGr8SpRooH70z78IZfY9OCaGABXvFDFeSGmjnDE4N0yc19E28jSaOxsb0gltqnpSyvsmrj6K3GHirVDJjup6behxdOJjPWkk3uyE8167OzvqcKxsd%2FQAPP8lcelswjWuemOWMHufEkl%2BJZDp0Kf1HhpQRDE1kgjP1aLkuJ8Jrnx%2BF%2Fv431qvKkcTpmYIFIQgK7NvZ6lR5t1OptvGMeY9qK5WqaGYN5aJPqv1RDozcATi6Q6Z3pggmXbM59H6MS9RKWdzznKkvj4K25kY%2F33cy0eXys0Kz9oc2B0GcE33GD2pFuuw4BjQIvwxGj2qPI7qjUui3KnDaa4G%2FjLYMqDeHHcrFZp8yn7JTQ%2BxfpHejetdfGkCyYxLbPnI%2B42%2FDuMHqF2EKmbxz2bzSA90IM9uqlKzdI3aXutv2R7WEf9q35jaatr7vQk2xNPFL3Frd00mxziVk%2FE6vGJeqrKHLDD7zVtHCZ3xeUlg38d5QaRFFD6q0EFQU3ZVk5Qci%2BxmMKykzevy72R9hsxbcwZEN46dis8hlHQVXbLlUVr45A2Kwann0x2typxHDu27Bjd1%2BYavussFjQ7Z7Hc5VnWc14QBFseK0xvROSpdDmiDuuKL0kd%2F7lWQFU69pZCXp62mdsaNR6m1pvWjCcE83t36hW1bAk1UUIagKoTDSMRDf4tFByVb8Zn2IDjbk1y3lJmqQhxOgbqQdLcC3uFsV4M%2Bi06l%2BDuOpI4SwiOx2IQj8a3QMIbv7c4GOpcBfCXillhD7oQXkOUSHNeuHd4cPpLK1lO9i2r5dzBPMK92y0fjAb2ExJXTMSoppjw3R1uwLyvyIwWMkGFtCCs50HXtBXqhOeZqqwN7rOYvovlF6ehP4D5IAeCBW1aSgAcSyc3N%2FeP2YGktkw0xQtDGW1itV1%2F%2FAsDUKqrNziGA2besvL27GMcTGHhq1uoKB%2BL2Yo5L88LGAA%3D%3D&Expires=1775994201)

12. [HelloAsso — Aide - Paheko - Gestion d'association](https://paheko.cloud/extension-helloasso) - Cette extension permet de suivre et synchroniser les paiements reçus via HelloAsso dans Paheko. Aver...

13. [Configurer l'extension HelloAsso — Aide - Paheko](https://paheko.cloud/configurer-extension-helloasso) - Pour pouvoir synchroniser les données dans Paheko, il faut configurer l'extension, afin qu'elle sach...

14. [Connecter l'extension à HelloAsso — Aide - Gestion d'association](https://paheko.cloud/extension-helloasso-connexion) - Dans l'extension HelloAsso de Paheko, rendez-vous dans l'onglet Configuration sous-onglet Connexion ...

15. [Foire Aux Questions (25/02/2026) — Aide - Gestion d'association](https://paheko.cloud/foire-aux-questions-25-02-2026) - Une foire aux questions animée par l'équipe de Paheko datant du 25 février 2026. ... 25:08 Est-il po...

16. [Extensions — Aide - Paheko - Gestion d'association](https://paheko.cloud/extensions) - Activation et gestion des extensions · Agenda et contacts · Bordereau de remise de chèques · Caisse ...

17. [Sommaire — Aide - Paheko - Gestion d'association](https://paheko.cloud/sommaire) - Exemples de cas d'usage des modules et de Brindille · Raccourcis clavier · Sauvegarde automatique et...

18. [Foire aux questions (03/12/2025) — Aide - Gestion d'association](https://paheko.cloud/faq-en-direct) - 0:25 Paheko pour une asso soumise aux impôts commerciaux ? 2:30 Faut-il créer une colonne « adhérent...

