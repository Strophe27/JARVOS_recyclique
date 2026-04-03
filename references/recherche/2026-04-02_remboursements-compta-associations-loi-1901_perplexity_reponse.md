

# Recherche Perplexity — Comptabilité association (loi 1901), remboursements caisse, Recyclique ↔ Paheko

**Fichier :** `2026-04-02_remboursements-compta-associations-loi-1901_perplexity_reponse.md`  
**Date :** 2026-04-02 · **IA :** Perplexity Pro

---

## Contexte et questions (prompt)

Association loi 1901, ressourcerie en France, caisse logicielle maison (Recyclique) synchronisant des écritures vers Paheko (comptabilité d'engagement / associations). Pas d'assujettissement TVA dans le cas type.

Questions :

1) Quelles obligations comptables et de conservation des pièces (tickets, avoirs, remboursements) pour une association non assujettie à la TVA ? (références : Code de commerce art. L123-22, règles associations, bonnes pratiques ordonnancement des comptes)
2) En pratique, comment les logiciels de caisse / compta traitent-ils les remboursements et annulations (avoir, contre-passation, écriture inverse) pour rester traçables ?
3) Limites : ce qui relève du juriste / expert-comptable vs ce que l'outil peut formaliser (journal d'audit, auteur, horodatage).

Répondre en français, avec sources vérifiables (sites officiels, doctrine si utile). Ne pas inventer de texte de loi : citer précisément ou indiquer "à vérifier auprès d'un professionnel".

Pour comprendre le contexte, l'application Recyclique servira à gérer toute la caisse, c'est-à-dire tous les tickets de vente, etc. Et à la clôture de session, toute la journée, toute la clôture de caisse est enregistrée dans Paheko, qui est donc le logiciel de comptabilité de la structure de l'association. Par exemple, le cas se pose en cas de remboursement, mettons une semaine plus tard, où quelqu'un ramène un produit et qu'on doit être remboursé. Comment est-ce que cela doit être enregistré à la fois dans toute l'historique de la caisse de recyclique et à la fois, est-ce qu'il y a des choses spéciales qui doivent être notées dans la compta de Paheko ou alors c'est juste les totaux qui font foi

Voici une synthèse structurée en réponse opérationnelle pour le backlog de Recyclique + Paheko, avec les sources disponibles.

***

# Comptabilité association et remboursements caisse — Guide Recyclique / Paheko

## 1. Obligations comptables d'une association loi 1901 non-TVA

La loi du 1er juillet 1901 **n'impose aucune obligation comptable** spécifique aux associations simplement déclarées. Ce sont les statuts, la taille de la structure et les sources de financement qui déclenchent des obligations graduées. En pratique, une ressourcerie avec activité commerciale (ventes en boutique) doit tenir une **comptabilité en partie double** conforme au **Plan Comptable Associatif 2018 (PCA 2018)**, rendu obligatoire en 2020 pour les associations ayant une activité économique.[^1][^2]

Bonne nouvelle côté réglementation caisse : **la certification NF525 ne s'applique pas** aux associations non assujetties à la TVA. L'obligation de logiciel de caisse certifié (loi de finances 2016, art. 88 modifiant l'art. 286 du CGI) vise exclusivement les assujettis TVA encaissant des particuliers. Recyclique est donc libre de sa conception technique sur ce point, mais doit quand même respecter les bonnes pratiques d'intégrité (ce qui rejoint votre question sur les logs).[^3][^4]

### Conservation des pièces

| Type de document | Durée minimale | Base légale / Source |
| :-- | :-- | :-- |
| Livres et registres comptables (grand livre, bilan, balance) | **10 ans** à compter de la clôture | Code de commerce art. L123-22 [^5] |
| Pièces justificatives (tickets, avoirs, bons de remboursement) | **10 ans** à compter de la clôture | Idem [^5] |
| Logs d'accès / authentification (CNIL) | **6 mois à 1 an** glissant | CNIL Recommandation Journalisation 2021 [^6] |
| Documents fiscaux (si contrôle possible) | **6 ans** à partir de la dernière opération | LPF art. L102 B [^5] |

> ⚠️ Le droit à l'effacement RGPD **ne s'applique pas** aux données nécessaires à l'exécution d'une obligation légale comptable (RGPD art. 17(3)(b)). Les tickets de vente associés à des écritures comptables se conservent 10 ans même si un client en demande la suppression.

***

## 2. Remboursements et annulations — Ce qui doit se passer dans Recyclique et dans Paheko

C'est le cœur de votre question pratique. Voici le modèle à deux niveaux.

### Niveau 1 — Dans Recyclique (caisse, historique ticket)

Un remboursement une semaine après la vente **ne doit jamais modifier le ticket original**. La pratique universelle dans les logiciels POS est de créer un **document "avoir"** (ou ticket de retour) lié au ticket d'origine :

- Avoir = nouveau document horodaté, référencé `AVOIR-[id ticket source]`, montant négatif
- Identifiant de l'opérateur qui valide le remboursement (traçabilité)
- Mode de remboursement (espèces, bon d'achat)
- Le ticket original reste intact dans l'historique — **immuable**

Cette logique est celle des logiciels de caisse retail courants et garantit l'intégrité de l'historique même si on ne tombe pas sous NF525.[^7][^3]

### Niveau 2 — Dans Paheko (comptabilité d'engagement)

Paheko reçoit la **clôture de journée**, pas les tickets unitaires. Pour un remboursement, **deux approches** selon le moment :

**Cas A : remboursement le même jour que la vente**
La clôture du soir envoie un total net (ventes − remboursement). Paheko n'a pas besoin de voir les deux mouvements séparément. Une seule écriture de clôture suffit.

**Cas B : remboursement un jour J+N après la vente initiale (votre scénario)**

La journée de la vente est déjà clôturée dans Paheko. Il faut créer une **écriture de contre-passation** (ou écriture inverse) le jour du remboursement  :[^8]

```
Jour J (vente) — écriture déjà dans Paheko :
  Débit  512 Caisse           +15,00 €
  Crédit 707 Ventes marchand.  15,00 €

Jour J+7 (remboursement) — nouvelle écriture dans Paheko :
  Débit  709 RRR accordés*    15,00 €   ← compte dédié remboursements
  Crédit 512 Caisse            15,00 €
```

\* Le compte **709 "Rabais, remises et ristournes accordés"** du PCA est le bon endroit pour les remboursements à des clients. Il vient en déduction du chiffre d'affaires brut dans le compte de résultat, ce qui est comptablement correct. Certaines structures utilisent directement une imputation en 707 au débit, ce qui est techniquement équivalent mais moins lisible à l'analyse — **à confirmer avec votre expert-comptable**.[^9][^10]

> **La règle de base** : un exercice clôturé dans Paheko ne se modifie jamais. Un remboursement sur exercice antérieur est traité via un compte de **produits exceptionnels (77)** ou de correction. Ce cas limite est à traiter avec un professionnel.[^2][^11]

### Ce que Recyclique doit transmettre à Paheko à la clôture

La synchronisation quotidienne vers Paheko doit distinguer **quatre totaux** pour que la comptabilité reste lisible :

1. **Total ventes brutes** (compte 707)
2. **Total remboursements / avoirs du jour** (compte 709)
3. **Total espèces en caisse** (compte 531 ou 5311)
4. **Écarts de caisse éventuels** (compte 658 charges diverses ou 758 produits divers)

Paheko génère ensuite une écriture par journal (journal de caisse), ce qui est cohérent avec son fonctionnement.[^12][^13]

***

## 3. Ce que l'outil peut formaliser vs. ce qui relève du professionnel

### Ce que Recyclique peut et **doit** formaliser (backlog produit)

- **Journal d'audit immuable** : chaque ticket, chaque avoir, chaque ouverture/clôture de caisse → horodaté, signé par l'ID opérateur, non modifiable après validation
- **Lien document-source sur les avoirs** : un avoir référence toujours son ticket d'origine (`source_ticket_id`)
- **Export de clôture structuré** vers Paheko : totaux séparés ventes/avoirs/mode de paiement, au format attendu par Paheko (CSV ou API Paheko si disponible)
- **Conservation des tickets 10 ans** en base (soft delete uniquement, pas de suppression physique)
- **Raison de remboursement** : champ libre obligatoire à la saisie d'un avoir (produit défectueux, erreur de prix, retour…)


### Ce qui relève d'un **expert-comptable ou juriste** (hors scope outil)

- Le choix du compte exact (709 vs 707 en débit, ou autre) pour les remboursements  — le plan comptable laisse une marge d'interprétation[^9]
- Le traitement des remboursements **inter-exercices** (vente en décembre N, remboursement en janvier N+1) : principe de rattachement à l'exercice vs. correction sur exercice suivant[^2][^8]
- Le seuil à partir duquel l'association doit produire des **comptes annuels certifiés** (153 000 € de subventions publiques, ou seuils bilanciels)[^1]
- La question de l'**assujettissement TVA éventuel** si l'activité commerciale dépasse le cadre non-lucratif — une ressourcerie peut basculer si elle développe une activité marchande significative (à vérifier auprès de la DDFIP correspondante associations)

> **Références documentaires** : PCA 2018 (disponible sur anc.gouv.fr)  ; documentation Paheko sur les écritures  ; Dolibarr wiki sur la loi NF525 (périmètre non-TVA)  ; Compta Facile sur la contre-passation.[^14][^11][^13][^3][^8][^2]
<span style="display:none">[^15][^16][^17][^18][^19][^20][^21][^22][^23][^24][^25][^26][^27][^28][^29][^30][^31]</span>

<div align="center">⁂</div>

[^1]: https://guidassoam06.crisp.help/fr/article/quels-sont-les-documents-comptables-obligatoires-pour-une-association-loi-1901-tgpecd/

[^2]: https://paheko.cloud/comptabilite-droit-associations-base-sources-references

[^3]: https://wiki.dolibarr.org/index.php/Loi_finances_sur_les_logiciels_de_caisse_et_Certification_NF525_ou_LNE

[^4]: https://bofip.impots.gouv.fr/bofip/10691-PGP.html/identifiant=BOI-TVA-DECLA-30-10-30-20251001

[^5]: https://www.gaaps.fr/la-duree-de-conservation-de-vos-documents/

[^6]: https://www.cnil.fr/sites/cnil/files/atoms/files/recommandation_-_journalisation.pdf

[^7]: https://www.bonnet-associes.com/actualites/tva-et-certification-des-logiciels-de-caisse-ou-en-est-on

[^8]: https://www.compta-facile.com/comptabilisation-extournes-contrepassation-ecritures/

[^9]: https://www.pennylane.com/fr/fiches-pratiques/plan-comptable/compte-70-ventes-de-produits-fabriques-prestations-de-services-et-marchandises

[^10]: http://www.crib95.com/wp-content/uploads/2020/03/plan-comptable-associatif2020-commenté.pdf

[^11]: https://paheko.cloud/modifier-ecriture

[^12]: https://paheko.cloud/video-comptabilite

[^13]: https://paheko.cloud/saisir-ecriture

[^14]: https://www.anc.gouv.fr/files/anc/files/1_Normes_fran%C3%A7aises/Plans%20comptables/2026/Recueil-non-lucratif-2026.pdf

[^15]: https://www.journalijar.com/uploads/5f75a5b496753_IJAR-33230.pdf

[^16]: https://www.youtube.com/watch?v=If5tOB0G69o

[^17]: https://paheko.cloud/fonctionnalites-comptabilite

[^18]: https://paheko.cloud/remboursement-des-emprunts

[^19]: https://www.artisans-gourmands.fr/project/reglementation-des-logiciels-de-caisse/

[^20]: https://paheko.cloud/exemples-ecritures-comptables

[^21]: https://www.l-expert-comptable.com/a/532252-obligations-d-utiliser-des-logiciels-de-caisse.html

[^22]: https://paheko.cloud/saisir-ecriture-avancee

[^23]: https://docs.lacontrevoie.fr/administratif/comptabilite/operations-courantes/

[^24]: https://www.ijfmr.com/papers/2023/5/7598.pdf

[^25]: https://www.assoconnect.com/blog/23661-plan-comptable-des-associations-modele-a-telecharger-et-conseils

[^26]: https://www.legalstart.fr/fiches-pratiques/comptabilite-entreprise/plan-comptable-association/

[^27]: https://www.l-expert-comptable.com/plan-comptable/classe-70-ventes-de-produits-fabriques-prestations-de-services-et-marchandises

[^28]: https://revuefiduciaire.grouperf.com/guide/ASSOCIATIONS/2019/20101021101524557.html

[^29]: https://www.compta-online.com/comptabilisation-un-repas-en-vue-de-benefice-pour-association-t69071

[^30]: https://www.compta-online.com/facturation-pour-une-association-tva-t22480

[^31]: https://www.calebgestion.com/cours_comptabilite/c51_pcg7.htm

