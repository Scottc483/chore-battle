// api/choreRanks/get.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'
import { withAuth } from '../middleware/auth'

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
      orderBy: [
        { pointValue: 'asc' }
      ]
    })

    return res.status(200).json(choreRanks)
  } catch (error) {
    console.error('Error fetching chore ranks:', error)
    return res.status(500).json({ error: 'Failed to fetch chore ranks' })
  }
}

export default withAuth(handler)