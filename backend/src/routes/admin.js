const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
const { broadcastP2P } = require('../services/p2p');

// ── Brute-force protection for PIN endpoints ───────────────────────────────────
// Simple in-memory rate limiter: max 5 attempts per 15 minutes per IP
const pinAttempts = new Map(); // key: IP, value: { count, resetAt }
const PIN_MAX_ATTEMPTS = 5;
const PIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkPinRateLimit(req, res) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = pinAttempts.get(ip) || { count: 0, resetAt: now + PIN_WINDOW_MS };

  if (now > entry.resetAt) {
    // Window expired — reset
    entry.count = 0;
    entry.resetAt = now + PIN_WINDOW_MS;
  }

  if (entry.count >= PIN_MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    res.set('Retry-After', retryAfterSec);
    res.status(429).json({
      error: `Too many failed PIN attempts. Try again in ${Math.ceil(retryAfterSec / 60)} minute(s).`
    });
    return false;
  }

  entry.count++;
  pinAttempts.set(ip, entry);
  return true;
}

function resetPinRateLimit(req) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  pinAttempts.delete(ip);
}

// ── Input sanitization helpers ─────────────────────────────────────────────────
function isPositiveInt(val) {
  const n = parseInt(val, 10);
  return Number.isInteger(n) && n > 0;
}
function isFiniteFloat(val) {
  const n = parseFloat(val);
  return Number.isFinite(n) && n >= 0;
}

// POST /api/admin/products — create new product
router.post('/products', async (req, res) => {
  const { sku_barcode, name, price, cost, stock_quantity, category } = req.body;

  if (!sku_barcode || !name || price == null || cost == null || !category) {
    return res.status(400).json({ error: 'Missing required fields: sku_barcode, name, price, cost, category' });
  }

  // Validate numeric fields
  if (!isFiniteFloat(price) || !isFiniteFloat(cost)) {
    return res.status(400).json({ error: 'price and cost must be non-negative numbers' });
  }
  if (stock_quantity != null && !isPositiveInt(stock_quantity) && parseInt(stock_quantity) !== 0) {
    return res.status(400).json({ error: 'stock_quantity must be a non-negative integer' });
  }

  try {
    // Check for duplicate SKU
    const existing = await prisma.product.findUnique({ where: { sku_barcode } });
    if (existing) {
      return res.status(409).json({ error: `Barcode/SKU "${sku_barcode}" already exists` });
    }

    const product = await prisma.product.create({
      data: {
        sku_barcode: sku_barcode.trim(),
        name: name.trim(),
        price: parseFloat(price),
        cost: parseFloat(cost),
        stock_quantity: parseInt(stock_quantity) || 0,
        category: category.trim(),
      },
    });
    res.status(201).json({ success: true, product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/admin/products/:id — update product
router.put('/products/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }
  const { sku_barcode, name, price, cost, stock_quantity, category } = req.body;

  // Validate numeric fields if provided
  if (price != null && !isFiniteFloat(price)) {
    return res.status(400).json({ error: 'price must be a non-negative number' });
  }
  if (cost != null && !isFiniteFloat(cost)) {
    return res.status(400).json({ error: 'cost must be a non-negative number' });
  }

  try {
    // Check SKU conflict with another product
    if (sku_barcode) {
      const conflict = await prisma.product.findFirst({
        where: { sku_barcode, NOT: { id } },
      });
      if (conflict) {
        return res.status(409).json({ error: `Barcode/SKU "${sku_barcode}" already used by another product` });
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(sku_barcode    && { sku_barcode: sku_barcode.trim() }),
        ...(name           && { name: name.trim() }),
        ...(price != null  && { price: parseFloat(price) }),
        ...(cost != null   && { cost: parseFloat(cost) }),
        ...(stock_quantity != null && { stock_quantity: parseInt(stock_quantity) }),
        ...(category       && { category: category.trim() }),
      },
    });
    // Sync inventory update across all terminals
    broadcastP2P({ type: 'stock-update', productId: product.id, newQuantity: product.stock_quantity });

    res.json({ success: true, product });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Product not found' });
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// PATCH /api/admin/products/:id/restock — add to stock quantity
router.patch('/products/:id/restock', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }
  const { quantity } = req.body;

  if (!quantity || parseInt(quantity) <= 0) {
    return res.status(400).json({ error: 'quantity must be a positive number' });
  }

  try {
    const product = await prisma.product.update({
      where: { id },
      data: { stock_quantity: { increment: parseInt(quantity) } },
    });
    // Sync inventory restock across all terminals
    broadcastP2P({ type: 'stock-update', productId: product.id, newQuantity: product.stock_quantity });

    res.json({ success: true, product });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Product not found' });
    res.status(500).json({ error: 'Failed to restock product' });
  }
});

// DELETE /api/admin/products/:id — delete product
router.delete('/products/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }
  try {
    await prisma.product.delete({ where: { id } });
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Product not found' });
    // P2003 = FK constraint (product has order history)
    if (error.code === 'P2003') return res.status(409).json({ error: 'Cannot delete: product has sales history. Set stock to 0 instead.' });
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// GET /api/admin/categories — get all unique categories
router.get('/categories', async (req, res) => {
  try {
    const products = await prisma.product.findMany({ select: { category: true } });
    const categories = [...new Set(products.map(p => p.category))].sort();
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/admin/orders — fetch full sales history
router.get('/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: { include: { product: true } },
        cashier: { select: { name: true } },
      },
      orderBy: { timestamp: 'desc' },
    });
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sales history' });
  }
});

// GET /api/admin/top-products — analytics for best sellers
router.get('/top-products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        _count: { select: { orderItems: true } },
        orderItems: true,
      },
    });

    const report = products.map(p => {
      const unitsSold = p.orderItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalRevenue = p.orderItems.reduce((sum, item) => sum + (item.quantity * item.price_at_sale), 0);
      return {
        id: p.id,
        name: p.name,
        sku: p.sku_barcode,
        category: p.category,
        unitsSold,
        totalRevenue,
      };
    }).sort((a, b) => b.unitsSold - a.unitsSold);

    res.json({ topProducts: report });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate product report' });
  }
});

// GET /api/admin/stats — dashboard summary
router.get('/stats', async (req, res) => {
  try {
    const [totalProducts, totalOrders, lowStock] = await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.product.count({ where: { stock_quantity: { lte: 5 } } }),
    ]);
    const revenue = await prisma.order.aggregate({ _sum: { total_amount: true } });
    res.json({
      totalProducts,
      totalOrders,
      lowStockCount: lowStock,
      totalRevenue: revenue._sum.total_amount || 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// POST /api/admin/verify-pin — verify admin pin (rate-limited)
router.post('/verify-pin', async (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'PIN required' });

  // Enforce PIN format: digits only, 4–8 characters
  if (!/^\d{4,8}$/.test(pin)) {
    return res.status(400).json({ error: 'PIN must be 4–8 digits' });
  }

  // Check rate limit BEFORE hitting the database
  if (!checkPinRateLimit(req, res)) return;

  try {
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!admin) return res.status(404).json({ error: 'Admin user not found' });

    const isValid = await bcrypt.compare(pin, admin.pin_hash);
    if (isValid) {
      resetPinRateLimit(req); // Clear fail counter on success
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'Invalid PIN' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify PIN' });
  }
});

// POST /api/admin/change-pin — update admin pin (rate-limited)
router.post('/change-pin', async (req, res) => {
  const { currentPin, newPin } = req.body;
  if (!currentPin || !newPin) {
    return res.status(400).json({ error: 'Current PIN and New PIN are required' });
  }

  // Validate PIN format
  if (!/^\d{4,8}$/.test(currentPin) || !/^\d{4,8}$/.test(newPin)) {
    return res.status(400).json({ error: 'PINs must be 4–8 digits' });
  }

  if (!checkPinRateLimit(req, res)) return;

  try {
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!admin) return res.status(404).json({ error: 'Admin user not found' });

    const isValid = await bcrypt.compare(currentPin, admin.pin_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current PIN is incorrect' });
    }

    const newHash = await bcrypt.hash(newPin, 12); // Use async bcrypt + stronger cost factor
    await prisma.user.update({
      where: { id: admin.id },
      data: { pin_hash: newHash },
    });

    resetPinRateLimit(req);
    res.json({ success: true, message: 'PIN updated successfully' });
  } catch (error) {
    console.error('Change PIN error:', error);
    res.status(500).json({ error: 'Failed to update PIN' });
  }
});

// POST /api/admin/update-cashier — update cashier name (protected by admin PIN check)
router.post('/update-cashier', async (req, res) => {
  const { cashierId, newName, adminPin } = req.body;

  if (!cashierId || !newName || !adminPin) {
    return res.status(400).json({ error: 'cashierId, newName, and adminPin are required' });
  }

  // Validate cashier ID and name length
  if (!isPositiveInt(cashierId)) {
    return res.status(400).json({ error: 'Invalid cashier ID' });
  }
  if (newName.trim().length < 2 || newName.trim().length > 50) {
    return res.status(400).json({ error: 'Name must be 2–50 characters' });
  }

  if (!checkPinRateLimit(req, res)) return;

  try {
    // 1. Verify admin PIN
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!admin) return res.status(404).json({ error: 'Admin user not found' });

    const isValid = await bcrypt.compare(adminPin, admin.pin_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid Admin PIN' });
    }

    resetPinRateLimit(req);

    // 2. Prevent updating admin's own record via this endpoint
    if (parseInt(cashierId) === admin.id) {
      return res.status(403).json({ error: 'Cannot modify the admin user via this endpoint' });
    }

    // 3. Update Cashier name in the database
    const cashier = await prisma.user.update({
      where: { id: parseInt(cashierId, 10) },
      data: { name: newName.trim() },
    });

    res.json({ success: true, cashier });
  } catch (error) {
    console.error('Update cashier error:', error);
    if (error.code === 'P2025') return res.status(404).json({ error: 'Cashier not found' });
    res.status(500).json({ error: 'Failed to update cashier name' });
  }
});

// DELETE /api/admin/orders/:id — void/delete a wrong order (admin PIN required)
router.delete('/orders/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid order ID' });
  }
  const { adminPin } = req.body;

  if (!adminPin) return res.status(400).json({ error: 'Admin PIN required' });
  if (!/^\d{4,8}$/.test(adminPin)) return res.status(400).json({ error: 'Invalid PIN format' });

  if (!checkPinRateLimit(req, res)) return;

  try {
    // 1. Verify admin PIN
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!admin) return res.status(404).json({ error: 'Admin user not found' });
    const isValid = await bcrypt.compare(adminPin, admin.pin_hash);
    if (!isValid) return res.status(401).json({ error: 'Invalid Admin PIN' });

    resetPinRateLimit(req);

    // 2. Fetch order + items to restore stock
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // 3. Delete inside a transaction: restore stock → delete items → delete order
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.product_id },
          data: { stock_quantity: { increment: item.quantity } },
        });
      }
      await tx.orderItem.deleteMany({ where: { order_id: id } });
      await tx.order.delete({ where: { id } });
    });

    broadcastP2P({ type: 'order-deleted', orderId: id });
    res.json({ success: true, message: `Order #${id} voided and stock restored` });
  } catch (error) {
    console.error('Delete order error:', error);
    if (error.code === 'P2025') return res.status(404).json({ error: 'Order not found' });
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// PUT /api/admin/orders/:id — edit an existing order's items/quantities (admin PIN required)
router.put('/orders/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid order ID' });
  }
  const { adminPin, items, payment_method, discount_applied } = req.body;

  if (!adminPin) return res.status(400).json({ error: 'Admin PIN required' });
  if (!/^\d{4,8}$/.test(adminPin)) return res.status(400).json({ error: 'Invalid PIN format' });
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items[] is required and must not be empty' });
  }

  // Validate each item
  for (const item of items) {
    if (!isPositiveInt(item.product_id) || !isPositiveInt(item.quantity) || !isFiniteFloat(item.price_at_sale)) {
      return res.status(400).json({ error: 'Each item must have valid product_id, quantity, and price_at_sale' });
    }
  }

  if (!checkPinRateLimit(req, res)) return;

  try {
    // 1. Verify admin PIN
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!admin) return res.status(404).json({ error: 'Admin user not found' });
    const isValid = await bcrypt.compare(adminPin, admin.pin_hash);
    if (!isValid) return res.status(401).json({ error: 'Invalid Admin PIN' });

    resetPinRateLimit(req);

    // 2. Run everything in a transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Fetch old order + items
      const oldOrder = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!oldOrder) throw new Error('ORDER_NOT_FOUND');

      // Restore old stock quantities
      for (const oldItem of oldOrder.items) {
        await tx.product.update({
          where: { id: oldItem.product_id },
          data: { stock_quantity: { increment: oldItem.quantity } },
        });
      }

      // Validate new stock for incoming items and enforce server-side price
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.product_id } });
        if (!product) throw new Error(`Product ID ${item.product_id} not found`);
        if (product.stock_quantity < item.quantity) {
          throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock_quantity}, Requested: ${item.quantity}`);
        }
      }

      // Recalculate total
      const subtotal = items.reduce((sum, item) => sum + item.price_at_sale * item.quantity, 0);
      const discountDecimal = ((discount_applied != null ? discount_applied : oldOrder.discount_applied) || 0) / 100;
      const discountedSubtotal = subtotal * (1 - discountDecimal);
      const tax = discountedSubtotal * 0.085;
      const total_amount = parseFloat((discountedSubtotal + tax).toFixed(2));

      // Delete old items, create new ones, decrement stock
      await tx.orderItem.deleteMany({ where: { order_id: id } });
      for (const item of items) {
        await tx.orderItem.create({
          data: {
            order_id: id,
            product_id: item.product_id,
            quantity: item.quantity,
            price_at_sale: item.price_at_sale,
          },
        });
        await tx.product.update({
          where: { id: item.product_id },
          data: { stock_quantity: { decrement: item.quantity } },
        });
      }

      // Update the order record
      return await tx.order.update({
        where: { id },
        data: {
          total_amount,
          ...(payment_method && { payment_method }),
          ...(discount_applied != null && { discount_applied }),
        },
        include: { items: { include: { product: true } }, cashier: true },
      });
    });

    broadcastP2P({ type: 'order-updated', order: updatedOrder });
    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('Edit order error:', error.message);
    if (error.message === 'ORDER_NOT_FOUND') return res.status(404).json({ error: 'Order not found' });
    const isValidation = error.message.includes('Insufficient') || error.message.includes('not found');
    res.status(isValidation ? 400 : 500).json({ error: error.message });
  }
});

module.exports = router;
