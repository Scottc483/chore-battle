// lib/validations/frequencies.ts
import * as z from 'zod'

export const frequencySchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(30, 'Name cannot exceed 30 characters')
    .regex(/^[A-Z0-9_]+$/, 'Name must be uppercase with underscores only'),
  displayName: z.string()
    .min(1, 'Display name is required')
    .max(50, 'Display name cannot exceed 50 characters'),
  daysInterval: z.number()
    .int('Days interval must be a whole number')
    .positive('Days interval must be positive')
    .max(365, 'Days interval cannot exceed 365 days')
})