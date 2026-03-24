# Prochaine passe — assainissement 1.4.5

**Date:** 2026-03-23  
**But:** preparer la prochaine passe d'assainissement a lancer dans un contexte vierge, apres les vagues 1 a 4 deja executees.  
**Contexte important:** `recyclique-1.4.4/` est maintenant integre au git du depot courant. Il ne faut plus raisonner comme si ce dossier dependait encore de son git d'origine.

---

## Point de depart

La premiere passe a deja ferme :
- la verite runtime / Docker / dependances backend
- la base Alembic minimale et les migrations email manquantes
- plusieurs micro-lots de structure backend
- plusieurs micro-lots de fiabilite de tests backend
- une premiere reunification frontend auth / permissions

La suite ne doit pas repartir de zero.

---

## Objectif de la prochaine passe

Consolider ce qui reste a fort rendement avant toute nouvelle evolution metier :
- finir les incoherences **ops/config** encore ouvertes ;
- traiter un vrai lot **donnees / schema** utile ;
- attaquer enfin le sujet **isolation transactionnelle** des tests backend ;
- faire une passe frontend auth/UX ciblee sur les dettes encore ouvertes.

---

## Ordre recommande

1. **Lot A — Ops residuel**
2. **Lot B — Integrite donnees / schema**
3. **Lot C — Isolation tests backend**
4. **Lot D — Frontend auth/UX**
5. **Lot E — Pilote architecture backend**

---

## Lots proposes

## Lot A — Ops residuel

**Objectif:** fermer les ecarts de configuration encore ouverts.

### Cible
- `OPS-01` — CORS / `FRONTEND_URL` lus depuis `Settings`, pas seulement declares dans Compose
- `OPS-02` — reference `get-version.sh` ou equivalence finale
- `OPS-05` — cadrage clair Python local vs Docker si encore flou

### Pourquoi maintenant
- faible risque
- reduit les surprises d'environnement
- bon lot de reprise dans un nouveau contexte

---

## Lot B — Integrite donnees / schema

**Objectif:** traiter un vrai point schema encore ouvert.

### Cible
- `DATA-03` — `ForeignKey` sur `User.site_id`

### Pourquoi maintenant
- lot bien isole
- impact schema clair
- utile avant gros refactors backend

### Attention
- verifier les donnees existantes avant migration

---

## Lot C — Isolation tests backend

**Objectif:** commencer la vraie remise a plat de la pollution entre tests.

### Cible
- `TEST-01` — isolation DB

### Strategie recommandee
- ne pas refactorer toute la suite d'un coup
- viser d'abord un lot pilote sur la fixture et le sous-ensemble auth + infra deja stabilise

### Attention
- c'est le lot le plus sensible de la prochaine passe

---

## Lot D — Frontend auth / UX

**Objectif:** fermer les dettes restantes de la passe frontend sans gros chantier UI.

### Cible
- `FE-03` — navigation 401 plus propre que `window.location.href`
- `FE-07` — alignement `manager` / type `User`
- `FE-16` — gestion de `loading` dans `ProtectedRoute` ou lot voisin, si et seulement si le cadrage UX est clair

### Attention
- ne pas melanger ce lot avec une grosse refonte router

---

## Lot E — Pilote architecture backend

**Objectif:** reprendre un point structurel backend restant, mais sur une petite surface.

### Cible possible
- `ARCH-03` — retirer `HTTPException` d'un service pilote seulement

### Pourquoi en dernier
- risque de bord plus eleve
- mieux vaut l'ouvrir apres les lots A a D

---

## Lecture minimale pour un nouvel agent

1. `references/index.md`
2. `references/consolidation-1.4.5/index.md`
3. `references/consolidation-1.4.5/2026-03-23_journal-assainissement-1.4.5.md`
4. `references/consolidation-1.4.5/2026-03-23_backlog-assainissement-1.4.5.md`
5. le rapport thematique correspondant au lot choisi

---

## Regle de reprise

- ne pas refaire les vagues 1 a 4
- travailler par micro-lots
- QA seulement apres implementation
- mettre a jour le journal canonique apres chaque lot ferme

---

## Recommendation de depart

Si un nouvel agent doit recommencer sans contexte, le meilleur premier lot est :

**Lot A — Ops residuel**

Puis :

**Lot B — `User.site_id` / FK**

Ce sont les deux meilleurs points d'entree avant d'ouvrir le chantier plus risqué de l'isolation transactionnelle.
