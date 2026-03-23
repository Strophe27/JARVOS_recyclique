# Audit caisse — conformité 1.4.4 post-catégories (Epic 19)

**Référence story :** `19-6-caisse-audit-conformite-1-4-4-post-categories`  
**Stories dérivées :** 19.7 presets · 19.8 raccourcis AZERTY · 19.9 disposition / layout (voir `_bmad-output/planning-artifacts/epics.md`)

---

## 1. Métadonnées

| Champ                                 | Valeur                                       |
| ------------------------------------- | -------------------------------------------- |
| **Date audit terrain**                | 23/03/2026                                   |
| **Environnement**                     | serveur dev vite                             |
| **URL frontend utilisée**             | `http://localhost:4173` (dev)                |
| **Build / commit**                    | *(optionnel — `git rev-parse --short HEAD`)* |
| **Agent / dev (préparation gabarit)** | *(date de génération du template si utile)*  |

---

## 2. Préconditions (avant le parcours)

Vérifier avant de remplir les tableaux terrain :

- [x] Story **19.1** validée : import catégories (racines + sous-catégories) cohérent côté admin / API.
- [x] Session caisse ouverte : dashboard caisse → poste → écran saisie vente (`/cash-register/sale` ou équivalent depuis le menu).
- [x] Compte avec droits caisse ; token / cookie session valide.
- [x] Données : au moins quelques catégories visibles vente + idéalement presets actifs en base.

**API utiles (vérification rapide hors navigateur, optionnel) :**

- `GET /v1/categories/sale-tickets` — liste catégories pour la caisse.
- `GET /v1/presets/active` — presets affichables.

---

## 3. Audit documentaire préliminaire (code actuel)

**Légende :** ce qui suit est déduit **uniquement de la lecture du code** au moment de la préparation du livrable. **Ce n’est pas un substitut au terrain** (comportement réel clavier, rendu pixel, données réelles).

### 3.1 Grille catégories & sous-catégories (code)

| Élément               | Constats code (indicatifs)                                                                                                                                                                                                                                                                                                                   | À valider au terrain                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Chargement liste      | `CashRegisterSalePage` appelle `getCategoriesSaleTickets` en parallèle avec session et presets.                                                                                                                                                                                                                                              | Liste non vide, pas d’erreur affichée.                                               |
| Hiérarchie            | `CategoryGrid` : racines = `parent_id === null` ; sous-onglet = filtre `parent_id === filterParentId` ; parent avec enfants ouvre l’onglet Sous-catégorie.                                                                                                                                                                                   | Navigation parent → enfant → retour.                                                 |
| Raccourcis sur cartes | `useMemo` appelle `handler.initialize(categories, …)` sur la liste **complète** renvoyée par l’API (ordre retourné) : les **26 premières** entrées de cette liste reçoivent A–Z positionnels. Une catégorie **affichée** en grille racine (ou sous-catégorie) peut donc **ne pas avoir de badge** si son index dans la liste API dépasse 26. | Badges visibles et cohérents avec la touche ; cas « catégorie visible sans lettre ». |
| Message vide          | Si aucune catégorie : « Aucune categorie disponible… »                                                                                                                                                                                                                                                                                       | Ne pas confondre avec bug réseau.                                                    |

**Fichiers de référence :** `frontend/src/caisse/CashRegisterSalePage.tsx`, `frontend/src/caisse/CategoryGrid.tsx`, `frontend/src/api/caisse.ts` (`getCategoriesSaleTickets`).

### 3.2 Presets Don / Recyclage / Déchetterie (code)

| Élément  | Constats code (indicatifs)                                                                                | À valider au terrain                     |
| -------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Source   | `getPresetsActive` → `GET /v1/presets/active`.                                                            | Presets visibles si retour API non vide. |
| Rendu    | `PresetButtonGrid` : si `presets.length === 0`, **rien n’est affiché** (pas de bandeau « aucun preset »). | Visibilité / discovery 1.4.4.            |
| Couleurs | `button_type` : `don` / `don_18` → bleu ; `recyclage` → vert ; `decheterie` → orange ; sinon gris.        | Alignement charte / 1.4.4.               |
| Clic     | `onPresetClick` → ligne panier avec `preset_price`, qty 1.                                                | Effet métier attendu.                    |

**Story cible corrections presets :** **19.7**  
**Fichiers :** `frontend/src/caisse/PresetButtonGrid.tsx`, `CashRegisterSalePage.tsx` (onglet Catégorie, au-dessus de la grille).

### 3.3 Raccourcis clavier AZERTY (code)

| Comportement                   | Implémentation observée dans le code                                                                                                                                              | À valider au terrain                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Sélection catégorie par lettre | `CashKeyboardShortcutHandler` : positions 1–26 mappées sur AZERTY (lignes A–P, Q–M, W–N). `event.key` en majuscule, sans modificateurs. Désactivé si focus input/textarea/select. | Touches réelles clavier physique / OS. |
| Quantité préfixe               | Chiffres (ou mapping `mapAZERTYToNumeric` pour touches AZERTY) accumulés dans `pendingQuantityRef` puis appliqués au raccourci catégorie suivant.                                 | Comparer à inventaire **18-4**.        |
| Enter                          | Déclenche `handleFinalize` (ouvre finalisation si panier non vide).                                                                                                               |                                        |
| Escape                         | Efface la quantité en attente.                                                                                                                                                    |                                        |
| Backspace                      | Retire **dernière ligne du panier** (pas un caractère dans un champ).                                                                                                             | Risque confusion UX vs 1.4.4.          |
| Finalisation                   | Raccourcis globaux partiellement suspendus quand `FinalizationScreen` est ouvert.                                                                                                 | Tester écran paiement.                 |

**Story cible corrections clavier :** **19.8**  
**Fichiers :** `frontend/src/caisse/utils/cashKeyboardShortcuts.ts`, `frontend/src/caisse/utils/azertyKeyboard.ts`, `CashRegisterSalePage.tsx` (`useEffect` avec deps `[]`, enregistrement `document.addEventListener('keydown', …)` vers **L205–L261** au moment de la révision).

### 3.4 Layout & disposition (code)

| Zone          | Rôle dans le code                                                  | À valider au terrain (1.4.4 / Epic 11) |
| ------------- | ------------------------------------------------------------------ | -------------------------------------- |
| Header        | `CaisseHeader` (utilisateur, session, badge mode virtuel/différé). | Proportions, libellés.                 |
| Bandeau KPI   | `CaisseStatsBar` (tickets, CA, dons, poids, mode live/session).    | Parité visuelle référence 1.4.4.       |
| Zone centrale | Tabs Mantine : Catégorie                                           | Sous-catégorie                         |
| Ticket        | Composant `Ticket` en panneau latéral dans `mainArea`.             | Largeur, scroll, CTA finalisation.     |
| Bannières     | Hors ligne / sync pending sous les KPI.                            | Non régression.                        |

**Story cible corrections layout :** **19.9**  
**Fichiers :** `CashRegisterSalePage.tsx`, `CashRegisterSalePage.module.css`, `CaisseHeader.tsx`, `CaisseStatsBar.tsx`, `Ticket.tsx`.

---

## 4. Tableau terrain — Grille catégories & sous-catégories (AC #1)

*Story cible typique : chevauchement possible **19.8** (raccourcis sur grille) / **19.9** (placement) ; noter explicitement.*

| Point testé                                     | Statut (OK / KO / Partiel) | Attendu 1.4.4 (court) | Observé (terrain)                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Écart / story cible |
| ----------------------------------------------- | -------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Onglet Catégorie : liste racines                | *ok*                       |                       | *manquent les raccourcis. Edit : quand j'appuie sur les touches de raccourcis "azert..." ce sont des sous cat qui sont affichées dans le breadcrumb*                                                                                                                                                                                                                                                                                                                                     | *19.8 / 19.9 / —*   |
| Clic parent avec enfants → sous-catégories      | *ok*                       |                       | *certains raccourcis sont présents sur sous-cat.. en fait je constate que les raccourcis sont attribuées aux sous-cat depuis le premier ecran, alor que normalement chaque écran se voit attribué les raccourcis "azert.." des l'affichage*                                                                                                                                                                                                                                              | *—*                 |
| Retour arrière sous-catégories                  | *ok*                       |                       | *Retour OK (cohérent avec navigation parent / enfant).*                                                                                                                                                                                                                                                                                                                                                                                                                                   | *—*                 |
| Sélection feuille + article en cours            | *partiel*                  |                       | *la sous cat est sélectionnée mais on n'avance pas à l'écran suivant*                                                                                                                                                                                                                                                                                                                                                                                                                    | *—*                 |
| Ajout ligne (quantité / prix / poids selon cas) | *ko*                       |                       | *les ecrans poid et prix sont très tres loin de la v1.4.4. quand je force l'acces à l'écran via le bouton poids (la selection de la sous-cat devrit y emmener automatiquement), il y a la saisie du poids dans une petite boite. j'entre un poids et quand je valide ça affiche directement l'article dans le ticket, sans passer par l'écran prix. c'est  la validation de l'écran prix qui devrait passer l'rticle dans le ticket. bref... **poids et prix loin de la realité v1.4.4** | *—*                 |
| Badges raccourcis sur cartes                    | *Partiel*                  |                       | *comprtement expliqué plus haut.. *                                                                                                                                                                                                                                                                                                                                                                                                                                                      | *19.8*              |

---

## 5. Tableau terrain — Presets (Don, Recyclage, Déchetterie, etc.) (AC #1, #2)

*Cible corrections : **19.7** (prioritaire).*

| Point testé                                          | Statut    | Attendu 1.4.4 (court) | Observé (terrain)                                                                                                                                                                                                                           | Écart / story cible |
| ---------------------------------------------------- | --------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Présence visible des presets (si configurés en base) | *KO*      |                       | *Presets non visibles / non utilisables comme attendu 1.4.4.*                                                                                                                                                                               | *19.7*              |
| Grille vide si aucun preset actif — impact UX        | *ko*      |                       | *Comportement « rien n’est affiché » confirmé ; discovery / message utilisateur insuffisant.*                                                                                                                                                | *19.7*              |
| Couleurs / types (don, recyclage, déchetterie)       | *ko*      |                       | *Non vérifiable en conditions satisfaisantes (presets absents ou non conformes).*                                                                                                                                                           | *19.7*              |
| Clic : ligne panier correcte (prix, libellé)         | *partiel* |                       | *manque bouton edition en cas d'erreur de saisie. prix faux quand il est deja predefini dans les catégories (ex: une lampe prix fixé à 3€ n'affiche pas 3€ dans le panier, mais le prix qui est entré dans la case "prix" de l'ecran prix"* | *19.7*              |
| Cohérence avec catégories liées                      | *ok*      |                       | *Lien catégorie / preset globalement cohérent côté parcours testé.*                                                                                                                                                                           | *19.7 / autre*      |

---

## 6. Tableau terrain — Raccourcis AZERTY (AC #1, #2)

*Cible corrections : **19.8**. Croiser avec `_bmad-output/implementation-artifacts/18-4-audit-caisse-inventaire.md`.*

| Point testé                                        | Statut          | Attendu 1.4.4 (court) | Observé (terrain)                                                                            | Écart / story cible |
| -------------------------------------------------- | --------------- | --------------------- | -------------------------------------------------------------------------------------------- | ------------------- |
| Lettre → sélection catégorie (hors champ saisie)   | *partiel*       |                       | *expliqué plus haut (raccourcis présents en fixe sur les sous catégories, et pas par écran)* | *19.8*              |
| Préfixe quantité + lettre                          | *ko*            |                       | *ecran non conforme comme dit plus haut*                                                     | *19.8*              |
| Saisie numérique AZERTY dans champs (Poids / Prix) | *ko*            |                       | *ecran non conforme comme dit plus haut*                                                     | *19.8*              |
| Enter → finalisation ticket                        | *ok*            |                       | *enter emmene sur finalisation, mais ecran finalisation non conforme et non fonctionnel*     | *19.8*              |
| Escape / Backspace (comportement panier)           | *Non testé*     |                       | *Pas retesté explicitement cette session ; à valider au prochain passage.*                   | *19.8*              |
| Raccourcis sous-onglet Sous-catégorie              | *partiel / ko * |                       | *expliqué plus haut*                                                                         | *19.8*              |

---

## 7. Tableau terrain — Disposition / layout (AC #1, #2)

*Cible corrections : **19.9**. Références charte : artefacts Epic 11 listés dans `.cursor/rules/epic11-parite-et-refactor-propre.mdc`.*

| Point testé                                          | Statut    | Attendu 1.4.4 (court) | Observé (terrain)                                                                                                                                    | Écart / story cible           |
| ---------------------------------------------------- | --------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Header session / utilisateur                         | *ok*      |                       | *Affichage et usage OK sur le parcours testé.*                                                                                                      | *19.9*                        |
| Bandeau stats (KPI)                                  | *partiel* |                       | *impossible de savoir si valeurs ok car caisse et receptions partiels, aucune données entrées. visuel un peu bof (mauvaise répartition sur l'écran)* | *19.9*                        |
| Zone tabs + article en cours                         | *ko*      |                       | *si TAB et raccourcis clavier pour aller sur un des 4 tab (cat, sous-cat, poids, prix), alors non fonctionnel*                                       | *19.9*                        |
| Emplacement presets vs grille                        | *ko*      |                       | *inconnu (voir plus haut)*                                                                                                                           | *19.7 / 19.9*                 |
| Panneau ticket (largeur, boutons)                    | *partiel* |                       | *À retester une fois flux poids/prix et finalisation stabilisés.*                                                                                    | *19.9*                        |
| Écran finalisation / paiements                       | *ko*      |                       | *dejà dit plus haut, manque plein de fonctionnalités et non fonctionnel*                                                                             | *19.9 / autre*                |
| Page blanche / crash React sur `/cash-register/sale` | *ok*      | Aucune                | *on y accede c'est ok*                                                                                                                               | *KO → bug séparé si confirmé* |

---

## 8. Synthèse — KO et Partiels (pour backlog 19.7–19.9)

*Dérivé du terrain 23/03/2026 — uniquement **KO** / **Partiel** / **Non testé** significatifs.*

| Priorité | Thème | Résumé écart | Story cible |
| -------- | ----- | ------------ | ----------- |
| P0 | Presets | Absence ou non-conformité visuelle / UX ; prix panier incohérent avec prix catégorie fixe ; besoin bouton édition ligne. | **19.7** |
| P0 | Raccourcis AZERTY | Lettres déclenchent mauvaise couche (sous-cat / breadcrumb) ; pas d’attribution « par écran affiché » comme 1.4.4 ; préfixe quantité KO. | **19.8** |
| P0 | Flux poids → prix → ticket | Saisie poids puis validation envoie la ligne au ticket **sans** passage par l’écran prix ; écrans poids/prix très éloignés de 1.4.4. | **19.8** / **19.9** (voir §9) |
| P0 | Finalisation | Écran finalisation non conforme et peu fonctionnel malgré Enter OK pour y accéder. | **19.9** (+ hors périmètre strict 19.x si ticket/paiements déjà couverts ailleurs) |
| P1 | Grille / navigation | Sélection feuille **partielle** : sous-cat sélectionnée mais pas d’enchaînement naturel vers l’étape suivante. | **19.9** |
| P1 | Layout KPI / onglets | KPI : données peu exploitables (activité partielle) ; répartition visuelle « bof ». Onglets : TAB / raccourcis vers les 4 onglets non fonctionnels. | **19.9** |
| P1 | Emplacement presets | Inconnu car presets KO — à recouper après **19.7**. | **19.7** / **19.9** |
| — | Escape / Backspace | Non testé cette session. | **19.8** |

---

## 9. Chevauchements explicites (AC #2)

| Écart | Stories concernées | Arbitrage / proposition |
| ----- | ------------------ | ----------------------- |
| Raccourcis sur cartes vs navigation sous-cat / breadcrumb | **19.8** + **19.9** | **19.8** : logique clavier et mapping par niveau d’écran ; **19.9** si le problème vient aussi du placement ou du focus UI. |
| Flux métier ligne (poids, prix, ticket) | **19.8** + **19.9** | **19.9** : ordre des écrans et disposition ; **19.8** : saisie clavier dans champs poids/prix ; vérifier cohérence avec stories caisse ticket / finalisation déjà livrées (Epic 18) pour éviter doublon. |
| Presets invisibles + emplacement dans le layout | **19.7** + **19.9** | Livrer d’abord visibilité et comportement (**19.7**), puis ajuster placement si besoin (**19.9**). |
| Finalisation « KO » | **19.9** + autre | Si l’écart est surtout paiements / ticket temps réel, recouper `18-8` / epics caisse avant de tout charger sur **19.9** seul. |

---

## 10. Instructions courtes pour Strophe

*Parcours terrain effectué le 23/03/2026 ; synthèse §8–§9 à jour. Pour une prochaine recette, reprendre les mêmes étapes si besoin.*

1. Ouvrir `http://localhost:4173`, se connecter, ouvrir une **session caisse** réelle.
2. Aller à la **saisie vente** avec des catégories visibles (après 19.1 OK).
3. Mettre à jour les tableaux §4 à §7 si le produit change.
4. Ajuster §8 (priorités) et §9 (chevauchements) en conséquence.
5. Enchaîner implémentation **19.7 → 19.8 → 19.9** selon le backlog Epic 19.
