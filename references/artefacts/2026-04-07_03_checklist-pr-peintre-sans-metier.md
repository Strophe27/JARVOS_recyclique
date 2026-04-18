# Checklist PR / Create-Story — ne pas recoder le métier Recyclique dans `Peintre_nano`

**Date :** 2026-04-07  
**Rôle :** mémo opérationnel court pour Strophe et les agents lors des **PR**, des **créations de stories** et des reviews touchant `Peintre_nano` sur les **Epics 4 à 10**.  
**Objectif :** garder `Peintre_nano` **extractible plus tard** sans lancer maintenant une séparation complète `Peintre autonome` / `Recyclique contributrice`.

---

## À quoi sert cette checklist

- éviter que `Peintre_nano` devienne une **seconde implémentation** du métier `Recyclique` ;
- préserver la hiérarchie de vérité : `OpenAPI > ContextEnvelope > NavigationManifest > PageManifest > UserRuntimePrefs` ;
- rappeler que `Peintre_nano` = **runtime de rendu** et que `Recyclique` = **auteur métier** et **autorité** ;
- donner un garde-fou simple avant les Epics `5`, `6`, `7`, `8`, `9` et `10`.

---

## Checklist de review

Avant merge ou avant création d’une story, vérifier :

1. **Aucune nouvelle route, page ou permission métier n’existe seulement dans `Peintre_nano`.**
2. **La navigation et les pages métier viennent bien des contrats commanditaires** (`NavigationManifest`, `PageManifest`), pas d’un hardcode local.
3. **Tout widget métier officiel chargé par données pointe vers un `data_contract.operation_id` résolu dans `contracts/openapi/recyclique-api.yaml`.**
4. **Si le slice devient officiel ou partagé, ses manifests sont promus dans `contracts/creos/manifests/`** et ne restent pas uniquement dans les fixtures ou démos de `peintre-nano`.
5. **Les permissions et le contexte ne sont jamais recalculés “au feeling” côté front** ; ils sont consommés depuis le backend (`ContextEnvelope`, réponses API).
6. **Aucune mutation sensible** (paiement, clôture, remboursement, correction, validation critique) **ne repose sur une vérité UI seule** ; le backend revalide.
7. **Pas d’intégration externe métier directe depuis le front** (`Paheko`, `HelloAsso`, email, etc.) hors backend `Recyclique`.
8. **Aucun état local frontend** (`Zustand` ou autre) ne devient source de vérité métier, permission, contexte, sync ou workflow métier.
9. **Les types / clients générés ne sont pas édités à la main** pour corriger un contrat ; toute correction remonte vers `contracts/`.
10. **Les widgets / flows critiques respectent les conventions de fraîcheur / `DATA_STALE` / fallback visible**, sans succès silencieux.
11. **La story ou la PR nomme clairement les artefacts contractuels touchés** : endpoint, `operationId`, manifest, schéma ou fichier `contracts/`.
12. **Aucune dépendance ou import ne couple le runtime Peintre aux détails internes métier de `Recyclique`.**

---

## Signaux rouges

Si un de ces signaux apparaît, il faut s’arrêter et re-cadrer :

- une route métier ou un `page_key` n’existe que dans le code React ;
- un hook frontend “déduit” des permissions effectives ;
- un widget officiel n’a pas de `operation_id` ou s’appuie sur un endpoint implicite ;
- un manifest produit reste dans `fixtures/` ou `public/manifests/` sans promotion ;
- une logique `cashflow`, `reception`, sync ou admin sensible est déplacée dans des utilitaires UI “pour aller plus vite” ;
- le front parle directement à `Paheko` ou à un service externe métier ;
- on justifie une abstraction lourde “pour préparer Peintre autonome” sans déclencheur produit réel.

---

## Quand utiliser cette checklist

- avant une **PR** touchant `peintre-nano/src/domains/*`, `routing`, `registry`, `slots`, `flows`, `guards`, `generated`, `fixtures` ou `contracts/` ;
- avant de créer une **story** Epic `5` à `10` impliquant `Peintre_nano` ;
- pendant les revues de slices verticaux (`bandeau`, `cashflow`, `reception`, modules complémentaires, admin, sync) ;
- en complément du **guide de pilotage v2** pour toute reprise de session multi-chantiers.

---

## Articulation par epic

| Epic | Point de vigilance principal |
|------|------------------------------|
| **4** | Prouver la chaîne `backend -> contrat -> manifest -> runtime -> rendu -> fallback`, pas une exception ad hoc. |
| **5** | Shell, navigation, dashboard, admin : ne pas recréer la structure métier dans le front. |
| **6** | `cashflow` : contexte, paiements, stale data, audit, clôture restent backend-autoritaires. |
| **7** | `reception` : flux matière, qualification, contexte et historique restent sous autorité `Recyclique`. |
| **8** | Sync `Paheko` : aucune sémantique comptable ou d’intégration ne doit “glisser” dans `Peintre`. |
| **9** | Modules complémentaires, ACL, config admin : très fort risque de créer une seconde vérité dans l’UI. |
| **10** | Industrialisation : transformer ces garde-fous en CI / validation de drift, pas en simples bonnes intentions. |

---

## Références

- `guide-pilotage-v2.md`
- `epics.md`
- `project-structure-boundaries.md`
- `navigation-structure-contract.md`
- `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`
- `post-v2-hypothesis-peintre-autonome-applications-contributrices.md`
- `post-v2-hypothesis-marketplace-modules.md`
