const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { broadcastP2P } = require('../services/p2p');

// ─── One-time self-healing migration (runs on first checkout request) ────────
let _orderTableReady = false;

// Whitelist of allowed column definitions — prevents any SQL injection via col.def
const ALLOWED_COLUMN_DEFS = {
  customer_name:    'TEXT',
  customer_phone:   'TEXT',
  customer_address: 'TEXT',
  cash_tendered:    'REAL DEFAULT 0',
  change_due:       'REAL DEFAULT 0',
};

async function ensureOrderColumns() {
  if (_orderTableReady) return;
  const cols = await prisma.$queryRawUnsafe(`PRAGMA table_info("Order")`);
  const existing = cols.map(c => c.name);

  for (const [colName, colDef] of Object.entries(ALLOWED_COLUMN_DEFS)) {
    if (!existing.includes(colName)) {
      // Column name is from our own whitelist — safe to interpolate
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "Order" ADD COLUMN "${colName}" ${colDef}`
        );
        console.log(`[Checkout] DB fix: added column "${colName}"`);
      } catch (e) {
        if (!e.message.includes('duplicate column')) throw e;
      }
    }
  }
  _orderTableReady = true;
}
// ─────────────────────────────────────────────────────────────────────────────

// Input helpers
function isPositiveInt(val) {
  const n = parseInt(val, 10);
  return Number.isInteger(n) && n > 0;
}
function isFiniteFloat(val) {
  const n = parseFloat(val);
  return Number.isFinite(n) && n >= 0;
}

// POST /api/checkout — process a sale transaction
router.post('/', async (req, res) => {
  const {
    cashier_id, payment_method, discount_applied, items,
    customer_name, customer_phone, customer_address,
    cash_tendered, change_due
  } = req.body;

  // --- Validation ---
  if (!cashier_id || !payment_method || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Missing required fields: cashier_id, payment_method, items[]' });
  }
  if (!['cash', 'card'].includes(payment_method)) {
    return res.status(400).json({ error: 'payment_method must be "cash" or "card"' });
  }
  if (!isPositiveInt(cashier_id)) {
    return res.status(400).json({ error: 'cashier_id must be a positive integer' });
  }

  // Validate discount range
  const discountNum = parseFloat(discount_applied) || 0;
  if (discountNum < 0 || discountNum > 100) {
    return res.status(400).json({ error: 'discount_applied must be between 0 and 100' });
  }

  // Validate each cart item — product_id and quantity must be positive ints
  for (const item of items) {
    if (!isPositiveInt(item.product_id) || !isPositiveInt(item.quantity)) {
      return res.status(400).json({ error: 'Each item must have a valid product_id and quantity (positive integers)' });
    }
    // price_at_sale must be a non-negative finite number
    if (!isFiniteFloat(item.price_at_sale)) {
      return res.status(400).json({ error: `Invalid price_at_sale for item product_id=${item.product_id}` });
    }
  }

  // Sanitize optional string fields
  const safeCustomerName    = customer_name    ? String(customer_name).trim().substring(0, 100)    : null;
  const safeCustomerPhone   = customer_phone   ? String(customer_phone).trim().substring(0, 30)    : null;
  const safeCustomerAddress = customer_address ? String(customer_address).trim().substring(0, 200) : null;

  try {
    // Ensure all required columns exist BEFORE the transaction touches the Order table
    await ensureOrderColumns();

    // --- Run everything inside a Prisma transaction ---
    const result = await prisma.$transaction(async (tx) => {

      // 1. Validate stock AND verify server-side price for all items
      const serverItems = [];
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.product_id } });
        if (!product) throw new Error(`Product ID ${item.product_id} not found`);
        if (product.stock_quantity < item.quantity) {
          throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock_quantity}, Requested: ${item.quantity}`);
        }
        // ── Security: use server-side price, ignore client-supplied price_at_sale ──
        serverItems.push({ ...item, price_at_sale: product.price });
      }

      // 2. Calculate total using SERVER prices (not client-supplied)
      const subtotal = serverItems.reduce((sum, item) => sum + item.price_at_sale * item.quantity, 0);
      const discountDecimal = discountNum / 100;
      const discountedSubtotal = subtotal * (1 - discountDecimal);
      const tax = discountedSubtotal * 0.085;
      const total_amount = parseFloat((discountedSubtotal + tax).toFixed(2));

      // 3. Get next ID using raw SQL (avoids Prisma selecting missing columns)
      const registerId = (parseInt(process.env.PORT) || 3001) % 10;
      const rows = await tx.$queryRawUnsafe(`SELECT id FROM "Order" ORDER BY id DESC LIMIT 1`);
      let nextSeq = 1;
      if (rows.length > 0) {
        const lastSeq = Math.floor(Number(rows[0].id) / 10);
        nextSeq = lastSeq + 1;
      }
      const orderId = nextSeq * 10 + registerId;

      // 4. Create the Order record with raw INSERT to avoid any schema mismatch
      await tx.$executeRawUnsafe(
        `INSERT INTO "Order" (
          id, total_amount, discount_applied, payment_method, cashier_id,
          customer_name, customer_phone, customer_address,
          cash_tendered, change_due, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        orderId,
        total_amount,
        discountNum,
        payment_method,
        parseInt(cashier_id, 10),
        safeCustomerName,
        safeCustomerPhone,
        safeCustomerAddress,
        cash_tendered != null ? parseFloat(cash_tendered) : 0,
        change_due != null ? parseFloat(change_due) : 0
      );

      // 5. Create all OrderItem records & decrement stock (use server-side prices)
      for (const item of serverItems) {
        await tx.orderItem.create({
          data: {
            order_id:      orderId,
            product_id:    item.product_id,
            quantity:      item.quantity,
            price_at_sale: item.price_at_sale, // server price
          },
        });

        await tx.product.update({
          where: { id: item.product_id },
          data:  { stock_quantity: { decrement: item.quantity } },
        });
      }

      // 6. Return the full order using raw SQL + separate items fetch
      const orderRows = await tx.$queryRawUnsafe(`
        SELECT
          o.id, o.total_amount, o.discount_applied, o.payment_method,
          o.cashier_id, o.customer_name, o.customer_phone, o.customer_address,
          o.cash_tendered, o.change_due, o.timestamp,
          u.name as cashier_name, u.role as cashier_role
        FROM "Order" o
        LEFT JOIN "User" u ON u.id = o.cashier_id
        WHERE o.id = ?
      `, orderId);

      const orderItemRows = await tx.$queryRawUnsafe(`
        SELECT
          oi.id, oi.order_id, oi.product_id, oi.quantity, oi.price_at_sale,
          p.name as product_name, p.sku_barcode, p.price as product_price, p.category
        FROM "OrderItem" oi
        LEFT JOIN "Product" p ON p.id = oi.product_id
        WHERE oi.order_id = ?
      `, orderId);

      const order = orderRows[0];
      order.cashier = { id: order.cashier_id, name: order.cashier_name, role: order.cashier_role };
      order.items = orderItemRows.map(oi => ({
        id: oi.id,
        order_id: oi.order_id,
        product_id: oi.product_id,
        quantity: oi.quantity,
        price_at_sale: oi.price_at_sale,
        product: {
          id: oi.product_id,
          name: oi.product_name,
          sku_barcode: oi.sku_barcode,
          price: oi.product_price,
          category: oi.category,
        },
      }));

      return order;
    });

    // Broadcast the new transaction to other registers in the local mesh network
    broadcastP2P({ type: 'new-order', order: result });

    res.status(201).json({ success: true, order: result });

  } catch (error) {
    console.error('Checkout error:', error.message);
    const isValidationError = error.message.includes('Insufficient') || error.message.includes('not found');
    res.status(isValidationError ? 400 : 500).json({ error: error.message });
  }
});

module.exports = router;
