# Cadrage MVP — panel admin compta Paheko

**Date :** 2026-04-14
**Positionnement :** cockpit comptable Recyclique relié à Paheko, **pas** ERP parallèle.

## Cap

Le panel admin compta sert à **voir**, **comprendre** et **sécuriser** le passage Recyclique → Paheko.  
Il ne doit pas devenir un second back-office comptable qui recrée journaux, écritures et workflows natifs de Paheko.

## In scope / Out of scope

### In scope MVP

- Visibilité sur l'état de sync comptable vers Paheko.
- Lecture des écarts bloquants ou à risque entre terrain Recyclique et compta Paheko.
- Paramétrage minimal nécessaire pour fiabiliser l'export comptable.
- Renvois explicites vers Paheko quand l'action doit se finir là-bas.

### Out of scope MVP

- Saisie manuelle d'écritures comptables complètes dans Recyclique.
- Recréation des journaux, exercices, rapprochements ou clôtures Paheko dans une UI parallèle.
- Remplacement du back-office Paheko pour la compta générale.
- Paramétrage comptable avancé exhaustif type ERP.

## 3 blocs max

### 1. Pilotage sync compta

- Statut du scheduler / outbox.
- Volumétrie simple : en attente, en erreur, livrées.
- Liste courte des anomalies comptables à traiter.
- Accès au détail d'une livraison et au `correlation_id`.

### 2. Consultation compta

- Vue lecture seule des dernières clôtures ou exports transmis à Paheko.
- Statut par session / lot : OK, à reessayer, en quarantaine, résolu, rejeté.
- Résumé utile pour support : quoi est parti, quand, avec quel résultat.
- Lien “ouvrir dans Paheko” ou indication claire que l'action finale se fait dans Paheko.

### 3. Paramétrage comptable

- Mappings de clôture caisse vers destination Paheko.
- Contrôles de complétude avant export.
- Paramètres minimaux de comportement si déjà portés par le backend.
- Pas de modélisation UI prématurée de toute la compta Paheko.

## Priorisation

### MVP

- Bloc 1 complet.
- Bloc 3 limité aux mappings indispensables de clôture caisse.
- Bloc 2 en lecture seule, orienté preuve et support.

### V2

- Filtres plus fins par site / poste / période / état.
- Journal de résolution plus exploitable pour support.
- Prévisualisation plus claire des agrégats comptables envoyés à Paheko.

### Plus tard

- Aides avancées de réconciliation multi-domaines.
- Paramétrages comptables plus riches si un vrai besoin terrain se confirme.
- Surfaces dédiées adhérents / HelloAsso / pièces jointes si elles deviennent un chantier distinct.

## Conséquence produit

Le futur `panel admin compta` doit d'abord s'assembler autour de ce qui existe déjà ou émerge dans `AdminAdvancedSettingsWidget` :

- **mappings** de clôture caisse ;
- **diagnostic** outbox / scheduler ;
- **lecture** des livraisons et écarts comptables.

La bonne suite n'est donc pas un “module compta complet”, mais un **hub admin compta** court qui regroupe ces surfaces sous une promesse simple : **rendre pilotable l'intégration comptable avec Paheko**.
