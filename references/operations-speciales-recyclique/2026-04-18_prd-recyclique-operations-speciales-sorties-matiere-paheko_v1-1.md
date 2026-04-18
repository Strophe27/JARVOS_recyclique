# PRD — Recyclique Caisse : opérations spéciales, sorties matière et intégration Paheko

> Ventilé le 2026-04-18 depuis `references/_depot/PRD_recyclique_operations_speciales_v1_1.md`. Dossier groupe : **`references/operations-speciales-recyclique/`**.

Version: 1.1  
Date: 2026-04-18  
Statut: version réécrite et renforcée après QA finale

## 1. Objet

Ce document définit le périmètre fonctionnel cible des opérations spéciales de caisse dans Recyclique, en articulation avec la comptabilité matière de ressourcerie et la comptabilité financière synchronisée vers Paheko.

Il est conçu pour être transmis à une équipe produit, à un agent de développement ou à un Story Runner BMAD afin de produire ensuite stories, tâches, tests et implémentation sans dépendre d'un contexte oral supplémentaire.

## 2. Résumé exécutif

Recyclique doit distinguer deux couches complémentaires.

1. **Parcours spéciaux de caisse** : annulation, remboursement, décaissement, mouvement interne, échange.
2. **Tags métier sur ticket ou ligne** : gratuité moins de 18 ans, gratiféria, don solidaire, bénéficiaire, campagne sociale, etc.

Principe cardinal :
- s'il n'y a pas d'argent, il n'y a pas d'écriture financière ;
- s'il y a un flux d'argent, il doit être traçable, ventilé par moyen de paiement ou de remboursement, et exportable proprement vers Paheko ;
- les comptes comptables exacts restent paramétrables dans les écrans experts / SuperAdmin / mappings Paheko.

## 3. Contexte

Recyclique sert à la fois :
- à tracer les objets qui entrent et sortent ;
- à produire des tickets de caisse ;
- à gérer des cas de gratuité, d'échange, de retour, de remboursement ;
- à transmettre à Paheko les flux financiers réels de manière propre.

Dans une ressourcerie, tous les cas ne relèvent pas d'une vente simple :
- des objets peuvent être redonnés gratuitement ;
- des publics spécifiques peuvent bénéficier de gratuités ;
- un usager peut rapporter un objet et repartir avec un autre ;
- une équipe peut rembourser des frais à un bénévole ;
- la caisse peut faire l'objet de mouvements internes sans achat ni remboursement client.

Le produit doit donc expliciter ces cas au lieu de les laisser dériver vers des champs libres, des tickets fictifs mal qualifiés ou des contournements opératoires.

## 4. Objectifs

### 4.1 Objectifs produit
- Donner aux équipes terrain des parcours simples pour les opérations inhabituelles.
- Conserver une comptabilité matière fidèle aux mouvements réels d'objets.
- Produire une comptabilité financière cohérente, ventilée et exportable vers Paheko.
- Réduire les bricolages de terrain (post-it, tickets fictifs mal qualifiés, contournements).
- Permettre des statistiques fines sur les gratuités et les bénéficiaires.

### 4.2 Objectifs techniques
- Réutiliser au maximum le socle Recyclique existant.
- Séparer clairement les opérations matière seules des opérations mixtes matière + finance et des opérations purement financières.
- Prévoir un modèle compatible avec permissions, audit, justificatifs, synchronisation et outbox Paheko.
- Éviter la création de logiques financières parallèles quand un sous-flux standard existe déjà.

## 5. Hors périmètre

Ce PRD ne fige pas :
- les numéros exacts des comptes comptables ;
- le design pixel-perfect ;
- les détails table/colonne du schéma SQL ;
- l'implémentation technique exacte des endpoints.

Ces éléments devront être dérivés depuis le dépôt Recyclique et les paramètres experts existants.

## 6. Personas

### 6.1 Caissier / opérateur terrain
- Utilise la caisse au quotidien.
- Doit gérer simplement ventes, gratuités, retours et échanges simples.
- Ne doit pas avoir à comprendre la comptabilité.

### 6.2 Responsable caisse / administrateur opérationnel
- Peut valider des opérations sensibles.
- Peut intervenir sur remboursements exceptionnels, écarts et mouvements internes.
- Dispose d'un code PIN de validation step-up.

### 6.3 Administrateur comptable / SuperAdmin
- Paramètre les moyens de paiement et leurs mappings comptables.
- Paramètre les journaux, règles d'export et comportements experts côté Paheko.
- Analyse les sorties financières, justificatifs et rapprochements.

### 6.4 Responsable structure / direction
- Veut un système fiable, auditable et simple.
- S'intéresse aux statistiques sociales, matière et financières.

## 7. Principes structurants

1. Toute opération spéciale appartient à **un seul parcours principal**.
2. Les gratuités et variantes sociales ne sont pas des parcours lourds mais des **tags métier** dans le ticket standard.
3. Un ticket à **0 €** est autorisé pour tracer une sortie matière sans flux financier.
4. Le **free** n'est pas un moyen de paiement ; c'est une sortie à 0 €.
5. Un remboursement standard est lié à un ticket source.
6. Un remboursement sans ticket est un **parcours expert exceptionnel**.
7. Les remboursements financiers doivent être **ventilés par moyen effectif de remboursement** côté chaîne Paheko.
8. Les frais, décaissements et mouvements sensibles doivent porter un **niveau de preuve** adapté.
9. Les ardoises sont un domaine séparé et hors du périmètre de ces parcours.
10. Les comptes comptables exacts restent **configurables**.
11. Toute opération sensible de niveau élevé doit distinguer **initiateur** et **validateur**.
12. Toute opération financière doit pouvoir exposer son **état de synchronisation Paheko**.

## 8. Vue d'ensemble des domaines

### 8.1 Parcours spéciaux
- Annulation
- Remboursement
- Décaissement
- Mouvement interne
- Échange

### 8.2 Tags métier du ticket
- Gratuité moins de 18 ans
- Gratiféria
- Don solidaire
- Bénéficiaire / association destinataire
- Campagne / dispositif social
- Autres tags statistiques autorisés par configuration

## 9. Matrice fonctionnelle centrale

| Domaine | Définition | Flux matière | Flux financier | Point d'entrée |
|---|---|---|---|---|
| Annulation | Correction d'une vente encore annulable | Possible réintégration | Oui selon correction | Hub opérations spéciales ou action ticket |
| Remboursement | Retour d'argent lié à une vente | Optionnel selon retour objet | Oui | Hub opérations spéciales |
| Décaissement | Sortie de trésorerie hors ticket client | Non | Oui | Hub opérations spéciales |
| Mouvement interne | Mouvement de trésorerie sans vente ni charge | Non | Oui | Hub opérations spéciales |
| Échange | Retour objet + sortie autre objet, avec ou sans différence | Oui | 0, encaissement complémentaire, ou remboursement | Hub opérations spéciales |
| Sortie gratuite taggée | Ticket standard à 0 € qualifié | Oui | Non | Ticket standard |

## 10. Parcours détaillés

### 10.1 Annulation

#### Définition
Correction d'une vente encore proche de l'acte initial, à distinguer d'un remboursement différé.

#### Cas d'usage
- erreur immédiate de saisie ;
- mauvais objet scanné ;
- vente validée à tort puis annulée rapidement.

#### Champs minimaux
- ticket source ;
- motif codifié ;
- commentaire libre si nécessaire ;
- opérateur ;
- date/heure.

#### Permissions
- permission dédiée de type `caisse.cancel`.

#### Validations
- ticket dans une fenêtre temporelle annulable ;
- ticket non déjà remboursé ;
- état compatible ;
- si déjà clôturé ou hors fenêtre, bascule vers autre parcours ou refus.

#### Effets attendus
- correction matière si nécessaire ;
- correction financière adaptée au flux initial.

#### Niveau de preuve
- N1 minimum.

### 10.2 Remboursement standard

#### Définition
Retour d'argent lié à un ticket source identifié.

#### Cas d'usage
- retour produit ;
- geste commercial validé ;
- correction après vente finalisée.

#### Champs minimaux
- ticket source ;
- motif codifié ;
- commentaire libre si nécessaire ;
- moyen effectif de remboursement ;
- opérateur ;
- date réelle de remboursement.

#### Permissions
- `caisse.refund`.

#### Validations
- ticket retrouvé ;
- ticket éligible ;
- pas déjà remboursé ;
- règles de session / autorité respectées ;
- branche spécifique pour exercice antérieur clos.

#### Effets attendus
- flux financier sortant ;
- ventilation par moyen effectif ;
- export Paheko dédié ;
- retour matière éventuel si l'objet revient réellement.

#### Niveau de preuve
- N1 ou N2 selon politique locale.

### 10.3 Remboursement exercice antérieur clos

#### Définition
Sous-cas du remboursement nécessitant un traitement expert et comptable distinct.

#### Permissions
- `caisse.refund` + permission experte type `accounting.prior_year_refund`.

#### Champs supplémentaires
- indicateur expert ;
- justification de traitement N-1 ;
- responsable validateur si requis.

#### Validations
- blocage par défaut ;
- autorisation uniquement via voie experte ;
- écriture séparée côté chaîne comptable.

#### Niveau de preuve
- N3 recommandé.

### 10.4 Remboursement exceptionnel sans ticket

#### Définition
Parcours expert réservé aux cas où le ticket ne peut pas être retrouvé ou à un cas réellement exceptionnel.

#### Caractère produit
- jamais fusionné au remboursement nominal ;
- jamais accessible comme simple variante banale ;
- toujours visible comme opération exceptionnelle avec audit renforcé.

#### Exigences minimales
- permission dédiée type `refund.exceptional` ;
- **step-up PIN** d'un administrateur/responsable ;
- motif codifié obligatoire ;
- justification texte obligatoire ;
- idéalement pièce jointe ou référence de preuve ;
- traçabilité du validateur.

#### Champs minimaux
- montant ;
- moyen de remboursement ;
- raison codifiée ;
- justification texte ;
- opérateur initiateur ;
- responsable validateur ;
- date réelle.

#### Niveau de preuve
- N3 obligatoire.

### 10.5 Décaissement

#### Définition
Sortie de trésorerie non liée à un ticket client.

#### Règle structurante
Le décaissement ne doit jamais devenir une catégorie poubelle. Chaque décaissement appartient à un **sous-type obligatoire**.

#### Sous-types MVP
- remboursement de frais bénévole ;
- petite dépense de fonctionnement ;
- sortie exceptionnelle validée ;
- autre sous-type seulement si codifié administrativement.

#### Champs minimaux
- sous-type ;
- bénéficiaire ou fournisseur ;
- montant ;
- moyen utilisé ;
- motif codifié ;
- commentaire libre ;
- opérateur ;
- date réelle ;
- référence justificative.

#### Permissions
- `cash.disbursement`.

#### Validations
- sous-type obligatoire ;
- plafond éventuel selon sous-type ;
- justificatif requis selon niveau de preuve ;
- caisse suffisante si sortie en espèces ;
- validation renforcée pour les sorties exceptionnelles.

#### Niveaux de preuve
- frais bénévole : N2 minimum ;
- dépense de fonctionnement : N2 ;
- sortie exceptionnelle : N3 recommandé.

### 10.6 Mouvement interne

#### Définition
Mouvement de trésorerie qui n'est ni une vente, ni un remboursement client, ni une charge de fonctionnement.

#### Exemples
- appoint de caisse ;
- apport de fond de caisse ;
- dépôt banque ;
- retrait banque ;
- transfert entre caisses ;
- régularisation d'écart selon la politique retenue.

#### Champs minimaux
- type de mouvement ;
- sens ;
- montant ;
- origine/destination ;
- motif ;
- opérateur ;
- justificatif ou référence.

#### Permissions
- `cash.transfer`.

#### Validations
- type obligatoire ;
- jamais classé comme décaissement de dépense ;
- justification renforcée pour mouvements sensibles ou élevés.

#### Niveau de preuve
- N2 ou N3 selon montant / type.

### 10.7 Échange

#### Définition
Retour d'un objet et sortie d'un autre objet, avec éventuellement une régularisation monétaire.

#### Sous-cas
1. échange pur sans argent ;
2. échange avec complément payé par le client ;
3. échange avec différence remboursée au client.

#### Règle centrale
L'échange est un **conteneur métier** :
- il y a toujours un mouvement matière ;
- il n'y a un mouvement financier que si la différence n'est pas nulle.

#### Champs minimaux
- ticket ou référence source si disponible ;
- objet(s) retourné(s) ;
- objet(s) remis ;
- motif ;
- opérateur ;
- différence éventuelle ;
- moyen de paiement/remboursement si différence.

#### Permissions
- `caisse.exchange` ;
- et permissions complémentaires si complément ou remboursement.

#### Niveau de preuve
- N0/N1 en échange pur standard ;
- renforcé si ticket introuvable ou remboursement associé.

## 11. Règle d'implémentation des échanges avec différence

Un échange avec différence financière ne doit pas introduire une logique monétaire parallèle.

Règles :
- si la différence est positive pour la structure, l'échange réutilise le sous-flux standard de vente complémentaire ;
- si la différence est négative pour la structure, l'échange réutilise le sous-flux standard de remboursement ;
- l'échange reste le conteneur métier de l'opération, mais les flux financiers reposent sur les briques financières standards déjà définies.

## 12. Ticket standard et tags métier

### 12.1 Principe
Les sorties gratuites et autres cas sociaux/statistiques doivent vivre dans le parcours standard de ticket, souvent avec un total à 0 €, enrichi par des **tags de ligne** ou **tags de ticket**.

### 12.2 Exemples de tags
- gratuité moins de 18 ans ;
- gratiféria ;
- don solidaire ;
- bénéficiaire / association destinataire ;
- campagne sociale ;
- autre tag paramétrable.

### 12.3 Effets attendus
- pas d'écriture financière si total 0 € ;
- sortie matière conservée ;
- possibilité de reporting par tag, type de matière, bénéficiaire, période.

### 12.4 Cas d'usage
- vêtements gratuits pour les moins de 18 ans ;
- journée gratiféria ;
- remise gratuite à une association partenaire ;
- sortie solidaire sans paiement.

## 13. Portée des tags métier

Les tags métier peuvent être :
- de niveau ticket ;
- de niveau ligne.

Règles :
- un tag de niveau ticket s'applique par défaut à toutes les lignes du ticket ;
- une ligne peut recevoir un tag spécifique qui surcharge le tag de ticket ;
- les statistiques doivent permettre l'agrégation par ticket, par ligne, par type de matière, par bénéficiaire et par période.

## 14. Niveaux de preuve

| Niveau | Exigence |
|---|---|
| N0 | Trace opérateur simple |
| N1 | Motif codifié + commentaire si nécessaire |
| N2 | N1 + référence justificative ou pièce jointe |
| N3 | N2 + validation responsable / PIN step-up |

### Affectation minimale
- annulation simple : N1 ;
- remboursement standard : N1 à N2 ;
- remboursement N-1 : N3 recommandé ;
- remboursement exceptionnel sans ticket : N3 obligatoire ;
- frais bénévole : N2 minimum ;
- dépense de fonctionnement : N2 ;
- mouvement sensible : N2 ou N3.

## 15. Gouvernance des validations sensibles

Pour toute opération sensible, le système doit distinguer :
- l'opérateur initiateur ;
- le responsable validateur ;
- le mode de validation (ex. PIN step-up) ;
- la date/heure de validation ;
- le motif de validation ;
- la référence de preuve ou pièce jointe associée.

### Champs conceptuels minimaux à prévoir
- `initiator_user_id`
- `approver_user_id`
- `approver_step_up_at`
- `approval_reason_code`
- `approval_comment`
- `approval_evidence_ref`

### Règles
- si les pièces jointes natives ne sont pas encore supportées, `approval_evidence_ref` devient obligatoire pour les opérations de niveau N3 ;
- le système doit pouvoir afficher qui a initié et qui a validé l'opération ;
- le validateur ne doit pas être implicite ni déduit a posteriori.

## 16. Permissions cibles

- `caisse.cancel`
- `caisse.refund`
- `accounting.prior_year_refund`
- `refund.exceptional`
- `cash.disbursement`
- `cash.transfer`
- `caisse.exchange`
- `caisse.free` si vous souhaitez séparer explicitement les gratuités

Le dépôt devra vérifier les permissions déjà présentes et créer les manquantes si nécessaire.

## 17. Données minimales à prévoir

### 17.1 Communes à toute opération spéciale
- id opération
- type de parcours
- site
- opérateur
- date/heure réelle
- statut
- motif codifié
- commentaire libre
- références croisées utiles

### 17.2 Spécifiques aux flux financiers
- montant
- moyen financier utilisé
- état de synchronisation Paheko
- clé(s) d'idempotence utiles
- indicateur exercice courant / antérieur si pertinent

### 17.3 Spécifiques à la matière
- objets entrants / sortants
- catégories / poids / typologie si disponible
- tags statistiques
- bénéficiaire éventuel

## 18. Cycle de vie opérationnel

Toute opération spéciale ou financière doit expliciter un statut de cycle de vie.

### Statuts conceptuels minimaux
- `draft`
- `validated`
- `committed_local`
- `pending_paheko_sync`
- `synced`
- `sync_failed`
- `cancelled`

### Objectifs
- garantir l'auditabilité ;
- permettre la reprise sur erreur ;
- distinguer l'état local de l'état comptablement synchronisé.

## 19. Règles Paheko

1. Seuls les flux financiers réels doivent produire une écriture destinée à Paheko.
2. Un ticket 0 € de gratuité ne doit pas générer de flux financier artificiel.
3. Les remboursements doivent être ventilés par moyen effectif de remboursement.
4. Les cas N-1 clos doivent suivre une branche comptable distincte.
5. Les décaissements et mouvements internes doivent être différenciés.
6. Les comptes exacts restent paramétrables via les écrans experts et mappings.
7. Toute opération financière doit exposer un état de synchronisation visible et un motif clair en cas d'échec de synchronisation.

## 20. UX cible

### 20.1 Hub opérations spéciales
Prévoir un hub clair avec les entrées :
- Annuler
- Rembourser
- Décaisser
- Mouvement interne
- Échanger

### 20.2 Ticket standard enrichi
Dans le flux normal de caisse, permettre d'ajouter des tags sur lignes ou ticket pour qualifier :
- gratuité moins de 18 ans ;
- gratiféria ;
- don solidaire ;
- bénéficiaire.

### 20.3 Parcours expert séparé
Les cas sensibles, notamment le remboursement exceptionnel sans ticket, doivent être nettement séparés du flux nominal et protégés par PIN responsable.

## 21. Backlog recommandé

### P0
- Hub opérations spéciales visible et cohérent.
- Remboursement standard visible en caisse.
- Ventilation Paheko des remboursements par moyen.
- Traitement des cas exercice antérieur clos.
- Remboursement exceptionnel sans ticket avec PIN responsable.

### P1
- Échange pur / complément / différence.
- Décaissement à sous-types codifiés.
- Mouvements internes de trésorerie.

### P2
- Tags métier sur ticket et ligne.
- Reporting matière/statistique par tag, bénéficiaire, public.

### P3
- Pièces jointes natives.
- Seuils de validation plus riches.
- Audit avancé et reporting transversal.

## 22. Critères d'acceptation globaux

Le périmètre sera considéré correctement livré si :
1. chaque cas spécial peut être classé sans ambiguïté dans un parcours unique ;
2. les gratuités et sorties sociales se traitent via tickets standard taggés ;
3. un remboursement standard ne peut pas être effectué sans ticket ;
4. un remboursement exceptionnel exige validation PIN responsable et justification forte ;
5. les remboursements exportés vers Paheko sont ventilés par moyen ;
6. l'échange pur ne génère pas de comptabilité financière ;
7. les décaissements ne sont pas utilisés comme catégorie poubelle ;
8. les mouvements internes sont séparés des dépenses ;
9. les comptes restent paramétrables ;
10. les utilisateurs terrain n'ont pas à raisonner en comptes comptables ;
11. les opérations N3 distinguent initiateur et validateur ;
12. les opérations financières affichent un état de synchronisation.

## 23. Non-objectifs et interdictions

- Ne pas fusionner ardoises et remboursements.
- Ne pas traiter le décaissement comme un champ libre fourre-tout.
- Ne pas transformer les tags de gratuité en gros parcours spéciaux.
- Ne pas permettre au flux exceptionnel sans ticket de contourner le remboursement nominal.
- Ne pas figer en dur les numéros de comptes si le paramétrage expert doit rester souverain.
- Ne pas créer une logique financière spécifique à l'échange si les sous-flux standards existent déjà.

## 24. Livrables attendus d'un agent à partir de ce PRD

À partir de ce document et du dépôt Recyclique, un agent doit pouvoir produire :
- PRD détaillés par sous-périmètre si besoin ;
- stories BMAD ou équivalent ;
- plan d'implémentation P0 → P3 ;
- design technique repo-aware ;
- tests unitaires, intégration et e2e ;
- propositions de migrations éventuelles ;
- plan de vérification Paheko ;
- matrice d'écart PRD ↔ dépôt ;
- machine d'états opérationnelle ;
- matrice initiateur / validateur / preuve / permission.
