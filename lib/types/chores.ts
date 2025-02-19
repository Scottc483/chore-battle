// lib/types/chores.ts
import { z } from 'zod'
import { choreSchema, choreRanks, choreFrequencies } from '../validations/chores'
import { User, Chore, ChoreRankPoints } from '.prisma/client'



// Extract types from Zod schema
export type ChoreInput = z.infer<typeof choreSchema>

// Define enum types based on our validation arrays
export type ChoreRank = typeof choreRanks[number]
export type ChoreFrequency = typeof choreFrequencies[number]

// Define base user type for responses
export interface UserBasic {
  id: string
  name: string
}

// Define completion type
export interface ChoreCompletion {
  completedAt: Date
  completedBy: UserBasic
}

// Define response type for a single chore
export interface ChoreResponse {
  id: string
  title: string
  description?: string | null
  difficulty: ChoreRank
  frequency: ChoreFrequency
  isComplete: boolean
  nextReset: Date
  currentStreak: number
  totalCompletions: number
  pointValue: number
  assignedTo: UserBasic | null
  createdBy: UserBasic
  lastCompletion: ChoreCompletion | null
}


export type ChoreWithRelations = Chore & {
  assignedTo: User | null
  createdBy: User
  rankPoints: ChoreRankPoints
  completions: (ChoreCompletion & {
    user: User
  })[]
}
