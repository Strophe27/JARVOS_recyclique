# Mode d’emploi — Paramétrage comptable (SuperAdmin)

**Version :** 1.1 · **Dernière mise à jour :** 2026-04-16 (relecture QA : navigation, PIN comptes globaux, sommaire, précision débit / Paheko, chemins dépôt).

**Public :** bénévoles ou salariés qui gèrent la caisse et la compta dans une ressourcerie, avec le profil **super-admin** Recyclique. Aucun prérequis comptable : les notions Paheko sont expliquées pas à pas.

**Objectif :** configurer Recyclique pour que les **clôtures de caisse** produisent des écritures cohérentes dans **Paheko**, sans casser l’historique.

---

## Sur cette page

| Section | Contenu |
|---------|---------|
| [§1 — Où trouver cet écran ?](#section-1) | Accès, URL, hub cockpit, onglets, PIN |
| [§2 — Ordre conseillé](#section-2) | Première mise en place |
| [§3 — Moyens de paiement](#section-3) | Actions, ordre, aide comptes, désactivation, publication |
| [§4 — Comptes globaux](#section-4) | Champs, PIN, piège journal |
| [§5 — Paheko : clôture](#section-5) | Mappings, résolveur, exercice |
| [§6 — Paheko : support](#section-6) | Diagnostic outbox |
| [§7 — Flux Recyclique ↔ Paheko](#section-7) | Chaîne et politique agrégé / par moyen |
| [§8 — Glossaire](#section-8) | Termes clés |
| [§9 — Dépannage](#section-9) | Symptômes / pistes |
| [§10 — Fichiers sources](#section-10) | Chemins dans le dépôt |

<a id="section-1"></a>

## 1. Où trouver cet écran ?

### Accès dans l’interface

Dans **Peintre** (interface Recyclique v2), ouvrez la partie **administration** puis l’entrée qui mène au **paramétrage comptable** expert. L’URL est en général du type **`/admin/compta/parametrage`** (avec éventuellement `?tab=…` pour ouvrir directement un onglet).

**Note déploiement :** les libellés exacts du menu et l’arborescence peuvent **légèrement varier** selon le manifeste d’écran chargé (démo, terrain, évolutions produit). Si le libellé diffère, cherchez l’URL ci-dessus ou demandez à la personne qui gère votre instance.

### Hub « cockpit » comptable

Souvent, une page **cockpit** ou **hub** comptable existe à **`/admin/compta`** (liste de raccourcis ou d’actions). Le **paramétrage expert** détaillé est la page **`…/parametrage`** avec les quatre onglets. Depuis l’onglet **Moyens de paiement**, un bouton du type **« Retour au cockpit comptable »** peut ramener vers ce hub lorsqu’il est affiché (selon contexte d’intégration / maquette).

### Profil requis

L’écran est réservé au **super-admin** : si vous voyez un message d’accès refusé, ce n’est pas le bon profil.

### Quatre onglets

Vous pouvez aussi utiliser des **liens directs** avec `?tab=…` dans l’URL :

| Onglet | Valeur technique dans l’URL |
|--------|------------------------------|
| Moyens de paiement | `payment-methods` |
| Comptes globaux | `global-accounts` |
| Paheko : clôture | `paheko-cloture` |
| Paheko : support | `paheko-support` |

### PIN step-up

Pour presque toute **mutation** sensible (création / modification de moyen de paiement, activation ou désactivation, **enregistrement des comptes globaux**, publication de révision, etc.), Recyclique exige un **code PIN de vérification** (en-tête technique **`X-Step-Up-Pin`**). Gardez ce PIN confidentiel et partagez-le seulement aux personnes habilitées.

<a id="section-2"></a>

## 2. Ordre conseillé (première mise en place)

Pour éviter les allers-retours :

1. **Comptes globaux** — comptes « défaut » et journal Paheko utilisés par la chaîne comptable.  
2. **Moyens de paiement** — pour chaque façon d’encaisser (espèces, chèque, CB, virement, don en argent, etc.), les comptes Paheko associés.  
3. **Publier une révision** (depuis l’onglet moyens de paiement) — pour **figer** ce référentiel dans une version numérotée ; les nouvelles sessions s’appuient dessus.  
4. **Paheko : clôture** — pour chaque site (et caisse si besoin), où envoyer l’écriture de clôture dans Paheko (exercice, comptes, libellés).  
5. **Paheko : support** — seulement pour **diagnostiquer** si un envoi bloque (file d’attente, erreurs HTTP, quarantaine).

Ensuite, en exploitation : si vous changez un compte ou un moyen, repassez par **publication de révision** quand l’encart orange vous le demande.

<a id="section-3"></a>

## 3. Onglet « Moyens de paiement »

### À quoi ça sert ?

Chaque ligne = une **façon d’encaisser** (espèces, chèque, carte, virement, don en argent, etc.) avec les **codes comptes Paheko** utilisés quand Recyclique ventile l’argent (selon la **politique serveur**, voir [§7](#section-7)).

### Actions courantes

- **Actualiser** — recharger la liste depuis le serveur.  
- **Nouveau moyen** — créer un moyen (code technique, libellé affiché, type, comptes, ordre d’affichage, notes).  
- **Modifier** — changer libellé, type, comptes, plages de montants optionnelles, ordre, notes.  
- **Activer / Désactiver** — un moyen **désactivé** ne disparaît pas de l’historique : il ne sera plus proposé pour les **nouveaux** encaissements une fois le référentiel rechargé côté caisse. Il n’y a **pas** de bouton « Supprimer » : c’est voulu pour ne pas casser l’historique comptable.

### Ordre d’affichage (flèches haut / bas)

Les flèches **ne sauvegardent pas tout seules** : elles ouvrent le formulaire « Modifier » avec un **ordre** pré-rempli. Vous devez cliquer **Enregistrer** pour envoyer la modification au serveur. Un message du type **« Ordre mis à jour »** confirme que l’ordre a bien changé.

### Aide sur les champs comptes (icônes ℹ)

- **Compte Paheko (débit)** — dans l’usage courant d’encaissement, pensez **trésorerie** (ex. 530 espèces, 5112 chèques, 511 carte).  
- **Compte Paheko (crédit remboursement)** — compte utilisé côté Paheko quand un **remboursement** passe par ce moyen ; souvent le même que le compte d’encaissement, à valider avec votre expert-comptable.

**Important — mot « débit » à l’écran vs cours de compta :** l’interface et l’info-bulle parlent du **compte de trésorerie** sur lequel s’appuie l’encaissement dans Paheko (souvent crédité côté écriture selon le sens retenu par votre paramétrage). Le libellé **« débit »** est une **convention Recyclique** sur le formulaire : ce n’est pas forcément le même mot que dans un cours de comptabilité générale. En cas de doute sur le numéro de compte, **demandez à votre comptable** plutôt que d’interpréter seul le vocabulaire.

Si le système détecte un couple **inhabituel** (par exemple compte « débit » qui ressemble à un compte de vente « 7… » et « crédit remboursement » à de la trésorerie « 5… »), un **avertissement jaune** s’affiche : la sauvegarde reste possible, mais vérifiez avec votre comptable.

### Désactiver alors qu’une caisse est ouverte

Avant la désactivation, Recyclique interroge le serveur : ce moyen est-il déjà utilisé dans une **session ouverte** ? (Filtré par le **site** de votre contexte lorsqu’il est connu.) Si oui, un texte d’avertissement rappelle que les ventes **déjà saisies** ne changent pas ; le moyen devient inactif pour la suite.

### Encart orange « Publication de révision »

Il apparaît lorsque :

- aucune révision n’a encore été publiée, **ou**  
- le dernier snapshot publié ne permet pas de comparer la liste des moyens, **ou**  
- la liste **actuelle** en base **diffère** du dernier snapshot publié.

**Publier une révision** enregistre une **photo** du référentiel (moyens + comptes globaux, etc.) avec un numéro de version. Tant que vous n’avez pas publié après une modification, la chaîne comptable n’est pas « figée » : d’où l’encart. Utilisez le bouton, saisissez le **PIN step-up**, éventuellement une note interne.

<a id="section-4"></a>

## 4. Onglet « Comptes globaux »

### À quoi ça sert ?

Ce sont les **comptes par défaut** et le **journal** utilisés par la logique comptable (ventes, dons en argent, remboursements particuliers, libellés d’écriture), **en plus** du détail par moyen de paiement.

### Enregistrement (obligatoire : PIN step-up)

Pour **enregistrer** les modifications sur cette page, vous devez saisir le **PIN de vérification (step-up)** dans le champ prévu puis cliquer sur **Enregistrer**. Sans PIN valide, le serveur refuse la mise à jour (sécurité).

### Champs principaux

- **Compte ventes (par défaut)** — compte de produits pour le cœur des ventes (souvent 707 ou plan comptable équivalent ; à valider avec votre comptable).  
- **Compte dons (par défaut)** — dons **en argent** reçus en caisse (ex. surplus volontaire) ; le candidat courant dans le projet est **7541** (dons manuels). Ce n’est **pas** la même chose qu’un « don d’objets » à la ressourcerie.  
- **Compte remboursements exercice antérieur** — utilisé quand une vente déjà rattachée à un **exercice clos** est remboursée ; un candidat courant est **672** (charges sur exercices antérieurs). Un encart jaune rappelle de **valider avec l’expert-comptable** avant la première clôture concernée.  
- **Code du journal Paheko** — code du journal dans lequel Recyclique dépose les écritures de clôture (ex. journal de caisse « CA »). À renseigner dans Paheko (Comptabilité → Journaux).  
- **Préfixe des libellés d’écriture** — texte placé devant la date / la session dans le libellé côté Paheko si le réglage de clôture ne fournit pas son propre préfixe (ex. « Z caisse »).

### Piège fréquent (serveur)

Si l’URL d’intégration Paheko est **configurée** sur le serveur (`PAHEKO_API_BASE_URL` non vide), Recyclique **refuse** d’enregistrer les comptes globaux **sans** code journal : c’est pour éviter d’envoyer des écritures dans un journal vide par erreur.

<a id="section-5"></a>

## 5. Onglet « Paheko : clôture »

### À quoi ça sert ?

Indiquer **pour chaque site** (et optionnellement **chaque poste / caisse**) vers **quel exercice Paheko** et **quels comptes** partiront les écritures générées à la **clôture** de session.

Recyclique choisit le réglage le plus **précis** qui correspond : d’abord site + poste, sinon **défaut du site** (sans poste précis).

### Bloc « Vérifier le réglage appliqué »

Choisissez un **site** et un **poste** (ou « Défaut site ») : si un réglage **actif** existe, un encart vert le résume ; sinon un encart orange indique un **risque de blocage** à la clôture.

### Textes d’aide importants (ambiguïté débit / moyens)

Quand la politique serveur est en **ventilation par moyen de paiement**, les montants par espèces / chèque / etc. utilisent les comptes définis dans l’onglet **Moyens de paiement** ; les comptes **ventes** et **dons** globaux viennent de la **révision publiée**. Le **débit / crédit** saisis dans ce formulaire de clôture sert surtout aux **remboursements** et au mode **agrégé** (une seule ligne « ventes + dons ») — ce n’est pas un doublon des comptes par moyen.

### Si aucun réglage ne correspond

Sans réglage actif pour le couple site / poste de la session, la clôture peut être **refusée** côté serveur avec un message d’erreur pour l’opérateur. Prévoyez au minimum un réglage **« Défaut site »** (sans poste) pour chaque site qui encaisse.

### Exercice Paheko

Le champ attend l’**identifiant numérique** de l’exercice dans Paheko (Comptabilité → Exercices). L’interface ne liste pas encore les exercices depuis Paheko : la valeur doit être **lue dans Paheko** puis recopiée.

<a id="section-6"></a>

## 6. Onglet « Paheko : support »

### À quoi ça sert ?

**Diagnostiquer** les envois vers Paheko après une clôture : file d’attente (`outbox`), statuts, erreurs HTTP, **quarantaine**, relecture du payload envoyé et de la réponse Paheko.

Les **réglages** comptables se font dans **Paheko : clôture** et dans les **comptes globaux / moyens de paiement** ; cet onglet sert à **comprendre pourquoi** quelque chose n’est pas parti ou est en erreur.

<a id="section-7"></a>

## 7. Recyclique et Paheko : qui fait quoi ? (vue d’ensemble)

1. Les encaissements et opérations se font en **session de caisse** dans Recyclique.  
2. À la **clôture** de session, Recyclique calcule et **fige** un instantané comptable de la session.  
3. Une tâche est ajoutée dans une **file d’attente** (outbox) pour l’envoi vers Paheko, avec des **reprises** automatiques en cas d’échec temporaire.  
4. Un **traitement planifié** envoie l’écriture (ou le lot) vers l’API Paheko.

La caisse peut donc être **correcte dans Recyclique** même si Paheko est momentanément injoignable : l’outbox retente jusqu’à un plafond configurable côté serveur.

### Ventilation des ventes + dons (détail)

**Story 23.4 (produit actuel) :** le bloc **ventes + dons** de clôture est **toujours** poussé en **un seul** `POST` `type: ADVANCED` (lignes par moyen de paiement, comptes débit issus du **référentiel moyens** de la **révision** rattachée à la session, crédits ventes / dons sur les **comptes globaux** de la même révision). Il n’y a **plus** de choix par variable d’environnement, et l’ancien mode **une ligne Rev** n’existe plus côté code. Ayez une **révision comptable publiée** (moyens + comptes globaux) cohérente pour le type d’encaissement.

<a id="section-8"></a>

## 8. Glossaire express

| Terme | Signification ici |
|--------|-------------------|
| **Don (argent)** | Argent donné volontairement en plus du prix du ticket (surplus), enregistré comme don en caisse. |
| **Code « donation »** (moyen de paiement) | Moyen réservé à ce flux **monétaire** ; ce n’est pas un « don d’objets » à l’achat. |
| **Révision publiée** | Version figée du paramétrage comptable ; les sessions récentes s’y rattachent pour la partie « expert ». |
| **Mapping clôture** | Table de correspondance site / poste → paramètres Paheko (exercice, comptes, préfixes) pour l’écriture de clôture. |

<a id="section-9"></a>

## 9. Dépannage rapide

| Symptôme | Piste |
|----------|--------|
| Encart orange « Publication de révision » | Publiez une révision après toute modification des moyens ou des comptes globaux. |
| 422 à l’enregistrement des comptes globaux | Renseignez le **code journal** si Paheko est configuré sur le serveur ; vérifiez aussi que le **PIN step-up** est bien saisi. |
| Clôture bloquée « mapping » | Vérifiez **Paheko : clôture** avec le bloc « Vérifier le réglage appliqué » pour le site / poste concerné. |
| Une seule ligne Paheko pour tout le ticket | La clôture envoie une écriture **ADVANCED** ventilée par moyen (seul mode). Vérifiez le **mapping** (compte crédit affiché) et qu’une **révision** comptable est **publiée** (moyens + comptes globaux). |
| Rien ne part vers Paheko | Onglet **Paheko : support** : file d’attente, erreurs, quarantaine. |

<a id="section-10"></a>

## 10. Fichiers techniques (pour une personne qui documente le produit)

**Racine du dépôt :** le dépôt Git **JARVOS_recyclique** (mono-repo). Tous les chemins ci-dessous sont **relatifs à cette racine** (dossiers `peintre-nano/`, `recyclique/api/`, `references/`, etc.).

**Note :** le fichier `references/_depot/prompt-agent-dev-qa-compta.md` vit dans un dossier **dépôt / staging** interne ; sur un clone minimal il peut être absent — la grille QA y est listée pour les contributeurs qui l’ont en local.

| Fichier | Rôle court |
|---------|------------|
| `peintre-nano/src/domains/admin-config/AdminAccountingExpertShellWidget.tsx` | Coque à 4 onglets, navigation par `?tab=`. |
| `peintre-nano/src/domains/admin-config/AdminAccountingPaymentMethodsWidget.tsx` | Moyens de paiement, publication, PIN, ordre, désactivation, retour cockpit si affiché. |
| `peintre-nano/src/domains/admin-config/AdminAccountingGlobalAccountsWidget.tsx` | Comptes globaux + journal + préfixe + PIN enregistrement. |
| `peintre-nano/src/domains/admin-config/AdminPahekoCashSessionCloseMappingsSection.tsx` | Mappings clôture Paheko. |
| `peintre-nano/src/domains/admin-config/AdminPahekoDiagnosticsSection.tsx` | Support outbox / quarantaine. |
| `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_accounting_expert.py` | API super-admin comptabilité expert. |
| `recyclique/api/src/recyclic_api/services/accounting_expert_service.py` | Logique métier révisions, snapshot, usage session ouverte. |
| `recyclique/api/src/recyclic_api/core/config.py` | `PAHEKO_*` (intégration Paheko, pas de politique de clôture). |
| `recyclique/api/src/recyclic_api/services/paheko_close_batch_builder.py` | Construction du batch de clôture (ventilation par moyen, seul mode). |
| `recyclique/api/src/recyclic_api/services/paheko_mapping_service.py` | Résolution mapping + préfixe libellé. |
| `references/migration-paheko/2026-04-15_prd-recyclique-caisse-compta-paheko.md` | PRD produit (principes, workflow, outbox). |
| `references/_depot/prompt-agent-dev-qa-compta.md` | Grille QA comptable (contrôles attendus) — chemin interne, optionnel selon clone. |

---

*Document à destination de la communication publique (`doc/modes-emploi/`). Pour la construction interne du projet, voir aussi `references/migration-paheko/` et les artefacts BMAD.*
