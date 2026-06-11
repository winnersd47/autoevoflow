@echo off
REM ── Windows Task Scheduler setup (бесплатный, работает без Claude Code) ──────
REM Создаёт задание «AutoEvoFlow-Scraper» которое:
REM   - запускает scrape-latest.js каждые 6 часов
REM   - работает в фоне, независимо от dev-сервера
REM
REM Запустить от имени администратора: ПКМ → "Запуск от имени администратора"
REM Для удаления задания: schtasks /delete /tn "AutoEvoFlow-Scraper" /f

set PROJECT_DIR=C:\Users\v.serdyuk\Desktop\automotive-ai-platform\frontend
set SCRIPT=%PROJECT_DIR%\scripts\scrape-latest.js
set LOGFILE=%PROJECT_DIR%\.scraper.log

REM Найти node.exe
for /f "tokens=*" %%i in ('where node') do set NODE_PATH=%%i

if "%NODE_PATH%"=="" (
  echo [ERROR] node.exe не найден. Установите Node.js.
  pause
  exit /b 1
)

echo Создаём задание в Windows Task Scheduler...
echo   node: %NODE_PATH%
echo   скрипт: %SCRIPT%
echo   интервал: каждые 6 часов

REM Удаляем старое задание (если есть)
schtasks /delete /tn "AutoEvoFlow-Scraper" /f >nul 2>&1

REM Создаём новое задание (каждые 6 часов, начиная с текущего времени)
schtasks /create ^
  /tn "AutoEvoFlow-Scraper" ^
  /tr "\"%NODE_PATH%\" \"%SCRIPT%\"" ^
  /sc hourly ^
  /mo 6 ^
  /st 00:00 ^
  /sd 01/01/2024 ^
  /ru "SYSTEM" ^
  /rl HIGHEST ^
  /f

if %errorlevel% equ 0 (
  echo.
  echo [OK] Задание "AutoEvoFlow-Scraper" создано.
  echo      Парсер будет запускаться каждые 6 часов.
  echo.
  echo Управление:
  echo   Просмотр:  schtasks /query /tn "AutoEvoFlow-Scraper"
  echo   Запустить: schtasks /run /tn "AutoEvoFlow-Scraper"
  echo   Удалить:   schtasks /delete /tn "AutoEvoFlow-Scraper" /f
) else (
  echo [ERROR] Не удалось создать задание. Запустите от имени администратора.
)
pause
