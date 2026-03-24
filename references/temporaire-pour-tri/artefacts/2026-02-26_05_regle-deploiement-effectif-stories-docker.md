# Règle : déploiement effectif lors des stories Docker / déploiement

**Date :** 2026-02-26  
**Contexte :** En run automatique, la story 1.3 a été marquée done (fichiers Docker Compose, Dockerfile, doc créés) mais **le stack n'a pas été lancé** (`docker compose up`) par les agents. La story 1.4 a enchaîné sans que l'instance soit déployée.

---

## 1. Où est le trou ?

- **Critères d'acceptation 1.3 :** « **Quand** je lance `docker-compose up` avec les services… **Alors** le container RecyClique démarre et sert le front et l'API ; le health check répond. »
- **En pratique :** Le dev a livré les fichiers et a pu faire `docker compose build recyclic`, mais le workflow n'exige pas d'exécuter `docker compose up` et de vérifier GET /health avant de marquer la story done.
- **Résultat :** La stack n'a jamais été déployée par les agents ; l'utilisateur découvre en 1.4 que Docker n'a pas été « vraiment » déployé.

---

## 2. À quel moment le Docker doit-il être déployé par les agents ?

**Réponse cible :** **Pendant la story 1.3 (Dev Story)**, avant de passer la story en review.

- Pour toute story qui livre un **artefact de déploiement exécutable** (docker-compose, script de déploiement, etc.), le **bmad-dev** doit :
  1. **Exécuter le déploiement** (ex. `docker compose up --build` ou `-d`) dans l'environnement disponible (ou documenter l'impossibilité),
  2. **Vérifier le critère de succès** (ex. GET /health 200, ou équivalent),
  3. **Documenter** dans Completion Notes soit « Déploiement exécuté et vérifié (GET /health OK) », soit « Vérification manuelle requise : exécuter `docker compose up --build` et vérifier http://localhost:8000/health » si l'agent ne peut pas lancer Docker (sandbox, pas de daemon).

- Si l'agent ne peut pas exécuter Docker (contexte Cursor sans Docker, ou politique de sécurité), il doit au minimum :
  - Ajouter dans la story une **tâche ou note explicite** : « Vérification manuelle : lancer `docker compose up --build` et vérifier /health avant de considérer la story complète »,
  - Et ne pas cocher la tâche « Démarrage et health check » comme [x] sans cette vérification (ou cocher [x] seulement après avoir documenté la vérification manuelle requise).

---

## 3. Action immédiate pour toi (run automatique, story 1.4 en cours)

- **Option A — Maintenant (en parallèle de la 1.4) :** À la racine du repo, exécuter :
  ```bash
  docker compose up --build
  ```
  Vérifier http://localhost:8000 et http://localhost:8000/health. Si tout est OK, la stack 1.3 est validée ; tu peux laisser tourner ou faire `Ctrl+C` / `docker compose down`.

- **Option B — Après la 1.4 :** Une fois le dev 1.4 terminé, faire la même chose avant de continuer vers la 1.5 ou d'autres stories. Ça ne bloque pas le dev 1.4 (code loader TOML / EventBus), mais ça valide la base Docker avant d'enchaîner.

- **Option C — Checkpoint orchestrateur (pour plus tard) :** Ajouter dans l'orchestrateur BMAD un **checkpoint optionnel** après la story 1.3 approuvée : « Déploiement effectif : exécuter `docker compose up --build` et confirmer GET /health. Continuer ? (oui / non) ». Ainsi, en run automatique, une pause explicite force la vérification du déploiement avant d'enchaîner.

---

## 4. Règle proposée pour les prochaines stories « déploiement »

**Choix du projet :** Ne pas mettre de règle exceptionnelle dans l'agent bmad-dev (fichier constant). À la place, une **story dédiée** a été ajoutée dans le plan :

- **Story 1.5 (Epic 1) :** « Déploiement effectif et vérification de la stack Docker » — exécuter `docker compose up --build`, vérifier GET /health (et accès front / Paheko), documenter le résultat ou « Vérification manuelle requise » si l'agent ne peut pas lancer Docker. Cette story est après la 1.4 dans epics.md et dans sprint-status.yaml (backlog). Ainsi, le déploiement effectif devient une story normale du flux (create-story → dev-story → revision → code review) au lieu d'une exception dans l'agent.

---

## 5. Résumé

| Question | Réponse |
|----------|--------|
| À quel moment le Docker doit être déployé par les agents ? | **Pendant la Dev Story 1.3** : exécuter `docker compose up` (ou équivalent) et vérifier /health avant de marquer la story en review. |
| Pourquoi ça n'a pas été fait ? | Le workflow dev-story / bmad-dev n'impose pas cette étape ; les AC disent « quand je lance… » sans exiger que l'agent lance. |
| Que faire maintenant ? | Lancer toi-même `docker compose up --build` (maintenant ou après la 1.4) pour valider la stack ; optionnellement ajouter la règle ci-dessus à bmad-dev ou au workflow pour les prochaines fois. |
