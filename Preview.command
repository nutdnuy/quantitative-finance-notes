#!/bin/zsh
cd "${0:A:h}"
if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  print 'Please install Node.js, then open this file again.'
  read '?Press Enter to close.'
  exit 1
fi
if [[ ! -d node_modules/yaml ]]; then
  npm install --ignore-scripts --no-audit --no-fund || exit 1
fi
OPEN_BROWSER=1 npm run dev
read '?Press Enter to close.'
