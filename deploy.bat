@echo off
setlocal EnableExtensions

cd /d "%~dp0"

for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "START_BRANCH=%%b"

echo.
echo === Pre-deploy build checks ===
echo.

call npm run build
if errorlevel 1 (
    echo.
    echo [FAILED] npm run build
    exit /b 1
)

call npm run admin:build
if errorlevel 1 (
    echo.
    echo [FAILED] npm run admin:build
    exit /b 1
)

echo.
echo === Builds passed ===
echo.

if /i not "%START_BRANCH%"=="main" (
    echo [ERROR] Deploy must be run from the main branch. Current branch: %START_BRANCH%
    exit /b 1
)

git diff --quiet
if errorlevel 1 (
    echo [ERROR] Uncommitted changes detected. Commit or stash before deploying.
    exit /b 1
)

git diff --cached --quiet
if errorlevel 1 (
    echo [ERROR] Staged but uncommitted changes detected. Commit before deploying.
    exit /b 1
)

echo === Deploying main to prod and admin on Netlify ===
echo.

git checkout prod
if errorlevel 1 goto :deploy_failed

git merge --ff-only main
if errorlevel 1 goto :deploy_failed

git push
if errorlevel 1 goto :deploy_failed

git checkout admin
if errorlevel 1 goto :deploy_failed

git merge --ff-only main
if errorlevel 1 goto :deploy_failed

git push
if errorlevel 1 goto :deploy_failed

git checkout main
if errorlevel 1 goto :deploy_failed

echo.
echo === Deploy complete ===
exit /b 0

:deploy_failed
echo.
echo [FAILED] Git deploy step failed. Returning to %START_BRANCH%...
git checkout %START_BRANCH% 2>nul
exit /b 1
