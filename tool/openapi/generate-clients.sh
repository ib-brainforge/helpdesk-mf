#!/usr/bin/env bash
# Regenerates the vendored helpdesk TypeScript client under src/api/helpdesk-client from the
# helpdesk-backend committed openapi/swagger.json. Generated files are never edited by hand.
#
# Usage: tool/openapi/generate-clients.sh
# Env:   OPENAPI_GENERATOR_JAR  openapi-generator-cli 7.16.0 jar
#                               (default ~/.cache/openapi-generator/openapi-generator-cli-7.16.0.jar)
#        BACKENDS_ROOT          directory holding the backend clones (default ~/Projects/bf-github/ib)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
JAR="${OPENAPI_GENERATOR_JAR:-$HOME/.cache/openapi-generator/openapi-generator-cli-7.16.0.jar}"
BACKENDS_ROOT="${BACKENDS_ROOT:-$HOME/Projects/bf-github/ib}"
spec="$BACKENDS_ROOT/helpdesk-backend/openapi/swagger.json"

[ -f "$JAR" ] || { echo "missing $JAR (openapi-generator-cli 7.16.0)" >&2; exit 1; }
[ -f "$spec" ] || { echo "missing $spec" >&2; exit 1; }

work="$(mktemp -d)"
java -jar "$JAR" generate -i "$spec" -g typescript-axios -o "$work" \
  --additional-properties="withSeparateModelsAndApi=true,apiPackage=api,modelPackage=models,withInterfaces=true,supportsES6=true,npmName=@brainforgeau/helpdesk-client,npmVersion=v1" >/dev/null

target="$ROOT/src/api/helpdesk-client"
rm -rf "$target"
mkdir -p "$target"
(cd "$work" && cp -R api models api.ts base.ts common.ts configuration.ts index.ts README.md .gitignore "$target"/)
rm -rf "$work"
echo "generated $target from $spec"
