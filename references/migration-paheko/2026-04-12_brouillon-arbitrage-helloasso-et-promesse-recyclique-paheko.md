# Brouillon — Arbitrage HelloAsso et promesse Recyclique ↔ Paheko

**Date :** 2026-04-12  
**Statut :** brouillon (à relire / valider par toi ; matière pour la story **9.4** et pour la com interne ou financeurs)  
**S’appuie sur :** `2026-04-12_specification-integration-helloasso-recyclique-paheko.md`, `references/recherche/2026-04-12_helloasso-api-v5-paheko-perimetre-recyclique_perplexity_reponse.md`, backlog Epic 9 (`epics.md`).

---

## A. Arbitrage express (ce qu’on tranche pour avancer sereinement)

1. **Voie retenue (brouillon) :** Recyclique parle **directement** à l’**API HelloAsso** (paiements, commandes, notifications). Paheko reçoit les effets utiles via **son API** (membres, compta, liens), comme déjà pensé pour le sync terrain.  
2. **Extension HelloAsso « dans » Paheko (cloud) :** on ne s’en sert **pas** comme brique centrale quand Paheko est en local ou hors offre cloud — sinon les installations « chez l’asso » ne peuvent pas reproduire le même schéma.  
3. **Quotas d’appels HelloAsso — clôturé (lecture navigateur, 2026-04-12) :** la page [Limite d’appels API](https://dev.helloasso.com/docs/limitation-api) ne chiffre les paliers (10 / 10 s, 20 / 10 min, 50 / h) que pour l’**endpoint d’authentification** (`/oauth2/token`). **Aucun autre bloc chiffré** n’y figure pour les routes métier v5 à cette date. **Recyclique** : **cacher** le jeton, renouveler via **refresh_token**, éviter de spammer l’OAuth — en pratique ces plafonds ne sont pas le goulet d’étranglement. Conserver **webhooks + appels sobres + gestion 429** par principe d’architecture (et parce que la doc mentionne encore les 429 si le trafic est trop dense). Détail et points dev (metadata checkout, 15 min, Paheko / email) : spec `2026-04-12_specification-integration-helloasso-recyclique-paheko.md` §3.5–3.6 et §4.2.  
4. **Rappel backlog :** dans l’Epic 9, l’ordre prévu passe par la **gouvernance des mappings** et le module **adhérents minimal** avant d’industrialiser HelloAsso au grand galop — pour que chaque paiement retombe sur une **identité** et des **droits** clairs dans Recyclique, puis dans Paheko.

---

## B. La promesse Recyclique (ce que le système **apporte** une fois le chantier abouti)

### B.1 En une phrase

**Les gens paient ou adhèrent en ligne par les circuits HelloAsso ; ils vivent le parcours dans Recyclique quand c’est utile ; l’association voit l’activité et les statuts dans Recyclique ; Paheko reçoit les enregistrements utiles (membres, cotisations, écritures) pour la vie associative et la compta, sans que l’équipe refasse la saisie à la main.**

---

### B.2 Côté personne extérieure (adhérent, donateur, acheteur de billet)

| # | Situation | Ce que la personne **fait** | Ce qu’elle **voit / ressent** |
|---|-----------|------------------------------|-------------------------------|
| 1 | **Cotisation ou adhésion** | Elle suit un lien ou un bouton depuis Recyclique (site ou espace connecté). | Un parcours clair : montant, formulaire, paiement sécurisé géré par HelloAsso, retour sur Recyclique avec un statut compréhensible (« payé », « en attente », etc.). |
| 2 | **Don** | Même idée : bouton ou campagne mise en avant dans Recyclique. | Confirmation ; historique simple du don côté espace perso si vous l’activez. |
| 3 | **Billetterie / événement** | Elle choisit une formule, paie, reçoit ce qu’il faut pour l’événement. | Liste des achats ou billets accessibles depuis Recyclique selon ce que vous configurez. |
| 4 | **Crowdfunding / campagne** | Elle contribue depuis un point d’entrée Recyclique qui renvoie vers le flux HelloAsso adapté. | Barème de progression, messages de campagne : ce que vous choisissez d’afficher dans Recyclique à partir des données HelloAsso. |

**En résumé pour elles :** une **porte d’entrée** Recyclique, un **paiement** fiable HelloAsso, un **retour** lisible dans votre univers (sans multiplier les comptes à retenir).

---

### B.3 Côté équipe de l’association (admin, trésor, bureau)

| # | Besoin | Ce que l’équipe **fait dans le quotidien** |
|---|--------|---------------------------------------------|
| 1 | **Préparer** adhésions, dons, billetterie, campagnes | Elle utilise **l’espace HelloAsso** de l’association pour créer ou ajuster les formulaires et campagnes (c’est l’outil prévu par HelloAsso pour ça). |
| 2 | **Brancher** Recyclique sur HelloAsso | Dans Recyclique (zone admin), elle saisit ce qu’il faut pour que le serveur puisse parler à HelloAsso de façon sécurisée ; elle colle l’URL de notification que Recyclique indique, dans HelloAsso, pour recevoir les événements en temps utile. |
| 3 | **Voir l’activité** | Tableau de bord ou vues Recyclique : entrées d’argent, adhésions, dons, événements — selon ce que vous aurez choisi d’afficher en priorité. |
| 4 | **Fiabiliser Paheko** | Les **fiches membres** et les **écritures** (ou imports cotisation) partent vers Paheko selon les règles que vous aurez validées ; l’équipe contrôle les **liens** (qui a payé quoi, quelle fiche Paheko) depuis Recyclique. |
| 5 | **Gérer les imprévus** | File d’attente ou écran de reprise : si un envoi Paheko a attendu, l’admin voit le statut et peut relancer ou corriger depuis Recyclique sans tout perdre. |

**En résumé pour elles :** **une** chaîne de confiance Recyclique ↔ HelloAsso ↔ Paheko, avec des **écrans de pilotage** plutôt que des copier-coller entre trois sites.

---

### B.4 Ce qui se retrouve **dans Paheko** quand la chaîne est en service

- **Membres :** création ou mise à jour des fiches à partir des paiements / formulaires HelloAsso traités par Recyclique (avec le lien conservé côté Recyclique pour ne pas dupliquer n’importe comment).  
- **Comptabilité :** écritures de recettes (cotisations, dons, ventes d’événements selon votre plan comptable et vos règles).  
- **Cotisations / activités :** quand vous activez ce volet, imports ou inscriptions alignés sur les activités déjà paramétrées dans Paheko.  
- **Traçabilité :** corrélation entre un paiement HelloAsso, une ligne dans Recyclique et une trace côté Paheko — pour répondre aux questions « d’où vient ce montant ? ».

---

## C. « Jusqu’au bout » : comment on déroule le film (sans jargon)

**Phase 1 — Le socle qui tient la route**  
Paiement en ligne (adhésion ou don) depuis Recyclique ; notification automatique ; statut visible ; première bascule fiche membre Paheko ; preuve que ça marche en vrai sur une petite asso pilote.

**Phase 2 — L’association vit dedans**  
Plus de types de formulaires (billets, campagnes) branchés sur les mêmes mécanismes ; écritures comptables régulières ; écrans admin pour suivre volumes et anomalies.

**Phase 3 — Confort et image**  
Tableaux de campagne, rappels aux adhérents, exports pour l’AG, tout ce qui rend le quotidien fluide — toujours en réutilisant la même ossature (Recyclique au centre, HelloAsso pour l’encaissement, Paheko pour le cadre légal et comptable).

---

## F. Cas réel : l’asso utilise déjà HelloAsso (ex. 70 adhérents) puis installe Recyclique + Paheko

**Ce n’est pas « 70 personnes par heure ».** Les chiffres 10 / 20 / 50 de la doc HelloAsso ciblent l’**OAuth** (`/oauth2/token`), pas « un adhérent = un quota ». Lecture navigateur (2026-04-12) : **pas d’autres plafonds chiffrés** sur cette page pour `/orders`, `/forms`, etc. Un **premier import tout-API** pour l’historique reste raisonnable si le code est **économe** (pagination, backoff sur 429). L’**export CSV / Excel** depuis HelloAsso reste une **option** simple pour les équipes qui préfèrent un assistant d’import sans script.

**Pour l’historique déjà chez HelloAsso**, la trajectoire réaliste est : **export depuis l’espace HelloAsso** (Excel / CSV selon les écrans disponibles pour l’asso : versements, adhésions, etc.) **puis import guidé dans Recyclique** (assistant qui mappe les colonnes, dédoublonne par e-mail ou identifiant HelloAsso). Ensuite **création ou import côté Paheko** selon vos règles (`/api/user/import`, etc.). Le **premier jour** ne repose pas sur « 70 appels API » pour tout reconstituer.

**Après cette montée en charge initiale**, chaque **nouvelle** adhésion ou paiement peut suivre le flux **temps utile** (notifications HelloAsso vers Recyclique, puis file vers Paheko) sans rejouer toute la liste des 70 à chaque fois.

---

## G. « Synchronisation automatique » : ce que ça veut dire

- **Oui pour la suite :** quand l’association a configuré chez HelloAsso l’URL de notification fournie par Recyclique, HelloAsso peut **appeler votre serveur** dès qu’un événement utile arrive. Recyclique enregistre, traite en file si besoin, et **met à jour Paheko** selon les règles validées — c’est une synchro **automatique** pour tout ce qui arrive **après** la mise en service.
- **Rôle de Recyclique :** garder les **liens** (identifiant commande HelloAsso ↔ personne dans Recyclique ↔ membre Paheko) et montrer à l’admin que la chaîne est à jour ou qu’une ligne demande une reprise.

---

## D. Où ça vit dans le repo (pour les devs ou un futur toi)

- Spec technique détaillée : `2026-04-12_specification-integration-helloasso-recyclique-paheko.md`  
- Recherche API / quotas / Paheko : `references/recherche/2026-04-12_helloasso-api-v5-paheko-perimetre-recyclique_perplexity_reponse.md`  
- Endpoints Paheko (recoupement) : `references/paheko/liste-endpoints-api-paheko.md`

---

## E. Prochaine action minimale pour toi

- Lire ce brouillon et cocher : **OK promesse** / **à ajuster** (une phrase suffit).  
- ~~Vérification page limitation-api~~ **Fait** (2026-04-12) — voir A.3.

Une fois validé, ce fichier peut alimenter **story 9.4** (décision écrite) et servir de **texte d’accroche** pour bénévoles ou partenaires (« voici ce que Recyclique leur apporte avec HelloAsso et Paheko »).
