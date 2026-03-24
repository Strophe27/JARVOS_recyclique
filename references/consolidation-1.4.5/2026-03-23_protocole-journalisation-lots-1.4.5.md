# Protocole — journalisation des lots 1.4.5

**But:** garder un journal simple, durable et exploitable d'un lot a l'autre, sans perdre la trace des decisions ni des validations.

---

## Regle simple

Le plus sur n'est **pas** que plusieurs sous-agents ecrivent directement dans le meme journal en parallele.

Le protocole recommande est :
1. un ou plusieurs sous-agents executent le lot ;
2. un sous-agent QA intervient **apres** tous les autres ;
3. l'agent parent met a jour le journal unique a partir des resumes des sous-agents.

Cette methode evite les conflits d'ecriture et garde une trace plus propre.

---

## Fichier canonique

Le journal canonique courant est :

- `2026-03-23_journal-assainissement-1.4.5.md`

Tant que la vague d'assainissement continue, les nouvelles entrees doivent etre ajoutees dans ce fichier, sauf decision explicite d'ouvrir un nouveau journal date.

---

## Regle par lot

Un lot n'est ajoute au journal que lorsqu'il a :
- un perimetre clair ;
- une implementation terminee ;
- une QA terminee ;
- un verdict explicite : `ferme`, `ferme avec reserve`, ou `ouvert`.

---

## Informations minimales a journaliser

Pour chaque lot, ajouter :
- identifiant du lot
- theme
- statut
- actions principales
- fichiers touches
- validation effectuee
- resultat / decision

---

## Format recommande pour une entree

```markdown
## Lot X — titre court

**Statut:** ferme
**Theme:** ...

### Actions
- ...

### Fichiers touches
- `...`

### Validation
- ...

### Resultat
- ...
```

---

## Regle pour les sous-agents

Chaque sous-agent doit retourner dans son resume final, au minimum :
- objectif du lot ou du sous-lot
- fichiers analyses ou modifies
- validations effectuees
- risques residuels

L'agent parent transforme ensuite ce resume en entree de journal.

---

## Regle QA

La QA ne doit pas etre lancee en parallele avec l'implementation.

Ordre recommande :
1. implementation
2. corrections si necessaire
3. QA
4. eventuelle correction finale
5. QA de cloture
6. mise a jour du journal

---

## Regle d'index

Si un nouveau journal ou un nouveau protocole est cree dans `references/consolidation-1.4.5/`, mettre a jour `references/consolidation-1.4.5/index.md`.
