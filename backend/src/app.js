const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const productsRouter = require('./routes/products');
const checkoutRouter = require('./routes/checkout');
const adminRouter    = require('./routes/admin');
const settingsRouter = require('./routes/settings');
const voiceRouter    = require('./routes/voice');

const app = express();

// ── Security: restrict CORS to same-origin localhost only ──────────────────────
// In a LAN POS setup the API is only ever called from the same machine's browser.
const allowedOrigins = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin requests (no Origin header) or explicitly-allowed origins
    if (!origin || allowedOrigins.some(r => r.test(origin))) {
      callback(null, true);
    } else {
      callback(new Error('CORS: origin not allowed'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Security: limit request body to 2 MB to prevent DoS via huge payloads ──────
app.use(express.json({ limit: '2mb' }));

// Health check
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get active cashier details for this register instance
app.get('/api/cashier/active', async (req, res) => {
  try {
    const registerId = (parseInt(process.env.PORT) || 3001) % 10;
    const cashierId = 10 + registerId;

    let user = await prisma.user.findUnique({
      where: { id: cashierId },
      select: { id: true, name: true, role: true }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: cashierId,
          name: `Cashier ${registerId}`,
          pin_hash: '',
          role: 'cashier'
        },
        select: { id: true, name: true, role: true }
      });
    }
    res.json(user);
  } catch (err) {
    console.error('Active cashier fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch active cashier' });
  }
});

// Get cashier details — validate that the ID is a positive integer
app.get('/api/cashier/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid cashier ID' });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, role: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Routes
app.use('/api/products', productsRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/admin',    adminRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/voice',    voiceRouter);

// Catch-all for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.originalUrl} not found` });
});

// Serve static files from the React frontend build
const path = require('path');
app.use(express.static(path.join(__dirname, '../public')));

// Fallback all other client-side routes to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ── Global error handler: never expose stack traces to clients ─────────────────
app.use((err, req, res, next) => {
  console.error('[Global Error]', err.stack || err.message);
  // Do NOT send err.message or err.stack to the client
  res.status(err.status || 500).json({ error: 'Internal server error' });
});

module.exports = app;
