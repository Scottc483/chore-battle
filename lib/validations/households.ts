// lib/validations/households.ts
import { z } from 'zod';

// Validation schema for creating a household
export const householdCreateSchema = z.object({
  name: z.string()
    .min(1, { message: 'Household name is required' })
    .max(100, { message: 'Household name cannot exceed 100 characters' }),
});



// Validation schema for updating a household
export const householdUpdateSchema = householdCreateSchema.partial();

export const householdJoinSchema = z.object({
    inviteCode: z.string()
      .min(1, { message: 'Invite code is required' })
      .max(20, { message: 'Invite code cannot exceed 20 characters' }),
  });

  export const householdLeaveSchema = z.object({
    householdId: z.string()
      .min(1, { message: 'Household ID is required' })
  });

  export const householdTransferOwnershipSchema = z.object({
    householdId: z.string()
      .min(1, { message: 'Household ID is required' }),
    newOwnerId: z.string()
      .min(1, { message: 'New owner ID is required' })
      .max(20, { message: 'New owner ID cannot exceed 20 characters' }),
  });

  export const householdRemoveMemberSchema = z.object({
    householdId: z.string()
      .min(1, { message: 'Household ID is required' }),
    memberId: z.string()
      .min(1, { message: 'Member ID is required' })
  });

  export const householdDeleteSchema = z.object({
    id: z.string()
      .min(1, { message: 'Household ID is required' }),
  });

// Schema for the owner object
const ownerSchema = z.object({
  id: z.string().min(1, { message: 'Owner ID is required' }),
  name: z.string().min(1, { message: 'Owner name is required' }).max(100, { message: 'Owner name cannot exceed 100 characters' }),
  email: z.string().email({ message: 'Invalid email format' }).max(100, { message: 'Owner email cannot exceed 100 characters' }),
});

// Schema for the member object
const memberSchema = z.object({
  id: z.string().min(1, { message: 'Member ID is required' }),
  name: z.string().min(1, { message: 'Member name is required' }).max(100, { message: 'Member name cannot exceed 100 characters' }),
  email: z.string().email({ message: 'Invalid email format' }).max(100, { message: 'Member email cannot exceed 100 characters' }),
  totalPoints: z.number().nonnegative(), // Assuming totalPoints should be a non-negative number
});

// Schema for the count object
const countSchema = z.object({
  members: z.number().nonnegative(),
  chores: z.number().nonnegative(),
  rewards: z.number().nonnegative(),
});

// Schema for the household object
export const householdSchema = z.object({
  id: z.string().min(1, { message: 'Household ID is required' }),
  name: z.string().min(1, { message: 'Household name is required' }).max(100, { message: 'Household name cannot exceed 100 characters' }),
  inviteCode: z.string().min(1, { message: 'Invite code is required' }).max(20, { message: 'Invite code cannot exceed 20 characters' }),
  createdAt: z.string().refine((date) => !isNaN(Date.parse(date)), { message: 'Invalid date format for createdAt' }),
  updatedAt: z.string().refine((date) => !isNaN(Date.parse(date)), { message: 'Invalid date format for updatedAt' }),
  ownerId: z.string().min(1, { message: 'Owner ID is required' }),
  owner: ownerSchema,
  members: z.array(memberSchema),
  _count: countSchema,
});

// Schema for the response containing households
export const householdsResponseSchema = z.object({
  households: householdSchema,
});

export const householdGetReturnSchema = z.object({
  id: z.string()
    .min(1, { message: 'Household ID is required' }),
  name: z.string()
    .min(1, { message: 'Household name is required' })
    .max(100, { message: 'Household name cannot exceed 100 characters' }),
  owner: z.object({
    id: z.string()
      .min(1, { message: 'Owner ID is required' }),
    name: z.string()
      .min(1, { message: 'Owner name is required' })
      .max(100, { message: 'Owner name cannot exceed 100 characters' }),
    email: z.string()
      .min(1, { message: 'Owner email is required' })
      .max(100, { message: 'Owner email cannot exceed 100 characters' }),
  }),
  _count: z.object({
    members: z.number(),
    chores: z.number(),
  }),
});



