$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
if (!(Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js não encontrado. Instale uma versão compatível com Capacitor 8." }
if (!(Get-Command npm -ErrorAction SilentlyContinue)) { throw "npm não encontrado." }
if (Test-Path package-lock.json) { npm ci } else { npm install }
if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar dependências." }
npm test
if ($LASTEXITCODE -ne 0) { throw "Testes falharam." }
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build web falhou." }
if (!(Test-Path android)) { npx cap add android }
if ($LASTEXITCODE -ne 0) { throw "Falha ao criar Android." }
npx cap sync android
if ($LASTEXITCODE -ne 0) { throw "Falha ao sincronizar Android." }
Push-Location android
try { .\gradlew.bat assembleDebug; if ($LASTEXITCODE -ne 0) { throw "Build APK falhou." } } finally { Pop-Location }
New-Item -Type Directory -Force saida | Out-Null
Copy-Item android/app/build/outputs/apk/debug/app-debug.apk saida/EMAVE_GESTAO-debug.apk -Force
Write-Host "Pronto: $(Resolve-Path saida/EMAVE_GESTAO-debug.apk)"
Write-Host "APK de testes. Para distribuir, assine uma compilação release no Android Studio."
