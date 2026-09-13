set windows-shell := ["pwsh", "-NoLogo", "-NoProfile", "-Command"]

build:
    npm run build; exit $LASTEXITCODE

build-native:
    $env:PI_TUI_WIN32_ARCH = 'x64'; npm run build:native:win32; exit $LASTEXITCODE

build-all: build-native build

benchmark-build:
    @node scripts/benchmark-build.mjs

benchmark-build-all:
    @node scripts/benchmark-build.mjs --include-native
