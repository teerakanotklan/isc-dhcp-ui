const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/default');

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const subnetRoutes = require('./routes/subnetRoutes');
const staticHostRoutes = require('./routes/staticHostRoutes');
const leaseRoutes = require('./routes/leaseRoutes');
const configRoutes = require('./routes/configRoutes');
const serviceRoutes = require('./routes/serviceRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/subnets', subnetRoutes);
app.use('/api/scopes', subnetRoutes);
app.use('/api/static-hosts', staticHostRoutes);
app.use('/api/leases', leaseRoutes);
app.use('/api/config', configRoutes);
app.use('/api/service', serviceRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: config.isMock ? 'mock' : 'real',
    service: config.serviceName,
    time: new Date().toISOString()
  });
});

// Serve frontend in production build if client/dist exists
const clientDist = path.join(__dirname, '..', 'client', 'dist');
const fs = require('fs');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[API Error]:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(config.port, () => {
  console.log(`===============================================`);
  console.log(`ISC DHCP Server Web Management API`);
  console.log(`Running on: http://localhost:${config.port}`);
  console.log(`Mode:       ${config.isMock ? 'MOCK (Simulated files & service)' : 'REAL (Linux host)'}`);
  console.log(`Config:     ${config.confPath}`);
  console.log(`Leases:     ${config.leasesPath}`);
  console.log(`===============================================`);
});
