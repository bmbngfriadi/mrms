const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetAdmin() {
  console.log('Memeriksa struktur database...');

  // Ensure missing columns exist in PostgreSQL
  await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" TEXT;`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "meeting_rooms" ADD COLUMN IF NOT EXISTS "photos" TEXT[] DEFAULT ARRAY[]::TEXT[];`);

  const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Password123!';
  const hash = await bcrypt.hash(defaultPassword, 10);

  // 1. Find all existing admin users by email, username, or role
  const adminUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: 'admin@cemindogemilang.com' },
        { email: 'bambang.friadi@cemindo.com' },
        { username: 'admin' },
        { role: 'ADMIN' },
      ],
    },
  });

  if (adminUsers.length > 0) {
    console.log('\n========================================');
    console.log('✅ AKUN ADMIN BERHASIL DIRESET!');
    console.log('========================================');
    for (const u of adminUsers) {
      const updated = await prisma.user.update({
        where: { id: u.id },
        data: {
          username: u.username || 'admin',
          passwordHash: hash,
          isActive: true,
          role: 'ADMIN',
        },
      });
      console.log(`Email   : ${updated.email}`);
      console.log(`Username: ${updated.username || '-'}`);
      console.log(`Password: ${defaultPassword}`);
      console.log('----------------------------------------');
    }
    console.log('========================================\n');
    process.exit(0);
  }

  // 2. If not found, find a department to attach
  let dept = await prisma.department.findFirst();
  if (!dept) {
    dept = await prisma.department.create({
      data: {
        code: 'IT',
        name: 'Information Technology & Automation',
      },
    });
  }

  user = await prisma.user.create({
    data: {
      nik: 'CG-ADM-001',
      username: 'admin',
      name: 'Bambang Friadi (Admin)',
      email: 'admin@cemindogemilang.com',
      phone: '081270001001',
      passwordHash: hash,
      role: 'ADMIN',
      departmentId: dept.id,
      isActive: true,
    },
  });

  console.log('\n========================================');
  console.log('✅ AKUN ADMIN BERHASIL DIBUAT!');
  console.log('========================================');
  console.log(`Email   : ${user.email}`);
  console.log(`Username: ${user.username}`);
  console.log(`Password: ${defaultPassword}`);
  console.log('========================================\n');
  process.exit(0);
}

resetAdmin().catch((err) => {
  console.error('❌ Gagal mereset admin:', err);
  process.exit(1);
});
