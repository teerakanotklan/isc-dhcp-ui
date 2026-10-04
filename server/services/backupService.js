const fs = require('fs');
const path = require('path');
const config = require('../config/default');

class BackupService {
  constructor() {
    this.backupDir = config.backupDir;
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  createBackup(sourcePath, note = '') {
    if (!fs.existsSync(sourcePath)) return null;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `dhcpd.conf.bak_${timestamp}`;
    const targetPath = path.join(this.backupDir, filename);

    fs.copyFileSync(sourcePath, targetPath);

    // Save metadata
    const metaPath = path.join(this.backupDir, `${filename}.json`);
    const meta = {
      filename,
      timestamp: new Date().toISOString(),
      note,
      size: fs.statSync(targetPath).size
    };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

    return meta;
  }

  listBackups() {
    if (!fs.existsSync(this.backupDir)) return [];

    const files = fs.readdirSync(this.backupDir);
    const backups = [];

    for (const f of files) {
      if (f.endsWith('.json')) {
        try {
          const raw = fs.readFileSync(path.join(this.backupDir, f), 'utf8');
          backups.push(JSON.parse(raw));
        } catch (e) {
          // ignore corrupted meta
        }
      }
    }

    return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  restoreBackup(filename, targetPath = config.confPath) {
    const backupFilePath = path.join(this.backupDir, filename);
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`Backup file ${filename} not found`);
    }

    // Create a backup of the current state before restoring!
    this.createBackup(targetPath, `Auto backup before restoring ${filename}`);

    fs.copyFileSync(backupFilePath, targetPath);
    return { success: true, message: `Successfully restored backup ${filename}` };
  }
}

module.exports = new BackupService();
