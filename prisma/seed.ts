import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultKeywords = ['AI编程', 'Claude', 'Next.js', 'GPT'];

const defaultDomains: { name: string; intervalHours: number }[] = [
  { name: 'AI编程', intervalHours: 24 },
  { name: '多模态生成', intervalHours: 24 },
];

async function main() {
  console.log('Seeding default keywords...');
  for (const text of defaultKeywords) {
    await prisma.keyword.upsert({
      where: { text },
      update: {},
      create: { text },
    });
    console.log(`  + keyword ${text}`);
  }

  console.log('Seeding default domains...');
  for (const d of defaultDomains) {
    await prisma.domain.upsert({
      where: { name: d.name },
      update: {},
      create: d,
    });
    console.log(`  + domain ${d.name}`);
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
