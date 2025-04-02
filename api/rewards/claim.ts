import { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from '../../lib/prisma'
import { rewardClaimSchema } from '../../lib/validations/rewards'
import { withAuth } from '../../lib/middleware/auth'    

async function claimReward(req: VercelRequest, res: VercelResponse) {
  const { decodedUser } = req.body
  const { id } = req.query

  if (!decodedUser.householdId) {
    return res.status(403).json({ error: 'User must be part of a household to claim rewards' })
  }

  try {
    // Validate input
    const validatedData = rewardClaimSchema.parse(req.body)

    // Get the reward and verify access
    const reward = await prisma.reward.findFirst({
      where: {
        id: id as string,
        householdId: decodedUser.householdId
      },
      include: {
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

    // Check if reward is claimable
    if (!reward.isRepeatable && reward.maxClaims && reward._count.claims >= reward.maxClaims) {
      return res.status(400).json({ error: 'Reward has reached maximum claims' })
    }

    // Get user's current points
    const user = await prisma.user.findUnique({
      where: { id: decodedUser.userId }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Check if user has enough points
    if (user.totalPoints < reward.pointsCost) {
      return res.status(400).json({ 
        error: 'Insufficient points',
        required: reward.pointsCost,
        current: user.totalPoints
      })
    }

    // Create claim and update points in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the claim
      const claim = await tx.rewardClaim.create({
        data: {
          userId: decodedUser.userId,
          rewardId: reward.id,
          pointsCost: reward.pointsCost,
          notes: validatedData.notes,
          status: 'PENDING'
        }
      })

      // Create point history
      const pointHistory = await tx.pointHistory.create({
        data: {
          points: -reward.pointsCost,
          type: 'REWARD_CLAIMED',
          reason: `Claimed Reward: ${reward.title}`,
          userId: decodedUser.userId,
          householdId: decodedUser.householdId,
          rewardClaimId: claim.id
        }
      })

      // Update user's total points
      const updatedUser = await tx.user.update({
        where: { id: decodedUser.userId },
        data: {
          totalPoints: { decrement: reward.pointsCost }
        }
      })

      return { claim, pointHistory, updatedUser }
    })

    return res.status(200).json({
      message: 'Reward claimed successfully',
      claim: {
        id: result.claim.id,
        status: result.claim.status,
        claimedAt: result.claim.claimedAt,
        pointsCost: result.claim.pointsCost
      },
      remainingPoints: result.updatedUser.totalPoints
    })
  } catch (error) {
    console.error('Error claiming reward:', error)
    return res.status(500).json({ error: 'Failed to claim reward' })
  }
}

export default withAuth(claimReward) 