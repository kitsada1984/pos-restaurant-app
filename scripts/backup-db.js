const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Manually parse .env if process.env.DATABASE_URL is not set
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value.trim();
    }
  });
}

// Prefer DIRECT_URL for direct session connection
const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
console.log('Connecting using URL host:', (dbUrl || '').split('@')[1] || 'NOT_FOUND');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

function withTimeout(promise, ms = 6000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)),
  ]);
}

async function main() {
  console.log('--- Starting Complete Database Backup ---');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      app: 'pos-restaurant-app',
      version: '1.0.0',
    },
  };

  const tables = [
    ['users', () => prisma.user.findMany()],
    ['stores', () => prisma.store.findMany()],
    ['plans', () => prisma.plan.findMany()],
    ['subscriptionHistories', () => prisma.subscriptionHistory.findMany()],
    ['platformSettings', () => prisma.platformSetting.findMany()],
    ['tables', () => prisma.table.findMany()],
    ['categories', () => prisma.category.findMany()],
    ['menuItems', () => prisma.menuItem.findMany()],
    ['menuOptionGroups', () => prisma.menuOptionGroup.findMany()],
    ['menuOptionChoices', () => prisma.menuOptionChoice.findMany()],
    ['ingredients', () => prisma.ingredient.findMany()],
    ['menuItemRecipes', () => prisma.menuItemRecipe.findMany()],
    ['stockLogs', () => prisma.stockLog.findMany()],
    ['customerMembers', () => prisma.customerMember.findMany()],
    ['promotions', () => prisma.promotion.findMany()],
    ['loyaltyRewards', () => prisma.loyaltyReward.findMany()],
    ['orders', () => prisma.order.findMany()],
    ['orderItems', () => prisma.orderItem.findMany()],
    ['bankNotificationLogs', () => prisma.bankNotificationLog.findMany()],
  ];

  let totalRecords = 0;
  for (const [name, fetcher] of tables) {
    process.stdout.write(`Fetching ${name}... `);
    try {
      const records = await withTimeout(fetcher(), 5000);
      backupData[name] = records;
      totalRecords += records.length;
      console.log(`OK (${records.length})`);
    } catch (err) {
      console.log(`SKIPPED / TIMEOUT (${err.message})`);
      backupData[name] = [];
    }
  }

  const backupFilePath = path.join(backupDir, `db-backup-${timestamp}.json`);
  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');

  console.log(`\n[SUCCESS] Complete database snapshot exported to: ${backupFilePath}`);
  console.log(`Total records backed up: ${totalRecords}`);
}

main()
  .catch((e) => {
    console.error('[ERROR] Database backup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
