const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const http = require('http');
const { exec } = require('child_process');

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', message: 'Database connected' };
  } catch (error) {
    return { status: 'error', message: `Database error: ${error.message}` };
  }
}

async function checkServer() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: process.env.PORT || 3001,
      path: '/api/health',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            status: res.statusCode === 200 && parsed.status === 'ok' ? 'ok' : 'error',
            message: `HTTP ${res.statusCode}: ${parsed.message || 'Health check failed'}`,
            details: parsed
          });
        } catch (e) {
          resolve({ status: 'error', message: `Invalid response: ${e.message}` });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ status: 'error', message: `Connection failed: ${error.message}` });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 'error', message: 'Request timeout' });
    });

    req.end();
  });
}

async function checkDiskSpace() {
  return new Promise((resolve) => {
    exec('wmic logicaldisk where "deviceid=\"C:\"\" get freespace, size', (error, stdout, stderr) => {
      if (error) {
        resolve({ status: 'error', message: `Disk check failed: ${error.message}` });
        return;
      }

      const lines = stdout.trim().split('\n');
      if (lines.length < 2) {
        resolve({ status: 'error', message: 'Unable to parse disk info' });
        return;
      }

      const parts = lines[1].trim().split(/\s+/);
      const freeBytes = parseInt(parts[0]);
      const totalBytes = parseInt(parts[1]);

      if (isNaN(freeBytes) || isNaN(totalBytes)) {
        resolve({ status: 'error', message: 'Invalid disk space values' });
        return;
      }

      const freeGB = freeBytes / (1024**3);
      const totalGB = totalBytes / (1024**3);
      const usedPercent = ((totalBytes - freeBytes) / totalBytes) * 100;

      let status = 'ok';
      let message = `Disk OK: ${freeGB.toFixed(1)} GB free of ${totalGB.toFixed(1)} GB`;

      if (freeGB < 1) {
        status = 'error';
        message = `Critical: Less than 1 GB free space!`;
      } else if (freeGB < 5) {
        status = 'warn';
        message = `Low disk space: ${freeGB.toFixed(1)} GB free`;
      }

      resolve({
        status,
        message,
        details: { freeGB, totalGB, usedPercent }
      });
    });
  });
}

async function runHealthCheck() {
  console.log('🔍 Running Mesna POS Health Check...');
  console.log('='.repeat(50));

  const results = {};

  try {
    results.database = await checkDatabase();
    console.log(`💾 Database: ${results.database.status.toUpperCase()} - ${results.database.message}`);
  } catch (error) {
    results.database = { status: 'error', message: `Check failed: ${error.message}` };
    console.log(`💾 Database: ERROR - ${results.database.message}`);
  }

  try {
    results.server = await checkServer();
    console.log(`🌐 Server: ${results.server.status.toUpperCase()} - ${results.server.message}`);
  } catch (error) {
    results.server = { status: 'error', message: `Check failed: ${error.message}` };
    console.log(`🌐 Server: ERROR - ${results.server.message}`);
  }

  try {
    results.disk = await checkDiskSpace();
    console.log(`💾 Disk: ${results.disk.status.toUpperCase()} - ${results.disk.message}`);
  } catch (error) {
    results.disk = { status: 'error', message: `Check failed: ${error.message}` };
    console.log(`💾 Disk: ERROR - ${results.disk.message}`);
  }

  // Overall status
  const allOk = Object.values(results).every(r => r.status === 'ok');
  const hasError = Object.values(results).some(r => r.status === 'error');
  const hasWarn = Object.values(results).some(r => r.status === 'warn');

  console.log('='.repeat(50));
  if (hasError) {
    console.log('❌ OVERALL: CRITICAL - One or more checks failed');
    process.exit(1);
  } else if (hasWarn) {
    console.log('⚠️  OVERALL: WARNING - System functional but needs attention');
    process.exit(0);
  } else if (allOk) {
    console.log('✅ OVERALL: HEALTHY - All systems operational');
    process.exit(0);
  } else {
    console.log('❓ OVERALL: UNKNOWN - Unable to determine status');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runHealthCheck().catch(console.error);
}

module.exports = { runHealthCheck };