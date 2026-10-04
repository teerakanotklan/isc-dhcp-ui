const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const dhcpConfigService = require('../services/dhcpConfigService');

// GET /api/subnets
router.get('/', authMiddleware, (req, res) => {
  try {
    const subnets = dhcpConfigService.getSubnets();
    res.json(subnets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subnets
router.post('/', authMiddleware, (req, res) => {
  const { subnet, netmask, rangeStart, rangeEnd, routers, domainNameServers, domainName, defaultLeaseTime, maxLeaseTime } = req.body;
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
      subnet,
      netmask,
      rangeStart: rangeStart || '',
      rangeEnd: rangeEnd || '',
      routers: routers || '',
      subnetMask: netmask,
      broadcastAddress: req.body.broadcastAddress || '',
      domainNameServers: domainNameServers || '',
      domainName: domainName || '',
      defaultLeaseTime: defaultLeaseTime ? parseInt(defaultLeaseTime, 10) : '',
      maxLeaseTime: maxLeaseTime ? parseInt(maxLeaseTime, 10) : '',
      customOptions: Array.isArray(req.body.customOptions) ? req.body.customOptions : []
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/subnets/:subnet
router.put('/:subnet', authMiddleware, (req, res) => {
  try {
    const updated = dhcpConfigService.updateSubnet(req.params.subnet, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/subnets/:subnet
router.delete('/:subnet', authMiddleware, (req, res) => {
  try {
    const result = dhcpConfigService.deleteSubnet(req.params.subnet);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
