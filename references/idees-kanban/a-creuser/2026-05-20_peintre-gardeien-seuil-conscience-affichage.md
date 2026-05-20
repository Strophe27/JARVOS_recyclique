# Peintre — gardien du seuil (conscience d'affichage)

---

## 2026-05-20 — Strophe

**Intention :** Peintre doit porter une **couche de conscience** de l'affichage en cours : un agent IA peut « penser » la page comme l'utilisateur (attentes, ergonomie, cohérence du parcours, lisibilité terrain).

**Gardien du seuil :** à chaque **insertion dynamique** (nouveau widget, modification de slot/props, étape de flow, patch manifeste ou rendu proposé par un **module** ou un **agent**), ce gardien **évalue** si la proposition d'affichage est acceptable. Sinon il **repense** la mise en page puis **demande l'exécution** via des outils à définir (ex. ajuster `widget_props`, réordonner une étape, déclencher `reportRuntimeFallback`, proposer un patch CREOS reviewable — liste ouverte).

**Présence dès v2 :** même si le comportement est **bypassé** en production initiale (chemin direct module → runtime), les **réceptacles et branchements** (hooks, contrat d'événement, interface agent, feature flag) doivent être **décidés et implantés** tôt pour éviter un refactor global plus tard.

**Liens pack :** lacune **L-16** · TODO **T-PEINT-1** · fiche Kanban · [`04-MOD-protocole-front-creos.md`](../../protocole-modules-recyclique/04-MOD-protocole-front-creos.md) §17 · [`05-ARCH-frontend-peintre-creos-contrats.md`](../../dossier-architecte-externe-v2/05-ARCH-frontend-peintre-creos-contrats.md) §7.4.

Intention : a-creuser
