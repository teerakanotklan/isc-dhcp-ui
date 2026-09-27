#!/usr/bin/env bash
# ==============================================================================
# ISC DHCP UI - Interactive Setup Wizard
# ==============================================================================
# Automates installation, dependency checking, role-based deployment, 
# systemd service management, and database configuration for isc-dhcp-ui.
# ==============================================================================

set -eo pipefail

# ------------------------------------------------------------------------------
# Colors & Formatting
# ------------------------------------------------------------------------------
BOLD='\033[1m'
DIM='\033[2m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ------------------------------------------------------------------------------
# Constants & Default Paths
# ------------------------------------------------------------------------------
INSTALL_DIR="/opt/dhcp-ui"
CONFIG_DIR="/etc/dhcp-ui"
SYSTEMD_DIR="/etc/systemd/system"
DEFAULT_CONTROLLER_PORT=8080
DEFAULT_AGENT_PORT=9443
DEFAULT_DB_PATH="${INSTALL_DIR}/data/dhcp.db"
DEFAULT_LEASES_PATH="/var/lib/dhcp/dhcpd.leases"
DEFAULT_CONFIG_PATH="/etc/dhcp/dhcpd.conf"

# State variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UNATTENDED=false
ROLE="1" # Default: 1 (Full)

# ------------------------------------------------------------------------------
# Logging & Display Functions
# ------------------------------------------------------------------------------
print_banner() {
    clear 2>/dev/null || true
    echo -e "${CYAN}${BOLD}"
    cat << "EOF"
  ___ ____   ____   ____  _   _ ____       _   _ ___ 
 |_ _/ ___| / ___| |  _ \| | | |  _ \     | | | |_ _|
  | |\___ \| |     | | | | |_| | |_) |____| | | || | 
  | | ___) | |___  | |_| |  _  |  __/_____| |_| || | 
 |___|____/ \____| |____/|_| |_|_|         \___/|___|
                                                     
EOF
    echo -e "${NC}${BOLD}ISC DHCP Server Web UI & Cluster Management Wizard${NC}"
    echo -e "${DIM}================================================================${NC}\n"
}

log_info() {
    echo -e " ${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e " ${GREEN}[✔]${NC} $1"
}

log_warn() {
    echo -e " ${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e " ${RED}[✘]${NC} $1"
}

log_step() {
    echo -e "\n${PURPLE}${BOLD}>>> $1${NC}"
}

# ------------------------------------------------------------------------------
# Utilities
# ------------------------------------------------------------------------------
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root or with sudo privileges."
        echo -e "Please run: ${CYAN}sudo $0${NC}\n"
        exit 1
    fi
}

detect_server_ip() {
    local ip
    ip=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}' || hostname -I 2>/dev/null | awk '{print $1}')
    if [[ -z "$ip" ]]; then
        ip="127.0.0.1"
    fi
    echo "$ip"
}

generate_random_token() {
    if command -v openssl >/dev/null 2>&1; then
        openssl rand -hex 16
    else
        head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n'
    fi
}

prompt_default() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    local input

    if [[ "$UNATTENDED" == "true" ]]; then
        eval "$var_name=\"\${$var_name:-$default}\""
        return
    fi

    echo -ne " ${BOLD}${prompt}${NC} [Default: ${CYAN}${default}${NC}]: "
    read -r input
    if [[ -z "$input" ]]; then
        eval "$var_name=\"$default\""
    else
        eval "$var_name=\"$input\""
    fi
}

prompt_password() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    local input

    if [[ "$UNATTENDED" == "true" ]]; then
        eval "$var_name=\"\${$var_name:-$default}\""
        return
    fi

    echo -ne " ${BOLD}${prompt}${NC} [Default: ${CYAN}${default}${NC}]: "
    read -s -r input
    echo ""
    if [[ -z "$input" ]]; then
        eval "$var_name=\"$default\""
    else
        eval "$var_name=\"$input\""
    fi
}

# ------------------------------------------------------------------------------
# Status Command
# ------------------------------------------------------------------------------
show_status() {
    print_banner
    log_step "Checking System Services Status"
    echo ""

    # Controller Service
    if systemctl list-unit-files | grep -q "dhcp-ui-controller.service"; then
        local c_status
        c_status=$(systemctl is-active dhcp-ui-controller.service 2>/dev/null || echo "inactive")
        if [[ "$c_status" == "active" ]]; then
            echo -e "  DHCP-UI Controller:  ${GREEN}● active (running)${NC}"
        else
            echo -e "  DHCP-UI Controller:  ${RED}● $c_status${NC}"
        fi
    else
        echo -e "  DHCP-UI Controller:  ${DIM}Not installed${NC}"
    fi

    # Agent Service
    if systemctl list-unit-files | grep -q "dhcp-ui-agent.service"; then
        local a_status
        a_status=$(systemctl is-active dhcp-ui-agent.service 2>/dev/null || echo "inactive")
        if [[ "$a_status" == "active" ]]; then
            echo -e "  DHCP-UI Agent:       ${GREEN}● active (running)${NC}"
        else
            echo -e "  DHCP-UI Agent:       ${RED}● $a_status${NC}"
        fi
    else
        echo -e "  DHCP-UI Agent:       ${DIM}Not installed${NC}"
    fi

    # ISC DHCP Server
    if systemctl list-unit-files | grep -q "isc-dhcp-server.service"; then
        local d_status
        d_status=$(systemctl is-active isc-dhcp-server.service 2>/dev/null || echo "inactive")
        if [[ "$d_status" == "active" ]]; then
            echo -e "  ISC DHCP Service:    ${GREEN}● active (running)${NC}"
        else
            echo -e "  ISC DHCP Service:    ${YELLOW}● $d_status${NC}"
        fi
    else
        echo -e "  ISC DHCP Service:    ${DIM}Not installed${NC}"
    fi

    echo ""
    exit 0
}

# ------------------------------------------------------------------------------
# Uninstall Command
# ------------------------------------------------------------------------------
uninstall_services() {
    print_banner
    log_step "Uninstalling ISC DHCP UI"
    echo -e "${RED}${BOLD}WARNING:${NC} This will stop and remove all DHCP-UI services and configuration files."
    echo -ne "Are you sure you want to proceed? [y/N]: "
    read -r confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        log_info "Uninstallation cancelled."
        exit 0
    fi

    log_info "Stopping services..."
    systemctl stop dhcp-ui-controller.service 2>/dev/null || true
    systemctl stop dhcp-ui-agent.service 2>/dev/null || true
    systemctl disable dhcp-ui-controller.service 2>/dev/null || true
    systemctl disable dhcp-ui-agent.service 2>/dev/null || true

    log_info "Removing systemd unit files..."
    rm -f "${SYSTEMD_DIR}/dhcp-ui-controller.service"
    rm -f "${SYSTEMD_DIR}/dhcp-ui-agent.service"
    systemctl daemon-reload

    echo -ne "Do you also want to remove database and data files (${INSTALL_DIR})? [y/N]: "
    read -r remove_data
    if [[ "$remove_data" == "y" || "$remove_data" == "Y" ]]; then
        rm -rf "${INSTALL_DIR}"
        rm -rf "${CONFIG_DIR}"
        log_success "Data and configuration removed."
    else
        rm -rf "${INSTALL_DIR}/bin"
        log_info "Retained database at ${INSTALL_DIR}/data"
    fi

    log_success "Uninstallation completed successfully!"
    exit 0
}

# ------------------------------------------------------------------------------
# Step 1: Pre-flight & Dependencies
# ------------------------------------------------------------------------------
check_prerequisites() {
    log_step "Step 1: Checking System & Prerequisites"

    # OS Detection
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS_NAME=$NAME
        OS_VERSION=$VERSION_ID
        log_info "Operating System: ${BOLD}${OS_NAME} (${OS_VERSION})${NC}"
    else
        log_warn "Unknown Linux Distribution."
    fi

    local missing_pkgs=()

    # Required tools
    command -v curl >/dev/null 2>&1 || missing_pkgs+=("curl")
    command -v sqlite3 >/dev/null 2>&1 || missing_pkgs+=("sqlite3")
    command -v gcc >/dev/null 2>&1 || missing_pkgs+=("build-essential")
    command -v go >/dev/null 2>&1 || missing_pkgs+=("golang-go")
    
    # Check isc-dhcp-server
    if [[ "$ROLE" != "3" && "$ROLE" != "4" ]]; then
        if ! command -v dhcpd >/dev/null 2>&1; then
            missing_pkgs+=("isc-dhcp-server")
        fi
    fi

    if [[ ${#missing_pkgs[@]} -gt 0 ]]; then
        log_warn "Missing required packages: ${missing_pkgs[*]}"
        if [[ "$UNATTENDED" == "true" ]]; then
            install_dependencies "${missing_pkgs[@]}"
        else
            echo -ne "Would you like the wizard to install them automatically using apt? [Y/n]: "
            read -r ans
            if [[ "$ans" =~ ^[Nn]$ ]]; then
                log_error "Please install the missing packages manually and re-run setup."
                exit 1
            fi
            install_dependencies "${missing_pkgs[@]}"
        fi
    else
        log_success "All required dependencies are satisfied."
    fi

    # Verify Go version
    if command -v go >/dev/null 2>&1; then
        local go_ver
        go_ver=$(go version | awk '{print $3}')
        log_success "Go compiler found: ${go_ver}"
    fi
}

install_dependencies() {
    local pkgs=("$@")
    log_info "Updating package lists..."
    apt-get update -qq || true
    log_info "Installing dependencies: ${pkgs[*]}..."
    DEBIAN_FRONTEND=noninteractive apt-get install -y "${pkgs[@]}"
    log_success "Dependencies installed successfully."
}

# ------------------------------------------------------------------------------
# Step 2: Role Selection Menu
# ------------------------------------------------------------------------------
select_role() {
    log_step "Step 2: Choose Deployment Role"
    echo -e "Please select the installation mode for this machine:\n"
    echo -e "  ${BOLD}1)${NC} ${GREEN}${BOLD}Full Setup (Controller + Primary DHCP Node)${NC} ${DIM}[Recommended]${NC}"
    echo -e "     - Web Controller & UI"
    echo -e "     - Local Agent managing Primary ISC DHCP Server"
    echo -e "  ${BOLD}2)${NC} ${CYAN}${BOLD}Agent Only (Secondary / Failover DHCP Node)${NC}"
    echo -e "     - Lightweight Agent on remote/secondary DHCP server"
    echo -e "     - Controlled remotely by the Primary Controller"
    echo -e "  ${BOLD}3)${NC} ${YELLOW}${BOLD}Controller Only (Management Dashboard)${NC}"
    echo -e "     - Centralized Web UI without local DHCP server"
    echo -e "  ${BOLD}4)${NC} ${PURPLE}${BOLD}Development / Test Mode${NC}"
    echo -e "     - Compile binaries locally without touching systemd\n"

    prompt_default "Enter selection (1-4)" "1" "ROLE"

    case "$ROLE" in
        1) log_info "Selected: Full Setup (Controller + Primary Node)" ;;
        2) log_info "Selected: Agent Only (Secondary Node)" ;;
        3) log_info "Selected: Controller Only" ;;
        4) log_info "Selected: Development Mode" ;;
        *) log_error "Invalid selection. Exiting."; exit 1 ;;
    esac
}

# ------------------------------------------------------------------------------
# Step 3: Interactive Configuration Prompts
# ------------------------------------------------------------------------------
configure_wizard() {
    log_step "Step 3: Configuration Settings"
    local detected_ip
    detected_ip=$(detect_server_ip)

    # 1. Controller Settings
    if [[ "$ROLE" == "1" || "$ROLE" == "3" || "$ROLE" == "4" ]]; then
        echo -e "\n${BOLD}--- Web Controller Settings ---${NC}"
        prompt_default "Web UI Listen Port" "$DEFAULT_CONTROLLER_PORT" "CONTROLLER_PORT"
        prompt_default "Initial Admin Username" "admin" "ADMIN_USER"
        prompt_password "Initial Admin Password" "admin" "ADMIN_PASS"
    fi

    # 2. Agent Settings
    if [[ "$ROLE" == "1" || "$ROLE" == "2" || "$ROLE" == "4" ]]; then
        echo -e "\n${BOLD}--- DHCP Agent Settings ---${NC}"
        prompt_default "Agent Listen Port" "$DEFAULT_AGENT_PORT" "AGENT_PORT"
        local gen_token
        gen_token=$(generate_random_token)
        prompt_default "Agent Security API Token" "$gen_token" "AGENT_TOKEN"
    fi

    # 3. Cluster & Network Configuration (for Controller setup)
    if [[ "$ROLE" == "1" || "$ROLE" == "3" ]]; then
        echo -e "\n${BOLD}--- Cluster Failover Nodes ---${NC}"
        prompt_default "Primary Node Management IP" "$detected_ip" "PRIMARY_IP"
        prompt_default "Secondary Node Management IP" "192.168.153.160" "SECONDARY_IP"

        echo -e "\n${BOLD}--- Initial DHCP Subnet Configuration ---${NC}"
        prompt_default "Subnet Network Address" "192.168.1.0" "SUBNET_NET"
        prompt_default "Subnet Netmask" "255.255.255.0" "SUBNET_MASK"
        prompt_default "Subnet Gateway (Router IP)" "192.168.1.1" "SUBNET_GW"
        prompt_default "DNS Servers" "192.168.1.1, 8.8.8.8" "SUBNET_DNS"
        prompt_default "IP Pool Range Start" "192.168.1.100" "POOL_START"
        prompt_default "IP Pool Range End" "192.168.1.200" "POOL_END"
    fi

    # Summary confirmation
    echo -e "\n${PURPLE}${BOLD}--- Configuration Summary ---${NC}"
    [[ -n "${CONTROLLER_PORT:-}" ]] && echo -e "  Web Controller Port : ${CYAN}${CONTROLLER_PORT}${NC}"
    [[ -n "${ADMIN_USER:-}" ]]      && echo -e "  Admin Username      : ${CYAN}${ADMIN_USER}${NC}"
    [[ -n "${AGENT_PORT:-}" ]]         && echo -e "  Agent Listen Port   : ${CYAN}${AGENT_PORT}${NC}"
    [[ -n "${AGENT_TOKEN:-}" ]]        && echo -e "  Agent API Token     : ${CYAN}${AGENT_TOKEN}${NC}"
    [[ -n "${PRIMARY_IP:-}" ]]         && echo -e "  Primary Node IP     : ${CYAN}${PRIMARY_IP}${NC}"
    [[ -n "${SECONDARY_IP:-}" ]]       && echo -e "  Secondary Node IP   : ${CYAN}${SECONDARY_IP}${NC}"
    [[ -n "${SUBNET_NET:-}" ]]         && echo -e "  Default Subnet      : ${CYAN}${SUBNET_NET} (${POOL_START} - ${POOL_END})${NC}"
    echo ""

    if [[ "$UNATTENDED" != "true" ]]; then
        echo -ne "Do you wish to proceed with this configuration? [Y/n]: "
        read -r confirm
        if [[ "$confirm" =~ ^[Nn]$ ]]; then
            log_warn "Setup cancelled by user."
            exit 0
        fi
    fi
}

# ------------------------------------------------------------------------------
# Step 4: Build Binaries
# ------------------------------------------------------------------------------
build_binaries() {
    log_step "Step 4: Compiling Go Binaries"
    mkdir -p "${SCRIPT_DIR}/bin"

    log_info "Ensuring Go dependencies (go mod tidy)..."
    (cd "${SCRIPT_DIR}" && go mod tidy)

    if [[ "$ROLE" == "1" || "$ROLE" == "3" || "$ROLE" == "4" ]]; then
        log_info "Building Controller (CGO_ENABLED=1)..."
        (cd "${SCRIPT_DIR}" && CGO_ENABLED=1 go build -trimpath -ldflags="-s -w" -o "${SCRIPT_DIR}/bin/controller" ./cmd/controller)
        log_success "Controller binary compiled: bin/controller"
    fi

    if [[ "$ROLE" == "1" || "$ROLE" == "2" || "$ROLE" == "4" ]]; then
        log_info "Building Agent..."
        (cd "${SCRIPT_DIR}" && go build -trimpath -ldflags="-s -w" -o "${SCRIPT_DIR}/bin/agent" ./cmd/agent)
        log_success "Agent binary compiled: bin/agent"
    fi
}

# ------------------------------------------------------------------------------
# Step 5: Directory & Database Setup
# ------------------------------------------------------------------------------
setup_directories_and_db() {
    if [[ "$ROLE" == "4" ]]; then
        log_info "Development mode: skipping system directory installation."
        return
    fi

    log_step "Step 5: Setting Up Directories & Initial Database"

    # Create directories
    mkdir -p "${INSTALL_DIR}/bin"
    mkdir -p "${INSTALL_DIR}/data"
    mkdir -p "${CONFIG_DIR}"
    mkdir -p "/etc/dhcp"
    mkdir -p "/var/lib/dhcp"

    # Ensure leases file exists
    touch "${DEFAULT_LEASES_PATH}" 2>/dev/null || true
    chmod 644 "${DEFAULT_LEASES_PATH}" 2>/dev/null || true

    # Install binaries
    if [[ -f "${SCRIPT_DIR}/bin/controller" ]]; then
        cp -f "${SCRIPT_DIR}/bin/controller" "${INSTALL_DIR}/bin/controller"
        chmod +x "${INSTALL_DIR}/bin/controller"
    fi
    if [[ -f "${SCRIPT_DIR}/bin/agent" ]]; then
        cp -f "${SCRIPT_DIR}/bin/agent" "${INSTALL_DIR}/bin/agent"
        chmod +x "${INSTALL_DIR}/bin/agent"
    fi

    # Write Environment Files
    if [[ "$ROLE" == "1" || "$ROLE" == "3" ]]; then
        cat << EOF > "${CONFIG_DIR}/controller.env"
CONTROLLER_PORT=${CONTROLLER_PORT}
DB_PATH=${DEFAULT_DB_PATH}
LEASES_PATH=${DEFAULT_LEASES_PATH}
CONFIG_PATH=${DEFAULT_CONFIG_PATH}
EOF
        chmod 600 "${CONFIG_DIR}/controller.env"
        log_success "Saved ${CONFIG_DIR}/controller.env"
    fi

    if [[ "$ROLE" == "1" || "$ROLE" == "2" ]]; then
        cat << EOF > "${CONFIG_DIR}/agent.env"
AGENT_PORT=${AGENT_PORT}
AGENT_TOKEN=${AGENT_TOKEN}
LEASES_PATH=${DEFAULT_LEASES_PATH}
CONFIG_PATH=${DEFAULT_CONFIG_PATH}
EOF
        chmod 600 "${CONFIG_DIR}/agent.env"
        log_success "Saved ${CONFIG_DIR}/agent.env"
    fi

    # Initialize SQLite Database if Controller is installed
    if [[ "$ROLE" == "1" || "$ROLE" == "3" ]]; then
        if [[ ! -f "${DEFAULT_DB_PATH}" ]]; then
            log_info "Initializing SQLite database with custom settings..."
            sqlite3 "${DEFAULT_DB_PATH}" << EOF
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS global_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain_name TEXT DEFAULT 'local',
    dns_servers TEXT DEFAULT '192.168.1.1, 8.8.8.8',
    default_lease_time INTEGER DEFAULT 43200,
    max_lease_time INTEGER DEFAULT 86400,
    authoritative BOOLEAN DEFAULT 1,
    custom_options TEXT DEFAULT '',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('primary', 'secondary')),
    management_ip TEXT NOT NULL,
    dhcp_ip TEXT NOT NULL,
    agent_port INTEGER DEFAULT 9443,
    api_token TEXT NOT NULL,
    status TEXT DEFAULT 'unknown',
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS subnets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    network_address TEXT NOT NULL,
    netmask TEXT NOT NULL,
    cidr_prefix INTEGER NOT NULL,
    gateway TEXT NOT NULL,
    dns_servers TEXT DEFAULT '',
    domain_name TEXT DEFAULT '',
    lease_time INTEGER DEFAULT 0,
    enable_failover BOOLEAN DEFAULT 1,
    description TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS pools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subnet_id INTEGER NOT NULL REFERENCES subnets(id) ON DELETE CASCADE,
    range_start TEXT NOT NULL,
    range_end TEXT NOT NULL,
    deny_unknown_clients BOOLEAN DEFAULT 0,
    failover_peer_name TEXT DEFAULT 'dhcp-failover'
);
CREATE TABLE IF NOT EXISTS static_leases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subnet_id INTEGER NOT NULL REFERENCES subnets(id) ON DELETE CASCADE,
    hostname TEXT NOT NULL,
    mac_address TEXT NOT NULL UNIQUE,
    ip_address TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS deployment_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deployed_by TEXT NOT NULL,
    commit_message TEXT NOT NULL,
    generated_conf_primary TEXT NOT NULL,
    generated_conf_secondary TEXT NOT NULL,
    status TEXT NOT NULL,
    log_detail TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial admin
INSERT OR REPLACE INTO users (id, username, password) VALUES (1, '${ADMIN_USER}', '${ADMIN_PASS}');

-- Seed global settings
INSERT OR REPLACE INTO global_settings (id, domain_name, dns_servers, default_lease_time, max_lease_time, authoritative)
VALUES (1, 'lab.local', '${SUBNET_DNS}', 43200, 86400, 1);

-- Seed nodes
INSERT OR REPLACE INTO nodes (id, name, role, management_ip, dhcp_ip, agent_port, api_token, status)
VALUES 
    (1, 'dhcp-primary', 'primary', '${PRIMARY_IP}', '${PRIMARY_IP}', ${AGENT_PORT:-9443}, '${AGENT_TOKEN:-dhcp-secret-token}', 'online'),
    (2, 'dhcp-secondary', 'secondary', '${SECONDARY_IP}', '${SECONDARY_IP}', ${AGENT_PORT:-9443}, '${AGENT_TOKEN:-dhcp-secret-token}', 'unknown');

-- Seed initial subnet & pool
INSERT OR REPLACE INTO subnets (id, network_address, netmask, cidr_prefix, gateway, dns_servers, domain_name, lease_time, enable_failover, description)
VALUES (1, '${SUBNET_NET}', '${SUBNET_MASK}', 24, '${SUBNET_GW}', '${SUBNET_DNS}', 'lab.local', 43200, 1, 'Default Subnet');

INSERT OR REPLACE INTO pools (id, subnet_id, range_start, range_end, deny_unknown_clients, failover_peer_name)
VALUES (1, 1, '${POOL_START}', '${POOL_END}', 0, 'dhcp-failover');
EOF
            chmod 600 "${DEFAULT_DB_PATH}"
            log_success "Database initialized at ${DEFAULT_DB_PATH}"
        else
            log_info "Existing database detected at ${DEFAULT_DB_PATH}, skipping re-initialization."
        fi
    fi
}

# ------------------------------------------------------------------------------
# Step 6: Systemd Installation & Startup
# ------------------------------------------------------------------------------
install_systemd_services() {
    if [[ "$ROLE" == "4" ]]; then
        return
    fi

    log_step "Step 6: Installing Systemd Services"

    if [[ "$ROLE" == "1" || "$ROLE" == "3" ]]; then
        cp -f "${SCRIPT_DIR}/systemd/dhcp-ui-controller.service" "${SYSTEMD_DIR}/dhcp-ui-controller.service"
        log_success "Installed dhcp-ui-controller.service"
    fi

    if [[ "$ROLE" == "1" || "$ROLE" == "2" ]]; then
        cp -f "${SCRIPT_DIR}/systemd/dhcp-ui-agent.service" "${SYSTEMD_DIR}/dhcp-ui-agent.service"
        log_success "Installed dhcp-ui-agent.service"
    fi

    log_info "Reloading systemd daemon..."
    systemctl daemon-reload

    # Start and enable services
    if [[ "$ROLE" == "1" || "$ROLE" == "3" ]]; then
        log_info "Enabling and starting dhcp-ui-controller..."
        systemctl enable dhcp-ui-controller.service
        systemctl restart dhcp-ui-controller.service
    fi

    if [[ "$ROLE" == "1" || "$ROLE" == "2" ]]; then
        log_info "Enabling and starting dhcp-ui-agent..."
        systemctl enable dhcp-ui-agent.service
        systemctl restart dhcp-ui-agent.service
    fi
}

# ------------------------------------------------------------------------------
# Step 7: Firewall Configuration
# ------------------------------------------------------------------------------
configure_firewall() {
    if [[ "$ROLE" == "4" ]]; then
        return
    fi

    if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
        log_step "Step 7: Configuring Firewall (UFW)"
        local fw_ans="y"
        if [[ "$UNATTENDED" != "true" ]]; then
            echo -ne "UFW is active. Would you like to automatically allow DHCP-UI ports? [Y/n]: "
            read -r fw_ans
        fi
        if [[ ! "$fw_ans" =~ ^[Nn]$ ]]; then
            if [[ "$ROLE" == "1" || "$ROLE" == "3" ]]; then
                ufw allow "${CONTROLLER_PORT}/tcp" comment "DHCP-UI Web Controller"
            fi
            if [[ "$ROLE" == "1" || "$ROLE" == "2" ]]; then
                ufw allow "${AGENT_PORT}/tcp" comment "DHCP-UI Agent"
                ufw allow 67/udp comment "DHCP Server"
                ufw allow 519:520/udp comment "DHCP Failover Sync"
            fi
            ufw reload
            log_success "Firewall rules added successfully."
        fi
    fi
}

# ------------------------------------------------------------------------------
# Step 8: Verification & Health Check
# ------------------------------------------------------------------------------
verify_services() {
    if [[ "$ROLE" == "4" ]]; then
        return
    fi

    log_step "Step 8: Verifying Services & Health Check"
    sleep 2

    local healthy=true

    if [[ "$ROLE" == "1" || "$ROLE" == "3" ]]; then
        if systemctl is-active --quiet dhcp-ui-controller.service; then
            log_success "dhcp-ui-controller is running."
        else
            log_error "dhcp-ui-controller failed to start! Check: journalctl -u dhcp-ui-controller -n 20"
            healthy=false
        fi
    fi

    if [[ "$ROLE" == "1" || "$ROLE" == "2" ]]; then
        if systemctl is-active --quiet dhcp-ui-agent.service; then
            log_success "dhcp-ui-agent is running."
        else
            log_error "dhcp-ui-agent failed to start! Check: journalctl -u dhcp-ui-agent -n 20"
            healthy=false
        fi
    fi

    if [[ "$healthy" == "true" ]]; then
        log_success "All requested services are operational!"
    else
        log_warn "Some services encountered warnings during startup."
    fi
}

# ------------------------------------------------------------------------------
# Step 9: Final Summary Card
# ------------------------------------------------------------------------------
display_summary() {
    local ip
    ip=$(detect_server_ip)

    echo -e "\n${GREEN}${BOLD}================================================================${NC}"
    echo -e "${GREEN}${BOLD}             🎉 SETUP COMPLETED SUCCESSFULLY! 🎉              ${NC}"
    echo -e "${GREEN}${BOLD}================================================================${NC}\n"

    if [[ "$ROLE" == "1" || "$ROLE" == "3" ]]; then
        echo -e "  ${BOLD}Web UI Address:${NC}       ${CYAN}${BOLD}http://${ip}:${CONTROLLER_PORT}${NC}"
        echo -e "  ${BOLD}Admin Username:${NC}       ${YELLOW}${ADMIN_USER}${NC}"
        echo -e "  ${BOLD}Admin Password:${NC}       ${YELLOW}${ADMIN_PASS}${NC}"
    fi

    if [[ "$ROLE" == "1" || "$ROLE" == "2" ]]; then
        echo -e "  ${BOLD}Agent Endpoint:${NC}       ${CYAN}http://${ip}:${AGENT_PORT}${NC}"
        echo -e "  ${BOLD}Agent API Token:${NC}      ${YELLOW}${AGENT_TOKEN}${NC}"
    fi

    if [[ "$ROLE" == "4" ]]; then
        echo -e "  ${BOLD}Development Mode:${NC} Binaries ready in ${CYAN}./bin/${NC}"
        echo -e "  - Run Controller: ${CYAN}./bin/controller -port 8080 -db ./data/dhcp.db${NC}"
        echo -e "  - Run Agent:      ${CYAN}./bin/agent -port 9443 -token test-token${NC}"
    else
        echo -e "\n  ${BOLD}Management Commands:${NC}"
        echo -e "  - Check Status : ${CYAN}sudo ./setup.sh --status${NC}  or  ${CYAN}systemctl status dhcp-ui-*${NC}"
        echo -e "  - View Logs    : ${CYAN}journalctl -u dhcp-ui-controller -f${NC}"
        echo -e "  - Uninstall    : ${CYAN}sudo ./setup.sh --uninstall${NC}"
    fi

    echo -e "\n${DIM}================================================================${NC}\n"
}

# ------------------------------------------------------------------------------
# CLI Flag Handling & Main Entrypoint
# ------------------------------------------------------------------------------
case "${1:-}" in
    -h|--help)
        echo "Usage: sudo ./setup.sh [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  -h, --help        Show this help message"
        echo "  -s, --status      Show status of installed DHCP-UI services"
        echo "  -u, --uninstall   Uninstall DHCP-UI services and configurations"
        echo "  --unattended      Run without interactive prompts using env vars or defaults"
        exit 0
        ;;
    -s|--status)
        show_status
        ;;
    -u|--uninstall)
        check_root
        uninstall_services
        ;;
    --unattended)
        UNATTENDED=true
        ;;
esac

# Run Wizard
check_root
print_banner
select_role
check_prerequisites
configure_wizard
build_binaries
setup_directories_and_db
install_systemd_services
configure_firewall
verify_services
display_summary
