@echo off
REM Atalho pra iniciar o servidor Next.js no diretório certo.
REM Da duplo clique neste arquivo pra rodar.

cd /d "%~dp0"
echo ===================================================
echo  Truth or Cap — Dev Server
echo  Pasta: %CD%
echo ===================================================
echo.
npm run dev
pause
