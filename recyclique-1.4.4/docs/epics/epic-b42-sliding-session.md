# Epic: Session glissante & anti-déconnexion

**ID:** EPIC-B42-SLIDING-SESSION  
**Titre:** Sessions glissantes sans déconnexion intempestive  
**Thème:** Authentification / Expérience caisse & réception  
**Statut:** Proposition  
**Priorité:** P0 (Bloquant)

---

## 1. Objectif de l'Epic

Garantir qu’un poste de caisse/réception reste connecté toute la journée tant qu’il est actif, sans sacrifier la sécurité. L’epic introduit un mécanisme de “sliding session” (renouvellement automatique du token ou refresh token) adossé au système d’activité existant pour éliminer les déconnexions en plein workflow.

## 2. Description

Aujourd’hui, la durée de session (token JWT) est configurable mais fixe : lorsqu’elle expire (ex. 240 min), le premier appel API renvoie 401 et l’utilisateur est expédié sur /login. Le ping `/v1/activity/ping` et `ActivityService` détectent déjà l’activité réelle, mais n’influencent pas la session. Nous allons relier ces deux mondes : tant qu’un poste envoie des pings ou effectue des actions, son token est régénéré avant expiration ; inversement, un poste inactif se déconnecte naturellement. L’implémentation doit rester sécurisée (rotation des tokens, détection des anomalies, audit).

## 3. Stories de l'Epic (ordre imposé)

1. **STORY-B42-P1 – Audit & Design du sliding session**  
   - Cartographier l’existant (JWT, settings, ActivityService, intercepteur frontend).  
   - Définir l’architecture cible : refresh token ou réémission basée sur le ping.  
   - Produire une note de design validée (PO + Tech Lead + Sec).

2. **STORY-B42-P2 – Backend : Refresh Token & APIs**  
   - Introduire un refresh token (HTTP-only cookie ou header dédié) ou un endpoint `POST /auth/refresh`.  
   - Conserver `token_expiration_minutes` comme durée “max” mais déclencher une réémission si activité récente.  
   - Sécuriser la rotation (invalidation double jeton, audit, tests).

3. **STORY-B42-P3 – Frontend : Intégration et Pings intelligents**  
   - Adapter `axiosClient`/`authStore` pour stocker le refresh token et re demander un access token avant qu’il n’expire (ex: timer + interceptors).  
   - Coupler le ping `/v1/activity/ping` et les actions utilisateur pour déclencher les refresh.  
   - Gérer les cas hors-ligne (file d’attente + retry).

4. **STORY-B42-P4 – UX, Alertes & Observabilité**  
   - Notifier l’utilisateur quelques minutes avant expiration si aucun refresh possible (perte réseau).  
   - Ajouter métriques/logs (temps moyen, anomalies).  
   - Vérifier que `Admin > Paramètres > Durée session` reste la source de vérité et documenter la différence avec le “Seuil d’activité”.

5. **STORY-B42-P5 – Hardening & Tests de sécurité**  
   - Tests end-to-end (connexion longue durée, poste resté inactif > délai).  
   - Tests de pénétration ciblés (replay token, refresh forgé, CSRF selon choix technique).  
   - Documentation Runbook (procédure regen clés, rotation forcée).

6. **STORY-B42-P6 – Capteur de Présence & Refresh Automatique Intelligent**  
   - Détection automatique d'activité utilisateur (mousemove, click, keypress, scroll).  
   - Pings intelligents basés sur l'activité (pas toutes les 5 min).  
   - Refresh automatique silencieux si activité récente.  
   - Bandeau discret (masqué par défaut, visible seulement en cas d'erreur/inactivité).

## 4. Compatibilité & Contraintes

- Rester compatible avec les tokens existants (migration douce).  
- Ne pas autoriser des sessions infinies : la durée max (ex. 24h) reste configurable.  
- Support offline-mode : si le poste est déconnecté, il doit avertir l’utilisateur avant d’expirer.  
- Respecter RGPD/audit : journaliser toute réémission et pouvoir couper toutes les sessions depuis l’admin si compromise.

## 5. Definition of Done

- [ ] Les 6 stories sont livrées et validées par QA + sécurité.  
- [ ] Une séance de caisse peut rester ouverte toute la journée sans reconnection tant que l’opérateur est actif.  
- [ ] Les tokens expirent bien lorsque le poste est réellement inactif (au-delà du seuil + durée max).  
- [ ] Les métriques/alertes permettent au PO de surveiller le taux de déconnexion.  
- [ ] Documentation (guide admin + runbook sécurité) mise à jour.  
- [ ] Aucun nouvel audit de sécurité n’est requis (ou tous les findings sont corrigés).

