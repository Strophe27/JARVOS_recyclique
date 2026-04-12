"""One-off patch for story 13.5 validation (UTF-8 safe)."""
from pathlib import Path

story_path = Path(
    r"D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique"
    r"\_bmad-output\implementation-artifacts\13-5-aligner-la-transition-hub-vers-vente-plein-cadre-rcn-02.md"
)
t = story_path.read_text(encoding="utf-8")
em = "\u2014"
apos = "\u2019"

old2 = (
    "2. **Observation legacy (DevTools obligatoire)** "
    + em
    + " Etant donne **`http://localhost:4445`**, quand DS/QA documentent la transition **reelle**, "
    "alors les preuves utilisent le MCP **`user-chrome-devtools`** selon la section **Preuve obligatoire** "
    "(descripteurs JSON **lus avant** chaque appel). **Secrets** : ne pas consigner mots de passe / PIN en clair dans le depot versionne ; "
    "utiliser variables"
    + apos
    + "environnement / runbook / brief agent."
)
new2 = (
    "2. **Observation legacy (DevTools obligatoire)** "
    + em
    + " Etant donne **`http://localhost:4445`**, quand DS/QA documentent la transition **reelle**, "
    "alors les preuves utilisent le MCP **`user-chrome-devtools`** selon la section **Preuve obligatoire** "
    "(descripteurs JSON **lus avant** chaque appel). **Secrets** : ne pas consigner dans les fichiers **versionnes** du depot mots de passe / PIN de recette ; "
    "utiliser uniquement **variables"
    + apos
    + "environnement locales**, **runbook non versionne**, ou **brief agent** "
    + em
    + " jamais de credentials en clair dans les commits."
)

old3 = (
    "3. **Comparaison Peintre** "
    + em
    + " Etant donne **`http://localhost:4444`** avec la **meme sequence d"
    + apos
    + "intention** utilisateur (meme ordre d"
    + apos
    + "etapes que sur 4445), quand la parite est evaluee, alors le tableau **equivalence / ecart / gap** couvre : URLs, disparition nav transverse, plein cadre, etats de chargement intermediaires "
    + em
    + " avec snapshots **stabilises** (apres `wait_for` si disponible, ou attente documentee)."
)
new3 = (
    "3. **Comparaison Peintre** "
    + em
    + " Etant donne **`http://localhost:4444`** (`VITE_LIVE_AUTH` et ports selon **runbook** du projet, donnees recette **alignees** sur **4445**), "
    "avec la **meme sequence d"
    + apos
    + "intention** utilisateur (meme ordre d"
    + apos
    + "etapes que sur 4445), quand la parite est evaluee, alors le tableau **equivalence / ecart / gap** "
    "couvre : URLs, disparition nav transverse, plein cadre, etats de chargement intermediaires "
    + em
    + " avec snapshots **stabilises** (apres `wait_for` si disponible, ou attente documentee)."
)

old4 = (
    "4. **Reseau (si pertinent)** "
    + em
    + " Etant donne une correlation reseau utile (ex. rafraichissement session avant affichage vente), quand des requetes sont citees, "
    "alors utiliser **`list_network_requests`** puis **`get_network_request`** **uniquement** pour des IDs **deja listes** "
    + em
    + " **ne pas inventer** de chemins d"
    + apos
    + "API non apparus dans la liste."
)
new4 = (
    old4
    + " **Indices non normatifs** (ajuster aux captures reelles) : familles souvent utiles sur cette transition "
    + em
    + " `users/me`, `users/me/context`, `permissions`, `cash-registers/status`, `cash-sessions/current` ou `cash-sessions/status/...`, `activity/ping`."
)

old_preuve = (
    "- **Ordre d"
    + apos
    + "execution des outils MCP** :\n"
    "  1. `list_pages` — identifier `pageId`.\n"
    "  2. `select_page` avec ce `pageId`.\n"
    "  3. `navigate_page` vers le hub **`/caisse`** sur **4445**, puis `take_snapshot` ; enchainer les actions utilisateur **observees** jusqu"
    + apos
    + "a **`/cash-register/sale`** ; snapshot **sur hub** et **sur vente** (et eventuellement etat **pendant** chargement si capturable).\n"
    "  4. Repeter la **meme sequence** sur **4444**.\n"
    "  5. Si pertinent : `list_network_requests` (`resourceTypes` : `xhr`, `fetch` apres stabilisation) ; `get_network_request` uniquement sur IDs **listes**.\n"
    "- **Descripteurs JSON** : lire les fichiers sous  \n"
    "  `C:\\Users\\Strophe\\.cursor\\projects\\d-users-Strophe-Documents-1-IA-La-Clique-Qui-Recycle-JARVOS-recyclique\\mcps\\user-chrome-devtools\\tools\\`  \n"
    "  (`list_pages.json`, `select_page.json`, `navigate_page.json`, `take_snapshot.json`, `list_network_requests.json`, `get_network_request.json`, `wait_for.json` si present) **avant** tout appel MCP.\n"
    "- **Chemins workspace** : si le projet Cursor est ouvert ailleurs, adapter le chemin vers `mcps/user-chrome-devtools/tools/` a la racine du projet configure."
)

new_preuve = (
    "- **Ordre d"
    + apos
    + "execution des outils MCP** (meme onglet ou onglets distincts, une **page selectionnee** a la fois) :\n"
    "  1. `list_pages` — identifier `pageId` cible.\n"
    "  2. `select_page` avec ce `pageId`.\n"
    "  3. `navigate_page` (`type: \"url\"`) vers **`http://localhost:4445/caisse`**, puis `take_snapshot` ; enchainer les actions utilisateur **observees** jusqu"
    + apos
    + "a **`http://localhost:4445/cash-register/sale`** (branche **reelle**) ; snapshots **hub**, **pendant chargement** si capturable (`wait_for` si present), **vente stabilisee**.\n"
    "  4. Repeter la **meme sequence d"
    + apos
    + "intention** avec **`http://localhost:4444/caisse`** puis la vente sur **4444**.\n"
    "  5. Si pertinent : `list_network_requests` (ex. `resourceTypes: [\"xhr\",\"fetch\"]` apres stabilisation) ; `get_network_request` uniquement sur IDs **deja listes**.\n"
    "- **Descripteurs JSON** : **lire** les fichiers sous  \n"
    "  `C:\\Users\\Strophe\\.cursor\\projects\\d-users-Strophe-Documents-1-IA-La-Clique-Qui-Recycle-JARVOS-recyclique\\mcps\\user-chrome-devtools\\tools\\`  \n"
    "  (`list_pages.json`, `select_page.json`, `navigate_page.json`, `take_snapshot.json`, `list_network_requests.json`, `get_network_request.json`, `wait_for.json` si present) **avant** tout appel MCP "
    + em
    + " valider noms de parametres (`type`, `url`, `pageId`, `verbose`, `resourceTypes`, etc.).\n"
    "- **Equivalents chemins** : si le workspace Cursor est ouvert ailleurs, retrouver `mcps/user-chrome-devtools/tools/*.json` a la racine du projet Cursor configure."
)

# Fix list item numeration hyphens in old_preuve: file uses ASCII hyphen in "1. `list_pages` —" 
# Check story: em dash after list_pages?
for label, old, new in [("ac2", old2, new2), ("ac3", old3, new3), ("ac4", old4, new4)]:
    if old not in t:
        raise SystemExit(f"MISSING {label} len_old={len(old)}")
    t = t.replace(old, new, 1)

if old_preuve not in t:
    raise SystemExit("MISSING preuve block")
t = t.replace(old_preuve, new_preuve, 1)

story_path.write_text(t, encoding="utf-8")
print("patched OK")
