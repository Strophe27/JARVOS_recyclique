> **Archivage JARVOS_recyclique (2026-04-02)** — Fichier renommé depuis `Contexte _ application métier pour associations _.md` selon la convention `references/recherche/` (date → titre → Perplexity → `reponse`). **Lié à :** `references/artefacts/2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md` §6.0 **D** (usage PIN / mot de passe web) et **E** (politique PIN **adoptée** produit v2 ; fond documentaire — les tableaux de la spec font foi pour le backlog). Contenu : prompt initial + réponse structurée Perplexity.

# Contexte : application métier pour associations / ressourceries (caisse, réception, tickets). Stack cible : session web (cookies httpOnly), backend autorité des permissions, modèle additif groupes/rôles. On veut définir une politique « ouverture de caisse » avec code PIN opérateur (distinct du mot de passe de session).

Questions à couvrir avec sources et comparaisons de pratiques :

1) Dans les POS / caisses enregistreuses et logiciels retail, comment gère-t-on typiquement : terminal partagé vs identité caissier, « sign-on » par PIN, ouverture de tiroir-caisse / session de vente ?
2) Modèles courants : PIN lié à l’utilisateur sur poste enregistré ; « clerk ID » ; 2FA ; limitations et risques (partage de PIN, poste non supervisé).
3) En France / UE : contraintes RGPD ou recommandations CNIL pertinentes pour codes PIN courts, traçabilité, conservation des logs, droit à l’effacement vs obligations comptables.
4) Bonnes pratiques sécurité : nombre d’essais, verrouillage temporaire, réinitialisation du PIN (qui peut le faire : admin local, super-admin), audit des réinitialisations.
5) Pour un poste « réception » (flux matière) vs poste « caisse » : même mécanisme PIN ou séparation des risques ?

Merci de structurer la réponse en recommandations actionnables pour un backlog produit (sans jargon juridique excessif), avec références (normes, guides, articles) quand c’est possible.

J'ai maintenant toutes les informations nécessaires pour construire une réponse complète et actionnelle. Voici la synthèse structurée pour votre backlog produit.

***

# Politique « Ouverture de caisse » avec PIN opérateur — Guide backlog produit

## 1. Terminal partagé \& identité caissier dans les POS

Dans les environnements retail, le modèle dominant est le **terminal partagé avec authentification rapide par caissier** : le poste reste démarré en permanence mais chaque opérateur doit « signer » sa session avant toute transaction. Les logiciels POS comme Oracle Simphony, Odoo POS ou ROLLER distinguent trois couches : la **session machine** (démarrée par un admin), la **session de vente** (ouverte par le caissier via PIN/badge), et la **session tiroir** (fund counting au démarrage).[^1][^2]

Le modèle le plus courant en retail physique est le **Clerk ID / Employee ID** : chaque vendeur a un identifiant court (4–6 chiffres) qui trace ses transactions sans mot de passe long. Sur les postes à fort trafic (supermarché, restauration rapide), le glissement vers RFID/badge est dominant pour éviter la saisie manuelle.[^3]

**Pour RecyClique :** implémenter un PIN opérateur de 4–6 chiffres distinct du mot de passe de session web est le bon niveau, cohérent avec les pratiques POS modernes.

***

## 2. Modèles d'authentification opérateur — Comparatif

| Modèle | Avantages | Risques / Limites |
| :-- | :-- | :-- |
| **PIN court lié à l'utilisateur** (4–6 chiffres) | Rapide, pas de friction, traçabilité individuelle | Partage facile entre collègues, force brute si pas de lockout |
| **Clerk ID numérique** (code unique affiché) | Ultra-rapide, idéal poste à flux élevé | Peu sécurisé si visible ou prévisible |
| **Badge RFID / Dallas key** | Quasi-instantané, pas mémorisable, audit précis | Coût hardware, risque de perte/emprunt du badge |
| **PIN + validation manager (2-étapes)** | Convient aux actions sensibles (annulation, remise) | Trop lent pour chaque vente courante |
| **Biométrie** | Frictionless, non-partageable | Coût hardware, RGPD sensible (donnée biométrique = catégorie spéciale) [^4] |

Le risque n° 1 dans les ressourceries à bénévoles est le **partage de PIN entre membres** (buddy punching), qui détruit l'imputabilité comptable. La recommandation sectorielle est d'imposer le changement de PIN à la création et à intervalle régulier (6 mois), et d'interdire les PINs triviaux (`1234`, `0000`).[^1]

***

## 3. Contraintes RGPD / CNIL sur les logs et PINs

Trois textes créent une tension qu'il faut arbitrer dans le backlog :

- **Logs d'accès \& opérations** : la CNIL recommande une conservation entre **6 mois et 1 an** en fenêtre glissante (délibération 2021 sur la journalisation). Au-delà, anonymisation partielle requise.[^5][^6][^7]
- **Obligations comptables** : les pièces justificatives comptables (tickets de caisse, journaux de vente) doivent être conservées **10 ans** (Code de commerce, art. L123-22). Ce délai prime sur la minimisation RGPD car il répond à une **obligation légale explicite**.[^8][^9]
- **PINs eux-mêmes** : un PIN opérateur est une donnée d'authentification — il doit être stocké **haché + salé** (jamais en clair), non lisible par l'admin. La CNIL (Guide sécurité 2024) impose le hashage des mots de passe  ; même règle applicable aux PINs.[^10]

**Arbitrage backlog :**

- Logs de *session / authentification* (qui a ouvert la caisse, à quelle heure) → **1 an** glissant, accès restreint aux admins, non modifiable.
- Logs *comptables* (ticket, montant, opérateur) → **10 ans**, archivage séparé, peut être pseudonymisé (ID interne plutôt que nom complet) après clôture d'exercice.
- Droit à l'effacement : **ne s'applique pas** aux données liées à une obligation comptable légale (art. 17(3)(b) RGPD).

***

## 4. Bonnes pratiques sécurité du PIN — Items backlog concrets

### Règles de base (à implémenter en sprint 1)

- **Longueur minimale : 4 chiffres** pour le confort terrain ; **6 chiffres recommandé** pour les actions sensibles (annulation, remboursement, forçage d'ouverture).[^11]
- **Interdire les séquences triviales** : `1234`, `0000`, `1111`, date de naissance si connue.
- **Hashage bcrypt / Argon2id** du PIN en base, jamais SHA-256 simple (trop rapide à brute-forcer).


### Lockout et throttling

- **3 à 5 tentatives échouées** → verrouillage temporaire de **5 minutes**.[^11]
- Après 10 tentatives cumulées dans la journée → escalade vers admin local (notification push / email).
- Afficher un compteur de tentatives restantes à l'utilisateur (UX transparente).
- Pas de verrouillage permanent sans procédure de déblocage claire (risque d'impossibilité d'ouvrir la caisse en production).


### Qui peut réinitialiser ?

| Acteur | Peut faire | Trace d'audit |
| :-- | :-- | :-- |
| **Admin local** (responsable ressourcerie) | Réinitialiser le PIN d'un opérateur de son site | Oui — log horodaté, avec l'ID admin |
| **Super-admin** (JARVOS/RecyClique) | Réinitialiser tout PIN, déverrouiller compte gelé | Oui — log horodaté, alerte mail à l'admin local |
| **L'opérateur lui-même** | Changer son propre PIN (ancien PIN requis) | Oui |
| **Personne** | Voir le PIN en clair | — (hashé, irréversible) |

Les réinitialisations par admin doivent générer un **PIN temporaire à usage unique** affiché une seule fois, que l'opérateur doit changer à la prochaine connexion.[^12]

***

## 5. Poste caisse vs. poste réception — Même mécanisme ou séparation ?

La distinction fonctionnelle **justifie des politiques PIN différenciées**, même si le mécanisme technique sous-jacent peut être identique :


| Critère | Poste Caisse | Poste Réception (flux matière) |
| :-- | :-- | :-- |
| **Risque primaire** | Fraude financière, détournement d'espèces | Erreur de saisie stock, faux apport, contournement tri |
| **Fréquence d'auth** | Chaque changement de caissier + ouverture session | Début de shift + chaque dépôt entrant |
| **Niveau PIN requis** | 4–6 chiffres, lockout strict | 4 chiffres suffisent, lockout souple |
| **Actions sensibles** | Annulation vente, remboursement, ouverture manuelle tiroir | Validation d'apport hors-procédure, re-catégorisation article |
| **Log prioritaire** | Ticket + montant + opérateur (10 ans comptable) | Bon de dépôt + ID opérateur (5 ans min., traçabilité Ecologic) |
| **2FA recommandé** | Oui pour remboursement > seuil (ex. > 50 €) | Non en standard, oui si super-dépôt ou annulation |

**Recommandation actionnelle :** utiliser le **même système PIN** (même table `operator_pins`, même logique lockout), mais définir des **scopes d'autorisation distincts** par rôle. Un opérateur caisse avec scope `cash:open_drawer` ne peut pas valider un apport Ecologic, et vice versa. Cela évite la duplication de code tout en maintenant une séparation des risques claire dans le modèle additif groupes/rôles que vous avez décrit.

***

## Synthèse pour le backlog — User Stories clés

- **US-01** : En tant qu'opérateur, je peux m'authentifier sur le poste caisse par PIN 4–6 chiffres, distinct de mon mot de passe web, afin d'ouvrir une session de vente tracée.
- **US-02** : En tant que système, je verrouille le compte opérateur après 5 tentatives PIN échouées pendant 5 minutes, et notifie l'admin local.
- **US-03** : En tant qu'admin local, je peux générer un PIN temporaire à usage unique pour un opérateur verrouillé ; la réinitialisation est logguée avec mon ID.
- **US-04** : En tant que DPO/responsable, je peux consulter les logs d'accès caisse sur 12 mois glissants ; les logs comptables sont archivés 10 ans en lecture seule.
- **US-05** : En tant qu'opérateur réception, j'utilise le même mécanisme PIN mais le scope `reception:intake` ne donne pas accès aux fonctions caisse.
- **US-06** : Les PINs sont stockés hashés (Argon2id), jamais visibles en clair, y compris pour le super-admin.

**Références :** CNIL Recommandation Journalisation 2021  ; CNIL Guide Sécurité 2024  ; Code de commerce art. L123-22 (10 ans)  ; PCI PTS POI v4 pour les exigences PIN hardware payment  ; OLOID PIN security best practices  ; Oracle POS cash drawer management.[^2][^13][^7][^10][^8][^11]
<span style="display:none">[^14][^15][^16][^17][^18][^19][^20][^21][^22][^23][^24][^25][^26][^27][^28][^29][^30][^31][^32][^33][^34][^35][^36][^37][^38][^39][^40][^41][^42][^43][^44][^45]</span>

<div align="center">⁂</div>

[^1]: https://www.tcang.net/how-to-operate-pos-machine-efficientl.html

[^2]: https://docs.oracle.com/cd/E66669_01/doc.28/e66799/t_peripherals_cash_drawer.htm

[^3]: https://www.reddit.com/r/Odoo/comments/1oc8mef/pos_force_employee_confirmationpincodebadge_when/

[^4]: https://www.pcisecuritystandards.org/documents/pos_ped_security_requirements.pdf

[^5]: https://www.inkivari.com/blog/le-quizz-hebdomadaire-d-inkivari-7/rgpd-conservation-logs-connexion-cpce-cnil-1-an-34

[^6]: https://www.cnil.fr/fr/securite-tracer-les-operations

[^7]: https://www.cnil.fr/sites/cnil/files/atoms/files/recommandation_-_journalisation.pdf

[^8]: https://maine-et-loire.cerfrance.fr/actualites/duree-conservation-documents-comptables

[^9]: https://www.billup.com/blog/duree-conservation-documents-obligations

[^10]: https://www.cnil.fr/sites/cnil/files/2024-03/cnil_guide_securite_personnelle_2024.pdf

[^11]: https://www.oloid.com/blog/pin-authentication

[^12]: https://www.avatier.com/blog/login-reset-for-point-of-sale/

[^13]: https://www.pcisecuritystandards.org/documents/PCI_PTS_POI_SRs_v4_Final.pdf

[^14]: contexte-pour-recherche-externe.md

[^15]: presentation-plateforme-recyclic.md

[^16]: paheko_guide_a4.pdf

[^17]: TODO Christophe - RecycClique \& Paheko.pdf

[^18]: 2025-01-30_RETRAITEMENT_recyclique-guide-complet-Paheko.md

[^19]: 00_JARVOS_mini.md

[^20]: JARVOS_nano analyse-opus_4.6

[^21]: appercu_ecosysteme.md

[^22]: 📋 __RecyClique - Système RAG Intelligent _ Dossier.pdf

[^23]: Comment les ressourceries doivent peuvent faire po.pdf

[^24]: Paheko RecyClique.md

[^25]: https://journalengineering.fe.up.pt/index.php/upjeng/article/download/2183-6493_005.002_0003/351

[^26]: http://arxiv.org/pdf/2011.06144.pdf

[^27]: https://myukk.org/SM2017/sm_pdf/SM1948.pdf

[^28]: https://www.mdpi.com/1099-4300/24/9/1224/pdf?version=1662024014

[^29]: https://www.scienceopen.com/document_file/00b05564-3723-48db-9f00-fda924c18687/ScienceOpen/088_Brostoff.pdf

[^30]: http://www.scirp.org/journal/PaperDownload.aspx?paperID=46339

[^31]: https://commerce.toshiba.com/wps/portal/marketing/?urile=wcm%3Apath%3A%2Fen-us%2Fhome%2Fcompany%2Fpatents-publications%2Ftechnical-disclosure-3254\&mapping=tgcs_new.portal.company.newsdetails.new

[^32]: https://mysupport.roller.software/hc/en-us/articles/360001554616-Manage-individual-POS-device-settings

[^33]: https://jshowtechs.com/how-cash-drawer-open-and-work/

[^34]: https://logiqe.fr/cybersecurite-managee/conservation-des-logs/

[^35]: https://cmstothemax.wordpress.com/2012/06/09/pos-cash-drawer-opening-troubleshooting/

[^36]: https://codnum.fr/gestion-des-logs-conformite-securite-et-tracabilite-pour-votre-entreprise/

[^37]: https://learn.microsoft.com/en-us/entra/standards/pci-dss-guidance

[^38]: https://stackoverflow.com/questions/2448769/best-practice-for-writing-a-pos-system

[^39]: https://documentation.hypersoft.de/Content/Hypersoft-POS/POS_Drawer.htm

[^40]: https://www.cnil.fr/fr/la-cnil-publie-une-recommandation-relative-aux-mesures-de-journalisation

[^41]: https://www.dfis.fr/2024/09/26/quelle-est-la-bonne-duree-de-conservation-des-logs/

[^42]: https://clusif.fr/wp-content/uploads/2022/03/20210906-Referentiel-des-logs-journalisation.pdf

[^43]: https://www.archipel-lyon.fr/blog/quels-delais-de-conservation-pour-quels-documents-dentreprise/

[^44]: https://www.cnil.fr/fr/consignes-pour-renforcer-la-securite-des-grandes-bases-de-donnees

[^45]: https://omegapos.com/blogs/pos-security-best-practices-protecting-customer-data/

