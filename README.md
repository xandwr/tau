# Tau

Tau is Xander's personal fork of the Pi agent harness. It is maintained as a focused coding tool, not as a public multi-maintainer project.

The primary runtime is `packages/coding-agent`, supported by the agent, AI, TUI, telemetry, and application-composition packages in this repository.

## Development

```bash
npm install --ignore-scripts
npm run check
./test.sh
./pi-test.sh
```

`npm run check` formats, lints, and type-checks the workspace. `./test.sh` runs non-e2e tests. `./pi-test.sh` runs Tau from source.

## Runtime permissions

Tau runs with the permissions of the user who starts it. Its built-in tools and extensions can read files, write files, and execute processes. Use an operating-system sandbox, container, or virtual machine when working with untrusted code.

## Upstream

Tau is derived from [Pi](https://github.com/earendil-works/pi). Upstream changes are selected based on Tau's needs rather than preserving a general-purpose public project surface.

## License

MIT
