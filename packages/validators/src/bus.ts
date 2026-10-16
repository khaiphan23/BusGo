import { z } from 'zod';

export const busStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'OFFLINE']);

export const routeSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export const busPositionSchema = z.object({
  id: z.string().cuid(),
  licensePlate: z.string().regex(/^[0-9]{2}[A-Z]-[0-9]{4,5}$/),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
  status: busStatusSchema,
  route: routeSchema,
  capacity: z.number().int().positive(),
  currentOccupancy: z.number().int().min(0),
  updatedAt: z.string().datetime(),
});

export const busRealtimePayloadSchema = z.object({
  eventType: z.enum(['INSERT', 'UPDATE', 'DELETE']),
  new: busPositionSchema,
  old: busPositionSchema.nullable(),
});

export const busPositionInputSchema = z.object({
  licensePlate: z.string().regex(/^[0-9]{2}[A-Z]-[0-9]{4,5}$/),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
  status: busStatusSchema.optional(),
  routeId: z.string().cuid(),
});

export const nearbyBusesQuerySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusMeters: z.number().int().positive().max(50000),
  limit: z.number().int().positive().max(100).optional(),
});

export const viewportBoundsSchema = z.object({
  north: z.number().min(-90).max(90),
  south: z.number().min(-90).max(90),
  east: z.number().min(-180).max(180),
  west: z.number().min(-180).max(180),
});

export type BusStatus = z.infer<typeof busStatusSchema>;
export type Route = z.infer<typeof routeSchema>;
export type BusPosition = z.infer<typeof busPositionSchema>;
export type BusRealtimePayload = z.infer<typeof busRealtimePayloadSchema>;
export type BusPositionInput = z.infer<typeof busPositionInputSchema>;
export type NearbyBusesQuery = z.infer<typeof nearbyBusesQuerySchema>;
export type ViewportBounds = z.infer<typeof viewportBoundsSchema>;