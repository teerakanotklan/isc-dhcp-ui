#!/usr/bin/env bash
# ==============================================================================
# ISC DHCP Web UI - Automated Production Installer for Linux Server
# Supports:
#   - Debian 10 / 11 / 12
#   - Ubuntu 20.04 / 22.04 / 24.04 LTS
#   - RHEL / CentOS / Rocky Linux / AlmaLinux 8 / 9
#   - Fedora 38+
# ==============================================================================

set -euo pipefail

# Text Formatting
BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✔ SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# 1. Verify Root Privileges
if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root. Please run with sudo:"
    echo "  sudo bash $0"
    exit 1
fi

echo -e "${BOLD}${CYAN}"
echo "=========================================================="
echo "    ISC DHCP Server Web UI - Linux Automated Installer   "
echo "=========================================================="
echo -e "${NC}"

INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
log_info "Installation directory: ${INSTALL_DIR}"

# 2. Detect Operating System Distribution
if [[ ! -f /etc/os-release ]]; then
    log_error "Cannot identify Linux distribution (/etc/os-release not found)."
    exit 1
fi

# Source os-release info
. /etc/os-release

OS_ID="${ID:-unknown}"
OS_LIKE="${ID_LIKE:-}"
OS_NAME="${PRETTY_NAME:-$OS_ID}"

log_info "Detected Operating System: ${BOLD}${OS_NAME}${NC}"

PKG_MANAGER=""
DHCP_PKG=""
DHCP_SERVICE=""
DEFAULT_LEASES_PATH=""
DEFAULT_INTERFACES_PATH=""

if [[ "$OS_ID" == "ubuntu" || "$OS_ID" == "debian" || "$OS_LIKE" =~ (ubuntu|debian) ]]; then
    PKG_MANAGER="apt"
    DHCP_PKG="isc-dhcp-server"
    DHCP_SERVICE="isc-dhcp-server"
    DEFAULT_LEASES_PATH="/var/lib/dhcp/dhcpd.leases"
    DEFAULT_INTERFACES_PATH="/etc/default/isc-dhcp-server"
elif [[ "$OS_ID" =~ (rhel|centos|rocky|almalinux|fedora) || "$OS_LIKE" =~ (rhel|fedora|centos) ]]; then
    PKG_MANAGER="dnf"
    if ! command -v dnf &>/dev/null; then
        PKG_MANAGER="yum"
    fi
    DHCP_PKG="dhcp-server"
    DHCP_SERVICE="dhcpd"
    DEFAULT_LEASES_PATH="/var/lib/dhcpd/dhcpd.leases"
    DEFAULT_INTERFACES_PATH=""
else
    log_error "Unsupported Linux distribution family: ${OS_ID}"
    exit 1
fi

log_info "Package Manager: ${PKG_MANAGER}"
log_info "DHCP Package:    ${DHCP_PKG}"
log_info "DHCP Service:    ${DHCP_SERVICE}"

# 3. Update Package Cache and Install Base Dependencies
log_info "Updating package lists and installing required system packages..."

if [[ "$PKG_MANAGER" == "apt" ]]; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y -q
    apt-get install -y -q curl git sudo coreutils net-tools "$DHCP_PKG"
elif [[ "$PKG_MANAGER" == "dnf" || "$PKG_MANAGER" == "yum" ]]; then
    $PKG_MANAGER makecache -y
    $PKG_MANAGER install -y curl git sudo coreutils net-tools "$DHCP_PKG"
fi

log_success "System packages installed successfully."

# 4. Check / Install Node.js (v20 LTS recommended)
NEED_NODE=true
if command -v node &>/dev/null; then
    NODE_VERSION=$(node -v | sed 's/v//' | cut -d'.' -f1)
    if [[ "$NODE_VERSION" -ge 18 ]]; then
        log_info "Found existing Node.js $(node -v) (Satisfies requirement >= 18)."
        NEED_NODE=false
    else
        log_warn "Existing Node.js $(node -v) is older than v18. Upgrading to Node.js 20 LTS..."
    fi
fi

if [[ "$NEED_NODE" == "true" ]]; then
    log_info "Installing Node.js 20 LTS via official NodeSource repository..."
    if [[ "$PKG_MANAGER" == "apt" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y -q nodejs
    else
        curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
        $PKG_MANAGER install -y nodejs
    fi
    log_success "Installed Node.js $(node -v) and npm $(npm -v)."
fi

# 5. Create Dedicated System User 'dhcpui'
SYSTEM_USER="dhcpui"
log_info "Configuring dedicated system user '${SYSTEM_USER}'..."

if ! id -u "$SYSTEM_USER" &>/dev/null; then
    useradd -r -s /usr/sbin/nologin -c "ISC DHCP Web UI Service Account" "$SYSTEM_USER" || \
    useradd -r -s /sbin/nologin -c "ISC DHCP Web UI Service Account" "$SYSTEM_USER"
    log_success "Created system user '${SYSTEM_USER}'."
else
    log_info "System user '${SYSTEM_USER}' already exists."
fi

# 6. Configure Sudoers Permissions for 'dhcpui'
SUDOERS_FILE="/etc/sudoers.d/isc-dhcp-ui"
log_info "Writing restricted sudo privileges to ${SUDOERS_FILE}..."

cat << EOF > "$SUDOERS_FILE"
# Sudo privileges for ISC DHCP Web UI (${SYSTEM_USER})
Defaults:${SYSTEM_USER} !requiretty

# DHCP Service lifecycle control
${SYSTEM_USER} ALL=(ALL) NOPASSWD: /bin/systemctl restart ${DHCP_SERVICE}, /bin/systemctl reload ${DHCP_SERVICE}, /bin/systemctl stop ${DHCP_SERVICE}, /bin/systemctl start ${DHCP_SERVICE}, /bin/systemctl status ${DHCP_SERVICE}
${SYSTEM_USER} ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart ${DHCP_SERVICE}, /usr/bin/systemctl reload ${DHCP_SERVICE}, /usr/bin/systemctl stop ${DHCP_SERVICE}, /usr/bin/systemctl start ${DHCP_SERVICE}, /usr/bin/systemctl status ${DHCP_SERVICE}

# Fallback service controls for alternative service alias
${SYSTEM_USER} ALL=(ALL) NOPASSWD: /bin/systemctl restart isc-dhcp-server, /bin/systemctl reload isc-dhcp-server, /bin/systemctl stop isc-dhcp-server, /bin/systemctl start isc-dhcp-server, /bin/systemctl status isc-dhcp-server
${SYSTEM_USER} ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart isc-dhcp-server, /usr/bin/systemctl reload isc-dhcp-server, /usr/bin/systemctl stop isc-dhcp-server, /usr/bin/systemctl start isc-dhcp-server, /usr/bin/systemctl status isc-dhcp-server
${SYSTEM_USER} ALL=(ALL) NOPASSWD: /bin/systemctl restart dhcpd, /bin/systemctl reload dhcpd, /bin/systemctl stop dhcpd, /bin/systemctl start dhcpd, /bin/systemctl status dhcpd
${SYSTEM_USER} ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart dhcpd, /usr/bin/systemctl reload dhcpd, /usr/bin/systemctl stop dhcpd, /usr/bin/systemctl start dhcpd, /usr/bin/systemctl status dhcpd

# Daemon logs and syntax validation
${SYSTEM_USER} ALL=(ALL) NOPASSWD: /usr/bin/journalctl, /bin/journalctl
${SYSTEM_USER} ALL=(ALL) NOPASSWD: /usr/sbin/dhcpd, /sbin/dhcpd
EOF

chmod 0440 "$SUDOERS_FILE"
if visudo -cf "$SUDOERS_FILE" &>/dev/null; then
    log_success "Sudoers rules validated successfully."
else
    log_error "Sudoers syntax check failed. Reverting ${SUDOERS_FILE}."
    rm -f "$SUDOERS_FILE"
    exit 1
fi

# 7. Configure DHCP Directory Structure & Permissions
log_info "Configuring DHCP paths and filesystem permissions..."

mkdir -p /etc/dhcp/backups
DHCP_CONF="/etc/dhcp/dhcpd.conf"

if [[ -f "$DHCP_CONF" ]]; then
    BACKUP_CONF="/etc/dhcp/dhcpd.conf.bak.$(date +%Y%m%d%H%M%S)"
    cp -p "$DHCP_CONF" "$BACKUP_CONF"
    log_info "Backed up existing dhcpd.conf to: ${BACKUP_CONF}"
else
    log_info "Creating default /etc/dhcp/dhcpd.conf template..."
    cat << 'EOF' > "$DHCP_CONF"
# /etc/dhcp/dhcpd.conf
# Managed by ISC DHCP UI

default-lease-time 86400;
max-lease-time 604800;
authoritative;
ddns-update-style none;
log-facility local7;

# Sample Subnet (Uncomment or configure via Web UI)
# subnet 192.168.1.0 netmask 255.255.255.0 {
#   range 192.168.1.100 192.168.1.200;
#   option routers 192.168.1.1;
#   option domain-name-servers 8.8.8.8, 1.1.1.1;
# }
EOF
fi

# Ensure leases directory & file exists
LEASES_DIR="$(dirname "$DEFAULT_LEASES_PATH")"
mkdir -p "$LEASES_DIR"
touch "$DEFAULT_LEASES_PATH"

# Ensure Debian interfaces file exists if applicable
if [[ -n "$DEFAULT_INTERFACES_PATH" ]]; then
    if [[ ! -f "$DEFAULT_INTERFACES_PATH" ]]; then
        cat << 'EOF' > "$DEFAULT_INTERFACES_PATH"
# Defaults for isc-dhcp-server
INTERFACESv4=""
INTERFACESv6=""
EOF
    fi
    chown root:"$SYSTEM_USER" "$DEFAULT_INTERFACES_PATH"
    chmod 664 "$DEFAULT_INTERFACES_PATH"
fi

# Set file permissions for dhcpui user
chown root:"$SYSTEM_USER" "$DHCP_CONF"
chmod 664 "$DHCP_CONF"

chown -R "$SYSTEM_USER":"$SYSTEM_USER" /etc/dhcp/backups
chmod 775 /etc/dhcp/backups

chown -R root:"$SYSTEM_USER" "$LEASES_DIR"
chmod 775 "$LEASES_DIR"
chmod 664 "$DEFAULT_LEASES_PATH"

# 8. Install NPM Dependencies & Build Production Bundle
log_info "Installing project dependencies and building React frontend..."

cd "$INSTALL_DIR"
npm run install:all
npm run build

# Fix ownership of installation directory
chown -R "$SYSTEM_USER":"$SYSTEM_USER" "$INSTALL_DIR"

log_success "Project build completed successfully."

# 9. Configure and Start Systemd Service (isc-dhcp-ui.service)
SERVICE_FILE="/etc/systemd/system/isc-dhcp-ui.service"
NODE_BIN="$(command -v node)"

log_info "Creating systemd unit: ${SERVICE_FILE}..."

cat << EOF > "$SERVICE_FILE"
[Unit]
Description=ISC DHCP Server Web Management UI
After=network.target network-online.target ${DHCP_SERVICE}.service
Wants=network-online.target

[Service]
Type=simple
User=${SYSTEM_USER}
Group=${SYSTEM_USER}
WorkingDirectory=${INSTALL_DIR}
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=DHCP_SERVICE_NAME=${DHCP_SERVICE}
Environment=DHCP_CONF_PATH=${DHCP_CONF}
Environment=DHCP_LEASES_PATH=${DEFAULT_LEASES_PATH}
ExecStart=${NODE_BIN} server/index.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=isc-dhcp-ui

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable isc-dhcp-ui.service
systemctl restart isc-dhcp-ui.service

# Enable DHCP Server daemon on boot
systemctl enable "${DHCP_SERVICE}" || true

# 10. Verification & Summary Output
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")

echo -e "\n${BOLD}${GREEN}==========================================================${NC}"
echo -e "${BOLD}${GREEN}      ISC DHCP Web UI Installation Completed!           ${NC}"
echo -e "${BOLD}${GREEN}==========================================================${NC}"
echo -e "Web Management UI:   ${BOLD}${CYAN}http://${SERVER_IP}:3000${NC} (or http://localhost:3000)"
echo -e "Default Username:    ${BOLD}admin${NC}"
echo -e "Default Password:    ${BOLD}admin123${NC}"
echo -e "System Service:      ${BOLD}systemctl status isc-dhcp-ui${NC}"
echo -e "DHCP Daemon:         ${BOLD}systemctl status ${DHCP_SERVICE}${NC}"
echo -e "Configuration:       ${BOLD}${DHCP_CONF}${NC}"
echo -e "Leases File:         ${BOLD}${DEFAULT_LEASES_PATH}${NC}"
echo -e "${GREEN}==========================================================${NC}\n"
