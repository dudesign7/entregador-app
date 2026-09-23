@echo off
setlocal enabledelayedexpansion
title Entregador - Compilador de APK
color 0A

echo.
echo  ========================================
echo    ENTREGADOR - GERADOR DE APK ANDROID
echo  ========================================
echo.

:: ─── 1. Verifica se Java está instalado ─────────────────
where java >nul 2>&1
if %errorlevel% NEQ 0 (
    echo  [!] Java nao encontrado. Baixando JDK 17 via winget...
    winget install --id Microsoft.OpenJDK.17 --silent --accept-source-agreements --accept-package-agreements
    if %errorlevel% NEQ 0 (
        echo  [ERRO] Falha ao instalar Java automaticamente.
        echo  Acesse: https://adoptium.net/temurin/releases/?version=17
        echo  Baixe o instalador .msi e execute-o, depois rode este script novamente.
        pause
        exit /b 1
    )
    :: Atualiza PATH para a sessão atual
    for /f "tokens=*" %%i in ('where java 2^>nul') do set JAVA_PATH=%%i
    echo  [OK] Java instalado com sucesso.
) else (
    for /f "tokens=*" %%i in ('java -version 2^>^&1 ^| findstr version') do echo  [OK] Java detectado: %%i
)

echo.

:: ─── 2. Verifica se Android SDK está presente ────────────
set ANDROID_SDK=%LOCALAPPDATA%\Android\Sdk
if not exist "%ANDROID_SDK%" (
    echo  [!] Android SDK nao encontrado em %ANDROID_SDK%
    echo.
    echo  Opcoes para instalar o Android SDK:
    echo    1. Instale o Android Studio (recomendado):
    echo       https://developer.android.com/studio
    echo.
    echo    2. Ou instale apenas o Command Line Tools:
    echo       https://developer.android.com/studio#command-tools
    echo.
    echo  Apos instalar, execute este script novamente.
    echo.
    pause
    exit /b 1
) else (
    echo  [OK] Android SDK encontrado em: %ANDROID_SDK%
)

echo.

:: ─── 3. Define paths do SDK ───────────────────────────────
set BUILD_TOOLS_DIR=
for /d %%d in ("%ANDROID_SDK%\build-tools\*") do set BUILD_TOOLS_DIR=%%d
if "%BUILD_TOOLS_DIR%"=="" (
    echo  [ERRO] Build Tools nao encontrado. Instale pelo Android Studio:
    echo  SDK Manager > SDK Tools > Android SDK Build-Tools
    pause
    exit /b 1
)
echo  [OK] Build Tools: %BUILD_TOOLS_DIR%

set AAPT2=%BUILD_TOOLS_DIR%\aapt2.exe
set D8=%BUILD_TOOLS_DIR%\d8.bat
set ZIPALIGN=%BUILD_TOOLS_DIR%\zipalign.exe
set APKSIGNER=%BUILD_TOOLS_DIR%\apksigner.bat
set ANDROID_JAR=%ANDROID_SDK%\platforms\android-34\android.jar

if not exist "%ANDROID_JAR%" (
    echo  [ERRO] Android Platform 34 nao encontrado.
    echo  Instale pelo Android Studio: SDK Manager > SDK Platforms > Android 14 (API 34)
    pause
    exit /b 1
)

echo.
echo  Compilando projeto com Gradle...
echo  (Isso pode levar alguns minutos na primeira execucao)
echo.

:: ─── 4. Navega para o diretorio android e executa Gradle ──
cd /d "%~dp0android"

:: Verifica se o gradlew existe
if not exist "gradlew.bat" (
    echo  [!] Gradle Wrapper nao encontrado. Gerando...
    call gradle wrapper --gradle-version 8.4 >nul 2>&1
    if %errorlevel% NEQ 0 (
        echo  [ERRO] Falha ao gerar Gradle Wrapper.
        echo  Instale o Gradle manualmente: https://gradle.org/install/
        pause
        exit /b 1
    )
)

:: ─── 5. Compila o APK Debug ───────────────────────────────
call gradlew.bat assembleDebug --no-daemon 2>&1
if %errorlevel% NEQ 0 (
    echo.
    echo  [ERRO] Falha na compilacao. Verifique as mensagens acima.
    pause
    exit /b 1
)

:: ─── 6. Copia o APK para a pasta principal ────────────────
set APK_SOURCE=app\build\outputs\apk\debug\app-debug.apk
set APK_DEST=%~dp0Entregador-v1.apk

if exist "%APK_SOURCE%" (
    copy /y "%APK_SOURCE%" "%APK_DEST%"
    echo.
    echo  ========================================
    echo   APK GERADO COM SUCESSO!
    echo  ========================================
    echo.
    echo  Arquivo: %APK_DEST%
    echo.
    echo  COMO INSTALAR NO CELULAR:
    echo  1. Conecte o celular via USB ao PC
    echo  2. Ative o "Modo Desenvolvedor" no celular:
    echo     Configuracoes > Sobre o telefone >
    echo     toque 7x em "Numero da versao"
    echo  3. Ative a "Depuracao USB" nas opcoes de desenvolvedor
    echo  4. Execute: adb install "%APK_DEST%"
    echo.
    echo  OU copie o arquivo APK para o celular e abra-o
    echo  (ative "Fontes desconhecidas" nas configuracoes)
    echo.
    start explorer "%~dp0"
) else (
    echo  [ERRO] APK nao encontrado no caminho esperado.
    echo  Verifique: %APK_SOURCE%
)

pause
