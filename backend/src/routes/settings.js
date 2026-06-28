const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const SETTINGS_FILE = path.join(__dirname, '../../store_settings.json');

const DEFAULT_SETTINGS = {
  storeName: "MESNA STORE",
  tagline: "Retail & POS System",
  address: "Lahore, Pakistan",
  phone: "+92 300 1234567"
};

// Helper to get current settings
function getSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('Error reading store_settings.json:', error);
  }
  return DEFAULT_SETTINGS;
}

// GET /api/settings — fetch store settings (public, needed for receipt header)
router.get('/', (req, res) => {
  const settings = getSettings();
  res.json(settings);
});

// PUT /api/settings — update store settings (PROTECTED: requires admin PIN)
router.put('/', async (req, res) => {
  const { storeName, tagline, address, phone, adminPin } = req.body;

  // ── Require admin PIN to change store settings ─────────────────────────────
  if (!adminPin) {
    return res.status(401).json({ error: 'Admin PIN is required to update store settings' });
  }
  if (!/^\d{4,8}$/.test(adminPin)) {
    return res.status(400).json({ error: 'Invalid PIN format' });
  }

  if (!storeName || !address || !phone) {
    return res.status(400).json({ error: 'Store Name, Address, and Phone are required' });
  }

  // Validate field lengths to prevent abuse
  if (storeName.trim().length > 100 || address.trim().length > 200 || phone.trim().length > 30) {
    return res.status(400).json({ error: 'Field values are too long' });
  }

  try {
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!admin) return res.status(404).json({ error: 'Admin user not found' });

    const isValid = await bcrypt.compare(adminPin, admin.pin_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid Admin PIN' });
    }

    const newSettings = {
      storeName: storeName.trim(),
      tagline: tagline ? tagline.trim().substring(0, 100) : '',
      address: address.trim(),
      phone: phone.trim()
    };

    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(newSettings, null, 2), 'utf8');
    res.json({ success: true, settings: newSettings });
  } catch (error) {
    console.error('Error writing store_settings.json:', error);
    res.status(500).json({ error: 'Failed to save store settings' });
  }
});

module.exports = router;
