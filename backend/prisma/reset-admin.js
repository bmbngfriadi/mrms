const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetAdmin() {
  const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Password123!';
  const hash = await bcrypt.hash(defaultPassword, 10);

  // 1. Check if an admin user already exists by email, username, or role
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: 'admin@cemindogemilang.com' },
        { email: 'bambang.friadi@cemindo.com' },
        { username: 'admin' },
        { role: 'ADMIN' },
      ],
    },
  });

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hash,
        isActive: true,
        role: 'ADMIN',
      },
    });
    console.log('\n========================================');
    console.log('✅ AKUN ADMIN BERHASIL DIRESET!');
    console.log('========================================');
    console.log(`Email   : ${user.email}`);
    console.log(`Username: ${user.username || 'admin'}`);
    console.log(`Password: ${defaultPassword}`);
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
