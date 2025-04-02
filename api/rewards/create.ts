// api/rewards/create.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from '../../lib/prisma'
import { rewardSchema } from '../../lib/validations/rewards'
import { withAuth } from '../../lib/middleware/auth'    

async function createReward(req: VercelRequest, res: VercelResponse) {
  const { decodedUser } = req.body

  if (!decodedUser.householdId) {
    return res.status(403).json({ error: 'User must be part of a household to create rewards' })
  }

  try {
    // Validate input
    const validatedData = rewardSchema.parse(req.body)

    // Create the reward
    const reward = await prisma.reward.create({
      data: {
        ...validatedData,
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

    // Format the response
    const formattedReward = {
      id: reward.id,
      title: reward.title,
      description: reward.description,
      pointsCost: reward.pointsCost,
      isRepeatable: reward.isRepeatable,
      maxClaims: reward.maxClaims,
      totalClaims: reward._count.claims,
      isClaimable: true // New reward is always claimable
    }

    return res.status(201).json(formattedReward)
  } catch (error) {
    console.error('Error creating reward:', error)
    return res.status(500).json({ error: 'Failed to create reward' })
  }
}

export default withAuth(createReward) 