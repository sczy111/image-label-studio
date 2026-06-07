$ErrorActionPreference = "Stop"

$server = Join-Path $PSScriptRoot "server.py"
$bundledPython = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

if (Get-Command python -ErrorAction SilentlyContinue) {
    & python $server
    exit $LASTEXITCODE
}

if (Get-Command py -ErrorAction SilentlyContinue) {
    & py -3 $server
    exit $LASTEXITCODE
}

if (Test-Path -LiteralPath $bundledPython) {
    & $bundledPython $server
    exit $LASTEXITCODE
}

throw "Python 3 was not found. Install Python 3 or run server.py with your Python executable."
