// api/chore-ranks/get.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'
import { withAuth } from '../middleware/auth'
import { ChoreRankResponse, ChoreRankWithChoreCount } from '../../lib/types/chores'

const prisma = new PrismaClient()

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { decodedUser } = req.body

  if (!decodedUser.householdId) {
    return res.status(403).json({ error: 'User must be part of a household to view chore ranks' })
  }

  try {
    const choreRanks = await prisma.choreRank.findMany({
      where: {
        householdId: decodedUser.householdId
      },
      include: {
        _count: {
          select: { chores: true }
        }
      },
      orderBy: [
        { pointValue: 'asc' }
      ]
    })

    // Format the response to include chore counts
    const formattedRanks: ChoreRankWithChoreCount[] = choreRanks.map(rank => ({
      id: rank.id,
      name: rank.name,
      displayName: rank.displayName,
      pointValue: rank.pointValue,
      isSystem: rank.isSystem,
      createdAt: rank.createdAt,
      updatedAt: rank.updatedAt,
      householdId: rank.householdId,
      choreCount: rank._count.chores
    }))

    return res.status(200).json(formattedRanks)
  } catch (error) {
    console.error('Error fetching chore ranks:', error)
    return res.status(500).json({ error: 'Failed to fetch chore ranks' })
  }
}

export default withAuth(handler)