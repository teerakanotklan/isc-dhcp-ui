# isc-dhcp-ui

A modern Web UI and Agent for managing ISC DHCP Server in standalone or High-Availability / Failover clusters.

---

## Features
- **Dashboard & Monitoring**: View DHCP status, active leases, statistics, and failover peer states.
- **Subnet & Pool Management**: Manage subnets, IP ranges, gateway, and DNS options.
- **Static Leases (Reservations)**: Reserve fixed IP addresses for MAC addresses.
- **Configuration Generator**: Automatically generate valid, production-ready `dhcpd.conf` configurations.
- **Agent / Controller Architecture**: Centralized management with an agent to control local/remote ISC DHCP server instances.
- **Automated Setup Wizard**: Interactive installation script with automatic systemd and database configuration.

---

## Quick Start (Interactive Setup Wizard)

The fastest and recommended way to deploy `isc-dhcp-ui` on Linux (Ubuntu / Debian / Raspberry Pi OS):

```bash
git clone https://github.com/your-repo/isc-dhcp-ui.git
cd isc-dhcp-ui
chmod +x setup.sh
sudo ./setup.sh
```

The interactive wizard will guide you through:
1. **Dependency check**: Automatically installs `isc-dhcp-server`, `build-essential`, `golang`, `sqlite3`, and `curl` if missing.
2. **Role selection**:
   - `1) Full Setup (Controller + Primary DHCP Node)`: All-in-one or Master cluster node.
   - `2) Agent Only (Secondary Node)`: Lightweight agent for remote or failover DHCP server.
   - `3) Controller Only`: Central web management server without local DHCP service.
   - `4) Development Mode`: Local compilation for testing without installing system services.
3. **Interactive configuration**: Set web port (default `8080`), agent port (`9443`), credentials, cluster node IPs, and default subnet.
4. **Automated deployment**: Compiles binaries, initializes SQLite database, creates and starts Systemd services, and configures UFW firewall.

---

## Service Management & CLI Commands

Once installed via the wizard, manage your services effortlessly:

```bash
# Check service status (Dashboard & DHCP health)
sudo ./setup.sh --status

# View service logs
journalctl -u dhcp-ui-controller -f
journalctl -u dhcp-ui-agent -f

# Restart services
sudo systemctl restart dhcp-ui-controller
sudo systemctl restart dhcp-ui-agent

# Uninstall services and clean files
sudo ./setup.sh --uninstall
```

---

## Developer Guide

### Linux / macOS (Makefile)

```bash
# Build both controller and agent binaries into bin/
make build

# Run unit tests
make test

# Run controller locally (Web UI at http://localhost:8080)
make run-controller

# Run agent locally
make run-agent
```

### Windows (PowerShell)

For local development on Windows:
```powershell
.\setup.ps1
```
Follow the interactive prompt to build binaries or run the controller locally.

---

## Project Structure

```text
├── cmd/
│   ├── controller/         # Web UI backend & API server
│   └── agent/              # Node agent for dhcpd.conf deploy & status
├── internal/
│   ├── database/           # SQLite database schema & queries
│   ├── generator/          # dhcpd.conf configuration generator
│   ├── models/             # Data structures & domain models
│   ├── parser/             # dhcpd.leases parser & failover analyzer
│   ├── service/            # Linux systemctl & syntax checking
│   └── syncer/             # HTTP client for Controller -> Agent communication
├── systemd/
│   ├── dhcp-ui-controller.service # Systemd unit template for Controller
│   └── dhcp-ui-agent.service      # Systemd unit template for Agent
├── web/
│   ├── static/             # Embedded HTML/CSS/JS frontend
│   └── embed.go            # Go embed FS wrapper
├── Makefile                # Build automation
├── setup.sh                # Interactive Bash Setup Wizard
└── setup.ps1               # Windows development helper
```
