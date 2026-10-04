const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const dhcpConfigService = require('../services/dhcpConfigService');

const MAC_REGEX = /^([0-9a-fA-F]{2}[:-]){5}([0-9a-fA-F]{2})$/;
const IP_REGEX = /^([0-9]{1,3}\.){3}[0-9]{1,3}$/;

// GET /api/static-hosts
router.get('/', authMiddleware, (req, res) => {
  try {
    const hosts = dhcpConfigService.getStaticHosts();
    res.json(hosts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/static-hosts
router.post('/', authMiddleware, (req, res) => {
  const { name, mac, ip, description } = req.body;

  if (!name || !mac || !ip) {
    return res.status(400).json({ error: 'Name, MAC address, and Fixed IP are required' });
  }

  const cleanMac = mac.trim().replace(/-/g, ':').toLowerCase();
  if (!MAC_REGEX.test(cleanMac)) {
    return res.status(400).json({ error: 'Invalid MAC address format (expected e.g. 00:11:22:33:44:55)' });
  }

  const cleanIp = ip.trim();
  if (!IP_REGEX.test(cleanIp)) {
    return res.status(400).json({ error: 'Invalid IP address format' });
  }

  const cleanName = name.trim().replace(/\s+/g, '-');

  try {
    const created = dhcpConfigService.createStaticHost({
      name: cleanName,
      mac: cleanMac,
      ip: cleanIp,
      description: description ? description.trim() : ''
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/static-hosts/:name
router.put('/:name', authMiddleware, (req, res) => {
  const { name, mac, ip, description } = req.body;

  let cleanMac = mac;
  if (mac) {
    cleanMac = mac.trim().replace(/-/g, ':').toLowerCase();
    if (!MAC_REGEX.test(cleanMac)) {
      return res.status(400).json({ error: 'Invalid MAC address format' });
    }
  }

  let cleanIp = ip;
  if (ip) {
    cleanIp = ip.trim();
    if (!IP_REGEX.test(cleanIp)) {
      return res.status(400).json({ error: 'Invalid IP address format' });
    }
  }

  try {
    const updated = dhcpConfigService.updateStaticHost(req.params.name, {
      name: name ? name.trim().replace(/\s+/g, '-') : undefined,
      mac: cleanMac,
      ip: cleanIp,
      description
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/static-hosts/:name
router.delete('/:name', authMiddleware, (req, res) => {
  try {
    const result = dhcpConfigService.deleteStaticHost(req.params.name);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
