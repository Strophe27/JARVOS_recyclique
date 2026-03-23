# Besoins terrains — remontées v1.4.4

Liste dynamique des besoins remontés par les utilisatrices terrain (ressourcerie), issues des échanges Discord. À charger pour priorisation, brainstorm brownfield ou ajout de remontées.

**Légende :** `[ ]` à traiter | `[~]` en cours / à l'étude | `[x]` traité ou basculé en idée/story

---

> **Note transversale :** Toutes les actions de caisse impliquant de la comptabilité (encaissements, dons, adhésions, remboursements, comptes de charges, etc.) doivent être pensées en lien avec la **sync Paheko** — ce que RecyClique pousse, quand, et comment ça s'enregistre côté Paheko.

---

## 1. Caisse — fonctionnalités

- [ ] **Ticket en attente** — Pouvoir mettre un ticket en attente.
- [ ] **Remboursement** — Touche et processus de remboursement (à étudier).
- [ ] **Encaissement don sans articles** — Encaisser un don sans saisie d'articles.
- [ ] **Encaissement adhésion asso** — Encaisser une adhésion association.
- [ ] **Boutons d'actions sociales dédiés** — À côté de « Don » et « Don 18 », ajouter des boutons parlants : Maraude, Kit d'installation étudiant, Don aux animaux, Friperie auto gérée, etc. Objectif : rendre visibles les actions sociales de la ressourcerie (redistribution, pas que vente). Côté compta : créer des comptes de charges dédiés (ex. Dons en nature : aide sociale étudiants, aide humanitaire Maraude, projets éducatifs friperie MFR, etc.).

---

## 2. Caisse — gestion des sessions

- [ ] **Modification date / contenu / détails d'une vente** — Bouton visible uniquement pour les utilisateurs ayant le rôle super-admin, permettant de corriger la date de saisie (et si besoin le contenu, les détails) d'un ticket/vente après coup. Cas type : erreur de date (ex. 8.11 au lieu du 8.10), ou erreur de saisie (exemple un don rentré à la fois dans somme donnée, et prix de vente, donc pouvoir changer aussi le contenu de l'écran de finalisation de vente).

  **Licéité (recherche) :** La norme NF525 (inaltérabilité des données de caisse) ne s'applique qu'aux assujettis TVA. Les associations non assujetties (cas standard des ressourceries) sont hors champ. Modifier dates, champs saisis par erreur, ou supprimer/fusionner des doublons est donc possible.

  **Bonne pratique recommandée :** Journal d'audit sur ces modifications (qui a modifié quoi, quand, valeur avant). Pas obligatoire légalement, mais protège l'association en cas de question interne ou litige.

---

## 3. Caisse + Réception — affichage / paramétrage

- [ ] **Bandeau live et heures d'ouverture** — Le bandeau live doit prendre en compte l'heure d'ouverture des caisses (actuellement il ne prend que les caisses « du jour »). Pouvoir paramétrer le live en cas de caisses à ouvertures décalées et cas particuliers.

---

## 4. Panel Super Admin — paramètres et ACL

- [ ] **Gestion ACL de toutes les fonctionnalités du site** — Panel settings super-admin centralisant la gestion des droits d'accès (ACL) sur l'ensemble des fonctionnalités. Chaque fonctionnalité sensible (ex. modification des ventes §2, boutons d'actions sociales, remboursements, etc.) doit être pilotable par ACL : activer/désactiver par rôle ou par utilisateur.
