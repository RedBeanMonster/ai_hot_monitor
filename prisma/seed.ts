import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultKeywords = ['AI编程', 'Claude 3.5', 'Next.js', 'GPT-5'];

async function main() {
  console.log('Seeding default keywords...');

  for (const text of defaultKeywords) {
    await prisma.keyword.upsert({
      where: { text },
      update: {},
      create: { text },
    });
    console.log(`  + ${text}`);
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
