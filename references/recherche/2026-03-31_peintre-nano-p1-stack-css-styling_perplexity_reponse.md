<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# \# Mission : trancher P1 — stack CSS / styling pour Peintre_nano (Recyclique v2)

Tu es un architecte front senior. Objectif : **recommandation argumentée et actionnable** pour **fermer la décision ouverte P1** : choix du **framework ou stratégie CSS** pour le frontend v2 **Peintre_nano** (React + TypeScript + Vite), dans un projet brownfield qui migre depuis une base existante (`recyclique-1.4.4`), avec une petite équipe et une vision long terme **Server-Driven UI / agent (Peintre_mini)**.

---

## 1. Ce que P1 doit décider (formulation exacte du backlog concept)

Décider le **framework CSS de base pour les widgets** parmi notamment :

- **Tailwind CSS** (utilities),
- **CSS Modules** (+ CSS vanilla ou variables),
- **CSS-in-JS** (ex. styled-components, Emotion),
- ou une **combinaison hybride** (ex. Mantine + une des options ci-dessus pour le reste).

Critères implicites : DX, perf (bundle, runtime), maintenabilité, **cohabitation avec une grille globale**, theming, accessibilité, intégration **Vite**, migration depuis l’existant, et **évolutivité** vers JSON/DSL et SDUI sans refonte totale.

---

## 2. Contraintes déjà figées ailleurs (non négociables pour ta reco)

- **Layout global de l’app** : **CSS Grid** est le moteur de structure 2D (zones nommées, `grid-template-areas`, breakpoints). L’**IA ou un builder ne manipulent pas le CSS brut** : ils pilotent un **DSL sémantique** (template, colonnes, spans, zones, densité, proéminence) traduit par un **LayoutRenderer** vers Grid.
- **DSL vs peau CSS** : le DSL parle en **concepts abstraits** ; l’implémentation concrète (utilities, modules, etc.) est une **peau interchangeable** — le choix P1 ne doit **pas** casser cette séparation.
- **Widgets** : rendu par **mapping stable `type` + `props` → composant React** enregistré (catalogue), `props_schema` / JSON Schema — trajectoire vers **SDUI** et composition dynamique (admin / agent) avec **validation** et vocabulaire fermé.
- **Stack cible actuelle (BMAD)** : **React + TypeScript + Vite** ; **Mantine 8.x** est mentionné comme **provisoire** pour accélérer la recopie d’écrans pendant la migration — à confirmer ou remplacer si P1 impose autre chose.
- **Modularité** (contexte des recherches précédentes) : shell + **slots** + manifests ; inspiration **Piral** (patron mental) et **Open edX Frontend Plugin Framework** (`PluginSlot`, config déclarative) ; objectif **micro-framework maison** contrôlé, pas forcément Piral jour 1.
- **Échelle équipe** : très petite (1 décideur technique + IA/outils) — la simplicité cognitive sur 6–12 mois compte.

---

## 3. Synthèse des trois recherches internes déjà faites (2026-03-31) — à intégrer dans ton raisonnement

### Recherche A — Modularité / JSON UI / micro-frontends

- Besoin : modules activables, **slots** à contrat stable, **manifests JSON**, évolution vers **SDUI** sans tout réécrire.
- Panorama : **Piral** (bon modèle, souvent surdimensionné phase nano), **FPF Open edX** (slots + config — inspiration concrète), **Module Federation** (plomberie, pas le contrat UI), **DivKit** (SDUI JSON — cible plus tard).
- Reco structurante : **micro-framework maison** inspiré Piral + patterns FPF ; JSON futur pour remplir les slots ; alignement **type + props → composant** comme les libs JSON-driven.


### Recherche B — Grilles, templates, UI auto-optimisable

- **F-pattern / Z-pattern**, hotspots, hiérarchie visuelle — paramètres à exposer dans le DSL (template sémantique, pattern de lecture, colonnes, areas, spans, densité, proéminence).
- **CSS Grid** comme excellent substrat web piloté par un **DSL JSON** ; design systems (Material) = colonnes / gouttières / marges / breakpoints.
- Horizon : A/B, bandits, optimisation voire **LLM** sur les paramètres du **DSL**, pas sur le CSS brut.


### Recherche C — Workflows, navigation, raccourcis déclaratifs

- **State machines / XState** comme option pour flows complexes ; sinon reducers légers en v2.
- **Command map + keybindings** (style VS Code) : `commandId` + contexte ; découverte pour agents.
- UI **event-driven** + discipline pour éviter le spaghetti.

**Lacune explicite des trois recherches** : elles ne tranchent **pas** Tailwind vs CSS Modules vs CSS-in-JS pour la **peau** des composants — c’est exactement ce que tu dois combler.

---

## 4. Questions précises auxquelles tu dois répondre

1. Pour **Peintre_nano** (widgets + shell, Grid global préservée), quelle option **dominante** recommandes-tu entre **Tailwind**, **CSS Modules**, **CSS-in-JS**, **Mantine-only** (ou **Mantine + X**) ? Pourquoi ?
2. Comment chaque option se comporte sur : **bundle initial / tree-shaking**, **runtime**, **theming** (clair/sombre, marque), **a11y**, **tests visuels / Storybook**, **Vite** ?
3. **Migration brownfield** : quelle stratégie minimise la dette si une partie des écrans reste en composants “legacy” ou Mantine provisoire ?
4. **Cohabitation Grid globale + styles widget** : patterns concrets (où couper : layout page vs layout interne widget) ; risques avec utilities globales (Tailwind) vs scoped modules.
5. **Trajectoire SDUI / agent** : le choix P1 facilite-t-il un catalogue de widgets **stables** et des **props** sérialisables, ou crée-t-il du couplage style/code difficile à décrire en JSON ?
6. **Risques 2025-2026** (maintenance communauté, RSC, futur CSS) : quels choix semblent les plus **durables** pour un produit OSS + petite équipe ?
7. Donne une **recommandation finale en 1 paragraphe** + un **plan B** si la reco A échoue (ex. contrainte Mantine, équipe allergic to utilities, etc.).

Cite des **sources récentes** (docs officielles, articles techniques, comparatifs) quand tu affirmes des points factuels (perf, adoption, limites Vite).

Merci de structurer la réponse avec des **sous-titres** et un **tableau comparatif** (critères en lignes, options en colonnes).

Recommandation courte :
Pour Peintre_nano, je recommande **CSS Modules + design tokens (CSS variables)** comme stratégie de base pour les widgets et le shell, en s’appuyant sur **Mantine v8 comme boîte à composants mais pas comme “framework CSS” unique**.[^1][^2][^3]
Éviter **CSS‑in‑JS runtime (Emotion, styled‑components)** pour les nouveaux développements, et n’utiliser **Tailwind** au mieux que de façon ciblée (utilitaires ponctuels), pas comme socle.[^4][^5][^1]

***

## 1. Panorama des options

- **Tailwind CSS (utility‑first)**
Utilitaires atomiques, JIT + purge, très bon pour réduire le CSS final, fort écosystème.[^6][^5][^7][^4]
- **CSS Modules (+ CSS natif / variables)**
CSS compilé, scoping par défaut, zéro coût runtime, parfaitement supporté par Vite, et désormais la voie recommandée par Mantine pour les nouveaux projets.[^2][^3][^1]
- **CSS‑in‑JS runtime (Emotion / styled‑components)**
Génère et injecte le CSS au runtime, ajoute du bundle et de l’overhead au rendu; Mantine a abandonné Emotion comme solution par défaut et déconseille ce mode pour les nouveaux projets à cause du coût runtime et des limitations SSR modernes.[^1]
- **Mantine‑only (tout via Mantine)**
Mantine fournit une grosse librairie de composants + hooks, avec theming, a11y et styles basés sur CSS Modules et variables dans les versions récentes.[^8][^3][^2]
Mais tu auras de toute façon besoin d’une stratégie claire pour tes propres widgets Peintre_nano et le shell.

***

## 2. Tableau comparatif rapide

| Critère | Tailwind | CSS Modules (+CSS vars) | CSS‑in‑JS runtime (Emotion, styled) | Mantine v8 (+ CSS Modules) |
| :-- | :-- | :-- | :-- | :-- |
| **Bundle CSS final** | Très petit via JIT/purge (5–10 kb typique) si bien configuré.[^4][^9][^6][^7] | Zéro runtime, tree‑shaké par Vite; taille = ce que tu écris. | Ajoute du JS + code de génération style; bundle plus lourd.[^1] | Composants Mantine + CSS Modules; taille raisonnable, mais plus lourde qu’un pur utilitaire. |
| **Overhead runtime** | Aucun pour le CSS lui‑même (classes statiques). | Aucun (CSS pur compilé). | Oui (génération + injection de styles à l’exécution).[^1] | Mantine lui‑même a un petit coût JS, mais les styles sont pré‑compilés (CSS Modules). |
| **Theming (tokens)** | Via `tailwind.config.js` (couleurs, spacing, typo), très puissant mais couplé au framework.[^4][^5] | Via CSS variables (et éventuellement un theme JS); très aligné avec futur SDUI. | Thème JS riche, mais couplé au runtime CSS‑in‑JS et à son API.[^1] | Thème Mantine (colors, radius, spacing) exposé + CSS Modules; bon compromis.[^8][^2][^3] |
| **DX / vitesse** | Très rapide une fois maîtrisé; styling dans le JSX, design system implicite.[^4][^6][^5] | Un peu plus verbeux au début; classes explicites, bonne lisibilité; très stable. | DX agréable pour certains, mais complexité accrue (config SSR, types).[^1] | Très bonne DX pour les écrans type back‑office; a11y intégrée; bon TS.[^8][^2][^3] |
| **Lisibilité du JSX** | Peut devenir verbeux (longues listes de classes, “HTML bloat”).[^4][^10][^5] | JSX propre; styles séparés, mais proche du composant (fichier .module.css). | JSX propre, styles co‑localisés, mais “magie” runtime. | JSX propre, mais styles internes Mantine + overrides potentiels (Styles API). |
| **Vite / SPA** | Très bien supporté; config standard.[^5][^7] | Support natif dans Vite, aucun plugin exotique. | Supporté, mais ajoute une couche runtime non nécessaire dans ton cas.[^1] | Compatible Vite, App Router, etc. dans les versions récentes.[^2][^3] |
| **A11y** | À ta charge (Tailwind ne fournit pas de composants). | À ta charge ou via composants maison. | Idem; dépend des composants. | Très bon niveau d’accessibilité par défaut, clavier/focus gérés.[^8][^3] |
| **Migration brownfield** | Peut être lourd à introduire sur une base existante non utilitaire. | Très progressif : tu peux cohabiter avec du CSS existant et migrer composant par composant. | Dur à introduire puis à retirer; Mantine recommande plutôt CSS Modules pour le futur.[^1] | Idéal pour moderniser des écrans legacy; mais toi tu dois choisir une stratégie pour tes widgets à côté. |
| **Compatibilité SDUI / JSON DSL** | Si tu relies trop la sémantique aux classes Tailwind, ton DSL devient dépendant du framework; à éviter. | Parfait : DSL structurel + mapping vers classes CSS Modules ou variables, bien séparés. | Couplage fort avec API JS du moteur de styles; moins aligné avec un DSL purement déclaratif. | Ok si tu traites Mantine comme “bibliothèque de widgets” mappée par type; ton DSL ne doit pas parler Mantine. |
| **Durabilité (trend 2025–2026)** | Très populaire, écosystème fort, utilisé dans design systems modernes.[^4][^6][^7] | Aligne avec les tendances “back to CSS” et support natif outils (RSC, SSR, Vite). | Tend à être déconseillé pour de nouveaux projets dans les frameworks modernes, Mantine recommande CSS Modules.[^1] | Librairie active, appréciée, bonne pour accélérer mais reste une dépendance externe.[^2][^3] |


***

## 3. Analyse par rapport à tes contraintes

### 3.1 Grid globale + widgets

Tu as déjà **figé CSS Grid** comme moteur de layout 2D (shell, zones, templates).[citation needed but from earlier web grid sources; could reuse /34 but not necessary here]
Ce que P1 doit décider, c’est **comment styler l’intérieur des widgets et les aspects cosmétiques** (couleurs, spacing, typo, états), sans casser la séparation DSL ↔ peau.

- **CSS Modules** se prêtent très bien à la découpe :
    - Layout global défini dans des fichiers Grid spécifiques (shell, pages).
    - Chaque widget a son `.module.css` qui ne s’occupe que de son layout interne et de ses états visuels.
    - Pas de fuite globale, pas de conflit de classes.
- **Tailwind** est très bon pour le layout micro (flex/grid, spacing), mais il vit **en plein dans le JSX**.
    - Pour un moteur SDUI/agent, tu veux que ton JSON parle en `span`, `density`, `prominence`, etc., pas en `md:col-span-4 lg:col-span-6`.
    - C’est faisable (le LayoutRenderer peut traduire le DSL vers des classes Tailwind), mais tu te couples beaucoup à cette peau.
- **CSS‑in‑JS runtime** n’apporte rien de décisif ici : tu as déjà Vite, pas de besoin SSR complexe, et Mantine te dit lui‑même “si nouveau projet → CSS Modules plutôt qu’Emotion”.[^1]

Conclusion sur ce point : **CSS Modules + CSS variables** collent le mieux à l’idée “layout global piloté par DSL, widgets stylés localement, peau interchangeable”.

### 3.2 Migration brownfield

- Tu as une base existante (`recyclique‑1.4.4`) probablement en CSS “classique” + composants React.
- Avec **CSS Modules**, tu peux :
    - garder l’existant en l’état,
    - créer progressivement de nouveaux composants en `.module.css`,
    - migrer les anciens composants un par un sans big‑bang.
- Avec **Tailwind**, tu introduis **un paradigme très différent** pour les nouveaux écrans, ce qui fait cohabiter deux mondes (anciennes classes + nouvelles utility classes), souvent inconfortable à moyen terme.[^11][^4]
- Avec **Mantine v8**, tu peux ré‑écrire plus vite certains écrans grâce aux composants prêts à l’emploi (inputs, tables, modales, etc.), tout en gardant ta logique d’API et de workflow.[^3][^2]

Stratégie migration la plus douce :
> **Continuer Mantine pour recoder les écrans legacy rapidement, mais définir CSS Modules comme langage de styles par défaut pour tes propres widgets Peintre_nano et le shell.**

***

## 4. SDUI / agents et sérialisation

Pour Peintre_mini, tu vas tôt ou tard **sérialiser des layouts et props dans du JSON** pour que l’agent ou un admin manipule une UI côté serveur.[^12][^13]

Dans ce contexte :

- **CSS Modules + tokens** se marient très bien avec un catalogue de widgets :
    - ton JSON décrit la structure (`type`, `props`, `span`, `priority`, `density`),
    - le moteur choisit le composant React (`type → component`) qui sait déjà **comment il doit se styliser** via son module CSS + variables.
- **Tailwind** risque de te tenter à mettre des classes dans le JSON (“ce widget a `bg-emerald-500 text-sm`”), ce qui casse l’abstraction et rend le DSL dépendant d’un framework CSS donné.[^5][^4]
    - Tu peux l’éviter, mais il faut une discipline stricte (“le JSON ne contient jamais de classes, seulement des concepts que l’on mappe dans Tailwind côté runtime”).
- **CSS‑in‑JS** te pousse plutôt à une API JS (`sx`, `styled`) que tu peux difficilement exposer proprement en JSON sans recréer un mini langage.

Donc, pour un moteur SDUI / agent‑friendly, **un style system à base de CSS natif (CSS Modules + variables) reste le chemin le plus simple et le plus durable.**

***

## 5. Vite, perf, maintenabilité

- **Tailwind**
    - JIT + purge produisent des bundles CSS très petits.[^9][^7][^4][^6]
    - Très bien intégré à Vite, bonne DX globale.[^7][^5]
    - Mais verbeux dans le JSX, learning curve, risques de couplage fort à Tailwind.[^10][^4][^5]
- **CSS Modules**
    - Support natif dans Vite (pas de config spéciale).
    - Aucun coût runtime, code splitting naturel, parfait pour une petite équipe qui veut rester proche de “vanilla” CSS.
- **CSS‑in‑JS runtime**
    - Mantine : “non recommandé pour de nouveaux projets” en raison du coût runtime, du bundle additionnel et des limites RSC/SSR modernes.[^1]
- **Mantine**
    - Écosystème mature, a11y, theming, composants riches; bon choix pour accélérer le recodage du back‑office.[^8][^2][^3]
    - Mais c’est une dépendance tierce : ne pas enfermer Peintre_nano dedans (garder ton mapping `type → composant` indépendant).

***

## 6. Recommandation principale (P1)

### Reco A – Stratégie dominante

**Choix dominant P1** :
> **Adopter CSS Modules + CSS variables comme stratégie de styling de base pour Peintre_nano (widgets + shell), en s’appuyant sur Mantine v8 comme librairie de composants pour accélérer la migration, mais sans dépendre de Mantine pour le cœur de la composition.**[^2][^3][^1]

Concrètement :

- **Shell \& layout global**
    - Grid globale + zones nommées dans des fichiers `.module.css` ou `.css` dédiés au shell.
    - Tokens de design (couleurs, spacing, radius) exposés en CSS variables.
- **Widgets Peintre_nano**
    - Chaque type de widget a un composant React + un fichier `.module.css` qui définit sa présentation interne.
    - Aucune logique de layout de page dans ces modules (réservée au grid global).
- **Mantine**
    - Utilisé pour les composants “riches” (inputs complexes, modales, tables, datepickers, etc.) là où tu veux gagner du temps; stylisé via son API (qui repose déjà sur CSS Modules dans les versions récentes).[^3][^2][^1]
    - Vu par Peintre_nano comme un **catalogue de widgets intégrables**, au même titre que tes composants maison.
- **Pas de CSS‑in‑JS runtime en plus**
    - Réserver Emotion/styled uniquement pour des cas ultra spécifiques si vraiment nécessaire, mais ne pas les mettre au centre de la stack.
- **Pas de Tailwind comme socle**
    - Eventuellement quelques utilitaires maison (classes génériques pour flex, grid, spacing) écrits en CSS, mais pas l’écosystème complet Tailwind pour limiter le couplage et la complexité.

Cette stratégie coche : simplicité cognitive, compatibilité Vite, zéro overhead runtime, trajectoire SDUI claire, migration brownfield progressive.

### Plan B – si l’équipe tient à Tailwind / utilities

Si, dans la pratique, toi et les autres devs trouvez que Tailwind vous rend beaucoup plus productifs, le **Plan B raisonnable** serait :

> **Tailwind pour layout et tokens (spacing, couleurs, typo) + CSS Modules pour les styles complexes de widgets, en gardant le DSL structurel 100 % indépendant de Tailwind.**[^4]

Avec des garde‑fous explicites :

- Tailwind **autorisé uniquement** dans le JSX, jamais dans les manifests/JSON ou dans le DSL.
- DSL qui ne parle que de `template`, `area`, `span`, `density`, `prominence`, etc., que le layout renderer traduit ensuite → classes Tailwind.
- Pour les widgets complexes ou très spécifiques, on repasse à CSS Modules pour garder la lisibilité et le contrôle (pattern recommandé dans l’article “Tailwind + CSS Modules pour trouver un équilibre”).[^4]

***

## 7. Résumé en 1 paragraphe

Pour Peintre_nano et Recyclique v2, avec une grille globale CSS Grid déjà figée, un futur SDUI/agents, une petite équipe et un contexte brownfield, la stratégie la plus robuste et durable est d’adopter **CSS Modules + CSS variables comme socle de styling**, en utilisant **Mantine v8 comme librairie de composants pour accélérer la migration** mais en gardant Peintre_nano indépendant de tout CSS‑in‑JS runtime et de Tailwind comme fondation.[^2][^3][^1]
Cette approche minimise le bundle et l’overhead runtime, s’intègre parfaitement avec Vite, se marie bien avec un DSL JSON structurel, et reste simple à maintenir et à faire évoluer vers une UI pilotée par agents.
<span style="display:none">[^14][^15][^16][^17]</span>

<div align="center">⁂</div>

[^1]: https://mantine.dev/styles/emotion/

[^2]: https://www.wearedevelopers.com/en/magazine/148/best-free-react-ui-libraries

[^3]: https://dev.to/riteshkokam/5-react-ui-component-libraries-for-your-next-project-4le7

[^4]: https://dev.to/andriy_ovcharov_312ead391/css-architecture-2025-is-tailwind-a-must-have-or-just-hype-jed

[^5]: https://blog.logrocket.com/tailwind-css-guide/

[^6]: https://generalistprogrammer.com/comparisons/tailwind-vs-bootstrap

[^7]: https://testsigma.com/blog/best-css-framework/

[^8]: https://www.reddit.com/r/reactjs/comments/n3ye8x/mantine_new_react_library_60_hooks_and_components/

[^9]: https://www.youtube.com/watch?v=IXWqTGiTU9g

[^10]: https://doterb.com/tailwind-css-is-it-right-for-your-next-project-pros-cons/

[^11]: https://www.linkedin.com/posts/karan-singh_frontend-tailwindcss-cssmodules-activity-7351117747306573824-Pvwd

[^12]: https://vibe-studio.ai/insights/implementing-server-driven-ui-with-json-dynamic-widgets

[^13]: https://flutternest.com/blog/flutter-server-driven-ui

[^14]: https://www.reddit.com/r/reactjs/comments/1hey5ma/why_almost_everyone_i_see_uses_tailwind_css_whats/

[^15]: https://www.reddit.com/r/webdev/comments/xf2bnw/css_modules_vs_cssinjs_vs_atomic_css_which_one_to/

[^16]: https://v5.mantine.dev/styles/styled/

[^17]: https://ipixel.com.sg/web-development/bootstrap-vs-tailwind-css-2025-complete-framework-comparison-guide/

