import { PrismaClient, Role, ResourceStatus, ReservationStatus, MaintenanceStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[INFO] Starting SyncSpace database seed...');

  // 1. Clean existing records in correct relation order
  await prisma.maintenanceLog.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log('[INFO] Existing data cleaned.');

  // 2. Create Users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        id: 'user-admin-01',
        name: 'Sarah Jenkins',
        email: 'admin@syncspace.io',
        role: Role.ADMIN,
        department: 'Operations & Facilities',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      },
    }),
    prisma.user.create({
      data: {
        id: 'user-member-01',
        name: 'Alex Morgan',
        email: 'alex.member@syncspace.io',
        role: Role.MEMBER,
        department: 'Software Engineering',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      },
    }),
    prisma.user.create({
      data: {
        id: 'user-member-02',
        name: 'Elena Rodriguez',
        email: 'elena.rodriguez@syncspace.io',
        role: Role.MEMBER,
        department: 'Product Design',
        avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
      },
    }),
    prisma.user.create({
      data: {
        id: 'user-member-03',
        name: 'David Kim',
        email: 'david.kim@syncspace.io',
        role: Role.MEMBER,
        department: 'Data Science & AI',
        avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
      },
    }),
  ]);

  console.log(`[INFO] Created ${users.length} users.`);

  // 3. Create Categories
  const catMeeting = await prisma.category.create({
    data: {
      id: 'cat-meeting-spaces',
      name: 'Meeting Spaces',
      slug: 'meeting-spaces',
      description: 'Executive boardrooms, huddle spaces, and video conference facilities.',
      iconName: 'Building2',
    },
  });

  const catWorkstations = await prisma.category.create({
    data: {
      id: 'cat-workstations-pods',
      name: 'Workstations & Pods',
      slug: 'workstations-pods',
      description: 'Ergonomic hot desks, quiet focus pods, and dual-monitor team benches.',
      iconName: 'Laptop',
    },
  });

  const catHardware = await prisma.category.create({
    data: {
      id: 'cat-lab-hardware',
      name: 'Lab & Hardware',
      slug: 'lab-hardware',
      description: 'Prototyping equipment, GPU compute servers, and specialized testing benches.',
      iconName: 'Cpu',
    },
  });

  const catVehicles = await prisma.category.create({
    data: {
      id: 'cat-company-vehicles',
      name: 'Company Vehicles',
      slug: 'company-vehicles',
      description: 'Electric pool vehicles and passenger shuttles for client visits and events.',
      iconName: 'Car',
    },
  });

  console.log('[INFO] Created 4 resource categories.');

  // 4. Create Resources
  const rBoardroom = await prisma.resource.create({
    data: {
      id: 'res-boardroom-alpha',
      categoryId: catMeeting.id,
      name: 'Boardroom Alpha',
      code: 'CR-01',
      location: 'Floor 3, East Wing',
      capacity: 16,
      description: 'Executive boardroom equipped with dual 75" 4K displays, Logitech Rally video conferencing, and digital whiteboard.',
      status: ResourceStatus.AVAILABLE,
      requiresApproval: false,
      bufferMinutes: 15,
      imageUrl: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80',
    },
  });

  const rHuddle = await prisma.resource.create({
    data: {
      id: 'res-huddle-vega',
      categoryId: catMeeting.id,
      name: 'Huddle Room Vega',
      code: 'CR-02',
      location: 'Floor 2, West Wing',
      capacity: 4,
      description: 'Compact team huddle space with 55" TV, acoustic felt wall panelling, and conference speakerphone.',
      status: ResourceStatus.AVAILABLE,
      requiresApproval: false,
      bufferMinutes: 0,
      imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    },
  });

  const rAuditorium = await prisma.resource.create({
    data: {
      id: 'res-all-hands-studio',
      categoryId: catMeeting.id,
      name: 'All-Hands Auditorium',
      code: 'EV-01',
      location: 'Ground Floor, Central Atrium',
      capacity: 80,
      description: 'Full-stage auditorium with directional microphones, surround sound, live stream camera arrays, and projector.',
      status: ResourceStatus.AVAILABLE,
      requiresApproval: true,
      bufferMinutes: 30,
      imageUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=800&q=80',
    },
  });

  const rFocusPod = await prisma.resource.create({
    data: {
      id: 'res-quiet-pod-04',
      categoryId: catWorkstations.id,
      name: 'Quiet Focus Pod #4',
      code: 'POD-04',
      location: 'Floor 4, Quiet Library Zone',
      capacity: 1,
      description: 'Sound-isolated acoustic cabin with adjustable sit-stand desk, ventilation, USB-C docking, and task lighting.',
      status: ResourceStatus.AVAILABLE,
      requiresApproval: false,
      bufferMinutes: 0,
      imageUrl: 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=800&q=80',
    },
  });

  const rDevBench = await prisma.resource.create({
    data: {
      id: 'res-dev-bench-12',
      categoryId: catWorkstations.id,
      name: 'Dual-Monitor Dev Bench 12',
      code: 'DSK-12',
      location: 'Floor 2, Engineering Hub',
      capacity: 2,
      description: 'Pair programming workstation with dual 27" 4K Dell monitors, mechanical keyboards, and Herman Miller chairs.',
      status: ResourceStatus.AVAILABLE,
      requiresApproval: false,
      bufferMinutes: 0,
      imageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
    },
  });

  const rHardwareLab = await prisma.resource.create({
    data: {
      id: 'res-hw-proto-lab',
      categoryId: catHardware.id,
      name: 'Hardware Prototyping Lab',
      code: 'LAB-01',
      location: 'Building B, Basement 1',
      capacity: 8,
      description: 'Electronics lab with digital oscilloscopes, soldering stations, ESD flooring, logic analyzers, and 3D printers.',
      status: ResourceStatus.AVAILABLE,
      requiresApproval: true,
      bufferMinutes: 20,
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    },
  });

  const rGpuRig = await prisma.resource.create({
    data: {
      id: 'res-gpu-cluster-02',
      categoryId: catHardware.id,
      name: 'GPU Compute Server (4x RTX 4090)',
      code: 'SRV-02',
      location: 'Server Room 104',
      capacity: 1,
      description: 'Dedicated high-performance workstation for deep learning training, LLM inference experiments, and rendering.',
      status: ResourceStatus.AVAILABLE,
      requiresApproval: true,
      bufferMinutes: 0,
      imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    },
  });

  const rTesla = await prisma.resource.create({
    data: {
      id: 'res-tesla-model-3',
      categoryId: catVehicles.id,
      name: 'Tesla Model 3 Long Range',
      code: 'VH-01',
      location: 'Basement Parking Bay A-12',
      capacity: 5,
      description: 'Electric company pool car with 500km range, autopilot navigation, and corporate toll pass.',
      status: ResourceStatus.AVAILABLE,
      requiresApproval: true,
      bufferMinutes: 30,
      imageUrl: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=800&q=80',
    },
  });

  const rShuttle = await prisma.resource.create({
    data: {
      id: 'res-executive-shuttle',
      categoryId: catVehicles.id,
      name: 'Executive Transit Shuttle',
      code: 'VH-02',
      location: 'Basement Parking Bay B-04',
      capacity: 8,
      description: 'High-roof passenger van for group travel, airport pickups, and customer demonstrations.',
      status: ResourceStatus.MAINTENANCE, // Currently in maintenance to test status badges!
      requiresApproval: true,
      bufferMinutes: 30,
      imageUrl: 'https://images.unsplash.com/photo-1559297434-fae8a1916a79?auto=format&fit=crop&w=800&q=80',
    },
  });

  console.log('[INFO] Created 9 resources across all categories.');

  // 5. Create Realistic Reservations
  const now = new Date();
  
  // Helper to get dates relative to today
  const setTime = (dayOffset: number, hours: number, minutes: number = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  const reservations = await Promise.all([
    // Today: Engineering Sprint Standup in Boardroom Alpha
    prisma.reservation.create({
      data: {
        resourceId: rBoardroom.id,
        userId: 'user-member-01', // Alex Morgan
        title: 'Sprint Planning & Backlog Grooming',
        purpose: 'Bi-weekly engineering sprint alignment and task estimation.',
        startTime: setTime(0, 9, 30),
        endTime: setTime(0, 11, 0),
        status: ReservationStatus.CONFIRMED,
      },
    }),

    // Today: Design Review in Boardroom Alpha (Afternoon)
    prisma.reservation.create({
      data: {
        resourceId: rBoardroom.id,
        userId: 'user-member-02', // Elena Rodriguez
        title: 'Mobile App Design System Review',
        purpose: 'Walkthrough of newly finalized Figma design tokens and component specs.',
        startTime: setTime(0, 14, 0),
        endTime: setTime(0, 15, 30),
        status: ReservationStatus.CONFIRMED,
      },
    }),

    // Today: 1-on-1 Mentorship in Huddle Room Vega
    prisma.reservation.create({
      data: {
        resourceId: rHuddle.id,
        userId: 'user-member-01', // Alex Morgan
        title: 'Weekly 1-on-1 Sync',
        purpose: 'Career progression check-in and quarterly goals.',
        startTime: setTime(0, 11, 0),
        endTime: setTime(0, 12, 0),
        status: ReservationStatus.CONFIRMED,
      },
    }),

    // Today: ML Training on GPU Rig
    prisma.reservation.create({
      data: {
        resourceId: rGpuRig.id,
        userId: 'user-member-03', // David Kim
        title: 'Fine-Tuning Llama 3 Vision Model',
        purpose: 'Running 4-GPU distributed training benchmark on custom OCR dataset.',
        startTime: setTime(0, 12, 0),
        endTime: setTime(0, 18, 0),
        status: ReservationStatus.CONFIRMED,
      },
    }),

    // Tomorrow: All-Hands Company Town Hall
    prisma.reservation.create({
      data: {
        resourceId: rAuditorium.id,
        userId: 'user-admin-01', // Sarah Jenkins
        title: 'Q4 Company All-Hands Meeting',
        purpose: 'Executive briefing, team milestones, and open Q&A.',
        startTime: setTime(1, 10, 0),
        endTime: setTime(1, 12, 0),
        status: ReservationStatus.CONFIRMED,
      },
    }),

    // Tomorrow: Pending Approval booking for Tesla Model 3
    prisma.reservation.create({
      data: {
        resourceId: rTesla.id,
        userId: 'user-member-01', // Alex Morgan
        title: 'Client On-Site Deployment & Visit',
        purpose: 'Visiting downtown client headquarters for enterprise setup.',
        startTime: setTime(1, 13, 0),
        endTime: setTime(1, 17, 30),
        status: ReservationStatus.PENDING, // Shows in Admin Approval Queue!
      },
    }),

    // Day After Tomorrow: Pending Hardware Lab booking
    prisma.reservation.create({
      data: {
        resourceId: rHardwareLab.id,
        userId: 'user-member-03', // David Kim
        title: 'IoT Sensor Calibration & Soldering',
        purpose: 'Assembly and signal testing for edge computing sensor nodes.',
        startTime: setTime(2, 9, 0),
        endTime: setTime(2, 12, 0),
        status: ReservationStatus.PENDING,
      },
    }),

    // Yesterday: Past completed meeting
    prisma.reservation.create({
      data: {
        resourceId: rBoardroom.id,
        userId: 'user-member-02', // Elena
        title: 'Customer Experience Brainstorm',
        purpose: 'Quarterly retrospective on user feedback and satisfaction metrics.',
        startTime: setTime(-1, 14, 0),
        endTime: setTime(-1, 16, 0),
        status: ReservationStatus.CONFIRMED,
      },
    }),
  ]);

  console.log(`[INFO] Created ${reservations.length} sample reservations.`);

  // 6. Create Maintenance Log
  await prisma.maintenanceLog.create({
    data: {
      resourceId: rShuttle.id,
      startTime: setTime(0, 8, 0),
      endTime: setTime(2, 18, 0),
      reason: 'Scheduled 50,000km brake pad replacement, tire rotation, and safety inspection.',
      performedBy: 'Prime Fleet Services',
      status: MaintenanceStatus.IN_PROGRESS,
      notes: 'Parts ordered; expected back in service by Thursday morning.',
    },
  });

  console.log('[INFO] Created maintenance record for Executive Transit Shuttle.');
  console.log('[SUCCESS] SyncSpace database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('[ERROR] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
