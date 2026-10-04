const path = require('path');
const fs = require('fs');

const isLinux = process.platform === 'linux';

// Auto-detect Linux Distribution Family
let isRhelBased = false;
let isDebianBased = true;

if (fs.existsSync('/etc/os-release')) {
  try {
    const osRelease = fs.readFileSync('/etc/os-release', 'utf8');
    if (/ID_LIKE=.*(?:rhel|fedora|centos)/i.test(osRelease) || /ID=.*(?:rhel|rocky|almalinux|centos|fedora)/i.test(osRelease)) {
      isRhelBased = true;
      isDebianBased = false;
    }
  } catch (e) {
    // Default to Debian/Ubuntu family
  }
}

// Service Name: 'isc-dhcp-server' on Debian/Ubuntu, 'dhcpd' on RHEL/CentOS/Rocky
const serviceName = process.env.DHCP_SERVICE_NAME || (isRhelBased ? 'dhcpd' : 'isc-dhcp-server');

// Leases Path: '/var/lib/dhcp/dhcpd.leases' on Debian/Ubuntu, '/var/lib/dhcpd/dhcpd.leases' on RHEL
let detectedLeasesPath = isRhelBased ? '/var/lib/dhcpd/dhcpd.leases' : '/var/lib/dhcp/dhcpd.leases';
if (!fs.existsSync(detectedLeasesPath)) {
  if (fs.existsSync('/var/lib/dhcp/dhcpd.leases')) {
    detectedLeasesPath = '/var/lib/dhcp/dhcpd.leases';
  } else if (fs.existsSync('/var/lib/dhcpd/dhcpd.leases')) {
    detectedLeasesPath = '/var/lib/dhcpd/dhcpd.leases';
  }
}

// User data directory for local operational state (users.json)
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Primary configuration path
let confPath = process.env.DHCP_CONF_PATH || '/etc/dhcp/dhcpd.conf';
let leasesPath = process.env.DHCP_LEASES_PATH || detectedLeasesPath;
let interfacesPath = process.env.DHCP_INTERFACES_PATH || (isDebianBased ? '/etc/default/isc-dhcp-server' : null);
let backupDir = process.env.DHCP_BACKUP_DIR || '/etc/dhcp/backups';

// Non-Linux development fallback if system paths are unavailable
if (!isLinux) {
  if (!fs.existsSync(confPath) && fs.existsSync(path.join(dataDir, 'dhcpd.conf'))) {
    confPath = path.join(dataDir, 'dhcpd.conf');
  }
  if (!fs.existsSync(leasesPath) && fs.existsSync(path.join(dataDir, 'dhcpd.leases'))) {
    leasesPath = path.join(dataDir, 'dhcpd.leases');
  }
  if (interfacesPath && !fs.existsSync(interfacesPath) && fs.existsSync(path.join(dataDir, 'isc-dhcp-server'))) {
    interfacesPath = path.join(dataDir, 'isc-dhcp-server');
  }
  if (!fs.existsSync(backupDir)) {
    backupDir = path.join(dataDir, 'backups');
  }
}

// Ensure backup directory exists if permissions permit
if (!fs.existsSync(backupDir)) {
  try {
    fs.mkdirSync(backupDir, { recursive: true });
  } catch (e) {
    // If not running as root or restricted directory, logged on startup
  }
}

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  jwtSecret: process.env.JWT_SECRET || 'isc-dhcp-super-secret-key-2026',
  jwtExpiresIn: '24h',
  confPath,
  leasesPath,
  interfacesPath,
  backupDir,
  serviceName,
  isDebianBased,
  isRhelBased,
};
