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

if [ ! -f "node_modules/.bin/lighthouse" ]; then
    echo "========================================================"
    echo "  Первый запуск: подготовка локального движка Lighthouse..."
    echo "========================================================"
    npm install --no-audit --no-fund
    echo ""
fi

node --no-deprecation bin/psi-audit.mjs "$@"
