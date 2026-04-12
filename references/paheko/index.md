# Index — references/paheko/



Guide et reference pour **Paheko** (gestion d'association) dans le cadre de l'integration RecyClique. Contient les instructions pour le code dans `repo/` (gitignore) et l'analyse brownfield.



> Charger si : session sur integration Paheko, analyse API/extensions, ou croisement avec migration-paheko.



---



## Fichiers



| Fichier / dossier | Contenu |

|-------------------|--------|

| `README.md` | Instructions : source archive Fossil (uv), version 1.3.19, plugins/modules inclus (dont Saisie au poids dans repo/modules/saisie_poids/). |

| `analyse-brownfield-paheko.md` | Analyse brownfield complete : extensions (plugins/modules), API HTTP, gestion des fichiers et upload, WebDAV ; synthese pour integration RecyClique. |

| `liste-endpoints-api-paheko.md` | Liste detaillee des endpoints API Paheko : methode, chemin sous /api, utilite, niveau min. (read/write/admin) ; reference pour confrontation RecyClique vs Paheko et PRD. |

| **Schéma BDD** | **references/dumps/schema-paheko-dev.md** — Tables extraites de l'instance Paheko dev (SQLite Docker, plugins Caisse et Saisie au poids activés) : core (api_credentials, users, acc_*, files, etc.) + tables réelles du plugin Caisse (plugin_pos_*) et du module Saisie au poids (module_data_saisie_poids). Pour correspondances avec RecyClique. |

| `repo/` | Contenu de l'archive de distribution Paheko (gitignore). Contient modules/ (ex. saisie_poids), plugins/, etc. |



---



## Analyser le code



Pour analyser le code : utiliser `repo/` comme point d'entree. Structure selon l'archive (ex. `include/`, `www/`, `modules/` dont saisie_poids). Voir aussi **references/migration-paheko/** pour les guides RecyClique+Paheko.



**Instance dev locale** : procedure Docker standalone dans **dev-tampon/paheko/** (racine projet ; dossier `dev-tampon/` gitignore, donc non versionné — la procedure n'est disponible qu'en local tant que le tampon existe). Voir [dev-tampon/paheko/README.md](../../dev-tampon/paheko/README.md).

**Voir aussi (2026-03-31) :** audit transversal `references/` — [../artefacts/2026-03-31_02_audit-references-00-synthese-globale.md](../artefacts/2026-03-31_02_audit-references-00-synthese-globale.md).

