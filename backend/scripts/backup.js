const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const prisma = new PrismaClient();
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const DB_PATH = path.join(__dirname, '..', 'data', 'pos.db');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function generateBackupFilename() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(BACKUP_DIR, `pos-backup-${timestamp}.sqlite`);
}

async function backupDatabase() {
  const backupFile = generateBackupFilename();

  console.log(`💾 Starting database backup...`);
  console.log(`   Source: ${DB_PATH}`);
  console.log(`   Destination: ${backupFile}`);

  try {
    // Check if source database exists
    if (!fs.existsSync(DB_PATH)) {
      throw new Error(`Database file not found: ${DB_PATH}`);
    }

    // Copy the SQLite database file (safe for hot backup due to journaling)
    fs.copyFileSync(DB_PATH, backupFile);

    // Verify backup
    const stats = fs.statSync(backupFile);
    if (stats.size === 0) {
      throw new Error('Backup file is empty');
    }

    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`✅ Backup completed successfully!`);
    console.log(`   Size: ${sizeMB} MB`);
    console.log(`   Location: ${backupFile}`);

    // Clean old backups if retention policy is set
    await cleanupOldBackups();

    return backupFile;
  } catch (error) {
    console.error(`❌ Backup failed: ${error.message}`);

    // Clean up partial backup if it exists
    if (fs.existsSync(backupFile)) {
      fs.unlinkSync(backupFile);
    }

    throw error;
  }
}

async function cleanupOldBackups() {
  const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  console.log(`🧹 Checking for backups older than ${retentionDays} days...`);

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(file => file.startsWith('pos-backup-') && file.endsWith('.sqlite'))
    .map(file => ({
      name: file,
      path: path.join(BACKUP_DIR, file),
      time: fs.statSync(path.join(BACKUP_DIR, file)).mtime
    }))
    .sort((a, b) => b.time - a.time); // Newest first

  const oldBackups = files.filter(file => file.time < cutoffDate);

  if (oldBackups.length > 0) {
    console.log(`   Found ${oldBackups.length} old backup(s) to remove:`);
    for (const file of oldBackups) {
      console.log(`   - ${file.name} (${file.time.toISOString()})`);
      fs.unlinkSync(file.path);
    }
    console.log(`✅ Old backups removed.`);
  } else {
    console.log(`✅ No old backups to clean up.`);
  }
}

async function listBackups() {
  console.log(`📋 Available backups:`);

  if (!fs.existsSync(BACKUP_DIR)) {
    console.log(`   No backup directory found.`);
    return [];
  }

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(file => file.startsWith('pos-backup-') && file.endsWith('.sqlite'))
    .map(file => ({
      name: file,
      path: path.join(BACKUP_DIR, file),
      size: fs.statSync(path.join(BACKUP_DIR, file)).size,
      time: fs.statSync(path.join(BACKUP_DIR, file)).mtime
    }))
    .sort((a, b) => b.time - a.time); // Newest first

  if (files.length === 0) {
    console.log(`   No backups found.`);
    return [];
  }

  for (const file of files) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    console.log(`   ${file.name}`);
    console.log(`     Size: ${sizeMB} MB`);
    console.log(`     Date: ${file.time.toISOString()}`);
    console.log();
  }

  return files;
}

// Command line interface
if (require.main === module) {
  const command = process.argv[2];

  async function run() {
    try {
      if (command === 'list' || command === 'ls') {
        await listBackups();
      } else if (command === 'create' || command === 'make' || !command) {
        await backupDatabase();
      } else if (command === 'cleanup') {
        await cleanupOldBackups();
      } else if (command === 'help') {
        console.log(`
Mesna POS Database Backup Utility

Usage:
  node scripts/backup.js [command]

Commands:
  create, make    Create a new backup (default)
  list, ls        List all available backups
  cleanup         Remove old backups based on retention policy
  help            Show this help message

Environment Variables:
  BACKUP_RETENTION_DAYS   Number of days to keep backups (default: 30)
  BACKUP_INTERVAL_HOURS   How often to run automatic backhours (for scheduler)

Examples:
  node scripts/backup.js
  node scripts/backup.js create
  node scripts/backup.js list
  node scripts/backup.js cleanup
        `);
      } else {
        console.error(`❌ Unknown command: ${command}`);
        console.log('Run "node scripts/backup.js help" for usage information.');
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Operation failed: ${error.message}`);
      process.exit(1);
    }
  }

  run();
}

module.exports = { backupDatabase, listBackups, cleanupOldBackups };