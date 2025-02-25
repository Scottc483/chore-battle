// lib/validations/choreRanks.ts
import { z } from 'zod'

// Define the validation schema for creating/updating chore ranks
export const rankSchema = z.object({
  name: z.string()
    .min(1, { message: 'Rank name is required' })
    .max(50, { message: 'Rank name cannot exceed 50 characters' })
    .regex(/^[a-zA-Z0-9_]+$/, { 
      message: 'Rank name can only contain letters, numbers, and underscores' 
    }),
  displayName: z.string()
    .min(1, { message: 'Display name is required' })
    .max(50, { message: 'Display name cannot exceed 50 characters' }),
  pointValue: z.number()
    .int({ message: 'Point value must be a whole number' })
    .positive({ message: 'Point value must be a positive number' })
    .max(1000, { message: 'Point value cannot exceed 1000' })
})

// Validation schema for updating ranks (all fields optional)
export const rankUpdateSchema = rankSchema.partial().extend({
  id: z.string().min(1, { message: 'Rank ID is required' })
})

// Schema for deleting a rank
export const rankDeleteSchema = z.object({
  id: z.string().min(1, { message: 'Rank ID is required' })
})