const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { PrismaClient } = require('@prisma/client');

// ─── Auto-Migration: ensure Order table has all required columns ─────────────
async function runMigration() {
  const prisma = new PrismaClient();
  const missingCols = [
    { name: 'customer_name',    def: 'TEXT' },
    { name: 'customer_phone',   def: 'TEXT' },
    { name: 'customer_address', def: 'TEXT' },
    { name: 'cash_tendered',    def: 'REAL DEFAULT 0' },
    { name: 'change_due',       def: 'REAL DEFAULT 0' },
  ];

  try {
    const cols = await prisma.$queryRawUnsafe(`PRAGMA table_info("Order")`);
    const existing = cols.map(c => c.name);
    let added = 0;

    for (const col of missingCols) {
      if (!existing.includes(col.name)) {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "Order" ADD COLUMN "${col.name}" ${col.def}`
        );
        console.log(`[DB Migration] ✅ Added column: ${col.name}`);
        added++;
      }
    }

    if (added === 0) {
      console.log('[DB Migration] ✅ Order table schema is already up to date.');
    } else {
      console.log(`[DB Migration] ✅ Migration complete — ${added} column(s) added.`);
    }
  } catch (e) {
    console.error('[DB Migration] ❌ Migration error:', e.message);
    // Don't crash the server — column may already exist (race condition)
  } finally {
    await prisma.$disconnect();
  }
}
// ─────────────────────────────────────────────────────────────────────────────

async function startServer() {
  // Run DB migration BEFORE accepting any requests
  await runMigration();

  const app = require('./src/app');
  const PORT = process.env.PORT || 3001;

  const server = app.listen(PORT, () => {
    console.log(`🚀 Mesna POS Backend running on http://localhost:${PORT}`);
    console.log(`📦 API endpoints:`);
    console.log(`   GET  http://localhost:${PORT}/api/products`);
    console.log(`   POST http://localhost:${PORT}/api/checkout`);
    console.log(`   GET  http://localhost:${PORT}/api/health`);
    console.log(`   ALL  http://localhost:${PORT}/api/admin/* (Admin Protected)`);
  });

  const { initP2P } = require('./src/services/p2p');
  initP2P(server);
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
