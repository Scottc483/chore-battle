// lib/validations/chores.ts
import * as z from 'zod'

// Define enum values as arrays of literal strings
export const choreRanks = [
  'QUICK_WIN',
  'PIECE_OF_CAKE',
  'SMOOTH_SAILING',
  'WEEKDAY_WARRIOR',
  'CHALLENGE_READY',
  'TASK_MASTER',
  'WEEKEND_WARRIOR',
  'SUPER_ACHIEVER',
  'HOUSE_HERO',
  'LEGENDARY_EFFORT'
] as const

export const choreFrequencies = [
  'DAILY',
  'WEEKLY',
  'MONTHLY'
] as const

export const choreSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  difficulty: z.enum(choreRanks),
  frequency: z.enum(choreFrequencies),
  assignedToId: z.string().optional()
})

export const choreUpdateSchema = choreSchema.partial()

export const choreCompletionSchema = z.object({
  choreId: z.string(),
  note: z.string().optional(),
  photoUrl: z.string().optional()
})