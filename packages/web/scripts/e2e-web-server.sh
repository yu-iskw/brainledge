#!/usr/bin/env bash
# Starts the compiled Brainledge CLI HTTP server for Playwright e2e.
# Prerequisite: pnpm build (packages/cli/dist/main.js and packages/web/dist).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CLI="${ROOT}/cli/dist/main.js"

if [[ ! -f ${CLI} ]]; then
	echo "error: missing ${CLI} — run 'pnpm build' from the repo root first" >&2
	exit 1
fi

DATA="$(mktemp -d "${TMPDIR:-/tmp}/brainledge-e2e.XXXXXX")"
export BRAINLEDGE_DATA_DIR="${DATA}"
export BRAINLEDGE_HOST="${BRAINLEDGE_HOST:-127.0.0.1}"
export BRAINLEDGE_PORT="${BRAINLEDGE_PORT:-8798}"

node "${CLI}" init --data-dir "${DATA}"
exec node "${CLI}" serve --data-dir "${DATA}"
