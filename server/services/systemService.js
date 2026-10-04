const { execSync } = require('child_process');
const config = require('../config/default');

class SystemService {
  constructor() {
    this.serviceName = config.serviceName;
  }

  getServiceStatus() {
    try {
      const output = execSync(`sudo systemctl status ${this.serviceName}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const isActive = output.includes('Active: active (running)');
      const pidMatch = output.match(/Main PID:\s+(\d+)/);
      const sinceMatch = output.match(/Active: active \(running\) since (.+);/);

      return {
        service: this.serviceName,
        active: isActive,
        status: isActive ? 'active (running)' : 'inactive',
        pid: pidMatch ? parseInt(pidMatch[1], 10) : null,
        since: sinceMatch ? sinceMatch[1] : null,
        raw: output
      };
    } catch (err) {
      const output = ((err.stdout || '') + '\n' + (err.stderr || '')).trim();
      const isActive = output.includes('Active: active (running)');
      const pidMatch = output.match(/Main PID:\s+(\d+)/);
      const sinceMatch = output.match(/Active: active \(running\) since (.+);/);

      return {
        service: this.serviceName,
        active: isActive,
        status: isActive ? 'active (running)' : 'inactive (dead)',
        pid: pidMatch ? parseInt(pidMatch[1], 10) : null,
        since: sinceMatch ? sinceMatch[1] : null,
        raw: output || err.message,
        error: err.message
      };
    }
  }

  controlService(action) {
    const validActions = ['restart', 'reload', 'stop', 'start'];
    if (!validActions.includes(action)) {
      throw new Error(`Invalid service action: ${action}`);
    }

    try {
      execSync(`sudo systemctl ${action} ${this.serviceName}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return {
        success: true,
        message: `Service ${this.serviceName} ${action} executed successfully`
      };
    } catch (err) {
      const errMsg = (err.stderr || err.stdout || err.message).toString().trim();
      throw new Error(`Failed to ${action} service: ${errMsg}`);
    }
  }

  validateDhcpConfig(customPath = null) {
    const pathToCheck = customPath || config.confPath;

    try {
      const output = execSync(`sudo dhcpd -t -cf "${pathToCheck}" 2>&1`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return { success: true, output };
    } catch (err) {
      const errorText = (err.stdout || err.stderr || err.message).toString().trim();
      return { success: false, error: errorText };
    }
  }

  getLogs(limit = 100) {
    try {
      const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
      const output = execSync(`sudo journalctl -u ${this.serviceName} -n ${safeLimit} --no-pager`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const lines = output.trim().split('\n').filter(Boolean);
      return lines.map((line) => ({
        timestamp: line.slice(0, 15).trim(),
        message: line.slice(16).trim()
      }));
    } catch (err) {
      return [
        {
          timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
          message: `Notice: System logs query unavailable (${err.message}). Verify sudoers permissions.`
        }
      ];
    }
  }
}

module.exports = new SystemService();
