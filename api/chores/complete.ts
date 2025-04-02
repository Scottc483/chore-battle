// api/chores/complete.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from '../../lib/prisma'
import { withAuth } from '../../lib/middleware/auth'
import { choreCompletionSchema } from '../../lib/validations/choreCompletions'
import { calculateNextReset } from '../../lib/utils/chores'

async function completeChore(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { decodedUser } = req.body
  const { id } = req.query

  if (!decodedUser.householdId) {
    return res.status(403).json({ error: 'User must be part of a household to complete chores' })
  }

  try {
    // Validate input
    const validatedData = choreCompletionSchema.parse(req.body)

    // Get the chore and verify access
    const chore = await prisma.chore.findFirst({
      where: {
        id: id as string,
        householdId: decodedUser.householdId
      },
      include: {
        rank: true,
        frequency: true,
        completions: {
          orderBy: { completedAt: 'desc' },
          take: 1
        }
      }
    })

    if (!chore) {
      return res.status(404).json({ error: 'Chore not found or not accessible' })
    }

    if (chore.isComplete) {
      return res.status(400).json({ error: 'Chore is already completed' })
    }

    // Calculate streak
    let newStreak = 1
    if (chore.completions.length > 0) {
      const lastCompletion = chore.completions[0]
      const daysSinceLastCompletion = Math.floor(
        (new Date().getTime() - lastCompletion.completedAt.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysSinceLastCompletion <= chore.frequency.daysInterval) {
        newStreak = chore.currentStreak + 1
      }
    }

    // Calculate points (including streak bonus)
    const streakBonus = Math.floor(newStreak / 5) * 5 // 5 bonus points for every 5 days in streak
    const totalPoints = chore.rank.pointValue + streakBonus

    // Update everything in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create completion record
      const completion = await tx.choreCompletion.create({
        data: {
          choreId: chore.id,
          userId: decodedUser.userId,
          householdId: decodedUser.householdId,
          pointsEarned: totalPoints,
          streakCount: newStreak,
          note: validatedData.note,
          photoUrl: validatedData.photoUrl
        }
      })

      // Create point history
      const pointHistory = await tx.pointHistory.create({
        data: {
          points: totalPoints,
          type: 'CHORE_COMPLETE',
          reason: `Completed Chore: ${chore.title} (Streak: ${newStreak})`,
          userId: decodedUser.userId,
          householdId: decodedUser.householdId,
          choreId: chore.id
        }
      })

      // Update user's total points
      const user = await tx.user.update({
        where: { id: decodedUser.userId },
        data: {
          totalPoints: { increment: totalPoints }
        }
      })

      // Update chore
      const updatedChore = await tx.chore.update({
        where: { id: chore.id },
        data: {
          isComplete: true,
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, chore.longestStreak),
          totalCompletions: { increment: 1 },
          lastCompletedBy: decodedUser.userId,
          nextReset: calculateNextReset(new Date(), chore.frequency)
        },
        include: {
          rank: true,
          frequency: true,
          assignedTo: {
            select: {
              id: true,
              name: true
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      return {
        completion,
        pointHistory,
        chore: updatedChore,
        pointsEarned: totalPoints
      }
    })

    return res.status(200).json({
      message: 'Chore completed successfully',
      ...result
    })
  } catch (error) {
    console.error('Error completing chore:', error)
    return res.status(500).json({ error: 'Failed to complete chore' })
  }
}

export default withAuth(completeChore) 