// lib/types/chores.ts
import { z } from 'zod'
import { frequencySchema} from '../validations/choreFrequencies'
import { rankSchema } from '../validations/choreRanks'
import { User, Chore, ChoreRank, ChoreFrequency, ChoreCompletion as PrismaChoreCompletion } from '.prisma/client'

// Extract types from validation schemas
export type FrequencyInput = z.infer<typeof frequencySchema>
export type RankInput = z.infer<typeof rankSchema>

// Define basic user type for responses
export interface UserBasic {
  id: string
  name: string
}

// Define completion response type
export interface ChoreCompletionResponse {
  completedAt: Date
  completedBy: UserBasic
}

// Frequency info for responses
export interface FrequencyInfo {
  id: string
  name: string
  displayName: string
  daysInterval: number
  isSystem: boolean
}

// Rank info for responses
export interface RankInfo {
  id: string
  name: string
  displayName: string
  pointValue: number
  isSystem: boolean
}

// Define response type for a single chore
export interface ChoreResponse {
  id: string
  title: string
  description?: string | null
  rank: RankInfo
  frequency: FrequencyInfo
  isComplete: boolean
  nextReset: Date
  currentStreak: number
  totalCompletions: number
  assignedTo: UserBasic | null
  createdBy: UserBasic
  lastCompletion: ChoreCompletionResponse | null
}

// Full chore type with all relations
export type ChoreWithRelations = Chore & {
  assignedTo: User | null
  createdBy: User
  rank: ChoreRank
  frequency: ChoreFrequency
  completions: (PrismaChoreCompletion & {
    user: User
  })[]
}

// Frequency with household info
export type FrequencyWithHousehold = ChoreFrequency & {
  household: {
    id: string
    name: string
  }
}

// Rank with household info
export type RankWithHousehold = ChoreRank & {
  household: {
    id: string
    name: string
  }
}