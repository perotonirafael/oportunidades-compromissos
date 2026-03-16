#!/usr/bin/env bash
set -euo pipefail

UPSTREAM_URL="${1:-https://github.com/perotonirafael/paineldoperotoni.git}"
UPSTREAM_REF="${2:-main}"

echo "[sync-upstream] Repositório de referência: ${UPSTREAM_URL}"
echo "[sync-upstream] Branch/Ref: ${UPSTREAM_REF}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[sync-upstream] Erro: execute este script dentro de um repositório git." >&2
  exit 1
fi

if git remote get-url upstream >/dev/null 2>&1; then
  current_url="$(git remote get-url upstream)"
  if [[ "${current_url}" != "${UPSTREAM_URL}" ]]; then
    echo "[sync-upstream] Atualizando remote 'upstream' de ${current_url} para ${UPSTREAM_URL}"
    git remote set-url upstream "${UPSTREAM_URL}"
  fi
else
  echo "[sync-upstream] Adicionando remote 'upstream'"
  git remote add upstream "${UPSTREAM_URL}"
fi

echo "[sync-upstream] Buscando ${UPSTREAM_REF} do upstream..."
git fetch upstream "${UPSTREAM_REF}" --prune

echo "[sync-upstream] Status resumido contra upstream/${UPSTREAM_REF}:"
git rev-list --left-right --count "HEAD...upstream/${UPSTREAM_REF}"

echo "[sync-upstream] Commits que existem no upstream e ainda não estão locais:"
git log --oneline "HEAD..upstream/${UPSTREAM_REF}" | head -n 20 || true

echo
echo "[sync-upstream] Para aplicar atualização de forma controlada, escolha uma estratégia:"
echo "  1) Merge:      git merge upstream/${UPSTREAM_REF}"
echo "  2) Rebase:     git rebase upstream/${UPSTREAM_REF}"
echo "  3) Cherry-pick commits específicos"
