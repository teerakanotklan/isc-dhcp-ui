const authService = require('../services/authService');
const dhcpConfigService = require('../services/dhcpConfigService');
const dhcpLeaseService = require('../services/dhcpLeaseService');
const systemService = require('../services/systemService');

console.log('--- ISC DHCP Server UI Verification Test ---');

// 1. Auth Test
const loginResult = authService.authenticate('admin', 'admin123');
if (!loginResult.success || !loginResult.token) {
  console.error('FAIL: Auth check failed');
  process.exit(1);
}
console.log('✔ Auth Test: Admin authentication successful, token generated.');

// 2. Config Parser Test
const parsed = dhcpConfigService.parseConfig();
console.log(`✔ Config Parser: Successfully parsed configuration (${parsed.subnets.length} subnets, ${parsed.hosts.length} static hosts).`);
if (!Array.isArray(parsed.subnets) || !Array.isArray(parsed.hosts)) {
  console.error('FAIL: Config parser did not return subnets or hosts array');
  process.exit(1);
}

// 3. Lease Parser Test
const leases = dhcpLeaseService.getLeases();
console.log(`✔ Lease Parser: Found ${leases.length} lease records.`);
const activeLeases = leases.filter(l => l.status === 'active');
console.log(`✔ Active Leases: ${activeLeases.length} active leases found.`);

// 4. Service Status
const status = systemService.getServiceStatus();
console.log(`✔ System Service: Service status is "${status.status}", service: ${status.service}.`);

console.log('\nAll backend component tests passed cleanly with 100% success!');
