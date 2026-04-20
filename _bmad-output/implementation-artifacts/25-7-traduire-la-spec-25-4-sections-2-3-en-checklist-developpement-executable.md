# Story 25.7 : Traduire la spec 25.4 (sections 2 et 3) en checklist developpement executable

Status: ready-for-dev

**Story key :** `25-7-traduire-la-spec-25-4-sections-2-3-en-checklist-developpement-executable`  
**Epic :** 25 — Socle d'alignement PRD vision kiosque / multisite / permissions, brownfield et ADR  
**Implementation artifact :** `_bmad-output/implementation-artifacts/25-7-traduire-la-spec-25-4-sections-2-3-en-checklist-developpement-executable.md`

## Contexte produit

La spec convergee **25.4** fixe les **invariants de contexte** (site / caisse / session / poste-kiosque / roles-permissions) et le **comportement de bascule de contexte**. Cette story doit transformer les sections **2** et **3** de la spec en **checklist de developpement executable**, versionnee et ancree sur les sections exactes. La checklist doit distinguer **les exigences normatives** (tag `normative-spec`, exige un test ou un script de verification nomme) et **les sujets vision** explicitement reportes (tag `vision-later`).

## Story (BDD)

As a **tech lead**,  
I want **a versioned executable checklist derived from spec 25.4 sections 2 and 3 (context invariants, site / caisse / session / poste, context switch)**,  
So that **every invariant has a named verification path before we change runtime code at scale**.

## Acceptance criteria

Source normative : `_bmad-output/planning-artifacts/epics.md` — **Story 25.7**.

**Given** `_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md` is the norm for multisite and permissions invariants  
**When** this story is delivered  
**Then** a checklist file lives in-repo with explicit links to spec section anchors  
**And** each item is tagged `normative-spec` (must have a test or scripted manual check name) or `vision-later` (explicitly out of this train)  
**And** advanced vision-only topics (auto-suspend, alert channels, full FIXE/NOMADE site taxonomy) stay out unless a product decision expands scope

## Checklist validation (VS — `bmad-create-story`, Epic 25.7)

Contrôle explicite contre `_bmad-output/planning-artifacts/epics.md` **Story 25.7** (pas de PASS sur liste vide).

- [ ] **Checklist in-repo** : un fichier versionne est cree dans le depot (chemin fixe ci-dessous).  
- [ ] **Ancres spec** : chaque item pointe vers une ancre de section **2.x** ou **3.x** de la spec 25.4.  
- [ ] **Tags** : chaque item a un tag `normative-spec` ou `vision-later`.  
- [ ] **Verification nommee** : chaque item `normative-spec` reference un nom de test ou un script de verification manuel.  
- [ ] **Vision-only hors scope** : auto-suspend, canaux d'alerte, taxonomy FIXE/NOMADE/EXTERNE sont **absents** ou tagges `vision-later` avec mention explicite.

## Definition of Done

- [ ] Checklist publiee sous `_bmad-output/implementation-artifacts/checklists/25-7-checklist-spec-25-4-sections-2-3.md`.
- [ ] Table des items couvrant **toutes** les sections 2.x et 3.x (pas d'item hors scope).
- [ ] Tags `normative-spec` / `vision-later` renseignes + champ **verification** pour chaque item `normative-spec`.
- [ ] Liens d'ancrage vers la spec **25.4** (sections 2 et 3) et rappel des ADR **25-2** / **25-3** si cites.
- [ ] Mention explicite des sujets **vision-only** exclus (auto-suspend, alert channels, taxonomy FIXE/NOMADE) sans les redecider.

## Tasks / Subtasks

- [ ] **Creer la checklist versionnee**  
  - [ ] Fichier : `_bmad-output/implementation-artifacts/checklists/25-7-checklist-spec-25-4-sections-2-3.md` (creer le dossier si absent).  
  - [ ] En-tete : version/date, source spec, legenda tags.

- [ ] **Renseigner les items Section 2 — Modele de contexte (invariants)**  
  - [ ] **2.1 Site**  
    - [ ] `normative-spec` : site explicite requis pour actions sensibles (refus si contexte incomplet).  
    - [ ] `normative-spec` : zero fuite de permissions / ecritures vers un site non selectionne.  
    - [ ] `vision-later` : taxonomy FIXE/NOMADE/EXTERNE + immuabilite analytique apres premiere vente (cible vision).  
  - [ ] **2.2 Caisse**  
    - [ ] `normative-spec` : rattachement caisse → site coherent (session + mapping).  
    - [ ] `normative-spec` : chaine canonique journal/snapshot/builder/outbox prime sur l'ecran de vente.  
  - [ ] **2.3 Session**  
    - [ ] `normative-spec` : session porte site+caisse+operateur + trace d'audit.  
    - [ ] `normative-spec` : cloture produit un snapshot fige; pas de recalcul silencieux.  
  - [ ] **2.4 Poste / kiosque**  
    - [ ] `normative-spec` : autorite serveur pour PIN operateur et permissions (poste canon).  
    - [ ] `normative-spec` : invariants kiosque et offline renvoient a l'ADR **25-2** (pas de redecision).  
    - [ ] `normative-spec` : ne jamais confondre identite operateur vs identite poste/kiosque dans logs/payloads.  
  - [ ] **2.5 Roles / groupes / permissions**  
    - [ ] `normative-spec` : calcul additif roles+groupes; labels UI ne font pas foi.  
    - [ ] `normative-spec` : permissions sensibles evaluees avec scope site/caisse actif.

- [ ] **Renseigner les items Section 3 — Comportement de changement de contexte**  
  - [ ] **3.1 Bascule site/caisse**  
    - [ ] `normative-spec` : invalidation/recalcul serveur avant action metier; refus par defaut sinon.  
    - [ ] `normative-spec` : client ne conserve pas d'etat metier stale; erreur explicite.  
  - [ ] **3.2 PIN / step-up / kiosque**  
    - [ ] `normative-spec` : PIN operateur serveur reste canon (ref `prd.md` §11.2).  
    - [ ] `normative-spec` : PIN kiosque / secret poste / lockout / offline = ADR **25-2** (pas de best-effort).  
    - [ ] `normative-spec` : revalidation requise apres bascule sensible = **refus par defaut** jusqu'a preuve conforme.

- [ ] **Nommer les verifications**  
  - [ ] Pour chaque item `normative-spec`, renseigner un identifiant de test ou script, ex. `CTX-INV-2-1-SITE-EXPLICIT`, `CTX-SWITCH-3-1-REFUS`.  
  - [ ] Si aucune automation existe encore, utiliser un script manuel nomme (etape, entree, sortie attendue).

## Dev Notes

- **Pas de nouvelle ADR** : ADR **25-2** (PIN kiosque) et **25-3** (async Paheko) restent la norme ; ne pas rouvrir le fond.  
- **Scope strict** : sections **2** et **3** uniquement. Tout ajout hors scope doit etre tagge `vision-later` avec justification explicite.  
- **But de la checklist** : preparer les stories 25.8+ (refus post-bascule, journaux identite, step-up) sans ambiguite ni redecision.

### Project Structure Notes

- Checklist attendue sous `_bmad-output/implementation-artifacts/checklists/` avec un nom stable `25-7-...`.  
- Conserver un format lisible par humains et scripts (table ou liste avec colonnes/labels explicites).

### References

- `_bmad-output/planning-artifacts/epics.md` (Epic 25, Story 25.7)  
- `_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md` (sections **2** et **3**)  
- `_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md` (ADR 25-2)  
- `_bmad-output/planning-artifacts/architecture/2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md` (ADR 25-3)  
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Trace Epic 25 — ADR

| Élément | Valeur |
|--------|--------|
| Nouvelle ADR structurante requise par cette story ? | **ADR N/A** — checklist documentaire, aucune decision d'architecture nouvelle. |
| ADR **25-2** (PIN kiosque / operateur / secret de poste) | `d:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\_bmad-output\planning-artifacts\architecture\2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md` |
| ADR **25-3** (async Paheko / outbox / Redis auxiliaire) | `d:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\_bmad-output\planning-artifacts\architecture\2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md` |
| Justification **N/A** | La story convertit la spec **25.4** en checklist executable ; aucune nouvelle decision n'est introduite. |

## Alignement sprint / YAML

- **Post-CS :** `sprint-status.yaml` met la cle `25-7-traduire-la-spec-25-4-sections-2-3-en-checklist-developpement-executable` en **`ready-for-dev`**.  
- **Epic 25** reste **`in-progress`** (phase 2 25.6–25.15).

## Dev Agent Record

### Agent Model Used


### Debug Log References


### Completion Notes List


### File List

