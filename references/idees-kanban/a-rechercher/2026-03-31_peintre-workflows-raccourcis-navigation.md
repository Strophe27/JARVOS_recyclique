# Peintre workflows raccourcis navigation

---

## 2026-03-31 — Strophe

Idee a explorer pour `Peintre_nano` : au-dela du rendu declaratif multi-supports (grands ecrans, desktop, tablette, smartphone, projection, templates), le moteur devrait aussi pouvoir porter des **workflows d affichage et de navigation** ainsi que des **raccourcis operateur**.

Cas vise :
- sous-ecrans / tabs / enchainements de vues ;
- navigation dynamique selon la saisie ;
- raccourcis clavier ou actions rapides ;
- transitions du type "si telle saisie est validee, aller a telle etape / tel panneau / telle action" ;
- petits workflows internes pilotables par configuration, sans creer un langage de script lourd.

Intuition :
- la surface d affichage est entierement pilotable par fichiers de configuration ;
- puis potentiellement ajustable en live par des agents ;
- il faudrait donc un petit mecanisme declaratif sobre pour exprimer navigation, raccourcis et micro-workflows UI.

Questions a rechercher :
- existe-t-il deja des patterns, standards ou frameworks proches pour ce type de micro-workflows declaratifs UI ;
- comment exprimer cela sans deriver vers un mini langage trop complexe ;
- comment articuler ces workflows avec `CREOS`, les manifests, les widgets, les permissions et les contexts de rendu ;
- comment garder compatibilite multi-supports et futur pilotage agentique.

Intention : a-rechercher
