import * as z from 'zod'

// Schema for completing a chore
export const choreCompletionSchema = z.object({
    choreId: z.string(),
    note: z.string().optional(),
    photoUrl: z.string().optional()
  })