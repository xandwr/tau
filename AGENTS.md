# Tau Development Rules

Read and follow `C:/Users/xander/Agents/SYSTEM.md` before starting work.

## Code quality

- Inspect the relevant implementation and Git state before editing.
- Read files in full before broad changes.
- Do not use `any` unless unavoidable.
- Use top-level imports only. Do not use dynamic or inline imports.
- Use erasable TypeScript syntax in code covered by the root TypeScript configuration.
- Check installed dependency types instead of guessing external APIs.
- Inline one-line helpers that have only one call site.
- Ask before removing behavior that appears intentional.
- Do not preserve backward compatibility unless requested.
- Put configurable key bindings in `DEFAULT_EDITOR_KEYBINDINGS` or `DEFAULT_APP_KEYBINDINGS`.
- Generate `packages/ai/src/models.generated.ts` through `packages/ai/scripts/generate-models.ts`; never edit it directly.

## Validation

- After code changes, run `npm run check` and fix every diagnostic.
- Do not run `npm run build` or `npm test` unless requested.
- Run non-e2e tests with `./test.sh`, or run a focused test from its package.
- Run every test file you create or modify.
- Use the faux provider for coding-agent suite tests. Never use paid provider calls.

## Dependencies

- Pin direct external dependencies exactly.
- Install with `npm install --ignore-scripts` or `npm ci --ignore-scripts`.
- Review dependency and lockfile changes as code.
- Read the target release notes before updating `undici`.

## Git

- Preserve unrelated and concurrent work.
- Stage explicit paths only. Never use `git add .`, `git add -A`, `git stash`, `git reset --hard`, or `git checkout .`.
- Commit only when requested.
- Before committing, inspect the status and staged diff.
- Use `{feat,fix,docs,chore}[(ai,tui,agent,coding-agent)]: <summary>` for commit messages.
- Never bypass hooks or force-push.

## Specialized workflows

- For interactive TUI testing, follow `.pi/skills/interactive-testing.md`.
