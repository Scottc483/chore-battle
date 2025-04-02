import { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from '../../../lib/prisma'
import { withAuth } from '../../../lib/middleware/auth'
import { RewardClaimStatus } from '@prisma/client'

async function getUserClaims(req: VercelRequest, res: VercelResponse) {
  const { decodedUser } = req.body
  const { page = '1', limit = '10', status } = req.query

  if (!decodedUser.householdId) {
    return res.status(403).json({ error: 'User must be part of a household to view claims' })
  }

  try {
    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    // Build where clause
    const where = {
      userId: decodedUser.userId,
      ...(status ? { status: status as RewardClaimStatus } : {})
    }

    const [claims, total] = await Promise.all([
      prisma.rewardClaim.findMany({
        where,
        include: {
          reward: {
            select: {
              id: true,
              title: true,
              description: true,
              isDeleted: true
            }
          }
        },
        orderBy: {
          claimedAt: 'desc'
        },
        skip,
        take: limitNum
      }),
      prisma.rewardClaim.count({ where })
    ])

    // Format the response
    const formattedClaims = claims.map(claim => ({
      id: claim.id,
      status: claim.status,
      claimedAt: claim.claimedAt,
      completedAt: claim.completedAt,
      cancelledAt: claim.cancelledAt,
      pointsCost: claim.pointsCost,
      notes: claim.notes,
      reward: {
        id: claim.reward.id,
        title: claim.reward.title,
        description: claim.reward.description,
        isDeleted: claim.reward.isDeleted
      }
    }))

    return res.status(200).json({
      claims: formattedClaims,
      pagination: {
        total,
        pages: Math.ceil(total / limitNum),
        currentPage: pageNum,
        perPage: limitNum
      }
    })
  } catch (error) {
    console.error('Error fetching user claims:', error)
    return res.status(500).json({ error: 'Failed to fetch claims' })
  }
}

export default withAuth(getUserClaims) 