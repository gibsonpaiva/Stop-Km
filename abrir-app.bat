@echo off
title StopKm - Servidor Local
cd /d "%~dp0"

echo ========================================================
echo           STOPKM - CONTROLE DE ROTAS (PWA)
echo ========================================================
echo.

set "NODE_CMD=node"
if exist "C:\Program Files\nodejs\node.exe" (
    set "NODE_CMD=C:\Program Files\nodejs\node.exe"
)

echo [INFO] Iniciando servidor local StopKm...
echo.
"%NODE_CMD%" server.js
pause
