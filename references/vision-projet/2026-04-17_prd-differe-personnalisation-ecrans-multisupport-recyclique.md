# Recyclique — PRD différé : personnalisation d'écrans multi-support

**Statut** : Réserve / chantier différé (non prioritaire à la date du document)  
**Date** : 2026-04-17  
**Type** : PRD + note d'architecture + cadrage de roadmap  
**Horizon** : Après stabilisation du socle fonctionnel Peintre_nano et des écrans métier critiques  
**Portée** : Recyclique / Peintre_nano (principes transverses produit)

**Note** : Les références externes mentionnées dans la version brouillon ([cite], [page]) ne sont pas reproduites ici ; le contenu est autonome pour réutilisation dans le dépôt.

---

## 1. Pourquoi ce document

Le besoin est réel : permettre une personnalisation **partielle** des écrans métier selon le contexte d'usage (tablette, bureau, postes partagés). Les pratiques courantes en produits enterprise privilégient le responsive, les dashboards paramétrables, les profils métier et des préférences ciblées plutôt qu'un système où chaque utilisateur « redessine » librement toute l'application.

**Objectif du document** : ne pas lancer tout de suite un éditeur universel, mais conserver un **cadre réutilisable** (hypothèses, garde-fous, ordre de priorité des overrides) pour éviter l'improvisation lorsque le sujet redeviendra prioritaire.

---

## 2. Résumé exécutif

La personnalisation d'écrans multi-support mérite un document produit structuré ; en revanche, elle ne mérite probablement **pas** un chantier immédiat tant que le produit n'a pas stabilisé ses flux métier, son responsive de base et les écrans prioritaires.

**Recommandation d'architecture** : personnalisation **bornée**, hiérarchique et réversible :

1. Définition **canonique** de chaque écran.
2. **Variantes** par support ou classe de support.
3. **Profils métier** prédéfinis.
4. **Overrides** limités par utilisateur.
5. En second temps seulement : overrides par **poste partagé**.

Cette approche est alignée sur des réglages ciblés, des vues enregistrées, des comportements adaptatifs et un **retour simple au défaut**.

---

## 3. Décision

Le chantier est **reporté**. Le livrable attendu à ce stade n'est pas un prototype complet, mais une **spécification exploitable** plus tard (ex. dans Cursor) pour relancer le sujet avec moins de risque de surconception.

**Décisions immédiates recommandées** :

1. Ne pas lancer le builder complet immédiatement.
2. Conserver ce document dans la vision projet (réserve).
3. Concevoir dès maintenant les écrans critiques avec une structure **modulaire** et des **zones** explicitement nommées si elles sont candidates à une future configuration.
4. Revenir sur le sujet après stabilisation du socle métier et de quelques écrans clés.

---

## 4. Problème et objectifs

### 4.1 Problème

Plusieurs contextes d'usage peuvent légitimement demander des dispositions différentes : tablette de caisse, poste bureau personnel, réception partagée, ateliers. Un système trop ouvert (recomposition libre par utilisateur et par appareil) génère vite de la dette : maintenance, support, qualité responsive, gouvernance.

### 4.2 Objectifs produit

- Adapter utilement certains **écrans critiques** selon le contexte.
- Améliorer l'ergonomie tablette / bureau / postes dédiés.
- Autoriser des **préférences individuelles** sans casser la cohérence globale.
- Offrir un mécanisme de **retour au défaut** à chaque niveau pertinent.

### 4.3 Non-objectifs

- Pas d'éditeur universel type maquette pour toute l'application.
- Pas de modification arbitraire de la **structure fonctionnelle** autorisée par la base.
- Pas en V1 de layouts totalement distincts pour **chaque appareil exact** d'un utilisateur.
- Pas de système opaque impossible à déboguer.

---

## 5. Invariants produit

1. Chaque écran possède une **définition canonique** maintenue par l'équipe produit.
2. Le **responsive de base** doit rester utilisable **sans** personnalisation.
3. Toute personnalisation doit être **réversible**.
4. Toute personnalisation doit avoir une **portée explicite** (qui, quoi, où).
5. Aucun override local ne doit **bloquer** la réception d'évolutions globales de structure (stratégie de migration requise).
6. Le système doit pouvoir s'**arrêter** après une phase intermédiaire sans impasse.

---

## 6. Modèle fonctionnel cible

Hiérarchie à cinq niveaux **potentiels** :

| Niveau | Rôle |
|--------|------|
| **ScreenDefinition** | Version canonique de l'écran. |
| **SupportVariant** | Adaptation par **classe** de support (ex. desktop, tablette, mobile, kiosque). |
| **RoleProfile** | Variante métier (ex. caisse, réception, atelier, tri). |
| **UserPreference** | Préférences **légères** propres à un utilisateur. |
| **WorkstationPreference** | Surcharge optionnelle liée à un **poste partagé** identifié. |

Référence pratique : vues enregistrées, widgets réordonnés dans une liste autorisée, colonnes visibles, densité, filtres et panneaux mémorisés — plutôt qu'une reconstruction totale de l'interface.

---

## 7. Résolution des priorités (ordre de fusion)

Ordre recommandé :

`ScreenDefinition` → `SupportVariant` → `RoleProfile` → `WorkstationPreference` → `UserPreference`

**Règles** :

- La **base** définit la structure fonctionnelle autorisée.
- Le **support** ajuste la disposition macro.
- Le **profil métier** ajuste la hiérarchie opérationnelle.
- Le **poste partagé** ajuste le contexte local de travail.
- L'**utilisateur** n'ajuste que des préférences **bornées** ; il ne doit pas pouvoir casser la structure d'interaction principale.

---

## 8. Portées de personnalisation autorisées

### 8.1 V1 recommandée

- Ordre de certains **blocs secondaires**.
- Ouverture / fermeture par défaut de **panneaux** latéraux.
- **Densité** d'affichage.
- **Colonnes visibles** dans certaines listes.
- **Filtres** enregistrés.
- **Taille relative** de zones redimensionnables **prévues** à l'avance dans le schéma.

### 8.2 V2 éventuelle

- Réorganisation plus large de blocs **compatibles**.
- Variantes plus riches par profil métier.
- Paramétrage par poste partagé.

### 8.3 À exclure au départ

- Drag-and-drop **libre** de tous les composants.
- Édition arbitraire du DOM métier.
- Règles différentes pour **chaque** device exact.
- Styles locaux **non gouvernés**.

---

## 9. UX d'édition

Le système ne doit pas vivre en permanence dans l'usage normal : **mode spécial** du type « Éditer cet écran », selon les permissions.

**Principes** :

- Entrée en édition depuis **l'écran concerné**.
- **Portée** choisie explicitement avant modification : global, profil métier, poste, utilisateur.
- Montrer ce qui est personnalisable et ce qui ne l'est pas.
- Aperçu **desktop / tablette / mobile** (ou équivalent par largeur).
- Séparer **brouillon**, **publication** et **réinitialisation**.

**Emplacement** : ni seulement un menu admin généralisé, ni uniquement un coin super-admin éloigné du contexte. Piste : **action contextuelle** sur l'écran + **console d'administration** pour les variantes publiées.

---

## 10. Permissions (synthèse)

| Rôle | Mode édition visible | Base canonique | Profil métier | Préférences utilisateur | Poste partagé |
|------|----------------------|----------------|---------------|-------------------------|---------------|
| Super-admin | Oui | Oui | Oui | Oui | Oui |
| Admin métier | Oui | Non | Oui (périmètre) | Oui | Éventuellement |
| Utilisateur standard | Optionnel | Non | Non | Oui (léger seulement) | Non |

---

## 11. Modèle de données proposé (brouillon)

### 11.1 `screen_definitions`

- `id`
- `screen_key` (unique)
- `name`
- `domain`
- `base_schema_json`
- `version`
- `status` (`draft`, `published`, `archived`)
- `updated_by`, `updated_at`

### 11.2 `screen_support_variants`

- `id`, `screen_definition_id`
- `support_class` (`desktop`, `tablet`, `mobile`, `kiosk`)
- `variant_schema_json`, `version`, `status`

### 11.3 `screen_role_profiles`

- `id`, `screen_definition_id`
- `role_profile_key`
- `support_class` (nullable)
- `profile_schema_json`, `status`

### 11.4 `user_screen_preferences`

- `id`, `user_id`, `screen_key`, `support_class`
- `preference_json`, `updated_at`

### 11.5 `workstation_screen_preferences`

- `id`, `workstation_id`, `screen_key`, `support_class`
- `preference_json`, `updated_at`

### 11.6 `screen_publication_events`

- `id`, `screen_key`, `scope_type`, `scope_id`
- `version_from`, `version_to`
- `published_by`, `published_at`, `changelog`

---

## 12. Format de schéma recommandé

Stockage **déclaratif** : zones, blocs, contraintes et liste d'overrides autorisés — pas un snapshot complet de markup.

Exemple conceptuel :

```json
{
  "regions": [
    { "key": "main", "children": ["cart", "payment_summary"] },
    { "key": "side", "children": ["customer", "actions", "notes"] }
  ],
  "allowedOverrides": {
    "collapsiblePanels": true,
    "reorderableBlocks": ["customer", "notes"],
    "density": true,
    "columnVisibility": true,
    "splitRatio": true
  }
}
```

---

## 13. Gouvernance

- Chaque portée a un **propriétaire** clair.
- Chaque **publication** est historisée.
- Chaque personnalisation peut être **réinitialisée** à son niveau.
- Tout changement global fournit une **stratégie de migration** pour les overrides existants.
- Une erreur locale ne doit **jamais** bloquer l'affichage de la base.

---

## 14. Roadmap recommandée

| Phase | Contenu |
|-------|---------|
| **0** | Aucun builder ; **responsive** et structure canonique propres ; zones potentiellement configurables nommées. |
| **1** | **Profils métier** publiés (variantes pilotées par l'équipe, sans édition libre utilisateur). |
| **2** | **Préférences utilisateur** légères (densité, colonnes, filtres, panneaux, split ratios). |
| **3** | **Poste partagé** seulement si les usages réels le justifient. |
| **4** | Édition **avancée encadrée** après validation stabilité, compréhension utilisateur et coût support. |

---

## 15. Critères de lancement futur (re-priorisation)

Le chantier devient prioritaire si **plusieurs** signaux convergent, par exemple :

- Plusieurs écrans critiques souffrent réellement sur tablette ou postes fixes.
- Les équipes demandent de façon répétée des dispositions distinctes par rôle.
- Les préférences légères ne suffisent plus.
- La structure d'écran est **stable** côté produit.
- Les coûts de support restent acceptables.

---

## 16. Risques principaux

- Surconception trop tôt.
- Explosion combinatoire des variantes.
- Overrides incompatibles après évolution d'écran.
- Débogage difficile des comportements locaux.
- Effet tunnel sur un chantier séduisant mais non prioritaire.

---

## 17. Apprentissage issu de la QA du plan initial (intégré)

- Mieux séparer **configuration visuelle** et **configuration de contenu** dans les futures itérations du PRD.
- Clarifier tôt le concept de **support** (largeur, classe d'appareil, poste nommé, contexte métier).
- Poser les **invariants métier** avant d'figer un schéma SQL trop large.
- Rendre explicites garde-fous **performance**, **maintenance** et **support utilisateur**.

---

## 18. Questions à trancher plus tard

- Le concept de support doit-il être défini par largeur, par classe d'appareil ou par type de poste ?
- Un poste partagé est-il un objet métier de premier plan dans Recyclique ?
- Quelle part de personnalisation pour les utilisateurs standards ?
- Les préférences suivent-elles l'utilisateur, le poste, ou les deux (et dans quel ordre de secours) ?
- Quels écrans sont réellement candidats à la personnalisation ?

---

## 19. Recommandation finale

Le bon niveau d'ambition pour Recyclique n'est probablement pas un éditeur total d'interfaces, mais un **système hiérarchique** de variantes et de préférences **encadrées**, compatible avec maintenance, responsive et gouvernance.
