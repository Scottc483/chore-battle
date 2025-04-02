import { z } from 'zod'
import { RewardClaimStatus } from '@prisma/client'

// Schema for creating/updating rewards
export const rewardSchema = z.object({
  title: z.string()
    .min(1, { message: 'Title is required' })
    .max(100, { message: 'Title cannot exceed 100 characters' }),
  description: z.string()
    .max(500, { message: 'Description cannot exceed 500 characters' })
    .optional(),
  pointsCost: z.number()
    .int({ message: 'Points cost must be a whole number' })
    .positive({ message: 'Points cost must be positive' }),
  isRepeatable: z.boolean().default(true),
  maxClaims: z.number()
    .int({ message: 'Max claims must be a whole number' })
    .positive({ message: 'Max claims must be positive' })
    .optional()
})

// Schema for claiming a reward
export const rewardClaimSchema = z.object({
  notes: z.string()
    .max(500, { message: 'Notes cannot exceed 500 characters' })
    .optional()
})

// Schema for updating a claim status
export const updateClaimStatusSchema = z.object({
  status: z.enum([RewardClaimStatus.COMPLETED, RewardClaimStatus.CANCELLED]),
  notes: z.string()
    .max(500, { message: 'Notes cannot exceed 500 characters' })
    .optional()
}) 