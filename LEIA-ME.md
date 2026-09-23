# 🚚 Entregador – Guia de Compilação e Instalação do APK

## Estrutura do Projeto

```
Entregador/
├── index.html            ← Dashboard Web (interface principal)
├── app.js                ← Lógica do dashboard
├── db.js                 ← Banco de dados local (localStorage)
├── charts.js             ← Gráficos Chart.js
├── styles.css            ← Design system dark mobile-first
├── COMPILAR_APK.bat      ← Script automático de build (execute este!)
└── android/              ← Projeto nativo Android (Kotlin)
    ├── AndroidManifest.xml
    ├── settings.gradle
    ├── build.gradle.root
    ├── app/
    │   ├── build.gradle
    │   └── assets/        ← Cópia automática dos arquivos web
    ├── res/
    │   ├── layout/floating_widget_layout.xml
    │   ├── values/strings.xml
    │   ├── values/colors.xml
    │   ├── values/themes.xml
    │   └── xml/accessibility_service_config.xml
    └── src/main/java/com/entregador/app/
        ├── MainActivity.kt
        ├── EntregadorAccessibilityService.kt
        ├── FloatingWidgetService.kt
        ├── GpsTrackerService.kt
        └── DataRepository.kt
```

---

## ✅ Pré-requisitos (Instalar uma vez)

### 1. Java Development Kit (JDK 17)
Baixe e instale: https://adoptium.net/temurin/releases/?version=17  
Escolha: **Windows → x64 → JDK → .msi**

### 2. Android Studio (recomendado)
Baixe em: https://developer.android.com/studio  
Durante a instalação, ele instala automaticamente o **Android SDK** e as **Build Tools**.

Após instalar o Android Studio, abra-o uma vez e ele configurará o SDK em:  
`C:\Users\[seu_usuario]\AppData\Local\Android\Sdk`

---

## 🔨 Compilando o APK

### Opção A – Script automático (mais fácil)
1. Certifique-se que Java e Android Studio estão instalados
2. **Clique duplo** no arquivo [`COMPILAR_APK.bat`](COMPILAR_APK.bat)
3. O script compila e salva o arquivo `Entregador-v1.apk` na pasta do projeto

### Opção B – Android Studio (completo)
1. Abra o Android Studio
2. **File → Open** → selecione a pasta `android/`
3. Aguarde a sincronização do Gradle (pode levar alguns minutos)
4. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
5. O APK estará em `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📱 Instalando no Celular

### Via USB (ADB)
1. No celular: **Configurações → Sobre o telefone → toque 7x em "Número da versão"**
2. Vá em **Opções do desenvolvedor → Ativar a depuração USB**
3. Conecte o celular via USB e execute no PC:
```
adb install Entregador-v1.apk
```

### Via arquivo direto
1. Copie o arquivo `Entregador-v1.apk` para o celular (WhatsApp, Cabo USB, Google Drive)
2. No celular, vá em: **Configurações → Segurança → Fontes desconhecidas** (ative)
3. Abra o arquivo APK pelo gerenciador de arquivos e instale

---

## ⚙️ Permissões necessárias no celular (após instalar)

Ao abrir o app pela primeira vez, ele solicitará:

| Permissão | Onde ativar | Para que serve |
|---|---|---|
| **Desenhar sobre outros apps** | Configurações → Aplicativos → Entregador → Permissões | Exibir o widget flutuante sobre o iFood/Uber |
| **Serviço de Acessibilidade** | Configurações → Acessibilidade → Serviços instalados → Entregador | Detectar automaticamente o início e fim de corridas |
| **Localização (GPS)** | Pop-up automático ao abrir o app | Medir quilometragem exata durante a corrida |

---

## 🔄 Como funciona automaticamente

```
Você abre o iFood/Uber/99/Lalamove
    ↓
Serviço de Acessibilidade detecta "corrida aceita"
    ↓
Widget flutuante aparece com status: 🟢 EM CORRIDA
    ↓
GPS inicia contagem de km (apenas durante a corrida)
    ↓
Você entrega o pedido
    ↓
Serviço detecta "pedido entregue"
    ↓
GPS para → km + valor ganho salvos automaticamente
    ↓
Widget atualiza: ✅ CORRIDA FINALIZADA — Hoje: R$ X,XX | X km
```

---

## 📊 Dados Diários e Semanais

Todos os dados são salvos localmente no celular e sincronizados com o Dashboard Web:
- **Corridas do dia**: km por app, ganhos, consumo estimado
- **Semana atual**: totais, R$/km médio, dias ativos
- **Combustível**: histórico de abastecimentos, km/L real
- **Manutenção**: odômetro total, alertas de óleo e revisão
