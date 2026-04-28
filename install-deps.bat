@echo off
REM Atalho pra rodar npm install no diretorio certo.
REM Da duplo clique neste arquivo apos atualizar package.json.

cd /d "%~dp0"
echo ===================================================
echo  Truth or Cap - Installing dependencies
echo  Pasta: %CD%
echo ===================================================
echo.
npm install
echo.
echo ===================================================
echo  Pronto. Pressione qualquer tecla pra fechar.
echo ===================================================
pause >nul
