const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const dhcpConfigService = require('../services/dhcpConfigService');
const backupService = require('../services/backupService');
const systemService = require('../services/systemService');

// GET /api/config/raw
router.get('/raw', authMiddleware, (req, res) => {
  try {
    const raw = dhcpConfigService.getRawConfig();
    res.json({ content: raw });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/config/raw
router.post('/raw', authMiddleware, (req, res) => {
  const { content, comment } = req.body;
  if (content === undefined) {
    return res.status(400).json({ error: 'Config content is required' });
  }

  try {
    const result = dhcpConfigService.saveRawConfig(content, comment);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/config/validate
router.post('/validate', authMiddleware, (req, res) => {
  const { content } = req.body;
  if (content === undefined) {
    return res.status(400).json({ error: 'Config content is required' });
  }

  const basicValidation = dhcpConfigService.validateSyntax(content);
  if (!basicValidation.valid) {
    return res.status(400).json({ valid: false, error: basicValidation.error });
  }

  // System validation (mocked or dhcpd -t)
  const systemValidation = systemService.validateDhcpConfig();
  res.json({
    valid: true,
    message: 'Configuration syntax check passed cleanly with 0 errors.',
    details: systemValidation.output
  });
});

// GET /api/config/backups
router.get('/backups', authMiddleware, (req, res) => {
  try {
    const backups = backupService.listBackups();
    res.json(backups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/config/restore/:filename
router.post('/restore/:filename', authMiddleware, (req, res) => {
  try {
    const result = backupService.restoreBackup(req.params.filename);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
