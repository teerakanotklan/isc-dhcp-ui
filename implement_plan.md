# dhcp-ui Project Implement Plan

## Overview
`dhcp-ui` is a modern web UI and accompanying agent for managing an ISC DHCP server. It provides a dashboard, subnet/pool management, static lease reservations, configuration generation, and deployment capabilities. The system follows a **controller‑agent architecture** where a web controller runs the UI/API and an optional agent runs on DHCP server hosts to apply configurations and monitor service status.

---

## Repository Structure
```
dhcp-ui/
├─ cmd/
│  ├─ controller/   # Web UI backend & API server (main entry point)
│  └─ agent/        # Agent that runs on DHCP servers (applies configs)
├─ internal/
│  ├─ database/     # SQLite wrapper for persisting DHCP data
│  ├─ generator/    # Generates `dhcpd.conf` for primary/secondary nodes
│  ├─ models/       # Core data structures (Node, Subnet, Pool, Lease…)
│  ├─ parser/       # Parses `dhcpd.leases` files
│  ├─ service/      # Local service utilities (service checks, deploy)
│  └─ syncer/       # Remote agent communication (validation, deploy)
├─ web/
│  ├─ embed.go      # Embeds static assets via `embed.FS`
│  └─ static/       # HTML/JS UI (index.html, login.html, app.js, …)
├─ go.mod           # Go module definition (requires go‑sqlite3 driver)
└─ README.md        # High‑level project description
```

---

## Key Components
| Component | Purpose | Important Files |
|---|---|---|
| **Controller (`cmd/controller/main.go`)** | Serves the UI, exposes RESTful APIs, handles authentication, aggregates data, validates & deploys DHCP configs. | `main.go`, `web/static/`, `internal/*` |
| **Agent (`cmd/agent/main.go`)** | Runs on DHCP server hosts, receives config payloads from the controller via HTTP, validates syntax, writes config files, restarts the DHCP daemon. | `agent/main.go` |
| **Database (`internal/database`)** | SQLite DB (`dhcp.db`) storing nodes, subnets, pools, static leases, users, global settings, deployment history. | `db.go` |
| **Generator (`internal/generator`)** | Produces `dhcpd.conf` strings for primary and secondary nodes based on stored data. | `generator.go` |
| **Parser (`internal/parser`)** | Reads the `dhcpd.leases` file, extracts active leases, and provides fail‑over status. | `leases.go` |
| **Syncer (`internal/syncer`)** | HTTP client wrapper that talks to the remote agent (validate, deploy, get status). | `syncer.go` |
| **Service (`internal/service`)** | Local utilities for checking the primary DHCP service status and performing config deployment on the controller host. | `service.go` |
| **Web UI (`web/static`)** | React‑less static HTML/JS UI (dashboard, login, settings, lease view). | `index.html`, `login.html`, `app.js` |

---

## Build & Run
### Prerequisites
- Go 1.22+ (`go version`)
- ISC DHCP server (`isc-dhcp-server`) installed on target hosts
- SQLite driver compiled (`github.com/mattn/go-sqlite3` – already in `go.mod`)

### Building
```bash
# From the repository root
go build ./cmd/controller   # builds the web controller binary
go build ./cmd/agent        # builds the agent binary
```
The binaries are named `controller` and `agent` respectively.

### Running the Controller
```bash
# Create a writable directory for the SQLite DB (default /opt/dhcp-ui)
mkdir -p /opt/dhcp-ui
./controller \
    -port 8080 \
    -db /opt/dhcp-ui/dhcp.db \
    -leases /var/lib/dhcp/dhcpd.leases \
    -config /etc/dhcp/dhcpd.conf
```
- The UI is reachable at `http://localhost:8080/`.
- API endpoints are under `/api/` (see **API Summary** below).

### Running the Agent (on each DHCP server)
```bash
./agent -port 9090 -config /etc/dhcp/dhcpd.conf -leases /var/lib/dhcp/dhcpd.leases
```
- The controller talks to the agent via HTTP on the configured `AgentPort` stored in the **Node** model.

---

## Configuration & Data Model
- **Node**: Represents a DHCP server instance (primary/secondary) with fields `ManagementIP`, `AgentPort`, `APIToken`, `Role`.
- **Subnet** → **Pool**: Logical grouping of IP ranges and options.
- **StaticLease**: Reserved MAC → IP mappings.
- **GlobalSettings**: Global DHCP options, default lease times, etc.
- All data lives in the SQLite DB (`dhcp.db`).
- Configuration files are generated on‑the‑fly by `generator.GenerateDHCPConfig` and can be previewed via `GET /api/config/preview`.

---

## API Summary (controller)
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/login` | ❌ | Returns a session token cookie on success |
| `POST` | `/api/logout` | ✅ | Clears session cookie |
| `GET` | `/api/summary` | ✅ | Dashboard overview (nodes, services, lease counts, etc.) |
| `GET` | `/api/subnets` | ✅ | List subnets (with pools) |
| `POST` | `/api/subnets` | ✅ | Create/Update a subnet |
| `DELETE` | `/api/subnets?id=<id>` | ✅ | Delete subnet |
| `POST` | `/api/pools` | ✅ | Create/Update a pool |
| `DELETE` | `/api/pools?id=<id>` | ✅ | Delete pool |
| `GET` | `/api/static` | ✅ | List static lease reservations |
| `POST` | `/api/static` | ✅ | Create/Update static lease |
| `DELETE` | `/api/static?id=<id>` | ✅ | Delete static lease |
| `GET` | `/api/leases` | ✅ | Parse and return leases from `dhcpd.leases` |
| `GET` | `/api/config/preview` | ✅ | Generate and return primary/secondary `dhcpd.conf` strings |
| `POST` | `/api/config/deploy` | ✅ | Validate syntax, deploy to secondary then primary, record history |
| `GET` | `/api/deployments` | ✅ | List deployment history |
| `GET` | `/api/settings` | ✅ | Retrieve global settings |
| `POST` | `/api/settings` | ✅ | Update global settings |

---

## Deployment Workflow (Controller → Agent)
1. **Preview** – Controller generates configs (`primary_config`, `secondary_config`).
2. **Validate** – Syntax validated locally (`service.ValidateConfigSyntax`) and remotely via the agent (`syncer.ValidateRemote`).
3. **Deploy to Secondary** – Agent receives and writes the config, restarts DHCP service.
4. **Deploy to Primary** – Controller writes config locally and restarts the primary service.
5. **Record History** – Deployment outcome, logs, and commit message are stored in the DB (`recordDeployHistory`).

---

## Important Files
- `cmd/controller/main.go` – entry point for the web UI/API.
- `cmd/agent/main.go` – entry point for the remote agent.
- `internal/database/db.go` – DB schema & CRUD helpers.
- `internal/generator/generator.go` – DHCP config templating.
- `internal/parser/leases.go` – Lease file parsing logic.
- `internal/syncer/syncer.go` – Remote API client used by the controller.
- `web/static/*` – UI assets served via the embedded file system.

---

## Extensibility Points
- **Add new API endpoints** – Extend `mux` in `main.go` and create handler methods.
- **Custom validation** – Implement extra checks in `service.ValidateConfigSyntax` or create a new validator.
- **Alternative storage** – Replace SQLite with Postgres by implementing the `DB` interface in `internal/database`.
- **Agent enhancements** – Add health‑check endpoints or metrics collection.

---

## Quick Start Checklist
1. `go build ./cmd/controller && go build ./cmd/agent`
2. Initialise DB: the controller creates `dhcp.db` on first run.
3. Create a **primary** node entry via the UI (or DB directly).
4. (Optional) Deploy an **agent** binary on a secondary DHCP server and register it as a secondary node.
5. Use the UI to add subnets, pools, static leases, then click **Deploy**.
6. Monitor deployment history and logs via **Deployments** tab.

---

*This file is intended for consumption by other AI agents that need an immediate, high‑level understanding of the `dhcp-ui` codebase, its architecture, and how to build/run it.*
