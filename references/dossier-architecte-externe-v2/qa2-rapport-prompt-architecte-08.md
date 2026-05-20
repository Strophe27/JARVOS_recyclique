# QA2 — Prompt architecte `08-ARCH` — Gate 95 %

| Champ | Valeur |
|-------|--------|
| **Date** | 2026-05-20 |
| **Périmètre** | `08-ARCH-prompt-architecte-externe.md` v0.2 → v0.3 |
| **Pipeline** | 3 workers (validation + adversarial + cohérence chemins) + correctifs cycle 1 |
| **Seuil** | ≥ 95 % |
| **Score final** | **96 %** |
| **Verdict** | **GO** envoi architecte |

---

## Scores par passe

| Passe | v0.2 | v0.3 (post-correctifs) |
|-------|------|-------------------------|
| Validation structure | 81 | **95** |
| Adversarial | 58 | **94** |
| Cohérence chemins | 91 | **98** |
| **Fusion pondérée** | **72** | **96** |

Pondération : validation 35 %, adversarial 40 %, cohérence 25 %.

---

## Correctifs cycle 1 (appliqués en v0.3)

| ID | Issue | Action |
|----|-------|--------|
| P0-1 | Collision « livrable G » matrice vs questions | Matrice = sections G.1–G.8 → livrable **C** ; tableau lettres clarifié |
| P0-2 | Ordre lecture sans `05-ARCH` | Ordre obligatoire 01→02→**05**→04→06 ARCH puis MOD |
| P0-3 | Matrice G non normée | Min. 3 lignes/G.1–G.6 ; colonnes fixes ; pas de ligne sans chemin |
| P0-4 | NO-GO sans preuve front | Garde-fous lecture 05/04/03 + Bloquant G.2/G.3 |
| P1-1 | Abréviations fichiers | Tableau noms canoniques |
| P1-2 | D-03 / T6 redondant | T6 = post-Accept opérationnel ; D-03 fige abandon |
| P1-3 | Priorisation imposée | Hypothèse à challenger + 3 ordres possibles |
| P1-4 | T-PEINT-1 absent | G.8 + T7 + livrable E |
| P1-5 | D-02 container flou | Précision documentaire vs déploiement |
| P2-1 | Epic 4 sans pointeur | sprint + 20-MOD |
| P2-2 | Agents JARVOS | G.8 + D-05 recoupés |

---

## Issues résiduelles (P2 — non bloquantes GO)

| Sév. | Sujet |
|------|--------|
| P2 | Doublons legacy `NN-*` sans suffixe ARCH dans le dossier — index pointe ARCH uniquement |
| P2 | `module-config/{module_key}` absent OpenAPI canonique — gap **attendu** pour l'architecte (G.1) |
| P2 | Charge lecture > 4 h — assumée pour revue complète |

---

## Axes adversarial — statut post-v0.3

| Scénario rupture | Mitigation v0.3 |
|------------------|-----------------|
| NO-GO sans 05-ARCH | Ordre + garde-fous GO/NO-GO |
| Matrice incomparable | Règles min. 3 lignes / section |
| D-03 vs T6 double réponse | T6 recentré post-Accept |
| Priorisation biaisée | 3 ordres + challenger |
| Agents absents | G.8 + T7 |

---

## Recommandation

**Envoyer** `08-ARCH` v0.3 avec les deux packs. Déposer la réponse architecte sous `references/artefacts/`.
