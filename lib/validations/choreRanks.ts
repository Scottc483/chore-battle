import * as z  from 'zod';

// Schema for creating/updating a rank

export const rankSchema = z.object({
  name: z.string().min(1).max(30),
  displayName: z.string().min(1).max(50),
  pointValue: z.number().int().positive().max(1000)  // Reasonable upper limit
})