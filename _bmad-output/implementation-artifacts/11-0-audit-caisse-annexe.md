## Domaine
Caisse

## Ecrans verifies

- Dashboard caisses (choix type) - route `/caisse`.
- Ouverture session - route `/cash-register/session/open`.
- Ouverture session (etat erreur champ requis) - route `/cash-register/session/open`.
- Saisie vente (etape sale) - route `/cash-register/sale`.
- Fermeture session (cas sans transaction) - route `/cash-register/session/close`.
- Detail session admin - route `/admin/cash-sessions/:id`.

## Constats factuels

- Le flux nominal Caisse est navigable de bout en bout sur les ecrans cibles Story 11.2.
- Le message de validation champ requis est present sur l'ouverture de session si montant vide.
- Le cas "session sans transaction" est explicitement gere sur la fermeture.
- Aucun ecart visuel ou comportemental **confirme** en severite critique/majeur/mineur sur le sous-perimetre observe.

## Zones non verifiees

- Flux "Caisse virtuelle" (`/cash-register/virtual`) non teste.
- Flux "Saisie differee" (`/cash-register/deferred`) non teste.
- Saisie ticket complete (articles + paiements multi-moyens + finalisation) non executee.
- Fermeture session avec transactions et controle d'ecart complet non executee.
- Edition admin avancee des lignes ticket (poids/prix/destination) non testee.

## Matrice des ecarts

id_ecart | domaine | ecran | route | type_ecart(visuel/comportemental/AC) | severite | preuve_capture | impact | effort | hypothese_cause | action_recommandee | story_cible
--- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---
_Aucun ecart confirme sur le perimetre audite._ | Caisse | - | - | - | - | `_bmad-output/implementation-artifacts/screenshots/11-0/caisse/caisse-01-dashboard.png` | Risque principal de non-conformite non observe sur ce sous-perimetre | - | Echantillon de test partiel uniquement | Etendre la verification aux zones non verifiees | 11.2

## Handoff BMAD - Document Project

- **Scope couvert** : 6 captures sur le domaine Caisse, incluant les 5 ecrans cibles Story 11.2 (nominal) + 1 etat erreur utile.
- **Ecrans verifies** : `/caisse`, `/cash-register/session/open`, `/cash-register/sale`, `/cash-register/session/close`, `/admin/cash-sessions/:id`.
- **Ecrans non verifies** : `/cash-register/virtual`, `/cash-register/deferred`, scenarios de vente/paiement complets et post-cloture.
- **Risques principaux** : ecarts potentiels non detectes dans les flux non joues (paiements multiples, reporting post-cloture, differe).
- **Hypotheses et limites** : audit base sur etat staging observe a l'instant T, sans comparaison pixel-perfect automatisee ni jeu complet de cas metier.

## Handoff BMAD - Correct Course

- **Top 5 ecarts critiques** : aucun ecart critique confirme sur le perimetre observe.
- **Quick wins** : completer l'audit de `/cash-register/virtual` et `/cash-register/deferred` avec captures dediees.
- **Chantiers lourds** : rejouer un cycle metier complet (ouverture -> ventes multi-moyens -> cloture -> verification admin/rapport) pour valider la conformite fonctionnelle profonde.
- **Ordre recommande** :
  1) Flux differe/virtuel,
  2) Flux vente complet avec paiements multiples,
  3) Cloture avec ecarts et verification detail admin/exports.

## Handoff BMAD - Sprint Planning

- **Backlog propose** :
  - Audit Caisse complementaire - mode virtuel.
  - Audit Caisse complementaire - mode differe.
  - Audit Caisse scenario transactionnel complet (paiements, cloture, controle).
- **Dependances** :
  - Donnees de test disponibles (categorie, presets, moyens de paiement).
  - Permission admin maintenue pour acces `/admin/cash-sessions/:id`.
- **Definition of done recommandee** :
  - 1 capture minimum par ecran nominal + 1 capture par etat d'erreur important.
  - Manifest JSON mis a jour avec toutes les preuves et ecrans inaccessibles/eventuels.
  - Validation technique rapide des routes et de la navigation (aucune erreur bloquante visible).
