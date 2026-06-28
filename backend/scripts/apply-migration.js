/**
 * apply-migration.js
 * Adds missing customer & payment columns to the Order table using Prisma.
 * Safe to run multiple times — skips columns that already exist.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('===========================================');
  console.log('  Mesna POS - Database Column Migration');
  console.log('===========================================');
  console.log('');
  console.log('Checking Order table columns...');

  // SQLite: get column info via PRAGMA
  const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info("Order")`);
  const existing = columns.map(c => c.name);
  console.log('Current columns:', existing.join(', '));
  console.log('');

  const toAdd = [
    { name: 'customer_name',    def: 'TEXT' },
    { name: 'customer_phone',   def: 'TEXT' },
    { name: 'customer_address', def: 'TEXT' },
    { name: 'cash_tendered',    def: 'REAL DEFAULT 0' },
    { name: 'change_due',       def: 'REAL DEFAULT 0' },
  ];

  let changed = 0;
  for (const col of toAdd) {
    if (!existing.includes(col.name)) {
      try {
        const sql = `ALTER TABLE "Order" ADD COLUMN "${col.name}" ${col.def}`;
        console.log('Adding column:', col.name);
        await prisma.$executeRawUnsafe(sql);
        console.log('  ✓ Added successfully');
        changed++;
      } catch (err) {
        // Column may have been added by a parallel process
        if (err.message.includes('duplicate column')) {
          console.log('  (already exists, skipped)');
        } else {
          throw err;
        }
      }
    } else {
      console.log('✓ Column "' + col.name + '" already present');
    }
  }

  console.log('');
  if (changed > 0) {
    console.log('SUCCESS: ' + changed + ' column(s) added to database!');
    console.log('Please restart the POS backend for changes to take effect.');
  } else {
    console.log('INFO: All columns already present — no changes needed.');
    console.log('The error may be caused by a stale Prisma client.');
    console.log('Try restarting the POS backend.');
  }
  console.log('');
}

main()
  .catch(e => {
    console.error('');
    console.error('FAILED: ' + e.message);
    console.error('');
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
