const dhcpConfigService = require('./services/dhcpConfigService');

console.log('--- Testing Subnet Additional DHCP Options ---');

// 1. Create a test subnet with customOptions
const testSubnet = {
  subnet: '192.168.10.0',
  netmask: '255.255.255.0',
  rangeStart: '192.168.10.100',
  rangeEnd: '192.168.10.200',
  routers: '192.168.10.1',
  domainNameServers: '1.1.1.1, 8.8.8.8',
  domainName: 'test.local',
  customOptions: [
    { name: 'ntp-servers', value: 'time.google.com, 1.1.1.1' },
    { name: 'next-server', value: '192.168.10.5' },
    { name: 'bootfile-name', value: '"ipxe.efi"' },
    { name: 'interface-mtu', value: '1492' }
  ]
};

try {
  // Clean up if already exists
  try { dhcpConfigService.deleteSubnet(testSubnet.subnet); } catch (e) {}

  dhcpConfigService.createSubnet(testSubnet);
  console.log('✔ Subnet created with 4 custom options');

  // 2. Read back config and verify parsing
  const subnets = dhcpConfigService.getSubnets();
  const created = subnets.find(s => s.subnet === testSubnet.subnet);

  if (!created) {
    throw new Error('Created subnet not found in parseConfig');
  }

  console.log('Parsed customOptions:', created.customOptions);
  if (!created.customOptions || created.customOptions.length !== 4) {
    throw new Error(`Expected 4 custom options, but found ${created.customOptions ? created.customOptions.length : 0}`);
  }

  const ntpOpt = created.customOptions.find(o => o.name === 'ntp-servers');
  if (!ntpOpt || !ntpOpt.value.includes('time.google.com')) {
    throw new Error('ntp-servers value mismatch');
  }

  const nextServerOpt = created.customOptions.find(o => o.name === 'next-server');
  if (!nextServerOpt || nextServerOpt.value !== '192.168.10.5') {
    throw new Error('next-server directive value mismatch');
  }

  console.log('✔ All 4 custom options correctly parsed from config file!');

  // Clean up test subnet
  dhcpConfigService.deleteSubnet(testSubnet.subnet);
  console.log('✔ Cleaned up test subnet');

  console.log('\nDHCP Options verification test passed with 100% success!');
} catch (err) {
  console.error('Test Failed:', err.message);
  process.exit(1);
}
