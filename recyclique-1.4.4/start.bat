@echo off
echo 🚀 Démarrage de Recyclic...

REM Vérifier si Docker est installé
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker n'est pas installé. Veuillez installer Docker d'abord.
    pause
    exit /b 1
)

REM Préférence Docker Compose v2, repli v1
set "DC_HINT=docker compose"
docker compose version >nul 2>&1
if %errorlevel% equ 0 goto :run_compose

set "DC_HINT=docker-compose"
docker-compose --version >nul 2>&1
if %errorlevel% equ 0 goto :run_compose

echo ❌ Docker Compose introuvable. Installez le plugin « docker compose » ou le binaire « docker-compose ».
pause
exit /b 1

:run_compose

REM Vérifier si le fichier .env existe
if not exist .env (
    echo 📝 Création du fichier .env à partir de env.example...
    copy env.example .env
    echo ⚠️  Veuillez configurer les variables d'environnement dans le fichier .env
)

REM Construire et démarrer les services
echo 🔨 Construction des images Docker...
if "%DC_HINT%"=="docker compose" (
    docker compose build
) else (
    docker-compose build
)

echo 🚀 Démarrage des services...
if "%DC_HINT%"=="docker compose" (
    docker compose up -d
) else (
    docker-compose up -d
)

REM Attendre que les services soient prêts
echo ⏳ Attente du démarrage des services...
timeout /t 10 /nobreak >nul

REM Vérifier le statut des services
echo 🔍 Vérification du statut des services...
if "%DC_HINT%"=="docker compose" (
    docker compose ps
) else (
    docker-compose ps
)

REM Tester l'API
echo 🧪 Test de l'API...
timeout /t 5 /nobreak >nul
curl -f http://localhost:8000/health >nul 2>&1 || echo ⚠️  L'API n'est pas encore prête

echo.
echo ✅ Recyclic est démarré !
echo.
echo 🌐 Services disponibles :
echo    • API: http://localhost:8000 (surcharge possible via API_PORT dans .env)
echo    • Documentation: http://localhost:8000/docs
echo    • Frontend: http://localhost:4444
echo    • PostgreSQL: localhost:5432
echo    • Redis: localhost:6379
echo.
echo 📚 Commandes utiles (compose utilisé : %DC_HINT%) :
if "%DC_HINT%"=="docker compose" (
    echo    • Voir les logs: docker compose logs -f
    echo    • Arrêter: docker compose down
    echo    • Redémarrer: docker compose restart
) else (
    echo    • Voir les logs: docker-compose logs -f
    echo    • Arrêter: docker-compose down
    echo    • Redémarrer: docker-compose restart
)
pause
