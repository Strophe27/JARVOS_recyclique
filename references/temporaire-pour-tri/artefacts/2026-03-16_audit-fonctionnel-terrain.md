# Audit fonctionnel terrain -- 2026-03-16

Parcours operateur sur la stack locale. Pour chaque point : **OK** / **KO** / **Partiel** + commentaire libre.

URLs :
- Frontend : http://localhost:4173
- API : http://localhost:9010
- Paheko : http://localhost:8080

---

## 1. Auth

- [x] Page login s'affiche : **OK** -- Sur 9010 (4173 non utilise, pas grave). Boite identifiant + mot de passe + bouton Se connecter.
- [x] Creer un compte (signup) : **OK** -- Volontairement absent (intranet, creation users par super admin / admins uniquement).
- [x] Se connecter : **OK** -- Connexion avec compte admin fonctionne.
- [x] Mot de passe oublie : **KO** -- Absent sur la page login.
- [x] Reset password : **KO** -- Non disponible / non teste.
- [x] PIN login : **OK** -- Normal qu'il ne soit pas sur la page login (reserve a la caisse).
- [x] Deconnexion : **OK** -- Fonctionne.
- [x] Rester connecte apres F5 : **OK** -- Bug role Super Admin perdu apres F5 : CORRIGE.

## 2. Dashboard

- [x] Dashboard s'affiche apres login : **OK**
- [x] Navigation menu / bandeau : **OK** -- Trois liens (Tableau de bord, Caisse, Administration) + menu utilisateur a droite (nom, Profil, Deconnexion). Pas de lien "Reception" dans le bandeau.
- [x] Liens vers caisse, reception, admin : **Partiel** -- Caisse OK, Admin OK ; **Reception absent** du menu / bandeau.

## 3. Caisse

- [x] Page caisse (dashboard caisse) : **OK** -- /caisse affiche la selection de poste.
- [x] Selection du poste de caisse : **OK** -- "Caisse 1" visible ; en dessous un ID tres complexe + statut "Ferme" (affichage a revoir).
- [x] Ouverture de session : **OK** -- Bandeau live : "Agent [nom], session #EEDB387" affiche.
- [x] Grille categories / sous-categories : **KO** -- "Aucune categorie disponible, contactez un administrateur" (BDD vide). Meme apres import partiel CSV (20 categories racines), aucune categorie n'apparait dans la caisse.
- [x] Boutons presets (Don, Recyclage, etc.) : **KO** -- Absents. Interface tres differente de 1.4.4 : boutons Categories / Sous-categories / Poids / Prix + champ Article + Quantite au lieu des presets.
- [x] Ajouter un article au ticket : **Non teste** (pas de categories disponibles).
- [x] Ticket en temps reel (total, lignes) : **Non teste**
- [x] Saisie prix / quantite : **Non teste**
- [x] Raccourcis clavier AZERTY : **KO** -- Absents (raccourci Tab pour naviguer entre champs non fonctionnel / non present).
- [x] Paiement (especes, CB, multi-moyens) : **Non teste**
- [x] Finalisation vente : **Non teste**
- [x] Fermeture de session (comptage, totaux, ecart) : **Non teste**
- [x] Caisse virtuelle : **Non teste**
- [x] Saisie differee : **Non teste**
- [x] Bandeau live (KPIs temps reel) : **Partiel** -- Bandeau live session affiche (nom agent, numero session). KPIs metier non verifies (pas de vente possible).

## 4. Reception

- [x] Page reception (accueil) : **Partiel** -- Page visible apres correction permissions. Boutons Creer ticket, Fermer poste, Export lignes presents. Page blanche (cassee) apres import categories.
- [x] Ouvrir un poste reception : **OK** -- Poste ouvert, statut "opened" + date affichee.
- [x] Creer un ticket de depot : **Partiel** -- Ticket cree mais reste sur la page liste (pas d'ouverture page de saisie). User affiche comme code hex (ex. 58841A7F) au lieu du nom -- bug. 0 articles, 0 kg, statut "opened".
- [x] Saisir des lignes (poids, categorie, destination) : **Partiel** -- Via /reception/ticket/[longUID] (bouton Modifier). Poids OK, destination OK (recyclage/revente/destruction/dons/autres), categorie = liste vide. Bouton "Sortie stock" present. Saisie ligne bloquee sans categorie.
- [x] Modifier / supprimer une ligne : **Non teste**
- [x] Export CSV : **Non teste**
- [x] Stats live : **Non teste**
- [x] Bandeau live reception : **Non teste**

## 5. Admin

- [x] Dashboard admin : **Partiel** -- Bandeau haut : Notifications / CA du mois / Utilisateurs Connectes. Notifications : clic --> redirige /users au lieu d'afficher les notifs en dropdown. Utilisateurs Connectes : affiche "0" (incorrect, au moins 1 connecte) ; bouton "Voir" --> /admin/users au lieu de depliee la liste. Bloc "Utilisateurs et profils" : liste users OK (peut ouvrir details).
- [x] Gestion utilisateurs (liste, creer, editer) : **Partiel** -- Liste visible, details ouvrent les fiches. Fonctionnalites CRUD non testees en detail.
- [x] Users pending : **Partiel** -- Pas d'ecran ni lien dedie "utilisateurs en attente". Dans /users, onglet "En attente" present : "Aucune inscription en attente". Normal (pas d'auto-inscription). Relique V0.1 (creation user via flux tiers d'inscription, abandonnee) -- pas prioritaire.
- [x] Gestion sites : **OK** -- Liste sites, creer (ex. Site 2 actif), modifier (actif/inactif, renommer), supprimer. Teste et fonctionne.
- [x] Postes de caisse : **OK** -- Liste postes, creer, modifier, supprimer. Teste et fonctionne.
- [x] Sessions de caisse (historique) : **Partiel** -- Gestionnaire de sessions : filtre date debut/fin (fonctionne : date aujourd'hui = donnees, hier = vide). Filtre statut (ouverte/cloturee) OK. Listes Site / Poste / Operateur restent grisees (ne s'ouvrent pas). Details session : ID, dates ouverture/cloture, type RealCaisse, bouton "Telecharger" --> CSV "rapport session [UUID]". Pas d'export global type Excel 1.4.4 (onglets, categories, sous-categories).
- [x] Rapports caisse : **Partiel** -- Pas d'ecran "rapports caisse" dedie. Export par session uniquement (CSV depuis details session). Pas d'export global Excel comme ancienne version.
- [x] Categories (liste, arbre, import) : **Partiel** -- Pas de bouton "Creer une categorie". Actions disponibles : telecharger modele CSV, importer CSV, exporter CSV, supprimer. Import CSV 1.4.4 : 20 lignes valides, 57 erreurs (parent ID invalide = sous-categories orphelines). Categories importees : 2 actions (supprimer uniquement, pas de modifier). Categories cassees apres manipulation.
- [x] Reception admin : **OK** -- Stats : 2 tickets aujourd'hui, poids total 2 kg, 1 ligne. Onglet Tickets : liste avec statuts (2 tickets "opened" non fermes). Ces tickets ouverts ne remontent pas en Notifications dans le Dashboard Admin -- bug.
- [x] BDD (export, import, purge) : **Partiel** -- Trois boutons SuperAdmin : Exporter, Importer, Purge des donnees transactionnelles (avec avertissement : supprime ventes, reception, exceptions caisse, operation irreversible). Non testes en detail. Import dump 1.4.4 ne fonctionne pas -- il faudrait un traducteur de tables.
- [x] Import legacy (CSV categories) : **Partiel** -- Meme flux que Categories > Importer CSV (voir Categories). Pas d'ecran dedie "import legacy" separe.
- [x] Groupes : **Partiel** -- Liste de groupes visible. Clic sur groupe : se deplie mais rien ne se passe. Modifier : nom + description seulement. Pas de vraie gestion ACL (pas d'assignation permissions/users depuis l'interface). Bouton "action-detail" present ; details en bas : "permission 1, utilisateur 0".
- [x] Permissions : **KO** -- Pas de gestion ACL reelle (voir Groupes).
- [x] Sante (health) : **Partiel** -- Bouton "Sante systeme" dans SuperAdmin. Affiche : Sante global OK, Base de donnees OK, Redis OK ; Scheduler push worker : unconfigured (configure non, running non). Anomalies : push worker en rouge, scheduler unconfigured. Bouton "Test notification" --> "configuration email incomplete". Parametres avances > onglet Email : stub "Parametres email et tests a configurer", bouton Test email --> config email incomplete.
- [x] Audit log : **Partiel** -- Liste de 72 logs visible. Contenu abscons : Paheko AccessDecision, User, Request ID, Roles SuperAdmin, Decision, Hello, Reason, Dependency, IAM, Pass... repetitif. Un log "cache session" visible a 11h22. Format difficile a lire pour un operateur.
- [x] Logs email : **KO** -- Pas d'ecran dedie "logs email". Activite et log ne contient rien sur les emails. Parametres avances > Email : stub, test email --> configuration email incomplete.
- [x] Parametres : **KO** -- Sante systemes, parametres avances, seuil activite, alerte, session stub, email stub. **Tout est en "stub"** -- non fonctionnel.
- [x] Quick analysis : **Partiel** -- Bouton "Analyse rapide" en SuperAdmin. Ecran : "Indicateur agrege et comparaison de periodes", "Rechargement manuel", carte "Indicateur : aucune statistique disponible, endpoint optionnel". Aucun lien supplementaire.
- [x] Vie associative : **KO** -- Aucun lien ni section "vie associative" nulle part.

## 6. Profil

- [x] Page profil utilisateur : **OK** -- Menu nom > Profil : page affichee avec prenom, nom, email, changer mot de passe, PIN Caisse (4 a 6 chiffres), bouton Se deconnecter.
- [x] Modifier ses infos : **Partiel** -- Champs et boutons presents ; modification non testee.

## 7. Paheko

- [x] Paheko accessible (http://localhost:8080) : **KO** -- Non accessible. Ports non exposes dans Docker Desktop (Windows). Probleme connu : connexion entre ports Windows bloquee (d'où RecyClique sur 90xx).
- [x] Connexion Paheko : **Non teste** (Paheko inaccessible).
- [x] Caisse Paheko (plugin) visible : **Non teste**
- [x] Saisie au poids Paheko visible : **Non teste**

## 8. Integration RecyClique -> Paheko

- [x] Une vente dans RecyClique apparait dans Paheko : **Non teste** -- Modules de vente non fonctionnels pour l'instant ; a tester plus tard.
- [x] Fermeture session -> sync compta Paheko : **Non teste** -- Idem, a tester quand caisse/Paheko operants.

---

## Notes libres

_(Ajoute ici tout ce que tu remarques en dehors de la liste)_

- **Logo** : le logo RecyClique affiche est une poubelle au lieu des trois fleches de recyclage en triangle (parite visuelle 1.4.4).
- **Admin** : ancien bouton "site/caisse" n'amenait que sur sites ; un agent a cree deux boutons separes "Sites" et "Caisse / postes de caisse". A voir plus tard.
- **Caisse -- interface** : interface completement differente de 1.4.4. Pas de presets, pas de raccourcis clavier, pas de categories disponibles (meme apres import partiel CSV).
- **Import categories CSV** : seules les categories racines importees (20). Sous-categories en erreur (parent ID invalide). Impact : caisse sans categories, liste vide dans saisie reception.
- **Reception -- creation ticket** : reste sur la page liste au lieu d'ouvrir une page de saisie. User affiche comme code hex au lieu du nom.
- **Reception -- page blanche** : apres l'import categories, la page /reception devient une page blanche. /reception/ticket/[ID] reste accessible partiellement.
- **Reception -- absent du menu** : lien "Reception" manquant dans le bandeau de navigation.
- **Dashboard Admin -- Notifications** : clic sur "Notifications" redirige vers /users au lieu de depliee les notifs. Tickets reception ouverts non signales en notification.
- **Dashboard Admin -- Utilisateurs Connectes** : compteur affiche 0 (incorrect). Bouton "Voir" redirige vers /admin/users au lieu de depliee une liste.
- **Admin -- Groupes** : pas de vraie gestion ACL. Modifier = nom + description seulement.
- **Admin -- Parametres** : tout en "stub" (session, email, alertes) -- non fonctionnel.
- **Admin -- Audit log** : 72 logs, format technique abscons (Paheko IAM decision), peu exploitable par un operateur metier.
- **Caisse -- ID poste** : affichage d'un ID tres complexe sous le nom du poste -- a simplifier.
- **Sessions caisse** : listes deroulantes Site / Poste / Operateur grisees (ne s'ouvrent pas). Export global type Excel 1.4.4 (onglets, detail categories) absent.
- **BDD** : import d'un dump 1.4.4 echoue ; necessite un traducteur de tables pour migration.
- **Paheko** : localhost:8080 inaccessible (ports non exposes sous Docker Windows ; probleme connexion inter-ports connu). Integration RecyClique -> Paheko a tester quand modules vente et Paheko seront operants.
