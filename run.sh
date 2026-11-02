#!/usr/bin/env bash
cd "$(dirname "$0")" || exit
node bin/psi-audit.mjs "$@"
