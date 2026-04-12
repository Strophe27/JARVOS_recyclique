# Vision — Module(s) déclarations éco-organismes (agnostique, mapping catégories)

**Objectif :** Fixer la vision du module (ou des modules) de déclarations aux éco-organismes pour RecyClique, en la distinguant du module unique « Saisie au poids » de Paheko.

**Références :** [matiere_presentation-plateforme-recyclic.md](matiere_presentation-plateforme-recyclic.md) (section Module éco-organismes), [migration-paheko/categories-decla-eco-organismes.md](../migration-paheko/categories-decla-eco-organismes.md), [idees-kanban module correspondance](../idees-kanban/a-conceptualiser/2026-02-24_module-correspondance-paheko.md).

---

## 1. Contexte

- **Paheko** fournit un module **Saisie au poids** (Brindille) : entrées/sorties pondérées, flag Ecologic (LIV, PRE, DEC_REE), sync possible depuis la Caisse. C'est **un** module, orienté **un** référentiel (Ecologic) et des conventions intégrées.
- **RecyClique** vise un besoin plus large : **plusieurs éco-organismes** (Ecologic, Ecomaison, autres REP), **catégories libres par boutique**, et **mapping automatique** vers les catégories officielles de chaque éco-organisme pour les déclarations.

---

## 2. Vision RecyClique : module(s) agnostique(s)

- **Catégories boutique libres** : chaque ressourcerie / magasin peut définir **ses propres** catégories et sous-catégories (produits, flux matière, EEE). Aucun référentiel unique imposé au niveau saisie.
- **Liste officielle EEE** (open data, niveau ministériel / REP) : **hébergée et maintenue dans RecyClique**. Mapping catégories boutique → catégories officielles par éco-organisme dans RecyClique. Cette liste peut être interrogée par JARVOS Nano ou d'autres services si besoin.
- **Module(s) décla éco-organismes** : **agnostiques** — pas un module dédié à un seul éco-organisme. On vise un **moteur** qui :
  - gère **plusieurs** éco-organismes (Ecologic, Ecomaison, etc.) ;
  - permet de saisir ou d'agréger les données (dates, flux, poids, catégories boutique) ;
  - fait le **mapping** : catégories boutique → **catégories officielles de déclaration**, **par éco-organisme** (chaque partenaire a son propre référentiel).
- **Déclarations** : calcul et pré-remplissage côté RecyClique ; saisie finale sur les plateformes des partenaires (pas d'API chez les éco-organismes à ce jour).

---

## 3. Différence avec Paheko Saisie au poids

| Aspect | Paheko Saisie au poids | RecyClique (vision) |
|--------|------------------------|----------------------|
| Nombre d'éco-organismes | Un référentiel (Ecologic) intégré. | Plusieurs éco-organismes, configurable. |
| Catégories | Catégories / motifs du module + mapping config vers Caisse. | Catégories **boutique libres** → mapping vers **chaque** éco-organisme. |
| Rôle | Module unique, conventions figées. | Module(s) agnostique(s), mapping configurable par instance. |

---

## 4. Suite

- Confronter cette vision avec les capacités réelles de Paheko (Saisie au poids, plugin Caisse) et avec l'analyste : grille [2026-02-25_05_grille-confrontation-recyclic-paheko.md](../artefacts/2026-02-25_05_grille-confrontation-recyclic-paheko.md).
- Module **correspondance Paheko** (traducteur RecyClique → API Paheko pour caisse/compta) : distinct du module décla éco-organismes ; les deux peuvent coexister (voir idée [module-correspondance-paheko](../idees-kanban/a-conceptualiser/2026-02-24_module-correspondance-paheko.md)).
