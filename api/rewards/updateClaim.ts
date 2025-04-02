import { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from '../../lib/prisma'
import { updateClaimStatusSchema } from '../../lib/validations/rewards'

async function updateClaim(req: VercelRequest, res: VercelResponse) {
  const { decodedUser } = req.body
  const { id } = req.query

  if (!decodedUser.householdId) {
    return res.status(403).json({ error: 'User must be part of a household to manage reward claims' })
  }

  try {
    // Validate input
    const validatedData = updateClaimStatusSchema.parse(req.body)

    // Get the claim and verify access
    const claim = await prisma.rewardClaim.findFirst({
      where: {
        id: id as string,
        reward: {
          householdId: decodedUser.householdId
        }
      },
      include: {
        reward: true,
        user: true
      }
    })

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found or not accessible' })
    }

    if (claim.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending claims can be updated' })
    }

    // Update claim in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedClaim = await tx.rewardClaim.update({
        where: { id: claim.id },
        data: {
          status: validatedData.status,
          notes: validatedData.notes,
          completedAt: validatedData.status === 'COMPLETED' ? new Date() : null,
          cancelledAt: validatedData.status === 'CANCELLED' ? new Date() : null
        },
        include: {
          reward: true,
          user: true
        }
      })

      // If cancelled, refund points
      if (validatedData.status === 'CANCELLED') {
        // Create refund point history
        await tx.pointHistory.create({
          data: {
            points: claim.pointsCost, // Positive for refund
            type: 'REWARD_CLAIMED',
            reason: `Refund for cancelled reward: ${claim.reward.title}`,
            userId: claim.userId,
            householdId: decodedUser.householdId,
            rewardClaimId: claim.id
          }
        })

        // Update user's total points
        await tx.user.update({
          where: { id: claim.userId },
          data: {
            totalPoints: { increment: claim.pointsCost }
          }
        })
      }

      return updatedClaim
    })

    return res.status(200).json({
      message: `Claim ${validatedData.status.toLowerCase()} successfully`,
      claim: {
        id: result.id,
        status: result.status,
        claimedAt: result.claimedAt,
        completedAt: result.completedAt,
        cancelledAt: result.cancelledAt,
        pointsCost: result.pointsCost,
        notes: result.notes,
        user: {
          id: result.user.id,
          name: result.user.name
        },
        reward: {
          id: result.reward.id,
          title: result.reward.title
        }
      }
    })
  } catch (error) {
    console.error('Error updating claim:', error)
    return res.status(500).json({ error: 'Failed to update claim' })
  }
}

export default updateClaim 