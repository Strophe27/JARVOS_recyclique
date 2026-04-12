# HelloAsso API v5 + Paheko API — Périmètre réaliste pour RecyClique

> **Erratum 2026-04-12** — La **section 2** d’origine supposait à tort que les plafonds 10 / 10 s, 20 / 10 min, 50 / h s’appliquaient à **toute** l’API v5. D’après la page officielle [Limite d’appels API](https://dev.helloasso.com/docs/limitation-api) **lue intégralement en navigateur**, ces chiffres ciblent l’**endpoint d’authentification** (`/oauth2/token`) ; **aucun autre bloc chiffré** n’y figure pour `/orders`, `/forms`, etc. à cette date. **Sources de vérité à jour :** `references/migration-paheko/2026-04-12_specification-integration-helloasso-recyclique-paheko.md` (§3.5–3.6, §4.2) et `references/migration-paheko/2026-04-12_brouillon-arbitrage-helloasso-et-promesse-recyclique-paheko.md` (§A.3, §F). Le reste de cette réponse Perplexity (checkout, webhooks HMAC, asymétrie lecture / back-office, Paheko, P0/P1, liens) reste exploitable ; ignorer l’ancienne interprétation « quota horaire global 50 appels » pour la synchro métier.

## 1. Panorama API HelloAsso v5 — ce qui est stable

**Stable et documenté (P0) :**

- **Auth OAuth2** : `POST /oauth2/token` avec `grant_type=client_credentials`. `access_token` valide **30 min** (1799s), `refresh_token` valide **30 jours**. À chaque refresh, les deux tokens sont renouvelés. Limite : **20 access_tokens simultanés** par clé API[^1]
- **Checkout** : création d'un checkout intent (`POST /organizations/{slug}/checkout-intents`), redirection, returnUrl, vérification (`GET /checkout-intents/{id}`). Tout en centimes. Les champs `totalAmount`, `initialAmount`, `itemName`, `backUrl`, `errorUrl`, `returnUrl`, `containsDonation` sont obligatoires[^2]
- **Lecture des commandes/orders** : données du payeur, items, paiements, champs personnalisés. Pagination `pageSize` 1–100, `pageIndex`[^3]
- **Lecture des formulaires** : liste, détails, montants collectés[^2]
- **Webhooks** : URL de notification configurable dans le backoffice association ("Mon compte → Intégrations et API")[^4][^5]

**Réservé partenaires :** la configuration programmatique de l'URL de notification via API (`PUT /partners/me/api/notifications/…`) nécessite un rôle `OrganizationAdmin` obtenu via contrat partenaire HelloAsso. Les **associations ordinaires** ne peuvent configurer le webhook que depuis le backoffice.[^6]

***

## 2. Limites d’appels (corrigé 2026-04-12)

Sur [Limite d’appels API](https://dev.helloasso.com/docs/limitation-api), HelloAsso chiffre pour l’**API d’authentification** uniquement :[^7]

| Fenêtre | Limite (endpoint OAuth `/oauth2/token`) |
| :-- | :-- |
| 10 secondes | **10 appels** |
| 10 minutes | **20 appels** |
| 1 heure | **50 appels** |

**En pratique Recyclique :** cacher l’`access_token`, renouveler avec le **`refresh_token`**, éviter de redemander `client_credentials` en boucle — ces plafonds ne sont alors pas le goulet d’étranglement. La doc mentionne aussi des **429** si le trafic est trop dense : garder **webhooks**, appels **sobres**, **idempotence** et **backoff** comme bonne architecture (pas seulement à cause d’un « plafond 50 / h » sur les données).

***

## 3. Webhooks — authentification et pièges

**Signature HMAC-256** : HelloAsso envoie une signature calculée avec le body de la notification et votre `signatureKey`. Côté RecyClique, vérifier systématiquement avant de traiter.[^8]

**Types d'événements** : `Order` et `Payment` peuvent tous deux signaler une transaction validée — les deux sont utilisables pour confirmer un paiement.[^9]

**Pièges documentés :**

- Un webhook peut arriver **avant** que le `GET checkout-intents/{id}` soit cohérent → toujours re-vérifier via l'API[^2]
- Doublons possibles (retry HelloAsso) → implémenter **idempotence** côté RecyClique (stocker `ha_order_id` et ignorer si déjà traité)
- Pour tester : utiliser `https://api.helloasso-sandbox.com/v5` + [webhook.site](https://webhook.site)[^10]

***

## 4. Checkout — contraintes réelles

- L'appel `POST checkout-intents` **doit être fait côté serveur** (backend RecyClique/FastAPI). Les appels depuis le front sont bloqués par CORS[^11]
- La `redirectUrl` retournée est valide **15 minutes** seulement[^2]
- L'utilisateur est redirigé vers une page HelloAsso hébergée — pas d'iframe ni de widget embarqué
- Champ optionnel utile : `metadata` (JSON libre, max 20 000 chars) pour stocker votre `user_id` RecyClique et retrouver le contexte au retour[^2]
- SEPA activable via `paymentOptions.enableSepa`[^2]

***

## 5. Adhésions, dons, crowdfunding, billetterie — asymétrie lecture/écriture

**Ce que l'API permet (lecture + événements) :**

- Lire la liste des formulaires de tous types (adhésion, don, crowdfunding, billetterie, boutique)
- Récupérer les commandes et leur détail (payeur, items, montants, champs custom)
- Initier un paiement via Checkout sur un formulaire **existant**
- Recevoir les événements via webhook

**Ce qui est impossible via API — backoffice HelloAsso uniquement :**

- **Créer ou modifier un formulaire** (adhésion, campagne de don, événement, boutique) → interface web HelloAsso uniquement[^12]
- **Paramétrer la `signatureKey` webhook** pour une association → backoffice uniquement[^4]
- **Rembourser** un paiement → backoffice uniquement (non exposé dans l'API v5)
- **Modifier une commande** passée → lecture seule
- **Inviter/gérer les administrateurs** de l'organisation → backoffice uniquement

***

## 6. Paheko API — endpoints clés et limitations réelles

**Auth** : HTTP Basic (`user:password`) sur toutes les routes[^13]

### Membres (P0)

| Route | Méthode | Usage | Limitation |
| :-- | :-- | :-- | :-- |
| `/api/user/new` | POST | Créer un membre | **409** si nom identique (pas email !) ; `force_duplicate=1` disponible |
| `/api/user/{ID}` | GET/POST/DELETE | Lire / modifier / supprimer | Impossible de changer la catégorie ; admins protégés |
| `/api/user/import` | PUT ou POST | Import CSV/XLSX/ODS en masse | Modes : `auto` (défaut), `create`, `update` |
| `/api/user/import/preview` | PUT/POST | Simuler l'import sans l'exécuter | Recommandé avant tout import |
| `/api/user/categories` | GET | Lister les catégories et leur nb de membres | Disponible depuis v1.3.6 |

⚠️ **Le doublon est détecté sur le nom, pas sur l'email**. Pour la déduplication HelloAsso → Paheko, il faut stocker le `paheko_user_id` dès la première création ou passer par `/api/sql` (SELECT uniquement) pour retrouver un membre par email avant de créer.

### Cotisations/Activités (P1)

`PUT /api/services/subscriptions/import` : import des inscriptions aux activités avec montant, tarif, date, statut "payé". Les activités et tarifs doivent **préexister** dans Paheko.[^13]

### Comptabilité (P1)

`POST /api/accounting/transaction` : créer une écriture. Types simplifiés : `EXPENSE`, `REVENUE`, `TRANSFER`, `DEBT`, `CREDIT`. Type avancé : `ADVANCED` (multi-lignes). Champs obligatoires : `id_year`, `label`, `date`, `type`. Champ utile : `linked_users` (tableau d'IDs membres à lier à l'écriture).[^13]

⚠️ **`id_year` doit être connu à l'avance** → récupérer via `GET /api/accounting/years` et le cacher côté RecyClique. Utiliser `current` comme valeur pour cibler l'exercice en cours.

### SQL en lecture (P2)

`POST /api/sql` : SELECT uniquement, limite automatique à 1000 résultats, formats `json`/`csv`/`ods`/`xlsx`. Utile pour rechercher un membre par email (`SELECT id, email FROM users WHERE email = ?`).[^13]

***

## 7. RGPD

RecyClique copie des données personnelles de payeurs HelloAsso (nom, prénom, email, adresse, téléphone). Obligations  :[^14][^15][^16]

- **Minimisation** : ne stocker que ce qui est nécessaire au fonctionnement (identifiant HelloAsso, statut adhésion, email) ; ne pas dupliquer les données de paiement (numéro de carte, etc. — jamais exposés par HelloAsso)
- **Durées de conservation** : données adhérent actif → durée de l'adhésion + raisonnable ; données comptables → **10 ans** (obligation légale)
- **Base légale** : exécution du contrat d'adhésion (Art. 6.1.b RGPD) pour les adhérents ; intérêt légitime pour les stats agrégées
- **DPA / accord de sous-traitance** : si RecyClique est déployé pour le compte d'autres associations, un accord de sous-traitance RGPD est obligatoire entre chaque association et l'hébergeur de RecyClique
- **Droits des personnes** : implémenter dans RecyClique les endpoints d'export (droit d'accès) et d'effacement (droit à l'oubli) qui propagent vers Paheko (`DELETE /api/user/{ID}`)

***

## Récapitulatif priorités

**P0 — Implémenter en premier :**

- Auth OAuth2 avec gestion du refresh_token (cache, auto-refresh avant expiration)
- Checkout intent côté serveur → redirection → vérification via webhook + GET
- Webhook endpoint RecyClique avec vérification HMAC-256 + idempotence sur `ha_order_id`
- Sync adhérent HelloAsso → `POST /api/user/new` Paheko avec déduplication par SQL SELECT

**P1 — Deuxième sprint :**

- Écriture comptable automatique via `POST /api/accounting/transaction` avec `linked_users`
- Import cotisation/activité via `services/subscriptions/import`
- Dashboard RecyClique : lecture formulaires HelloAsso + montants collectés (dans la limite des 50 appels/heure)

**P2 — Optionnel/ultérieur :**

- Export données membres Paheko (`user/category/{ID}.csv`)
- Stats crowdfunding live (attention quota !)
- Endpoint RGPD export/effacement

***

## Ce qui est impossible ou trop fragile via API seule

1. **Créer/modifier des formulaires HelloAsso** (adhésion, événement, campagne) → backoffice uniquement
2. **Rembourser un paiement** → backoffice uniquement
3. **Configurer le webhook par API** (pour une association, pas partenaire) → backoffice uniquement
4. **Synchro complète fréquente** → rate limit 50 appels/heure interdit le polling régulier
5. **Déduplication fiable par email dans Paheko** → l'API `/user/new` détecte les doublons sur le nom, pas l'email ; nécessite un détour par `/api/sql`
6. **Modifier la catégorie d'un membre Paheko** via API → non supporté
7. **Accéder aux données bancaires/IBAN** des payeurs HelloAsso → jamais exposé

***

## Liens officiels de référence

- Auth OAuth2 : `https://dev.helloasso.com/docs/getting-started`
- API Overview + Checkout : `https://dev.helloasso.com/docs/api-overview`
- Rate limits : `https://dev.helloasso.com/docs/limitation-api`
- Webhooks setup : `https://dev.helloasso.com/docs/notifications-webhook`
- Vérification HMAC : `https://dev.helloasso.com/docs/secure-webhook`
- Exemples notifications : `https://dev.helloasso.com/docs/notification-exemple`
- Validation paiements : `https://dev.helloasso.com/docs/validation-de-vos-paiements`
- Paheko API (v1.3.13+) : `https://paheko.cloud/api`
- SDK Python HelloAsso : `https://github.com/HelloAsso/helloasso-python`
- RGPD associations CNIL : `https://www.cnil.fr/sites/cnil/files/atoms/files/cnil-guide_association.pdf`
<span style="display:none">[^17][^18][^19][^20][^21][^22][^23][^24][^25][^26][^27][^28][^29][^30][^31]</span>

<div align="center">⁂</div>

[^1]: https://dev.helloasso.com/docs/getting-started

[^2]: https://dev.helloasso.com/docs/api-overview

[^3]: https://www.helloasso.com/blog/mes-premiers-pas-avec-lapi-helloasso/

[^4]: https://dev.helloasso.com/discuss/66ace683f2173f0041d7f5b0

[^5]: https://www.helloasso.com/blog/comment-utiliser-make/

[^6]: https://dev.helloasso.com/reference/put_partners-me-api-notifications-organizations-organizationslug

[^7]: https://dev.helloasso.com/docs/limitation-api

[^8]: https://dev.helloasso.com/docs/secure-webhook

[^9]: https://dev.helloasso.com/discuss/6769fc7589f0f300115a4008

[^10]: https://dev.helloasso.com/docs/notifications-webhook

[^11]: https://dev.helloasso.com/discuss/685aec6bdf22720018cce20e

[^12]: https://centredaide.helloasso.com/association?question=tutoriel-comment-creer-un-formulaire-d-adhesion

[^13]: https://paheko.cloud/api

[^14]: https://www.helloasso.com/blog/rgpd-et-associations-tout-comprendre-en-5-points-cles/

[^15]: https://www.cnil.fr/sites/cnil/files/atoms/files/cnil-guide_association.pdf

[^16]: https://www.cnil.fr/fr/cnil-direct/question/reglement-europeen-les-associations-sont-elles-concernees

[^17]: image.jpg

[^18]: https://dev.helloasso.com/discuss/66d5a08861a8ec001f746e21

[^19]: https://qlik.dev/apis/event/verify-webhook-signatures-hmac/

[^20]: https://forum.bubble.io/t/webhook-requires-hmac-sha256-signature-for-verification/220750

[^21]: https://centredaide.helloasso.com/association?question=helloasso-checkout-comment-fonctionne-module-paiement-integre-api

[^22]: https://forum.asana.com/t/incoming-webhooks-signing-secret-approach-to-hmac-validation/82008

[^23]: https://info.helloasso.com/solution/api

[^24]: https://info.helloasso.com/solution/checkout

[^25]: https://stackoverflow.com/questions/66521589/attempting-to-verify-a-webhook-secret-with-hmac-and-sha256

[^26]: https://centredaide.helloasso.com/association?question=4-nouveautes-simplifient-gestion-votre-association-mars-2026

[^27]: https://dev.helloasso.com/docs/notification-exemple

[^28]: https://centredaide.helloasso.com/association?question=comment-activer-notifications-les-nouvelles-inscriptions-mon-formulaire

[^29]: https://dev.helloasso.com/docs/validation-de-vos-paiements

[^30]: https://dev.helloasso.com/v3/discuss/685ebf14ed459000115da160

[^31]: https://centredaide.helloasso.com/association?question=comment-gerer-les-difficultes-d-acces-et-de-connexion

