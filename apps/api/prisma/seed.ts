import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Running seed...');

  // ── 1. Admin user ──────────────────────────────────────────
  const username = (process.env.ADMIN_USERNAME ?? 'admin').toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`Admin user "${username}" already exists — skipping.`);
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        username,
        passwordHash,
        role: Role.ADMIN,
        displayName: 'Administrator',
        requiresPasswordChange: true,
      },
    });
    console.log(`✅ Admin user "${username}" created.`);
    console.log(`   ⚠️  Password change required on first login.`);
  }

  // ── 2. Default interval config ─────────────────────────────
  const existingConfig = await prisma.intervalConfig.findFirst({
    where: { isActive: true },
  });
  if (existingConfig) {
    console.log('Active interval config already exists — skipping.');
  } else {
    const config = await prisma.intervalConfig.create({
      data: {
        name: 'Weekly Monday Reset',
        intervalType: 'WEEKS',
        intervalValue: 1,
        startTime: '00:00',
        timezone: 'America/New_York',
        isActive: true,
      },
    });
    console.log(`✅ Default interval config created: ${config.name}`);

    // ── 3. Create initial collection period ──────────────────
    const existingPeriod = await prisma.collectionPeriod.findFirst({
      where: { isActive: true },
    });
    if (!existingPeriod) {
      await prisma.collectionPeriod.create({
        data: {
          intervalConfigId: config.id,
          startedAt: new Date(),
          isActive: true,
        },
      });
      console.log('✅ Initial collection period started.');
    }
  }

  // ── 4. Default theme config (singleton) ───────────────────
  const existingTheme = await prisma.themeConfig.findFirst();
  if (existingTheme) {
    console.log('Theme config already exists — skipping.');
  } else {
    await prisma.themeConfig.create({ data: {} });
    console.log('✅ Default theme config created.');
  }

  console.log('🌱 Seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
