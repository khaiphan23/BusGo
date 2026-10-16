import { z } from 'zod';
import { emailSchema, fullNameSchema, idNumberSchema } from './atomic';

export * from './atomic';
export * from './bus';
export * from './auth';

export const bookingCreateSchema = z.object({
  busId: z.string().cuid(),
  routeId: z.string().cuid(),
  fromStopId: z.string().cuid(),
  toStopId: z.string().cuid(),
  slotId: z.string().cuid().optional(),
});

export const idDeclarationCreateSchema = z.object({
  fullName: fullNameSchema,
  idNumber: idNumberSchema,
  idType: z.enum(['CCCD', 'VNEID', 'PASSPORT']),
  frontImageUrl: z.string().url().optional(),
  backImageUrl: z.string().url().optional(),
  bookingId: z.string().cuid().optional(),
});

export const routeCreateSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(20).regex(/^[A-Z0-9-]+$/),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3B82F6'),
});

export const stopCreateSchema = z.object({
  name: z.string().min(2).max(100),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().optional(),
  stopCode: z.string().max(20).optional(),
});

export type BookingCreate = z.infer<typeof bookingCreateSchema>;
export type IdDeclarationCreate = z.infer<typeof idDeclarationCreateSchema>;
export type RouteCreate = z.infer<typeof routeCreateSchema>;
export type StopCreate = z.infer<typeof stopCreateSchema>;
