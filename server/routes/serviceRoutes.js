const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const systemService = require('../services/systemService');

// GET /api/service/status
router.get('/status', authMiddleware, (req, res) => {
  try {
    const status = systemService.getServiceStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/service/control
router.post('/control', authMiddleware, (req, res) => {
  const { action } = req.body;
  if (!action) {
    return res.status(400).json({ error: 'Action is required (restart, reload, stop, start)' });
  }

  try {
    const result = systemService.controlService(action);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/service/logs
router.get('/logs', authMiddleware, (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const logs = systemService.getLogs(limit);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
