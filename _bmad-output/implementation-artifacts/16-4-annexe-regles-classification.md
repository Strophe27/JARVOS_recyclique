# Story 16.4 - Annexe courte: regles de decision de classification

Date: 2026-03-01

## Objectif

Assurer une classification unique et tracable des ecarts Epic 16 avec la taxonomie imposee:
`bug`, `stub`, `derive assumee`, `manque de role`, `dette technique`.

## Regles de decision (ordre d'application)

1. **Manque de role**
   - Appliquer si l'ecart principal concerne une violation d'autorisation (role trop large, role non bloque, cloisonnement insuffisant), meme si un symptome technique coexiste.

2. **Derive assumee**
   - Appliquer si une deviation est explicitement rattachee a une decision de scope/sequence documentee (compromis accepte), avec preuve de cette decision.

3. **Stub**
   - Appliquer si la fonctionnalite est presente mais volontairement partielle/non operationnelle, avec retour minimal ou comportement placeholder technique.

4. **Bug**
   - Appliquer si le comportement observe contredit directement le resultat attendu dans le meme contexte d'execution (ex. code de statut inattendu, guard non appliquee).

5. **Dette technique**
   - Appliquer si l'ecart vient prioritairement de la qualite de structure/outillage/couverture (harness, stabilite tests, absence de test critique), sans defaut metier unique dominant.

## Regles de precedence en cas d'ambiguite

- Si un ecart combine role + bug, conserver `manque de role` si le risque principal est l'acces non autorise.
- Si un ecart combine stub + dette technique, conserver `stub` si l'absence d'implementation est explicite et centrale.
- Si la derive est explicitement acceptee en scope, `derive assumee` prime sur `dette technique`.

## Exigences de preuve

- Chaque classification doit citer au moins une preuve exploitable:
  - fichier de code,
  - sortie d'execution de test,
  - artefact d'audit (`16-1`, `16-2`, `16-3`, `16-0`).
- Aucune ligne sans preuve et aucune ligne sans classification n'est autorisee.

## Trace de distinction derive assumee vs subie

- `derive assumee`: seulement si decision explicite de scope est prouvable.
- `derive subie`: tous les autres cas (defaut constate, lacune non assumee, robustesse insuffisante).
