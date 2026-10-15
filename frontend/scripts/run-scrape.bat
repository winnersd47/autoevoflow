@echo off
chcp 65001 >nul
cd /d C:\Users\v.serdyuk\Documents\AIGrowth\AutoEvoFlow\frontend
set PYTHONIOENCODING=utf-8
node scripts\scrape-latest.js >> scripts\scrape.log 2>&1
