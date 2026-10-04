const fs = require('fs');
const path = require('path');
const config = require('../config/default');
const backupService = require('./backupService');

class DhcpConfigService {
  constructor() {
    this.confPath = config.confPath;
  }

  getRawConfig() {
    if (!fs.existsSync(this.confPath)) {
      return '';
    }
    return fs.readFileSync(this.confPath, 'utf8');
  }

  saveRawConfig(content, comment = 'Manual edit via Web UI') {
    // Validate syntax first
    const validation = this.validateSyntax(content);
    if (!validation.valid) {
      throw new Error(`Syntax Error: ${validation.error}`);
    }

    // Auto backup current config before writing
    if (fs.existsSync(this.confPath)) {
      backupService.createBackup(this.confPath, comment);
    }

    fs.writeFileSync(this.confPath, content, 'utf8');
    return { success: true, message: 'Configuration saved successfully' };
  }

  validateSyntax(content) {
    // Basic balanced braces and line termination checks
    let openBraces = 0;
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].replace(/#.*$/, '').trim(); // Remove comments
      if (!line) continue;

      for (const ch of line) {
        if (ch === '{') openBraces++;
        if (ch === '}') openBraces--;
      }
      if (openBraces < 0) {
        return { valid: false, error: `Unexpected closing brace '}' at line ${i + 1}` };
      }
    }

    if (openBraces !== 0) {
      return { valid: false, error: `Unclosed block! Missing ${openBraces} closing brace '}'` };
    }

    // Check host declarations have hardware ethernet and fixed-address
    const hostMatches = content.match(/host\s+[\w-]+\s*\{[^}]*\}/g) || [];
    for (const hostBlock of hostMatches) {
      if (!/hardware\s+ethernet\s+([0-9a-fA-F]{2}[:-]){5}([0-9a-fA-F]{2})/i.test(hostBlock)) {
        return { valid: false, error: `Host declaration missing valid 'hardware ethernet xx:xx:xx:xx:xx:xx': ${hostBlock.slice(0, 30)}...` };
      }
      if (!/fixed-address\s+([0-9]{1,3}\.){3}[0-9]{1,3}/i.test(hostBlock)) {
        return { valid: false, error: `Host declaration missing valid 'fixed-address ip': ${hostBlock.slice(0, 30)}...` };
      }
    }

    return { valid: true };
  }

  // Parse structured data from config
  parseConfig() {
    const raw = this.getRawConfig();
    const result = {
      global: {},
      subnets: [],
      hosts: [],
      raw
    };

    // Parse Global options
    const globalLeaseMatch = raw.match(/default-lease-time\s+(\d+);/);
    if (globalLeaseMatch) result.global.defaultLeaseTime = parseInt(globalLeaseMatch[1], 10);

    const maxLeaseMatch = raw.match(/max-lease-time\s+(\d+);/);
    if (maxLeaseMatch) result.global.maxLeaseTime = parseInt(maxLeaseMatch[1], 10);

    result.global.authoritative = /authoritative\s*;/.test(raw);
    const ddnsMatch = raw.match(/ddns-update-style\s+([\w-]+);/);
    if (ddnsMatch) result.global.ddnsUpdateStyle = ddnsMatch[1];

    // Parse Subnets
    // regex matching: subnet <ip> netmask <mask> { <body> }
    const subnetRegex = /subnet\s+([0-9.]+)\s+netmask\s+([0-9.]+)\s*\{([^}]*)\}/g;
    let match;
    let scopeIndex = 1;
    while ((match = subnetRegex.exec(raw)) !== null) {
      const net = match[1];
      const netmask = match[2];
      const body = match[3];

      const isDisabled = /#\s*@scope-disabled/i.test(body) ||
                         /ignore\s+booting\s*;/i.test(body) ||
                         /deny\s+booting\s*;/i.test(body);

      const subnetObj = {
        id: scopeIndex++,
        name: '',
        subnet: net,
        netmask: netmask,
        disabled: isDisabled,
        rangeStart: '',
        rangeEnd: '',
        routers: '',
        subnetMask: '',
        broadcastAddress: '',
        domainNameServers: '',
        domainName: '',
        defaultLeaseTime: '',
        maxLeaseTime: ''
      };

      const nameMatch = body.match(/#\s*@scope-name:[ \t]*(.+)$/m);
      if (nameMatch) subnetObj.name = nameMatch[1].trim();

      const rangeMatch = body.match(/range\s+([0-9.]+)\s+([0-9.]+);/);
      if (rangeMatch) {
        subnetObj.rangeStart = rangeMatch[1];
        subnetObj.rangeEnd = rangeMatch[2];
      }

      const routersMatch = body.match(/option\s+routers\s+([0-9.,\s]+);/);
      if (routersMatch) subnetObj.routers = routersMatch[1].trim();

      const maskOptionMatch = body.match(/option\s+subnet-mask\s+([0-9.]+);/);
      if (maskOptionMatch) subnetObj.subnetMask = maskOptionMatch[1].trim();

      const broadcastMatch = body.match(/option\s+broadcast-address\s+([0-9.]+);/);
      if (broadcastMatch) subnetObj.broadcastAddress = broadcastMatch[1].trim();

      const dnsMatch = body.match(/option\s+domain-name-servers\s+([^;]+);/);
      if (dnsMatch) subnetObj.domainNameServers = dnsMatch[1].trim();

      const domainMatch = body.match(/option\s+domain-name\s+"([^"]+)";/);
      if (domainMatch) subnetObj.domainName = domainMatch[1].trim();

      const dLeaseMatch = body.match(/default-lease-time\s+(\d+);/);
      if (dLeaseMatch) subnetObj.defaultLeaseTime = parseInt(dLeaseMatch[1], 10);

      const mLeaseMatch = body.match(/max-lease-time\s+(\d+);/);
      if (mLeaseMatch) subnetObj.maxLeaseTime = parseInt(mLeaseMatch[1], 10);

      // Parse Additional / Custom DHCP Options
      const standardOptionNames = new Set([
        'routers',
        'subnet-mask',
        'broadcast-address',
        'domain-name-servers',
        'domain-name'
      ]);

      subnetObj.customOptions = [];

      // Extract all option <name> <value>; statements
      const optionRegex = /option\s+([\w-]+)\s+([^;]+);/g;
      let optMatch;
      while ((optMatch = optionRegex.exec(body)) !== null) {
        const optName = optMatch[1].trim();
        const optValue = optMatch[2].trim();
        if (!standardOptionNames.has(optName)) {
          subnetObj.customOptions.push({
            name: optName,
            value: optValue
          });
        }
      }

      // Also extract next-server directive if present
      const nextServerMatch = body.match(/next-server\s+([^;]+);/);
      if (nextServerMatch) {
        subnetObj.customOptions.push({
          name: 'next-server',
          value: nextServerMatch[1].trim()
        });
      }

      result.subnets.push(subnetObj);
    }

    // Parse Static Hosts
    // regex matching: host <name> { <body> }
    const hostRegex = /host\s+([\w\.-]+)\s*\{([^}]*)\}/g;
    let hostIndex = 1;
    while ((match = hostRegex.exec(raw)) !== null) {
      const name = match[1];
      const body = match[2];

      const macMatch = body.match(/hardware\s+ethernet\s+([0-9a-fA-F:]{17});/i);
      const ipMatch = body.match(/fixed-address\s+([0-9.]+);/);
      const descMatch = body.match(/#\s*description:\s*(.+)$/m);

      if (macMatch && ipMatch) {
        result.hosts.push({
          id: hostIndex++,
          name: name,
          mac: macMatch[1].toLowerCase(),
          ip: ipMatch[1],
          description: descMatch ? descMatch[1].trim() : ''
        });
      }
    }

    return result;
  }

  // --- Subnet CRUD ---
  getSubnets() {
    return this.parseConfig().subnets;
  }

  saveSubnets(subnets) {
    let raw = this.getRawConfig();

    // Remove all existing subnet blocks
    raw = raw.replace(/\n*subnet\s+[0-9.]+\s+netmask\s+[0-9.]+\s*\{[^}]*\}\n*/g, '\n');

    // Generate new subnet blocks
    let newBlocks = '\n';
    for (const sub of subnets) {
      newBlocks += `subnet ${sub.subnet} netmask ${sub.netmask} {\n`;
      if (sub.name) {
        newBlocks += `  # @scope-name: ${String(sub.name).replace(/[\r\n}]+/g, ' ').trim()}\n`;
      }
      if (sub.disabled) {
        newBlocks += `  # @scope-disabled: true\n`;
        newBlocks += `  ignore booting;\n`;
      }
      if (sub.rangeStart && sub.rangeEnd) {
        newBlocks += `  range ${sub.rangeStart} ${sub.rangeEnd};\n`;
      }
      if (sub.routers) {
        newBlocks += `  option routers ${sub.routers};\n`;
      }
      if (sub.subnetMask || sub.netmask) {
        newBlocks += `  option subnet-mask ${sub.subnetMask || sub.netmask};\n`;
      }
      if (sub.broadcastAddress) {
        newBlocks += `  option broadcast-address ${sub.broadcastAddress};\n`;
      }
      if (sub.domainNameServers) {
        newBlocks += `  option domain-name-servers ${sub.domainNameServers};\n`;
      }
      if (sub.domainName) {
        newBlocks += `  option domain-name "${sub.domainName}";\n`;
      }
      if (sub.defaultLeaseTime) {
        newBlocks += `  default-lease-time ${sub.defaultLeaseTime};\n`;
      }
      if (sub.maxLeaseTime) {
        newBlocks += `  max-lease-time ${sub.maxLeaseTime};\n`;
      }
      if (Array.isArray(sub.customOptions)) {
        for (const opt of sub.customOptions) {
          if (opt && opt.name && opt.value !== undefined && opt.value !== '') {
            const cleanName = opt.name.trim();
            const cleanVal = opt.value.trim();
            if (cleanName === 'next-server') {
              newBlocks += `  next-server ${cleanVal};\n`;
            } else {
              newBlocks += `  option ${cleanName} ${cleanVal};\n`;
            }
          }
        }
      }
      newBlocks += `}\n\n`;
    }

    // Insert before host blocks or append
    const hostIdx = raw.search(/host\s+[\w\.-]+\s*\{/);
    if (hostIdx !== -1) {
      raw = raw.slice(0, hostIdx) + newBlocks + raw.slice(hostIdx);
    } else {
      raw = raw + newBlocks;
    }

    this.saveRawConfig(raw.trim() + '\n', 'Subnet configuration updated');
  }

  createSubnet(data) {
    const subnets = this.getSubnets();
    if (subnets.some(s => s.subnet === data.subnet)) {
      throw new Error(`Scope ${data.subnet} already exists`);
    }
    const newSubnet = { ...data, disabled: Boolean(data.disabled) };
    subnets.push(newSubnet);
    this.saveSubnets(subnets);
    return newSubnet;
  }

  getSubnetById(idOrSubnet) {
    const subnets = this.getSubnets();
    return subnets.find(s => String(s.id) === String(idOrSubnet) || s.subnet === idOrSubnet) || null;
  }

  updateSubnet(idOrSubnet, data) {
    const subnets = this.getSubnets();
    const index = subnets.findIndex(s => String(s.id) === String(idOrSubnet) || s.subnet === idOrSubnet);
    if (index === -1) {
      throw new Error(`Scope ${idOrSubnet} not found`);
    }
    if (data.subnet && data.subnet !== subnets[index].subnet) {
      if (subnets.some((s, idx) => idx !== index && s.subnet === data.subnet)) {
        throw new Error(`Scope ${data.subnet} already exists`);
      }
    }
    subnets[index] = { ...subnets[index], ...data, id: subnets[index].id };
    this.saveSubnets(subnets);
    return subnets[index];
  }

  deleteSubnet(idOrSubnet) {
    const subnets = this.getSubnets();
    const filtered = subnets.filter(s => String(s.id) !== String(idOrSubnet) && s.subnet !== idOrSubnet);
    if (filtered.length === subnets.length) {
      throw new Error(`Scope ${idOrSubnet} not found`);
    }
    this.saveSubnets(filtered);
    return { success: true };
  }

  toggleSubnetDisabled(idOrSubnet) {
    const subnets = this.getSubnets();
    const index = subnets.findIndex(s => String(s.id) === String(idOrSubnet) || s.subnet === idOrSubnet);
    if (index === -1) {
      throw new Error(`Scope ${idOrSubnet} not found`);
    }
    subnets[index].disabled = !subnets[index].disabled;
    this.saveSubnets(subnets);
    return subnets[index];
  }

  // --- Static Host CRUD ---
  getStaticHosts() {
    return this.parseConfig().hosts;
  }

  getHostById(idOrName) {
    const hosts = this.getStaticHosts();
    return hosts.find(h => String(h.id) === String(idOrName) || h.name === idOrName) || null;
  }

  saveStaticHosts(hosts) {
    let raw = this.getRawConfig();

    // Remove all existing host blocks
    raw = raw.replace(/\n*host\s+[\w\.-]+\s*\{[^}]*\}\n*/g, '\n');

    // Generate new host blocks
    let newBlocks = '\n# Static IP Reservations (Hosts)\n';
    for (const h of hosts) {
      newBlocks += `host ${h.name} {\n`;
      if (h.description) {
        newBlocks += `  # description: ${h.description}\n`;
      }
      newBlocks += `  hardware ethernet ${h.mac.toLowerCase()};\n`;
      newBlocks += `  fixed-address ${h.ip};\n`;
      newBlocks += `}\n\n`;
    }

    raw = raw.trim() + '\n' + newBlocks;
    this.saveRawConfig(raw.trim() + '\n', 'Static hosts updated');
  }

  createStaticHost(data) {
    const hosts = this.getStaticHosts();
    const normalizedMac = data.mac.toLowerCase();

    if (hosts.some(h => h.name.toLowerCase() === data.name.toLowerCase())) {
      throw new Error(`Host with name '${data.name}' already exists`);
    }
    if (hosts.some(h => h.mac.toLowerCase() === normalizedMac)) {
      throw new Error(`Host with MAC address '${data.mac}' already exists`);
    }
    if (hosts.some(h => h.ip === data.ip)) {
      throw new Error(`IP address '${data.ip}' is already assigned to host '${hosts.find(h => h.ip === data.ip).name}'`);
    }

    hosts.push({
      name: data.name,
      mac: normalizedMac,
      ip: data.ip,
      description: data.description || ''
    });

    this.saveStaticHosts(hosts);
    return data;
  }

  updateStaticHost(idOrName, data) {
    const hosts = this.getStaticHosts();
    const index = hosts.findIndex(h => String(h.id) === String(idOrName) || h.name === idOrName);
    if (index === -1) {
      throw new Error(`Host '${idOrName}' not found`);
    }

    const normalizedMac = data.mac.toLowerCase();
    // Verify no collisions with other hosts
    for (let i = 0; i < hosts.length; i++) {
      if (i !== index) {
        if (hosts[i].mac.toLowerCase() === normalizedMac) {
          throw new Error(`MAC '${data.mac}' is already used by '${hosts[i].name}'`);
        }
        if (hosts[i].ip === data.ip) {
          throw new Error(`IP '${data.ip}' is already used by '${hosts[i].name}'`);
        }
      }
    }

    hosts[index] = {
      name: data.name || hosts[index].name,
      mac: normalizedMac,
      ip: data.ip,
      description: data.description !== undefined ? data.description : hosts[index].description
    };

    this.saveStaticHosts(hosts);
    return hosts[index];
  }

  deleteStaticHost(idOrName) {
    const hosts = this.getStaticHosts();
    const filtered = hosts.filter(h => String(h.id) !== String(idOrName) && h.name !== idOrName);
    if (filtered.length === hosts.length) {
      throw new Error(`Host '${idOrName}' not found`);
    }
    this.saveStaticHosts(filtered);
    return { success: true };
  }
}

module.exports = new DhcpConfigService();
