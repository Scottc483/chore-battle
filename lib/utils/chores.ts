// lib/utils/chores.ts
import { ChoreFrequency } from '@prisma/client'

/**
 * Calculates the next reset date for a chore based on its frequency
 */
export function calculateNextReset(fromDate: Date, frequency: ChoreFrequency): Date {
  const nextReset = new Date(fromDate)
  nextReset.setDate(nextReset.getDate() + frequency.daysInterval)
  return nextReset
}

/**
 * Checks if a chore needs to be reset based on its next reset date
 */
export function isChoreExpired(nextReset: Date): boolean {
  const now = new Date()
  return now >= nextReset
}

/**
 * Resets a chore's completion status and updates its next reset date
 */
export function getChoreResetData(frequency: ChoreFrequency) {
  const now = new Date()
  return {
    isComplete: false,
    lastReset: now,
    nextReset: calculateNextReset(now, frequency),
    currentStreak: 0 // Reset streak when chore expires
  }
}