$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$gitExecutable = (Get-Command git -ErrorAction Stop).Source
$gitInstallRoot = Split-Path (Split-Path $gitExecutable -Parent) -Parent
$bashCandidates = @(
	Join-Path $gitInstallRoot "bin/bash.exe"
	Join-Path $gitInstallRoot "usr/bin/bash.exe"
)
$bashPath = $bashCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if (-not $bashPath) {
	throw "Git Bash was not found. Install Git for Windows or run test.sh from a Bash shell."
}

Push-Location $scriptDir
try {
	& $bashPath ./test.sh @args
	$exitCode = $LASTEXITCODE
} finally {
	Pop-Location
}

if ($exitCode -ne 0) {
	exit $exitCode
}
