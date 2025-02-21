// lib/validations/chores.ts
import * as z from 'zod'

// Validation schema for creating a chore
export const choreSchema = (
  availableRankIds: string[], 
  availableFrequencyIds: string[]
) => {
  return z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    rankId: z.enum(availableRankIds as [string, ...string[]]),
    frequencyId: z.enum(availableFrequencyIds as [string, ...string[]]),
    assignedToId: z.string().optional()
  });
}

// Partial validation for updates
export const choreUpdateSchema = (
  availableRankIds: string[],
  availableFrequencyIds: string[]
) => {
  const schema = choreSchema(availableRankIds, availableFrequencyIds);
  return schema.partial();
}




