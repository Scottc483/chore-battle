import { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from '../../lib/prisma'
import * as z from 'zod'
import { withAuth } from '../../lib/middleware/auth'

const createPointSchema = z.object({
  points: z.number(),
  reason: z.string(),
  userId: z.string(),
  type: z.enum(['CHORE_COMPLETE', 'REWARD_CLAIMED', 'BONUS'])
})

async function createPointHistory(req: VercelRequest, res: VercelResponse) {
  const { decodedUser } = req.body

  if (!decodedUser.householdId) {
    return res.status(403).json({ error: 'User must be part of a household to manage points' })
  }

  try {
    const validatedData = createPointSchema.parse(req.body)

    // Verify the target user belongs to the same household
    const targetUser = await prisma.user.findFirst({
      where: {
        id: validatedData.userId,
        householdId: decodedUser.householdId
      }
    })

    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found or not in same household' })
    }

    // Create point history and update user's total points in a transaction
    const pointHistory = await prisma.$transaction(async (tx) => {
      const history = await tx.pointHistory.create({
        data: {
          points: validatedData.points,
          reason: validatedData.reason,
          type: validatedData.type,
          userId: validatedData.userId,
          householdId: decodedUser.householdId
        }
      })

      await tx.user.update({
        where: { id: validatedData.userId },
        data: {
          totalPoints: {
            increment: validatedData.points
          }
        }
      })

      return history
    })

    return res.status(201).json({ pointHistory })
  } catch (error) {
    console.error('Error creating point history:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.issues })
    }
    return res.status(500).json({ error: 'Failed to create point history' })
  }
}

export default withAuth(createPointHistory) 