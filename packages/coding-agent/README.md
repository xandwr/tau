# Tau coding agent

This package contains Tau's interactive terminal agent, print mode, JSON mode, RPC mode, session management, tools, extensions, and customization loading.

## Run from source

From the repository root:

```bash
./tau-test.sh
```

On Windows:

```powershell
.\tau-test.ps1
```

## Development

```bash
npm run check
./test.sh
```

See [development.md](docs/development.md) for package structure and focused test commands.

## Operational references

- [Settings](docs/settings.md)
- [Model configuration](docs/models.md)
- [Provider configuration](docs/providers.md)
- [Session format](docs/session-format.md)

## Permissions

Tau and its extensions run with the permissions of the current user. Use an operating-system sandbox, container, or virtual machine for untrusted work.

## License

MIT
