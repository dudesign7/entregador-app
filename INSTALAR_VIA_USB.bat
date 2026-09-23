@echo off
setlocal
title Entregador - Instalar via ADB
color 0A

set ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe
set APK=%~dp0Entregador-v1.apk

echo.
echo  ============================================
echo    INSTALADOR VIA ADB - ENTREGADOR APK
echo  ============================================
echo.
echo  Antes de continuar:
echo  1. Conecte o celular via cabo USB ao PC
echo  2. No celular: Configuracoes ^> Sobre o telefone
echo     Toque 7x em "Numero da versao" para ativar
echo     as Opcoes do desenvolvedor
echo  3. Va em: Opcoes do desenvolvedor
echo     Ative "Depuracao USB"
echo  4. No celular aparecera um popup - toque OK
echo     para confiar neste computador
echo.
pause

echo.
echo  Verificando conexao com o celular...
"%ADB%" devices
echo.

echo  Instalando APK (bypassa o Play Protect)...
"%ADB%" install -r "%APK%"

if %errorlevel% EQU 0 (
    echo.
    echo  ============================================
    echo   APP INSTALADO COM SUCESSO!
    echo  ============================================
    echo.
    echo  Agora no celular:
    echo  1. Procure o app "Entregador" na gaveta de apps
    echo  2. Abra e configure as permissoes:
    echo     - Desenhar sobre outros apps
    echo     - Acessibilidade
    echo     - Localizacao/GPS
) else (
    echo.
    echo  Erro na instalacao. Verifique:
    echo  - Cabo USB conectado
    echo  - Depuracao USB ativa no celular
    echo  - Popup de confianca aceito no celular
)

echo.
pause
