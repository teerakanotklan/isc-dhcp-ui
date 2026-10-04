const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const dhcpConfigService = require('../services/dhcpConfigService');

// GET /api/subnets or /api/scopes
router.get('/', authMiddleware, (req, res) => {
  try {
    const subnets = dhcpConfigService.getSubnets();
    res.json(subnets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/subnets/:id (by numeric id or subnet IP)
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const subnet = dhcpConfigService.getSubnetById(req.params.id);
    if (!subnet) {
      return res.status(404).json({ error: `Scope '${req.params.id}' not found` });
    }
    res.json(subnet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subnets
router.post('/', authMiddleware, (req, res) => {
  const { name, subnet, netmask, rangeStart, rangeEnd, routers, domainNameServers, domainName, defaultLeaseTime, disabled } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Scope name is required' });
  }
  if (!subnet || !netmask) {
    return res.status(400).json({ error: 'Subnet and netmask are required' });
  }

  // Validate IP formats
  const ipRegex = /^([0-9]{1,3}\.){3}[0-9]{1,3}$/;
  if (!ipRegex.test(subnet) || !ipRegex.test(netmask)) {
    return res.status(400).json({ error: 'Invalid IP format for subnet or netmask' });
  }

  if (rangeStart && !ipRegex.test(rangeStart)) {
    return res.status(400).json({ error: 'Invalid range start IP' });
  }
  if (rangeEnd && !ipRegex.test(rangeEnd)) {
    return res.status(400).json({ error: 'Invalid range end IP' });
  }

  try {
    const created = dhcpConfigService.createSubnet({
      name: String(name).trim(),
      subnet,
      netmask,
      disabled: Boolean(disabled),
      rangeStart: rangeStart || '',
      rangeEnd: rangeEnd || '',
      routers: routers || '',
      subnetMask: netmask,
      domainNameServers: domainNameServers || '',
      domainName: domainName || '',
      defaultLeaseTime: defaultLeaseTime ? parseInt(defaultLeaseTime, 10) : '',
      customOptions: Array.isArray(req.body.customOptions) ? req.body.customOptions : []
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/subnets/:id/toggle (toggle disabled/enabled)
router.patch('/:id/toggle', authMiddleware, (req, res) => {
  try {
    const updated = dhcpConfigService.toggleSubnetDisabled(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/subnets/:id (by numeric id or subnet IP)
router.put('/:id', authMiddleware, (req, res) => {
  if (!req.body.name || !String(req.body.name).trim()) {
    return res.status(400).json({ error: 'Scope name is required' });
  }
  req.body.name = String(req.body.name).trim();
  try {
    const updated = dhcpConfigService.updateSubnet(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/subnets/:id (by numeric id or subnet IP)
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const result = dhcpConfigService.deleteSubnet(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
