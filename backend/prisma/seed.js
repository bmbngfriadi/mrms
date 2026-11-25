const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateRandomToken(prefix) {
  return `${prefix}_${crypto.randomBytes(16).toString('hex')}`;
}

async function main() {
  console.log('Seeding Meeting Room Management System PT Cemindo Gemilang Tbk - Plant Batam...');

  // 1. System Settings
  const settings = [
    { key: 'OPERATIONAL_HOURS_START', value: '08:00', description: 'Jam mulai operasional ruang meeting (WIB)' },
    { key: 'OPERATIONAL_HOURS_END', value: '17:00', description: 'Jam selesai operasional ruang meeting (WIB)' },
    { key: 'OPERATIONAL_DAYS', value: '1,2,3,4,5', description: 'Hari operasional aktif (1=Senin, 5=Jumat)' },
    { key: 'BOOKING_HORIZON_DAYS', value: '30', description: 'Batas maksimal booking ke depan (hari)' },
    { key: 'DURATION_MIN_MINUTES', value: '30', description: 'Durasi minimal booking (menit)' },
    { key: 'DURATION_MAX_MINUTES', value: '240', description: 'Durasi maksimal booking (menit / 4 jam)' },
    { key: 'LATE_TOLERANCE_MINUTES', value: '15', description: 'Toleransi keterlambatan check-in (menit)' },
    { key: 'REMINDER_MINUTES_BEFORE', value: '20', description: 'Waktu kirim reminder sebelum meeting mulai (menit)' },
    { key: 'TIMEZONE', value: 'Asia/Jakarta', description: 'Timezone resmi sistem' },
    { key: 'COMPANY_NAME', value: 'PT Cemindo Gemilang Tbk', description: 'Nama resmi perusahaan' },
    { key: 'PLANT_LOCATION', value: 'Plant Batam', description: 'Unit operasional' },
    { key: 'NOTIFICATION_MODE', value: 'mock', description: 'Mode pengiriman notifikasi (mock|production)' },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: s,
    });
  }

  // 2. Departments (Strictly preserve existing operational departments)
  const existingDeptsCount = await prisma.department.count();
  const depts = {};

  const mapDeptAliases = (d) => {
    depts[d.code] = d;
    if (d.code.includes('HRGA')) depts['HRGA'] = d;
    if (d.code.includes('PROD') || d.code.includes('PRD')) depts['PRD'] = d;
    if (d.code.includes('MAINT') || d.code.includes('ENG')) depts['ENG'] = d;
    if (d.code.includes('WAREHOUSE') || d.code.includes('PORT') || d.code.includes('LOG')) depts['LOG'] = d;
    if (d.code.includes('FIN')) depts['FIN'] = d;
    if (d.code === 'IT' || d.code.includes('IT')) depts['IT'] = d;
  };

  if (existingDeptsCount > 0) {
    console.log(`[Seed] Found ${existingDeptsCount} existing departments in database. Preserving operational departments, skipping department seed.`);
    const existing = await prisma.department.findMany();
    for (const d of existing) {
      mapDeptAliases(d);
    }
  } else {
    // Default initial seed only if database is completely empty
    const departmentsData = [
      { code: 'FINANCE & ACCOUNTING', name: 'Finance & Accounting' },
      { code: 'HRGA & SUPPORTING', name: 'HRGA & Supporting' },
      { code: 'IT', name: 'Information Technology & Automation' },
      { code: 'MAINTENANCE', name: 'Maintenance' },
      { code: 'PORT & DISPATCH', name: 'Port & Dispatch' },
      { code: 'PRODUCTION', name: 'Production' },
      { code: 'PURCHASING', name: 'Purchasing' },
      { code: 'QUALITY', name: 'Quality Control' },
      { code: 'SHE', name: 'Safety, Health & Environment' },
      { code: 'WAREHOUSE', name: 'Warehouse' },
    ];

    for (const d of departmentsData) {
      const created = await prisma.department.create({
        data: d,
      });
      mapDeptAliases(created);
    }
  }

  const getDeptId = (key) => {
    if (depts[key]?.id) return depts[key].id;
    const found = Object.values(depts).find(d => 
      d.code.toLowerCase().includes(key.toLowerCase()) || 
      d.name.toLowerCase().includes(key.toLowerCase())
    );
    if (found?.id) return found.id;
    return Object.values(depts)[0]?.id;
  };

  // 3. Users (Preserve any existing users or updates made by the administrator/user)
  const existingUsersCount = await prisma.user.count();
  const users = {};
  if (existingUsersCount > 0) {
    console.log(`[Seed] Found ${existingUsersCount} existing users in database. Preserving user updates, skipping user overwrite.`);
    const existing = await prisma.user.findMany();
    for (const u of existing) {
      users[u.email] = u;
    }
  } else {
    const defaultPassword = 'Password123!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const usersData = [
      {
        nik: 'CG-ADM-001',
        username: 'admin',
        name: 'Bambang Friadi (Admin)',
        email: 'admin@cemindogemilang.com',
        phone: '081270001001',
        role: 'ADMIN',
        departmentId: getDeptId('IT'),
      },
      {
        nik: 'CG-HRGA-001',
        username: 'hrga',
        name: 'Rina Sugiarto (HRGA Lead)',
        email: 'hrga@cemindogemilang.com',
        phone: '081270002002',
        role: 'HRGA',
        departmentId: getDeptId('HRGA'),
      },
      {
        nik: 'CG-PRD-010',
        username: 'budi',
        name: 'Budi Santoso',
        email: 'budi.santoso@cemindogemilang.com',
        phone: '081270003003',
        role: 'EMPLOYEE',
        departmentId: getDeptId('PRD'),
      },
      {
        nik: 'CG-ENG-022',
        username: 'siti',
        name: 'Siti Aminah',
        email: 'siti.aminah@cemindogemilang.com',
        phone: '081270004004',
        role: 'EMPLOYEE',
        departmentId: getDeptId('ENG'),
      },
      {
        nik: 'CG-LOG-035',
        username: 'hendra',
        name: 'Hendra Wijaya',
        email: 'hendra.wijaya@cemindogemilang.com',
        phone: '081270005005',
        role: 'EMPLOYEE',
        departmentId: getDeptId('LOG'),
      },
      {
        nik: 'CG-IT-044',
        username: 'dewi.lestari',
        name: 'Dewi Lestari',
        email: 'dewi.lestari@cemindogemilang.com',
        phone: '081270006006',
        role: 'EMPLOYEE',
        departmentId: getDeptId('IT'),
      },
      {
        nik: 'CG-FIN-051',
        username: 'ahmad.fauzi',
        name: 'Ahmad Fauzi',
        email: 'ahmad.fauzi@cemindogemilang.com',
        phone: '081270007007',
        role: 'EMPLOYEE',
        departmentId: getDeptId('FIN'),
      },
    ];

    for (const u of usersData) {
      users[u.email] = await prisma.user.create({
        data: {
          ...u,
          passwordHash,
        },
      });
    }
  }

  // 4. Meeting Rooms & Facilities (Preserve existing rooms and photo additions)
  const existingRoomsCount = await prisma.meetingRoom.count();
  const rooms = {};
  if (existingRoomsCount > 0) {
    console.log(`[Seed] Found ${existingRoomsCount} existing rooms in database. Preserving room and photo updates, skipping room overwrite.`);
    const existing = await prisma.meetingRoom.findMany();
    for (const r of existing) {
      rooms[r.code] = r;
    }
  } else {
    const roomsData = [
      {
        code: 'ROOM-SMP',
        name: 'Ruang Semen Merah Putih (Boardroom)',
        location: 'Lantai 2 Gedung Admin Plant Batam',
        capacity: 20,
        description: 'Ruang rapat utama direksi dan manajemen eksekutif, dilengkapi sistem teleconference 4K.',
        imageUrl: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1200&q=80',
        photos: [
          'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
        ],
        facilities: [
          { name: 'Smart TV 75 Inch 4K UHD', quantity: 1, condition: 'GOOD' },
          { name: 'Video Conference System 4K Auto-tracking', quantity: 1, condition: 'GOOD' },
          { name: 'Wireless Table Microphone Array', quantity: 4, condition: 'GOOD' },
          { name: 'Glass Whiteboard 240x120cm', quantity: 1, condition: 'GOOD' },
          { name: 'AC Central 3 PK', quantity: 2, condition: 'GOOD' },
          { name: 'High-speed Fiber WiFi', quantity: 1, condition: 'GOOD' },
        ],
      },
      {
        code: 'ROOM-RJW',
        name: 'Ruang Rajawali (VIP Meeting)',
        location: 'Lantai 2 Gedung Admin Plant Batam',
        capacity: 12,
        description: 'Ruang meeting VIP untuk koordinasi lintas departemen dan tamu mitra strategis.',
        imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
        photos: [
          'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80',
        ],
        facilities: [
          { name: 'Smart TV 65 Inch UHD', quantity: 1, condition: 'GOOD' },
          { name: 'Video Conference HD Camera', quantity: 1, condition: 'GOOD' },
          { name: 'Speakerphone Bluetooth', quantity: 2, condition: 'GOOD' },
          { name: 'Magnetic Whiteboard', quantity: 1, condition: 'GOOD' },
          { name: 'AC Split Daikin 2 PK', quantity: 1, condition: 'GOOD' },
        ],
      },
      {
        code: 'ROOM-BTM',
        name: 'Ruang Batam Port (Operasional)',
        location: 'Lantai 1 Gedung Jetty & Logistik',
        capacity: 8,
        description: 'Ruang koordinasi operasional pelabuhan jetty, kapal pengangkut semen curah & distribusi.',
        imageUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80',
        photos: [
          'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80',
        ],
        facilities: [
          { name: 'Smart TV Display 55 Inch', quantity: 1, condition: 'GOOD' },
          { name: 'Whiteboard Operasional', quantity: 1, condition: 'GOOD' },
          { name: 'AC Split 1.5 PK', quantity: 1, condition: 'GOOD' },
          { name: 'CCTV Live Monitor Extension', quantity: 1, condition: 'GOOD' },
        ],
      },
      {
        code: 'ROOM-KLK',
        name: 'Ruang Klinker (Diskusi Teknis)',
        location: 'Lantai 1 Gedung Plant Workshop & Maintenance',
        capacity: 6,
        description: 'Ruang diskusi cepat untuk tim engineering teknis, perbaikan mesin kiln & mill.',
        imageUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1200&q=80',
        photos: [
          'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80',
        ],
        facilities: [
          { name: 'TV Display 50 Inch HDMI', quantity: 1, condition: 'GOOD' },
          { name: 'Whiteboard Magnetik', quantity: 1, condition: 'GOOD' },
          { name: 'AC Split 1 PK', quantity: 1, condition: 'GOOD' },
        ],
      },
    ];

    for (const r of roomsData) {
      const rawCheckinToken = `qr_in_${r.code.toLowerCase()}_${crypto.randomBytes(8).toString('hex')}`;
      const rawCheckoutToken = `qr_out_${r.code.toLowerCase()}_${crypto.randomBytes(8).toString('hex')}`;
      const checkinHash = hashToken(rawCheckinToken);
      const checkoutHash = hashToken(rawCheckoutToken);

      const room = await prisma.meetingRoom.create({
        data: {
          code: r.code,
          name: r.name,
          location: r.location,
          capacity: r.capacity,
          description: r.description,
          imageUrl: r.imageUrl,
          photos: r.photos || [r.imageUrl],
          qrCheckinTokenHash: checkinHash,
          qrCheckoutTokenHash: checkoutHash,
          qrCheckinTokenRaw: rawCheckinToken,
          qrCheckoutTokenRaw: rawCheckoutToken,
        },
      });
      rooms[r.code] = room;

      for (const fac of r.facilities) {
        await prisma.roomFacility.create({
          data: {
            roomId: room.id,
            name: fac.name,
            quantity: fac.quantity,
            condition: fac.condition,
          },
        });
      }
    }
  }

  // 5. Notification Recipients (HRGA)
  const hrgaRecipients = [
    {
      name: 'HRGA Operation Team',
      email: 'hrga.plantbatam@cemindogemilang.com',
      phone: '081177001122',
      channel: 'ALL',
    },
    {
      name: 'General Affairs Officer',
      email: 'ga.batam@cemindogemilang.com',
      phone: '081270009988',
      channel: 'WHATSAPP',
    },
  ];

  for (const rec of hrgaRecipients) {
    const existing = await prisma.notificationRecipient.findFirst({
      where: { email: rec.email },
    });
    if (!existing) {
      await prisma.notificationRecipient.create({ data: rec });
    }
  }

  // 6. Demo Bookings & Sessions (Skip if bookings already exist or if demo users not found)
  const existingBookingsCount = await prisma.booking.count();
  if (existingBookingsCount > 0) {
    console.log(`[Seed] Found ${existingBookingsCount} existing bookings in database. Preserving existing operational bookings, skipping demo booking generation.`);
    return;
  }

  const demoUser = users['budi.santoso@cemindogemilang.com'] || Object.values(users)[0] || (await prisma.user.findFirst());
  if (!demoUser || !rooms['ROOM-SMP']) {
    console.log('[Seed] Skipping demo bookings as demo users/rooms are not standard.');
    return;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();

  // Completed booking yesterday
  const yesterdayStart = new Date(year, month, date - 1, 9, 0, 0);
  const yesterdayEnd = new Date(year, month, date - 1, 11, 0, 0);
  const yesterdayCheckin = new Date(year, month, date - 1, 8, 58, 0);
  const yesterdayCheckout = new Date(year, month, date - 1, 10, 55, 0);

  const b1 = await prisma.booking.upsert({
    where: { bookingCode: 'BKG-YDAY-001' },
    update: {},
    create: {
      bookingCode: 'BKG-YDAY-001',
      roomId: rooms['ROOM-SMP'].id,
      userId: demoUser.id,
      title: 'Review Target Produksi Mingguan Plant Batam',
      meetingType: 'INTERNAL',
      attendeesCount: 15,
      notes: 'Evaluasi output semen sak & curah minggu ke-2.',
      startTime: yesterdayStart,
      endTime: yesterdayEnd,
      status: 'COMPLETED',
    },
  });

  await prisma.roomUsageSession.upsert({
    where: { bookingId: b1.id },
    update: {},
    create: {
      bookingId: b1.id,
      roomId: rooms['ROOM-SMP'].id,
      actualCheckin: yesterdayCheckin,
      actualCheckout: yesterdayCheckout,
      status: 'COMPLETED',
    },
  });

  // OVERDUE session today: started earlier today, ended 30 mins ago, NOT checked out!
  // This allows HRGA to immediately demo "Overdue Sessions" and "Manual Checkout"!
  const overdueStart = new Date(now.getTime() - 90 * 60 * 1000); // 1.5 hours ago
  const overdueEnd = new Date(now.getTime() - 30 * 60 * 1000);   // 30 mins ago
  const overdueActualCheckin = new Date(now.getTime() - 88 * 60 * 1000);

  const bOverdue = await prisma.booking.upsert({
    where: { bookingCode: 'BKG-DEMO-OVERDUE' },
    update: {
      startTime: overdueStart,
      endTime: overdueEnd,
      status: 'CHECKED_IN',
    },
    create: {
      bookingCode: 'BKG-DEMO-OVERDUE',
      roomId: rooms['ROOM-BTM']?.id || rooms['ROOM-SMP'].id,
      userId: users['hendra.wijaya@cemindogemilang.com']?.id || demoUser.id,
      title: 'Bongkar Muatan Klinker Kapal MV Batam Star',
      meetingType: 'OPERATIONAL',
      attendeesCount: 6,
      notes: 'Koordinasi tim logistik pelabuhan dan surveyor independen.',
      startTime: overdueStart,
      endTime: overdueEnd,
      status: 'CHECKED_IN',
    },
  });

  await prisma.roomUsageSession.upsert({
    where: { bookingId: bOverdue.id },
    update: {
      actualCheckin: overdueActualCheckin,
      actualCheckout: null,
      status: 'OVERDUE',
    },
    create: {
      bookingId: bOverdue.id,
      roomId: rooms['ROOM-BTM']?.id || rooms['ROOM-SMP'].id,
      actualCheckin: overdueActualCheckin,
      status: 'OVERDUE',
    },
  });

  // Upcoming confirmed booking for later today
  const upcomingStart = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
  const upcomingEnd = new Date(now.getTime() + 120 * 60 * 1000);  // 2 hours from now

  await prisma.booking.upsert({
    where: { bookingCode: 'BKG-DEMO-UPCOMING' },
    update: {
      startTime: upcomingStart,
      endTime: upcomingEnd,
      status: 'CONFIRMED',
    },
    create: {
      bookingCode: 'BKG-DEMO-UPCOMING',
      roomId: rooms['ROOM-RJW']?.id || rooms['ROOM-SMP'].id,
      userId: users['siti.aminah@cemindogemilang.com']?.id || demoUser.id,
      title: 'Audit Kelayakan Preventive Maintenance Ball Mill #2',
      meetingType: 'INTERNAL',
      attendeesCount: 8,
      notes: 'Pembahasan jadwal shutdown mill dan suku cadang bearing.',
      startTime: upcomingStart,
      endTime: upcomingEnd,
      status: 'CONFIRMED',
    },
  });

  // Seed sample notification logs
  await prisma.notificationLog.createMany({
    data: [
      {
        eventType: 'BOOKING_CREATED',
        channel: 'EMAIL',
        recipient: 'budi.santoso@cemindogemilang.com',
        status: 'MOCK_SENT',
        providerResponse: 'Simulated 250 Message queued (Mock Mode)',
        isMock: true,
      },
      {
        eventType: 'BOOKING_CREATED',
        channel: 'WHATSAPP',
        recipient: '081270003003',
        status: 'MOCK_SENT',
        providerResponse: 'Simulated 200 OK wamid:HBgLM... (Mock Mode)',
        isMock: true,
      },
      {
        eventType: 'REMINDER_20M',
        channel: 'EMAIL',
        recipient: 'siti.aminah@cemindogemilang.com',
        status: 'MOCK_SENT',
        providerResponse: 'Simulated 250 Reminder queued (Mock Mode)',
        isMock: true,
      },
    ],
  });

  console.log('Seed completed successfully!');
  console.log('--- DEMO ACCOUNTS ---');
  console.log('Administrator : admin@cemindogemilang.com / Password123!');
  console.log('HRGA Officer  : hrga@cemindogemilang.com  / Password123!');
  console.log('Employee      : budi.santoso@cemindogemilang.com / Password123!');
  console.log('Employee      : siti.aminah@cemindogemilang.com  / Password123!');
  console.log('Employee      : hendra.wijaya@cemindogemilang.com / Password123!');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

