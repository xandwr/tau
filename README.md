# Tau

Tau is Xander's personal fork of the Pi agent harness. It is maintained as a focused coding tool, not as a public multi-maintainer project.

The primary runtime is `packages/coding-agent`, supported by the agent, AI, TUI, telemetry, and application-composition packages in this repository.

## Development

```bash
npm install --ignore-scripts
npm run format
npm run check
./test.sh
./tau-test.sh
```

On Windows, use `./test.ps1` and `./tau-test.ps1` from PowerShell.

`npm run format` formats the workspace. `npm run check` validates formatting, lint rules, types, dependency boundaries, and browser entry points. `./test.sh` runs non-e2e tests. `./tau-test.sh` runs Tau from source.

For a tighter loop, use `npm run lint`, `npm run typecheck`, or `npm run dev -- <arguments>` directly.

## Runtime permissions

Tau runs with the permissions of the user who starts it. Its built-in tools and extensions can read files, write files, and execute processes. Use an operating-system sandbox, container, or virtual machine when working with untrusted code.

## Upstream

Tau is derived from [Pi](https://github.com/earendil-works/pi). Upstream changes are selected based on Tau's needs rather than preserving a general-purpose public project surface.

## License

MIT
