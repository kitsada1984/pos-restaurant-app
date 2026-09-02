const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.menuItem.findMany({
    where: { imageUrl: { not: null } }
  });
  console.log('Total items with image:', items.length);
  
  for (const item of items) {
    if (item.imageUrl && (item.imageUrl.includes('drive.google.com') || item.imageUrl.includes('docs.google.com'))) {
      const match = item.imageUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                    item.imageUrl.match(/drive\.google\.com\/(?:open|uc|thumbnail)\?(?:.*&)?id=([a-zA-Z0-9_-]+)/) ||
                    item.imageUrl.match(/docs\.google\.com\/(?:open|uc)\?(?:.*&)?id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        const directUrl = 'https://lh3.googleusercontent.com/d/' + match[1];
        await prisma.menuItem.update({
          where: { id: item.id },
          data: { imageUrl: directUrl }
        });
        console.log('✅ Migrated Google Drive image for:', item.name, '->', directUrl);
      }
    }
  }
}

main().finally(() => prisma.$disconnect());