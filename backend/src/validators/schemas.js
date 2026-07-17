import { z } from 'zod';

// Strong password regex requirement (Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// 1. Auth Schemas
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').trim(),
  password: z.string().min(1, 'Password is required')
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase()
});

// 2. College Schemas
export const collegeSchema = z.object({
  collegeCode: z.string().min(2, 'College code must be at least 2 characters').trim(),
  collegeName: z.string().min(3, 'College name must be at least 3 characters').trim(),
  district: z.string().trim().optional().or(z.literal('')),
  principalName: z.string().min(2, 'Principal name is required').trim(),
  principalMobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number. Must be 10 digits starting with 6-9'),
  principalEmail: z.string().email('Invalid email address').trim().toLowerCase(),
  portalStatus: z.enum(['active', 'inactive']).optional()
});
