import { z } from 'zod';

export const phoneSchema = z.string().regex(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, 'Số điện thoại không hợp lệ');

export const emailSchema = z.string().email('Email không hợp lệ');

export const passwordSchema = z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự').max(128);

export const fullNameSchema = z.string().min(2, 'Họ tên tối thiểu 2 ký tự').max(100);

export const idNumberSchema = z.string().regex(/^[0-9]{12}$/, 'CCCD/VNeID phải có 12 chữ số');

export const licensePlateSchema = z.string().regex(/^[0-9]{2}[A-Z]-[0-9]{4,5}$/, 'Biển số xe không hợp lệ (VD: 51A-12345)');

export const latLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type Phone = z.infer<typeof phoneSchema>;
export type Email = z.infer<typeof emailSchema>;
export type Password = z.infer<typeof passwordSchema>;
export type FullName = z.infer<typeof fullNameSchema>;
export type IdNumber = z.infer<typeof idNumberSchema>;
export type LicensePlate = z.infer<typeof licensePlateSchema>;
export type LatLng = z.infer<typeof latLngSchema>;
