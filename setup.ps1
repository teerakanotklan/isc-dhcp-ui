# ==============================================================================
# ISC DHCP UI - Windows Local Development & Setup Wizard
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

function Write-Banner {
    Clear-Host
    Write-Host @"
  ___ ____   ____   ____  _   _ ____       _   _ ___ 
 |_ _/ ___| / ___| |  _ \| | | |  _ \     | | | |_ _|
  | |\___ \| |     | | | | |_| | |_) |____| | | || | 
  | | ___) | |___  | |_| |  _  |  __/_____| |_| || | 
 |___|____/ \____| |____/|_| |_|_|         \___/|___|

 ISC DHCP UI - Windows Development Helper
================================================================
"@ -ForegroundColor Cyan
}

function Check-Prerequisites {
    Write-Host "`n>>> Checking Prerequisites..." -ForegroundColor Magenta

    # Check Go
    if (-not (Get-Command go -ErrorAction SilentlyContinue)) {
        Write-Host " [X] Go is not installed or not found in PATH." -ForegroundColor Red
        Write-Host "     Please install Go 1.22+ from https://go.dev/dl/" -ForegroundColor Yellow
        exit 1
    }
    $goVer = go version
    Write-Host " [V] Go found: $goVer" -ForegroundColor Green

    # Check GCC for CGO (sqlite3)
    if (-not (Get-Command gcc -ErrorAction SilentlyContinue)) {
        Write-Host " [!] GCC not found in PATH." -ForegroundColor Yellow
        Write-Host "     (Note: Controller requires CGO for SQLite. If building fails, install MinGW-w64 or TDM-GCC)" -ForegroundColor DarkGray
    } else {
        $gccVer = gcc --version | Select-Object -First 1
        Write-Host " [V] GCC found: $gccVer" -ForegroundColor Green
    }
}

function Build-Binaries {
    Write-Host "`n>>> Building Binaries..." -ForegroundColor Magenta
    if (-not (Test-Path "bin")) {
        New-Item -ItemType Directory -Path "bin" | Out-Null
    }

    Write-Host " [*] Compiling Controller..." -ForegroundColor Cyan
    $env:CGO_ENABLED = "1"
    try {
        go build -trimpath -ldflags="-s -w" -o bin/controller.exe ./cmd/controller
        Write-Host " [V] Controller built: bin/controller.exe" -ForegroundColor Green
    } catch {
        Write-Host " [X] Failed to build Controller with CGO_ENABLED=1." -ForegroundColor Red
        Write-Host "     Ensure a C compiler (gcc) like MinGW is installed for go-sqlite3." -ForegroundColor Yellow
    }

    Write-Host " [*] Compiling Agent..." -ForegroundColor Cyan
    try {
        go build -trimpath -ldflags="-s -w" -o bin/agent.exe ./cmd/agent
        Write-Host " [V] Agent built: bin/agent.exe" -ForegroundColor Green
    } catch {
        Write-Host " [X] Failed to build Agent." -ForegroundColor Red
    }
}

function Run-Controller {
    if (-not (Test-Path "bin/controller.exe")) {
        Build-Binaries
    }
    if (-not (Test-Path "data")) {
        New-Item -ItemType Directory -Path "data" | Out-Null
    }
    Write-Host "`n>>> Starting Web Controller on http://localhost:8080 ..." -ForegroundColor Green
    Write-Host "    Press Ctrl+C to stop." -ForegroundColor DarkGray
    & ".\bin\controller.exe" -port 8080 -db ./data/dhcp.db -leases ./data/dhcpd.leases -config ./data/dhcpd.conf
}

function Run-Agent {
    if (-not (Test-Path "bin/agent.exe")) {
        Build-Binaries
    }
    Write-Host "`n>>> Starting DHCP Agent on port 9443 ..." -ForegroundColor Green
    Write-Host "    Press Ctrl+C to stop." -ForegroundColor DarkGray
    & ".\bin\agent.exe" -port 9443 -token "dhcp-secret-token-2026"
}

Write-Banner
Check-Prerequisites

Write-Host @"

Select an action:
  1) Build All Binaries (bin/controller.exe & bin/agent.exe)
  2) Run Controller locally (Web UI at http://localhost:8080)
  3) Run Agent locally (Port 9443)
  4) Run Tests (go test ./...)
  5) Clean Binaries (Remove bin/)
  0) Exit
"@

$choice = Read-Host "Enter option (0-5) [Default: 1]"
if ([string]::IsNullOrWhiteSpace($choice)) { $choice = "1" }

switch ($choice) {
    "1" { Build-Binaries }
    "2" { Run-Controller }
    "3" { Run-Agent }
    "4" { go test -v ./... }
    "5" { 
        if (Test-Path "bin") { Remove-Item -Recurse -Force "bin" }
        Write-Host "Cleaned bin/ directory." -ForegroundColor Green
    }
    "0" { Write-Host "Exited." }
    default { Write-Host "Invalid option." -ForegroundColor Red }
}
