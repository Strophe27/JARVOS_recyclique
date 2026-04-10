# Story 11.1 : Retrouver la connexion publique observable dans `Peintre_nano`

Status: done

**Story ID :** 11.1  
**Story key :** `11-1-retrouver-la-connexion-publique-observable-dans-peintre-nano`  
**Epic :** 11 — Retrouver la parite UI legacy critique dans `Peintre_nano`

## Story

En tant qu'**utilisateur non authentifie**,

je veux retrouver dans `Peintre_nano` un parcours de connexion publique observable et coherent avec le legacy,

afin d'acceder a l'interface authentifiee par une chaine `OpenAPI -> ContextEnvelope -> CREOS` explicite, sans logique metier implicite cote frontend.

## Scope

- Ecran public equivalent au legacy observe sur `http://localhost:4445/login` : titre, champs identifiant / mot de passe, CTA principal, lien mot de passe oublie.
- Succes login -> arrivee sur la racine authentifiee avec comportement coherent et preuve reseau.
- Mapping explicite des contrats reviewables utilises pour ce slice.

## Non-scope

- Signup, reset password, forgot password complets tant que leur contrat reviewable n'est pas verrouille.
- Heartbeat long terme / `activity/ping` comme DoD principal.
- Toute recreation locale de permissions ou de contexte comme source de verite.

## Acceptance Criteria

1. **Parcours public observable** — Etant donne le legacy observe sur `http://localhost:4445/login`, quand le pilote `Peintre_nano` est rendu, alors il expose les memes intentions de base (`Connexion`, champs, bouton principal, lien mot de passe oublie) pour le perimetre couvert.
2. **Contrats reviewables explicites** — Etant donne la hierarchie `OpenAPI > ContextEnvelope > CREOS`, quand la story est livree, alors les operations d'auth / contexte utilisees par le slice sont nommees explicitement et toute route legacy absente du YAML reviewable courant est marquee comme gap ou hors scope.
3. **Ancrage `CREOS` minimal obligatoire** — Etant donne la regle de matrice sur les slices validables, quand la story est acceptee, alors un artefact `CREOS` reviewable minimal existe pour cette surface (creation ou promotion explicite), meme si son contenu reste borne ; un ecran login purement one-off non rattache a un manifeste n'est pas acceptable comme etat final.
4. **Pas de seconde verite frontend** — Etant donne l'autorite backend sur auth, permissions et contexte, quand la story est acceptee, alors aucune logique metier additionnelle n'est introduite dans le front pour simuler autorisations, session ou structure de contexte.
5. **Preuve de parite** — Etant donne la matrice `ui-pilote-01-login-public`, quand la story est en review, alors la ligne contient au moins une preuve manuelle legacy vs `Peintre_nano`, une cartographie contrat, et les ecarts restants.

## Dependances / Gaps

- Artefact `CREOS` reviewable du login public a creer ou promouvoir.
- Ecart explicite legacy `GET /v1/users/me` vs cible `ContextEnvelope`.
- Endpoints observes hors YAML reviewable courant (forgot/reset/signup, `activity/ping`) a valider ou exclure.

## Preuves attendues

- Capture legacy `http://localhost:4445/login` et capture `Peintre_nano` equivalente.
- Scenario manuel succes / echec nominal.
- Mise a jour de `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`.

## Dev Notes

Hierarchie de verite a respecter : `OpenAPI` -> `ContextEnvelope` -> `NavigationManifest` / `PageManifest` -> `UserRuntimePrefs`.

### Shell attendu

- Hors session, livrer une coquille publique minimale equivalente au legacy observe : titre, champs, CTA principal, lien mot de passe oublie.
- Apres succes login, la bascule vers l'espace authentifie doit reposer sur la chaine auth / contexte reviewable, pas sur une structure de contexte recalculee localement.

### Slots / zones

- Aucun `PageManifest` login public reviewable n'est present aujourd'hui sous `contracts/creos/manifests/`.
- La story doit creer ou promouvoir ce manifeste ; un etat transitoire hors `CREOS` peut exister pendant le dev, mais pas comme resultat final accepte.

### Widgets / composants

- Les champs et CTA du login relevent de composants UI simples ; ils ne doivent pas embarquer de logique metier implicite.
- Le lien mot de passe oublie reste dans le perimetre de presentation / navigation uniquement tant que le flux complet n'est pas couvre par contrat.

### Contrats requis

- Nommer explicitement les `operationId` auth / contexte utilises par la story.
- Toute route legacy observee mais absente du YAML reviewable courant doit etre traitee comme gap ou hors scope, jamais comme contrat suppose.
- `UserRuntimePrefs` ne peut servir qu'a la presentation locale, pas a simuler permissions ou contexte.

### Interdits / garde-fous

- Pas de seconde verite frontend pour auth, permissions ou contexte.
- Pas de page login one-off figee comme resultat final de la story sans manifeste reviewable minimal.
- Pas d'invention d'endpoints ou de schemas hors `OpenAPI` reviewable.

## References

- `references/artefacts/2026-04-10_02_cadrage-parite-ui-legacy-peintre.md`
- `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`
- `references/artefacts/2026-04-10_04_story-seeds-parite-ui-pilotes-peintre.md`
