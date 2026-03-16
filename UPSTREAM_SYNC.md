# Sincronização com `perotonirafael/paineldoperotoni`

Este projeto pode ser atualizado com base no repositório de referência:

- `https://github.com/perotonirafael/paineldoperotoni`

## Fluxo recomendado

1. Rodar o script de preparação/sincronização:

   ```bash
   ./scripts/sync-upstream.sh
   ```

2. Verificar a contagem de divergência exibida pelo comando:

   - esquerda: commits que existem localmente e não estão no upstream.
   - direita: commits que existem no upstream e ainda não foram incorporados aqui.

3. Escolher a estratégia de atualização:

   - `git merge upstream/main` (mais simples, preserva histórico de merge).
   - `git rebase upstream/main` (histórico linear).
   - `git cherry-pick <sha>` (atualização parcial e controlada).

## Observações

- O script **não** faz merge/rebase automaticamente; ele apenas prepara o remote, faz fetch e mostra a divergência.
- Em ambientes com bloqueio de rede para o GitHub, o `fetch` pode falhar com erro de conectividade (por exemplo, `403 Forbidden`).
