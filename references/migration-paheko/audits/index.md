# Index — references/migration-paheko/audits/

Audits et traçabilité pour la migration RecyClique ↔ Paheko (caisse, saisie au poids, correspondances BDD).

> Charger si : session sur correspondances caisse/poids, conception module RecyClique→Paheko, ou besoin de mode d'emploi / traçabilité UI–BDD–plugin.

---

## Fichiers

| Fichier | Contenu |
|---------|--------|
| `audit-caisse-paheko.md` | Audit extension Caisse Paheko : mode d'emploi synthétique (workflows ouverture, encaissement, ardoises, clôture, code barre, porte-monnaie, sync compta) + tableaux traçabilité étape/option → UI, tables BDD, références plugin (fichiers, routes, concepts). Liens vers doc officielle paheko.cloud. |
| `audit-saisie-au-poids-paheko.md` | Audit extension Saisie au poids Paheko : config (entrées/sorties, catégories, Ecologic), saisie entrées/sorties, import depuis Caisse/vélos, rapports et déclaration Ecologic ; traçabilité → `module_data_saisie_poids`. |
| `audit-caisse-recyclic-1.4.4.md` | Audit caisse RecyClique 1.4.4 : sessions, ventes, presets, paiements multiples, poids par ligne, API et tables (cash_sessions, sales, sale_items, payment_transactions). |
| `audit-reception-poids-recyclic-1.4.4.md` | Audit réception et poids RecyClique 1.4.4 : postes, tickets, lignes de dépôt (poids_kg, catégories, destination), API et tables (poste_reception, ticket_depot, ligne_depot). |
| `matrice-correspondance-caisse-poids.md` | **Matrice de correspondance** caisse et poids RecyClique ↔ Paheko : tableau capacités (ouverture session, encaissement, multi-moyens, poids, catégories, ardoises, porte-monnaie, saisie au poids, import poids, rapports, etc.) avec colonnes Paheko / RecyClique / mapping / écart-décision ; section arbitrages (hébergement matière, poids, catégories). Alimente le module de correspondance et le PRD. |

---

*Mise à jour index : à chaque nouvel audit dans ce dossier.*
