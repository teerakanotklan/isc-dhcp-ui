const { execSync, exec } = require('child_process');
const config = require('../config/default');

class SystemService {
  constructor() {
    this.serviceName = config.serviceName;
    this.isMock = config.isMock;
    this.mockState = {
      active: true,
      status: 'active (running)',
      uptime: new Date(Date.now() - 3600000 * 28).toISOString(), // 28 hours uptime
      pid: 1420
    };
    this.mockLogs = [];
  }

  getServiceStatus() {
    if (this.isMock) {
      return {
        service: this.serviceName,
        active: this.mockState.active,
        status: this.mockState.status,
        pid: this.mockState.pid,
        since: this.mockState.uptime,
        mode: 'mock',
        isMock: true
      };
    }

    try {
      const output = execSync(`systemctl status ${this.serviceName}`, { encoding: 'utf8' });
      const isActive = output.includes('Active: active (running)');
      const pidMatch = output.match(/Main PID:\s+(\d+)/);
      const sinceMatch = output.match(/Active: active \(running\) since (.+);/);

      return {
        service: this.serviceName,
        active: isActive,
        status: isActive ? 'active (running)' : 'inactive',
        pid: pidMatch ? parseInt(pidMatch[1], 10) : null,
        since: sinceMatch ? sinceMatch[1] : null,
        raw: output,
        mode: 'real',
        isMock: false
      };
    } catch (err) {
      return {
        service: this.serviceName,
        active: false,
        status: 'error / stopped',
        error: err.message,
        mode: 'real',
        isMock: false
      };
    }
  }

  controlService(action) {
    const validActions = ['restart', 'reload', 'stop', 'start'];
    if (!validActions.includes(action)) {
      throw new Error(`Invalid service action: ${action}`);
    }

    if (this.isMock) {
      if (action === 'stop') {
        this.mockState.active = false;
        this.mockState.status = 'inactive (dead)';
      } else {
        this.mockState.active = true;
        this.mockState.status = 'active (running)';
        this.mockState.uptime = new Date().toISOString();
      }
      this.mockLogs.unshift({
        timestamp: new Date().toISOString(),
        message: `systemd: isc-dhcp-server service ${action} completed successfully (mocked).`
      });
      return { success: true, message: `Service ${this.serviceName} ${action} successful (mock mode)` };
    }

    try {
      execSync(`sudo systemctl ${action} ${this.serviceName}`, { encoding: 'utf8' });
      return { success: true, message: `Service ${this.serviceName} ${action} executed successfully` };
    } catch (err) {
      throw new Error(`Failed to ${action} service: ${err.message}`);
    }
  }

  validateDhcpConfig(customPath = null) {
    const pathToCheck = customPath || config.confPath;
    if (this.isMock) {
      return { success: true, output: 'Syntax test passed: Configuration file /etc/dhcp/dhcpd.conf has no syntax errors' };
    }

    try {
      const output = execSync(`dhcpd -t -cf ${pathToCheck} 2>&1`, { encoding: 'utf8' });
      return { success: true, output };
    } catch (err) {
      return { success: false, error: err.stdout || err.message };
    }
  }

  getLogs(limit = 100) {
    if (this.isMock) {
      return this.mockLogs.slice(0, limit);
    }

    try {
      const output = execSync(`journalctl -u ${this.serviceName} -n ${limit} --no-pager`, { encoding: 'utf8' });
      const lines = output.trim().split('\n');
      return lines.map(line => ({
        timestamp: line.slice(0, 15),
        message: line.slice(16)
      }));
    } catch (err) {
      return [
        { timestamp: new Date().toISOString(), message: `Failed to read journalctl: ${err.message}` }
      ];
    }
  }
}

module.exports = new SystemService();
