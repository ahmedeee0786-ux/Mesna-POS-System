const dgram = require('dgram');
const ws = require('ws');
const os = require('os');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const UDP_PORT = 41234;
const myPort = process.env.PORT || 3001;
const myName = `Register-${myPort}`;

let localIp = '127.0.0.1';
let wss = null;
let activePeerSockets = new Map(); // key: 'ip:port', value: WebSocket connection
let frontendClients = new Set(); // Browser tabs connected to this backend instance

// Get local IPv4 address
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

localIp = getLocalIp();

// Broadcast a message to all connected peers and frontend tabs
function broadcastP2P(data) {
  const payload = JSON.stringify(data);
  
  // Send to peer servers
  for (const [peerKey, socket] of activePeerSockets.entries()) {
    if (socket.readyState === ws.OPEN) {
      socket.send(payload);
    }
  }

  // Send to local frontend tabs
  for (const client of frontendClients) {
    if (client.readyState === ws.OPEN) {
      client.send(payload);
    }
  }
}

async function initP2P(httpServer) {
  console.log(`[P2P Mesh] Starting on ${localIp}:${myPort} (${myName})`);

  // 1. Setup WebSocket Server on the existing HTTP server
  wss = new ws.Server({ noServer: true });
  
  httpServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === '/p2p') {
      wss.handleUpgrade(request, socket, head, (wsConn) => {
        wss.emit('connection', wsConn, request);
      });
    } else if (url.pathname === '/frontend-ws') {
      // Connect local frontend tabs
      wss.handleUpgrade(request, socket, head, (wsConn) => {
        frontendClients.add(wsConn);
        wsConn.on('close', () => frontendClients.delete(wsConn));
      });
    }
  });

  wss.on('connection', (socket) => {
    socket.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        await handleIncomingP2PMessage(data, socket);
      } catch (err) {
        console.error('[P2P Mesh] Error handling socket message:', err.message);
      }
    });
  });

  // 2. Setup UDP Broadcasting for register discovery
  const udpSocket = dgram.createSocket('udp4');
  
  udpSocket.on('error', (err) => {
    console.error('[P2P Mesh UDP] Error:', err.message);
  });

  udpSocket.on('message', (msg, rinfo) => {
    try {
      const data = JSON.parse(msg.toString());
      if (data.type === 'hello' && (data.ip !== localIp || parseInt(data.port) !== parseInt(myPort))) {
        connectToPeer(data.ip, data.port, data.name);
      }
    } catch (err) {}
  });

  udpSocket.bind(UDP_PORT, () => {
    udpSocket.setBroadcast(true);
    console.log(`[P2P Mesh UDP] Listening for peers on port ${UDP_PORT}...`);

    // Broadcast hello packet every 5 seconds
    setInterval(() => {
      try {
        const hello = JSON.stringify({
          type: 'hello',
          name: myName,
          ip: localIp,
          port: myPort
        });
        udpSocket.send(hello, UDP_PORT, '255.255.255.255');
      } catch (err) {}
    }, 5000);
  });
}

// Connect to a discovered register instance
function connectToPeer(ip, port, name) {
  const peerKey = `${ip}:${port}`;
  if (activePeerSockets.has(peerKey)) return; // Already connected

  console.log(`[P2P Mesh] Discovered peer: "${name}" at ws://${peerKey}/p2p. Connecting...`);
  
  // Set placeholder to prevent multiple connection attempts
  activePeerSockets.set(peerKey, { readyState: ws.CONNECTING });

  const client = new ws(`ws://${peerKey}/p2p`);

  client.on('open', async () => {
    console.log(`[P2P Mesh] Connected to peer register: "${name}"`);
    activePeerSockets.set(peerKey, client);

    // Fetch local database vector mapping (registerId -> maxSequenceNumber)
    const orders = await prisma.order.findMany({ select: { id: true } });
    const vector = {};
    orders.forEach(o => {
      const regId = o.id % 10;
      const seq = Math.floor(o.id / 10);
      if (!vector[regId] || seq > vector[regId]) {
        vector[regId] = seq;
      }
    });
    
    // Request incremental database synchronization
    client.send(JSON.stringify({
      type: 'request-sync',
      vector,
      senderName: myName
    }));
  });

  client.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      await handleIncomingP2PMessage(data, client);
    } catch (err) {
      console.error('[P2P Mesh] Error handling peer message:', err.message);
    }
  });

  client.on('error', (err) => {
    // Fail silently, peer will be rediscovered
  });

  client.on('close', () => {
    console.log(`[P2P Mesh] Connection closed with peer: "${name}"`);
    activePeerSockets.delete(peerKey);
  });
}

// Route message actions (order syncing, product restocking updates)
async function handleIncomingP2PMessage(data, socket) {
  switch (data.type) {
    case 'request-sync': {
      const peerVector = (data.vector && typeof data.vector === 'object') ? data.vector : {};
      console.log(`[P2P Mesh] Received sync request from peer. Vector:`, JSON.stringify(peerVector));
      
      const allLocalOrders = await prisma.order.findMany({
        include: { items: { include: { product: true } } }
      });
      
      const missingOrders = allLocalOrders.filter(o => {
        const regId = o.id % 10;
        const seq = Math.floor(o.id / 10);
        const peerSeq = peerVector[regId] || 0;
        return seq > peerSeq;
      });
      
      console.log(`[P2P Mesh] Peer is missing ${missingOrders.length} orders. Sending...`);
      socket.send(JSON.stringify({
        type: 'sync-response',
        orders: missingOrders
      }));
      break;
    }

    case 'sync-response': {
      // ── Validate payload is a proper array before iterating ──
      if (!Array.isArray(data.orders)) {
        console.warn('[P2P Mesh] Invalid sync-response: orders is not an array. Ignoring.');
        break;
      }
      console.log(`[P2P Mesh] Received sync payload containing ${data.orders.length} orders`);
      for (const order of data.orders) {
        if (!isValidOrderPayload(order)) {
          console.warn(`[P2P Mesh] Skipping invalid order in sync-response:`, order?.id);
          continue;
        }
        await savePeerOrder(order);
      }
      // Broadcast update to frontend clients to refresh local cache
      broadcastP2P({ type: 'sync-complete' });
      break;
    }

    case 'new-order': {
      if (!data.order || !isValidOrderPayload(data.order)) {
        console.warn('[P2P Mesh] Received invalid new-order payload. Ignoring.');
        break;
      }
      console.log(`[P2P Mesh] Replicating new order #${data.order.id} from peer`);
      await savePeerOrder(data.order);
      broadcastP2P({ type: 'sync-complete' });
      break;
    }

    case 'stock-update': {
      // ── Validate stock-update: productId and newQuantity must be positive numbers ──
      const productId = parseInt(data.productId, 10);
      const newQuantity = parseInt(data.newQuantity, 10);

      if (!Number.isInteger(productId) || productId <= 0) {
        console.warn(`[P2P Mesh] Invalid stock-update productId: ${data.productId}. Ignoring.`);
        break;
      }
      if (!Number.isInteger(newQuantity) || newQuantity < 0) {
        console.warn(`[P2P Mesh] Invalid stock-update newQuantity: ${data.newQuantity}. Ignoring.`);
        break;
      }

      console.log(`[P2P Mesh] Replicating stock restock for Product ID ${productId}: ${newQuantity}`);
      try {
        await prisma.product.update({
          where: { id: productId },
          data: { stock_quantity: newQuantity }
        });
        broadcastP2P({ type: 'sync-complete' });
      } catch (err) {
        // Product may not exist on this register — ignore gracefully
        console.warn(`[P2P Mesh] stock-update for product #${productId} failed:`, err.message);
      }
      break;
    }

    default:
      console.warn(`[P2P Mesh] Received unknown message type: "${data.type}". Ignoring.`);
  }
}

// Validate that an order payload has all required fields before saving to DB
function isValidOrderPayload(order) {
  if (!order || typeof order !== 'object') return false;
  if (!Number.isInteger(order.id) && typeof order.id !== 'number') return false;
  if (typeof order.total_amount !== 'number' || order.total_amount < 0) return false;
  if (!['cash', 'card'].includes(order.payment_method)) return false;
  if (!Array.isArray(order.items)) return false;
  if (!Number.isInteger(order.cashier_id) && typeof order.cashier_id !== 'number') return false;
  return true;
}

// Transactionally save a synchronized order and adjust local inventory counts
async function savePeerOrder(orderData) {
  try {
    const existing = await prisma.order.findUnique({
      where: { id: orderData.id }
    });
    if (existing) return; // Order is already registered locally

    await prisma.$transaction(async (tx) => {
      // 1. Ensure cashier user exists in the local database
      const localCashier = await tx.user.findUnique({ where: { id: orderData.cashier_id } });
      if (!localCashier) {
        await tx.user.create({
          data: {
            id: orderData.cashier_id,
            name: orderData.cashier?.name || `Cashier ${orderData.cashier_id % 10}`,
            pin_hash: '',
            role: 'cashier'
          }
        });
      }

      // 2. Create Order
      await tx.order.create({
        data: {
          id: orderData.id,
          total_amount: orderData.total_amount,
          discount_applied: orderData.discount_applied,
          payment_method: orderData.payment_method,
          cashier_id: orderData.cashier_id,
          customer_name: orderData.customer_name,
          customer_phone: orderData.customer_phone,
          customer_address: orderData.customer_address,
          cash_tendered: orderData.cash_tendered || 0,
          change_due: orderData.change_due || 0,
          timestamp: new Date(orderData.timestamp)
        }
      });

      // 3. Create OrderItems and decrement product quantities
      for (const item of orderData.items) {
        await tx.orderItem.create({
          data: {
            order_id: orderData.id,
            product_id: item.product_id,
            quantity: item.quantity,
            price_at_sale: item.price_at_sale
          }
        });

        // Deduct quantities locally
        await tx.product.update({
          where: { id: item.product_id },
          data: { stock_quantity: { decrement: item.quantity } }
        });
      }
    });
    console.log(`[P2P Mesh] Replicated Order #${orderData.id} saved, stock updated.`);
  } catch (err) {
    console.error(`[P2P Mesh] Failed to save synchronized order #${orderData.id}:`, err.message);
  }
}

module.exports = {
  initP2P,
  broadcastP2P
};
