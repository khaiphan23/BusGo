import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  otpSchema,
  type LoginInput,
  type RegisterInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type OtpInput,
} from '../auth';

const validLogin = {
  email: 'nguoidung@example.com',
  password: 'matkhau123',
};

const validRegister = {
  email: 'nguoidung@example.com',
  password: 'matkhau123',
  confirmPassword: 'matkhau123',
  fullName: 'Nguyễn Văn A',
  phone: '0912345678',
};

describe('Auth Validators', () => {
  describe('loginSchema', () => {
    it('accepts valid login', () => {
      const result = loginSchema.parse(validLogin);
      expect(result).toEqual(validLogin);
    });

    it('rejects invalid email with Vietnamese message', () => {
      const result = loginSchema.safeParse({ ...validLogin, email: 'khong-phai-email' });
      expect(result.success).toBe(false);
      expect(result.success === false && result.error.issues[0].message).toBe('Email không hợp lệ');
    });

    it('rejects short password with Vietnamese message', () => {
      const result = loginSchema.safeParse({ ...validLogin, password: 'abc1234' });
      expect(result.success).toBe(false);
      expect(result.success === false && result.error.issues[0].message).toBe('Mật khẩu tối thiểu 8 ký tự');
    });

    it('rejects missing password', () => {
      const result = loginSchema.safeParse({ email: validLogin.email });
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('accepts valid register', () => {
      const result = registerSchema.parse(validRegister);
      expect(result).toEqual(validRegister);
    });

    it('accepts register without optional phone', () => {
      const { phone, ...withoutPhone } = validRegister;
      const result = registerSchema.parse(withoutPhone);
      expect(result.phone).toBeUndefined();
    });

    it('accepts Vietnamese phone with +84 prefix', () => {
      const result = registerSchema.parse({ ...validRegister, phone: '+84912345678' });
      expect(result.phone).toBe('+84912345678');
    });

    it('rejects invalid Vietnamese phone with Vietnamese message', () => {
      const result = registerSchema.safeParse({ ...validRegister, phone: '0123456789' });
      expect(result.success).toBe(false);
      expect(result.success === false && result.error.issues[0].message).toBe('Số điện thoại không hợp lệ');
    });

    it('rejects short password with Vietnamese message', () => {
      const result = registerSchema.safeParse({
        ...validRegister,
        password: 'abc1234',
        confirmPassword: 'abc1234',
      });
      expect(result.success).toBe(false);
      expect(result.success === false && result.error.issues[0].message).toBe('Mật khẩu tối thiểu 8 ký tự');
    });

    it('rejects too-short full name with Vietnamese message', () => {
      const result = registerSchema.safeParse({ ...validRegister, fullName: 'A' });
      expect(result.success).toBe(false);
      expect(result.success === false && result.error.issues[0].message).toBe('Họ tên tối thiểu 2 ký tự');
    });

    it('rejects mismatched confirmPassword with Vietnamese message on confirmPassword path', () => {
      const result = registerSchema.safeParse({ ...validRegister, confirmPassword: 'khac12345' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Mật khẩu xác nhận không khớp');
        expect(result.error.issues[0].path).toEqual(['confirmPassword']);
      }
    });
  });

  describe('forgotPasswordSchema', () => {
    it('accepts valid email', () => {
      const result = forgotPasswordSchema.parse({ email: 'nguoidung@example.com' });
      expect(result).toEqual({ email: 'nguoidung@example.com' });
    });

    it('rejects invalid email with Vietnamese message', () => {
      const result = forgotPasswordSchema.safeParse({ email: 'khong-phai-email' });
      expect(result.success).toBe(false);
      expect(result.success === false && result.error.issues[0].message).toBe('Email không hợp lệ');
    });
  });

  describe('resetPasswordSchema', () => {
    const validReset = {
      password: 'matkhau123',
      confirmPassword: 'matkhau123',
    };

    it('accepts valid reset', () => {
      const result = resetPasswordSchema.parse(validReset);
      expect(result).toEqual(validReset);
    });

    it('rejects short password with Vietnamese message', () => {
      const result = resetPasswordSchema.safeParse({ password: 'abc', confirmPassword: 'abc' });
      expect(result.success).toBe(false);
      expect(result.success === false && result.error.issues[0].message).toBe('Mật khẩu tối thiểu 8 ký tự');
    });

    it('rejects mismatched confirmPassword with Vietnamese message', () => {
      const result = resetPasswordSchema.safeParse({ ...validReset, confirmPassword: 'khac12345' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Mật khẩu xác nhận không khớp');
        expect(result.error.issues[0].path).toEqual(['confirmPassword']);
      }
    });
  });

  describe('otpSchema', () => {
    const validOtp = {
      email: 'nguoidung@example.com',
      token: '123456',
    };

    it('accepts valid 6-digit OTP', () => {
      const result = otpSchema.parse(validOtp);
      expect(result).toEqual(validOtp);
    });

    it('rejects OTP shorter than 6 digits with Vietnamese message', () => {
      const result = otpSchema.safeParse({ ...validOtp, token: '12345' });
      expect(result.success).toBe(false);
      expect(result.success === false && result.error.issues[0].message).toBe('Mã OTP phải gồm 6 chữ số');
    });

    it('rejects non-digit OTP with Vietnamese message', () => {
      const result = otpSchema.safeParse({ ...validOtp, token: 'abcdef' });
      expect(result.success).toBe(false);
      expect(result.success === false && result.error.issues[0].message).toBe('Mã OTP phải gồm 6 chữ số');
    });

    it('rejects empty OTP', () => {
      const result = otpSchema.safeParse({ ...validOtp, token: '' });
      expect(result.success).toBe(false);
    });
  });

  it('exports inferred input types', () => {
    const login: LoginInput = validLogin;
    const register: RegisterInput = validRegister;
    const forgotPassword: ForgotPasswordInput = { email: 'nguoidung@example.com' };
    const resetPassword: ResetPasswordInput = { password: 'matkhau123', confirmPassword: 'matkhau123' };
    const otp: OtpInput = { email: 'nguoidung@example.com', token: '123456' };

    expect(login.email).toBe('nguoidung@example.com');
    expect(register.fullName).toBe('Nguyễn Văn A');
    expect(forgotPassword.email).toBe('nguoidung@example.com');
    expect(resetPassword.confirmPassword).toBe('matkhau123');
    expect(otp.token).toBe('123456');
  });
});
