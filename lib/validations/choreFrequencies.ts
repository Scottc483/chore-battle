import * as z from 'zod'

// Schema for creating/updating a frequency
export const frequencySchema = z.object({
  name: z.string().min(1).max(30),
  displayName: z.string().min(1).max(50),
  daysInterval: z.number().int().positive().max(365)  // Reasonable upper limit
})