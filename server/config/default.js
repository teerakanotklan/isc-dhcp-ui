const path = require('path');
const fs = require('fs');

const isLinux = process.platform === 'linux';
const realConfExists = isLinux && fs.existsSync('/etc/dhcp/dhcpd.conf');
const forcedMode = process.env.DHCP_MODE; // 'real' or 'mock'

const isMock = forcedMode ? forcedMode === 'mock' : !realConfExists;

// Data directory for local/mock persistence
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure mock files are copied to data/ if not present
const mockConfSource = path.join(__dirname, '..', 'mock', 'sample-dhcpd.conf');
const mockLeasesSource = path.join(__dirname, '..', 'mock', 'sample-dhcpd.leases');

const localConfPath = path.join(dataDir, 'dhcpd.conf');
const localLeasesPath = path.join(dataDir, 'dhcpd.leases');
const localInterfacesPath = path.join(dataDir, 'isc-dhcp-server');

if (!fs.existsSync(localConfPath) && fs.existsSync(mockConfSource)) {
  fs.copyFileSync(mockConfSource, localConfPath);
}

if (!fs.existsSync(localLeasesPath) && fs.existsSync(mockLeasesSource)) {
  fs.copyFileSync(mockLeasesSource, localLeasesPath);
}

if (!fs.existsSync(localInterfacesPath)) {
  fs.writeFileSync(
    localInterfacesPath,
    '# Defaults for isc-dhcp-server\nINTERFACESv4="eth0"\nINTERFACESv6=""\n',
    'utf8'
  );
}

const backupDir = path.join(dataDir, 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

module.exports = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'isc-dhcp-super-secret-key-2026',
  jwtExpiresIn: '24h',
  isMock,
  confPath: isMock ? localConfPath : '/etc/dhcp/dhcpd.conf',
  leasesPath: isMock ? localLeasesPath : '/var/lib/dhcp/dhcpd.leases',
  interfacesPath: isMock ? localInterfacesPath : '/etc/default/isc-dhcp-server',
  backupDir: isMock ? backupDir : '/etc/dhcp/backups',
  serviceName: 'isc-dhcp-server',
};
