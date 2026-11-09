#!/usr/bin/env bash
cd "$(dirname "$0")" || exit

if ! command -v node >/dev/null 2>&1; then
    echo ""
    echo "========================================================"
    echo "  [ОШИБКА] Node.js не найден в системе!"
    echo "========================================================"
    echo "Для работы утилиты требуется Node.js версии 18+."
    echo "Установите Node.js:"
    echo "  - macOS: brew install node"
    echo "  - Ubuntu/Debian: sudo apt update && sudo apt install nodejs npm"
    echo "  - Или скачайте с официального сайта: https://nodejs.org/"
    echo "========================================================"
    echo ""
    exit 1
fi

node --no-deprecation bin/psi-audit.mjs "$@"
