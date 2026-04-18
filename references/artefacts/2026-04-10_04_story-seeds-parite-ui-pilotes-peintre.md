# Story seeds — parite UI pilotes (Legacy -> Peintre_nano)

Date : 2026-04-10

References :

- `references/artefacts/2026-04-10_02_cadrage-parite-ui-legacy-peintre.md`
- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`

## Ordre d'execution recommande

1. `ui-pilote-01-login-public`
2. `ui-pilote-02-dashboard-unifie-standard`
3. `ui-pilote-03-caisse-vente-kiosk`

Raison : l'auth stabilise la base session / shell ; le dashboard valide le shell standard et la navigation ; la caisse kiosque vient ensuite comme slice plus couple et plus riche.

---

## 1) Login public (`ui-pilote-01-login-public`)

**Objectif**

Poser un shell `public` equivalant au legacy : saisie identifiant + mot de passe, connexion, puis arrivee sur la racine authentifiee sans seconde verite client.

**Definition of done minimale**

- Parcours equivalent aux intentions observees sur `http://localhost:4445/login`.
- Appels limites aux contrats reviewables disponibles pour ce slice, avec ecarts explicitement nommes.
- Artefact `CREOS` reviewable minimal pour le login public cree ou promu avant acceptation finale de la story.
- Preuve manuelle + capture login renseignees dans la matrice.

**Gaps bloquants principaux**

- Artefact `CREOS` reviewable de login public a creer.
- Endpoints legacy hors YAML reviewable courant a valider ou a sortir du scope strict.
- Ecart legacy `users/me` vs `ContextEnvelope` a garder explicite.

---

## 2) Dashboard standard (`ui-pilote-02-dashboard-unifie-standard`)

**Objectif**

Apres login, retrouver un shell `standard` avec navigation transverse, accueil authentifie et blocs dashboard majeurs, relies a l'API et au contexte sans contrat implicite.

**Definition of done minimale**

- Ancrage sur `navigation-transverse-served.json` + `page-transverse-dashboard.json`.
- Donnees et garde-fous relies a des contrats mappes explicitement.
- Decision ecrite sur l'ecart route legacy `/` vs slice `CREOS` `/dashboard`.

**Gaps bloquants principaux**

- Mapping des appels stats legacy vers les contrats reviewables.
- Comportements partiels du dashboard a isoler proprement dans les criteres.
- Signaux fins du bandeau session a confirmer ou a sortir du pilote.

---

## 3) Caisse vente kiosque (`ui-pilote-03-caisse-vente-kiosk`)

**Objectif**

Depuis le hub caisse, retrouver le flux de vente nominale en mode kiosque : session active, KPIs, wizard article, ticket, finalisation, avec verite metier cote API.

**Definition of done minimale**

- Parcours equivalent observe : `/caisse` -> reprise -> vue vente kiosque.
- Composition alignee sur le slice `CREOS` disponible, avec ecarts shell / route explicitement nommes.
- Preuve par capture kiosque + checklist du parcours nominal + point reseau au moment d'une vente couverte par le contrat.

**Gaps bloquants principaux**

- Pas d'artefact `CREOS` dedie a la route / au shell kiosque `/cash-register/sale`.
- Completer l'index reviewable pour categories / presets si necessaire au slice.
- Garder virtual / differe hors scope de ce pilote nominal.
