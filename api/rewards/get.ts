import { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from '../../lib/prisma'
import { withAuth } from '../../lib/middleware/auth'    
async function getRewards(req: VercelRequest, res: VercelResponse) {
  const { decodedUser } = req.body
  const { page = '1', limit = '10' } = req.query

  if (!decodedUser.householdId) {
    return res.status(403).json({ error: 'User must be part of a household to view rewards' })
  }

  try {
    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const [rewards, total] = await Promise.all([
      prisma.reward.findMany({
        where: {
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
          },
          claims: {
            where: {
              userId: decodedUser.userId
            },
            orderBy: {
              claimedAt: 'desc'
            },
            take: 1,
            select: {
              id: true,
              status: true,
              claimedAt: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limitNum
      }),
      prisma.reward.count({
        where: {
          householdId: decodedUser.householdId
        }
      })
    ])

    // Format the response
    const formattedRewards = rewards.map(reward => ({
      id: reward.id,
      title: reward.title,
      description: reward.description,
      pointsCost: reward.pointsCost,
      isRepeatable: reward.isRepeatable,
      maxClaims: reward.maxClaims,
      totalClaims: reward._count.claims,
      isClaimable: reward.isRepeatable || (
        reward.maxClaims ? reward._count.claims < reward.maxClaims : true
      ),
      lastClaim: reward.claims[0] || null
    }))

    return res.status(200).json({
      rewards: formattedRewards,
      pagination: {
        total,
        pages: Math.ceil(total / limitNum),
        currentPage: pageNum,
        perPage: limitNum
      }
    })
  } catch (error) {
    console.error('Error fetching rewards:', error)
    return res.status(500).json({ error: 'Failed to fetch rewards' })
  }
}

export default withAuth(getRewards) 