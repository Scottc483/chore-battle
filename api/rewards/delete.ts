import { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from '../../lib/prisma'
import { withAuth } from '../../lib/middleware/auth'

async function deleteReward(req: VercelRequest, res: VercelResponse) {
  const { decodedUser } = req.body
  const { id } = req.query

  if (!decodedUser.householdId) {
    return res.status(403).json({ error: 'User must be part of a household to delete rewards' })
  }

  try {
    // Check if reward exists and belongs to user's household
    const reward = await prisma.reward.findFirst({
      where: {
        id: id as string,
        householdId: decodedUser.householdId
      },
      include: {
        claims: {
          where: {
            status: 'PENDING'
          }
        },
        _count: {
          select: {
            claims: {
              where: {
                status: 'COMPLETED'
              }
            }
          }
        }
      }
    })

    if (!reward) {
      return res.status(404).json({ error: 'Reward not found or not accessible' })
    }

    // Check for active (pending) claims
    if (reward.claims.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete reward with pending claims',
        pendingClaims: reward.claims.length
      })
    }

    // If there are completed claims, mark as deleted instead of actually deleting
    if (reward._count.claims > 0) {
      const updatedReward = await prisma.reward.update({
        where: { id: reward.id },
        data: {
          isDeleted: true, // You'll need to add this field to the Reward model
          deletedAt: new Date(),
          isRepeatable: false, // Prevent new claims
          maxClaims: 0 // Prevent new claims
        }
      })

      return res.status(200).json({
        message: 'Reward marked as deleted',
        id: updatedReward.id,
        note: 'Reward has historical claims and was archived instead of deleted'
      })
    }

    // If no historical claims, we can safely delete the reward
    await prisma.reward.delete({
      where: {
        id: reward.id
      }
    })

    return res.status(200).json({
      message: 'Reward deleted successfully',
      id: reward.id
    })
  } catch (error) {
    console.error('Error deleting reward:', error)
    return res.status(500).json({ error: 'Failed to delete reward' })
  }
}

export default withAuth(deleteReward) 