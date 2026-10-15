@echo off
:: setup-scheduler.bat — регистрирует задачу в Windows Task Scheduler
:: Запуск: правой кнопкой → "Запуск от имени администратора"

SET TASK_NAME=AutoEvoFlow-UpdateLatestCars
SET SCRIPT=%~dp0scrape-latest.js
SET WORK_DIR=%~dp0..

schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1

schtasks /create ^
  /tn "%TASK_NAME%" ^
  /tr "node \"%SCRIPT%\"" ^
  /sc HOURLY /mo 6 /st 06:00 ^
  /ru SYSTEM /f

if %ERRORLEVEL% equ 0 (
  echo.
  echo [OK] Задача "%TASK_NAME%" зарегистрирована.
  echo      Запуск каждые 6 часов, начало в 06:00
  echo      Для проверки:    schtasks /query /tn "%TASK_NAME%"
  echo      Запустить сейчас: schtasks /run /tn "%TASK_NAME%"
) else (
  echo [ОШИБКА] Запустите bat-файл от имени администратора.
)
pause
