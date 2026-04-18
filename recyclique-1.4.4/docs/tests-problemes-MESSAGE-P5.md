# Message pour Agent B42-P5

**À copier-coller pour assigner la story P5 à l'agent**

---

## Message à Envoyer

```
Agent B42-P5, tu dois créer les tests de hardening et sécurité pour l'epic B42.

Lis le fichier: docs/tests-problemes-p5-prevention.md
Ce guide contient toutes les leçons apprises des stories P2, P3, P4 pour éviter les mêmes problèmes.

Tu dois:
1. Lire la story: docs/stories/story-b42-p5-hardening-tests.md (mise à jour avec détails)

2. Suivre le guide de prévention: docs/tests-problemes-p5-prevention.md
   - Vérifier l'environnement AVANT de créer les tests
   - Utiliser les bonnes dépendances (from jose import jwt, pas import jwt)
   - Exécuter les tests IMMÉDIATEMENT après création
   - Adapter les tests à l'infrastructure réelle

3. Créer les tests selon les AC de la story:
   - Pen-tests (replay, CSRF, IP validation)
   - Long-run scenario (10h avec fake timers)
   - Offline/chaos tests
   - Load tests (optionnel)
   - Rapport de validation

4. Valider que tous les tests s'exécutent sans erreur d'import/config/environnement

5. Mettre à jour la story avec les tests créés et les résultats

IMPORTANT: Suis le guide de prévention pour éviter les problèmes rencontrés dans P2, P3, P4.
```

---

## Fichiers de Référence

- **Story:** `docs/stories/story-b42-p5-hardening-tests.md`
- **Guide de prévention:** `docs/tests-problemes-p5-prevention.md`
- **RFC:** `docs/architecture/sliding-session-rfc.md`
- **Stories précédentes:** P2, P3, P4 pour comprendre le contexte

---

**Auteur:** Auto (Agent Cursor) - 2025-11-26

