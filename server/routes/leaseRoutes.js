const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const dhcpLeaseService = require('../services/dhcpLeaseService');

// GET /api/leases
router.get('/', authMiddleware, (req, res) => {
  try {
    let leases = dhcpLeaseService.getLeases();
    const { status, search } = req.query;

    if (status && status !== 'all') {
      leases = leases.filter(l => l.status === status);
    }

    if (search) {
      const q = search.toLowerCase();
      leases = leases.filter(l =>
        l.ip.includes(q) ||
        (l.mac && l.mac.toLowerCase().includes(q)) ||
        (l.hostname && l.hostname.toLowerCase().includes(q))
      );
    }

    res.json({
      total: leases.length,
      leases
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leases/:ip/release
router.post('/:ip/release', authMiddleware, (req, res) => {
  try {
    const result = dhcpLeaseService.releaseLease(req.params.ip);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
