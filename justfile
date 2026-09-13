set windows-shell := ["pwsh", "-NoLogo", "-NoProfile", "-Command"]

build:
    npm run build:offline; exit $LASTEXITCODE

build-native:
    $env:PI_TUI_WIN32_ARCH = 'x64'; npm run build:native:win32; exit $LASTEXITCODE

build-all: build-native build

refresh-models:
    npm run generate:models; exit $LASTEXITCODE

benchmark-build:
    @node scripts/benchmark-build.mjs

benchmark-build-all:
    @node scripts/benchmark-build.mjs --include-native

benchmark-build-refresh:
    @node scripts/benchmark-build.mjs --refresh-models
