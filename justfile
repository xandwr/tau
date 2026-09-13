set windows-shell := ["pwsh", "-NoLogo", "-NoProfile", "-Command"]

build:
    $env:PI_TUI_WIN32_ARCH = 'x64'; npm run build:native:win32; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    npm run build; exit $LASTEXITCODE

benchmark-build:
    @node scripts/benchmark-build.mjs
