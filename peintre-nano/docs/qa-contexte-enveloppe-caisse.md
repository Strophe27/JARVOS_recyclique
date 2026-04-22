# QA manuelle — contexte caisse & brouillon ticket

Prérequis : `VITE_LIVE_AUTH` actif, API joignable, utilisateur avec session caisse.

## Rafraîchissement silencieux de l’enveloppe

1. Se connecter, ouvrir `/caisse`, noter que la navigation reste disponible après **plus de 5 minutes** d’inactivité (sans recharger la page).
2. Laisser l’onglet en arrière-plan **> 5 min**, repasser au premier plan : aucun blocage « contexte périmé » uniquement pour l’âge local sans erreur réseau.
3. Déconnecter le réseau (offline) puis tenter une vente : attendre un message compréhensible ou erreur API ; reconnecter puis vérifier que l’encaissement refonctionne après retour ligne.

## Brouillon après F5

1. Ajouter au moins une ligne au ticket et un total cohérent sur le parcours nominal.
2. Rafraîchir la page (**F5**) sans se déconnecter : les lignes et montants du brouillon doivent réapparaître.
3. **Déconnexion** depuis le menu : le brouillon ne doit pas réapparaître après nouvelle connexion (clé utilisateur différente / purge).

## Alignement Story 25.8 (CONTEXT_STALE)

Couvrir un scénario où le serveur refuse explicitement une mutation (site / session désalignés) — le client doit surfacer l’erreur API, pas le message générique « contexte non actualisé » seul.
