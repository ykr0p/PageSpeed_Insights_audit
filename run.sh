#!/usr/bin/env bash
cd "$(dirname "$0")" || exit

if ! command -v node >/dev/null 2>&1; then
    echo ""
    echo "========================================================"
    echo "  [ОШИБКА] Node.js не найден в системе!"
    echo "========================================================"
    echo "Для работы утилиты требуется Node.js версии 18+."
    echo "Установите Node.js с официального сайта: https://nodejs.org/"
    echo "========================================================"
    echo ""
    exit 1
fi

if [ ! -f "node_modules/.bin/lighthouse" ] && [ ! -f ".offline_engine" ]; then
    echo "========================================================"
    echo "  Первый запуск: проверка компонентов..."
    echo "========================================================"
    if ! npm install --no-audit --no-fund --fetch-timeout=3000 --fetch-retries=0 >/dev/null 2>&1; then
        echo "  [OK] npm registry недоступен (прокси / офлайн)."
        echo "  [OK] Используется встроенный Chromium CDP движок (работает без интернета)."
        echo "offline" > ".offline_engine"
    fi
    echo ""
fi

node --no-deprecation bin/psi-audit.mjs "$@"
