const fs = require('fs');
const config = require('../config/default');

class DhcpLeaseService {
  constructor() {
    this.leasesPath = config.leasesPath;
  }

  parseLeaseTime(timeStr) {
    // Format: "4 2026/10/01 08:30:00" -> UTC
    if (!timeStr) return null;
    const parts = timeStr.trim().split(/\s+/);
    if (parts.length >= 3) {
      const datePart = parts[1].replace(/\//g, '-');
      const timePart = parts[2];
      return new Date(`${datePart}T${timePart}Z`);
    }
    return new Date(timeStr);
  }

  getLeases() {
    if (!fs.existsSync(this.leasesPath)) {
      return [];
    }

    const content = fs.readFileSync(this.leasesPath, 'utf8');
    const leaseBlocks = content.match(/lease\s+([0-9.]+)\s*\{([^}]*)\}/g) || [];

    // ISC DHCP leases are append-only. We want the latest lease for each IP.
    const leaseMap = new Map();
    const now = new Date();

    for (const block of leaseBlocks) {
      const ipMatch = block.match(/lease\s+([0-9.]+)/);
      if (!ipMatch) continue;
      const ip = ipMatch[1];

      const macMatch = block.match(/hardware\s+ethernet\s+([0-9a-fA-F:]{17});/i);
      const hostMatch = block.match(/client-hostname\s+"([^"]+)";/);
      const stateMatch = block.match(/binding\s+state\s+(\w+);/);
      const startsMatch = block.match(/starts\s+([^;]+);/);
      const endsMatch = block.match(/ends\s+([^;]+);/);
      const clttMatch = block.match(/cltt\s+([^;]+);/);

      const starts = startsMatch ? this.parseLeaseTime(startsMatch[1]) : null;
      const ends = endsMatch ? this.parseLeaseTime(endsMatch[1]) : null;
      const rawState = stateMatch ? stateMatch[1].toLowerCase() : 'unknown';

      let status = rawState;
      if (rawState === 'active') {
        if (ends && ends < now) {
          status = 'expired';
        } else {
          status = 'active';
        }
      }

      const leaseObj = {
        ip,
        mac: macMatch ? macMatch[1].toLowerCase() : '',
        hostname: hostMatch ? hostMatch[1] : '',
        bindingState: rawState,
        status: status,
        starts: starts ? starts.toISOString() : null,
        ends: ends ? ends.toISOString() : null,
        remainingSeconds: ends ? Math.max(0, Math.floor((ends.getTime() - now.getTime()) / 1000)) : 0
      };

      leaseMap.set(ip, leaseObj);
    }

    return Array.from(leaseMap.values()).sort((a, b) => {
      // Sort active first, then by IP
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return a.ip.localeCompare(b.ip, undefined, { numeric: true });
    });
  }

  releaseLease(ip) {
    if (!fs.existsSync(this.leasesPath)) {
      throw new Error('Leases file not found');
    }

    let content = fs.readFileSync(this.leasesPath, 'utf8');
    const regex = new RegExp(`lease\\s+${ip.replace(/\./g, '\\.')}\\s*\\{[^}]*\\}`, 'g');

    if (!regex.test(content)) {
      throw new Error(`Lease for IP ${ip} not found`);
    }

    // Append a release record
    const nowUtc = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '').replace(/-/g, '/');
    const releaseEntry = `\nlease ${ip} {\n  starts 0 ${nowUtc};\n  ends 0 ${nowUtc};\n  binding state free;\n}\n`;

    fs.appendFileSync(this.leasesPath, releaseEntry, 'utf8');
    return { success: true, message: `Lease for ${ip} marked as released/free` };
  }
}

module.exports = new DhcpLeaseService();
