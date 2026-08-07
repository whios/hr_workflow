#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "Installing dependencies..."
# Retry pnpm install to handle transient registry failures (502/503)
for i in 1 2 3; do
  if pnpm install --prefer-frozen-lockfile --prefer-offline --loglevel debug --reporter=append-only; then
    break
  fi
  if [ "$i" -eq 3 ]; then
    echo "pnpm install failed after 3 attempts"
    exit 1
  fi
  echo "pnpm install attempt $i failed, retrying in 5s..."
  sleep 5
done

echo "Building the Next.js project..."
pnpm next build

echo "Bundling server with tsup..."
pnpm tsup src/server.ts --format cjs --platform node --target node20 --outDir dist --no-splitting --no-minify

echo "Build completed successfully!"
