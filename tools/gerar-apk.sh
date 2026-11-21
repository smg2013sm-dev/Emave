#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v node >/dev/null || { echo 'Instale Node.js atualizado.'; exit 1; }
command -v npm >/dev/null || { echo 'Instale npm.'; exit 1; }
command -v java >/dev/null || { echo 'Instale JDK conforme a versão do Android Studio/Capacitor.'; exit 1; }
if [ ! -f package-lock.json ]; then
  echo 'Instalando dependências (primeira execução)...'
  npm install
else
  npm ci
fi
npm test
npm run build
if [ ! -d android ]; then
  echo 'Criando projeto Android com Capacitor...'
  npx cap add android
fi
npx cap sync android
if [ -n "${ANDROID_HOME:-}" ]; then echo "Android SDK: $ANDROID_HOME"; fi
if [ ! -f android/gradlew ]; then echo 'Gradle wrapper não foi gerado.' >&2; exit 1; fi
(
  cd android
  if [ "$(uname -s)" = "Darwin" ] || [ "$(uname -s)" = "Linux" ]; then
    chmod +x gradlew
    ./gradlew assembleDebug
  else
    echo 'No Windows execute no Android Studio: Build > Build APK(s).' >&2
    exit 1
  fi
)
APK='android/app/build/outputs/apk/debug/app-debug.apk'
mkdir -p saida
cp "$APK" saida/EMAVE_GESTAO-debug.apk
echo "APK gerado: $(pwd)/saida/EMAVE_GESTAO-debug.apk"
echo 'ATENÇÃO: assinatura DEBUG. Para instalar fora de testes, gere versão release assinada com chave própria.'
