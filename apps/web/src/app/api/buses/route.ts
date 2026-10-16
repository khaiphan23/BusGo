import { NextResponse } from 'next/server';
import { prisma } from '@bus/db';

export async function GET() {
  try {
    const buses = await prisma.bus.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        route: true,
        slots: {
          where: {
            status: { in: ['BOOKED', 'OCCUPIED'] },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const busPositions = buses.map((bus) => ({
      id: bus.id,
      licensePlate: bus.licensePlate,
      lat: bus.currentLat,
      lng: bus.currentLng,
      heading: bus.heading ?? undefined,
      speed: bus.speed ?? undefined,
      status: bus.status,
      route: {
        id: bus.route.id,
        name: bus.route.name,
        code: bus.route.code,
        color: bus.route.color,
      },
      capacity: bus.capacity,
      currentOccupancy: bus.slots.length,
      updatedAt: bus.updatedAt.toISOString(),
    }));

    return NextResponse.json(busPositions);
  } catch (error) {
    console.error('[API /buses] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch buses' }, { status: 500 });
  }
}