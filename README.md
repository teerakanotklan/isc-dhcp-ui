# isc-dhcp-ui

A modern Web UI and Agent for managing ISC DHCP Server.

## Features
- **Dashboard & Monitoring**: View DHCP status, active leases, and statistics.
- **Subnet & Pool Management**: Manage subnets, IP ranges, gateway/DNS options.
- **Static Leases (Reservations)**: Reserve fixed IP addresses for MAC addresses.
- **Configuration Generator**: Automatically generate valid `dhcpd.conf` configurations.
- **Agent / Controller Architecture**: Centralized management with an agent to control local/remote ISC DHCP server instances.

## Project Structure
- `cmd/controller`: Web UI backend & API server.
- `cmd/agent`: Agent running on DHCP servers to apply configs and monitor service.
- `internal/`: Core business logic (database, leases parser, generator, syncer).
- `web/`: Embedded responsive web interface.

## Getting Started

### Prerequisites
- Go 1.22+
- ISC DHCP Server (`isc-dhcp-server`)
