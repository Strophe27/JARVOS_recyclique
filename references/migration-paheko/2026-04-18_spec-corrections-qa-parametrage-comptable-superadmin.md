# Prompt agent de développement — Corrections QA paramétrage comptable SuperAdmin

> Document déplacé le 2026-04-18 depuis `references/_depot/prompt-agent-dev-qa-compta.md` ; chemin canonique pour la grille de corrections ci-dessous.

## Contexte

Tu travailles sur Recyclique, une application de caisse PWA pour ressourceries françaises (associations loi 1901, non assujetties à la TVA), intégrée avec Paheko (logiciel de comptabilité associative open source).

L'écran "Paramétrage comptable" SuperAdmin vient d'être implémenté. Un QA approfondi a identifié des blocants comptables, des manquants fonctionnels et des points d'incohérence. Tu dois appliquer les corrections listées ci-dessous **dans l'ordre de priorité indiqué**.

---

## Corrections BLOQUANTES à traiter en priorité absolue

### B1 — Compte dons par défaut incorrect

**Situation actuelle :** le champ `default_donation_account` dans l'écran "Comptes globaux" est pré-rempli avec `708` (Produits des activités annexes).

**Problème :** `708` est un compte générique inapproprié pour des dons en caisse dans une association. Le compte correct est `7541` (Dons manuels).

**Correction attendue :**
- Changer la valeur par défaut de `default_donation_account` de `708` vers `7541` en base de données et dans le seed/migration.
- Mettre à jour le placeholder et l'exemple affiché dans l'interface.
- Ajouter une description sous le champ : `"Dons manuels reçus en caisse (ex. surplus volontaire du client). Compte recommandé : 7541."`.

---

### B2 — Compte remboursements exercice antérieur incorrect

**Situation actuelle :** le champ `prior_year_refund_account` est pré-rempli avec `467` (Autres comptes débiteurs/créditeurs — compte de bilan).

**Problème :** `467` est un compte de bilan, inadapté pour enregistrer une charge sur exercice antérieur. Le compte candidat recommandé est `672` (Charges sur exercices antérieurs — compte de résultat), sous validation de l'expert-comptable.

**Correction attendue :**
- Changer la valeur par défaut de `prior_year_refund_account` de `467` vers `672`.
- Ajouter une description sous le champ : `"Utilisé uniquement pour les remboursements d'une vente dont l'exercice comptable est déjà clos. Candidat recommandé : 672 (Charges sur exercices antérieurs). À valider avec votre expert-comptable."`.
- Ajouter une bannière warning dans l'interface sur ce champ uniquement : `"⚠️ Ce compte est activé automatiquement lors d'un remboursement sur exercice clos. Vérifiez sa valeur avec votre expert-comptable avant la première clôture."`.

---

### B3 — Ambiguïté entre "Compte débit clôture" et comptes des moyens de paiement

**Situation actuelle :** le formulaire "Paheko : clôture" dispose d'un seul champ "Compte de débit". Or la clôture d'une session ventile le débit sur plusieurs comptes selon le moyen de paiement utilisé (`530` espèces, `5112` chèques, `511` carte, etc.).

**Problème :** il est impossible de déterminer, en lisant l'interface, si ce champ "Compte de débit" est :
- (a) un compte de débit global pour toute la clôture (écrase les comptes des moyens de paiement), ou
- (b) un compte de débit fallback utilisé si un moyen de paiement n'a pas de compte configuré, ou
- (c) ignoré au profit des comptes par moyen de paiement.

**Correction attendue :**
- Clarifier le comportement dans le code : l'écriture de clôture doit être **multi-lignes**, avec un débit par moyen de paiement basé sur `payment_methods.paheko_debit_account`, et un crédit unique vers le compte de ventes (`default_sales_account`).
- Si le champ "Compte de débit" du réglage de clôture est redondant avec `payment_methods`, le **supprimer** du formulaire et documenter que la ventilation vient des moyens de paiement.
- Si ce champ a une autre utilité (ex. compte de débit pour les sessions sans moyen de paiement détaillé ou pour un poste spécifique), ajouter une description claire : `"Ce compte est utilisé comme débit unique si la clôture ne ventile pas par moyen de paiement. Dans le cas standard, la ventilation se fait automatiquement depuis la configuration de chaque moyen de paiement."`.
- Ajouter dans l'interface un lien ou un encart : `"La ventilation par moyen de paiement est configurée dans l'onglet Moyens de paiement."`.

---

## Manquants fonctionnels à implémenter

### M1 — Ajouter le moyen de paiement "Don"

Le don en caisse (surplus volontaire du client) est distinct du paiement de la vente. Il doit apparaître dans la liste des moyens de paiement comme un moyen de type `other`, non proposé par défaut lors de la saisie d'une vente standard, mais activable en surcharge.

**À créer en seed/migration :**
```
code: "donation"
label: "Don"
type: "other"
active: true
paheko_debit_account: "530"  (compte de caisse par défaut, le surplus physique atterrit en caisse)
paheko_credit_account: "7541"
display_order: 40
notes: "Surplus volontaire du client. Ne pas utiliser comme moyen de règlement standard."
```

**Comportement attendu dans la caisse :** ce moyen n'est pas proposé dans la liste de paiement standard. Il est activé automatiquement quand le total encaissé dépasse le montant de la vente.

---

### M2 — Ajouter le moyen de paiement "Virement"

```
code: "transfer"
label: "Virement"
type: "bank"
active: true
paheko_debit_account: "512"
paheko_credit_account: "512"
display_order: 35
notes: "Virement bancaire direct. Vérifier le rapprochement dans Paheko."
```

---

### M3 — Ajouter les champs manquants dans "Comptes globaux"

Ajouter les deux champs suivants à l'écran "Comptes globaux" :

**Champ 1 : `cash_journal_code`**
- Label : `"Code du journal Paheko"`
- Description : `"Code du journal comptable dans lequel Recyclique dépose les écritures de clôture. Exemple : CA pour journal de caisse. Visible dans Paheko > Comptabilité > Journaux."`.
- Type : string, obligatoire si une synchronisation Paheko est active.
- Valeur par défaut : vide (à renseigner par l'admin).

**Champ 2 : `default_entry_label_prefix`**
- Label : `"Préfixe des libellés d'écriture"`
- Description : `"Recyclique ajoute automatiquement la date et l'identifiant de session après ce préfixe. Exemple : 'Z caisse' donnera 'Z caisse 2026-04-15 #42'."`.
- Type : string, optionnel.
- Valeur par défaut : `"Z caisse"`.

---

### M4 — Documenter le comportement si aucun réglage Paheko ne correspond

**Situation actuelle :** si une clôture est lancée pour un site/poste sans réglage Paheko actif correspondant, le comportement n'est pas indiqué dans l'interface.

**Correction attendue :**
- Ajouter dans la liste des réglages un encart informatif : `"Si aucun réglage actif ne correspond au site et au poste de la session, la clôture sera bloquée et un message d'erreur sera affiché à l'opérateur. Assurez-vous qu'un réglage actif couvre au minimum le site sans poste précis (Défaut site)."`.
- Côté back-end : vérifier que la clôture retourne effectivement une erreur explicite (et non un comportement silencieux) si le réglage est manquant.

---

### M5 — Exercice Paheko : validation ou select dynamique

**Situation actuelle :** le champ "Exercice Paheko" est un champ numérique libre. Rien n'empêche de saisir un identifiant d'exercice inexistant.

**Correction attendue (dans l'ordre de faisabilité) :**
- Option A (préférable) : appel API Paheko pour lister les exercices disponibles et les proposer dans un `<select>` avec libellé lisible (ex. "Exercice 2026 [id: 2]").
- Option B (acceptable si l'API n'est pas disponible au moment du dev) : ajouter une validation en sortie de champ qui teste l'existence de l'exercice via l'API Paheko et affiche une erreur inline si l'exercice n'existe pas.
- Dans tous les cas, ajouter une description sous le champ : `"Identifiant numérique de l'exercice dans Paheko. Visible dans Paheko > Comptabilité > Exercices."`.

---

## Points d'incohérence à corriger

### I1 — Compte `7073` dans le réglage "La Clique"

Le réglage "La Clique / clôture caisse défaut site" affiche `Crédit 7073` dans la liste. `7073` est un sous-compte de ventes textile, ce qui implique une ventilation par famille de produits — or la décision a été de ne **pas** ventiler par famille. Vérifier si cette valeur est :
- une donnée de test à nettoyer (la remplacer par `707` ou `7070`), ou
- un choix intentionnel à documenter explicitement.

**Action attendue :** corriger la valeur vers `707` ou `7070` dans les seeds/fixtures de test, et ajouter une note dans le code expliquant que le compte de crédit de la clôture doit pointer vers le compte de ventes globales.

---

### I2 — Sauvegarde de l'ordre des moyens de paiement

Les flèches ↑↓ dans la liste des moyens de paiement déclenchent-elles une sauvegarde immédiate (PATCH API) ou faut-il valider ? Le comportement doit être explicite dans l'interface.

**Correction attendue :**
- Si sauvegarde immédiate : afficher un toast de confirmation `"Ordre mis à jour"` après chaque déplacement.
- Si nécessite validation : ajouter un bouton "Enregistrer l'ordre" visible uniquement quand l'ordre a été modifié.

---

### I3 — Explication de l'absence de bouton "Supprimer"

L'absence de bouton "Supprimer" pour les moyens de paiement est intentionnelle (intégrité des données historiques). Sans explication, un admin peut croire que c'est un oubli.

**Correction attendue :** ajouter sous le titre de la liste un texte discret : `"La suppression d'un moyen de paiement n'est pas possible pour préserver l'historique comptable. Utilisez Désactiver pour retirer un moyen de la caisse."`.

---

### I4 — Validation croisée débit/crédit dans le formulaire moyen de paiement

Rien n'empêche de configurer un compte de débit vente et un compte de crédit remboursement identiques à des valeurs incohérentes (ex. `707` en débit, ce qui est un compte de produit, jamais débité lors d'un encaissement).

**Correction attendue :**
- Ajouter une validation basique côté front : si le compte de débit ressemble à un compte de trésorerie (`5xx`) et le compte de crédit à un compte de produit (`7xx`), c'est cohérent. Si c'est l'inverse, afficher un warning non bloquant : `"⚠️ Ce paramétrage est inhabituel. Le compte de débit est normalement un compte de trésorerie (classe 5) et le compte de crédit un compte de produit (classe 7). Vérifiez avec votre expert-comptable."`.
- Cette validation ne doit pas bloquer la sauvegarde — certains cas légitimes peuvent déroger à cette règle.

---

### I5 — Tooltips sur les champs comptables

Les champs "Compte Paheko (débit)" et "Compte Paheko (crédit remboursement)" ne sont pas auto-explicatifs pour un admin non-comptable.

**Correction attendue :** ajouter des icônes d'aide (ⓘ) avec tooltip sur ces deux champs :
- Débit : `"Compte crédité dans Paheko lors de l'encaissement de ce moyen de paiement. Exemples : 530 pour les espèces, 5112 pour les chèques, 511 pour la carte bancaire."`.
- Crédit remboursement : `"Compte crédité dans Paheko lors d'un remboursement effectué avec ce moyen. En général identique au compte de débit."`.

---

### I6 — Désactivation d'un moyen et session ouverte

**Correction attendue :** lors d'un clic sur "Désactiver", vérifier en API si une session de caisse est actuellement ouverte sur ce site. Si oui, afficher un modal de confirmation : `"Une session est en cours sur ce site. La désactivation sera effective à la prochaine ouverture de session. Les ventes en cours ne sont pas impactées."`. Si non, désactiver immédiatement.

---

## Résumé des priorités

| Priorité | ID | Action |
|---|---|---|
| 🔴 P0 | B1 | Corriger compte dons : `708` → `7541` |
| 🔴 P0 | B2 | Corriger compte remboursements exercice antérieur : `467` → `672` |
| 🔴 P0 | B3 | Clarifier/corriger l'ambiguïté compte débit clôture vs moyens de paiement |
| 🟠 P1 | M1 | Ajouter moyen de paiement "Don" |
| 🟠 P1 | M2 | Ajouter moyen de paiement "Virement" |
| 🟠 P1 | M3 | Ajouter champs `cash_journal_code` et `default_entry_label_prefix` |
| 🟡 P2 | I1 | Corriger `7073` → `707` dans réglage La Clique |
| 🟡 P2 | I2 | Clarifier comportement sauvegarde ordre |
| 🟡 P2 | I3 | Ajouter explication absence bouton Supprimer |
| 🟡 P2 | I4 | Ajouter validation croisée débit/crédit non bloquante |
| 🟡 P2 | I5 | Ajouter tooltips sur champs comptables |
| 🟡 P2 | I6 | Vérifier session ouverte avant désactivation |
| 🟢 P3 | M4 | Documenter comportement si aucun réglage ne correspond |
| 🟢 P3 | M5 | Valider exercice Paheko via API ou select dynamique |

---

## Ce qu'il ne faut PAS modifier

- L'architecture à 4 onglets (Moyens de paiement / Comptes globaux / Paheko : clôture / Paheko : support) est bonne, ne pas la changer.
- Le bloc "Vérifier le réglage appliqué" dans l'onglet clôture est excellent, ne pas le supprimer.
- Le PIN step-up sur les mutations sensibles est correct, le conserver sur tous les formulaires d'écriture.
- La logique de résolution site → poste → défaut est bonne, ne pas la modifier.
- La révision publiée (#1) sur les moyens de paiement est un bon pattern de versionnage, le conserver.
