# isc-dhcp-ui

A modern Web UI and Agent for managing ISC DHCP Server in standalone or High-Availability / Failover clusters.

**Stack:** React 18 + Vite + TypeScript + Tailwind CSS (frontend) · Go + SQLite (backend)

---

## Features

- **Dashboard & Monitoring** — DHCP status, active leases, statistics, and failover peer states
- **Subnet & Pool Management** — Manage subnets, IP ranges, gateway, and DNS options
- **Static Leases (Reservations)** — Reserve fixed IPs for specific MAC addresses
- **Clustering** — Configure primary / secondary failover nodes
- **Configuration Generator** — Auto-generate valid `dhcpd.conf` with one-click deploy
- **Multi-page SPA** — `/dashboard`, `/subnets`, `/static`, `/leases`, `/clustering`, `/deploy`, `/settings`
- **Light / Dark mode** — Instant theme toggle with no transition flicker
- **Responsive UI** — Collapsible sidebar, mobile drawer navigation

---

## Architecture

```
Browser ──HTTPS──▶ Go Controller (port 8080)
                        │
                        ├── Serves embedded React SPA (web/dist/)
                        ├── REST API  /api/...
                        └── HTTP ──▶ Go Agent (port 9443) on secondary node
                                         └── Writes dhcpd.conf, restarts dhcpd
```

The controller binary **embeds** the React production build via `//go:embed all:dist`, so **no Node.js is needed in production** — a single binary serves everything.

---

## Quick Start (Interactive Setup Wizard)

Deploy on Linux (Ubuntu / Debian / Raspberry Pi OS):

```bash
git clone https://github.com/teerakanotklan/isc-dhcp-ui.git
cd isc-dhcp-ui
chmod +x setup.sh
sudo ./setup.sh
```

The wizard will:
1. Check and install dependencies (`isc-dhcp-server`, `golang`, `sqlite3`, `build-essential`)
2. Let you choose a role: Full Setup, Agent Only, Controller Only, or Development Mode
3. Configure ports, credentials, cluster IPs, and default subnet
4. Compile binaries, initialize the SQLite DB, create and start systemd services

---

## Developer Guide

### Prerequisites

| Tool | Version |
|------|---------|
| Go   | 1.21+   |
| Node.js | 18+ (LTS) |
| npm  | 9+      |

### Build (Linux / macOS)

```bash
# Build React frontend → web/dist/, then compile both Go binaries
make build

# Or step-by-step:
make build-frontend     # npm run build inside frontend/
make build-controller   # go build (embeds web/dist/)
make build-agent        # go build

# Start Vite dev server with hot-reload (proxy to Go backend)
make dev

# Run unit tests
make test

# Run controller locally (http://localhost:8080)
make run-controller

# Remove binaries and web/dist/
make clean
```

### Windows (PowerShell)

```powershell
# Interactive dev helper
.\setup.ps1

# Or manually:
cd frontend; npm install; npm run build; cd ..
go build -o bin\controller.exe .\cmd\controller
go build -o bin\agent.exe .\cmd\agent
```

---

## Service Management

```bash
# Status
sudo ./setup.sh --status
journalctl -u dhcp-ui-controller -f
journalctl -u dhcp-ui-agent -f

# Restart
sudo systemctl restart dhcp-ui-controller
sudo systemctl restart dhcp-ui-agent

# Uninstall
sudo ./setup.sh --uninstall
```

---

## Project Structure

```
isc-dhcp-ui/
├── cmd/
│   ├── controller/         # Web UI backend & REST API server
│   └── agent/              # Lightweight agent (writes dhcpd.conf, restarts dhcpd)
├── internal/
│   ├── database/           # SQLite schema & queries
│   ├── generator/          # dhcpd.conf configuration generator
│   ├── models/             # Go data structs (Subnet, Node, Lease, …)
│   ├── parser/             # dhcpd.leases parser & failover state reader
│   ├── service/            # systemctl wrapper & syntax checker
│   └── syncer/             # HTTP client: Controller → Agent communication
├── frontend/               # React + Vite + TypeScript source
│   └── src/
│       ├── api/            # Typed fetch client (401 auto-redirect)
│       ├── components/     # Layout (Sidebar, TopNav, …) & UI (Modal, Toast, …)
│       ├── context/        # ThemeContext, AuthContext
│       ├── hooks/          # Reusable custom React hooks
│       ├── pages/          # Route-level page components
│       └── types/          # TypeScript interfaces matching Go models
├── web/
│   ├── dist/               # React production build (git-ignored, embedded in binary)
│   └── embed.go            # //go:embed all:dist
├── systemd/                # Systemd unit templates
├── Makefile                # Build automation
├── setup.sh                # Interactive Bash setup wizard
└── setup.ps1               # Windows development helper
```

---

## Default Credentials

| Field    | Value   |
|----------|---------|
| Username | `admin` |
| Password | `admin` |

> Change these immediately via **Settings → Change Password** after first login.
